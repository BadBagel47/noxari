import type {SpaceObject} from './data';

/**
 * F-043: what the sky shows. The level uses each object's curated equipment
 * class (the same one Tonight filters by), not a promise that it is visible.
 * The whole solar system and named stars are always shown (user decision).
 */
export type SkyLevel = 'eye' | 'binoculars' | 'all';
export type SkyGroup = 'galaxies' | 'clusters' | 'nebulae' | 'candidates';
export type SkyGroups = Record<SkyGroup, boolean>;
export const defaultSkyGroups: SkyGroups = {galaxies: true, clusters: true, nebulae: true, candidates: true};

const alwaysShown = new Set<SpaceObject['kind']>(['Planet', 'Moon', 'Dwarf planet', 'Asteroid', 'Satellite', 'Star', 'Constellation']);

export function skyGroup(object: Pick<SpaceObject, 'kind'>): SkyGroup | null {
  switch (object.kind) {
    case 'Galaxy': return 'galaxies';
    case 'Nebula': return 'nebulae';
    case 'Star cluster': case 'Star cloud': case 'Asterism': case 'Double star': return 'clusters';
    case 'Dwarf planet candidate': return 'candidates';
    default: return null;
  }
}

export function shownAtSkyLevel(object: Pick<SpaceObject, 'kind' | 'gear'>, level: SkyLevel, groups: SkyGroups = defaultSkyGroups) {
  if (alwaysShown.has(object.kind)) return true;
  const group = skyGroup(object);
  if (group && !groups[group]) return false;
  // Provisional candidates stay separate and labeled; they only appear with the whole catalog.
  if (group === 'candidates') return level === 'all';
  if (level === 'all') return true;
  if (level === 'binoculars') return object.gear !== 'telescope';
  return object.gear === 'eye';
}

/** Extra-star magnitude limit grows with zoom, as in planetarium programs (binocular level only). */
export const BINOCULAR_STAR_LIMIT = 8.5;
export function starMagnitudeLimit(level: SkyLevel, zoom: number) {
  if (level === 'eye') return 6.5;
  return Math.min(BINOCULAR_STAR_LIMIT, 7 + 1.5 * Math.log2(Math.max(1, zoom)));
}

/** Base opacity for stars fainter than the bright catalog (V > 6.5): dimmer with magnitude. */
export function faintStarBrightness(magnitude: number) {
  return .3 * Math.max(.4, 1 - (magnitude - 6.5) * .3);
}
/** Fade stars in as the zoom-dependent limit passes them, so they do not pop in. */
export function faintStarFade(magnitude: number, limit: number) {
  return magnitude > limit ? 0 : Math.max(0, Math.min(1, (limit - magnitude) / .4 + .25));
}
