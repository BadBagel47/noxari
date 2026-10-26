import {AstroTime, Observer, RotateVector, Rotation_EQJ_HOR, Vector} from 'astronomy-engine';
import {brightStars} from './generated/brightStars';
import type {ObservingLocation, SkyPosition} from './astronomy';

export type MapPoint = {x: number; y: number};
export type ProjectedStar = MapPoint & {magnitude: number; name?: string};
export type HorizontalStar = SkyPosition & {magnitude: number; name?: string};
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

export function horizontalBrightStars(time: Date, location: ObservingLocation): HorizontalStar[] {
  const observer = new Observer(location.latitude, location.longitude, 0);
  const instant = new AstroTime(time);
  const rotation = Rotation_EQJ_HOR(instant, observer);
  const visible: HorizontalStar[] = [];
  for (const star of vectors) {
    const horizontal = RotateVector(rotation, new Vector(star.x, star.y, star.z, instant));
    if (horizontal.z <= 0) continue;
    const altitude = Math.asin(horizontal.z) * DEG;
    const azimuth = (Math.atan2(-horizontal.y, horizontal.x) * DEG + 360) % 360;
    visible.push({altitude, azimuth, magnitude: star.magnitude, name: star.name});
  }
  return visible;
}

export function projectBrightStars(time: Date, location: ObservingLocation, width: number, height: number): ProjectedStar[] {
  if (width <= 0 || height <= 0) return [];
  return horizontalBrightStars(time, location).map(star => ({
    ...projectHorizontal(star, width, height)!, magnitude: star.magnitude, name: star.name,
  }));
}

export type ViewDirection = {heading: number; pitch: number};

// Rectilinear eye-level view. Heading is clockwise from north, pitch is above
// the geometric horizon. The camera has no roll; the horizon stays level.
export function projectPerspective(position: SkyPosition, view: ViewDirection, width: number, height: number): MapPoint | null {
  if (width <= 0 || height <= 0 || position.altitude < 0) return null;
  const delta = ((position.azimuth - view.heading + 540) % 360 - 180) * RAD;
  const altitude = position.altitude * RAD;
  const pitch = view.pitch * RAD;
  const depth = Math.cos(altitude) * Math.cos(delta) * Math.cos(pitch) + Math.sin(altitude) * Math.sin(pitch);
  if (depth <= 0) return null;
  const right = Math.cos(altitude) * Math.sin(delta);
  const up = Math.sin(altitude) * Math.cos(pitch) - Math.cos(altitude) * Math.cos(delta) * Math.sin(pitch);
  const focal = width / 2; // 90-degree horizontal field of view.
  const x = width / 2 + focal * right / depth;
  const y = height / 2 - focal * up / depth;
  return x >= 0 && x <= width && y >= 0 && y <= height ? {x, y} : null;
}
