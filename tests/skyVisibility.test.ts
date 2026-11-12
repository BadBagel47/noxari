import {describe, expect, it} from 'vitest';
import {stellarBrightness} from '../src/skyVisibility';

describe('stellar brightness presentation', () => {
  it('F-057: full strength to V 2, clearly visible to V 4, then fading; always monotonic', () => {
    expect(stellarBrightness(-1)).toBe(1);
    expect(stellarBrightness(2)).toBe(1);
    expect(stellarBrightness(4)).toBeCloseTo(.75);
    expect(stellarBrightness(6.5)).toBeCloseTo(.08);
    for (let m = -1; m < 6.5; m += .1) expect(stellarBrightness(m + .1)).toBeLessThanOrEqual(stellarBrightness(m) + 1e-9);
  });
});
