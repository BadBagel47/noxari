import type {SpaceObject} from './data';
import {brightStars} from './generated/brightStars';
import {starColorIndex} from './generated/starColors';
import {constellationFigures} from './generated/constellations';
import {namedStarObjects} from './namedStars';
import {objects} from './data';
import {starFill} from './starColor';
import type {StarDetail} from './generated/starDetails';

/**
 * F-050: every catalogue star can be tapped. Stars are drawn as graphics, so a tap
 * on empty sky is resolved here against markers and stars with a priority: known
 * objects (Moon, planets, named stars, Messier, ISS) win over a slightly closer
 * faint star, and the touch radius shrinks as the user zooms in.
 */
export type PickCandidate = {x: number; y: number; weight: number; key: string};

export function objectWeight(object: Pick<SpaceObject, 'kind' | 'id'>) {
  if (object.kind === 'Moon' || object.kind === 'Planet') return 4;
  if (object.kind === 'Star' || object.kind === 'Satellite') return 3.5;
  return 3;
}
export const starWeight = (magnitude: number) => 1 + Math.max(0, Math.min(1.5, (4.5 - magnitude) / 2));
/** Base reach in CSS px: a fingertip is wide, a mouse pointer precise; both narrow with zoom. */
export const pickRadius = (pointerType: string, zoom: number) => (pointerType === 'mouse' ? 10 : 20) / Math.sqrt(Math.max(1, zoom));
/** Faint stars crowd the sky at 1×; only clearly visible stars are tappable until the user zooms in. */
export const tappableMagnitude = (zoom: number) => Math.min(6.5, 4.8 + 1.7 * (Math.max(1, zoom) - 1));
/** F-061: Gaia stars can be tapped once the view is zoomed in (2.4× and more), up to the drawn limit. */
export const tappableGaiaMagnitude = (zoom: number, limit: number) => zoom < 2.4 ? 0 : Math.min(limit, zoom <= 3 ? 9 + 2 * (zoom - 2.4) / .6 : 11 + Math.log2(zoom / 3));

/** Lowest distance-per-weight within each candidate's weighted reach (heavier candidates reach further). */
export function pickBest<T extends PickCandidate>(candidates: T[], x: number, y: number, radius: number): T | null {
  let best: T | null = null, bestScore = Infinity;
  for (const candidate of candidates) {
    const distance = Math.hypot(candidate.x - x, candidate.y - y);
    if (distance > radius * Math.sqrt(candidate.weight)) continue;
    const score = (distance + 2) / candidate.weight;
    if (score < bestScore) { best = candidate; bestScore = score; }
  }
  return best;
}

const latin = new Map(constellationFigures.map(figure => [figure.id, figure.name]));
const named = new Map([...namedStarObjects, ...objects.filter(object => object.id === 'sirius')].map(object => [object.aliases?.find(alias => alias.startsWith('HIP '))?.slice(4) ?? (object.id === 'sirius' ? '32349' : ''), object]));
let details: Promise<StarDetail[]> | null = null;
const loadDetails = () => details ??= import('./generated/starDetails').then(module => module.starDetails);

const colourWords = (ci: number | null, sv: boolean) => ci === null ? '' : ci < 0 ? (sv ? 'blåvit' : 'blue-white') : ci < .3 ? (sv ? 'vit' : 'white') : ci < .6 ? (sv ? 'gulvit' : 'yellow-white') : ci < .9 ? (sv ? 'gul' : 'yellow') : ci < 1.4 ? (sv ? 'orange' : 'orange') : (sv ? 'rödorange' : 'red-orange');

/** The selectable object for brightStars[index]: an existing named-star object when there is one. */
export async function starObject(index: number): Promise<SpaceObject> {
  const [ra, dec, magnitude, , , , hip] = brightStars[index];
  const existing = hip !== null ? named.get(String(hip)) : undefined;
  if (existing) return existing;
  const [designation, hd, ly, spectral, con] = (await loadDetails())[index];
  const ci = starColorIndex[index] === null ? null : starColorIndex[index]! / 100;
  const name = designation ?? (hd ? `HD ${hd}` : hip ? `HIP ${hip}` : `HYG ${index}`);
  const constellation = (con && latin.get(con)) ?? con ?? '';
  const mag = magnitude.toFixed(2).replace('-', '−');
  const colourEn = colourWords(ci, false), colourSv = colourWords(ci, true);
  return {
    id: hip ? `hip-${hip}` : `hyg-${index}`, en: name, sv: name, kind: 'Star', constellation,
    distance: ly ? `${ly.toLocaleString('en-GB')} light-years` : 'Unknown', distanceSv: ly ? `${ly.toLocaleString('sv-SE')} ljusår` : 'Okänt',
    magnitude: mag, magnitudeSv: mag.replace('.', ','), magnitudeBand: 'V', gear: magnitude <= 6 ? 'eye' : 'binoculars',
    description: `A ${colourEn ? colourEn + ' ' : ''}star of magnitude ${mag}${constellation ? ` in ${constellation}` : ''}.${spectral ? ` Spectral type ${spectral}.` : ''} Data from the HYG catalog.`,
    descriptionSv: `En ${colourSv ? colourSv + ' ' : ''}stjärna med magnitud ${mag.replace('.', ',')}${constellation ? ` i stjärnbilden ${constellation}` : ''}.${spectral ? ` Spektraltyp ${spectral}.` : ''} Uppgifter från HYG-katalogen.`,
    position: {kind: 'fixed', raHours: ra, decDegrees: dec, distanceLy: ly ?? undefined},
    color: starFill(ci), size: 2,
    aliases: [hip ? `HIP ${hip}` : '', hd ? `HD ${hd}` : ''].filter(Boolean),
    references: [{label: 'HYG Database v4.1 (CC BY-SA 4.0)', url: 'https://github.com/astronexus/HYG-Database'}],
  };
}

export const isCatalogStarPick = (object: Pick<SpaceObject, 'id'>) => /^(hip|hyg|gaia)-/.test(object.id);
