"""F-040: build the Milky Way brightness texture from the ESO all-sky panorama.

Source: ESO/S. Brunier, "The Milky Way panorama" (eso0932a), CC BY 4.0,
https://www.eso.org/public/images/eso0932a/ (credit line ESO/S. Brunier is
mandatory). The panorama is an equirectangular image in galactic coordinates
(l = 0 at the centre, increasing to the left; b = 0 on the middle row).

Steps: luminance -> remove point stars with a median filter (the app draws its
own catalogue stars) -> reproject to a J2000 equirectangular grid (RA 0..24 h
across, Dec +90..-90 down; same layout as the previous texture) -> subtract the
sky floor, normalise and apply a gentle gamma -> 8-bit grayscale PNG.

Run: python3 scripts/generate_milky_way_eso.py [path/to/eso0932a.jpg]
Writes: src/generated/milkyWay.png and data/milky-way-eso/manifest.json
"""
import hashlib, io, json, sys, urllib.request
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

URL = 'https://cdn.eso.org/images/large/eso0932a.jpg'
ROOT = Path(__file__).resolve().parent.parent
WIDTH, HEIGHT = 1440, 720
Image.MAX_IMAGE_PIXELS = None

# IAU 1958 J2000 equatorial -> galactic rotation (Hipparcos/Liu et al. values).
R = np.array([[-0.0548755604, -0.8734370902, -0.4838350155],
              [ 0.4941094279, -0.4448296300,  0.7469822445],
              [-0.8676661490, -0.1980763734,  0.4559837762]])

def main():
    raw = Path(sys.argv[1]).read_bytes() if len(sys.argv) > 1 else urllib.request.urlopen(URL, timeout=600).read()
    image = Image.open(io.BytesIO(raw)).convert('L')
    image = image.resize((3000, 1500), Image.LANCZOS).filter(ImageFilter.MedianFilter(9)).filter(ImageFilter.GaussianBlur(1.2))
    source = np.asarray(image, dtype=np.float32)
    sh, sw = source.shape

    ra = (np.arange(WIDTH) + .5) / WIDTH * 2 * np.pi
    dec = np.pi / 2 - (np.arange(HEIGHT) + .5) / HEIGHT * np.pi
    RA, DEC = np.meshgrid(ra, dec)
    eq = np.stack([np.cos(DEC) * np.cos(RA), np.cos(DEC) * np.sin(RA), np.sin(DEC)], axis=-1)
    gal = eq @ R.T
    l = np.degrees(np.arctan2(gal[..., 1], gal[..., 0]))
    b = np.degrees(np.arcsin(np.clip(gal[..., 2], -1, 1)))
    x = (0.5 - l / 360.0) * sw - .5
    y = (0.5 - b / 180.0) * sh - .5
    x0 = np.floor(x).astype(int); y0 = np.clip(np.floor(y).astype(int), 0, sh - 2)
    fx = x - x0; fy = np.clip(y - y0, 0, 1)
    x0 %= sw; x1 = (x0 + 1) % sw
    sample = (source[y0, x0] * (1 - fx) + source[y0, x1] * fx) * (1 - fy) + (source[y0 + 1, x0] * (1 - fx) + source[y0 + 1, x1] * fx) * fy

    floor, top = np.percentile(sample, 55), np.percentile(sample, 99.7)
    value = np.clip((sample - floor) / max(1e-6, top - floor), 0, 1) ** 0.8
    out = (value * 255).round().astype(np.uint8)
    (ROOT / 'src/generated/milkyWay.png').write_bytes(b'')
    Image.fromarray(out, 'L').save(ROOT / 'src/generated/milkyWay.png', optimize=True)
    manifest = ROOT / 'data/milky-way-eso/manifest.json'
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps({'source': URL, 'page': 'https://www.eso.org/public/images/eso0932a/', 'credit': 'ESO/S. Brunier', 'license': 'CC BY 4.0',
                                    'licenseUrl': 'https://creativecommons.org/licenses/by/4.0/', 'sha256': hashlib.sha256(raw).hexdigest(),
                                    'output': {'width': WIDTH, 'height': HEIGHT, 'layout': 'J2000 equirectangular, RA 0..24h left to right, Dec +90..-90 top to bottom'}}, indent=1) + '\n')
    print('Milky Way texture', out.shape, 'mean', round(float(out.mean()), 1))

if __name__ == '__main__':
    main()
