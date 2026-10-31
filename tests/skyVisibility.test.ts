import {describe, expect, it} from 'vitest';
import {stellarBrightness} from '../src/skyVisibility';

describe('stellar brightness presentation', () => {
  it('preserves the original range through magnitude 5.8 and dims the newly added faint stars', () => {
    expect(stellarBrightness(-1)).toBe(1);
    expect(stellarBrightness(5.8)).toBe(0.18);
    expect(stellarBrightness(6.2)).toBeGreaterThan(0.05);
    expect(stellarBrightness(6.2)).toBeLessThan(0.18);
    expect(stellarBrightness(6.5)).toBeCloseTo(0.05, 8);
  });
});
