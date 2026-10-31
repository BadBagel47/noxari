"""Read-only comparison of pinned catalog snapshots with upstream sources.

Usage: python3 scripts/check_catalog_updates.py [--fail-on-changes]

The command never edits app data. It reports additions, removals and changed
fields so a maintainer can review a source update before changing source pins.
"""
import argparse
import csv
import hashlib
import io
import json
import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlparse
from urllib.request import Request, urlopen

import generate_bright_stars as bright_source
import generate_boundaries as boundary_source
import generate_messier as messier_source

ROOT = Path(__file__).resolve().parents[1]
API = 'https://api.github.com'
RAW = 'https://raw.githubusercontent.com'
USER_AGENT = 'Noxari-catalog-update-audit'


def get(url):
    request = Request(url, headers={'User-Agent': USER_AGENT})
    with urlopen(request, timeout=60) as response:
        return response.read()


def latest_file(repo, path):
    url = f'{API}/repos/{repo}/commits?path={path}&per_page=1'
    commits = json.loads(get(url))
    if not commits:
        raise RuntimeError(f'No upstream commit found for {repo}/{path}')
    revision = commits[0]['sha']
    return revision, get(f'{RAW}/{repo}/{revision}/{path}')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def rows_by_id(raw, delimiter=';'):
    result = {}
    for row in csv.DictReader(io.StringIO(raw.decode('utf-8-sig')), delimiter=delimiter):
        key = row.get('Name')
        if not key:
            continue
        if key in result:
            raise RuntimeError(f'Duplicate source ID: {key}')
        result[key] = row
    return result


def compare_rows(label, old, new):
    old_ids, new_ids = set(old), set(new)
    added, removed = sorted(new_ids - old_ids), sorted(old_ids - new_ids)
    changed = []
    for key in sorted(old_ids & new_ids):
        fields = sorted(field for field in old[key].keys() | new[key].keys()
                        if old[key].get(field) != new[key].get(field))
        if fields:
            changed.append((key, fields))
    print(f'  {label}: {len(old)} → {len(new)} records; '
          f'+{len(added)} added, -{len(removed)} missing, ~{len(changed)} changed')
    for title, values in (('Added', added), ('Missing upstream', removed)):
        if values:
            print(f'    {title}: ' + ', '.join(values[:12]) + (' …' if len(values) > 12 else ''))
    if changed:
        detail = '; '.join(f'{key} ({", ".join(fields)})' for key, fields in changed[:10])
        print('    Changed fields: ' + detail + (' …' if len(changed) > 10 else ''))
    return bool(added or removed or changed)


def generated_array(path, declaration):
    source = path.read_text()
    match = re.search(declaration + r'\s*=\s*(\[.*?\]);', source, re.S)
    if not match:
        raise RuntimeError(f'Cannot parse generated snapshot: {path.relative_to(ROOT)}')
    return json.loads(match.group(1))


def stable_star_rows(rows):
    keyed = {}
    coordinate_occurrences = {}
    for row in rows:
        hip = int(row['hip']) if row.get('hip') else 0
        if hip > 0:
            key = f'HIP {hip}'
        else:
            base = f"J2000 {row['ra']:.6f},{row['dec']:.6f}"
            ordinal = coordinate_occurrences.get(base, 0)
            coordinate_occurrences[base] = ordinal + 1
            key = f'{base} #{ordinal + 1}'
        if key in keyed:
            raise RuntimeError(f'Duplicate HYG identity: {key}')
        normalized = dict(row)
        normalized['hip'] = hip if hip > 0 else None
        keyed[key] = normalized
    return keyed


def check_openngc():
    repo = 'mattiaverga/OpenNGC'
    print('\nOpenNGC (Messier source)')
    any_change = False
    for filename, pinned_hash in messier_source.CHECKSUMS.items():
        path = 'database_files/' + filename
        revision, current = latest_file(repo, path)
        pinned = get(f'{RAW}/{repo}/{messier_source.COMMIT}/{path}')
        if digest(pinned) != pinned_hash:
            raise RuntimeError(f'Committed OpenNGC pin checksum mismatch: {filename}')
        print(f'  {filename}: pinned {messier_source.COMMIT[:12]} ({digest(pinned)[:12]}), '
              f'upstream {revision[:12]} ({digest(current)[:12]})')
        any_change |= compare_rows(filename, rows_by_id(pinned), rows_by_id(current))
    return any_change


