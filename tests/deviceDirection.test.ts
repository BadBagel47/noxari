import {describe, expect, it} from 'vitest';
import {deviceDirection, PhoneDirectionTracker} from '../src/deviceDirection';

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

describe('continuous phone following', () => {
  const relative = (alpha: number) => ({alpha, beta: 90, gamma: 0, absolute: false});
  const absolute = (alpha: number) => ({...relative(alpha), absolute: true});

  it('uses Android relative rotation while absolute compass settles after a turn', () => {
    const tracker = new PhoneDirectionTracker();
    tracker.update(relative(0), 'deviceorientation');
    expect(tracker.update(absolute(0), 'deviceorientationabsolute')!.heading).toBeCloseTo(0);
    expect(tracker.update(relative(270), 'deviceorientation')!.heading).toBeCloseTo(90);
    for (const alpha of [280, 290, 300]) {
      expect(tracker.update(absolute(alpha), 'deviceorientationabsolute')).toBeNull();
      expect(tracker.update(relative(270), 'deviceorientation')!.heading).toBeCloseTo(90);
    }
  });

  it('hands off from absolute to relative without jumping or losing tilt', () => {
    const tracker = new PhoneDirectionTracker();
    tracker.update(absolute(300), 'deviceorientationabsolute');
    const handoff = tracker.update({...relative(20), beta: 120}, 'deviceorientation')!;
    expect(handoff.heading).toBeCloseTo(60);
    expect(handoff.pitch).toBeCloseTo(30);
    expect(tracker.update(relative(350), 'deviceorientation')!.heading).toBeCloseTo(90);
  });

  it('keeps an iOS north anchor when compass heading changes at rest', () => {
    const tracker = new PhoneDirectionTracker();
    tracker.update({...relative(0), webkitCompassHeading: 0}, 'deviceorientation');
    expect(tracker.update({...relative(270), webkitCompassHeading: 90}, 'deviceorientation')!.heading).toBeCloseTo(90);
    expect(tracker.update({...relative(270), webkitCompassHeading: 75}, 'deviceorientation')!.heading).toBeCloseTo(90);
    expect(tracker.alignNorth()!.heading).toBeCloseTo(0);
  });

  it('preserves manual calibration when late compass readings arrive', () => {
    const tracker = new PhoneDirectionTracker();
    expect(tracker.update(relative(45), 'deviceorientation')!.absolute).toBe(false);
    tracker.alignNorth();
    expect(tracker.update(absolute(0), 'deviceorientationabsolute')).toBeNull();
    expect(tracker.update(relative(315), 'deviceorientation')!.heading).toBeCloseTo(90);
  });

  it('continues following when an iOS compass becomes available after startup', () => {
    const tracker = new PhoneDirectionTracker();
    tracker.update({...relative(0), webkitCompassHeading: 0, webkitCompassAccuracy: -1}, 'deviceorientation');
    tracker.update({...relative(0), webkitCompassHeading: 0, webkitCompassAccuracy: 10}, 'deviceorientation');
    expect(tracker.update({...relative(270), webkitCompassHeading: 80, webkitCompassAccuracy: 10}, 'deviceorientation')!.heading).toBeCloseTo(90);
  });
});
