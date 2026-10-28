import {describe, expect, it} from 'vitest';
import {deviceDirection} from '../src/deviceDirection';

describe('phone back-screen direction', () => {
  it('looks north/east/south/west with an upright phone', () => {
    for (const [alpha, heading] of [[0, 0], [270, 90], [180, 180], [90, 270]]) {
      const direction = deviceDirection({alpha, beta: 90, gamma: 0, absolute: true})!;
      expect(direction.heading).toBeCloseTo(heading);
      expect(direction.pitch).toBeCloseTo(0);
      expect(direction.absolute).toBe(true);
    }
  });
  it('handles upward tilt and the same direction with a landscape phone', () => {
    expect(deviceDirection({alpha: 0, beta: 120, gamma: 0})!.pitch).toBeCloseTo(30);
    const landscape = deviceDirection({alpha: 90, beta: 0, gamma: -90})!;
    expect(landscape.heading).toBeCloseTo(0);
    expect(landscape.pitch).toBeCloseTo(0);
  });
  it('uses an iOS compass reference and identifies relative-only readings', () => {
    expect(deviceDirection({alpha: 30, beta: 90, gamma: 0, webkitCompassHeading: 75})!.heading).toBeCloseTo(75);
    expect(deviceDirection({alpha: 30, beta: 90, gamma: 0})!.absolute).toBe(false);
    expect(deviceDirection({alpha: 30, beta: 90, gamma: 0, webkitCompassHeading: 75, webkitCompassAccuracy: -1})!.absolute).toBe(false);
  });
  it('rejects missing, invalid and vertically ambiguous readings', () => {
    expect(deviceDirection({alpha: null, beta: 90, gamma: 0})).toBeNull();
    expect(deviceDirection({alpha: NaN, beta: 90, gamma: 0})).toBeNull();
    expect(deviceDirection({alpha: 0, beta: 0, gamma: 0})).toBeNull();
  });
});
