import {AstroTime, Constellation, Observer, RotateVector, Rotation_HOR_EQJ, Vector} from 'astronomy-engine';
import type {ObservingLocation} from './astronomy';
import type {FaintStars} from './binocularStars';
import type {SpaceObject} from './data';
import type {ViewDirection} from './skyProjection';

/**
 * F-061: faint stars from Gaia DR3 (ESA/Gaia/DPAC, CC BY-NC 3.0 IGO) to G 11, in sky tiles
 * (scripts/generate_gaia_stars.py). Tiles are fetched only on the whole-catalogue level when
 * the view is zoomed in past the binocular limit, and only around the view; details (Gaia id,
 * parallax) only when a star is tapped. Nothing is precached and nothing about the place is sent.
 */
/** Layer 0: G ≤ 11 in 10° tiles (F-061). Layer 1: 11 < G ≤ 12 in 5° tiles, loaded deeper in (F-065). */
export const GAIA_LAYERS = ['stars/gaia-v1/', 'stars/gaia12-v1/'];
export const GAIA_PATH = GAIA_LAYERS[0];
export type GaiaIndex = {version: number; bandDegrees: number; cells: number[]; counts: number[]; magnitudeBase: number; magnitudeScale: number; colourScale: number; limitG: number; layer?: number};
export type GaiaTile = {tile: number; layer?: number; count: number; equatorial: Float32Array; magnitude: Float32Array; colour: Uint8Array};
/** Combined faint stars: `tag` is −1 for HYG binocular stars, else ((layer·4096 + tile)·2¹⁴) + index in the tile. */
export type TaggedFaintStars = FaintStars & {tag: Int32Array};

const RAD = Math.PI / 180;
const NEUTRAL_CI = .45;
/** Approximate B−V from a packed Gaia BP−RP byte (255 = unknown), for star tint only. */
export const gaiaColourIndex = (packed: number, scale = 50) => packed === 255 ? NEUTRAL_CI : Math.max(-.3, Math.min(2, .8 * (packed / scale - .5)));
const TAG = 1 << 14, LAYER = 4096;
/** Splits a Gaia tag into layer, tile and index (see TaggedFaintStars). */
export const gaiaTagParts = (tag: number) => { const global = Math.floor(tag / TAG); return {layer: Math.floor(global / LAYER), tile: global % LAYER, index: tag % TAG}; };
export const tileStarts = (index: GaiaIndex) => index.cells.reduce<number[]>((starts, _, band) => [...starts, band ? starts[band - 1] + index.cells[band - 1] : 0], []);

/** Tile number, band and RA cell for a J2000 position in degrees. */
export function gaiaTileOf(index: GaiaIndex, raDeg: number, decDeg: number) {
  const band = Math.min(index.cells.length - 1, Math.max(0, Math.floor((decDeg + 90) / index.bandDegrees)));
  const width = 360 / index.cells[band];
  const cell = Math.min(index.cells[band] - 1, Math.floor((((raDeg % 360) + 360) % 360) / width));
  return {tile: tileStarts(index)[band] + cell, band, cell, width};
}

const separation = (ra1: number, dec1: number, ra2: number, dec2: number) => {
  const cosine = Math.sin(dec1 * RAD) * Math.sin(dec2 * RAD) + Math.cos(dec1 * RAD) * Math.cos(dec2 * RAD) * Math.cos((ra1 - ra2) * RAD);
  return Math.acos(Math.max(-1, Math.min(1, cosine))) / RAD;
};

