"""Download the pinned, verified Commons thumbnails listed in data/object-images.json.

Every download is checked against its recorded SHA-256 before anything is written.
Entries with "format": "webp" (F-048) are re-encoded to WebP, at most 560 px on the
longest side, to keep the app light; the original eight F-005 JPEG thumbnails are
written unchanged. Re-encoding needs Pillow.
"""
import hashlib
import io
import json
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'data/object-images.json'
OUTPUT = ROOT / 'public/images/objects'
MAX_SIDE = 560


def fetch(url):
    for attempt in range(6):
        try:
            return urlopen(Request(url, headers={'User-Agent': 'Noxari open image attribution check/1.0'}), timeout=60).read()
        except HTTPError as error:
            if error.code != 429 or attempt == 5:
                raise
            time.sleep(10 * (attempt + 1))


def main():
    images = json.loads(MANIFEST.read_text(encoding='utf-8'))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for image in images:
        raw = fetch(image['downloadUrl'])
        actual = hashlib.sha256(raw).hexdigest()
        if actual != image['sha256']:
            raise SystemExit(f"Checksum mismatch for {image['file']}: {actual}")
        if image.get('format') == 'webp':
            from PIL import Image
            picture = Image.open(io.BytesIO(raw)).convert('RGB')
            picture.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
            buffer = io.BytesIO()
            picture.save(buffer, 'WEBP', quality=75, method=6)
            (OUTPUT / image['file']).write_bytes(buffer.getvalue())
        else:
            if not raw.startswith(b'\xff\xd8\xff'):
                raise SystemExit(f"Unexpected non-JPEG content for {image['file']}")
            (OUTPUT / image['file']).write_bytes(raw)
        print(f"Verified {image['file']} ({len(raw)} bytes)")
        time.sleep(.5)


if __name__ == '__main__':
    main()
