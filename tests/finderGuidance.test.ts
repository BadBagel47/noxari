import {describe, expect, it} from 'vitest';
import {finderArrowRotation, finderGuidance} from '../src/finderGuidance';
import {nextObjectRise, objectPosition, stockholm} from '../src/astronomy';
import {objects} from '../src/data';

describe('target guidance in the horizontal sky', () => {
  it('chooses the shortest turn across north in either direction', () => {
    expect(finderGuidance({azimuth: 1, altitude: 20}, {heading: 359, pitch: 20}).headingDelta).toBe(2);
    expect(finderGuidance({azimuth: 359, altitude: 20}, {heading: 1, pitch: 20}).headingDelta).toBe(-2);
  });
  it('reports independent tilt and true angular distance', () => {
    const target = finderGuidance({azimuth: 90, altitude: 30}, {heading: 0, pitch: 0});
    expect(target.headingDelta).toBe(90);
    expect(target.altitudeDelta).toBe(30);
    expect(target.separation).toBeCloseTo(90);
    expect(target.centered).toBe(false);
  });
  it('recognizes centered directions near zenith despite a large azimuth difference', () => {
    expect(finderGuidance({azimuth: 180, altitude: 90}, {heading: 0, pitch: 89}).centered).toBe(true);
    expect(finderGuidance({azimuth: 20, altitude: 30}, {heading: 20, pitch: 30}).separation).toBeCloseTo(0, 5);
  });
  it('never marks a below-horizon target as centered', () => {
    const below = finderGuidance({azimuth: 20, altitude: -10}, {heading: 20, pitch: -10});
    expect(below.belowHorizon).toBe(true);
    expect(below.centered).toBe(false);
  });
  it('points right in front and left for a target directly behind', () => {
    expect(finderArrowRotation({azimuth: 40, altitude: 0}, {heading: 0, pitch: 0}, 400, 300, {x: 350, y: 150})).toBeCloseTo(90);
    expect(finderArrowRotation({azimuth: 270, altitude: 0}, {heading: 90, pitch: 0}, 400, 300, null)).toBeCloseTo(-90);
  });
});

describe('next geometric target rise', () => {
  const sirius = objects.find(object => object.id === 'sirius')!;
  it('brackets a real horizon crossing rather than returning an arbitrary time', () => {
    const time = new Date('2026-01-15T12:00:00Z');
    expect(objectPosition(sirius, time, stockholm)!.altitude).toBeLessThan(0);
    const rise = nextObjectRise(sirius, time, stockholm)!;
    expect(rise).not.toBeNull();
    expect(rise.getTime() - time.getTime()).toBeLessThan(48 * 3600000);
    expect(objectPosition(sirius, new Date(rise.getTime() - 120000), stockholm)!.altitude).toBeLessThan(0);
    expect(objectPosition(sirius, new Date(rise.getTime() + 120000), stockholm)!.altitude).toBeGreaterThan(0);
  });
  it('does not invent a rise for a circumpolar-below object or a constellation demo', () => {
    const m31 = objects.find(object => object.id === 'm31')!;
    expect(nextObjectRise(m31, new Date('2026-01-15T12:00:00Z'), {...stockholm, latitude: -80})).toBeNull();
    const orion = objects.find(object => object.id === 'orion')!;
    expect(nextObjectRise(orion, new Date(), stockholm)).toBeNull();
  });
});
