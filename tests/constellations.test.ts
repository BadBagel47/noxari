import {describe, expect, it} from 'vitest';
import {brightStars} from '../src/generated/brightStars';
import {constellationFigures} from '../src/generated/constellations';
import {constellationSky, figureArc} from '../src/constellations';
import {horizontalStarCatalog} from '../src/skyProjection';
import {stockholm} from '../src/astronomy';
import {movingStarVector, yearsSinceJ2000} from '../src/starMotion';

describe('proper motion from epoch J2000', () => {
  it('uses Julian years and preserves the J2000 position at the catalog epoch', () => {
    expect(yearsSinceJ2000(new Date('2000-01-01T12:00:00Z'))).toBe(0);
    expect(yearsSinceJ2000(new Date('2100-01-01T12:00:00Z'))).toBeCloseTo(100, 2);
    expect(movingStarVector(0, 0, 1000, 1000, 0)).toEqual({x: 1, y: 0, z: 0});
  });
  it('treats pmRA as cos(dec)-weighted motion rather than an RA angle rate', () => {
    const moved = movingStarVector(0, 60, 1000, 0, 100);
    const raArcseconds = Math.atan2(moved.y, moved.x) * 180 / Math.PI * 3600;
    expect(raArcseconds).toBeCloseTo(200, 2); // 100 arcsec on the sky at dec=60°.
    const pole = movingStarVector(3, 90, 1000, -2000, 100);
    expect(Math.hypot(pole.x, pole.y, pole.z)).toBeCloseTo(1, 12);
  });
  it('moves Sirius by its approximately 1.34 arcsec/year toward decreasing RA and declination', () => {
    const [ra, dec, , , pmRa, pmDec] = brightStars.find(star => star[3] === 'Sirius')!;
    const initial = movingStarVector(ra, dec), later = movingStarVector(ra, dec, pmRa, pmDec, 100);
    const separation = Math.acos(initial.x * later.x + initial.y * later.y + initial.z * later.z) * 180 / Math.PI * 3600;
    expect(separation).toBeCloseTo(133.94, 1);
    expect(Math.atan2(later.y, later.x)).toBeLessThan(Math.atan2(initial.y, initial.x));
    expect(later.z).toBeLessThan(initial.z);
  });
});

describe('licensed constellation figures', () => {
  it('has 88 unique figures and resolves every HIP endpoint to a star with proper motion', () => {
    const hip = new Set(brightStars.map(star => star[6]));
    expect(new Set(constellationFigures.map(figure => figure.id)).size).toBe(88);
    for (const figure of constellationFigures) {
      expect(figure.lines.length).toBeGreaterThan(0);
      expect(figure.lines.flat().every(id => hip.has(id))).toBe(true);
    }
  });
  it('samples the short arc across north and retains horizon crossings for clipping', () => {
    const north = figureArc({altitude: 10, azimuth: 359}, {altitude: 10, azimuth: 1});
    expect(north.every(sample => sample.azimuth < 2 || sample.azimuth > 358)).toBe(true);
    const crossing = figureArc({altitude: -10, azimuth: 30}, {altitude: 10, azimuth: 30});
    expect(crossing[0].altitude).toBeCloseTo(-10);
    expect(crossing.at(-1)!.altitude).toBeCloseTo(10);
    expect(crossing.some(sample => Math.abs(sample.altitude) < 1)).toBe(true);
  });
  it('keeps figures attached to their stars as the Earth rotates', () => {
    const at = (hour: string) => constellationSky(horizontalStarCatalog(new Date(`2026-01-15T${hour}:00:00Z`), stockholm));
    const first = at('18').find(figure => figure.id === 'Ori')!;
    const later = at('22').find(figure => figure.id === 'Ori')!;
    expect(first.arcs.length).toBeGreaterThan(5);
    expect(first.center.azimuth).not.toBeCloseTo(later.center.azimuth, 0);
    const orion = constellationFigures.find(figure => figure.id === 'Ori')!;
    const star = horizontalStarCatalog(new Date('2026-01-15T18:00:00Z'), stockholm).find(star => star.hip === orion.lines[0][0])!;
    expect(first.arcs[0][0].altitude).toBeCloseTo(star.altitude, 8);
  });
});
