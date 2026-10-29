import {describe, expect, it} from 'vitest';
import {objects} from '../src/data';
import {nightVisibility, objectPosition, showObjectMarker, solarAppearance, stockholm} from '../src/astronomy';
import reference from './fixtures/planets-horizons.json';

describe('new planets against independent NASA/JPL Horizons references', () => {
  for (const sample of reference.samples) {
    it(`places ${sample.body} at Greenwich, including below-horizon positions`, () => {
      const object = objects.find(object => object.id === sample.body.toLowerCase())!;
      const actual = objectPosition(object, new Date(reference.time), reference.observer)!;
      // Astronomy Engine uses a compact planetary model. 0.05° = 3 arcmin;
      // Horizons is airless apparent az/el, on the same geometric horizon.
      const azimuthError = Math.abs((actual.azimuth - sample.azimuth + 540) % 360 - 180);
      expect(azimuthError).toBeLessThan(.05);
      expect(Math.abs(actual.altitude - sample.altitude)).toBeLessThan(.05);
      const curve = nightVisibility(object, new Date(reference.time), stockholm);
      expect(curve.real).toBe(true);
      expect(curve.samples.every(sample => Number.isFinite(sample.altitude) && Math.abs(sample.altitude) <= 90)).toBe(true);
    });
  }
});

describe('solar-system appearance and marker policy', () => {
  const get = (id: string) => objects.find(object => object.id === id)!;
  it('models Venus as a thin crescent near inferior conjunction and a full disk at superior conjunction', () => {
    const crescent = solarAppearance(get('venus'), new Date('2025-03-23T12:00:00Z'))!;
    const full = solarAppearance(get('venus'), new Date('2026-01-06T12:00:00Z'))!;
    expect(crescent.illuminatedFraction).toBeLessThan(.03);
    expect(full.illuminatedFraction).toBeGreaterThan(.99);
    expect(crescent.distanceAu).toBeLessThan(.4);
    expect(full.distanceAu).toBeGreaterThan(1.5);
    expect(crescent.constellation).toBeTruthy();
  });
  it('makes Mars brighter, closer and opposite the Sun at opposition', () => {
    const opposition = solarAppearance(get('mars'), new Date('2025-01-16T12:00:00Z'))!;
    const conjunction = solarAppearance(get('mars'), new Date('2026-01-09T12:00:00Z'))!;
    expect(opposition.sunSeparation).toBeGreaterThan(175);
    expect(conjunction.sunSeparation).toBeLessThan(5);
    expect(opposition.magnitude).toBeLessThan(-1);
    expect(opposition.distanceAu).toBeLessThan(conjunction.distanceAu);
    expect(opposition.illuminatedFraction).toBeGreaterThan(.99);
  });
  it('keeps distant ice-giant photometry plausible and fixed objects unchanged', () => {
    const date = new Date(reference.time);
    const uranus = solarAppearance(get('uranus'), date)!;
    const neptune = solarAppearance(get('neptune'), date)!;
    expect(uranus.distanceAu).toBeGreaterThan(17);
    expect(uranus.distanceAu).toBeLessThan(22);
    expect(uranus.magnitude).toBeGreaterThan(5);
    expect(uranus.magnitude).toBeLessThan(6.5);
    expect(neptune.distanceAu).toBeGreaterThan(28);
    expect(neptune.distanceAu).toBeLessThan(32);
    expect(neptune.magnitude).toBeGreaterThan(7);
    expect(neptune.magnitude).toBeLessThan(9);
    expect(solarAppearance(get('m31'), date)).toBeNull();
  });
  it('allows civil-twilight planets while keeping deep-sky markers hidden', () => {
    for (const id of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      expect(showObjectMarker(get(id), -3)).toBe(true);
      expect(showObjectMarker(get(id), 0)).toBe(false);
    }
    expect(showObjectMarker(get('moon'), 10)).toBe(true);
    expect(showObjectMarker(get('m31'), -3)).toBe(false);
    expect(showObjectMarker(get('m31'), -7)).toBe(true);
  });
});
