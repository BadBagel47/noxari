import {describe, expect, it} from 'vitest';
import {deviceDirection, orientationSampleTime, PhoneDirectionTracker} from '../src/deviceDirection';

describe('phone back-screen direction', () => {
  it('looks north/east/south/west with an upright phone', () => {
    for (const [alpha, heading] of [[0, 0], [270, 90], [180, 180], [90, 270]]) {
      const direction = deviceDirection({alpha, beta: 90, gamma: 0, absolute: true})!;
      expect(direction.heading).toBeCloseTo(heading);
      expect(direction.pitch).toBe(0);
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

  const settle = (tracker: PhoneDirectionTracker, from = 0, relativeAlpha = 0, absoluteAlpha = relativeAlpha) => {
    for (let t = from; t <= from + 1000; t += 100) {
      tracker.update(relative(relativeAlpha), 'deviceorientation', t);
      tracker.update(absolute(absoluteAlpha), 'deviceorientationabsolute', t);
    }
  };

  it('uses Android relative rotation while absolute compass settles after a turn', () => {
    const tracker = new PhoneDirectionTracker();
    settle(tracker);
    expect(tracker.diagnostics(1000).reference).toBe('compass');
    expect(tracker.update(relative(270), 'deviceorientation', 1100)!.heading).toBeCloseTo(90);
    let t = 1200;
    for (const alpha of [280, 290, 300]) {
      expect(tracker.update(absolute(alpha), 'deviceorientationabsolute', t)).toBeNull();
      expect(tracker.update(relative(270), 'deviceorientation', t)!.heading).toBeCloseTo(90);
      t += 100;
    }
    expect(tracker.diagnostics(t).reason).toBeNull();
  });

  it('preserves display and tilt on a late source handoff, while requiring a checked new reference', () => {
    const tracker = new PhoneDirectionTracker();
    for (let t = 0; t <= 1000; t += 100) tracker.update(absolute(300), 'deviceorientationabsolute', t);
    const handoff = tracker.update({...relative(20), beta: 120}, 'deviceorientation', 1100)!;
    expect(handoff.heading).toBeCloseTo(60);
    expect(handoff.pitch).toBeCloseTo(30);
    expect(handoff.absolute).toBe(false);
    expect(tracker.diagnostics(1100).reason).toBe('source-changed');
    expect(tracker.update(relative(350), 'deviceorientation', 1200)!.heading).toBeCloseTo(90);
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
  it('does not pair a stale relative pose with the first absolute reading during a 120° turn', () => {
    const tracker = new PhoneDirectionTracker();
    tracker.update(relative(0), 'deviceorientation', 0);
    tracker.update(absolute(240), 'deviceorientationabsolute', 1200);
    expect(tracker.update(relative(240), 'deviceorientation', 1200)!.absolute).toBe(false);
    expect(tracker.diagnostics(1200).reference).toBe('none');
    settle(tracker, 1300, 240);
    expect(tracker.update(relative(240), 'deviceorientation', 2400)!.heading).toBeCloseTo(120);
    expect(tracker.diagnostics(2400).reference).toBe('compass');
  });

  it('checks fresh stationary pairing in either arrival order and arbitrary relative frames', () => {
    for (const absoluteFirst of [true, false]) {
      const tracker = new PhoneDirectionTracker();
      for (let t = 0; t <= 1000; t += 100) {
        const motions = () => tracker.update(relative(120), 'deviceorientation', t);
        const compass = () => tracker.update(absolute(0), 'deviceorientationabsolute', t);
        if (absoluteFirst) { compass(); motions(); } else { motions(); compass(); }
      }
      expect(tracker.update(relative(120), 'deviceorientation', 1100)!.heading).toBeCloseTo(0);
      expect(tracker.diagnostics(1100).reference).toBe('compass');
    }
  });

  it('detects persistent 120° disagreement at rest, never rewinds automatically, and explicitly reanchors', () => {
    const tracker = new PhoneDirectionTracker(); settle(tracker);
    for (let t = 1100; t <= 5000; t += 100) {
      tracker.update(relative(240), 'deviceorientation', t);
      tracker.update(absolute(0), 'deviceorientationabsolute', t);
    }
    const d = tracker.diagnostics(5000);
    expect(d.reason).toBe('disagreement'); expect(d.differenceDegrees).toBeCloseTo(120);
    expect(d.compassReady).toBe(true);
    const wrong = tracker.update(relative(240), 'deviceorientation', 5050)!;
    expect(wrong.heading).toBeCloseTo(120); expect(wrong.absolute).toBe(false);
    expect(tracker.useCompass(5050)!.heading).toBeCloseTo(0);
    expect(tracker.diagnostics(5050).reason).toBeNull();
    tracker.update(absolute(270), 'deviceorientationabsolute', 5100);
    expect(tracker.update(relative(150), 'deviceorientation', 5100)!.heading).toBeCloseTo(90);
  });

  it('does not treat ordinary rapid turns, compass settling, or small disagreement as lasting drift', () => {
    const tracker = new PhoneDirectionTracker(); settle(tracker);
    for (let t = 1100; t <= 4000; t += 100) {
      const alpha = (t / 10) % 360;
      tracker.update(relative(alpha), 'deviceorientation', t);
      tracker.update(absolute(alpha + 60), 'deviceorientationabsolute', t);
    }
    expect(tracker.diagnostics(4000).reason).toBeNull();
    for (let t = 4100; t <= 8000; t += 100) {
      tracker.update(relative(270), 'deviceorientation', t);
      tracker.update(absolute(285), 'deviceorientationabsolute', t);
    }
    expect(tracker.diagnostics(8000).reason).toBeNull();
    expect(tracker.update(relative(270), 'deviceorientation', 8050)!.heading).toBeCloseTo(90);
  });

  it('invalidates a large same-event frame change after successful manual calibration', () => {
    const tracker = new PhoneDirectionTracker();
    tracker.update(relative(120), 'deviceorientation', 0); tracker.alignNorth(0);
    expect(tracker.update(relative(120), 'deviceorientation', 100)!.heading).toBeCloseTo(0);
    const changed = tracker.update(absolute(0), 'deviceorientation', 200)!;
    expect(changed.absolute).toBe(false);
    expect(tracker.diagnostics(200).reason).toBe('reference-changed');
    for (let t = 300; t <= 1300; t += 100) tracker.update(absolute(0), 'deviceorientation', t);
    expect(tracker.useCompass(1300)!.heading).toBeCloseTo(0);
    expect(tracker.diagnostics(1300).check).toBe('compass-only');
  });

  it('preserves manual true-north bias instead of overriding it with magnetic north', () => {
    const tracker = new PhoneDirectionTracker(); settle(tracker, 0, 0, 10);
    tracker.alignNorth(1000);
    for (let t = 1100; t <= 6000; t += 100) {
      tracker.update(relative(270), 'deviceorientation', t);
      tracker.update(absolute(280), 'deviceorientationabsolute', t);
    }
    expect(tracker.diagnostics(6000).reason).toBeNull();
    expect(tracker.diagnostics(6000).differenceDegrees).toBeCloseTo(0);
    expect(tracker.update(relative(270), 'deviceorientation', 6100)!.heading).toBeCloseTo(90);
  });

  it('keeps manual-only fallback explicit and rejects stale, inaccurate or out-of-order compass data', () => {
    const tracker = new PhoneDirectionTracker(); tracker.update(relative(90), 'deviceorientation', 0); tracker.alignNorth(0);
    expect(tracker.diagnostics(0).check).toBe('no-compass');
    expect(tracker.useCompass(1000)).toBeNull();
    tracker.update({...relative(90), webkitCompassHeading: 0, webkitCompassAccuracy: 60}, 'deviceorientation', 1000);
    expect(tracker.diagnostics(1000).compassAgeMs).toBeNull();
    expect(tracker.update(relative(180), 'deviceorientation', 50, 1100)).toBeNull();
    tracker.update(absolute(0), 'deviceorientationabsolute', 0, 1200);
    expect(tracker.diagnostics(1200).compassReady).toBe(false);
    expect(tracker.diagnostics(1200).reason).toBeNull();
  });

  it('keeps near-vertical headings out of compass comparison and shows compass-only limitations', () => {
    const tracker = new PhoneDirectionTracker(); settle(tracker);
    for (let t = 1100; t <= 6000; t += 100) {
      tracker.update({...relative(240), beta: 175}, 'deviceorientation', t);
      tracker.update({...absolute(0), beta: 175}, 'deviceorientationabsolute', t);
    }
    expect(tracker.diagnostics(6000).reason).toBeNull();
    const only = new PhoneDirectionTracker();
    for (let t = 0; t <= 1000; t += 100) only.update(absolute(300), 'deviceorientationabsolute', t);
    expect(only.diagnostics(1000).reference).toBe('compass');
    expect(only.diagnostics(1000).check).toBe('compass-only');
  });

  it('normalizes epoch and monotonic event timestamps without concealing a delayed reading', () => {
    expect(orientationSampleTime(200, 250, 1700000000000)).toBe(200);
    expect(orientationSampleTime(1700000000200, 250, 1700000000000)).toBe(200);
    expect(orientationSampleTime(10, 5000, 1700000000000)).toBe(10);
    expect(orientationSampleTime(NaN, 250, 1700000000000)).toBe(250);
    expect(orientationSampleTime(99999, 250, 1700000000000)).toBe(250);
  });

  it('retains evidence across gaps in a slow but fresh compass stream', () => {
    const tracker = new PhoneDirectionTracker();
    for (let t = 0; t <= 7000; t += 100) {
      tracker.update(relative(t <= 1000 ? 0 : 240), 'deviceorientation', t);
      if (t % 1000 === 0) tracker.update(absolute(0), 'deviceorientationabsolute', t);
    }
    expect(tracker.diagnostics(7000).reason).toBe('disagreement');
  });

  it('accepts a newer pose with a rounded equal timestamp without fabricating elapsed stability', () => {
    const tracker = new PhoneDirectionTracker();
    tracker.update(relative(0), 'deviceorientation', 100, 110);
    tracker.alignNorth(110);
    expect(tracker.update(relative(270), 'deviceorientation', 100, 120)!.heading).toBeCloseTo(90);
    const first = new PhoneDirectionTracker();
    for (let now = 100; now <= 450; now += 50) {
      first.update(relative(0), 'deviceorientation', 100, now);
      first.update(absolute(0), 'deviceorientationabsolute', 100, now);
    }
    expect(first.diagnostics(450).reference).toBe('none');
  });

});
