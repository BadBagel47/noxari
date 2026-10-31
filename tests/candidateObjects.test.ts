import {describe, expect, it} from 'vitest';
import {candidateObjects} from '../src/candidateObjects';
import {keplerianEquatorial, objectPosition, stockholm} from '../src/astronomy';
import {objects} from '../src/data';
import {matchesCatalogQuery} from '../src/catalogSearch';

describe('separate dwarf-planet candidate collection', () => {
  const candidate = candidateObjects[0];

  it('keeps provisional objects outside the main catalog and supports browsing aliases', () => {
    expect(candidateObjects.map(object => object.id)).toEqual(['2026-ed138']);
    expect(objects.some(object => object.id === candidate.id)).toBe(false);
    expect(matchesCatalogQuery(candidate, 'ED138')).toBe(true);
    expect(matchesCatalogQuery(candidate, '2026 ED 138')).toBe(true);
    expect(candidate.kind).toBe('Dwarf planet candidate');
    expect(candidate.references?.map(reference => reference.url)).toEqual([
      'https://rubinobservatory.org/news/rubin-first-dwarf-planet-candidate',
      'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=2026%20ED138',
    ]);
  });

  it('reproduces the JPL/Horizons apparent equatorial position near its element epoch', () => {
    // Horizons, geocentric observer, 2026-10-31 00:00 UTC:
    // RA 18h 11m 15.69s, Dec -42° 13′ 20.4″.
    const position = keplerianEquatorial(candidate, new Date('2026-10-31T00:00:00Z'))!;
    const raDegrees = position.ra * 15;
    const decDegrees = position.dec;
    const angularDifference = Math.hypot(
      (raDegrees - (18 + 11 / 60 + 15.69 / 3600) * 15) * Math.cos(decDegrees * Math.PI / 180),
      decDegrees - (-42 - 13 / 60 - 20.4 / 3600),
    );
    expect(angularDifference).toBeLessThan(0.01);
  });

  it('moves with selected time and converts to a local horizon position', () => {
    const first = objectPosition(candidate, new Date('2026-10-31T00:00:00Z'), stockholm)!;
    const later = objectPosition(candidate, new Date('2027-01-29T00:00:00Z'), stockholm)!;
    expect(Number.isFinite(first.altitude) && Number.isFinite(first.azimuth)).toBe(true);
    expect(Number.isFinite(later.altitude) && Number.isFinite(later.azimuth)).toBe(true);
    expect(Math.abs(first.azimuth - later.azimuth)).toBeGreaterThan(0.1);
  });
});
