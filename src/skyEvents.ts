import {AngleBetween, Body, MakeTime, Equator, GeoVector, Horizon, Observer, Search, SearchLocalSolarEclipse, SearchLunarEclipse, SearchMaxElongation, SearchMoonQuarter, NextMoonQuarter, Seasons, type AstroTime} from 'astronomy-engine';
import type {ObservingLocation} from './astronomy';

/**
 * F-029: upcoming sky events for a place, calculated locally with Astronomy
 * Engine (Moon quarters, eclipses, close approaches, greatest elongations,
 * equinoxes/solstices) plus a fixed list of major annual meteor showers.
 */
export type SkyEventKind = 'moonPhase' | 'lunarEclipse' | 'solarEclipse' | 'conjunction' | 'elongation' | 'season' | 'meteor';
export type SkyEvent = {kind: SkyEventKind; time: Date; title: {en: string; sv: string}; detail: {en: string; sv: string}; visible?: boolean};

const DAY = 86_400_000;
const bodyName: Record<string, {en: string; sv: string}> = {
  Moon: {en: 'Moon', sv: 'Månen'}, Mercury: {en: 'Mercury', sv: 'Merkurius'}, Venus: {en: 'Venus', sv: 'Venus'},
  Mars: {en: 'Mars', sv: 'Mars'}, Jupiter: {en: 'Jupiter', sv: 'Jupiter'}, Saturn: {en: 'Saturn', sv: 'Saturnus'},
};
const fmt = (value: number, sv: boolean, digits = 1) => value.toLocaleString(sv ? 'sv-SE' : 'en-GB', {maximumFractionDigits: digits, minimumFractionDigits: digits});

/** Major annual showers: approximate peak (month, day), typical ZHR, radiant. Source: IMO meteor shower calendar (approximate, varies by year). */
export const meteorShowers: {en: string; sv: string; month: number; day: number; zhr: number; radiant: {en: string; sv: string}}[] = [
  {en: 'Quadrantids', sv: 'Kvadrantiderna', month: 1, day: 3, zhr: 110, radiant: {en: 'Boötes', sv: 'Björnvaktaren'}},
  {en: 'Lyrids', sv: 'Lyriderna', month: 4, day: 22, zhr: 18, radiant: {en: 'Lyra', sv: 'Lyran'}},
  {en: 'Eta Aquariids', sv: 'Eta Akvariderna', month: 5, day: 6, zhr: 50, radiant: {en: 'Aquarius', sv: 'Vattumannen'}},
  {en: 'Perseids', sv: 'Perseiderna', month: 8, day: 12, zhr: 100, radiant: {en: 'Perseus', sv: 'Perseus'}},
  {en: 'Orionids', sv: 'Orioniderna', month: 10, day: 21, zhr: 20, radiant: {en: 'Orion', sv: 'Orion'}},
  {en: 'Leonids', sv: 'Leoniderna', month: 11, day: 17, zhr: 15, radiant: {en: 'Leo', sv: 'Lejonet'}},
  {en: 'Geminids', sv: 'Geminiderna', month: 12, day: 14, zhr: 150, radiant: {en: 'Gemini', sv: 'Tvillingarna'}},
  {en: 'Ursids', sv: 'Ursiderna', month: 12, day: 22, zhr: 10, radiant: {en: 'Ursa Minor', sv: 'Lilla björnen'}},
];

const toDate = (time: AstroTime) => time.date;

function moonPhases(start: Date, end: Date): SkyEvent[] {
  const names = [{en: 'New moon', sv: 'Nymåne'}, {en: 'First quarter', sv: 'Första kvarteret'}, {en: 'Full moon', sv: 'Fullmåne'}, {en: 'Last quarter', sv: 'Sista kvarteret'}];
  const events: SkyEvent[] = [];
  let quarter = SearchMoonQuarter(start);
  while (quarter.time.date <= end) {
    events.push({kind: 'moonPhase', time: toDate(quarter.time), title: names[quarter.quarter], detail: {en: 'Moon phase', sv: 'Månfas'}});
    quarter = NextMoonQuarter(quarter);
  }
  return events;
}

