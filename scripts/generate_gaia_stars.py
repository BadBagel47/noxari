"""F-061: faint stars from Gaia DR3 (CC BY-NC 3.0 IGO, ESA/Gaia/DPAC) to G 11, as sky tiles.

Gaia DR3 is a fixed data release, so the ADQL query below is the pin. The query is run
against ESA's Gaia archive (synchronous TAP, at most 50,000 rows per request) in 192
chunks: one per HEALPix level-2 pixel, which is encoded in the top bits of source_id.
Each chunk is cached in --cache so a rerun does not download again. The concatenated,
sorted rows get a SHA-256 in data/gaia-stars/manifest.json, as do the outputs.

Stars already shipped from HYG (bright subset V <= 6.5 and binocular stars V <= 8.5) are
removed by position (15 arcsec, Gaia G <= 9.5, Gaia positions moved back to J2000 with
their proper motion), so no star is drawn twice.

Tiles: 18 declination bands of 10 degrees; band b has max(1, round(36 cos(centre))) RA
cells. Files in public/stars/gaia-v1/ (little-endian):
  t<i>.bin  'NXG1', uint32 n, then per star (sorted by G):
            uint16 RA offset in the cell (0..65535), uint16 Dec offset in the band,
            uint8 (G - 6) * 50, uint8 colour = (BP-RP + 0.5) * 50 (255 = unknown)
  d<i>.bin  same order: int64 source_id, uint16 parallax * 100 mas (0 = none or <= 0)
  index.json grid and per-tile counts.
The app fetches a tile only when the whole-catalogue level is zoomed in over that part of
the sky, and the details only when a star in it is tapped. Nothing is precached.

Run: python3 scripts/generate_gaia_stars.py --cache <dir>
"""
import argparse, bisect, csv, hashlib, io, json, math, re, struct, sys, time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
TAP = 'https://gea.esac.esa.int/tap-server/tap/sync'
LIMIT = 11.0
QUERY = ('SELECT source_id, ra, dec, phot_g_mean_mag, bp_rp, parallax, pmra, pmdec FROM gaiadr3.gaia_source '
         f'WHERE phot_g_mean_mag <= {LIMIT} AND source_id >= {{low}} AND source_id < {{high}}')
CHUNK = 2 ** 55  # HEALPix level 2 (source_id // 2^35 is the level-12 pixel)
CHUNKS = 192
MAG_BASE, MAG_SCALE, COLOUR_SCALE = 6.0, 50, 50
BAND = 10
EPOCH_YEARS = 16.0  # Gaia DR3 epoch 2016.0 -> J2000
MATCH_ARCSEC, MATCH_G = 15.0, 9.5


