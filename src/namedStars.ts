import type {SpaceObject} from './data';
import {constellationFigures} from './generated/constellations';
import {starNames} from './generated/starNames';

/** F-026: bright named stars (HYG v4.1 / IAU WGSN names) as selectable sky objects. */
const constellationName = new Map(constellationFigures.map(figure => [figure.id, figure.name]));
const swedishNames: Record<string, string> = {Polaris: 'Polstjärnan'};

const spectralColor = (spect: string) => ({O: '#bcd4ff', B: '#cfe0ff', A: '#f2f5ff', F: '#fff6e6', G: '#ffeec2', K: '#ffd7a3', M: '#ffbc94'} as Record<string, string>)[spect.trim()[0]] ?? '#f2f5ff';
const formatMagnitude = (value: number, sv: boolean) => (sv ? value.toFixed(2).replace('.', ',').replace('-', '−') : value.toFixed(2).replace('-', '−'));
const formatDistance = (ly: number | null, sv: boolean) => ly === null ? (sv ? 'Okänt' : 'Unknown') : `${ly.toLocaleString(sv ? 'sv-SE' : 'en-GB')} ${sv ? 'ljusår' : 'light-years'}`;

export const namedStarObjects: SpaceObject[] = starNames.filter(star => star.name !== 'Sirius').map(star => {
  const con = constellationName.get(star.con) ?? star.con;
  const type = star.spect ? ` Spectral type ${star.spect}.` : '';
  const typeSv = star.spect ? ` Spektraltyp ${star.spect}.` : '';
  return {
    id: `star-${star.hip}`,
    en: star.name,
    sv: swedishNames[star.name] ?? star.name,
    kind: 'Star',
    constellation: con,
    distance: formatDistance(star.ly, false),
    distanceSv: formatDistance(star.ly, true),
    magnitude: formatMagnitude(star.mag, false),
    magnitudeSv: formatMagnitude(star.mag, true),
    magnitudeBand: 'V',
    gear: 'eye',
    description: `One of the brightest named stars, in ${con}.${type} Position from the HYG catalog; the name follows the IAU list.`,
    descriptionSv: `En av de ljusaste namngivna stjärnorna, i stjärnbilden ${con}.${typeSv} Position från HYG-katalogen; namnet följer IAU:s lista.`,
    position: {kind: 'fixed', raHours: star.ra, decDegrees: star.dec, distanceLy: star.ly ?? undefined},
    color: spectralColor(star.spect),
    size: 2,
    aliases: [`HIP ${star.hip}`],
    references: [{label: 'HYG Database v4.1 (CC BY-SA 4.0)', url: 'https://github.com/astronexus/HYG-Database'}],
  } satisfies SpaceObject;
});

export const isNamedStar = (object: Pick<SpaceObject, 'id'>) => object.id.startsWith('star-');
