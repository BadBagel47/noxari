import type {Gear, SpaceObject} from './data';
import type {NightSample, VisibilitySeries} from './astronomy';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const RAD = Math.PI / 180;
export const isDiffuse = (object: SpaceObject) => ['Galaxy', 'Nebula', 'Star cluster', 'Star cloud'].includes(object.kind);
export function supportsGear(object: SpaceObject, gear: 'all' | Gear) {
  return gear === 'all' || gear === 'telescope' || object.gear === 'eye' || (gear === 'binoculars' && object.gear === 'binoculars');
}

export function moonSeparation(sample: NightSample) {
  const a = sample.altitude * RAD, b = sample.moonAltitude * RAD;
  return Math.acos(Math.max(-1, Math.min(1, Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos((sample.azimuth - sample.moonAzimuth) * RAD)))) / RAD;
}

// An explicit planning heuristic, not a measured visibility probability.
// No weather, extinction model, light-pollution map or instrument aperture data.
export function sampleQuality(object: SpaceObject, sample: NightSample, maxSunAltitude: number) {
  const minimumAltitude = isDiffuse(object) ? 15 : 10;
  if (sample.altitude < minimumAltitude || sample.sunAltitude >= maxSunAltitude) return null;
  if (object.kind === 'Planet' && (sample.sunSeparation === undefined || sample.sunSeparation < 15)) return null;
  const height = Math.sin(sample.altitude * RAD);
  const darkness = clamp((-sample.sunAltitude - 6) / 12);
  const moonPenalty = isDiffuse(object)
    ? sample.moonIllumination * Math.max(0, Math.sin(sample.moonAltitude * RAD)) * (.25 + .75 * (1 - moonSeparation(sample) / 180))
    : 0;
  return {score: isDiffuse(object) ? .65 * height + .35 * darkness - .4 * moonPenalty : .8 * height + .2,
    moonPenalty, darkness};
}

export function recommend(object: SpaceObject, series: VisibilitySeries, notBefore?: Date) {
  if (!series.real) return {object, best: null, reason: 'demo' as const};
  const candidates = series.samples.flatMap((sample, index) => {
    if (notBefore && sample.time < notBefore) return [];
    const quality = sampleQuality(object, sample, series.maxSunAltitude);
    return quality ? [{...quality, sample, index}] : [];
  });
  if (!candidates.length) {
    const dark = series.samples.filter(sample => (!notBefore || sample.time >= notBefore) && sample.sunAltitude < series.maxSunAltitude);
    const minimum = isDiffuse(object) ? 15 : 10;
    const high = dark.filter(sample => sample.altitude >= minimum);
    const reason = !dark.length ? 'bright' : !high.length ? 'low' : 'nearSun';
    return {object, best: null, reason: reason as 'bright' | 'low' | 'nearSun'};
  }
  const best = candidates.reduce((best, candidate) => candidate.score > best.score ? candidate : best);
  // Return a contiguous range around the best slot; never join separate windows
  // across a daylight, below-horizon or lunar-condition gap.
  const byIndex = new Map(candidates.map(candidate => [candidate.index, candidate]));
  let left = best.index, right = best.index;
  while (byIndex.has(left - 1) && byIndex.get(left - 1)!.score >= best.score - .08) left--;
  while (byIndex.has(right + 1) && byIndex.get(right + 1)!.score >= best.score - .08) right++;
  return {object, best, start: series.samples[left].time, end: series.samples[right].time, reason: null};
}

export function rankTonight(objects: SpaceObject[], series: Map<string, VisibilitySeries>, gear: 'all' | Gear, notBefore?: Date) {
  return objects.filter(object => object.position && supportsGear(object, gear))
    .map(object => recommend(object, series.get(object.id)!, notBefore))
    .sort((a, b) => (b.best?.score ?? -Infinity) - (a.best?.score ?? -Infinity) || a.object.id.localeCompare(b.object.id));
}
