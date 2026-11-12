import {twoline2satrec} from 'satellite.js';
import type {IssElements} from './iss';

/**
 * F-042: keep ISS elements fresh without a redeploy. CelesTrak allows browser
 * requests (CORS), so the app fetches the station's elements itself at most
 * once a day per device (failed attempts back off for an hour). Nothing about
 * the user's place is sent. The newest of stored, bundled and fetched elements wins.
 */
export const CELESTRAK_ISS_URL = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';
const STORED = 'noxari-iss-tle', SUCCESS = 'noxari-iss-fetch-at', FAILURE = 'noxari-iss-fail-at';
const DAY = 86_400_000, HOUR = 3_600_000;

/** TLE epoch (columns 19–32 of line 1: two-digit year + fractional day of year) in ms since 1970. */
export function tleEpochMs(line1: string) {
  const year = Number(line1.slice(18, 20)), day = Number(line1.slice(20, 32));
  if (!Number.isFinite(year) || !Number.isFinite(day)) return NaN;
  return Date.UTC(year < 57 ? 2000 + year : 1900 + year, 0, 1) + (day - 1) * DAY;
}

export function validElements(value: unknown): value is IssElements {
  const candidate = value as IssElements | null;
  if (!candidate || typeof candidate.line1 !== 'string' || typeof candidate.line2 !== 'string') return false;
  if (!candidate.line1.startsWith('1 25544') || !candidate.line2.startsWith('2 25544')) return false;
  try { return twoline2satrec(candidate.line1, candidate.line2).error === 0 && Number.isFinite(tleEpochMs(candidate.line1)); }
  catch { return false; }
}

export function parseCelestrakTle(text: string, now = new Date()): IssElements | null {
  const lines = text.trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const index = lines.findIndex(line => line.startsWith('1 '));
  if (index < 0 || !lines[index + 1]?.startsWith('2 ')) return null;
  const elements = {name: index > 0 ? lines[index - 1] : 'ISS (ZARYA)', line1: lines[index], line2: lines[index + 1], fetchedAt: now.toISOString(), source: 'CelesTrak GP data', sourceUrl: CELESTRAK_ISS_URL};
  return validElements(elements) ? elements : null;
}

export function newest(...candidates: (IssElements | null | undefined)[]) {
  return candidates.filter(validElements).sort((a, b) => tleEpochMs(b.line1) - tleEpochMs(a.line1))[0] ?? null;
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
export function shouldRefresh(best: IssElements | null, now: number, storage: Storage) {
  if (best && now - tleEpochMs(best.line1) < DAY) return false;
  if (now - Number(storage.getItem(SUCCESS) || 0) < DAY) return false;
  return now - Number(storage.getItem(FAILURE) || 0) >= HOUR;
}

/** Report the best available elements immediately, then again if a fresher download arrives. */
export async function startIssElements(base: string, onElements: (elements: IssElements) => void, fetcher: typeof fetch = fetch, storage: Storage = localStorage, now = () => Date.now()) {
  let stored: IssElements | null = null;
  try { stored = JSON.parse(storage.getItem(STORED) || 'null'); } catch { stored = null; }
  const bundled = await fetcher(`${base}data/iss-tle.json`).then(response => response.ok ? response.json() : null).catch(() => null);
  let best = newest(stored, bundled);
  if (best) onElements(best);
  if (!shouldRefresh(best, now(), storage)) return best;
  try {
    const response = await fetcher(CELESTRAK_ISS_URL);
    if (!response.ok) throw new Error(String(response.status));
    const fetched = parseCelestrakTle(await response.text(), new Date(now()));
    if (!fetched) throw new Error('format');
    storage.setItem(SUCCESS, String(now()));
    if (newest(fetched, best) === fetched && fetched.line1 !== best?.line1) {
      storage.setItem(STORED, JSON.stringify(fetched));
      best = fetched;
      onElements(fetched);
    }
  } catch {
    storage.setItem(FAILURE, String(now()));
  }
  return best;
}
