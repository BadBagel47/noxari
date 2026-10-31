"""Download the pinned, verified Commons thumbnails listed in data/object-images.json."""
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'data/object-images.json'
OUTPUT = ROOT / 'public/images/objects'


def main():
    images = json.loads(MANIFEST.read_text(encoding='utf-8'))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for image in images:
        request = Request(image['downloadUrl'], headers={'User-Agent': 'Noxari open image attribution check/1.0'})
        raw = urlopen(request, timeout=60).read()
        actual = hashlib.sha256(raw).hexdigest()
        if actual != image['sha256']:
            raise SystemExit(f"Checksum mismatch for {image['file']}: {actual}")
        if not raw.startswith(b'\xff\xd8\xff'):
            raise SystemExit(f"Unexpected non-JPEG content for {image['file']}")
        (OUTPUT / image['file']).write_bytes(raw)
        print(f"Verified {image['file']} ({len(raw)} bytes)")


if __name__ == '__main__':
    main()
