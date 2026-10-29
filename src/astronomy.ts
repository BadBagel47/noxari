import {AngleFromSun, Body, Constellation, Equator, EquatorFromVector, GeoVector, Horizon, Illumination, Observer, SearchRiseSet} from 'astronomy-engine';
import {DateTime} from 'luxon';
import type {SpaceObject} from './data';
import {brightStars} from './generated/brightStars';
import {catalogHorizontalTransform} from './skyProjection';

export type ObservingLocation = {name: string; latitude: number; longitude: number; timeZone: string};
export type SkyPosition = {altitude: number; azimuth: number};
export type NightEnvironment = {time: Date; sunAltitude: number; moonAltitude: number; moonAzimuth: number; moonIllumination: number};
export type NightSample = NightEnvironment & {altitude: number; azimuth: number; sunSeparation?: number};
export type VisibilitySeries = {samples: NightSample[]; real: boolean; timeZone: string; maxSunAltitude: number};
export type NightWindow = {start: Date; end: Date; sunset?: Date; sunrise?: Date; kind: 'normal' | 'polarDay' | 'polarNight' | 'partial'};
export type NightContext = {window: NightWindow; samples: NightEnvironment[]};

export const stockholm: ObservingLocation = {name: 'Stockholm', latitude: 59.3293, longitude: 18.0686, timeZone: 'Europe/Stockholm'};

const siriusStar = brightStars.find(star => star[3] === 'Sirius')!;

export function positionAt(body: Body, time: Date, location: ObservingLocation): SkyPosition {
  const observer = new Observer(location.latitude, location.longitude, 0);
  const equatorial = Equator(body, time, observer, true, true);
  // Geometric altitude: no atmospheric refraction, terrain, or weather correction.
  const horizontal = Horizon(time, observer, equatorial.ra, equatorial.dec);
  return {altitude: horizontal.altitude, azimuth: horizontal.azimuth};
}

// Share one J2000->horizontal rotation across any number of catalog centers.
// Fixed sources omit parallax and aberration, consistently with the star field;
// their catalog distances are metadata, not invented inputs to an ephemeris slot.
export function objectPositioner(time: Date, location: ObservingLocation) {
  const project = catalogHorizontalTransform(time, location);
  return (object: SpaceObject): SkyPosition | null => {
    if (!object.position) return null;
    if (object.position.kind === 'solar') return positionAt(Body[object.position.body], time, location);
    if (object.id === 'sirius') {
      const [ra, dec, , , pmRaCosDec, pmDec] = siriusStar;
      return project(ra, dec, pmRaCosDec, pmDec);
    }
    return project(object.position.raHours, object.position.decDegrees);
  };
}

export function objectPosition(object: SpaceObject, time: Date, location: ObservingLocation): SkyPosition | null {
  return objectPositioner(time, location)(object);
}

// Geocentric photometry and distance, separate from the observer's topocentric
// altitude/azimuth. Magnitude is a model without atmospheric extinction.
export function solarAppearance(object: SpaceObject, time: Date) {
  if (object.position?.kind !== 'solar') return null;
  const body = Body[object.position.body];
  const light = Illumination(body, time);
  const equatorial = EquatorFromVector(GeoVector(body, time, true));
  return {distanceAu: light.geo_dist, magnitude: light.mag, illuminatedFraction: light.phase_fraction,
    sunSeparation: AngleFromSun(body, time), constellation: Constellation(equatorial.ra, equatorial.dec).name};
}

// Marker policy is schematic, not a claim of naked-eye visibility. Bright
// inner planets need civil twilight; deep-sky targets wait until darker skies.
export function showObjectMarker(object: SpaceObject, sunAltitude: number) {
  if (object.kind === 'Moon') return true;
  return sunAltitude < (object.kind === 'Planet' ? 0 : -6);
}

// Geometric horizon crossing, distinct from the standard refracted rise/set
// convention. Search at most 48 hours and bracket to roughly one minute.
export function nextObjectRise(object: SpaceObject, time: Date, location: ObservingLocation): Date | null {
  let previousTime = time.getTime();
  let previous = objectPosition(object, time, location);
  if (!previous || previous.altitude >= 0) return null;
  for (let step = 1; step <= 96; step++) {
    const currentTime = time.getTime() + step * 1800_000;
    const current = objectPosition(object, new Date(currentTime), location)!;
    if (previous.altitude < 0 && current.altitude >= 0) {
      let low = previousTime, high = currentTime;
      while (high - low > 60_000) {
        const middle = (low + high) / 2;
        if (objectPosition(object, new Date(middle), location)!.altitude >= 0) high = middle;
        else low = middle;
      }
      return new Date(high);
    }
    previousTime = currentTime;
    previous = current;
  }
  return null;
}

