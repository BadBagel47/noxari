import {AstroTime, Observer, RotateVector, Rotation_HOR_EQJ, Vector} from 'astronomy-engine';
import type {ObservingLocation} from './astronomy';
import type {ViewDirection} from './skyProjection';

/** `color` (F-056): RGB is the band's colour at full value and A its brightness; otherwise R is brightness (grey grid). */
export type MilkyWayTexture = {width: number; height: number; pixels: Uint8ClampedArray; color?: boolean};
const TAU = 2 * Math.PI;
/** Opacity of the colour texture at full brightness (shared with the GPU shader). */
export const MILKY_WAY_COLOR_STRENGTH = .7;
/** Samples on the long axis of the Milky Way raster (shared with the GPU path). B-017: 360 keeps more detail than 240. */
export const MILKY_WAY_RASTER = 360;
/** F-060: full strength at 1×, about half at 3× (the band is a backdrop; zoomed in, stars matter). */
export const milkyWayZoomFade = (zoom: number) => 1 / (1 + .5 * (Math.max(1, zoom) - 1));

/**
 * B-015: the colour texture keeps the grain of unresolved star clouds (≈0.125° per texel) but both
 * painters sample it into a raster of at most 360 samples on the long axis (≈0.25° per sample). Without
 * filtering each sample hits one grain, and the grain changes as the view moves, which shimmers. One
 * prefilter at load (one 3-texel box pass, wrapped in RA, colour weighted by brightness) makes the
 * result stable while panning in both the GPU and Canvas paths, and costs nothing per frame.
 */
export function prefilterMilkyWay(texture: MilkyWayTexture, passes = 1): MilkyWayTexture {
  if (!texture.color) return texture;
  const {width, height} = texture;
  let source: Uint8ClampedArray = texture.pixels, target: Uint8ClampedArray = new Uint8ClampedArray(source.length);
  for (let pass = 0; pass < passes * 2; pass++) {
    const horizontal = pass % 2 === 0;
    // Horizontal passes read rows; vertical passes read columns clamped at the poles.
    const length = horizontal ? width : height, lines = horizontal ? height : width;
    for (let line = 0; line < lines; line++) {
      const index = (position: number) => (horizontal ? line * width + position : position * width + line) * 4;
      for (let position = 0; position < length; position++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;
        for (let d = -1; d <= 1; d++) {
          const near = horizontal ? (position + d + length) % length : Math.max(0, Math.min(length - 1, position + d)), i = index(near), alpha = source[i + 3];
          r += source[i] * alpha; g += source[i + 1] * alpha; b += source[i + 2] * alpha; a += alpha; count++;
        }
        const o = index(position);
        if (a > 0) { target[o] = r / a; target[o + 1] = g / a; target[o + 2] = b / a; } else { target[o] = source[o]; target[o + 1] = source[o + 1]; target[o + 2] = source[o + 2]; }
        target[o + 3] = a / count;
      }
    }
    [source, target] = [target, source === texture.pixels ? new Uint8ClampedArray(source.length) : source];
  }
  return {...texture, pixels: source as MilkyWayTexture['pixels']};
}

// The generated grid has RA increasing to the right (periodic), Dec north at
// the top. Bilinear samples cross the 0/24h seam without a texture discontinuity.
export function milkyWaySample(texture: MilkyWayTexture, x: number, y: number, z: number, channel = texture.color ? 3 : 0) {
  const lon = (Math.atan2(y, x) + TAU) % TAU;
  const lat = Math.atan2(z, Math.hypot(x, y));
  const u = lon / TAU * texture.width - .5;
  const v = Math.max(0, Math.min(texture.height - 1, (.5 - lat / Math.PI) * texture.height - .5));
  const left = Math.floor(u), top = Math.floor(v), fx = u - left, fy = v - top;
  const at = (col: number, row: number) => texture.pixels[(Math.min(texture.height - 1, row) * texture.width + (col + texture.width) % texture.width) * 4 + channel];
  return (at(left, top) * (1 - fx) + at(left + 1, top) * fx) * (1 - fy)
    + (at(left, top + 1) * (1 - fx) + at(left + 1, top + 1) * fx) * fy;
}

/** Byte offset of the nearest texel for a J2000 direction. */
export function milkyWayTexel(texture: MilkyWayTexture, x: number, y: number, z: number) {
  const col = Math.floor((Math.atan2(y, x) + TAU) % TAU / TAU * texture.width) % texture.width;
  const row = Math.max(0, Math.min(texture.height - 1, Math.floor((.5 - Math.atan2(z, Math.hypot(x, y)) / Math.PI) * texture.height)));
  return (row * texture.width + col) * 4;
}

