import {describe, expect, it} from 'vitest';
import {initialObservation} from '../src/observationStart';
import {positionAt, stockholm} from '../src/astronomy';
import {Body} from 'astronomy-engine';

describe('temporary night-preview startup', () => {
  it('starts at a frozen darkest-night sample for the selected place without changing the supplied Now', () => {
    const now = new Date('2026-11-04T10:00:00Z'), start = initialObservation(now, stockholm);
    expect(start.mode).toBe('preview');expect(start.warning).toBeNull();
    expect(start.time.getTime()).not.toBe(now.getTime());expect(now.toISOString()).toBe('2026-11-04T10:00:00.000Z');
    expect(positionAt(Body.Sun, start.time, stockholm).altitude).toBeLessThan(-18);
    expect(start.time >= start.night.window.start && start.time <= start.night.window.end).toBe(true);
  });
  it('uses a stored southern location and retains bright-night and polar-day explanations', () => {
    const sydney = {name: 'Sydney', latitude: -33.8688, longitude: 151.2093, timeZone: 'Australia/Sydney'};
    const now = new Date('2026-06-21T12:00:00Z');
    const south = initialObservation(now, sydney);
    expect(positionAt(Body.Sun, south.time, sydney).altitude).toBeLessThan(-18);
    expect(south.warning).toBeNull();
    const summer = initialObservation(now, stockholm);expect(summer.warning).toBe('bright');
    const polar = {name: 'Tromso', latitude: 69.6492, longitude: 18.9553, timeZone: 'Europe/Oslo'};
    const day = initialObservation(now, polar);expect(day.warning).toBe('polarDay');expect(day.mode).toBe('preview');
    expect(positionAt(Body.Sun, day.time, polar).altitude).toBeGreaterThan(0);
  });
});
