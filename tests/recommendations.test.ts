import {describe, expect, it} from 'vitest';
import {Body} from 'astronomy-engine';
import {objects} from '../src/data';
import {maxSunAltitude, nightContext, nightVisibility, nightWindow, positionAt, stockholm, type NightSample, type VisibilitySeries} from '../src/astronomy';
import {rankTonight, recommend, supportsGear} from '../src/recommendations';

const get = (id: string) => objects.find(object => object.id === id)!;
const instant = new Date('2026-10-29T20:00:00Z');
const sample = (changes: Partial<NightSample> = {}): NightSample => ({time: instant, altitude: 50, azimuth: 90, sunAltitude: -20, moonAltitude: -20, moonAzimuth: 90, moonIllumination: 1, ...changes});
const series = (id: string, samples: NightSample[]): VisibilitySeries => ({samples, real: true, timeZone: 'UTC', maxSunAltitude: maxSunAltitude(get(id))});

describe('actual observing night', () => {
  it('brackets winter sunset and sunrise instead of truncating at 18 and 06', () => {
    const window = nightWindow(instant, stockholm);
    expect(window.kind).toBe('normal');
    expect(window.start.getUTCHours()).toBeLessThan(17);
    expect(window.end.getUTCHours()).toBeGreaterThan(5);
    expect(positionAt(Body.Sun, window.sunset!, stockholm).altitude).toBeGreaterThan(-1);
    expect(positionAt(Body.Sun, window.sunset!, stockholm).altitude).toBeLessThan(-.5);
    expect(positionAt(Body.Sun, window.sunrise!, stockholm).altitude).toBeGreaterThan(-1);
  });
  it('keeps the current night before dawn and advances to the next evening after dawn', () => {
    const evening = nightWindow(instant, stockholm);
    const early = nightWindow(new Date('2026-10-30T01:00:00Z'), stockholm);
    const morning = nightWindow(new Date('2026-10-30T10:00:00Z'), stockholm);
    expect(early.start.getTime()).toBe(evening.start.getTime());
    expect(morning.start.getTime()).toBeGreaterThan(evening.end.getTime());
  });
  it('handles polar day/night and summer nights without astronomical darkness', () => {
    const tromso = {name: 'Tromsø', latitude: 69.6492, longitude: 18.9553, timeZone: 'Europe/Oslo'};
    expect(nightWindow(new Date('2026-06-21T18:00:00Z'), tromso).kind).toBe('polarDay');
    expect(nightWindow(new Date('2026-12-21T18:00:00Z'), tromso).kind).toBe('polarNight');
    const summer = nightContext(new Date('2026-06-21T18:00:00Z'), stockholm);
    expect(summer.window.kind).toBe('normal');
    expect(summer.samples.every(sample => sample.sunAltitude > -18)).toBe(true);
  });
  it('retains Mercury civil-twilight slots that the old night window missed', () => {
    const time = new Date('2026-02-05T14:00:00Z');
    const curve = nightVisibility(get('mercury'), time, stockholm);
    expect(curve.samples.some(sample => sample.altitude > 0 && sample.sunAltitude < -1 && sample.sunAltitude > -6)).toBe(true);
    expect(curve.samples[0].time.getUTCHours()).toBeLessThan(17);
  });
});

describe('explainable recommendations', () => {
  it('prefers a lower deep-sky slot with the Moon down over a higher moonlit slot', () => {
    const dark = sample({altitude: 45});
    const moonlit = sample({altitude: 60, moonAltitude: 60, moonAzimuth: 90, time: new Date(instant.getTime() + 600000)});
    const recommendation = recommend(get('m31'), series('m31', [dark, moonlit]));
    expect(recommendation.best!.sample).toBe(dark);
    expect(recommendation.end).toBe(dark.time);
    const withMoonDown = recommend(get('m31'), series('m31', [dark, {...moonlit, moonAltitude: -10}]));
    expect(withMoonDown.best!.sample.altitude).toBe(60);
  });
  it('allows bright planets in civil twilight, excludes close-Sun alignments and low targets', () => {
    const twilight = sample({altitude: 20, sunAltitude: -3, sunSeparation: 25});
    expect(recommend(get('venus'), series('venus', [twilight])).best).not.toBeNull();
    expect(recommend(get('m31'), series('m31', [twilight])).reason).toBe('bright');
    expect(recommend(get('venus'), series('venus', [{...twilight, sunSeparation: 5}])).reason).toBe('nearSun');
    expect(recommend(get('venus'), series('venus', [{...twilight, altitude: 5}])).reason).toBe('low');
  });
  it('filters equipment, excludes demo constellations and never suggests past slots', () => {
    expect(supportsGear(get('neptune'), 'eye')).toBe(false);
    expect(supportsGear(get('uranus'), 'binoculars')).toBe(true);
    const targets = [get('m31'), get('neptune'), get('orion')];
    const curves = new Map(targets.map(object => [object.id, series(object.id, [sample()])]));
    expect(rankTonight(targets, curves, 'eye').map(item => item.object.id)).toEqual(['m31']);
    const future = sample({altitude: 30, time: new Date(instant.getTime() + 600000)});
    expect(recommend(get('m31'), series('m31', [sample({altitude: 80}), future]), future.time).best!.sample).toBe(future);
  });
  it('does not join two favorable intervals across a below-horizon gap', () => {
    const times = [0, 1, 2].map(i => new Date(instant.getTime() + i * 600000));
    const curve = series('m31', [sample({time: times[0], altitude: 60}), sample({time: times[1], altitude: -10}), sample({time: times[2], altitude: 50})]);
    const result = recommend(get('m31'), curve);
    expect(result.start).toBe(times[0]);
    expect(result.end).toBe(times[0]);
  });
});