function altitude(body: Body, time: Date, location: ObservingLocation) {
  const observer = new Observer(location.latitude, location.longitude, 0);
  const eq = Equator(body, time, observer, true, true);
  return Horizon(time, observer, eq.ra, eq.dec, 'normal').altitude;
}

function eclipses(start: Date, end: Date, location: ObservingLocation): SkyEvent[] {
  const events: SkyEvent[] = [];
  const lunarKinds = {penumbral: {en: 'Penumbral lunar eclipse', sv: 'Halvskuggeförmörkelse av månen'}, partial: {en: 'Partial lunar eclipse', sv: 'Partiell månförmörkelse'}, total: {en: 'Total lunar eclipse', sv: 'Total månförmörkelse'}} as const;
  let lunar = SearchLunarEclipse(start);
  while (lunar.peak.date <= end) {
    const up = altitude(Body.Moon, lunar.peak.date, location) > 0;
    events.push({kind: 'lunarEclipse', time: lunar.peak.date, title: lunarKinds[lunar.kind as keyof typeof lunarKinds] ?? lunarKinds.partial, visible: up,
      detail: up ? {en: 'Moon above the horizon at maximum here', sv: 'Månen över horisonten vid maximum här'} : {en: 'Moon below the horizon at maximum here', sv: 'Månen under horisonten vid maximum här'}});
    lunar = SearchLunarEclipse(new Date(lunar.peak.date.getTime() + 10 * DAY));
  }
  const observer = new Observer(location.latitude, location.longitude, 0);
  const solarKinds = {partial: {en: 'Partial solar eclipse', sv: 'Partiell solförmörkelse'}, annular: {en: 'Annular solar eclipse', sv: 'Ringformig solförmörkelse'}, total: {en: 'Total solar eclipse', sv: 'Total solförmörkelse'}} as const;
  let solar = SearchLocalSolarEclipse(start, observer);
  while (solar.peak.time.date <= end) {
    const up = solar.peak.altitude > 0;
    if (up) events.push({kind: 'solarEclipse', time: solar.peak.time.date, title: solarKinds[solar.kind as keyof typeof solarKinds] ?? solarKinds.partial, visible: true,
      detail: {en: `About ${Math.round(solar.obscuration * 100)} % of the Sun covered here. Never look at the Sun without proper eye protection.`, sv: `Cirka ${Math.round(solar.obscuration * 100)} % av solen täckt här. Titta aldrig på solen utan rätt ögonskydd.`}});
    solar = SearchLocalSolarEclipse(new Date(solar.peak.time.date.getTime() + 10 * DAY), observer);
  }
  return events;
}

/** Close approaches (geocentric separation) under `limit` degrees between the Moon/bright planets. */
function conjunctions(start: Date, end: Date, limit = 3): SkyEvent[] {
  const bodies = [Body.Moon, Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn];
  const events: SkyEvent[] = [];
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const a = bodies[i], b = bodies[j];
    const separation = (time: Date) => AngleBetween(GeoVector(a, time, true), GeoVector(b, time, true));
    const step = a === Body.Moon ? DAY / 4 : DAY;
    let previous = separation(start), current = separation(new Date(start.getTime() + step));
    for (let t = start.getTime() + 2 * step; t <= end.getTime(); t += step) {
      const next = separation(new Date(t));
      if (current <= previous && current <= next && current < limit) {
        // Refine: the derivative of separation crosses zero in the bracket.
        const found = Search(time => {
          const date = time.date; const h = 30 * 60_000;
          return separation(new Date(date.getTime() + h)) - separation(new Date(date.getTime() - h));
        }, MakeTime(new Date(t - 2 * step)), MakeTime(new Date(t)), {dt_tolerance_seconds: 600});
        const time = found?.date ?? new Date(t - step);
        const angle = separation(time);
        if (angle < limit) events.push({kind: 'conjunction', time, title: {en: `${bodyName[a].en} and ${bodyName[b].en}`, sv: `${bodyName[a].sv} och ${bodyName[b].sv}`},
          detail: {en: `Close together, about ${fmt(angle, false)}° apart`, sv: `Nära varandra, cirka ${fmt(angle, true)}° isär`}});
      }
      previous = current; current = next;
    }
  }
  return events;
}

