import {describe, expect, it, vi} from 'vitest';
import {CELESTRAK_ISS_URL, newest, parseCelestrakTle, shouldRefresh, startIssElements, tleEpochMs} from '../src/issRefresh';

const old = {name: 'ISS (ZARYA)', line1: '1 25544U 98067A   26315.85209533  .00008096  00000+0  15318-3 0  9995', line2: '2 25544  51.6324 289.3631 0007313  15.2449 344.8800 15.49529126538554', fetchedAt: '', source: '', sourceUrl: ''};
const freshText = `ISS (ZARYA)\n1 25544U 98067A   26318.50000000  .00008096  00000+0  15318-3 0  9990\n2 25544  51.6324 289.3631 0007313  15.2449 344.8800 15.49529126538554\n`;
const memory = () => { const data = new Map<string, string>(); return {getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value), data}; };
const reply = (body: unknown, ok = true) => Promise.resolve({ok, json: () => Promise.resolve(body), text: () => Promise.resolve(String(body))} as Response);

describe('F-042 ISS element refresh', () => {
  it('parses the TLE epoch and CelesTrak text, rejecting other satellites', () => {
    expect(new Date(tleEpochMs(old.line1)).toISOString().slice(0, 10)).toBe('2026-11-11');
    expect(parseCelestrakTle(freshText)?.line1).toContain('26318.5');
    expect(parseCelestrakTle(freshText.replace(/25544/g, '99999'))).toBeNull();
    expect(parseCelestrakTle('No GP data found')).toBeNull();
    expect(newest(old, parseCelestrakTle(freshText))?.line1).toContain('26318.5');
  });

  it('refreshes at most once a day, backs off an hour after failures, and skips fresh elements', () => {
    const storage = memory(), epoch = tleEpochMs(old.line1);
    expect(shouldRefresh(old, epoch + 3_600_000, storage)).toBe(false);
    expect(shouldRefresh(old, epoch + 2 * 86_400_000, storage)).toBe(true);
    storage.setItem('noxari-iss-fail-at', String(epoch + 2 * 86_400_000 - 600_000));
    expect(shouldRefresh(old, epoch + 2 * 86_400_000, storage)).toBe(false);
    storage.setItem('noxari-iss-fetch-at', String(epoch + 2 * 86_400_000 - 3_600_000));
    expect(shouldRefresh(old, epoch + 2 * 86_400_000 + 7_200_000, storage)).toBe(false);
  });

  it('reports bundled elements first, then fresher CelesTrak elements, and stores them; sends no location', async () => {
    const storage = memory(), seen: string[] = [];
    const fetcher = vi.fn((url: string) => url.endsWith('data/iss-tle.json') ? reply(old) : reply(freshText)) as unknown as typeof fetch;
    await startIssElements('/base/', elements => seen.push(elements.line1.slice(18, 32)), fetcher, storage, () => tleEpochMs(old.line1) + 3 * 86_400_000);
    expect(seen).toEqual(['26315.85209533', '26318.50000000']);
    expect((fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls.map(call => call[0])).toEqual(['/base/data/iss-tle.json', CELESTRAK_ISS_URL]);
    expect(JSON.parse(storage.data.get('noxari-iss-tle')!).line1).toContain('26318.5');
    // Next start uses the stored copy and does not fetch again the same day.
    const again = vi.fn((url: string) => url.endsWith('data/iss-tle.json') ? reply(old) : reply(freshText)) as unknown as typeof fetch;
    const best = await startIssElements('/base/', () => {}, again, storage, () => tleEpochMs(old.line1) + 3 * 86_400_000 + 60_000);
    expect(best?.line1).toContain('26318.5');
    expect((again as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('keeps the bundled copy when the download fails', async () => {
    const storage = memory(), seen: string[] = [];
    const fetcher = vi.fn((url: string) => url.endsWith('data/iss-tle.json') ? reply(old) : Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    const best = await startIssElements('/', elements => seen.push(elements.line1), fetcher, storage, () => tleEpochMs(old.line1) + 3 * 86_400_000);
    expect(best?.line1).toBe(old.line1);expect(seen.length).toBe(1);
    expect(storage.data.has('noxari-iss-fail-at')).toBe(true);
  });
});
