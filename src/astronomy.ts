import {Body, DefineStar, Equator, Horizon, Observer} from 'astronomy-engine';
import {DateTime} from 'luxon';
import {objects, type SpaceObject} from './data';

export type ObservingLocation = {name: string; latitude: number; longitude: number; timeZone: string};
export type SkyPosition = {altitude: number; azimuth: number};
export type NightSample = {time: Date; altitude: number; sunAltitude: number};
export type VisibilitySeries = {samples: NightSample[]; real: boolean; timeZone: string};

export const stockholm: ObservingLocation = {name: 'Stockholm', latitude: 59.3293, longitude: 18.0686, timeZone: 'Europe/Stockholm'};

// Astronomy Engine reserves eight fixed-source slots. Our six J2000 catalog centers
// fit in those slots and are precessed to the requested date by Equator(..., true, ...).
const starSlots = [Body.Star1, Body.Star2, Body.Star3, Body.Star4, Body.Star5, Body.Star6, Body.Star7, Body.Star8];
const fixedBodies = new Map<string, Body>();
for (const object of objects) {
  if (object.position?.kind !== 'fixed') continue;
  const slot = starSlots[fixedBodies.size];
  if (!slot) throw new Error('More fixed sources than Astronomy Engine supports');
  DefineStar(slot, object.position.raHours, object.position.decDegrees, object.position.distanceLy);
  fixedBodies.set(object.id, slot);
}

export function positionAt(body: Body, time: Date, location: ObservingLocation): SkyPosition {
  const observer = new Observer(location.latitude, location.longitude, 0);
  const equatorial = Equator(body, time, observer, true, true);
  // Geometric altitude: no atmospheric refraction, terrain, or weather correction.
  const horizontal = Horizon(time, observer, equatorial.ra, equatorial.dec);
  return {altitude: horizontal.altitude, azimuth: horizontal.azimuth};
}

export function objectPosition(object: SpaceObject, time: Date, location: ObservingLocation): SkyPosition | null {
  if (!object.position) return null;
  const body = object.position.kind === 'solar'
    ? Body[object.position.body]
    : fixedBodies.get(object.id);
  if (!body) throw new Error(`Missing catalog position for ${object.id}`);
  return positionAt(body, time, location);
}

// The night is shown from 18:00 to 06:00 in the selected observation timezone.
// Calendar-day arithmetic keeps the correct night through DST transitions.
export function nightWindow(time: Date, location: ObservingLocation): {start: Date; end: Date} {
  const local = DateTime.fromJSDate(time, {zone: location.timeZone});
  const evening = (local.hour < 12 ? local.minus({days: 1}) : local).startOf('day');
  return {start: evening.set({hour: 18}).toJSDate(), end: evening.plus({days: 1}).set({hour: 6}).toJSDate()};
}

export function nightVisibility(object: SpaceObject, time: Date, location: ObservingLocation): VisibilitySeries {
  const {start, end} = nightWindow(time, location);
  const count = 25;
  const samples = Array.from({length: count}, (_, index) => {
    const sampleTime = new Date(start.getTime() + (end.getTime() - start.getTime()) * index / (count - 1));
    const sunAltitude = positionAt(Body.Sun, sampleTime, location).altitude;
    const actual = objectPosition(object, sampleTime, location);
    const demo = object.demoAltitudes;
    const fractional = index * ((demo?.length ?? 1) - 1) / (count - 1);
    const lower = Math.floor(fractional);
    const illustrative = demo ? demo[lower] + (demo[Math.min(lower + 1, demo.length - 1)] - demo[lower]) * (fractional - lower) : NaN;
    return {time: sampleTime, altitude: actual?.altitude ?? illustrative, sunAltitude};
  });
  return {samples, real: Boolean(object.position), timeZone: location.timeZone};
}

export function clockTime(time: Date, timeZone: string): string {
  return DateTime.fromJSDate(time, {zone: timeZone}).toFormat('HH:mm');
}

export function localDateTimeValue(time: Date, timeZone: string): string {
  return DateTime.fromJSDate(time, {zone: timeZone}).toFormat("yyyy-MM-dd'T'HH:mm");
}

export function selectedLocalTime(value: string, timeZone: string): Date | null {
  const parsed = DateTime.fromISO(value, {zone: timeZone});
  // Luxon shifts nonexistent wall times across a spring DST gap; reject them.
  return parsed.isValid && parsed.toFormat("yyyy-MM-dd'T'HH:mm") === value ? parsed.toJSDate() : null;
}
