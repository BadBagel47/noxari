import type {SpaceObject} from './data';
import {brightStars} from './generated/brightStars';
import {constellationFigures} from './generated/constellations';
import {starNames} from './generated/starNames';

/**
 * F-036: the 88 constellations as searchable info objects. Facts are derived
 * from the app's own data: centre of the figure stars, brightest figure star,
 * hemisphere and an approximate best evening month. Swedish names are the
 * customary Swedish forms. Not drawn as sky markers (the figures already are).
 */
const swedish: Record<string, string> = {
  And: 'Andromeda', Ant: 'Luftpumpen', Aps: 'Paradisfågeln', Aqr: 'Vattumannen', Aql: 'Örnen', Ara: 'Altaret', Ari: 'Väduren', Aur: 'Kusken',
  Boo: 'Björnvaktaren', Cae: 'Gravstickeln', Cam: 'Giraffen', Cnc: 'Kräftan', CVn: 'Jakthundarna', CMa: 'Stora hunden', CMi: 'Lilla hunden',
  Cap: 'Stenbocken', Car: 'Kölen', Cas: 'Cassiopeja', Cen: 'Kentauren', Cep: 'Kefeus', Cet: 'Valfisken', Cha: 'Kameleonten', Cir: 'Cirkelpassaren',
  Col: 'Duvan', Com: 'Berenikes hår', CrA: 'Södra kronan', CrB: 'Norra kronan', Crv: 'Korpen', Crt: 'Bägaren', Cru: 'Södra korset', Cyg: 'Svanen',
  Del: 'Delfinen', Dor: 'Svärdfisken', Dra: 'Draken', Equ: 'Lilla hästen', Eri: 'Floden Eridanus', For: 'Ugnen', Gem: 'Tvillingarna', Gru: 'Tranan',
  Her: 'Herkules', Hor: 'Pendeluret', Hya: 'Vattenormen', Hyi: 'Lilla vattenormen', Ind: 'Indianen', Lac: 'Ödlan', Leo: 'Lejonet', LMi: 'Lilla lejonet',
  Lep: 'Haren', Lib: 'Vågen', Lup: 'Vargen', Lyn: 'Lodjuret', Lyr: 'Lyran', Men: 'Taffelberget', Mic: 'Mikroskopet', Mon: 'Enhörningen', Mus: 'Flugan',
  Nor: 'Vinkelhaken', Oct: 'Oktanten', Oph: 'Ormbäraren', Ori: 'Orion', Pav: 'Påfågeln', Peg: 'Pegasus', Per: 'Perseus', Phe: 'Fenix', Pic: 'Målarstaffliet',
  Psc: 'Fiskarna', PsA: 'Södra fisken', Pup: 'Akterskeppet', Pyx: 'Kompassen', Ret: 'Rombiska nätet', Sge: 'Pilen', Sgr: 'Skytten', Sco: 'Skorpionen',
  Scl: 'Bildhuggaren', Sct: 'Skölden', Ser: 'Ormen', Sex: 'Sextanten', Tau: 'Oxen', Tel: 'Kikaren', Tri: 'Triangeln', TrA: 'Södra triangeln',
  Tuc: 'Tukanen', UMa: 'Stora björnen', UMi: 'Lilla björnen', Vel: 'Seglet', Vir: 'Jungfrun', Vol: 'Flygfisken', Vul: 'Räven',
};
const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthsSv = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

const byHip = new Map(brightStars.filter(star => star[6]).map(star => [star[6]!, star]));
const nameByHip = new Map(starNames.map(star => [star.hip, star.name]));
const existing = new Set(['Ori', 'UMa']); // curated demo entries already exist for these two

/** Month when a right ascension culminates around 22:00 local time (approximate). */
export function bestEveningMonth(raHours: number) {
  // The Sun's RA is ~0 h on 21 March and grows ~2 h per month; culmination at 22 h needs Sun RA ≈ RA − 10 h.
  const sunRa = ((raHours - 10) % 24 + 24) % 24;
  return (2 + Math.round(sunRa / 2)) % 12; // 0 = January; March = index 2
}

export const constellationInfoObjects: SpaceObject[] = constellationFigures.filter(figure => !existing.has(figure.id)).flatMap(figure => {
  const stars = [...new Set(figure.lines.flat())].map(hip => byHip.get(hip)).filter((star): star is NonNullable<typeof star> => Boolean(star));
  if (!stars.length) return [];
  let x = 0, y = 0, z = 0;
  for (const [ra, dec] of stars) { const a = ra * Math.PI / 12, d = dec * Math.PI / 180; x += Math.cos(d) * Math.cos(a); y += Math.cos(d) * Math.sin(a); z += Math.sin(d); }
  const raHours = ((Math.atan2(y, x) * 12 / Math.PI) + 24) % 24, decDegrees = Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI;
  const brightest = stars.reduce((best, star) => star[2] < best[2] ? star : best);
  const brightestName = (brightest[6] && nameByHip.get(brightest[6])) || null;
  const month = bestEveningMonth(raHours);
  const north = decDegrees >= 0;
  const sv = swedish[figure.id] ?? figure.name;
  const mag = brightest[2].toFixed(1);
  return [{
    id: `con-${figure.id.toLowerCase()}`, en: figure.name, sv, kind: 'Constellation', constellation: figure.name,
    distance: 'Stars at many distances', distanceSv: 'Stjärnor på många avstånd',
    magnitude: `${mag} (brightest figure star)`, magnitudeSv: `${mag.replace('.', ',')} (ljusaste figurstjärnan)`,
    gear: 'eye',
    description: `${figure.name} lies on the ${north ? 'northern' : 'southern'} sky. Its brightest figure star is ${brightestName ?? `HIP ${brightest[6]}`} (magnitude ${mag}). It is best placed in the evening around ${monthsEn[month]}. Position is the centre of the figure stars.`,
    descriptionSv: `${sv} finns på ${north ? 'norra' : 'södra'} stjärnhimlen. Den ljusaste figurstjärnan är ${brightestName ?? `HIP ${brightest[6]}`} (magnitud ${mag.replace('.', ',')}). Den står bäst till på kvällen omkring ${monthsSv[month]}. Positionen är mitten av figurstjärnorna.`,
    position: {kind: 'fixed', raHours, decDegrees},
    color: '#86b6e6', size: 3, aliases: [figure.id, figure.name, sv],
  } satisfies SpaceObject];
});
