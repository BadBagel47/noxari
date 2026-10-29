import type {SkyPosition} from './astronomy';
import type {ViewDirection} from './skyProjection';

const RAD = Math.PI / 180;
export const CENTER_TOLERANCE = 3;

export function finderGuidance(target: SkyPosition, view: ViewDirection) {
  const headingDelta = ((target.azimuth - view.heading) % 360 + 540) % 360 - 180;
  const altitudeDelta = target.altitude - view.pitch;
  const targetAlt = target.altitude * RAD, pitch = view.pitch * RAD;
  const dot = Math.sin(targetAlt) * Math.sin(pitch) + Math.cos(targetAlt) * Math.cos(pitch) * Math.cos(headingDelta * RAD);
  const separation = Math.acos(Math.max(-1, Math.min(1, dot))) / RAD;
  const belowHorizon = target.altitude < 0;
  return {headingDelta, altitudeDelta, separation, belowHorizon,
    centered: !belowHorizon && separation <= CENTER_TOLERANCE};
}

// Direction for a cue in the readout. Use the projected screen direction in
// front of the camera; behind it, use the shortest signed yaw and tilt.
export function finderArrowRotation(target: SkyPosition, view: ViewDirection, width: number, height: number, projected: {x: number; y: number} | null) {
  const guidance = finderGuidance(target, view);
  let dx = projected ? projected.x - width / 2 : guidance.headingDelta * Math.cos(target.altitude * RAD);
  let dy = projected ? projected.y - height / 2 : -guidance.altitudeDelta;
  if (Math.hypot(dx, dy) < 1e-6) { dx = 0; dy = -1; }
  return Math.atan2(dx, -dy) / RAD;
}
