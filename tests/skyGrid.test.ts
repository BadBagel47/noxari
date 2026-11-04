import {describe, expect, it} from 'vitest';
import {horizonGrid} from '../src/skyGrid';
import {createPerspectiveProjector, createPreparedPerspectiveProjector} from '../src/skyProjection';

describe('prepared horizon grid', () => {
  it('reuses two fixed curve sets with the original samples and horizon coverage', () => {
    const above = horizonGrid(false), below = horizonGrid(true);
    expect(horizonGrid(false)).toBe(above);expect(horizonGrid(true)).toBe(below);
    expect(above).toHaveLength(15);expect(below).toHaveLength(18);
    expect(above[0]).toHaveLength(361);expect(above[3]).toHaveLength(91);
    expect(below[6]).toHaveLength(181);
    expect(above[0][0]).toMatchObject({altitude: 15, azimuth: 0});
    expect(above[0][360]).toMatchObject({altitude: 15, azimuth: 360});
    expect(below[6][0]).toMatchObject({altitude: -90, azimuth: 0});
    expect(below[6][180]).toMatchObject({altitude: 90, azimuth: 0});
  });
  it('matches raw projection for visible grid samples across wrap, zoom and near-vertical views', () => {
    for (const pitch of [-89.9, -25, 0, 31, 89.9]) for (const heading of [0, 180, 359.9]) {
      const view = {heading, pitch}, below = pitch < 0;
      const before = createPerspectiveProjector(view, 390, 844, true, below, 1.7);
      const after = createPreparedPerspectiveProjector(view, 390, 844, true, below, 1.7);
      for (const arc of horizonGrid(below)) for (const sample of arc) {
        const a = before(sample), b = after(sample);
        expect(Boolean(b)).toBe(Boolean(a));
        if (a && b) {expect(b.x).toBeCloseTo(a.x, 7);expect(b.y).toBeCloseTo(a.y, 7);}
      }
    }
  });
});
