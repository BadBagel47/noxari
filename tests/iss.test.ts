import {describe, expect, it} from 'vitest';
import {issGround, issPasses, issState, setIssElements, issElementAgeDays} from '../src/iss';

// Fixture: CelesTrak GP elements for the ISS, epoch 2026-11-11.
setIssElements({name: 'ISS (ZARYA)', line1: '1 25544U 98067A   26315.85209533  .00008096  00000+0  15318-3 0  9995',
  line2: '2 25544  51.6324 289.3631 0007313  15.2015 344.9192 15.49321770594642', fetchedAt: '2026-11-12T00:00:00Z', source: 'test', sourceUrl: ''});
const time = new Date('2026-11-12T03:00:00Z');

describe('ISS from orbital elements', () => {
  it('is overhead at its own sub-satellite point and south of an observer to its north', () => {
    const ground = issGround(time)!;
    const overhead = issState(time, {name: 'sub', latitude: ground.latitude, longitude: ground.longitude, timeZone: 'UTC'})!;
    expect(overhead.altitude).toBeGreaterThan(85); // geocentric sub-point vs geodetic observer
    const north = issState(time, {name: 'north', latitude: Math.min(80, ground.latitude + 5), longitude: ground.longitude, timeZone: 'UTC'})!;
    expect(Math.abs(north.azimuth - 180)).toBeLessThan(15);
  });
  it('finds several passes over Stockholm within three days and reports element age', () => {
    const passes = issPasses(time, {name: 'Stockholm', latitude: 59.33, longitude: 18.07, timeZone: 'Europe/Stockholm'});
    expect(passes.length).toBeGreaterThan(3);
    for (const pass of passes) { expect(pass.rise <= pass.peak && pass.peak <= pass.set).toBe(true); expect(pass.peakAltitude).toBeGreaterThanOrEqual(10); }
    expect(issElementAgeDays(time)!).toBeGreaterThan(0); expect(issElementAgeDays(time)!).toBeLessThan(1);
  });
});

import {roundedForecastUrl, summarizeClouds} from '../src/CloudForecast';
describe('cloud forecast helpers', () => {
  it('rounds the place to one decimal before it is sent', () => {
    expect(roundedForecastUrl(59.33251, 18.06866)).toContain('latitude=59.3&longitude=18.1');
  });
  it('summarizes clear and cloudy nights', () => {
    const at = (h: number, cover: number) => ({time: new Date(Date.UTC(2026, 0, 1, h)), cover});
    expect(summarizeClouds([at(20, 10), at(21, 5)], true, 'UTC')).toBe('Mest klart hela natten');
    expect(summarizeClouds([at(20, 95), at(21, 90)], true, 'UTC')).toBe('Mulet hela natten');
    expect(summarizeClouds([at(20, 90), at(21, 10), at(22, 20)], true, 'UTC')).toBe('Klarast ≈ 21:00–23:00');
  });
});
