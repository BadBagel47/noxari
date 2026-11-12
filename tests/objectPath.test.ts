import {describe, expect, it} from 'vitest';
import {objects} from '../src/data';
import {issObject} from '../src/issObject';
import {hasPath, movesAmongStars, nightPath, objectPath, starPathSamples} from '../src/objectPath';
import {objectPosition, stockholm} from '../src/astronomy';

const find = (id: string) => objects.find(object => object.id === id)!;
const time = new Date('2026-11-12T22:27:00Z');

describe('F-053 object path', () => {
  it('samples tonight every 10 minutes with whole-hour marks in the local time zone', () => {
    const {night, hours} = nightPath(find('m42'), time, stockholm);
    expect(night.length).toBeGreaterThan(80);
    expect(hours.length).toBeGreaterThan(12);
    expect(hours.every(mark => /^\d\d$/.test(mark.label))).toBe(true);
    expect(hours.map(mark => mark.label)).toContain('00');
  });

  it('passes through the object’s position at the hour marks', () => {
    const {hours} = nightPath(find('saturn'), time, stockholm);
    const mark = hours[3], actual = objectPosition(find('saturn'), mark.time, stockholm)!;
    expect(mark.altitude).toBeCloseTo(actual.altitude, 6);
    expect(mark.azimuth).toBeCloseTo(actual.azimuth, 6);
  });

  it('shows motion among the stars only for solar-system bodies and never for the ISS', () => {
    expect(movesAmongStars(find('jupiter'))).toBe(true);
    expect(movesAmongStars(find('m31'))).toBe(false);
    expect(hasPath(issObject)).toBe(false);
    expect(objectPath(find('m31'), time, stockholm).stars).toHaveLength(0);
    const moon = starPathSamples(find('moon'), time, stockholm, 'sv')!;
    expect(moon).toHaveLength(97);
    expect(moon.filter(sample => sample.label)).toHaveLength(6);
    // The Moon moves roughly 13° per day eastwards among the stars.
    const middle = moon[48], dayLater = moon[64];
    const separation = Math.acos(Math.sin(middle.dec * Math.PI / 180) * Math.sin(dayLater.dec * Math.PI / 180) + Math.cos(middle.dec * Math.PI / 180) * Math.cos(dayLater.dec * Math.PI / 180) * Math.cos((dayLater.ra - middle.ra) * Math.PI / 12)) * 180 / Math.PI;
    expect(separation).toBeGreaterThan(10);
    expect(separation).toBeLessThan(16);
  });

  it('the star-path sample at the shown time matches the calculated position', () => {
    const path = objectPath(find('mars'), time, stockholm, 'en');
    const actual = objectPosition(find('mars'), time, stockholm)!;
    expect(path.stars[48].altitude).toBeCloseTo(actual.altitude, 1);
    expect(path.days.length).toBe(8);
  });
});
