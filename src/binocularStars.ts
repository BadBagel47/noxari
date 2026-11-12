import {AstroTime, Observer, Rotation_EQJ_HOR} from 'astronomy-engine';
import type {ObservingLocation} from './astronomy';

/**
 * F-043: stars 6.5 < V <= 8.5 from HYG v4.1 (CC BY-SA 4.0), sorted by magnitude.
 * Loaded only when a binocular/whole-catalog level is chosen. Directions are
 * J2000 unit vectors; one 3×3 rotation per time change gives horizontal
 * directions, so no per-star objects are allocated.
 */
export type FaintStars = {count: number; equatorial: Float32Array; magnitude: Float32Array};
/** Horizontal directions (cosAlt·cosAz, cosAlt·sinAz, sinAlt) per star, same as the GPU star attribute. */
export type FaintSky = {count: number; direction: Float32Array; magnitude: Float32Array};

export function decodeFaintStars(buffer: ArrayBuffer): FaintStars {
  const view = new DataView(buffer);
  if (buffer.byteLength < 8 || String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)) !== 'NXS1') throw new Error('Unknown star file');
  const count = view.getUint32(4, true);
  if (buffer.byteLength !== 8 + count * 5) throw new Error('Truncated star file');
  const equatorial = new Float32Array(count * 3), magnitude = new Float32Array(count);
  const raOffset = 8, decOffset = 8 + count * 2, magOffset = 8 + count * 4;
  for (let i = 0; i < count; i++) {
    const ra = view.getUint16(raOffset + i * 2, true) / 65536 * 2 * Math.PI;
    const dec = view.getInt16(decOffset + i * 2, true) / 32767 * Math.PI / 2;
    const cosDec = Math.cos(dec);
    equatorial[i * 3] = cosDec * Math.cos(ra);
    equatorial[i * 3 + 1] = cosDec * Math.sin(ra);
    equatorial[i * 3 + 2] = Math.sin(dec);
    magnitude[i] = 6.5 + view.getUint8(magOffset + i) / 100;
  }
  return {count, equatorial, magnitude};
}

let pending: Promise<FaintStars> | null = null;
export function loadFaintStars(base: string) {
  pending ??= fetch(`${base}stars/binocular-v1.bin`).then(response => {
    if (!response.ok) throw new Error(String(response.status));
    return response.arrayBuffer();
  }).then(decodeFaintStars);
  pending.catch(() => { pending = null; });
  return pending;
}

export function faintSky(stars: FaintStars, time: Date, location: ObservingLocation): FaintSky {
  const rot = Rotation_EQJ_HOR(new AstroTime(time), new Observer(location.latitude, location.longitude, 0)).rot;
  const {count, equatorial} = stars, direction = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = equatorial[i * 3], y = equatorial[i * 3 + 1], z = equatorial[i * 3 + 2];
    // Astronomy Engine RotateVector convention; azimuth = atan2(-y, x) in its horizontal frame.
    direction[i * 3] = rot[0][0] * x + rot[1][0] * y + rot[2][0] * z;
    direction[i * 3 + 1] = -(rot[0][1] * x + rot[1][1] * y + rot[2][1] * z);
    direction[i * 3 + 2] = rot[0][2] * x + rot[1][2] * y + rot[2][2] * z;
  }
  return {count, direction, magnitude: stars.magnitude};
}

/** Number of stars at or brighter than the limit (magnitudes are sorted). */
export function faintCount(magnitude: Float32Array, limit: number) {
  let low = 0, high = magnitude.length;
  while (low < high) { const mid = (low + high) >> 1; if (magnitude[mid] <= limit) low = mid + 1; else high = mid; }
  return low;
}