/** Non-empty tiles that may overlap a circle of `radius` degrees, nearest first. */
export function gaiaTilesNear(index: GaiaIndex, raDeg: number, decDeg: number, radius: number) {
  const starts = tileStarts(index), found: {tile: number; distance: number}[] = [];
  for (let band = 0; band < index.cells.length; band++) {
    const low = -90 + band * index.bandDegrees, high = low + index.bandDegrees;
    if (high < decDeg - radius || low > decDeg + radius) continue;
    const width = 360 / index.cells[band], centreDec = low + index.bandDegrees / 2;
    // Half the cell diagonal, generous (RA width taken as if at the equator).
    const reach = Math.hypot(width / 2, index.bandDegrees / 2);
    for (let cell = 0; cell < index.cells[band]; cell++) {
      const tile = starts[band] + cell;
      if (!index.counts[tile]) continue;
      const distance = separation(raDeg, decDeg, (cell + .5) * width, centreDec);
      if (distance <= radius + reach) found.push({tile, distance});
    }
  }
  return found.sort((a, b) => a.distance - b.distance).map(entry => entry.tile);
}

export function decodeGaiaTile(index: GaiaIndex, tile: number, buffer: ArrayBuffer): GaiaTile {
  const view = new DataView(buffer);
  if (buffer.byteLength < 8 || String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)) !== 'NXG1') throw new Error('Unknown Gaia tile');
  const count = view.getUint32(4, true);
  if (buffer.byteLength !== 8 + count * 6) throw new Error('Truncated Gaia tile');
  let band = 0;
  const starts = tileStarts(index);
  while (band + 1 < starts.length && starts[band + 1] <= tile) band++;
  const width = 360 / index.cells[band], raStart = (tile - starts[band]) * width, decStart = -90 + band * index.bandDegrees;
  const equatorial = new Float32Array(count * 3), magnitude = new Float32Array(count), colour = new Uint8Array(count);
  for (let i = 0, offset = 8; i < count; i++, offset += 6) {
    const ra = (raStart + view.getUint16(offset, true) / 65535 * width) * RAD;
    const dec = (decStart + view.getUint16(offset + 2, true) / 65535 * index.bandDegrees) * RAD;
    const cosDec = Math.cos(dec);
    equatorial[i * 3] = cosDec * Math.cos(ra);
    equatorial[i * 3 + 1] = cosDec * Math.sin(ra);
    equatorial[i * 3 + 2] = Math.sin(dec);
    magnitude[i] = index.magnitudeBase + view.getUint8(offset + 4) / index.magnitudeScale;
    colour[i] = view.getUint8(offset + 5);
  }
  return {tile, layer: index.layer ?? 0, count, equatorial, magnitude, colour};
}

/** Binocular stars plus loaded Gaia tiles, sorted by magnitude so renderers can draw a prefix. */
export function mergeFaintStars(binocular: FaintStars | null, tiles: GaiaTile[]): TaggedFaintStars | null {
  const sources: {equatorial: Float32Array; magnitude: Float32Array; count: number; tag: (i: number) => number; ci: (i: number) => number}[] = [];
  if (binocular) sources.push({...binocular, tag: () => -1, ci: () => NEUTRAL_CI});
  for (const tile of tiles) sources.push({...tile, tag: i => ((tile.layer ?? 0) * LAYER + tile.tile) * TAG + i, ci: i => gaiaColourIndex(tile.colour[i])});
  if (!sources.length) return null;
  const count = sources.reduce((sum, source) => sum + source.count, 0);
  const order = new Uint32Array(count), keys = new Float32Array(count), owner = new Uint16Array(count), local = new Uint32Array(count);
  let n = 0;
  sources.forEach((source, s) => { for (let i = 0; i < source.count; i++, n++) { order[n] = n; keys[n] = source.magnitude[i]; owner[n] = s; local[n] = i; } });
  // Counting sort on 0.01-mag steps (both sources are quantised at least that coarsely): linear time,
  // so adding tiles while panning does not stall a frame. Order within a step is stable.
  let low = Infinity, high = -Infinity;
  for (let i = 0; i < count; i++) { const step = Math.round(keys[i] * 100); if (step < low) low = step; if (step > high) high = step; }
  const buckets = new Uint32Array(high - low + 2);
  for (let i = 0; i < count; i++) buckets[Math.round(keys[i] * 100) - low + 1]++;
  for (let b = 1; b < buckets.length; b++) buckets[b] += buckets[b - 1];
  for (let i = 0; i < count; i++) order[buckets[Math.round(keys[i] * 100) - low]++] = i;
  const equatorial = new Float32Array(count * 3), magnitude = new Float32Array(count), tag = new Int32Array(count), ci = new Float32Array(count);
  for (let k = 0; k < count; k++) {
    const j = order[k], source = sources[owner[j]], i = local[j];
    equatorial[k * 3] = source.equatorial[i * 3]; equatorial[k * 3 + 1] = source.equatorial[i * 3 + 1]; equatorial[k * 3 + 2] = source.equatorial[i * 3 + 2];
    magnitude[k] = keys[j];
    tag[k] = source.tag(i);
    ci[k] = source.ci(i);
  }
  return {count, equatorial, magnitude, tag, ci};
}

