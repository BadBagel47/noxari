import {Body, Equator, Observer} from 'astronomy-engine';
import {DateTime} from 'luxon';
import {keplerianEquatorial, nightWindow, objectPositioner, type ObservingLocation, type SkyPosition} from './astronomy';
import type {SpaceObject} from './data';
import {catalogHorizontalTransform, prepareHorizontalDirection, type PreparedHorizontalDirection} from './skyProjection';

/**
 * F-053: where the selected object goes.
 * - nightPath: its calculated track across tonight's sky (sunset − 30 min → sunrise + 30 min, or
 *   noon to noon at polar latitudes), with whole-hour marks in the place's time zone.
 * - starPath: for solar-system bodies, how they move among the stars over days (planets ±4 weeks,
 *   the Moon ±3 days), drawn against the current sky.
 * Positions are geometric (no refraction); the ISS is excluded (it crosses the sky in minutes).
 */
export type PathMark = PreparedHorizontalDirection & {label: string; time: Date; ahead?: PreparedHorizontalDirection};
export type ObjectPath = {night: PreparedHorizontalDirection[]; hours: PathMark[]; stars: PreparedHorizontalDirection[]; days: PathMark[]};

const prepare = (position: SkyPosition): PreparedHorizontalDirection => ({...position, ...prepareHorizontalDirection(position)});

export const hasPath = (object: SpaceObject | null | undefined) => Boolean(object?.position && object.position.kind !== 'satellite');
export const movesAmongStars = (object: SpaceObject | null | undefined) => object?.position?.kind === 'solar' || object?.position?.kind === 'keplerian';

/** F-077: hour labels read as clock times on the track ("kl. 23" / "23:00"), not as separate objects. */
export const hourLabel = (hour: string, language: 'en' | 'sv') => language === 'sv' ? `kl. ${hour}` : `${hour}:00`;

export function nightPath(object: SpaceObject, time: Date, location: ObservingLocation, language: 'en' | 'sv' = 'en', stepMinutes = 10) {
  const window = nightWindow(time, location);
  const night: PreparedHorizontalDirection[] = [], hours: PathMark[] = [];
  if (!hasPath(object)) return {night, hours};
  const start = window.start.getTime(), end = window.end.getTime(), step = stepMinutes * 60_000;
  for (let instant = start; instant <= end + 1; instant += step) {
    const position = objectPositioner(new Date(instant), location)(object);
    if (position) night.push(prepare(position));
  }
  let hour = DateTime.fromMillis(start, {zone: location.timeZone}).startOf('hour').plus({hours: 1});
  for (; hour.toMillis() <= end; hour = hour.plus({hours: 1})) {
    const at = hour.toJSDate(), positioner = objectPositioner(at, location), position = positioner(object);
    // A point ten minutes later gives the track's direction for the tick across it.
    const next = objectPositioner(new Date(at.getTime() + 600_000), location)(object);
    if (position) hours.push({...prepare(position), label: hourLabel(hour.toFormat('HH'), language), time: at, ...(next ? {ahead: prepare(next)} : {})});
  }
  return {night, hours};
}

/** J2000 RA/Dec of a solar-system body at a date, as seen from the place (topocentric for the Moon). */
function bodyEquatorial(object: SpaceObject, date: Date, location: ObservingLocation) {
  const source = object.position;
  if (source?.kind === 'solar') {
    const equatorial = Equator(Body[source.body], date, new Observer(location.latitude, location.longitude, 0), false, true);
    return {ra: equatorial.ra, dec: equatorial.dec};
  }
  if (source?.kind === 'keplerian') {
    const equatorial = keplerianEquatorial(object, date);
    return equatorial && Number.isFinite(equatorial.ra) ? {ra: equatorial.ra, dec: equatorial.dec} : null;
  }
  return null;
}

/** Equatorial samples are fixed per day; only the rotation to the horizon follows the shown time. */
export function starPathSamples(object: SpaceObject, time: Date, location: ObservingLocation, language: 'en' | 'sv') {
  if (!movesAmongStars(object)) return null;
  // Slow outer bodies get a longer window so their motion is visible; labels stay a handful.
  const body = object.position?.kind === 'solar' ? object.position.body : null;
  const [spanDays, labelEvery] = body === 'Moon' ? [3, 1]
    : body === 'Mercury' || body === 'Venus' || body === 'Mars' ? [28, 7]
    : body === 'Jupiter' || body === 'Saturn' ? [90, 30] : object.position?.kind === 'keplerian' ? [90, 30] : [180, 60];
  const steps = 48, stepDays = spanDays / steps, labelStep = Math.round(steps * labelEvery / spanDays);
  const locale = language === 'sv' ? 'sv' : 'en';
  const samples: {ra: number; dec: number; time: Date; label: string}[] = [];
  for (let i = -steps; i <= steps; i++) {
    const at = new Date(time.getTime() + i * stepDays * 86_400_000), equatorial = bodyEquatorial(object, at, location);
    if (equatorial) samples.push({...equatorial, time: at,
      label: i !== 0 && i % labelStep === 0 ? DateTime.fromJSDate(at, {zone: location.timeZone}).setLocale(locale).toFormat('d LLL') : ''});
  }
  return samples;
}

