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
export type PathMark = PreparedHorizontalDirection & {label: string; time: Date};
export type ObjectPath = {night: PreparedHorizontalDirection[]; hours: PathMark[]; stars: PreparedHorizontalDirection[]; days: PathMark[]};

const prepare = (position: SkyPosition): PreparedHorizontalDirection => ({...position, ...prepareHorizontalDirection(position)});

export const hasPath = (object: SpaceObject | null | undefined) => Boolean(object?.position && object.position.kind !== 'satellite');
export const movesAmongStars = (object: SpaceObject | null | undefined) => object?.position?.kind === 'solar' || object?.position?.kind === 'keplerian';

export function nightPath(object: SpaceObject, time: Date, location: ObservingLocation, stepMinutes = 10) {
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
    const at = hour.toJSDate(), position = objectPositioner(at, location)(object);
    if (position) hours.push({...prepare(position), label: hour.toFormat('HH'), time: at});
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
  return {...nightPath(object, time, location), ...starPathSky(starPathSamples(object, time, location, language), time, location)};
}

/** Stable keys so paths are recomputed per night / per day, not on every live-clock tick. */
export const nightKey = (time: Date) => Math.floor(time.getTime() / 1_800_000);
export const dayKey = (time: Date) => Math.floor(time.getTime() / 21_600_000);

type Project = (position: PreparedHorizontalDirection) => {x: number; y: number} | null;

/** Draws the night track (dashed, hour marks) and the motion among stars (dotted, date marks). Canvas only; used by both views. */
export function drawObjectPath(context: CanvasRenderingContext2D, path: ObjectPath, project: Project, width: number, alpha = 1) {
  if (alpha <= 0) return;
  const jump = width / 6;
  const curve = (samples: PreparedHorizontalDirection[]) => {
    context.beginPath();
    let previous: {x: number; y: number} | null = null;
    for (const sample of samples) {
      const point = project(sample);
      if (point) {
        if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < jump) context.lineTo(point.x, point.y);
        else context.moveTo(point.x, point.y);
      }
      previous = point;
    }
    context.stroke();
  };
  const placed: {x: number; y: number}[] = [];
  const marks = (list: PathMark[], fill: string) => {
    for (const mark of list) {
      const point = project(mark);
      if (!point || placed.some(other => Math.abs(other.x - point.x) < 34 && Math.abs(other.y - point.y) < 14)) continue;
      placed.push(point);
      context.fillStyle = fill;
      context.beginPath();
      context.arc(point.x, point.y, 2.6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(2,5,10,.75)';
      context.fillText(mark.label, point.x + 1, point.y - 6);
      context.fillStyle = fill;
      context.fillText(mark.label, point.x, point.y - 7);
    }
  };
  context.save();
  context.globalAlpha = alpha;
  context.font = '600 11px system-ui, sans-serif';
  context.textAlign = 'center';
  context.lineWidth = 1.4;
  if (path.night.length) {
    context.strokeStyle = 'rgba(138,200,255,.62)';
    context.setLineDash([7, 5]);
    curve(path.night);
    context.setLineDash([]);
    marks(path.hours, 'rgba(178,220,255,.95)');
  }
  if (path.stars.length) {
    context.strokeStyle = 'rgba(255,196,120,.7)';
    context.setLineDash([1.5, 4]);
    context.lineCap = 'round';
    context.lineWidth = 2;
    curve(path.stars);
    context.setLineDash([]);
    marks(path.days, 'rgba(255,214,160,.95)');
  }
  context.restore();
}