/** J2000 RA/Dec (degrees) at the centre of the view. */
export function viewCentre(view: ViewDirection, time: Date, location: ObservingLocation) {
  const heading = view.heading * RAD, pitch = view.pitch * RAD;
  const rotation = Rotation_HOR_EQJ(time, new Observer(location.latitude, location.longitude, 0));
  // Astronomy Engine's horizontal frame: x north, y west, z up.
  const v = RotateVector(rotation, new Vector(Math.cos(pitch) * Math.cos(heading), -Math.cos(pitch) * Math.sin(heading), Math.sin(pitch), new AstroTime(time)));
  return {ra: ((Math.atan2(v.y, v.x) / RAD) + 360) % 360, dec: Math.asin(Math.max(-1, Math.min(1, v.z))) / RAD};
}

const indexPending = new Map<number, Promise<GaiaIndex>>();
export function loadGaiaIndex(base: string, layer = 0) {
  let pending = indexPending.get(layer);
  if (!pending) {
    pending = fetch(`${base}${GAIA_LAYERS[layer]}index.json`).then(response => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then((index: GaiaIndex) => ({...index, layer}));
    indexPending.set(layer, pending);
    pending.catch(() => indexPending.delete(layer));
  }
  return pending;
}

const tiles = new Map<string, Promise<GaiaTile>>();
export function loadGaiaTile(base: string, index: GaiaIndex, tile: number) {
  const layer = index.layer ?? 0, key = `${layer}/${tile}`;
  let pending = tiles.get(key);
  if (!pending) {
    pending = fetch(`${base}${GAIA_LAYERS[layer]}t${tile}.bin`).then(response => { if (!response.ok) throw new Error(String(response.status)); return response.arrayBuffer(); }).then(buffer => decodeGaiaTile(index, tile, buffer));
    tiles.set(key, pending);
    pending.catch(() => tiles.delete(key));
  }
  return pending;
}

const details = new Map<string, Promise<DataView>>();
function loadDetails(base: string, layer: number, tile: number) {
  const key = `${layer}/${tile}`;
  let pending = details.get(key);
  if (!pending) {
    pending = fetch(`${base}${GAIA_LAYERS[layer]}d${tile}.bin`).then(response => { if (!response.ok) throw new Error(String(response.status)); return response.arrayBuffer(); }).then(buffer => new DataView(buffer));
    details.set(key, pending);
    pending.catch(() => details.delete(key));
  }
  return pending;
}

const colourWords = (bpRp: number | null, sv: boolean) => bpRp === null ? '' : bpRp < .3 ? (sv ? 'blåvit' : 'blue-white') : bpRp < .65 ? (sv ? 'vit' : 'white') : bpRp < .9 ? (sv ? 'gulvit' : 'yellow-white') : bpRp < 1.15 ? (sv ? 'gul' : 'yellow') : bpRp < 1.7 ? (sv ? 'orange' : 'orange') : (sv ? 'rödorange' : 'red-orange');
/** Approximate B−V from Gaia BP−RP, only to tint the selection marker. */
const markerColour = (bpRp: number | null) => bpRp === null ? '#e3f1ff' : bpRp < .5 ? '#cfe0ff' : bpRp < .9 ? '#f4f1e8' : bpRp < 1.3 ? '#ffe2b0' : '#ffc78a';

/** The selectable object for a tapped Gaia star (tag from mergeFaintStars). */
export async function gaiaStarObject(base: string, indexes: (GaiaIndex | null)[], tag: number): Promise<SpaceObject> {
  const {layer, tile: tileNumber, index: i} = gaiaTagParts(tag), index = indexes[layer];
  if (!index) throw new Error('Gaia index not loaded');
  const [tile, detail] = await Promise.all([loadGaiaTile(base, index, tileNumber), loadDetails(base, layer, tileNumber)]);
  const sourceId = detail.getBigInt64(i * 10, true).toString(), parallax = detail.getUint16(i * 10 + 8, true) / 100;
  const x = tile.equatorial[i * 3], y = tile.equatorial[i * 3 + 1], z = tile.equatorial[i * 3 + 2];
  const raHours = ((Math.atan2(y, x) / RAD + 360) % 360) / 15, decDegrees = Math.asin(z) / RAD;
  const g = tile.magnitude[i], bpRp = tile.colour[i] === 255 ? null : tile.colour[i] / index.colourScale - .5;
  const constellation = Constellation(raHours, decDegrees).name;
  const ly = parallax > 0 ? Math.round(3261.56 / parallax / (parallax > 2 ? 1 : 10)) * (parallax > 2 ? 1 : 10) : null;
  const mag = g.toFixed(2), name = `Gaia DR3 ${sourceId}`;
  const en = colourWords(bpRp, false), sv = colourWords(bpRp, true);
  return {
    id: `gaia-${sourceId}`, en: name, sv: name, kind: 'Star', constellation,
    distance: ly ? `≈ ${ly.toLocaleString('en-GB')} light-years (from parallax)` : 'Unknown', distanceSv: ly ? `≈ ${ly.toLocaleString('sv-SE')} ljusår (från parallax)` : 'Okänt',
    magnitude: mag, magnitudeSv: mag.replace('.', ','), magnitudeBand: 'G', gear: g <= 9.5 ? 'binoculars' : 'telescope',
    description: `A faint ${en ? en + ' ' : ''}star of Gaia magnitude ${mag} in ${constellation}. Too faint for the naked eye; it needs binoculars or a small telescope under a dark sky. Position, brightness and parallax from ESA’s Gaia DR3 catalogue.`,
    descriptionSv: `En svag ${sv ? sv + ' ' : ''}stjärna med Gaia-magnitud ${mag.replace('.', ',')} i stjärnbilden ${constellation}. För svag för blotta ögat; den kräver kikare eller ett litet teleskop under mörk himmel. Läge, ljusstyrka och parallax från ESA:s Gaia DR3-katalog.`,
    position: {kind: 'fixed', raHours, decDegrees, distanceLy: ly ?? undefined},
    color: markerColour(bpRp), size: 2, aliases: [name],
    references: [
      {label: 'ESA Gaia DR3 (ESA/Gaia/DPAC, CC BY-NC 3.0 IGO)', url: 'https://www.cosmos.esa.int/web/gaia/dr3'},
      {label: 'Gaia archive', url: 'https://gea.esac.esa.int/archive/'},
    ],
  };
}

/** F-061: five tint groups for faint stars in the Canvas path (blue-white … orange); same colour index the GPU uses. */
export const FAINT_TINTS = [0, .25, .45, .8, 1.4];
export function faintTintGroups(ci: Float32Array) {
  const groups = new Uint8Array(ci.length);
  for (let i = 0; i < ci.length; i++) { const c = ci[i]; groups[i] = c < .12 ? 0 : c < .35 ? 1 : c < .62 ? 2 : c < 1.1 ? 3 : 4; }
  return groups;
}

export const isGaiaStarPick = (object: Pick<SpaceObject, 'id'>) => object.id.startsWith('gaia-');
