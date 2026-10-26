import {AstroTime, Observer, RotateVector, Rotation_EQJ_HOR, Vector} from 'astronomy-engine';
import {brightStars} from './generated/brightStars';
import type {ObservingLocation, SkyPosition} from './astronomy';

export type MapPoint = {x: number; y: number};
export type ProjectedStar = MapPoint & {magnitude: number; name?: string};
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

// Azimuthal equidistant projection centered on the zenith. The horizon is a
// circle; north is up, east right, south down, and west left.
export function projectHorizontal(position: SkyPosition, width: number, height: number): MapPoint | null {
  if (position.altitude < 0 || position.altitude > 90) return null;
  const radius = (90 - position.altitude) / 90 * Math.min(width, height) * 0.44;
  const angle = position.azimuth * RAD;
  return {x: width / 2 + radius * Math.sin(angle), y: height / 2 - radius * Math.cos(angle)};
}

const vectors = brightStars.map(([raHours, decDegrees, magnitude, name]) => {
  const ra = raHours * 15 * RAD;
  const dec = decDegrees * RAD;
  return {x: Math.cos(dec) * Math.cos(ra), y: Math.cos(dec) * Math.sin(ra), z: Math.sin(dec), magnitude, name};
});

export function catalogStarPosition(raHours: number, decDegrees: number, time: Date, location: ObservingLocation): SkyPosition {
  const observer = new Observer(location.latitude, location.longitude, 0);
  const instant = new AstroTime(time);
  const rotation = Rotation_EQJ_HOR(instant, observer);
  const ra = raHours * 15 * RAD;
  const dec = decDegrees * RAD;
  const vector = new Vector(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec), instant);
  const horizontal = RotateVector(rotation, vector);
  return {altitude: Math.asin(horizontal.z) * DEG, azimuth: (Math.atan2(-horizontal.y, horizontal.x) * DEG + 360) % 360};
}

export function projectBrightStars(time: Date, location: ObservingLocation, width: number, height: number): ProjectedStar[] {
  if (width <= 0 || height <= 0) return [];
  const observer = new Observer(location.latitude, location.longitude, 0);
  const instant = new AstroTime(time);
  const rotation = Rotation_EQJ_HOR(instant, observer);
  const visible: ProjectedStar[] = [];
  for (const star of vectors) {
    const horizontal = RotateVector(rotation, new Vector(star.x, star.y, star.z, instant));
    if (horizontal.z <= 0) continue;
    const altitude = Math.asin(horizontal.z) * DEG;
    const azimuth = (Math.atan2(-horizontal.y, horizontal.x) * DEG + 360) % 360;
    const point = projectHorizontal({altitude, azimuth}, width, height)!;
    visible.push({...point, magnitude: star.magnitude, name: star.name});
  }
  return visible;
}