// A night belongs to the local noon-to-noon date interval, including DST.
// Standard sunrise/set use the solar upper limb and normal refraction; charts
// themselves retain geometric altitudes. Thirty-minute margins include twilight.
export function nightWindow(time: Date, location: ObservingLocation): NightWindow {
  const local = DateTime.fromJSDate(time, {zone: location.timeZone});
  const day = (local.hour < 12 ? local.minus({days: 1}) : local).startOf('day');
  const frameStart = day.set({hour: 12}).toJSDate();
  const frameEnd = day.plus({days: 1}).set({hour: 12}).toJSDate();
  const observer = new Observer(location.latitude, location.longitude, 0);
  const days = (frameEnd.getTime() - frameStart.getTime()) / 86400_000;
  const sunset = SearchRiseSet(Body.Sun, observer, -1, frameStart, days)?.date;
  const sunrise = SearchRiseSet(Body.Sun, observer, 1, frameStart, days)?.date;
  if (sunset && sunrise && sunset < sunrise) {
    const end = new Date(Math.min(frameEnd.getTime(), sunrise.getTime() + 1800_000));
    if (local.hour < 12 && time > end) return nightWindow(local.set({hour: 12}).toJSDate(), location);
    return {start: new Date(Math.max(frameStart.getTime(), sunset.getTime() - 1800_000)), end, sunset, sunrise, kind: 'normal'};
  }
  if (sunset || sunrise) return {start: frameStart, end: frameEnd, sunset, sunrise, kind: 'partial'};
  const midpoint = new Date((frameStart.getTime() + frameEnd.getTime()) / 2);
  const kind = positionAt(Body.Sun, midpoint, location).altitude > -.833 ? 'polarDay' : 'polarNight';
  return {start: frameStart, end: frameEnd, kind};
}

export function nightContext(time: Date, location: ObservingLocation): NightContext {
  const window = nightWindow(time, location);
  const count = Math.ceil((window.end.getTime() - window.start.getTime()) / 600_000) + 1;
  const samples = Array.from({length: count}, (_, i) => {
    const instant = new Date(window.start.getTime() + (window.end.getTime() - window.start.getTime()) * i / (count - 1));
    const moon = positionAt(Body.Moon, instant, location);
    return {time: instant, sunAltitude: positionAt(Body.Sun, instant, location).altitude,
      moonAltitude: moon.altitude, moonAzimuth: moon.azimuth, moonIllumination: Illumination(Body.Moon, instant).phase_fraction};
  });
  return {window, samples};
}

export function maxSunAltitude(object: SpaceObject) {
  if (object.kind === 'Moon' || (object.kind === 'Planet' && !['uranus', 'neptune'].includes(object.id))) return -1;
  return object.kind === 'Star' ? -6 : -12;
}

export function nightVisibility(object: SpaceObject, time: Date, location: ObservingLocation, context = nightContext(time, location), positioners?: ReturnType<typeof objectPositioner>[]): VisibilitySeries {
  const count = context.samples.length;
  const samples = context.samples.map((environment, index) => {
    const actual = (positioners?.[index] ?? objectPositioner(environment.time, location))(object);
    const demo = object.demoAltitudes;
    const fractional = index * ((demo?.length ?? 1) - 1) / (count - 1);
    const lower = Math.floor(fractional);
    const illustrative = demo ? demo[lower] + (demo[Math.min(lower + 1, demo.length - 1)] - demo[lower]) * (fractional - lower) : NaN;
    const sunSeparation = object.position?.kind === 'solar' && object.kind === 'Planet'
      ? AngleFromSun(Body[object.position.body], environment.time) : undefined;
    return {...environment, altitude: actual?.altitude ?? illustrative, azimuth: actual?.azimuth ?? NaN, sunSeparation};
  });
  return {samples, real: Boolean(object.position), timeZone: location.timeZone, maxSunAltitude: maxSunAltitude(object)};
}

export function nightCatalog(catalog: SpaceObject[], time: Date, location: ObservingLocation, context = nightContext(time, location)) {
  const positioners = context.samples.map(sample => objectPositioner(sample.time, location));
  return new Map(catalog.map(object => [object.id, nightVisibility(object, time, location, context, positioners)]));
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
