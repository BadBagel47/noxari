import {AstroTime, Observer, RotateVector, Rotation_EQJ_HOR, Vector} from 'astronomy-engine';
import {brightStars} from './generated/brightStars';
import type {ObservingLocation, SkyPosition} from './astronomy';
import {movingStarVector, yearsSinceJ2000} from './starMotion';

export type MapPoint = {x: number; y: number};
export type ProjectedStar = MapPoint & {magnitude: number; name?: string};
export type HorizontalStar = SkyPosition & {magnitude: number; name?: string; hip: number | null};
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

export function catalogHorizontalTransform(time: Date, location: ObservingLocation) {
  const observer = new Observer(location.latitude, location.longitude, 0);
  const instant = new AstroTime(time);
  const rotation = Rotation_EQJ_HOR(instant, observer);
  const years = yearsSinceJ2000(time);
  return (raHours: number, decDegrees: number, pmRaCosDec = 0, pmDec = 0): SkyPosition => {
    const moved = movingStarVector(raHours, decDegrees, pmRaCosDec, pmDec, years);
    const horizontal = RotateVector(rotation, new Vector(moved.x, moved.y, moved.z, instant));
    return {altitude: Math.asin(Math.max(-1, Math.min(1, horizontal.z))) * DEG, azimuth: (Math.atan2(-horizontal.y, horizontal.x) * DEG + 360) % 360};
  };
}

export function catalogStarPosition(raHours: number, decDegrees: number, time: Date, location: ObservingLocation, pmRaCosDec = 0, pmDec = 0): SkyPosition {
  return catalogHorizontalTransform(time, location)(raHours, decDegrees, pmRaCosDec, pmDec);
}

export function horizontalStarCatalog(time: Date, location: ObservingLocation): HorizontalStar[] {
  const observer = new Observer(location.latitude, location.longitude, 0);
  const instant = new AstroTime(time);
  const rotation = Rotation_EQJ_HOR(instant, observer);
  const visible: HorizontalStar[] = [];
  const years = yearsSinceJ2000(time);
  for (const [ra, dec, magnitude, name, pmRaCosDec, pmDec, hip] of brightStars) {
    const star = movingStarVector(ra, dec, pmRaCosDec, pmDec, years);
    const horizontal = RotateVector(rotation, new Vector(star.x, star.y, star.z, instant));
    const altitude = Math.asin(horizontal.z) * DEG;
    const azimuth = (Math.atan2(-horizontal.y, horizontal.x) * DEG + 360) % 360;
    visible.push({altitude, azimuth, magnitude, name: name ?? undefined, hip});
  }
  return visible;
}

export function horizontalBrightStars(time: Date, location: ObservingLocation): HorizontalStar[] {
  return horizontalStarCatalog(time, location).filter(star => star.altitude > 0);
}

export function projectBrightStars(time: Date, location: ObservingLocation, width: number, height: number): ProjectedStar[] {
  if (width <= 0 || height <= 0) return [];
  return horizontalBrightStars(time, location).map(star => ({
    ...projectHorizontal(star, width, height)!, magnitude: star.magnitude, name: star.name,
  }));
}

export type ViewDirection = {heading: number; pitch: number};
export const perspectiveFocal = (width: number, height: number) => Math.max(width, height) / 2;

// Rectilinear eye-level view. Heading is clockwise from north, pitch is above
// the geometric horizon. The camera has no roll; the horizon stays level.
export function projectPerspective(position: SkyPosition, view: ViewDirection, width: number, height: number, clipToViewport = true, allowBelowHorizon = false): MapPoint | null {
  if (width <= 0 || height <= 0 || (position.altitude < 0 && !allowBelowHorizon)) return null;
  const delta = ((position.azimuth - view.heading + 540) % 360 - 180) * RAD;
  const altitude = position.altitude * RAD;
  const pitch = view.pitch * RAD;
  const depth = Math.cos(altitude) * Math.cos(delta) * Math.cos(pitch) + Math.sin(altitude) * Math.sin(pitch);
  if (depth <= 0) return null;
  const right = Math.cos(altitude) * Math.sin(delta);
  const up = Math.sin(altitude) * Math.cos(pitch) - Math.cos(altitude) * Math.cos(delta) * Math.sin(pitch);
  const focal = perspectiveFocal(width, height); // Limit the longer axis to 90°.
  const x = width / 2 + focal * right / depth;
  const y = height / 2 - focal * up / depth;
  return !clipToViewport || (x >= 0 && x <= width && y >= 0 && y <= height) ? {x, y} : null;
}
