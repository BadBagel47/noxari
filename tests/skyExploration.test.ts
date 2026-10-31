import {afterEach, describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {clampViewPitch, groundOpacity} from '../src/groundView';
import {MilkyWayPainter, milkyWaySample, type MilkyWayTexture} from '../src/milkyWay';
import {projectHorizontal, projectPerspective} from '../src/skyProjection';
import {finderGuidance} from '../src/finderGuidance';
import {projectedStarVisibility} from '../src/skyVisibility';
import {stockholm} from '../src/astronomy';

function textureFromPng(): MilkyWayTexture {
  const file = readFileSync(new URL('../src/generated/milkyWay.png', import.meta.url));
  const width = file.readUInt32BE(16), height = file.readUInt32BE(20);
  const blocks: Buffer[] = [];
  for (let i = 8; i < file.length;) {
    const length = file.readUInt32BE(i), type = file.toString('ascii', i + 4, i + 8);
    if (type === 'IDAT') blocks.push(file.subarray(i + 8, i + 8 + length));
    i += length + 12;
  }
  const raw = inflateSync(Buffer.concat(blocks));
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    expect(raw[y * (width + 1)]).toBe(0);
    for (let x = 0; x < width; x++) pixels[(y * width + x) * 4] = raw[y * (width + 1) + x + 1];
  }
  return {width, height, pixels};
}
const sample = (texture: MilkyWayTexture, raDegrees: number, dec: number) => {
  const ra = raDegrees * Math.PI / 180, lat = dec * Math.PI / 180;
  return milkyWaySample(texture, Math.cos(lat) * Math.cos(ra), Math.cos(lat) * Math.sin(ra), Math.sin(lat));
};

describe('downward exploration without changing observing constraints', () => {
  it('shows stars only in the revealed simulated lower sky during daylight', () => {
    expect(projectedStarVisibility(35, 25, 1)).toBe(0);
    expect(projectedStarVisibility(35, -25, 0)).toBe(0);
    expect(projectedStarVisibility(35, -25, .6)).toBe(.6);
    expect(projectedStarVisibility(-14, 25, 0)).toBe(1);
  });

  it('keeps ground solid at/above the horizon and fades smoothly to transparent at -25°', () => {
    expect(groundOpacity(90)).toBe(1);
    expect(groundOpacity(0)).toBe(1);
    expect(groundOpacity(-12.5)).toBeCloseTo(.5);
    expect(groundOpacity(-25)).toBe(0);
    expect(groundOpacity(-90)).toBe(0);
    for (let pitch = 0; pitch > -25; pitch--) expect(groundOpacity(pitch - 1)).toBeLessThan(groundOpacity(pitch));
    expect(clampViewPitch(-200)).toBe(-89.9);
    expect(clampViewPitch(200)).toBe(89.9);
  });
  it('projects the lower sky only when explicitly enabled, including nearly straight down', () => {
    const target = {altitude: -60, azimuth: 120}, view = {heading: 120, pitch: -60};
    expect(projectPerspective(target, view, 400, 800)).toBeNull();
    const projected = projectPerspective(target, view, 400, 800, true, true)!;
    expect(projected.x).toBeCloseTo(200); expect(projected.y).toBeCloseTo(400);
    const nadir = projectPerspective({altitude: -89.9, azimuth: 25}, {heading: 25, pitch: -89.9}, 800, 400, true, true)!;
    expect(nadir.x).toBeCloseTo(400); expect(nadir.y).toBeCloseTo(200);
    expect(projectPerspective({altitude: 0, azimuth: 300}, view, 400, 800, true, true)).toBeNull();
    expect(projectHorizontal(target, 400, 400)).toBeNull();
    expect(finderGuidance(target, view).belowHorizon).toBe(true);
    expect(finderGuidance(target, view).centered).toBe(false);
  });
});

describe('sourced J2000 Milky Way grid', () => {
  const texture = textureFromPng();
  it('puts the bright Galactic center and Carina on the band, with both Galactic poles dark', () => {
    expect([texture.width, texture.height]).toEqual([720, 360]);
    expect(sample(texture, 266.405, -28.936)).toBeGreaterThan(80);
    expect(sample(texture, 160, -60)).toBeGreaterThan(30);
    expect(sample(texture, 192.85948, 27.12825)).toBe(0);
    expect(sample(texture, 12.85948, -27.12825)).toBe(0);
  });
  it('samples continuously across RA=0/24h and remains finite at the equatorial poles', () => {
    expect(sample(texture, .0001, 60)).toBeCloseTo(sample(texture, 359.9999, 60), 2);
    expect(Number.isFinite(sample(texture, 0, 90))).toBe(true);
    expect(Number.isFinite(sample(texture, 200, -90))).toBe(true);
  });

  afterEach(() => vi.unstubAllGlobals());
  it('masks the all-sky exterior, caches animation-only redraws and invalidates for direction/date/location', () => {
    let raster: ImageData | undefined;
    const buffer = {createImageData: (width: number, height: number) => ({width, height, data: new Uint8ClampedArray(width * height * 4)}), putImageData: vi.fn((image: ImageData) => { raster = image; })};
    const canvas = {width: 0, height: 0, getContext: () => buffer};
    vi.stubGlobal('document', {createElement: () => canvas});
    const context = {save: vi.fn(), restore: vi.fn(), drawImage: vi.fn(), translate: vi.fn(), scale: vi.fn()} as unknown as CanvasRenderingContext2D;
    const white: MilkyWayTexture = {width: 2, height: 2, pixels: new Uint8ClampedArray(16).fill(255)};
    const painter = new MilkyWayPainter(), time = new Date('2026-01-15T22:00:00Z');
    painter.draw(context, white, time, stockholm, 400, 400, 1, null);
    expect(raster!.data[3]).toBe(0);
    expect(raster!.data[((160 * 320 + 160) * 4) + 3]).toBeGreaterThan(0);
    painter.draw(context, white, time, stockholm, 400, 400, .5, null);
    expect(buffer.putImageData).toHaveBeenCalledTimes(1);
    painter.draw(context, white, time, stockholm, 400, 400, 1, null, false, 2);
    expect(context.translate).toHaveBeenLastCalledWith(200, 200);
    expect(context.scale).toHaveBeenLastCalledWith(2, 2);
    expect(buffer.putImageData).toHaveBeenCalledTimes(1);
    painter.draw(context, white, time, stockholm, 400, 400, 1, {heading: 0, pitch: -60});
    expect(raster!.data[((160 * 320 + 160) * 4) + 3]).toBe(0);
    painter.draw(context, white, time, stockholm, 400, 400, 1, {heading: 0, pitch: -60}, true);
    expect(raster!.data[((160 * 320 + 160) * 4) + 3]).toBeGreaterThan(0);
    painter.draw(context, white, new Date(+time + 3600000), {...stockholm, latitude: -30}, 400, 400, 1, null);
    expect(buffer.putImageData).toHaveBeenCalledTimes(4);
    painter.draw(context, white, time, stockholm, 400, 400, 0, null);
    expect(buffer.putImageData).toHaveBeenCalledTimes(4);
  });
});