def check_hyg():
    repo = 'astronexus/HYG-Database'
    path = 'hyg/CURRENT/hygdata_v41.csv'
    print('\nHYG bright-star subset')
    revision, raw = latest_file(repo, path)
    source_unchanged = digest(raw) == bright_source.SHA256

    baseline = generated_array(ROOT / 'src/generated/brightStars.ts',
                               r'export const brightStars: BrightStar\[\]')
    old_rows = [{'ra': row[0], 'dec': row[1], 'mag': row[2], 'proper': row[3],
                 'pmra': row[4], 'pmdec': row[5], 'hip': row[6]} for row in baseline]
    old_by_hip = stable_star_rows(old_rows)
    latest_rows = []
    for row in csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))):
        if row.get('id') == '0' or not all(row.get(field) for field in ('ra', 'dec', 'mag')):
            continue
        hip = str(int(row['hip'])) if row.get('hip') else None
        magnitude = float(row['mag'])
        if magnitude > bright_source.MAGNITUDE_LIMIT and f'HIP {hip}' not in old_by_hip:
            continue
        latest_rows.append({'ra': round(float(row['ra']), 6), 'dec': round(float(row['dec']), 6),
                            'mag': round(magnitude, 2),
                            'proper': row.get('proper') if magnitude <= .5 else None,
                            'pmra': float(row['pmra'] or 0), 'pmdec': float(row['pmdec'] or 0),
                            'hip': int(hip) if hip else None})
    new_by_hip = stable_star_rows(latest_rows)
    any_change = compare_rows('HYG rows keyed by HIP or rounded J2000 coordinates', old_by_hip, new_by_hip)
    if not any_change and digest(raw) != bright_source.SHA256:
        print('  Upstream changed outside the stars currently included in the app.')
    if source_unchanged:
        print(f'  Source checksum matches the pin ({digest(raw)[:12]}; commit {revision[:12]}).')
    else:
        print(f'  Source snapshot: {bright_source.SHA256[:12]} → {digest(raw)[:12]} '
              f'(current file commit {revision[:12]}).')
    return any_change


def check_stellarium():
    repo = 'Stellarium/stellarium'
    path = 'skycultures/modern/index.json'
    print('\nStellarium modern skyculture (constellation figures and boundaries)')
    revision, raw = latest_file(repo, path)
    old = generated_array(ROOT / 'src/generated/constellations.ts',
                          r'export const constellationFigures: ConstellationFigure\[\]')
    latest = json.loads(raw)['constellations']
    old_by_id = {str(row['id']): row for row in old}
    new_by_id = {str(row['id'].split()[-1]): {
        'id': str(row['id'].split()[-1]), 'name': row['common_name']['native'],
        'lines': row['lines']} for row in latest}
    any_change = compare_rows('constellation IDs / names / line connectivity', old_by_id, new_by_id)

    boundary_text = (ROOT / 'src/generated/boundaries.ts').read_text()
    boundary_match = re.search(r'constellationBoundaries: readonly BoundaryEdge\[\] = (\[.*?\]);',
                               boundary_text, re.S)
    if not boundary_match:
        raise RuntimeError('Cannot parse generated IAU boundary snapshot')
    old_edges = {tuple(edge) for edge in json.loads(boundary_match.group(1))}
    index = json.loads(raw)
    ids = {row['id'].split()[-1].upper(): row['id'].split()[-1]
           for row in index['constellations']}
    ids.update(SER1='Ser1', SER2='Ser2')
    new_edges = set()
    for line in index['edges']:
        _, direction, ra1, dec1, ra2, dec2, left, right = line.split()
        a, b, c, d = map(boundary_source.sexagesimal, (ra1, dec1, ra2, dec2))
        if direction == 'P+' and c < a:
            c += 24
        new_edges.add((a, b, c, d, ids[left], ids[right]))
    if old_edges != new_edges:
        removed, added = old_edges - new_edges, new_edges - old_edges
        print(f'  IAU boundary geometry changed: +{len(added)} edges, -{len(removed)} edges; review required.')
        any_change = True
    else:
        print(f'  IAU boundary geometry unchanged ({len(new_edges)} edges).')
    print(f'  Pinned source {bright_source.STELLARIUM_COMMIT[:12]} → '
          f'{revision[:12]} ({digest(raw)[:12]}).')
    return any_change


