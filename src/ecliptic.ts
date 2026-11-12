import type {ObservingLocation} from './astronomy';
import {catalogHorizontalTransform, prepareHorizontalDirections, type PreparedHorizontalDirection} from './skyProjection';

/** F-035: the ecliptic ("the planets' path") as J2000 samples every 2°, in horizontal coordinates. */
const OBLIQUITY = 23.4392911 * Math.PI / 180;

export function eclipticEquatorial(stepDegrees = 2) {
  const samples: [number, number][] = [];
  for (let longitude = 0; longitude <= 360; longitude += stepDegrees) {
    const l = longitude * Math.PI / 180;
    const ra = Math.atan2(Math.sin(l) * Math.cos(OBLIQUITY), Math.cos(l));
    const dec = Math.asin(Math.sin(l) * Math.sin(OBLIQUITY));
    samples.push([((ra * 12 / Math.PI) + 24) % 24, dec * 180 / Math.PI]);
  }
  return samples;
}

export function eclipticSky(time: Date, location: ObservingLocation): PreparedHorizontalDirection[] {
  const project = catalogHorizontalTransform(time, location);
  return prepareHorizontalDirections(eclipticEquatorial().map(([ra, dec]) => project(ra, dec)));
}