export function starPathSky(samples: ReturnType<typeof starPathSamples>, time: Date, location: ObservingLocation) {
  const stars: PreparedHorizontalDirection[] = [], days: PathMark[] = [];
  if (!samples) return {stars, days};
  const project = catalogHorizontalTransform(time, location);
  for (const sample of samples) {
    const position = prepare(project(sample.ra, sample.dec));
    stars.push(position);
    if (sample.label) days.push({...position, label: sample.label, time: sample.time});
  }
  return {stars, days};
}

export function objectPath(object: SpaceObject, time: Date, location: ObservingLocation, language: 'en' | 'sv' = 'en'): ObjectPath {
  return {...nightPath(object, time, location, language), ...starPathSky(starPathSamples(object, time, location, language), time, location)};
}

/** Stable keys so paths are recomputed per night / per day, not on every live-clock tick. */
export const nightKey = (time: Date) => Math.floor(time.getTime() / 1_800_000);
export const dayKey = (time: Date) => Math.floor(time.getTime() / 21_600_000);

type Project = (position: PreparedHorizontalDirection) => {x: number; y: number} | null;
type Point = {x: number; y: number};
const DEG = 180 / Math.PI;

const vector = (d: PreparedHorizontalDirection): [number, number, number] => [d.cosAltitude * d.cosAzimuth, d.cosAltitude * d.sinAzimuth, d.sinAltitude];
function direction(x: number, y: number, z: number): PreparedHorizontalDirection {
  const length = Math.hypot(x, y, z) || 1;
  x /= length; y /= length; z /= length;
  const cosAltitude = Math.hypot(x, y), sinAltitude = z;
  const sinAzimuth = cosAltitude > 1e-9 ? y / cosAltitude : 0, cosAzimuth = cosAltitude > 1e-9 ? x / cosAltitude : 1;
  return {altitude: Math.asin(Math.max(-1, Math.min(1, z))) * DEG, azimuth: (Math.atan2(y, x) * DEG + 360) % 360, sinAltitude, cosAltitude, sinAzimuth, cosAzimuth};
}
/** Catmull-Rom on unit vectors: a smooth curve through the samples, so a deep zoom shows an arc, not a chord. */
function between(a: PreparedHorizontalDirection, b: PreparedHorizontalDirection, c: PreparedHorizontalDirection, d: PreparedHorizontalDirection, t: number) {
  const p0 = vector(a), p1 = vector(b), p2 = vector(c), p3 = vector(d), t2 = t * t, t3 = t2 * t;
  const at = (i: number) => .5 * (2 * p1[i] + (p2[i] - p0[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (3 * p1[i] - p0[i] - 3 * p2[i] + p3[i]) * t3);
  return direction(at(0), at(1), at(2));
}
/** Liang–Barsky: the part of a segment inside a rectangle, or null. Keeps huge off-screen coordinates out of the canvas. */
function clipSegment(a: Point, b: Point, left: number, top: number, right: number, bottom: number): [Point, Point] | null {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  for (const [p, q] of [[-dx, a.x - left], [dx, right - a.x], [-dy, a.y - top], [dy, bottom - a.y]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
    else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [{x: a.x + t0 * dx, y: a.y + t0 * dy}, {x: a.x + t1 * dx, y: a.y + t1 * dy}];
}
/** Neighbouring samples further apart than this (≈ 20°) are a gap in the data, never joined. */
const GAP_COS = Math.cos(20 / DEG);

/**
 * B-021: draws the night track (dashed, hour ticks) and the motion among stars (dotted, date marks)
 * at every zoom. `line` must not clip to the viewport (segments crossing the screen have both ends
 * outside it when zoomed in); `mark` may. Canvas only; used by both views.
 */
export function drawObjectPath(context: CanvasRenderingContext2D, path: ObjectPath, project: {mark: Project; line: Project}, width: number, height: number, alpha = 1) {
  if (alpha <= 0) return;
  const margin = 24, left = -margin, top = -margin, right = width + margin, bottom = height + margin;
  const curve = (samples: PreparedHorizontalDirection[]) => {
    context.beginPath();
    const points = samples.map(project.line);
    let pen: Point | null = null;
    const segment = (a: Point, b: Point) => {
      const part = clipSegment(a, b, left, top, right, bottom);
      if (!part) { pen = null; return; }
      if (!pen || Math.abs(pen.x - part[0].x) > .5 || Math.abs(pen.y - part[0].y) > .5) context.moveTo(part[0].x, part[0].y);
      context.lineTo(part[1].x, part[1].y);
      pen = part[1];
    };
    for (let i = 0; i + 1 < samples.length; i++) {
      const a = points[i], b = points[i + 1];
      const va = vector(samples[i]), vb = vector(samples[i + 1]);
      if (!a || !b || va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2] < GAP_COS) { pen = null; continue; }
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      // Skip work for segments far outside the view; the curve bulges only slightly from its chord.
      const slack = margin + length * .05;
      if (Math.max(a.x, b.x) < -slack || Math.min(a.x, b.x) > width + slack || Math.max(a.y, b.y) < -slack || Math.min(a.y, b.y) > height + slack) { pen = null; continue; }
      const steps = Math.min(256, Math.max(1, Math.ceil(length / 8)));
      if (steps === 1) { segment(a, b); continue; }
      const p0 = samples[Math.max(0, i - 1)], p3 = samples[Math.min(samples.length - 1, i + 2)];
      let previous: Point = a;
      for (let k = 1; k <= steps; k++) {
        const next = k === steps ? b : project.line(between(p0, samples[i], samples[i + 1], p3, k / steps));
        if (!next) { pen = null; previous = b; continue; }
        segment(previous, next);
        previous = next;
      }
    }
    context.stroke();
  };
  const placed: {x: number; y: number; w: number}[] = [];
  const marks = (list: PathMark[], fill: string, tick: boolean) => {
    for (const mark of list) {
      const point = project.mark(mark);
      if (!point) continue;
      const labelWidth = context.measureText(mark.label).width + 8;
      if (placed.some(other => Math.abs(other.x - point.x) < (other.w + labelWidth) / 2 && Math.abs(other.y - point.y) < 16)) continue;
      // Tick across the track; the label sits beside it on the upper side.
      const ahead = tick && mark.ahead ? project.line(mark.ahead) : null;
      let nx = 0, ny = -1;
      if (ahead && Math.hypot(ahead.x - point.x, ahead.y - point.y) > .5) {
        const length = Math.hypot(ahead.x - point.x, ahead.y - point.y);
        nx = -(ahead.y - point.y) / length; ny = (ahead.x - point.x) / length;
        if (ny > 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }
      }
      placed.push({x: point.x, y: point.y, w: labelWidth});
      context.fillStyle = fill;
      context.strokeStyle = fill;
      if (ahead) {
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(point.x - nx * 5, point.y - ny * 5);
        context.lineTo(point.x + nx * 5, point.y + ny * 5);
        context.stroke();
      } else {
        context.beginPath();
        context.arc(point.x, point.y, 2.6, 0, Math.PI * 2);
        context.fill();
      }
      // Distance along the normal clears the tick and half the label, whichever way the track runs.
      const away = ahead ? 7 + Math.abs(nx) * labelWidth / 2 + Math.abs(ny) * 6 : 8;
      // Keep the label on screen when the mark is near an edge.
      const lx = Math.max(labelWidth / 2 + 2, Math.min(width - labelWidth / 2 - 2, point.x + nx * away)), ly = Math.max(9, Math.min(height - 9, point.y + ny * away));
      context.fillStyle = 'rgba(2,5,10,.75)';
      context.fillText(mark.label, lx + 1, ly + 1);
      context.fillStyle = fill;
      context.fillText(mark.label, lx, ly);
    }
  };
  context.save();
  context.globalAlpha = alpha;
  context.font = '600 11px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 1.4;
  if (path.night.length) {
    context.strokeStyle = 'rgba(138,200,255,.62)';
    context.setLineDash([7, 5]);
    curve(path.night);
    context.setLineDash([]);
    marks(path.hours, 'rgba(178,220,255,.95)', true);
  }
  if (path.stars.length) {
    context.strokeStyle = 'rgba(255,196,120,.7)';
    context.setLineDash([1.5, 4]);
    context.lineCap = 'round';
    context.lineWidth = 2;
    curve(path.stars);
    context.setLineDash([]);
    marks(path.days, 'rgba(255,214,160,.95)', false);
  }
  context.restore();
}