function elongations(start: Date, end: Date): SkyEvent[] {
  const events: SkyEvent[] = [];
  for (const body of [Body.Mercury, Body.Venus]) {
    let event = SearchMaxElongation(body, start);
    while (event.time.date <= end) {
      const evening = event.visibility === 'evening';
      events.push({kind: 'elongation', time: event.time.date, title: {en: `${bodyName[body].en} at greatest elongation`, sv: `${bodyName[body].sv} längst från solen`},
        detail: {en: `${fmt(event.elongation, false, 0)}° from the Sun, ${evening ? 'evening sky' : 'morning sky'}`, sv: `${fmt(event.elongation, true, 0)}° från solen, ${evening ? 'kvällshimlen' : 'morgonhimlen'}`}});
      event = SearchMaxElongation(body, new Date(event.time.date.getTime() + 20 * DAY));
    }
  }
  return events;
}

function seasons(start: Date, end: Date, southern: boolean): SkyEvent[] {
  const events: SkyEvent[] = [];
  for (let year = start.getUTCFullYear(); year <= end.getUTCFullYear(); year++) {
    const s = Seasons(year);
    const list: [AstroTime, {en: string; sv: string}][] = southern
      ? [[s.mar_equinox, {en: 'Autumn equinox', sv: 'Höstdagjämning'}], [s.jun_solstice, {en: 'Winter solstice', sv: 'Vintersolstånd'}], [s.sep_equinox, {en: 'Spring equinox', sv: 'Vårdagjämning'}], [s.dec_solstice, {en: 'Summer solstice', sv: 'Sommarsolstånd'}]]
      : [[s.mar_equinox, {en: 'Spring equinox', sv: 'Vårdagjämning'}], [s.jun_solstice, {en: 'Summer solstice', sv: 'Sommarsolstånd'}], [s.sep_equinox, {en: 'Autumn equinox', sv: 'Höstdagjämning'}], [s.dec_solstice, {en: 'Winter solstice', sv: 'Vintersolstånd'}]];
    for (const [time, title] of list) if (time.date >= start && time.date <= end) events.push({kind: 'season', time: time.date, title, detail: {en: 'Season', sv: 'Årstid'}});
  }
  return events;
}

function showers(start: Date, end: Date): SkyEvent[] {
  const events: SkyEvent[] = [];
  for (let year = start.getUTCFullYear(); year <= end.getUTCFullYear(); year++) for (const shower of meteorShowers) {
    const time = new Date(Date.UTC(year, shower.month - 1, shower.day, 0));
    if (time >= start && time <= end) events.push({kind: 'meteor', time, title: {en: `${shower.en} peak`, sv: `${shower.sv}, maximum`},
      detail: {en: `Up to about ${shower.zhr} meteors per hour under ideal dark skies; radiant in ${shower.radiant.en}. Date approximate.`, sv: `Upp till cirka ${shower.zhr} meteorer i timmen under idealt mörk himmel; radiant i ${shower.radiant.sv}. Ungefärligt datum.`}});
  }
  return events;
}

/** Events from `start` over `days` days (eclipses: one year), sorted by time. */
export function upcomingEvents(start: Date, location: ObservingLocation, days = 60): SkyEvent[] {
  const end = new Date(start.getTime() + days * DAY);
  const year = new Date(start.getTime() + 365 * DAY);
  return [...moonPhases(start, end), ...eclipses(start, year, location), ...conjunctions(start, end), ...elongations(start, end), ...seasons(start, end, location.latitude < 0), ...showers(start, end)]
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}
