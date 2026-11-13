import {describe, expect, it} from 'vitest';
import {prefilterMilkyWay, type MilkyWayTexture} from '../src/milkyWay';

const texture = (width: number, height: number, fill: (x: number, y: number) => number[]): MilkyWayTexture => {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) pixels.set(fill(x, y), (y * width + x) * 4);
  return {width, height, pixels, color: true};
};
const alphaAt = (t: MilkyWayTexture, x: number, y: number) => t.pixels[(y * t.width + x) * 4 + 3];

describe('prefilterMilkyWay (B-015)', () => {
  it('keeps a constant texture unchanged', () => {
    const result = prefilterMilkyWay(texture(12, 6, () => [100, 120, 140, 200]));
    expect([...result.pixels.slice(0, 4)]).toEqual([100, 120, 140, 200]);
    expect(alphaAt(result, 11, 5)).toBe(200);
  });
  it('spreads a single bright grain and keeps its energy', () => {
    const source = texture(16, 9, (x, y) => x === 8 && y === 4 ? [255, 255, 255, 255] : [0, 0, 0, 0]);
    const result = prefilterMilkyWay(source);
    expect(alphaAt(result, 8, 4)).toBeLessThan(255);
    expect(alphaAt(result, 7, 4)).toBeGreaterThan(0);
    expect(alphaAt(result, 8, 3)).toBeGreaterThan(0);
    let sum = 0; for (let i = 3; i < result.pixels.length; i += 4) sum += result.pixels[i];
    expect(sum).toBeGreaterThan(255 * .9);
    expect(sum).toBeLessThan(255 * 1.1);
  });
  it('wraps across the RA seam', () => {
    const result = prefilterMilkyWay(texture(16, 5, x => x === 0 ? [255, 255, 255, 255] : [0, 0, 0, 0]));
    expect(alphaAt(result, 15, 2)).toBeGreaterThan(0);
  });
  it('leaves the grey fallback grid alone', () => {
    const grey: MilkyWayTexture = {width: 4, height: 2, pixels: new Uint8ClampedArray(32).fill(9)};
    expect(prefilterMilkyWay(grey)).toBe(grey);
  });
});