def cells():
    return [max(1, round(36 * math.cos(math.radians(-90 + BAND * b + BAND / 2)))) for b in range(180 // BAND)]


def tile_of(ra, dec, grid, starts):
    band = min(len(grid) - 1, int((dec + 90) // BAND))
    width = 360 / grid[band]
    cell = min(grid[band] - 1, int(ra // width))
    return starts[band] + cell, band, cell, width


def fetch(chunk, cache):
    path = cache / f'chunk-{chunk:03d}.csv'
    if path.exists():
        return path.read_text()
    query = QUERY.format(low=chunk * CHUNK, high=(chunk + 1) * CHUNK)
    body = urlencode({'REQUEST': 'doQuery', 'LANG': 'ADQL', 'FORMAT': 'csv', 'QUERY': query}).encode()
    for attempt in range(4):
        try:
            text = urlopen(Request(TAP, data=body), timeout=180).read().decode()
            break
        except Exception as error:  # network hiccup: retry with backoff
            if attempt == 3:
                raise
            print(f'chunk {chunk}: {error}; retrying', file=sys.stderr)
            time.sleep(5 * 2 ** attempt)
    rows = text.count('\n') - 1
    if not text.startswith('source_id,') or rows >= 50000:
        raise SystemExit(f'chunk {chunk}: unexpected answer ({rows} rows)')
    path.write_text(text)
    return text


def hyg_stars():
    """(ra_deg, dec_deg) of every HYG star the app already ships."""
    stars = []
    source = (ROOT / 'src/generated/brightStars.ts').read_text()
    for ra, dec in re.findall(r'\[(-?[\d.]+),(-?[\d.]+),', source.split('export const brightStars', 1)[1]):
        stars.append((float(ra) * 15, float(dec)))
    raw = (ROOT / 'public/stars/binocular-v1.bin').read_bytes()
    count = struct.unpack_from('<I', raw, 4)[0]
    ras = struct.unpack_from(f'<{count}H', raw, 8)
    decs = struct.unpack_from(f'<{count}h', raw, 8 + 2 * count)
    stars += [(r / 65536 * 360, d / 32767 * 90) for r, d in zip(ras, decs)]
    return stars


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', required=True, type=Path)
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    rows = []
    for chunk in range(CHUNKS):
        rows += list(csv.DictReader(io.StringIO(fetch(chunk, args.cache))))
        if chunk % 24 == 23:
            print(f'{chunk + 1}/{CHUNKS} chunks, {len(rows)} rows', file=sys.stderr)
    rows.sort(key=lambda row: int(row['source_id']))
    digest = hashlib.sha256('\n'.join(','.join(row[key] for key in ('source_id', 'ra', 'dec', 'phot_g_mean_mag', 'bp_rp', 'parallax', 'pmra', 'pmdec')) for row in rows).encode()).hexdigest()

    # Position index of HYG stars on a 0.05-degree grid in Dec, RA scaled by cos(Dec).
    hyg = {}
    for ra, dec in hyg_stars():
        hyg.setdefault(round(dec * 20), []).append((ra, dec))
    radius = MATCH_ARCSEC / 3600

    def shipped(ra, dec):
        for key in (round(dec * 20) - 1, round(dec * 20), round(dec * 20) + 1):
            for hra, hdec in hyg.get(key, ()):
                dra = (ra - hra + 540) % 360 - 180
                if (dra * math.cos(math.radians(dec))) ** 2 + (dec - hdec) ** 2 < radius ** 2:
                    return True
        return False

    grid = cells()
    starts = [sum(grid[:b]) for b in range(len(grid))]
    tiles = [[] for _ in range(sum(grid))]
    removed = 0
    for row in rows:
        g = float(row['phot_g_mean_mag'])
        ra, dec = float(row['ra']), float(row['dec'])
        pmra = float(row['pmra']) if row['pmra'] else 0.0
        pmdec = float(row['pmdec']) if row['pmdec'] else 0.0
        dec2000 = dec - pmdec * EPOCH_YEARS / 3.6e6
        ra2000 = (ra - pmra * EPOCH_YEARS / 3.6e6 / max(1e-6, math.cos(math.radians(dec)))) % 360
        if g <= MATCH_G and shipped(ra2000, dec2000):
            removed += 1
            continue
        index, band, cell, width = tile_of(ra2000, dec2000, grid, starts)
        colour = 255 if not row['bp_rp'] else max(0, min(254, round((float(row['bp_rp']) + 0.5) * COLOUR_SCALE)))
        parallax = float(row['parallax']) if row['parallax'] else 0.0
        tiles[index].append((
            max(0, min(255, round((g - MAG_BASE) * MAG_SCALE))),
            max(0, min(65535, round((ra2000 - cell * width) / width * 65535))),
            max(0, min(65535, round((dec2000 - (-90 + BAND * band)) / BAND * 65535))),
            colour, int(row['source_id']), max(0, min(65535, round(parallax * 100))) if parallax > 0 else 0))

    out = ROOT / 'public/stars/gaia-v1'
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob('*.bin'):
        old.unlink()
    total, size, outputs = 0, 0, hashlib.sha256()
    for index, stars in enumerate(tiles):
        stars.sort()
        n = len(stars)
        total += n
        if not n:
            continue
        sky = b'NXG1' + struct.pack('<I', n) + b''.join(struct.pack('<HHBB', s[1], s[2], s[0], s[3]) for s in stars)
        detail = b''.join(struct.pack('<qH', s[4], s[5]) for s in stars)
        (out / f't{index}.bin').write_bytes(sky)
        (out / f'd{index}.bin').write_bytes(detail)
        outputs.update(sky + detail)
        size += len(sky) + len(detail)
    index_json = {'version': 1, 'bandDegrees': BAND, 'cells': grid, 'counts': [len(t) for t in tiles],
                  'magnitudeBase': MAG_BASE, 'magnitudeScale': MAG_SCALE, 'colourScale': COLOUR_SCALE, 'limitG': LIMIT}
    (out / 'index.json').write_text(json.dumps(index_json, separators=(',', ':')) + '\n')
    manifest = ROOT / 'data/gaia-stars/manifest.json'
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps({
        'source': 'Gaia DR3 (gaiadr3.gaia_source), ESA Gaia archive', 'tap': TAP, 'query': QUERY, 'chunks': f'{CHUNKS} x source_id range {CHUNK}',
        'license': 'CC BY-NC 3.0 IGO', 'licenseUrl': 'https://www.cosmos.esa.int/web/gaia-users/license',
        'credit': 'ESA/Gaia/DPAC; Gaia Collaboration et al. (2016), (2023)',
        'rows': len(rows), 'rowsSha256': digest, 'removedAsHyg': removed, 'stars': total, 'tiles': sum(1 for t in tiles if t),
        'bytes': size, 'outputsSha256': outputs.hexdigest(), 'output': 'public/stars/gaia-v1/'}, indent=1) + '\n')
    print(f'{len(rows)} rows, {removed} already in HYG, {total} stars in {sum(1 for t in tiles if t)} tiles, {size} bytes')


if __name__ == '__main__':
    main()