def check_jpl_candidates():
    source = (ROOT / 'src/candidateObjects.ts').read_text()
    starts = [match.start() for match in re.finditer(r"id:\s*'([^']+)'", source)]
    print('\nReviewed small-body candidates (JPL SBDB orbits)')
    any_change = False
    for index, start in enumerate(starts):
        end = starts[index + 1] if index + 1 < len(starts) else source.find('];', start)
        block = source[start:end]
        object_id = re.search(r"id:\s*'([^']+)'", block).group(1)
        match = re.search(r"url:\s*'([^']*sbdb_lookup[^']*)'", block)
        if not match:
            print(f'  {object_id}: no JPL link; manual review required.')
            any_change = True
            continue
        fragment = urlparse(match.group(1)).fragment.split('?', 1)[-1]
        designation = parse_qs(fragment).get('sstr', [None])[0]
        if not designation:
            raise RuntimeError('Cannot read object designation from JPL SBDB reference')
        designation = unquote(designation)
        pos = re.search(r'position:\s*\{([\s\S]*?)\n\s*\},\n\s*color:', block)
        if not pos or "kind: 'keplerian'" not in pos.group(1):
            print(f'  {designation}: non-Keplerian source; manual review required.')
            any_change = True
            continue
        params = dict((key, float(value)) for key, value in
                      re.findall(r'(epochJD|semiMajorAxisAu|eccentricity|inclinationDegrees|'
                                 r'ascendingNodeDegrees|argumentOfPerihelionDegrees|'
                                 r'meanAnomalyDegrees|meanMotionDegreesPerDay):\s*([0-9.]+)', pos.group(1)))
        solution_match = re.search(r'solution #(\d+)', block, re.I)
        pinned_solution = solution_match.group(1) if solution_match else None
        query = f'https://ssd-api.jpl.nasa.gov/sbdb.api?sstr={quote(designation)}&full-prec=1'
        data = json.loads(get(query))
        orbit = data.get('orbit') or {}
        remote = {element['name']: float(element['value']) for element in orbit.get('elements', [])}
        mapping = {'a': 'semiMajorAxisAu', 'e': 'eccentricity', 'i': 'inclinationDegrees',
                   'om': 'ascendingNodeDegrees', 'w': 'argumentOfPerihelionDegrees',
                   'ma': 'meanAnomalyDegrees', 'n': 'meanMotionDegreesPerDay'}
        changed = []
        if not params:
            print(f'  {designation}: pinned orbit could not be parsed; manual review required.')
            any_change = True
            continue
        if pinned_solution and pinned_solution != str(orbit.get('orbit_id')):
            changed.append('solution ID')
        if float(orbit.get('epoch', 'nan')) != params.get('epochJD'):
            changed.append('epoch')
        for element, field in mapping.items():
            if element not in remote or field not in params or remote[element] != params[field]:
                changed.append(field)
        print(f"  {designation}: pinned solution #{pinned_solution or '?'} "
              f"at JD {params.get('epochJD')}; current JPL solution #{orbit.get('orbit_id')} "
              f"at JD {orbit.get('epoch')}.")
        if changed:
            print('    Orbit differences require review: ' + ', '.join(changed))
            any_change = True
        else:
            print('    Pinned orbital elements match current JPL values.')
    return any_change


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fail-on-changes', action='store_true',
                        help='exit 1 if additions, removals or changed data need review')
    args = parser.parse_args()
    print('Catalog update audit (read-only). No project data will be changed.')
    try:
        changes = check_openngc() | check_hyg() | check_stellarium() | check_jpl_candidates()
    except Exception as error:
        print(f'\nAudit incomplete: {error}', file=sys.stderr)
        return 2
    print('\nReview required.' if changes else '\nNo catalog changes detected.')
    return 1 if changes and args.fail_on_changes else 0


if __name__ == '__main__':
    raise SystemExit(main())
