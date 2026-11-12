import type {SkyPosition, ObservingLocation} from './astronomy';
import {objectPosition} from './astronomy';
import type {SpaceObject} from './data';
import type {ViewDirection} from './skyProjection';

/** F-044/F-045: a guided sequence through a list of objects. */
export type TourMode = 'point' | 'show' | 'demo';
export type TourSource = 'saved' | 'tonight';

/** Keep list order; objects without a position or below the horizon right now are skipped. */
export function tourStops(objects: SpaceObject[], time: Date, location: ObservingLocation) {
  const stops: SpaceObject[] = [], skipped: SpaceObject[] = [];
  for (const object of objects) {
    if (!object.position) continue;
    const position = objectPosition(object, time, location);
    if (position && position.altitude >= 0) stops.push(object); else skipped.push(object);
  }
  return {stops, skipped};
}

const easeInOut = (k: number) => k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
const easeOut = (k: number) => 1 - (1 - k) ** 3;

/** Angular distance between two view directions (degrees). */
export function separation(a: ViewDirection, b: ViewDirection) {
  const r = Math.PI / 180;
  const cos = Math.sin(a.pitch * r) * Math.sin(b.pitch * r) + Math.cos(a.pitch * r) * Math.cos(b.pitch * r) * Math.cos((a.heading - b.heading) * r);
  return Math.acos(Math.max(-1, Math.min(1, cos))) / r;
}

/** Glide duration grows with the turn; cinematic moves never get shorter than ~2.6 s so short hops still read as a move. */
export function glideDuration(from: ViewDirection, to: ViewDirection, cinematic: boolean) {
  const angle = separation(from, to);
  return cinematic ? 2600 + Math.min(1, angle / 120) * 2400 : 900 + Math.min(1, angle / 120) * 900;
}

/**
 * Camera pose along a "pull back, crane up, swing, push in" move. Heading/pitch
 * ease over the whole move and the camera rises in an arc (cinematic only); the
 * zoom first widens toward 1× and pushes in to the goal zoom in the last part.
 * Cinematic moves always pull back at least half-way, even between neighbours.
 */
export function cinematicPose(k: number, from: ViewDirection, fromZoom: number, goal: ViewDirection, goalZoom: number, cinematic = true) {
  const t = Math.max(0, Math.min(1, k)), eased = easeInOut(t), angle = separation(from, goal);
  const headingDelta = ((goal.heading - from.heading + 540) % 360) - 180;
  const lift = cinematic ? Math.min(14, 3 + angle * .3) * Math.sin(Math.PI * t) : 0;
  const pitch = from.pitch + (goal.pitch - from.pitch) * eased + lift;
  const view = {heading: (from.heading + headingDelta * eased + 360) % 360, pitch: Math.max(-89.9, Math.min(85, pitch))};
  // Long swings pull back to 1×; short hops still widen (half-way when cinematic).
  const near = Math.min(fromZoom, goalZoom), wide = near + (1 - near) * Math.max(cinematic ? .5 : 0, Math.min(1, angle / 25));
  const zoom = t < .45 ? fromZoom + (wide - fromZoom) * easeOut(t / .45) : wide + (goalZoom - wide) * easeInOut((t - .45) / .55);
  return {view, zoom: Math.max(1, Math.min(3, zoom))};
}

/** While an object is shown the camera keeps moving: a slow push-in and a gentle drift. */
export function holdPose(k: number, base: ViewDirection, baseZoom: number) {
  const t = Math.max(0, Math.min(1, k)), sine = (1 - Math.cos(Math.PI * t)) / 2;
  return {view: {heading: (base.heading + 2.5 * sine + 360) % 360, pitch: Math.max(-89.9, Math.min(89.9, base.pitch + .8 * sine))}, zoom: Math.min(3, baseZoom * (1 + .16 * sine))};
}

export function goalView(position: SkyPosition): ViewDirection {
  return {heading: position.azimuth, pitch: Math.max(-89.9, Math.min(89.9, position.altitude))};
}
