import {describe, expect, it} from 'vitest';
import {moonInfo, moonPhaseName} from '../src/moonInfo';
import {stockholm} from '../src/astronomy';

describe('moon info', () => {
  it('names phases by elongation angle', () => {
    expect(moonPhaseName(0)).toBe('new'); expect(moonPhaseName(90)).toBe('firstQuarter');
    expect(moonPhaseName(180)).toBe('full'); expect(moonPhaseName(270)).toBe('lastQuarter'); expect(moonPhaseName(359)).toBe('new');
  });
  it('finds a full moon and upcoming rise/set events', () => {
    // 2026-01-03 is a full moon (≈10:03 UTC).
    const info = moonInfo(new Date('2026-01-03T12:00:00Z'), stockholm);
    expect(info.phase).toBe('full'); expect(info.illumination).toBeGreaterThan(.97);
    expect(info.rise).not.toBeNull(); expect(info.set).not.toBeNull();
    expect(info.rise!.getTime()).toBeGreaterThan(new Date('2026-01-03T12:00:00Z').getTime());
  });
});
