import {describe, expect, it} from 'vitest';
import {upcomingEvents} from '../src/skyEvents';
import {stockholm} from '../src/astronomy';

describe('sky events', () => {
  const events = upcomingEvents(new Date('2026-01-01T00:00:00Z'), stockholm, 60);
  it('lists Moon quarters, the Quadrantids and sorts by time', () => {
    expect(events.some(e => e.kind === 'moonPhase' && e.title.en === 'Full moon' && Math.abs(e.time.getTime() - Date.parse('2026-01-03T10:03Z')) < 3600_000)).toBe(true);
    expect(events.some(e => e.kind === 'meteor' && e.title.en.startsWith('Quadrantids'))).toBe(true);
    expect(events.every((e, i) => i === 0 || events[i - 1].time <= e.time)).toBe(true);
  });
  it('finds the total lunar eclipse of 2026-03-03 within a year', () => {
    expect(events.some(e => e.kind === 'lunarEclipse' && e.title.en === 'Total lunar eclipse' && Math.abs(e.time.getTime() - Date.parse('2026-03-03T11:33Z')) < 3 * 3600_000)).toBe(true);
  });
  it('finds the 2026-08-12 solar eclipse as visible from Stockholm', () => {
    const later = upcomingEvents(new Date('2026-07-01T00:00:00Z'), stockholm, 60);
    expect(later.some(e => e.kind === 'solarEclipse' && Math.abs(e.time.getTime() - Date.parse('2026-08-12T17:50Z')) < 3 * 3600_000)).toBe(true);
  });
});

import {bestEveningMonth, constellationInfoObjects} from '../src/constellationInfo';
describe('constellation info', () => {
  it('covers 86 constellations besides the two curated demo entries', () => {
    expect(constellationInfoObjects).toHaveLength(86);
    const cyg = constellationInfoObjects.find(c => c.id === 'con-cyg')!;
    expect(cyg.sv).toBe('Svanen'); expect(cyg.descriptionSv).toContain('Deneb');
  });
  it('places evening visibility by right ascension', () => {
    expect(bestEveningMonth(5.5)).toBe(0);   // Orion region: January
    expect(bestEveningMonth(20.5)).toBe(7);  // Cygnus region: August
  });
});

import {parseLog} from '../src/observationLog';
describe('observation log storage', () => {
  it('keeps valid entries and drops broken ones', () => {
    expect(parseLog('[{"id":"m31","at":"2026-01-01T20:00:00Z","note":"fin"},{"id":3},{"id":"m42","at":"nope"}]')).toEqual([{id: 'm31', at: '2026-01-01T20:00:00Z', note: 'fin'}]);
    expect(parseLog('garbage')).toEqual([]);
  });
});
