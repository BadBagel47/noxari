import {Body, GeoVector, Horizon, Observer, Equator} from 'astronomy-engine';
import {degreesLat, degreesLong, ecfToLookAngles, eciToEcf, gstime, propagate, twoline2satrec, type SatRec} from 'satellite.js';
import type {ObservingLocation, SkyPosition} from './astronomy';

/**
 * F-032: the International Space Station from CelesTrak orbital elements
 * (SGP4 via satellite.js). Elements are fetched at build time; accuracy falls
 * off after a few days, so the app shows their age.
 */
export type IssElements = {name: string; line1: string; line2: string; fetchedAt: string; source: string; sourceUrl: string};
export type IssPass = {rise: Date; peak: Date; set: Date; peakAltitude: number; visible: boolean};

const EARTH_RADIUS_KM = 6371;
let satrec: SatRec | null = null;
let elements: IssElements | null = null;

export function setIssElements(next: IssElements | null) {
  elements = next;
  satrec = next ? twoline2satrec(next.line1, next.line2) : null;
}
export const issElements = () => elements;

/** Elements' age in days at `time` (from the TLE epoch). */
export function issElementAgeDays(time: Date) {
  if (!satrec) return null;
  const epochMs = (satrec.jdsatepoch - 2440587.5) * 86_400_000;
  return (time.getTime() - epochMs) / 86_400_000;
}

/** Topocentric altitude/azimuth (degrees) and whether the station is in sunlight. */
export function issState(time: Date, location: ObservingLocation): (SkyPosition & {sunlit: boolean}) | null {
  if (!satrec) return null;
  const pv = propagate(satrec, time);
  const position = pv.position;
  if (!position || typeof position === 'boolean') return null;
  const observerGd = {longitude: location.longitude * Math.PI / 180, latitude: location.latitude * Math.PI / 180, height: 0};
  const look = ecfToLookAngles(observerGd, eciToEcf(position, gstime(time)));
  const sun = GeoVector(Body.Sun, time, true);
  const length = Math.hypot(sun.x, sun.y, sun.z);
  const s = [sun.x / length, sun.y / length, sun.z / length];
  const dot = position.x * s[0] + position.y * s[1] + position.z * s[2];
  const perpendicular = Math.hypot(position.x - dot * s[0], position.y - dot * s[1], position.z - dot * s[2]);
  return {altitude: look.elevation * 180 / Math.PI, azimuth: ((look.azimuth * 180 / Math.PI) % 360 + 360) % 360, sunlit: dot > 0 || perpendicular > EARTH_RADIUS_KM};
}

/** Sub-satellite point, for tests and diagnostics. */
export function issGround(time: Date) {
  if (!satrec) return null;
  const pv = propagate(satrec, time);
  if (!pv.position || typeof pv.position === 'boolean') return null;
  const gmst = gstime(time);
  const ecf = eciToEcf(pv.position, gmst);
  const lon = Math.atan2(ecf.y, ecf.x), lat = Math.atan2(ecf.z, Math.hypot(ecf.x, ecf.y));
  return {latitude: degreesLat(lat), longitude: degreesLong(lon)};
}

function sunAltitude(time: Date, location: ObservingLocation) {
  const observer = new Observer(location.latitude, location.longitude, 0);
  const eq = Equator(Body.Sun, time, observer, true, true);
  return Horizon(time, observer, eq.ra, eq.dec, 'normal').altitude;
}

/** Passes above `minAltitude` within `hours`; visible = station sunlit while the observer's Sun is below −6°. */
export function issPasses(start: Date, location: ObservingLocation, hours = 72, minAltitude = 10): IssPass[] {
  if (!satrec) return [];
  const passes: IssPass[] = [];
  const step = 30_000;
  let current: IssPass | null = null;
  for (let t = start.getTime(); t <= start.getTime() + hours * 3_600_000; t += step) {
    const time = new Date(t);
    const state = issState(time, location);
    if (!state) continue;
    if (state.altitude >= minAltitude) {
      if (!current) current = {rise: time, peak: time, set: time, peakAltitude: state.altitude, visible: false};
      current.set = time;
      if (state.altitude > current.peakAltitude) { current.peakAltitude = state.altitude; current.peak = time; }
      if (!current.visible && state.sunlit && sunAltitude(time, location) < -6) current.visible = true;
    } else if (current) { passes.push(current); current = null; }
  }
  if (current) passes.push(current);
  return passes;
}
