import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {stockholm, objectPosition} from '../src/astronomy';
import {parseSatelliteTle, satelliteObject, satelliteSky, setEpoch, setSatellites, startSatellites, type SatelliteSet} from '../src/satellites';

const sample = `ISS (ZARYA)
1 25544U 98067A   26316.50000000  .00010000  00000+0  18000-3 0  9990
2 25544  51.6400 100.0000 0005000  90.0000 270.0000 15.50000000400000
ATLAS CENTAUR 2         
1 00694U 63047A   26316.18356687  .00001705  00000+0  19677-3 0  9996
2 00694  30.3521 251.5272 0544211 103.0515 263.1384 14.12933017166642
THOR AGENA D R/B        
1 00733U 64002A   26316.41813938  .00000154  00000+0  72297-4 0  9990
2 00733  99.1058 343.0911 0031846 256.6250 103.1382 14.34112696273801`;

describe('F-055 satellites', () => {
  it('parses a CelesTrak TLE list, keeps names and NORAD numbers and leaves the ISS to its own layer', () => {
    const list = parseSatelliteTle(sample);
    expect(list.map(item => item.norad)).toEqual([694, 733]);
    expect(list[0].name).toBe('ATLAS CENTAUR 2');
  });

  it('propagates positions and makes tapped satellites selectable objects', () => {
    const satellites = parseSatelliteTle(sample);
    setSatellites({fetchedAt: '', source: 'test', sourceUrl: '', satellites: Array.from({length: 12}, () => satellites).flat()});
    const time = new Date('2026-11-12T17:00:00Z');
    const all = Array.from({length: 96}, (_, i) => satelliteSky(new Date(time.getTime() + i * 900_000), stockholm)).flat();
    expect(all.length).toBeGreaterThan(0);
    expect(all.every(item => item.altitude > 0 && item.azimuth >= 0 && item.azimuth < 360)).toBe(true);
    const object = satelliteObject(733, 'THOR AGENA D R/B');
    expect(object).toMatchObject({id: 'sat-733', kind: 'Satellite', position: {kind: 'satellite', norad: 733}});
    expect(objectPosition(object, time, stockholm)).not.toBeNull();
    setSatellites(null);
  });

  it('uses the bundled set first and refreshes from CelesTrak at most once a day without sending the place', async () => {
    const satellites = parseSatelliteTle(sample);
    const bundled: SatelliteSet = {fetchedAt: '', source: 'bundle', sourceUrl: '', satellites: Array.from({length: 12}, () => satellites).flat()};
    const urls: string[] = [], seen: SatelliteSet[] = [], store = new Map<string, string>();
    const storage = {getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); }};
    const fetcher = ((url: string) => { urls.push(url); return Promise.resolve(url.includes('visual-tle.json') ? {ok: true, json: () => Promise.resolve(bundled)} : {ok: false, status: 503}); }) as unknown as typeof fetch;
    const now = () => setEpoch(bundled) + 3 * 86_400_000;
    await startSatellites('/', set => seen.push(set), fetcher, storage, now);
    expect(seen).toHaveLength(1);
    expect(urls.some(url => url.includes('GROUP=visual'))).toBe(true);
    expect(urls.every(url => !/lat|lon/.test(url))).toBe(true);
    urls.length = 0;
    await startSatellites('/', () => {}, fetcher, storage, now);
    expect(urls.some(url => url.includes('celestrak'))).toBe(false); // failed attempt backs off
  });
});
