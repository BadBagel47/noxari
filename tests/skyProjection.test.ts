import {describe, expect, it} from 'vitest';
import {brightStars} from '../src/generated/brightStars';
import {objects} from '../src/data';
import {objectPosition, stockholm} from '../src/astronomy';
import {catalogStarPosition, projectBrightStars, projectHorizontal, projectPerspective} from '../src/skyProjection';

describe('real all-sky projection', () => {
  it('puts zenith at center and the cardinal horizons on the circle', () => {
    expect(projectHorizontal({altitude: 90, azimuth: 123}, 400, 400)).toEqual({x: 200, y: 200});
    expect(projectHorizontal({altitude: 0, azimuth: 0}, 400, 400)).toEqual({x: 200, y: 24});
    expect(projectHorizontal({altitude: 0, azimuth: 90}, 400, 400)!.x).toBeCloseTo(376, 6);
    expect(projectHorizontal({altitude: 0, azimuth: 180}, 400, 400)!.y).toBeCloseTo(376, 6);
    expect(projectHorizontal({altitude: 0, azimuth: 270}, 400, 400)!.x).toBeCloseTo(24, 6);
    expect(projectHorizontal({altitude: -0.01, azimuth: 0}, 400, 400)).toBeNull();
  });

  it('places HYG Sirius near the independently calculated catalog-object position', () => {
    const hygSirius = brightStars.find(star => star[3] === 'Sirius')!;
    const sirius = objects.find(object => object.id === 'sirius')!;
    const time = new Date('2026-01-15T22:00:00Z');
    const fromCatalog = catalogStarPosition(hygSirius[0], hygSirius[1], time, stockholm);
    const fromObject = objectPosition(sirius, time, stockholm)!;
    expect(Math.abs(fromCatalog.altitude - fromObject.altitude)).toBeLessThan(0.2);
    expect(Math.abs(fromCatalog.azimuth - fromObject.azimuth)).toBeLessThan(0.2);
  });

  it('keeps Polaris close to true north at about the observer latitude', () => {
    // HYG v4.1 J2000 coordinates for HIP 11767 (Polaris).
    const polaris = catalogStarPosition(2.52975, 89.264109, new Date('2026-10-26T22:00:00Z'), stockholm);
    expect(polaris.altitude).toBeGreaterThan(58);
    expect(polaris.altitude).toBeLessThan(61);
    expect(Math.min(polaris.azimuth, 360 - polaris.azimuth)).toBeLessThan(2);
  });

  it('shows the visible half of a licensed star subset and responds to Earth rotation', () => {
    expect(brightStars).toHaveLength(4105);
    expect(brightStars.every(star => star[2] > -20)).toBe(true); // HYG row zero (Sol) is excluded.
    const first = projectBrightStars(new Date('2026-01-15T18:00:00Z'), stockholm, 400, 400);
    const later = projectBrightStars(new Date('2026-01-15T22:00:00Z'), stockholm, 400, 400);
    expect(first.length).toBeGreaterThan(1500);
    expect(first.length).toBeLessThan(3000);
    expect(first[0].x).not.toBeCloseTo(later[0].x, 1);
    expect(first.every(star => Number.isFinite(star.x) && Number.isFinite(star.y))).toBe(true);
  });
});

describe('eye-level horizon projection', () => {
  it('centers the facing direction and keeps the horizon level', () => {
    expect(projectPerspective({altitude: 0, azimuth: 90}, {heading: 90, pitch: 0}, 400, 300)).toEqual({x: 200, y: 150});
    expect(projectPerspective({altitude: 0, azimuth: 60}, {heading: 90, pitch: 0}, 400, 300)!.y).toBeCloseTo(150);
    expect(projectPerspective({altitude: 0, azimuth: 120}, {heading: 90, pitch: 0}, 400, 300)!.y).toBeCloseTo(150);
    expect(projectPerspective({altitude: 30, azimuth: 90}, {heading: 90, pitch: 30}, 400, 300)!.x).toBeCloseTo(200);
    expect(projectPerspective({altitude: 30, azimuth: 90}, {heading: 90, pitch: 30}, 400, 300)!.y).toBeCloseTo(150);
  });

  it('wraps direction through north and clips objects behind or below the viewer', () => {
    const view = {heading: 350, pitch: 0};
    expect(projectPerspective({altitude: 0, azimuth: 10}, view, 400, 300)!.x).toBeGreaterThan(200);
    expect(projectPerspective({altitude: 0, azimuth: 330}, view, 400, 300)!.x).toBeLessThan(200);
    expect(projectPerspective({altitude: 0, azimuth: 170}, view, 400, 300)).toBeNull();
    expect(projectPerspective({altitude: -1, azimuth: 350}, view, 400, 300)).toBeNull();
  });
});
