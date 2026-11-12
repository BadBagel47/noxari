import {AstroTime, Observer, RotateVector, Rotation_EQJ_HOR, Vector} from 'astronomy-engine';
import {brightStars} from './generated/brightStars';
import {starColorIndex} from './generated/starColors';
import type {ObservingLocation, SkyPosition} from './astronomy';
import {movingStarVector, yearsSinceJ2000} from './starMotion';

export type MapPoint = {x: number; y: number};
export type ProjectedStar = MapPoint & {magnitude: number; name?: string};
/** `index` is the star's position in brightStars (and in the F-049/F-050 colour/detail tables); `ci` is its B–V colour index. */
export type HorizontalStar = SkyPosition & {magnitude: number; name?: string; hip: number | null; index?: number; ci?: number | null};
export type PreparedHorizontalDirection = SkyPosition & {sinAltitude: number; cosAltitude: number; sinAzimuth: number; cosAzimuth: number};
export type PreparedHorizontalStar = HorizontalStar & Pick<PreparedHorizontalDirection, 'sinAltitude'|'cosAltitude'|'sinAzimuth'|'cosAzimuth'>;
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

// Azimuthal equidistant projection centered on the zenith. The horizon is a
// circle; north is up, east right, south down, and west left.
export function projectHorizontal(position: SkyPosition, width: number, height: number, zoom = 1): MapPoint | null {
  if (position.altitude < 0 || position.altitude > 90) return null;
  const radius = (90 - position.altitude) / 90 * Math.min(width, height) * 0.44 * zoom;
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
  for (let index = 0; index < brightStars.length; index++) {
    const [ra, dec, magnitude, name, pmRaCosDec, pmDec, hip] = brightStars[index];
    const star = movingStarVector(ra, dec, pmRaCosDec, pmDec, years);
    const horizontal = RotateVector(rotation, new Vector(star.x, star.y, star.z, instant));
    const altitude = Math.asin(horizontal.z) * DEG;
    const azimuth = (Math.atan2(-horizontal.y, horizontal.x) * DEG + 360) % 360;
    const ci = starColorIndex[index];
    visible.push({altitude, azimuth, magnitude, name: name ?? undefined, hip, index, ci: ci === null ? null : ci / 100});
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
export const perspectiveFocal = (width: number, height: number, zoom = 1) => Math.max(width, height) / 2 * zoom;

// Rectilinear eye-level view. Heading is clockwise from north, pitch is above
// the geometric horizon. The camera has no roll; the horizon stays level.
export function projectPerspective(position: SkyPosition, view: ViewDirection, width: number, height: number, clipToViewport = true, allowBelowHorizon = false, zoom = 1): MapPoint | null {
  if (width <= 0 || height <= 0 || (position.altitude < 0 && !allowBelowHorizon)) return null;
  const delta = ((position.azimuth - view.heading + 540) % 360 - 180) * RAD;
  const altitude = position.altitude * RAD;
  const pitch = view.pitch * RAD;
  const depth = Math.cos(altitude) * Math.cos(delta) * Math.cos(pitch) + Math.sin(altitude) * Math.sin(pitch);
  if (depth <= 0) return null;
  const right = Math.cos(altitude) * Math.sin(delta);
  const up = Math.sin(altitude) * Math.cos(pitch) - Math.cos(altitude) * Math.cos(delta) * Math.sin(pitch);
  const focal = perspectiveFocal(width, height, zoom); // Limit the longer axis to 90° at 1×.
  const x = width / 2 + focal * right / depth;
  const y = height / 2 - focal * up / depth;
  return !clipToViewport || (x >= 0 && x <= width && y >= 0 && y <= height) ? {x, y} : null;
}

/** Reuse the camera trigonometry while projecting changing horizon-view geometry. */
export function createPerspectiveProjector(view: ViewDirection, width: number, height: number, clipToViewport = true, allowBelowHorizon = false, zoom = 1, clipMargin = 0) {
  const heading = view.heading * RAD, pitch = view.pitch * RAD;
  const cosHeading = Math.cos(heading), sinHeading = Math.sin(heading);
  const cosPitch = Math.cos(pitch), sinPitch = Math.sin(pitch);
  const focal = perspectiveFocal(width, height, zoom);
  return (position: SkyPosition, clip = clipToViewport): MapPoint | null => {
    if (width <= 0 || height <= 0 || (position.altitude < 0 && !allowBelowHorizon)) return null;
    const altitude = position.altitude * RAD, azimuth = position.azimuth * RAD;
    const cosAltitude = Math.cos(altitude), sinAltitude = Math.sin(altitude);
    const cosAzimuth = Math.cos(azimuth), sinAzimuth = Math.sin(azimuth);
    const cosDelta = cosAzimuth * cosHeading + sinAzimuth * sinHeading;
    const sinDelta = sinAzimuth * cosHeading - cosAzimuth * sinHeading;
    const depth = cosAltitude * cosDelta * cosPitch + sinAltitude * sinPitch;
    if (depth <= 0) return null;
    const right = cosAltitude * sinDelta;
    const up = sinAltitude * cosPitch - cosAltitude * cosDelta * sinPitch;
    const x = width / 2 + focal * right / depth;
    const y = height / 2 - focal * up / depth;
    return !clip || (x >= -clipMargin && x <= width + clipMargin && y >= -clipMargin && y <= height + clipMargin) ? {x, y} : null;
  };
}

export function prepareHorizontalStars(stars: HorizontalStar[]): PreparedHorizontalStar[] {
  return stars.map(star => ({...star, ...prepareHorizontalDirection(star)}));
}

export function prepareHorizontalDirection(position: SkyPosition): Pick<PreparedHorizontalDirection, 'sinAltitude'|'cosAltitude'|'sinAzimuth'|'cosAzimuth'> {
  const altitude = position.altitude * RAD;
  const azimuth = position.azimuth * RAD;
  return {sinAltitude: Math.sin(altitude), cosAltitude: Math.cos(altitude), sinAzimuth: Math.sin(azimuth), cosAzimuth: Math.cos(azimuth)};
}

export function prepareHorizontalDirections(positions: SkyPosition[]): PreparedHorizontalDirection[] {
  return positions.map(position => ({...position, ...prepareHorizontalDirection(position)}));
}

/** Build a fast projector for a fixed camera pose; stars supply cached horizontal trigonometry. */
export function createPreparedPerspectiveProjector<T extends PreparedHorizontalDirection>(view: ViewDirection, width: number, height: number, clipToViewport = true, allowBelowHorizon = false, zoom = 1, clipMargin = 0) {
  const heading = view.heading * RAD;
  const pitch = view.pitch * RAD;
  const cosHeading = Math.cos(heading), sinHeading = Math.sin(heading);
  const cosPitch = Math.cos(pitch), sinPitch = Math.sin(pitch);
  const focal = perspectiveFocal(width, height, zoom);
  return (star: T): MapPoint | null => {
    if (width <= 0 || height <= 0 || (star.altitude < 0 && !allowBelowHorizon)) return null;
    const cosDelta = star.cosAzimuth * cosHeading + star.sinAzimuth * sinHeading;
    const sinDelta = star.sinAzimuth * cosHeading - star.cosAzimuth * sinHeading;
    const depth = star.cosAltitude * cosDelta * cosPitch + star.sinAltitude * sinPitch;
    if (depth <= 0) return null;
    const right = star.cosAltitude * sinDelta;
    const up = star.sinAltitude * cosPitch - star.cosAltitude * cosDelta * sinPitch;
    const x = width / 2 + focal * right / depth;
    const y = height / 2 - focal * up / depth;
    return !clipToViewport || (x >= -clipMargin && x <= width + clipMargin && y >= -clipMargin && y <= height + clipMargin) ? {x, y} : null;
  };
}

/** Project horizontal unit directions (cosAlt·cosAz, cosAlt·sinAz, sinAlt), as stored for F-043 faint stars. */
export function createDirectionProjector(view: ViewDirection, width: number, height: number, zoom = 1) {
  const heading = view.heading * RAD, pitch = view.pitch * RAD;
  const cosHeading = Math.cos(heading), sinHeading = Math.sin(heading);
  const cosPitch = Math.cos(pitch), sinPitch = Math.sin(pitch);
  const focal = perspectiveFocal(width, height, zoom);
  return (x: number, y: number, z: number): MapPoint | null => {
    const forward = x * cosHeading + y * sinHeading;
    const depth = forward * cosPitch + z * sinPitch;
    if (depth <= 0) return null;
    const px = width / 2 + focal * (y * cosHeading - x * sinHeading) / depth;
    const py = height / 2 - focal * (z * cosPitch - forward * sinPitch) / depth;
    return px >= 0 && px <= width && py >= 0 && py <= height ? {x: px, y: py} : null;
  };
}