/** Columns are north, west, up in J2000, matching the CPU inverse-ray painter. */
export function milkyWayBasis(time: Date, location: ObservingLocation) {
  const rotation = Rotation_HOR_EQJ(time, new Observer(location.latitude, location.longitude, 0));
  const instant = new AstroTime(time);
  return new Float32Array([[1, 0, 0], [0, 1, 0], [0, 0, 1]].flatMap(([x, y, z]) => {
    const p = RotateVector(rotation, new Vector(x, y, z, instant));
    return [p.x, p.y, p.z];
  }));
}

// An inverse ray lookup avoids polygon edges stretching across the camera or
// horizon. The field is cached between animation-only repaints. At most 360
// samples on the long axis keep orientation updates responsive on mobile.
export class MilkyWayPainter {
  private canvas: HTMLCanvasElement | null = null;
  private key = '';
  private texture: MilkyWayTexture | null = null;

  draw(context: CanvasRenderingContext2D, texture: MilkyWayTexture, time: Date, location: ObservingLocation, width: number, height: number, visibility: number, view: ViewDirection | null, belowHorizon = false, zoom = 1) {
    if (visibility <= 0 || width <= 0 || height <= 0) return;
    const key = [time.getTime(), location.latitude, location.longitude, width, height, view?.heading, view?.pitch, belowHorizon].join('|');
    if (!this.canvas || this.key !== key || this.texture !== texture) {
      this.canvas ??= document.createElement('canvas');
      const scale = Math.max(width, height) / MILKY_WAY_RASTER;
      const cols = Math.max(1, Math.round(width / scale)), rows = Math.max(1, Math.round(height / scale));
      this.canvas.width = cols; this.canvas.height = rows;
      const buffer = this.canvas.getContext('2d')!;
      const image = buffer.createImageData(cols, rows);
      const rotation = Rotation_HOR_EQJ(time, new Observer(location.latitude, location.longitude, 0));
      const instant = new AstroTime(time);
      const rotate = (x: number, y: number, z: number) => RotateVector(rotation, new Vector(x, y, z, instant));
      const north = rotate(1, 0, 0), west = rotate(0, 1, 0), up = rotate(0, 0, 1);
      const heading = (view?.heading ?? 0) * Math.PI / 180, pitch = (view?.pitch ?? 0) * Math.PI / 180;
      const ch = Math.cos(heading), sh = Math.sin(heading), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const radius = Math.min(cols, rows) * .44, focal = Math.max(cols, rows) / 2;
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const dx = col + .5 - cols / 2, dy = rows / 2 - row - .5;
        let n: number, w: number, u: number;
        if (view) {
          const right = dx / focal, above = dy / focal;
          n = cp * ch - right * sh - above * sp * ch;
          w = -cp * sh - right * ch + above * sp * sh;
          u = sp + above * cp;
        } else {
          const distance = Math.hypot(dx, dy) / radius;
          if (distance > 1) continue;
          const alt = (1 - distance) * Math.PI / 2, az = Math.atan2(dx, dy);
          n = Math.cos(alt) * Math.cos(az); w = -Math.cos(alt) * Math.sin(az); u = Math.sin(alt);
        }
        if (u < 0 && !belowHorizon) continue;
        const value = milkyWaySample(texture,
          n * north.x + w * west.x + u * up.x,
          n * north.y + w * west.y + u * up.y,
          n * north.z + w * west.z + u * up.z);
        const offset = (row * cols + col) * 4;
        if (texture.color) {
          const x = n * north.x + w * west.x + u * up.x, y = n * north.y + w * west.y + u * up.y, z = n * north.z + w * west.z + u * up.z;
          // Colour varies slowly; the nearest texel is enough (brightness above stays bilinear).
          const texel = milkyWayTexel(texture, x, y, z);
          image.data[offset] = texture.pixels[texel]; image.data[offset + 1] = texture.pixels[texel + 1]; image.data[offset + 2] = texture.pixels[texel + 2];
          image.data[offset + 3] = value * MILKY_WAY_COLOR_STRENGTH;
        } else {
          image.data[offset] = 132; image.data[offset + 1] = 154; image.data[offset + 2] = 180;
          image.data[offset + 3] = value * .68;
        }
      }
      buffer.putImageData(image, 0, 0);
      this.key = key;
      this.texture = texture;
    }
    context.save();
    context.globalAlpha = visibility;
    context.imageSmoothingEnabled = true;
    context.translate(width / 2, height / 2);
    context.scale(zoom, zoom);
    context.drawImage(this.canvas, -width / 2, -height / 2, width, height);
    context.restore();
  }
}
