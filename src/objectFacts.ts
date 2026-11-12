import {Body, GeoVector} from 'astronomy-engine';
import type {SpaceObject} from './data';
import {messierSizes} from './generated/messierSizes';

/**
 * F-045: distance and size lines for the demo title card. Deep-sky apparent
 * sizes come from OpenNGC; the true size is an approximation from that angle
 * and the catalog distance, so it is always marked ≈. Solar-system bodies use
 * standard mean diameters and their calculated distance at the shown time.
 */
const DIAMETER_KM: Record<string, number> = {sun: 1_392_700, moon: 3_474, mercury: 4_879, venus: 12_104, mars: 6_779, jupiter: 139_820,
  saturn: 116_460, uranus: 50_724, neptune: 49_244, pluto: 2_377, ceres: 939, eris: 2_326, haumea: 1_632, makemake: 1_430, vesta: 525};
const KM_PER_AU = 149_597_870.7;

const significant = (value: number, digits = 2) => {
  if (value === 0) return 0;
  const scale = 10 ** (digits - 1 - Math.floor(Math.log10(Math.abs(value))));
  return Math.round(value * scale) / scale;
};

export type ObjectFacts = {distance?: string; apparentSize?: string; trueSize?: string};

export function objectFacts(object: SpaceObject, time: Date, language: 'en' | 'sv'): ObjectFacts {
  const sv = language === 'sv', locale = sv ? 'sv-SE' : 'en-GB';
  const number = (value: number, fraction = 0) => new Intl.NumberFormat(locale, {maximumFractionDigits: fraction}).format(value);
  const ly = sv ? 'ljusår' : 'light-years';
  const angle = (arcmin: number) => arcmin >= 60 ? `${number(arcmin / 60, 1)}°` : arcmin >= 1 ? `${number(arcmin, arcmin < 10 ? 1 : 0)}′` : `${number(arcmin * 60, 0)}″`;
  const size = messierSizes[object.id];
  if (size) {
    const facts: ObjectFacts = {distance: sv ? object.distanceSv ?? object.distance : object.distance};
    if (size.major) facts.apparentSize = `≈ ${angle(size.major)}${size.minor && size.minor !== size.major ? ` × ${angle(size.minor)}` : ''}`;
    if (size.major && size.distanceLy) {
      const across = size.distanceLy * size.major / 60 * Math.PI / 180;
      facts.trueSize = `≈ ${number(significant(across), across < 10 ? 1 : 0)} ${ly}`;
    }
    return facts;
  }
  const diameter = DIAMETER_KM[object.id];
  if (diameter && object.position?.kind === 'solar') {
    const vector = GeoVector(Body[object.position.body], time, true);
    const km = Math.hypot(vector.x, vector.y, vector.z) * KM_PER_AU;
    return {distance: object.id === 'moon' ? `${number(significant(km, 3))} km` : `${number(km / KM_PER_AU, 2)} AU · ${number(significant(km / 1e6, 3))} ${sv ? 'miljoner km' : 'million km'}`,
      apparentSize: angle(diameter / km * 180 / Math.PI * 60), trueSize: `${number(diameter)} km`};
  }
  if (diameter) return {distance: sv ? object.distanceSv ?? object.distance : object.distance, trueSize: `${number(diameter)} km`};
  if (object.kind === 'Satellite') return {distance: sv ? '≈ 400 km höjd' : '≈ 400 km altitude', trueSize: sv ? '≈ 109 m bred' : '≈ 109 m across'};
  return object.distance && !/varies/i.test(object.distance) ? {distance: sv ? object.distanceSv ?? object.distance : object.distance} : {};
}

/** Demo close-up zoom: large objects stay wide, small ones get a closer look (1×–3× range). */
export function demoZoom(object: SpaceObject) {
  const major = messierSizes[object.id]?.major;
  if (major !== undefined && major !== null) return major > 100 ? 1.4 : major > 40 ? 1.9 : 2.6;
  if (object.kind === 'Constellation') return 1;
  return object.kind === 'Moon' ? 2 : 2.4;
}

/** F-046: where to look, in words a beginner can use outdoors (a hand at arm's length ≈ 10°). */
export function lookHint(position: {altitude: number; azimuth: number}, language: 'en' | 'sv') {
  const sv = language === 'sv';
  const names = sv ? ['norr', 'nordost', 'öster', 'sydost', 'söder', 'sydväst', 'väster', 'nordväst'] : ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  const direction = names[Math.round(((position.azimuth % 360) + 360) % 360 / 45) % 8];
  const altitude = Math.round(position.altitude), hands = Math.round(position.altitude / 10);
  const height = position.altitude >= 75 ? (sv ? 'nästan rakt upp' : 'almost straight up')
    : hands < 1 ? (sv ? 'strax ovanför horisonten' : 'just above the horizon')
    : sv ? `${hands} ${hands === 1 ? 'handbredd' : 'handbredder'} upp` : `${hands} hand${hands === 1 ? '' : 's'} up`;
  return {direction, height, altitude, text: sv ? `Titta mot ${direction}, ${height} (${altitude}°)` : `Look ${direction}, ${height} (${altitude}°)`};
}
