"""F-043: fainter stars for the binocular sky level (HYG v4.1, CC BY-SA 4.0).

Same pinned HYG source as scripts/generate_bright_stars.py. Takes every star with
6.5 < V <= 8.5 that is not already in the bright subset (the two fainter HIP
constellation endpoints are excluded), sorted by magnitude so the app can draw a
prefix up to a zoom-dependent limit.

Binary layout (little-endian), public/stars/binocular-v1.bin:
  4 bytes  magic 'NXS1'
  uint32   count
  uint16[count]  RA  = round(ra_hours / 24 * 65536) mod 65536   (~20 arcsec steps)
  int16[count]   Dec = round(dec_degrees / 90 * 32767)           (~10 arcsec steps)
  uint8[count]   (V - 6.5) * 100, rounded                         (0.01 mag steps)
Proper motion is not stored: for these stars it moves them by a few arcseconds
since J2000, below the encoding resolution.

Run: python3 scripts/generate_binocular_stars.py [local hygdata_v41.csv]
"""
import csv, hashlib, io, json, struct, sys
from pathlib import Path
from urllib.request import urlopen

HYG_COMMIT = '3bf37f4b2d5460e1278286320d1d62fab9b493c1'
SOURCE = f'https://raw.githubusercontent.com/astronexus/HYG-Database/{HYG_COMMIT}/hyg/CURRENT/hygdata_v41.csv'
SHA256 = 'd9f69fd86bbf90a4e4d52b4c5c53eacfa6dfc0bfdef85bfd94f095e0bebe4ebd'
ROOT = Path(__file__).resolve().parents[1]
BRIGHT_LIMIT, LIMIT = 6.5, 8.5
IN_BRIGHT_SUBSET = {30665, 33165}  # fainter constellation endpoints already shipped


def main():
    raw = Path(sys.argv[1]).read_bytes() if len(sys.argv) > 1 else urlopen(SOURCE, timeout=300).read()
    if hashlib.sha256(raw).hexdigest() != SHA256:
        raise SystemExit('HYG checksum mismatch')
    stars = []
    for row in csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))):
        if row['id'] == '0' or not all(row[field] for field in ('ra', 'dec', 'mag')):
            continue
        magnitude = float(row['mag'])
        hip = int(row['hip']) if row['hip'] else None
        if not BRIGHT_LIMIT < magnitude <= LIMIT or hip in IN_BRIGHT_SUBSET:
            continue
        stars.append((magnitude, float(row['ra']), float(row['dec'])))
    stars.sort()
    count = len(stars)
    ra = struct.pack(f'<{count}H', *[round(s[1] / 24 * 65536) % 65536 for s in stars])
    dec = struct.pack(f'<{count}h', *[max(-32767, min(32767, round(s[2] / 90 * 32767))) for s in stars])
    mag = bytes(round((s[0] - BRIGHT_LIMIT) * 100) for s in stars)
    out = ROOT / 'public/stars/binocular-v1.bin'
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = b'NXS1' + struct.pack('<I', count) + ra + dec + mag
    out.write_bytes(payload)
    manifest = ROOT / 'data/binocular-stars/manifest.json'
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps({'source': SOURCE, 'sha256': SHA256, 'license': 'CC BY-SA 4.0', 'credit': 'HYG Database, Astronexus contributors',
                                    'magnitudeRange': [BRIGHT_LIMIT, LIMIT], 'count': count, 'output': 'public/stars/binocular-v1.bin',
                                    'outputSha256': hashlib.sha256(payload).hexdigest(), 'bytes': len(payload)}, indent=1) + '\n')
    print(f'{count} stars, {len(payload)} bytes')


if __name__ == '__main__':
    main()
