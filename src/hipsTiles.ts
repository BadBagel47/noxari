import type {ObservingLocation} from './astronomy';
import {HIPS_TILE, hipsLocateFast, hipsOrderFor} from './hips';
import {milkyWayBasis} from './milkyWay';
import type {ViewDirection} from './skyProjection';

/**
 * F-063: shared loader for DSS2 colour HiPS tiles, used by the GPU renderer and the Canvas painter.
 * - Official mirrors of the same survey (identical files): MAST on AWS, ESA ESASky, IRSA. Each tile
 *   always comes from the same mirror (tile number modulo the list, so browser caching works), and
 *   another mirror is tried if one fails or refuses (HTTP 429).
 * - The all-sky preview (Norder3/Allsky.jpg, one 0.8 MB file) loads first, so something is always
 *   shown while sharper tiles arrive.
 * - Wanted tiles cover the view plus a margin (neighbours are fetched before they come into view),
 *   newest wishes first, a few downloads per mirror at a time.
 * Requests only name a sky tile; nothing about the place or time is sent.
 */
export const DSS_MIRRORS = [
  'https://stpubdata.s3.us-east-1.amazonaws.com/mast/skybackgrounds/DSSColor',
  'https://skies.esac.esa.int/DSSColor',
  'https://irsa.ipac.caltech.edu/data/hips/CDS/DSS2/color',
];
export const ALLSKY_COLUMNS = 27, ALLSKY_TILE = 64;

export type TileKey = {order: number; tile: number};
export type LoadedTile = TileKey & {image: HTMLImageElement; pixels: () => Uint8ClampedArray};

const MAX_TILES = 48, PER_MIRROR = 3, MAX_QUEUE = 96;
export const tileId = (order: number, tile: number) => `${order}/${tile}`;
export const mirrorUrl = (mirror: number, order: number, tile: number) =>
  `${DSS_MIRRORS[mirror % DSS_MIRRORS.length]}/Norder${order}/Dir${Math.floor(tile / 10000) * 10000}/Npix${tile}.jpg`;

function pixelsOf(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', {willReadFrequently: true})!;
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
}

/** Wanted order and tiles for a view: a sample grid over the view plus a margin, sharp order and a coarse preview order. */
export function wantedTiles(view: ViewDirection, zoom: number, time: Date, location: ObservingLocation, width: number, height: number, margin = 1.35) {
  const basis = milkyWayBasis(time, location);
  const heading = view.heading * Math.PI / 180, pitch = view.pitch * Math.PI / 180;
  const ch = Math.cos(heading), sh = Math.sin(heading), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const focal = Math.max(width, height) / 2 * zoom;
  const order = hipsOrderFor(90 / zoom / Math.max(width, height));
  const orders = order > 3 ? [order, Math.max(3, order - 2)] : [order];
  const found = new Map<string, TileKey & {distance: number}>(), out = new Int32Array(1);
  const cols = 16, rows = 12;
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
    const right = (c / cols - .5) * width * margin / focal, above = (.5 - r / rows) * height * margin / focal;
    const n = cp * ch - right * sh - above * sp * ch, w = -cp * sh - right * ch + above * sp * sh, u = sp + above * cp;
    const x = n * basis[0] + w * basis[3] + u * basis[6], y = n * basis[1] + w * basis[4] + u * basis[7], z = n * basis[2] + w * basis[5] + u * basis[8];
    const ra = (Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI), sinDec = z / Math.sqrt(x * x + y * y + z * z);
    const distance = Math.hypot(c / cols - .5, r / rows - .5);
    for (const k of orders) {
      const tile = hipsLocateFast(ra, sinDec, k, out), id = tileId(k, tile), known = found.get(id);
      if (!known || distance < known.distance) found.set(id, {order: k, tile, distance});
    }
  }
  // Coarse preview first, then sharp tiles from the centre outwards.
  const list = [...found.values()].sort((a, b) => (a.order - b.order) || (a.distance - b.distance));
  return {order, tiles: list.map(({order, tile}) => ({order, tile}))};
}

