import {twoline2satrec, type SatRec} from 'satellite.js';
import type {ObservingLocation, SkyPosition} from './astronomy';
import type {SpaceObject} from './data';
import {satrecState, sunUnit} from './iss';
import {tleEpochMs} from './issRefresh';

/**
 * F-055: moving satellites. CelesTrak's "visual" group (about 150 of the brightest satellites and
 * rocket bodies) as SGP4 elements: bundled at build time, refreshed by the app at most once a day
 * (CORS allowed; nothing about the place is sent). Drawn as small dots while they are sunlit and the
 * sky is dark (Sun below −6°). The ISS keeps its own marker and pass list.
 */
export const CELESTRAK_VISUAL_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=TLE';
export type SatelliteElements = {name: string; norad: number; line1: string; line2: string};
export type SatelliteSet = {fetchedAt: string; source: string; sourceUrl: string; satellites: SatelliteElements[]};
export type SatelliteSky = SkyPosition & {norad: number; name: string; sunlit: boolean};

const ISS = 25544, STORED = 'noxari-visual-tle', SUCCESS = 'noxari-visual-fetch-at', FAILURE = 'noxari-visual-fail-at';
const DAY = 86_400_000, HOUR = 3_600_000;

let records: {norad: number; name: string; satrec: SatRec}[] = [];
let current: SatelliteSet | null = null;

export function parseSatelliteTle(text: string): SatelliteElements[] {
  const lines = text.split(/\r?\n/).map(line => line.trimEnd()).filter(line => line.trim());
  const satellites: SatelliteElements[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line1 = lines[i].trim(), line2 = lines[i + 1]?.trim();
    if (!line1.startsWith('1 ') || !line2?.startsWith('2 ')) continue;
    const norad = Number(line1.slice(2, 7));
    const name = (i > 0 && !lines[i - 1].trim().startsWith('2 ') ? lines[i - 1].trim() : `NORAD ${norad}`).replace(/\s+/g, ' ');
    i++;
    if (!Number.isFinite(norad) || norad === ISS) continue;
    try { if (twoline2satrec(line1, line2).error !== 0) continue; } catch { continue; }
    satellites.push({name, norad, line1, line2});
  }
  return satellites;
}

const validSet = (value: unknown): value is SatelliteSet => {
  const set = value as SatelliteSet | null;
  return Boolean(set && Array.isArray(set.satellites) && set.satellites.length > 10 && set.satellites.every(item => typeof item?.line1 === 'string' && typeof item.line2 === 'string'));
};
/** Median TLE epoch of a set, to compare stored, bundled and fetched copies. */
export const setEpoch = (set: SatelliteSet) => {
  const epochs = set.satellites.map(item => tleEpochMs(item.line1)).filter(Number.isFinite).sort((a, b) => a - b);
  return epochs.length ? epochs[Math.floor(epochs.length / 2)] : 0;
};

export function setSatellites(set: SatelliteSet | null) {
  current = set;
  records = (set?.satellites ?? []).flatMap(item => {
    try { const satrec = twoline2satrec(item.line1, item.line2); return satrec.error === 0 ? [{norad: item.norad, name: item.name, satrec}] : []; }
    catch { return []; }
  });
}
export const satelliteSet = () => current;
export const satelliteCount = () => records.length;

/** Every satellite above the horizon at `time`, with sunlight. About 150 SGP4 propagations. */
export function satelliteSky(time: Date, location: ObservingLocation): SatelliteSky[] {
  if (!records.length) return [];
  const sun = sunUnit(time), result: SatelliteSky[] = [];
  for (const record of records) {
    const state = satrecState(record.satrec, time, location, sun);
    if (state && state.altitude > 0) result.push({...state, norad: record.norad, name: record.name});
  }
  return result;
}

export function satelliteState(norad: number, time: Date, location: ObservingLocation) {
  const record = records.find(item => item.norad === norad);
  return record ? satrecState(record.satrec, time, location) : null;
}

const title = (name: string) => name.replace(/\s+/g, ' ').trim();
export function satelliteObject(norad: number, name: string): SpaceObject {
  const rocket = /R\/B|ROCKET/i.test(name);
  return {
    id: `sat-${norad}`, en: title(name), sv: title(name), kind: 'Satellite', constellation: 'Varies',
    distance: 'Low Earth orbit', distanceSv: 'Låg omloppsbana runt jorden', magnitude: 'Varies; visible only when sunlit', magnitudeSv: 'Varierar; syns bara när den är solbelyst', gear: 'eye',
    description: `${rocket ? 'A spent rocket stage' : 'A satellite'} from CelesTrak’s list of bright satellites (NORAD ${norad}). It can sometimes be seen as a slowly moving point when it is sunlit while your sky is dark; brightness varies a lot. Position from orbital elements (SGP4); accuracy drops after a few days.`,
    descriptionSv: `${rocket ? 'Ett utbränt raketsteg' : 'En satellit'} från CelesTraks lista över ljusa satelliter (NORAD ${norad}). Den kan ibland ses som en långsamt rörlig punkt när den är solbelyst och din himmel är mörk; ljusstyrkan varierar mycket. Position från banelement (SGP4); noggrannheten sjunker efter några dagar.`,
    position: {kind: 'satellite', norad}, color: '#d6dee8', size: 2, aliases: [`NORAD ${norad}`],
    references: [{label: 'CelesTrak GP data (visual group)', url: 'https://celestrak.org/NORAD/elements/'}],
  };
}
export const isSatellitePick = (object: Pick<SpaceObject, 'id'>) => object.id.startsWith('sat-');

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
/** Bundled/stored set immediately, then a fresher CelesTrak download at most once a day. */
export async function startSatellites(base: string, onSet: (set: SatelliteSet) => void, fetcher: typeof fetch = fetch, storage: Storage = localStorage, now = () => Date.now()) {
  let stored: SatelliteSet | null = null;
  try { stored = JSON.parse(storage.getItem(STORED) || 'null'); } catch { stored = null; }
  const bundled = await fetcher(`${base}data/visual-tle.json`).then(response => response.ok ? response.json() : null).catch(() => null);
  let best = [stored, bundled].filter(validSet).sort((a, b) => setEpoch(b) - setEpoch(a))[0] ?? null;
  if (best) onSet(best);
  const time = now();
  if (best && time - setEpoch(best) < DAY) return best;
  if (time - Number(storage.getItem(SUCCESS) || 0) < DAY || time - Number(storage.getItem(FAILURE) || 0) < HOUR) return best;
  try {
    const response = await fetcher(CELESTRAK_VISUAL_URL);
    if (!response.ok) throw new Error(String(response.status));
    const satellites = parseSatelliteTle(await response.text());
    const fetched: SatelliteSet = {fetchedAt: new Date(time).toISOString(), source: 'CelesTrak GP data (visual)', sourceUrl: CELESTRAK_VISUAL_URL, satellites};
    if (!validSet(fetched)) throw new Error('format');
    storage.setItem(SUCCESS, String(time));
    if (!best || setEpoch(fetched) > setEpoch(best)) {
      try { storage.setItem(STORED, JSON.stringify(fetched)); } catch { /* storage full: keep in memory */ }
      best = fetched;
      onSet(fetched);
    }
  } catch {
    storage.setItem(FAILURE, String(time));
  }
  return best;
}
