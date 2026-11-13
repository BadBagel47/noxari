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

F-065 (2026-11-13): the same script makes the deeper layer 11 < G <= 12 in finer tiles:
  python3 scripts/generate_gaia_stars.py --cache <dir> --min-g 11 --max-g 12 --band 5 \
      --mag-base 10 --mag-scale 100 --out public/stars/gaia12-v1 --manifest data/gaia-stars/manifest-g12.json
Chunks that reach the synchronous row limit are split into four smaller HEALPix ranges
automatically. --ari uses the same Gaia DR3 table at ARI Heidelberg (row limit 100,000), used for
gaia12-v1 because ESA's anonymous job queue was full on 2026-11-13.

Run: python3 scripts/generate_gaia_stars.py --cache <dir>
"""
import argparse, bisect, csv, hashlib, io, json, math, re, struct, sys, time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
TAP = 'https://gea.esac.esa.int/tap-server/tap/sync'
# Same Gaia DR3 table at ARI Heidelberg (official partner data centre); used when ESA's anonymous queue is full.
ARI_TAP = 'https://gaia.ari.uni-heidelberg.de/tap/sync'
SETTINGS = {'tap': TAP, 'row_limit': 50000}
LIMIT = 11.0
QUERY = ('SELECT source_id, ra, dec, phot_g_mean_mag, bp_rp, parallax, pmra, pmdec FROM gaiadr3.gaia_source '
         'WHERE phot_g_mean_mag <= {limit}{lower} AND source_id >= {low} AND source_id < {high}')
CHUNK = 2 ** 55  # HEALPix level 2 (source_id // 2^35 is the level-12 pixel)
CHUNKS = 192
MAG_BASE, MAG_SCALE, COLOUR_SCALE = 6.0, 50, 50
BAND = 10
EPOCH_YEARS = 16.0  # Gaia DR3 epoch 2016.0 -> J2000
MATCH_ARCSEC, MATCH_G = 15.0, 9.5


def cells():
    per_equator = 360 // BAND
    return [max(1, round(per_equator * math.cos(math.radians(-90 + BAND * b + BAND / 2)))) for b in range(180 // BAND)]


def tile_of(ra, dec, grid, starts):
    band = min(len(grid) - 1, int((dec + 90) // BAND))
    width = 360 / grid[band]
    cell = min(grid[band] - 1, int(ra // width))
    return starts[band] + cell, band, cell, width


def fetch_range(low, high, cache, limit, lower):
    """Rows for source_id in [low, high); split into four when the answer hits the row limit."""
    tag = f'{limit}-{lower or 0}'
    path = cache / f'range-{tag}-{low}-{high}.csv'
    if path.exists():
        return list(csv.DictReader(io.StringIO(path.read_text())))
    query = QUERY.format(limit=limit, lower=f' AND phot_g_mean_mag > {lower}' if lower else '', low=low, high=high)
    body = urlencode({'REQUEST': 'doQuery', 'LANG': 'ADQL', 'FORMAT': 'csv', 'QUERY': query}).encode()
    for attempt in range(8):
        try:
            text = urlopen(Request(SETTINGS['tap'], data=body), timeout=180).read().decode()
            break
        except Exception as error:  # network hiccup or rate limit (429): retry with a growing pause
            if attempt == 7:
                raise
            print(f'{low}: {error}; retrying', file=sys.stderr)
            time.sleep((60 if '429' in str(error) else 5) * 2 ** min(attempt, 4))
    time.sleep(1)  # be gentle with the archive between requests
    if not text.startswith('source_id,'):
        raise SystemExit(f'range {low}: unexpected answer')
    rows = text.count('\n') - 1
    if rows >= SETTINGS['row_limit']:
        step = (high - low) // 4
        return [row for k in range(4) for row in fetch_range(low + k * step, low + (k + 1) * step, cache, limit, lower)]
    path.write_text(text)
    return list(csv.DictReader(io.StringIO(text)))


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
    parser.add_argument('--min-g', type=float, default=None)
    parser.add_argument('--max-g', type=float, default=LIMIT)
    parser.add_argument('--band', type=int, default=10)
    parser.add_argument('--mag-base', type=float, default=MAG_BASE)
    parser.add_argument('--mag-scale', type=float, default=MAG_SCALE)
    parser.add_argument('--out', default='public/stars/gaia-v1')
    parser.add_argument('--manifest', default='data/gaia-stars/manifest.json')
    parser.add_argument('--ari', action='store_true', help='use the ARI Heidelberg mirror (sync row limit 100,000)')
    args = parser.parse_args()
    globals()['BAND'] = args.band
    if args.ari:
        SETTINGS.update(tap=ARI_TAP, row_limit=100000)
    args.cache.mkdir(parents=True, exist_ok=True)
    rows = []
    for chunk in range(CHUNKS):
        rows += fetch_range(chunk * CHUNK, (chunk + 1) * CHUNK, args.cache, args.max_g, args.min_g)
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
            max(0, min(255, round((g - args.mag_base) * args.mag_scale))),
            max(0, min(65535, round((ra2000 - cell * width) / width * 65535))),
            max(0, min(65535, round((dec2000 - (-90 + BAND * band)) / BAND * 65535))),
            colour, int(row['source_id']), max(0, min(65535, round(parallax * 100))) if parallax > 0 else 0))

    out = ROOT / args.out
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
                  'magnitudeBase': args.mag_base, 'magnitudeScale': args.mag_scale, 'colourScale': COLOUR_SCALE, 'limitG': args.max_g, 'minG': args.min_g}
    (out / 'index.json').write_text(json.dumps(index_json, separators=(',', ':')) + '\n')
    manifest = ROOT / args.manifest
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps({
        'source': 'Gaia DR3 (gaiadr3.gaia_source)', 'tap': SETTINGS['tap'], 'query': QUERY, 'gRange': [args.min_g, args.max_g], 'bandDegrees': BAND, 'chunks': f'{CHUNKS} x source_id range {CHUNK}',
        'license': 'CC BY-NC 3.0 IGO', 'licenseUrl': 'https://www.cosmos.esa.int/web/gaia-users/license',
        'credit': 'ESA/Gaia/DPAC; Gaia Collaboration et al. (2016), (2023)',
        'rows': len(rows), 'rowsSha256': digest, 'removedAsHyg': removed, 'stars': total, 'tiles': sum(1 for t in tiles if t),
        'bytes': size, 'outputsSha256': outputs.hexdigest(), 'output': args.out + '/'}, indent=1) + '\n')
    print(f'{len(rows)} rows, {removed} already in HYG, {total} stars in {sum(1 for t in tiles if t)} tiles, {size} bytes')


if __name__ == '__main__':
    main()
