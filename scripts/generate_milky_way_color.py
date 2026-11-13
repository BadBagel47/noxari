"""F-056 / F-060: colour Milky Way texture from the ESO/S. Brunier panorama (eso0932a, CC BY 4.0).

Same source, checksum and galactic→J2000 reprojection as scripts/generate_milky_way_eso.py,
but kept in colour and at 2880×1440 (1/8° per pixel). A small median filter removes
point stars (the app draws its own catalogue stars) while keeping the grainy structure of
unresolved star clouds and dust lanes. Output: RGBA WebP where A is the brightness used by
the renderer (bright point residues replaced by their local median) and RGB is the (gently desaturated) colour at full value.

F-060 (v2, 2026-11-13): closer to the photograph. Brightness floor at the 20th percentile
(v1: 55th) so the faint outer glow and dark dust lanes show, top at 99.5 (v1: 99.8), gamma 0.7
(v1: 0.85) and colour kept at 80 % saturation (v1: 55 %). v1 stays in git history and in
public/sky/milky-way-color-v1.webp.

Run: python3 scripts/generate_milky_way_color.py path/to/eso0932a.jpg
Writes: public/sky/milky-way-color-v2.webp and data/milky-way-eso/color-manifest.json
"""
import hashlib, json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SHA = '60400c92c54b7c1bd12299c69e83b16e5b6256e7dabacc478c021758ecd28179'
WIDTH, HEIGHT = 2880, 1440
FLOOR, TOP, GAMMA, SATURATION = 20, 99.5, 0.7, 0.8
VERSION = 2
Image.MAX_IMAGE_PIXELS = None
R = np.array([[-0.0548755604, -0.8734370902, -0.4838350155],
              [ 0.4941094279, -0.4448296300,  0.7469822445],
              [-0.8676661490, -0.1980763734,  0.4559837762]])


def main():
    raw = Path(sys.argv[1]).read_bytes()
    if hashlib.sha256(raw).hexdigest() != SHA:
        raise SystemExit('ESO panorama checksum mismatch')
    image = Image.open(sys.argv[1]).convert('RGB').filter(ImageFilter.MedianFilter(5))
    source = np.asarray(image, dtype=np.float32)
    sh, sw = source.shape[:2]
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
    fx = (x - x0)[..., None]; fy = np.clip(y - y0, 0, 1)[..., None]
    x0 %= sw; x1 = (x0 + 1) % sw
    rgb = (source[y0, x0] * (1 - fx) + source[y0, x1] * fx) * (1 - fy) + (source[y0 + 1, x0] * (1 - fx) + source[y0 + 1, x1] * fx) * fy
    lum = rgb @ np.array([.2126, .7152, .0722], dtype=np.float32)
    floor, top = np.percentile(lum, FLOOR), np.percentile(lum, TOP)
    alpha = np.clip((lum - floor) / max(1e-6, top - floor), 0, 1) ** GAMMA
    # Colour at full value, desaturated toward neutral so the band reads as starlight, not paint.
    chroma = rgb / np.maximum(rgb.max(axis=-1, keepdims=True), 1)
    chroma = SATURATION * chroma + (1 - SATURATION) * chroma.mean(axis=-1, keepdims=True)
    chroma = chroma / np.maximum(chroma.max(axis=-1, keepdims=True), 1e-6)
    # Remove leftover bright points (bright stars and the planets present when the photo was taken):
    # wherever the brightness clearly exceeds its 17×17 local median, use the local median instead.
    alpha_img = Image.fromarray((alpha * 255).astype(np.uint8), 'L')
    local = np.asarray(alpha_img.filter(ImageFilter.MedianFilter(17)), dtype=np.float32) / 255
    spots = np.asarray(Image.fromarray(((alpha > local * 1.8 + .1) & (local < .45)).astype(np.uint8) * 255, 'L').filter(ImageFilter.MaxFilter(7))) > 0
    alpha = np.where(spots, local, alpha)
    out = np.concatenate([(chroma * 255).round(), (alpha[..., None] * 255).round()], axis=-1).astype(np.uint8)
    target = ROOT / f'public/sky/milky-way-color-v{VERSION}.webp'
    target.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, 'RGBA').save(target, 'WEBP', quality=82, method=6)
    (ROOT / 'data/milky-way-eso/color-manifest.json').write_text(json.dumps({
        'source': 'https://cdn.eso.org/images/large/eso0932a.jpg', 'page': 'https://www.eso.org/public/images/eso0932a/', 'credit': 'ESO/S. Brunier',
        'license': 'CC BY 4.0', 'licenseUrl': 'https://creativecommons.org/licenses/by/4.0/', 'sha256': SHA,
        'output': {'file': f'public/sky/milky-way-color-v{VERSION}.webp', 'width': WIDTH, 'height': HEIGHT, 'bytes': target.stat().st_size,
                   'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                   'layout': 'J2000 equirectangular; RGB colour at full value, A brightness'}}, indent=1) + '\n')
    print('colour texture', out.shape, target.stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
