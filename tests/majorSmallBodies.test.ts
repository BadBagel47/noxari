import {describe, expect, it} from 'vitest';
import {majorSmallBodies} from '../src/majorSmallBodies';
import {objects} from '../src/data';
import {keplerianEquatorial, objectPosition, solarAppearance, stockholm} from '../src/astronomy';
import {matchesCatalogQuery} from '../src/catalogSearch';
import reference from './fixtures/major-small-bodies-horizons.json';

describe('major solar-system small bodies', () => {
  const time = new Date(reference.time);
  const arcsecondsError = (raHours: number, decDegrees: number, referenceRa: number, referenceDec: number) => {
    const raDelta = (raHours * 15 - referenceRa) * Math.cos(referenceDec * Math.PI / 180);
    return Math.hypot(raDelta, decDegrees - referenceDec) * 3600;
  };

  it('keeps the five recognized dwarf planets and Vesta in the main catalog with searchable aliases', () => {
    expect(majorSmallBodies.map(object => object.id)).toEqual(['ceres', 'pluto', 'eris', 'haumea', 'makemake', 'vesta']);
    expect(majorSmallBodies.filter(object => object.kind === 'Dwarf planet')).toHaveLength(5);
    expect(majorSmallBodies.find(object => object.id === 'vesta')?.kind).toBe('Asteroid');
    for (const object of majorSmallBodies) expect(objects).toContain(object);
    expect(matchesCatalogQuery(majorSmallBodies[0], '1 Ceres')).toBe(true);
    expect(matchesCatalogQuery(majorSmallBodies[1], '134340 Pluto')).toBe(true);
  });

  it('matches JPL/Horizons equatorial directions for the selected reference date', () => {
    for (const object of majorSmallBodies) {
      const expected = reference.objects[object.id as keyof typeof reference.objects];
      if (object.position?.kind === 'keplerian') {
        const position = keplerianEquatorial(object, time)!;
        expect(arcsecondsError(position.ra, position.dec, expected.ra, expected.dec), object.id).toBeLessThan(60);
      } else {
        const position = objectPosition(object, time, {name: 'Equator', latitude: 0, longitude: 0, timeZone: 'UTC'})!;
        expect(Number.isFinite(position.altitude) && Number.isFinite(position.azimuth), object.id).toBe(true);
      }
    }
  });

  it('calculates selected-time distance and brightness for orbit-based bodies and Pluto', () => {
    for (const object of majorSmallBodies) {
      const current = solarAppearance(object, time)!;
      const later = solarAppearance(object, new Date('2027-01-29T00:00:00Z'))!;
      expect(Number.isFinite(current.distanceAu) && current.distanceAu > 0, object.id).toBe(true);
      expect(Number.isFinite(current.magnitude), object.id).toBe(true);
      expect(Number.isFinite(current.sunSeparation), object.id).toBe(true);
      expect(current.constellation.length, object.id).toBeGreaterThan(0);
      expect(Math.abs(current.distanceAu - later.distanceAu), object.id).toBeGreaterThan(0.00001);
    }
  });

  it('projects orbital objects onto the selected local horizon', () => {
    for (const object of majorSmallBodies) {
      const position = objectPosition(object, time, stockholm)!;
      expect(Number.isFinite(position.altitude) && Number.isFinite(position.azimuth), object.id).toBe(true);
    }
  });
});
