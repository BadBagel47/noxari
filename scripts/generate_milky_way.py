"""Rasterize pinned d3-celestial/Jose R. Vieira J2000 Milky Way contours.

Usage: python3 scripts/generate_milky_way.py [mw.json LICENSE readme.md]
Standard library only. Output is a grayscale data grid, not a photograph.
"""
import hashlib
import json
import math
import struct
import sys
import zlib
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
COMMIT = '7e720a3de062059d4c5400a379146a601d9010e0'
BASE = f'https://raw.githubusercontent.com/ofrohn/d3-celestial/{COMMIT}/'
INPUTS = [('data/mw.json', 'aee221a7a0e879418e685de00c3e68fbdfac5667c0a8aab74929ef9cf4aab4fb'),
          ('LICENSE', 'a8c79239001ad4bea243d1796b85084e1fc39309c5c5a663930a1b46320254c6'),
          ('readme.md', 'c3d77ea7e64565a31876cd2be3c2bc71919712e0379ecd1d98b490afc68703e2')]
WIDTH, HEIGHT = 720, 360


def ring_points(ring):
    lon = ring[0][0]
    points = [(lon * 2, (90 - ring[0][1]) * 2)]
    for value, lat in ring[1:]:
        lon += (value - lon + 180) % 360 - 180
        points.append((lon * 2, (90 - lat) * 2))
    # Two opposite winding rings describe the all-sky band. Close each cap
    # through the north pole before the even/odd fill; do not draw a seam chord.
    if abs(points[-1][0] - points[0][0]) > WIDTH / 2:
        points.extend([(points[-1][0], 0), (points[0][0], 0)])
    points.append(points[0])
    return points


def main():
    sources = []
    for i, (name, checksum) in enumerate(INPUTS, 1):
        raw = Path(sys.argv[i]).read_bytes() if len(sys.argv) > i else urlopen(BASE + name, timeout=60).read()
        if hashlib.sha256(raw).hexdigest() != checksum:
            raise SystemExit(f'{name}: checksum mismatch; review upstream before changing pins')
        sources.append(raw)
    data = json.loads(sources[0])
    assert [f['id'] for f in data['features']] == ['ol1', 'ol2', 'ol3', 'ol4', 'ol5']
    grid = [0] * (WIDTH * HEIGHT)
    for level, feature in enumerate(data['features'], 1):
        assert feature['geometry']['type'] == 'MultiPolygon'
        for polygon in feature['geometry']['coordinates']:
            rings = [ring_points(ring) for ring in polygon]
            for y in range(HEIGHT):
                intersections = []
                scan = y + .5
                for points in rings:
                    for (x1, y1), (x2, y2) in zip(points, points[1:]):
                        if (y1 <= scan < y2) or (y2 <= scan < y1):
                            x = x1 + (scan - y1) * (x2 - x1) / (y2 - y1)
                            intersections.extend(x + shift for shift in (-2 * WIDTH, -WIDTH, 0, WIDTH, 2 * WIDTH))
                intersections.sort()
                assert len(intersections) % 2 == 0
                for lo, hi in zip(intersections[::2], intersections[1::2]):
                    start, end = max(0, math.ceil(lo - .5)), min(WIDTH, math.ceil(hi - .5))
                    for x in range(start, end):
                        grid[y * WIDTH + x] = max(grid[y * WIDTH + x], level * 51)
    # Symmetric low-pass filtering removes contour stair steps at this 0.5° grid.
    # RA wraps; declination clamps. No synthetic dust features are added.
    for _ in range(2):
        grid = [sum(grid[min(HEIGHT - 1, max(0, y + dy)) * WIDTH + (x + dx) % WIDTH]
                    for dy in (-1, 0, 1) for dx in (-1, 0, 1)) // 9
                for y in range(HEIGHT) for x in range(WIDTH)]
    def chunk(name, payload):
        return struct.pack('!I', len(payload)) + name + payload + struct.pack('!I', zlib.crc32(name + payload))
    scanlines = b''.join(b'\0' + bytes(grid[y * WIDTH:(y + 1) * WIDTH]) for y in range(HEIGHT))
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', WIDTH, HEIGHT, 8, 0, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(scanlines, 9)) + chunk(b'IEND', b'')
    output = ROOT / 'src/generated/milkyWay.png'
    output.write_bytes(png)
    license_dir = ROOT / 'public/licenses'
    license_dir.mkdir(parents=True, exist_ok=True)
    (license_dir / 'milky-way-BSD-3-Clause.txt').write_bytes(sources[1])
    print(f'Wrote {WIDTH}×{HEIGHT} J2000 grid ({len(png)} bytes), SHA-256 {hashlib.sha256(png).hexdigest()}')


if __name__ == '__main__':
    main()
