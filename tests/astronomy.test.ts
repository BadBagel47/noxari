import {describe, expect, it} from 'vitest';
import {Body} from 'astronomy-engine';
import {objects} from '../src/data';
import {nightContext, nightVisibility, nightWindow, objectPosition, positionAt, selectedLocalTime, stockholm} from '../src/astronomy';
import {peakSample} from '../src/VisibilityChart';

const greenwich = {name: 'Greenwich', latitude: 51.4779, longitude: 0, timeZone: 'Europe/London'};
const m31 = objects.find(object => object.id === 'm31')!;
const moon = objects.find(object => object.id === 'moon')!;

describe('observer-based astronomy', () => {
  it('places the Sun near the expected meridian altitude at the March equinox', () => {
    // At Greenwich, equinox noon is about 90° − latitude = 38.5° high.
    const sun = positionAt(Body.Sun, new Date('2024-03-20T12:00:00Z'), greenwich);
    expect(sun.altitude).toBeGreaterThan(37);
    expect(sun.altitude).toBeLessThan(40);
    expect(sun.azimuth).toBeGreaterThan(175);
    expect(sun.azimuth).toBeLessThan(185);
  });

  it('moves the Sun higher in northern summer than winter', () => {
    const summer = positionAt(Body.Sun, new Date('2024-06-20T12:00:00Z'), greenwich).altitude;
    const winter = positionAt(Body.Sun, new Date('2024-12-21T12:00:00Z'), greenwich).altitude;
    expect(summer - winter).toBeGreaterThan(45);
  });

  it('changes the Moon’s topocentric position with time and observer location', () => {
    const date = new Date('2024-03-20T12:00:00Z');
    const stockholmMoon = objectPosition(moon, date, stockholm)!;
    const laterMoon = objectPosition(moon, new Date(date.getTime() + 6 * 3600000), stockholm)!;
    const greenwichMoon = objectPosition(moon, date, greenwich)!;
    expect(Math.abs(laterMoon.altitude - stockholmMoon.altitude)).toBeGreaterThan(2);
    expect(Math.abs(greenwichMoon.altitude - stockholmMoon.altitude)).toBeGreaterThan(2);
  });

  it('uses one night window and recomputes a catalog curve for another location', () => {
    const date = new Date('2024-10-15T22:00:00Z');
    const stockholmCurve = nightVisibility(m31, date, stockholm);
    const greenwichCurve = nightVisibility(m31, date, greenwich);
    const window = nightWindow(date, stockholm);
    expect(stockholmCurve.real).toBe(true);
    expect(stockholmCurve.samples.length).toBeGreaterThan(25);
    expect(stockholmCurve.samples[0].time.getTime()).toBe(window.start.getTime());
    expect(stockholmCurve.samples.at(-1)!.time.getTime()).toBe(window.end.getTime());
    expect(stockholmCurve.samples.some(sample => sample.sunAltitude < -18)).toBe(true);
    // Each location now has different sunset-anchored sample times; compare
    // nightly maxima rather than pretending the same index is the same instant.
    expect(Math.abs(Math.max(...stockholmCurve.samples.map(sample => sample.altitude)) - Math.max(...greenwichCurve.samples.map(sample => sample.altitude)))).toBeGreaterThan(5);
    const peak = peakSample(stockholmCurve);
    expect(peak).not.toBeNull();
    expect(peak!.altitude).toBeGreaterThan(0);
    expect(peak!.sunAltitude).toBeLessThan(-6);
  });

  it('keeps constellation example curves explicitly marked as demos', () => {
    const orion = objects.find(object => object.id === 'orion')!;
    const curve = nightVisibility(orion, new Date('2024-10-15T22:00:00Z'), stockholm);
    expect(curve.real).toBe(false);
    expect(objectPosition(orion, new Date(), stockholm)).toBeNull();
  });

  it('anchors each night in the observation timezone across daylight saving changes', () => {
    const date = new Date('2026-10-24T20:00:00Z');
    const window = nightWindow(date, stockholm);
    expect(window.sunset).toBeDefined();
    expect(window.sunrise).toBeDefined();
    expect(window.start.getTime()).toBe(window.sunset!.getTime() - 1800_000);
    expect(window.end.getTime()).toBe(window.sunrise!.getTime() + 1800_000);
    const context = nightContext(date, stockholm);
    expect(context.samples.every((sample, i) => !i || sample.time > context.samples[i - 1].time)).toBe(true);
    // Noon-to-noon fallbacks preserve the 25/23 physical hours across DST.
    const polar = {...stockholm, latitude: 89.5};
    const fall = nightWindow(date, polar);
    expect(fall.start.toISOString()).toBe('2026-10-24T10:00:00.000Z');
    expect(fall.end.toISOString()).toBe('2026-10-25T11:00:00.000Z');
    expect((fall.end.getTime() - fall.start.getTime()) / 3600000).toBe(25);
    const spring = nightWindow(new Date('2026-03-28T20:00:00Z'), polar);
    expect((spring.end.getTime() - spring.start.getTime()) / 3600000).toBe(23);
    expect(selectedLocalTime('2026-03-29T02:30', stockholm.timeZone)).toBeNull();
    const sydney = {name: 'Sydney', latitude: -33.8688, longitude: 151.2093, timeZone: 'Australia/Sydney'};
    expect(nightWindow(date, sydney).start.toISOString()).not.toBe(window.start.toISOString());
  });
});
