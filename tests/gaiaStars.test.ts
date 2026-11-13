import {describe, expect, it} from 'vitest';
import {decodeGaiaTile, gaiaTileOf, gaiaTilesNear, mergeFaintStars, tileStarts, viewCentre, type GaiaIndex} from '../src/gaiaStars';
import {tappableGaiaMagnitude} from '../src/starPick';

const cells = Array.from({length: 18}, (_, b) => Math.max(1, Math.round(36 * Math.cos((-90 + 10 * b + 5) * Math.PI / 180))));
const index: GaiaIndex = {version: 1, bandDegrees: 10, cells, counts: cells.flatMap(n => Array(n).fill(1)), magnitudeBase: 6, magnitudeScale: 50, colourScale: 50, limitG: 11};

function tile(stars: [number, number, number, number][]) {
  const buffer = new ArrayBuffer(8 + stars.length * 6), view = new DataView(buffer);
  'NXG1'.split('').forEach((c, i) => view.setUint8(i, c.charCodeAt(0)));
  view.setUint32(4, stars.length, true);
  stars.forEach(([ra, dec, mag, colour], i) => { view.setUint16(8 + i * 6, ra, true); view.setUint16(10 + i * 6, dec, true); view.setUint8(12 + i * 6, mag); view.setUint8(13 + i * 6, colour); });
  return buffer;
}

describe('Gaia tiles (F-061)', () => {
  it('places positions in the right band and cell', () => {
    const starts = tileStarts(index);
    expect(gaiaTileOf(index, 0, -90).tile).toBe(0);
    const equator = gaiaTileOf(index, 15, 2);
    expect(equator.band).toBe(9);
    expect(equator.tile).toBe(starts[9] + 1);
    expect(gaiaTileOf(index, 359.99, 89.9).tile).toBe(starts[17] + cells[17] - 1);
  });
  it('finds the tile under a position among the nearest, and more tiles for a wider view', () => {
    const near = gaiaTilesNear(index, 100, 20, 5);
    expect(near.slice(0, 4)).toContain(gaiaTileOf(index, 100, 20).tile);
    expect(gaiaTilesNear(index, 100, 20, 20).length).toBeGreaterThan(near.length);
    expect(gaiaTilesNear({...index, counts: index.counts.map(() => 0)}, 100, 20, 20)).toEqual([]);
  });
  it('decodes a tile into J2000 directions and magnitudes', () => {
    const number = gaiaTileOf(index, 15, 2).tile, width = 360 / cells[9];
    const decoded = decodeGaiaTile(index, number, tile([[32768, 32768, 150, 60], [0, 0, 250, 255]]));
    expect(decoded.count).toBe(2);
    expect(decoded.magnitude[0]).toBeCloseTo(9, 5);
    const ra = Math.atan2(decoded.equatorial[1], decoded.equatorial[0]) * 180 / Math.PI, dec = Math.asin(decoded.equatorial[2]) * 180 / Math.PI;
    expect(ra).toBeCloseTo(width * 1.5, 2);
    expect(dec).toBeCloseTo(5, 2);
    expect(() => decodeGaiaTile(index, number, tile([[0, 0, 0, 0]]).slice(0, 10))).toThrow();
  });
  it('merges binocular stars and tiles in magnitude order with tags', () => {
    const binocular = {count: 2, equatorial: new Float32Array([1, 0, 0, 0, 1, 0]), magnitude: new Float32Array([7, 8.4])};
    const a = decodeGaiaTile(index, 5, tile([[0, 0, 100, 0], [0, 0, 200, 0]]));
    const merged = mergeFaintStars(binocular, [a])!;
    [7, 8, 8.4, 10].forEach((value, i) => expect(merged.magnitude[i]).toBeCloseTo(value, 5));
    expect(Array.from(merged.tag)).toEqual([-1, 5 * 2 ** 20, -1, 5 * 2 ** 20 + 1]);
    expect(mergeFaintStars(null, [])).toBeNull();
  });
  it('looks straight up at the celestial pole from the north pole', () => {
    const centre = viewCentre({heading: 0, pitch: 90}, new Date('2026-01-01T00:00:00Z'), {latitude: 89.999, longitude: 0, timeZone: 'UTC', label: 'pole'} as never);
    expect(centre.dec).toBeGreaterThan(89);
  });
  it('makes Gaia stars tappable only when zoomed in', () => {
    expect(tappableGaiaMagnitude(2, 8.5)).toBe(0);
    expect(tappableGaiaMagnitude(3, 11)).toBeCloseTo(11);
    expect(tappableGaiaMagnitude(2.7, 9.8)).toBeLessThanOrEqual(9.8);
  });
});

describe('faint star tints (F-061)', () => {
  it('maps colour indices to five groups and keeps neutral stars in the neutral group', async () => {
    const {FAINT_TINTS, faintTintGroups, gaiaColourIndex} = await import('../src/gaiaStars');
    const groups = faintTintGroups(new Float32Array([-.2, .3, .45, 1, 2]));
    expect(Array.from(groups)).toEqual([0, 1, 2, 3, 4]);
    expect(FAINT_TINTS[2]).toBe(.45);
    expect(gaiaColourIndex(255)).toBe(.45);
    expect(gaiaColourIndex(Math.round((.82 + .5) * 50))).toBeCloseTo(.66, 1);
  });
});
