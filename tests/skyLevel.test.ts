import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {objects} from '../src/data';
import {candidateObjects} from '../src/candidateObjects';
import {issObject} from '../src/issObject';
import {namedStarObjects} from '../src/namedStars';
import {defaultSkyGroups, faintStarFade, shownAtSkyLevel, starMagnitudeLimit} from '../src/skyLevel';
import {decodeFaintStars, faintCount, faintSky} from '../src/binocularStars';
import {catalogStarPosition, createDirectionProjector, createPreparedPerspectiveProjector, prepareHorizontalDirection} from '../src/skyProjection';
import {stockholm} from '../src/astronomy';
import {packStars} from '../src/gpuSky';

const byId = (id: string) => objects.find(object => object.id === id)!;

describe('F-043 sky levels', () => {
  it('shows naked-eye deep-sky objects (incl. Andromeda) and the whole solar system by default', () => {
    const shown = objects.filter(object => shownAtSkyLevel(object, 'eye'));
    expect(shown.map(object => object.id)).toEqual(expect.arrayContaining(['m31', 'm42', 'm44', 'm45']));
    for (const id of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'moon', 'pluto', 'sirius']) expect(shownAtSkyLevel(byId(id), 'eye')).toBe(true);
    expect(objects.filter(object => object.kind === 'Dwarf planet' || object.kind === 'Asteroid').every(object => shownAtSkyLevel(object, 'eye'))).toBe(true);
    expect(shownAtSkyLevel(issObject, 'eye')).toBe(true);
    expect(namedStarObjects.every(object => shownAtSkyLevel(object, 'eye'))).toBe(true);
    expect(shownAtSkyLevel(byId('m57'), 'eye')).toBe(false);
    expect(candidateObjects.some(object => shownAtSkyLevel(object, 'eye'))).toBe(false);
  });

  it('adds binocular objects, then everything; candidates only with the whole catalog', () => {
    const deepSky = objects.filter(object => /^m\d+$/.test(object.id));
    const eye = deepSky.filter(object => shownAtSkyLevel(object, 'eye')).length;
    const binoculars = deepSky.filter(object => shownAtSkyLevel(object, 'binoculars')).length;
    expect(binoculars).toBeGreaterThan(eye);
    expect(deepSky.filter(object => shownAtSkyLevel(object, 'all')).length).toBe(110);
    expect(candidateObjects.every(object => shownAtSkyLevel(object, 'all') && !shownAtSkyLevel(object, 'binoculars'))).toBe(true);
  });

  it('groups hide only their own kind; the solar system ignores groups', () => {
    const off = {galaxies: false, clusters: false, nebulae: false, candidates: false};
    expect(shownAtSkyLevel(byId('m31'), 'all', off)).toBe(false);
    expect(shownAtSkyLevel(byId('m31'), 'all', {...defaultSkyGroups, clusters: false})).toBe(true);
    expect(shownAtSkyLevel(byId('m45'), 'all', {...defaultSkyGroups, clusters: false})).toBe(false);
    expect(shownAtSkyLevel(byId('neptune'), 'eye', off)).toBe(true);
    expect(candidateObjects.some(object => shownAtSkyLevel(object, 'all', {...defaultSkyGroups, candidates: false}))).toBe(false);
  });

  it('raises the star limit with zoom only above the naked-eye level and fades stars in', () => {
    expect(starMagnitudeLimit('eye', 3)).toBe(6.5);
    expect(starMagnitudeLimit('binoculars', 1)).toBe(7);
    expect(starMagnitudeLimit('binoculars', 2)).toBe(8.5);
    expect(starMagnitudeLimit('all', 3)).toBe(8.5);
    expect(faintStarFade(7.1, 7)).toBe(0);
    expect(faintStarFade(7, 7)).toBeCloseTo(.25);
    expect(faintStarFade(6.6, 7)).toBe(1);
  });
});

describe('F-043 binocular star file', () => {
  const file = readFileSync(new URL('../public/stars/binocular-v1.bin', import.meta.url));
  const stars = decodeFaintStars(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  it('decodes 52,894 HYG stars between V 6.5 and 8.5, sorted by magnitude', () => {
    expect(stars.count).toBe(52894);
    for (let i = 1; i < stars.count; i++) expect(stars.magnitude[i]).toBeGreaterThanOrEqual(stars.magnitude[i - 1]);
    expect(stars.magnitude[0]).toBeGreaterThan(6.5);
    expect(stars.magnitude[stars.count - 1]).toBeLessThanOrEqual(8.5 + 1e-6);
    expect(faintCount(stars.magnitude, 6.5)).toBe(0);
    expect(faintCount(stars.magnitude, 8.5)).toBe(stars.count);
    expect(faintCount(stars.magnitude, 7)).toBeGreaterThan(5000);
  });

  it('rotates to the same horizontal direction as the catalog transform', () => {
    const time = new Date('2026-01-15T22:00:00Z');
    const sky = faintSky(stars, time, stockholm);
    for (const i of [0, 1234, 20000, 52893]) {
      const x = stars.equatorial[i * 3], y = stars.equatorial[i * 3 + 1], z = stars.equatorial[i * 3 + 2];
      const ra = (Math.atan2(y, x) * 12 / Math.PI + 24) % 24, dec = Math.asin(z) * 180 / Math.PI;
      const expected = catalogStarPosition(ra, dec, time, stockholm);
      expect(Math.asin(sky.direction[i * 3 + 2]) * 180 / Math.PI).toBeCloseTo(expected.altitude, 3);
      const azimuth = (Math.atan2(sky.direction[i * 3 + 1], sky.direction[i * 3]) * 180 / Math.PI + 360) % 360;
      expect(Math.abs((azimuth - expected.azimuth + 540) % 360 - 180)).toBeLessThan(1e-3);
      // The direction projector matches the prepared projector used for bright stars.
      const view = {heading: expected.azimuth + 10, pitch: Math.max(-80, Math.min(80, expected.altitude - 5))};
      const a = createDirectionProjector(view, 800, 600, 1.5)(sky.direction[i * 3], sky.direction[i * 3 + 1], sky.direction[i * 3 + 2]);
      const b = createPreparedPerspectiveProjector(view, 800, 600, true, true, 1.5)({...expected, ...prepareHorizontalDirection(expected)});
      expect(a?.x).toBeCloseTo(b!.x, 2); expect(a?.y).toBeCloseTo(b!.y, 2);
    }
  });

  it('packs faint stars after the bright subset with their magnitude for the GPU fade', () => {
    const sky = faintSky(stars, new Date('2026-01-15T22:00:00Z'), stockholm);
    const packed = packStars([], sky);
    expect(packed.length).toBe(stars.count * 7);
    expect(packed[5]).toBeCloseTo(stars.magnitude[0]);
  });
});
