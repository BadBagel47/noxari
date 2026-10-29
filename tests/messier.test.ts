import {describe, expect, it} from 'vitest';
import {Body, DefineStar} from 'astronomy-engine';
import {objects} from '../src/data';
import {messierObjects} from '../src/generated/messier';
import {matchesCatalogQuery} from '../src/catalogSearch';
import {nightCatalog, nightContext, objectPosition, positionAt, stockholm} from '../src/astronomy';
import {isDiffuse, rankTonight} from '../src/recommendations';

const get = (number: number) => messierObjects.find(object => object.catalogNumber === number)!;
const search = (query: string) => objects.filter(object => matchesCatalogQuery(object, query)).map(object => object.id);

describe('complete, traceable Messier catalog', () => {
  it('has all 110 unique Messier identities plus the existing solar/star/constellation objects', () => {
    expect(messierObjects).toHaveLength(110);
    expect(messierObjects.map(object => object.catalogNumber)).toEqual(Array.from({length: 110}, (_, i) => i + 1));
    expect(new Set(objects.map(object => object.id)).size).toBe(objects.length);
    expect(objects).toHaveLength(121);
    for (const id of ['m31', 'm45', 'm42', 'm13', 'm57', 'sirius', 'moon', 'orion', 'ursa-major']) expect(objects.some(object => object.id === id)).toBe(true);
  });
  it('retains valid J2000 centers and explicit source references for every entry', () => {
    for (const object of messierObjects) {
      expect(object.position?.kind).toBe('fixed');
      if (object.position?.kind !== 'fixed') throw Error('Missing center');
      expect(object.position.raHours).toBeGreaterThanOrEqual(0);
      expect(object.position.raHours).toBeLessThan(24);
      expect(Math.abs(object.position.decDegrees)).toBeLessThanOrEqual(90);
      expect(object.references![0].url).toContain('mattiaverga/OpenNGC/blob/be3cd6c');
      expect(object.aliases!.length).toBeGreaterThan(2);
    }
  });
  it('preserves astronomical special cases and the disputed M102 convention', () => {
    expect(get(24).kind).toBe('Star cloud');
    expect(get(40).kind).toBe('Double star');
    expect(get(73).kind).toBe('Asterism');
    expect(get(102).catalogNote).toContain('Identification disputed');
    expect(get(102).aliases).toContain('NGC 5866');
    expect(get(102).position).not.toEqual(get(101).position);
    expect(get(24).distance).toBe('No single distance assigned');
    expect(get(73).distance).toBe('No single distance assigned');
    expect(isDiffuse(get(24))).toBe(true);
  });
  it('does not invent missing V magnitudes or distances and qualifies pair photometry', () => {
    expect(get(35).magnitude).toBe('Not supplied (V)');
    expect(get(40).magnitude).toBe('Unverified for pair');
    expect(get(6).distance).toBe('Not supplied by source');
    expect(get(31).distance).toBe('~2.5 million light-years');
    expect(messierObjects.filter(object => object.distance.startsWith('~'))).toHaveLength(88);
    for (const object of messierObjects) expect(object.magnitudeBand).toBe('V');
  });
});

describe('catalog identity search', () => {
  it('matches numeric aliases exactly instead of returning every M1-prefixed entry', () => {
    for (const query of ['M1', 'M 1', 'm001', 'Messier 1']) expect(search(query)).toEqual(['m1']);
    for (const query of ['NGC224', 'ngc 0224']) expect(search(query)).toEqual(['m31']);
    expect(search('IC 4715')).toEqual(['m24']);
    expect(search('NGC 651')).toEqual(['m76']);
    expect(search('M102')).toEqual(['m102']);
    expect(search('M110')).toEqual(['m110']);
  });
  it('searches common names, Swedish names and special object types', () => {
    expect(search('Krabbnebulosan')).toEqual(['m1']);
    expect(search('Whirlpool')).toEqual(['m51']);
    expect(search('Spindle')).toEqual(['m102']);
    expect(search('asterism')).toEqual(['m73']);
    expect(search('stjärnmoln')).toEqual(['m24']);
  });
});

describe('scalable fixed-object astrometry', () => {
  it('agrees with the old independent Equator/DefineStar path without reserving 110 slots', () => {
    const sydney = {name: 'Sydney', latitude: -33.8688, longitude: 151.2093, timeZone: 'Australia/Sydney'};
    for (const year of [1900, 2026, 2100]) for (const location of [stockholm, sydney]) for (const number of [1, 31, 40, 73, 102, 110]) {
      const object = get(number);
      if (object.position?.kind !== 'fixed') throw Error('Missing center');
      // One reference slot is reused only inside the test. Production uses no
      // DefineStar slots. The two paths differ by annual aberration (~20 arcsec).
      DefineStar(Body.Star1, object.position.raHours, object.position.decDegrees, 1e6);
      const date = new Date(`${year}-01-15T22:00:00Z`);
      const reference = positionAt(Body.Star1, date, location), actual = objectPosition(object, date, location)!;
      const rad = Math.PI / 180;
      const cosine = Math.sin(reference.altitude * rad) * Math.sin(actual.altitude * rad) + Math.cos(reference.altitude * rad) * Math.cos(actual.altitude * rad) * Math.cos((reference.azimuth - actual.azimuth) * rad);
      expect(Math.acos(Math.max(-1, Math.min(1, cosine))) / rad).toBeLessThan(.02);
    }
  });
  it('calculates a shared night and recommendations for the whole catalog without demo leakage', () => {
    const date = new Date('2026-01-15T18:00:00Z'), context = nightContext(date, stockholm);
    const curves = nightCatalog(objects, date, stockholm, context);
    expect(curves.size).toBe(121);
    for (const object of messierObjects) {
      const curve = curves.get(object.id)!;
      expect(curve.real).toBe(true);
      expect(curve.samples.length).toBe(context.samples.length);
      expect(curve.samples.every(sample => Number.isFinite(sample.altitude) && Math.abs(sample.altitude) <= 90)).toBe(true);
      expect(curve.samples[0].time).toBe(context.samples[0].time);
    }
    const ranked = rankTonight(objects, curves, 'all', date);
    expect(ranked).toHaveLength(119);
    expect(ranked.find(item => item.object.id === 'm110')).toBeDefined();
    expect(ranked.find(item => item.object.id === 'orion')).toBeUndefined();
    expect(curves.get('m110')!.samples[20].altitude).toBeCloseTo(objectPosition(get(110), context.samples[20].time, stockholm)!.altitude, 10);
  });
});
