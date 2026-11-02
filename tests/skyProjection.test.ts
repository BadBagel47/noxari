import {describe, expect, it} from 'vitest';
import {brightStars} from '../src/generated/brightStars';
import {objects} from '../src/data';
import {objectPosition, stockholm} from '../src/astronomy';
import {catalogStarPosition, createPerspectiveProjector, createPreparedPerspectiveProjector, horizontalStarCatalog, prepareHorizontalDirections, prepareHorizontalStars, projectBrightStars, projectHorizontal, projectPerspective} from '../src/skyProjection';

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

  it('shows the visible half of the licensed catalog through magnitude 6.5 and responds to Earth rotation', () => {
    expect(brightStars).toHaveLength(8922);
    expect(brightStars.filter(star => star[2] <= 6.5)).toHaveLength(8920);
    expect(brightStars.filter(star => star[2] > 6.5).map(star => star[6]).sort()).toEqual([30665, 33165]);
    expect(brightStars.every(star => star[2] > -20)).toBe(true); // HYG row zero (Sol) is excluded.
    const first = projectBrightStars(new Date('2026-01-15T18:00:00Z'), stockholm, 400, 400);
    const later = projectBrightStars(new Date('2026-01-15T22:00:00Z'), stockholm, 400, 400);
    expect(first.length).toBeGreaterThan(4000);
    expect(first.length).toBeLessThan(5000);
    expect(first[0].x).not.toBeCloseTo(later[0].x, 1);
    expect(first.every(star => Number.isFinite(star.x) && Number.isFinite(star.y))).toBe(true);
  });

  it('keeps the prepared panning projection numerically aligned with the reference projection', () => {
    const time = new Date('2026-01-15T22:00:00Z');
    const stars = prepareHorizontalStars(horizontalStarCatalog(time, stockholm));
    for (const view of [{heading: 359, pitch: 0}, {heading: 124, pitch: 37}, {heading: 212, pitch: -28}]) {
      const allowBelow = view.pitch < 0;
      const fastProject = createPreparedPerspectiveProjector(view, 390, 844, true, allowBelow, 1.7);
      for (let index = 0; index < stars.length; index += 211) {
        const expected = projectPerspective(stars[index], view, 390, 844, true, allowBelow, 1.7);
        const actual = fastProject(stars[index]);
        expect(actual === null).toBe(expected === null);
        if (actual && expected) {
          expect(actual.x).toBeCloseTo(expected.x, 9);
          expect(actual.y).toBeCloseTo(expected.y, 9);
        }
      }
    }
  });

  it('keeps prepared IAU boundary points numerically aligned while panning', () => {
    const points = prepareHorizontalDirections([
      {altitude: -12, azimuth: 2}, {altitude: 0, azimuth: 45},
      {altitude: 36, azimuth: 180}, {altitude: 89, azimuth: 359},
    ]);
    for (const view of [{heading: 359, pitch: 0}, {heading: 124, pitch: 37}, {heading: 212, pitch: -28}]) {
      const fastProject = createPreparedPerspectiveProjector(view, 390, 844, false, true, 1.7);
      for (const point of points) {
        const expected = projectPerspective(point, view, 390, 844, false, true, 1.7);
        const actual = fastProject(point);
        expect(actual === null).toBe(expected === null);
        if (actual && expected) {
          expect(actual.x).toBeCloseTo(expected.x, 9);
          expect(actual.y).toBeCloseTo(expected.y, 9);
        }
      }
    }
  });

  it('supports a small overscan when culling offscreen boundary samples', () => {
    const point = prepareHorizontalDirections([{altitude: 0, azimuth: 25}])[0];
    expect(createPreparedPerspectiveProjector({heading: 0, pitch: 0}, 390, 844)(point)).toBeNull();
    const overscan = createPreparedPerspectiveProjector({heading: 0, pitch: 0}, 390, 844, true, false, 1, 48)(point);
    const expected = projectPerspective(point, {heading: 0, pitch: 0}, 390, 844, false)!;
    expect(overscan?.x).toBeCloseTo(expected.x, 9);
    expect(overscan?.y).toBeCloseTo(expected.y, 9);
  });

  it('keeps the camera-cached projector aligned with the reference projection', () => {
    const positions = [
      {altitude: -44, azimuth: 0}, {altitude: 0, azimuth: 89},
      {altitude: 27, azimuth: 182}, {altitude: 80, azimuth: 359},
    ];
    for (const view of [{heading: 359, pitch: 0}, {heading: 124, pitch: 37}, {heading: 212, pitch: -28}]) {
      const fastProject = createPerspectiveProjector(view, 390, 844, true, true, 1.7);
      for (const position of positions) {
        const expected = projectPerspective(position, view, 390, 844, true, true, 1.7);
        const actual = fastProject(position);
        expect(actual === null).toBe(expected === null);
        if (actual && expected) {
          expect(actual.x).toBeCloseTo(expected.x, 9);
          expect(actual.y).toBeCloseTo(expected.y, 9);
        }
      }
    }
  });
});

describe('eye-level horizon projection', () => {
  it('limits the longer viewport axis to 90 degrees in portrait and landscape', () => {
    const target = {altitude: 10, azimuth: 0}, view = {heading: 0, pitch: 0};
    const portrait = projectPerspective(target, view, 400, 800)!;
    const landscape = projectPerspective(target, view, 800, 400)!;
    // Both have an 800px long axis: 10° projects 70.53px off-center.
    expect(400 - portrait.y).toBeCloseTo(70.53, 2);
    expect(200 - landscape.y).toBeCloseTo(70.53, 2);
    expect(projectPerspective({altitude: 0, azimuth: 40}, view, 400, 800)).toBeNull();
  });
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