export class HipsTiles {
  private loaded = new Map<string, LoadedTile>();
  private used: string[] = [];
  private loading = new Set<string>();
  private queue: (TileKey & {id: string; mirror: number; attempt: number})[] = [];
  private active = DSS_MIRRORS.map(() => 0);
  private retryAt = new Map<string, number>();
  private allskyImage: HTMLImageElement | null = null;
  private allskyPixels: Uint8ClampedArray | null = null;
  private allskyLoading = false;
  /** Bumped whenever a tile or the preview arrives (renderers re-upload / redraw). */
  version = 0;

  constructor(private onChange: () => void) {}

  get allsky() {
    if (!this.allskyImage && !this.allskyLoading) {
      this.allskyLoading = true;
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => { this.allskyImage = image; this.version++; this.onChange(); };
      image.onerror = () => { this.allskyLoading = false; };
      image.src = `${DSS_MIRRORS[0]}/Norder3/Allsky.jpg`;
    }
    return this.allskyImage;
  }

  allskyData() {
    if (!this.allskyPixels && this.allsky) {
      try { this.allskyPixels = pixelsOf(this.allsky); } catch { return null; }
    }
    return this.allskyPixels;
  }

  get(order: number, tile: number) {
    const id = tileId(order, tile), entry = this.loaded.get(id);
    if (entry) {
      const at = this.used.indexOf(id);
      if (at >= 0) this.used.splice(at, 1);
      this.used.push(id);
    }
    return entry ?? null;
  }

  /** Ask for tiles (most important first). Already loaded or loading tiles are skipped. */
  want(tiles: TileKey[]) {
    const now = Date.now(), fresh: (TileKey & {id: string; mirror: number; attempt: number})[] = [];
    for (const {order, tile} of tiles) {
      const id = tileId(order, tile);
      if (this.loaded.has(id) || this.loading.has(id) || (this.retryAt.get(id) ?? 0) > now) continue;
      fresh.push({order, tile, id, mirror: tile % DSS_MIRRORS.length, attempt: 0});
    }
    // Newest wishes win: they go to the front of the queue in priority order.
    const fresher = new Set(fresh.map(entry => entry.id));
    this.queue = [...fresh, ...this.queue.filter(entry => !fresher.has(entry.id))].slice(0, MAX_QUEUE);
    this.pump();
  }

  private pump() {
    for (let i = 0; i < this.queue.length;) {
      const entry = this.queue[i];
      if (this.active[entry.mirror] >= PER_MIRROR) { i++; continue; }
      this.queue.splice(i, 1);
      this.start(entry);
    }
  }

  private start(entry: TileKey & {id: string; mirror: number; attempt: number}) {
    const {id, order, tile, mirror} = entry;
    this.loading.add(id);
    this.active[mirror]++;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    const finish = () => { this.active[mirror]--; this.loading.delete(id); this.pump(); };
    image.onload = () => {
      let pixels: Uint8ClampedArray | null = null;
      this.loaded.set(id, {order, tile, image, pixels: () => pixels ??= pixelsOf(image)});
      this.used.push(id);
      while (this.used.length > MAX_TILES) this.loaded.delete(this.used.shift()!);
      finish();
      this.version++;
      this.onChange();
    };
    image.onerror = () => {
      finish();
      if (entry.attempt + 1 < DSS_MIRRORS.length) {
        // Same tile from the next mirror (e.g. one refused with 429).
        this.queue.unshift({...entry, mirror: (mirror + 1) % DSS_MIRRORS.length, attempt: entry.attempt + 1});
        this.pump();
      } else this.retryAt.set(id, Date.now() + 30_000);
    };
    image.src = mirrorUrl(mirror, order, tile);
  }
}

/** Byte offset of an order-3 tile pixel inside the all-sky preview (27 columns of 64×64 tiles). */
export function allskyOffset(tile: number, localOffset: number, width = ALLSKY_COLUMNS * ALLSKY_TILE) {
  // localOffset is the RGBA byte offset inside a 512×512 tile: row = face x, column = face y.
  const pixel = localOffset / 4, row = Math.floor(pixel / HIPS_TILE), col = pixel % HIPS_TILE;
  const x = (tile % ALLSKY_COLUMNS) * ALLSKY_TILE + Math.floor(col / 8), y = Math.floor(tile / ALLSKY_COLUMNS) * ALLSKY_TILE + Math.floor(row / 8);
  return (y * width + x) * 4;
}
