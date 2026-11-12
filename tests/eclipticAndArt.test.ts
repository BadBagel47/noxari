import {describe, expect, it} from 'vitest';
import {eclipticEquatorial} from '../src/ecliptic';
import {affineFromTriangles} from '../src/constellationArt';
import {constellationArt} from '../src/generated/constellationArt';
import {namedStarObjects} from '../src/namedStars';

describe('ecliptic and constellation art geometry', () => {
  it('passes through the equinoxes and solstices', () => {
    const samples = eclipticEquatorial(90);
    expect(samples[0][0]).toBeCloseTo(0, 6); expect(samples[0][1]).toBeCloseTo(0, 6);
    expect(samples[1][0]).toBeCloseTo(6, 6); expect(samples[1][1]).toBeCloseTo(23.4393, 3);
    expect(samples[3][0]).toBeCloseTo(18, 6); expect(samples[3][1]).toBeCloseTo(-23.4393, 3);
  });
  it('maps three image anchors exactly onto their screen points', () => {
    const m = affineFromTriangles([[0, 0], [10, 0], [0, 10]], [{x: 5, y: 5}, {x: 25, y: 5}, {x: 5, y: 35}])!;
    const at = (u: number, v: number) => [m.a * u + m.c * v + m.e, m.b * u + m.d * v + m.f];
    expect(at(10, 0)).toEqual([25, 5]); expect(at(0, 10)).toEqual([5, 35]); expect(at(10, 10)).toEqual([25, 35]);
    expect(affineFromTriangles([[0, 0], [1, 1], [2, 2]], [{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 2}])).toBeNull();
  });
  it('ships three anchors with coordinates for every illustration', () => {
    expect(constellationArt.length).toBe(85);
    for (const art of constellationArt) {
      expect(art.anchors).toHaveLength(3);
      for (const [, , , ra, dec] of art.anchors) { expect(ra).toBeGreaterThanOrEqual(0); expect(ra).toBeLessThan(24); expect(Math.abs(dec)).toBeLessThanOrEqual(90); }
    }
  });
  it('turns named bright stars into unique selectable star objects', () => {
    const ids = new Set(namedStarObjects.map(star => star.id));
    expect(ids.size).toBe(namedStarObjects.length);
    expect(namedStarObjects.some(star => star.en === 'Vega' && star.kind === 'Star')).toBe(true);
    expect(namedStarObjects.some(star => star.en === 'Sirius')).toBe(false);
    expect(namedStarObjects.find(star => star.en === 'Polaris')?.sv).toBe('Polstjärnan');
  });
});

import {artViewFade} from '../src/constellationArt';
import {prepareHorizontalDirection} from '../src/skyProjection';
describe('constellation art view fade', () => {
  const at = (altitude: number, azimuth: number) => ({altitude, azimuth, ...prepareHorizontalDirection({altitude, azimuth})});
  it('keeps drawings near the view direction and hides far ones', () => {
    expect(artViewFade(at(30, 180), {heading: 180, pitch: 30})).toBe(1);
    expect(artViewFade(at(30, 220), {heading: 180, pitch: 30})).toBe(1);
    expect(artViewFade(at(30, 270), {heading: 180, pitch: 30})).toBe(0);
    const mid = artViewFade(at(0, 230), {heading: 180, pitch: 0});
    expect(mid).toBeGreaterThan(0); expect(mid).toBeLessThan(1);
  });
});
