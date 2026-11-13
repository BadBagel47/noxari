import type {ObservingLocation} from './astronomy';
import {DSS_HIPS, HIPS_TILE, hipsLocateFast, hipsOrderFor, hipsTileUrl} from './hips';
import {milkyWayBasis} from './milkyWay';
import type {ViewDirection} from './skyProjection';

/**
 * F-062: real sky images (DSS2 colour, STScI/NASA, coloured by CDS; ESA ESASky mirror) blended in
 * beyond 3× zoom in the eye-level view. One Canvas painter serves both the GPU and the Canvas path,
 * so both show the same pixels. It casts a ray per sample (like the Milky Way painter) at the zoomed
 * field of view, finds the HEALPix tile and pixel, and reads it from decoded tiles. Tiles are fetched
 * from ESA only for the part of the sky in view; nothing about the place is sent.
 */
export const HIPS_START_ZOOM = 3;
export const MAX_SKY_ZOOM = 60;
/** 0 below 3×, fully shown from 6×. */
export const hipsAlpha = (zoom: number) => Math.max(0, Math.min(1, (zoom - HIPS_START_ZOOM) / 3));

type Tile = {pixels: Uint8ClampedArray} | 'loading' | 'failed';
const MAX_TILES = 28, MAX_ACTIVE = 3;
const BLACK = 16; // DSS sky background level, subtracted so the photo adds light to Noxari's own sky

export class HipsPainter {
  private canvas: HTMLCanvasElement | null = null;
  private key = '';
  private tiles = new Map<string, Tile>();
  private used: string[] = [];
  /** Tiles requested but not yet decoded (for tests and the credit line). */
  pending = 0;

  constructor(private onTile: () => void, private base = DSS_HIPS.url) {}

  private tile(order: number, tile: number, fetch = true): Uint8ClampedArray | null {
    const id = `${order}/${tile}`;
    const entry = this.tiles.get(id);
    if (entry && typeof entry === 'object') {
      const at = this.used.indexOf(id);
      if (at >= 0) this.used.splice(at, 1);
      this.used.push(id);
      return entry.pixels;
    }
    if (!entry && fetch) this.request(order, tile, id);
    return null;
  }

  // Polite to the image server: a few downloads at a time, newest wishes first, failed tiles retried later.
  private queue: {order: number; tile: number; id: string}[] = [];
  private active = 0;
  private retryAt = new Map<string, number>();

  private request(order: number, tile: number, id: string) {
    const retry = this.retryAt.get(id);
    if (retry && Date.now() < retry) return;
    this.tiles.set(id, 'loading');
    this.pending++;
    this.queue.push({order, tile, id});
    if (this.queue.length > 64) for (const dropped of this.queue.splice(0, this.queue.length - 64)) { this.tiles.delete(dropped.id); this.pending--; }
    this.pump();
  }

  private pump() {
    while (this.active < MAX_ACTIVE && this.queue.length) {
      const {order, tile, id} = this.queue.pop()!;
      this.active++;
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      const done = () => { this.active--; this.pending--; this.pump(); };
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = HIPS_TILE;
          const context = canvas.getContext('2d', {willReadFrequently: true})!;
          context.drawImage(image, 0, 0, HIPS_TILE, HIPS_TILE);
          this.tiles.set(id, {pixels: context.getImageData(0, 0, HIPS_TILE, HIPS_TILE).data});
          this.used.push(id);
          while (this.used.length > MAX_TILES) this.tiles.delete(this.used.shift()!);
        } catch { this.tiles.set(id, 'failed'); }
        this.key = '';
        done();
        this.onTile();
      };
      image.onerror = () => { this.tiles.delete(id); this.retryAt.set(id, Date.now() + 30_000); done(); };
      image.src = hipsTileUrl(this.base, order, tile, DSS_HIPS.format);
    }
  }

  /** Samples on the long axis: coarser while the view moves, sharp once it rests. */
  draw(context: CanvasRenderingContext2D, time: Date, location: ObservingLocation, view: ViewDirection, zoom: number,
       width: number, height: number, alpha: number, belowHorizon: boolean, moving: boolean) {
    if (alpha <= 0 || width <= 0 || height <= 0) return;
    const samples = moving ? 240 : 720;
    const scale = Math.max(width, height) / samples;
    const cols = Math.max(1, Math.round(width / scale)), rows = Math.max(1, Math.round(height / scale));
    const key = [time.getTime(), location.latitude, location.longitude, width, height, view.heading, view.pitch, zoom, belowHorizon, samples].join('|');
    if (!this.canvas || this.key !== key) {
      this.canvas ??= document.createElement('canvas');
      this.canvas.width = cols; this.canvas.height = rows;
      const buffer = this.canvas.getContext('2d')!, image = buffer.createImageData(cols, rows);
      const basis = milkyWayBasis(time, location);
      const heading = view.heading * Math.PI / 180, pitch = view.pitch * Math.PI / 180;
      const ch = Math.cos(heading), sh = Math.sin(heading), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const focal = Math.max(cols, rows) / 2 * zoom;
      const order = hipsOrderFor(90 / zoom / samples);
      let complete = true;
      const located = new Int32Array(1);
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const right = (col + .5 - cols / 2) / focal, above = (rows / 2 - row - .5) / focal;
        const n = cp * ch - right * sh - above * sp * ch, w = -cp * sh - right * ch + above * sp * sh, u = sp + above * cp;
        if (u < 0 && !belowHorizon) continue;
        const x = n * basis[0] + w * basis[3] + u * basis[6], y = n * basis[1] + w * basis[4] + u * basis[7], z = n * basis[2] + w * basis[5] + u * basis[8];
        const ra = (Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI), sinDec = z / Math.sqrt(x * x + y * y + z * z);
        // Sharpest loaded order first, then coarser parents while finer tiles arrive.
        let pixel: Uint8ClampedArray | null = null, offset = 0;
        for (const k of order > 3 ? [order, order - 2 < 3 ? 3 : order - 2] : [order]) {
          const tile = hipsLocateFast(ra, sinDec, k, located);
          // While zooming or panning only the coarse preview order is fetched; sharp tiles once the view rests.
          pixel = this.tile(k, tile, !moving || k !== order || order === 3);
          if (pixel) { offset = located[0]; break; }
          if (k === order) complete = false;
        }
        if (!pixel) continue;
        const o = (row * cols + col) * 4;
        image.data[o] = Math.max(0, pixel[offset] - BLACK);
        image.data[o + 1] = Math.max(0, pixel[offset + 1] - BLACK);
        image.data[o + 2] = Math.max(0, pixel[offset + 2] - BLACK);
        image.data[o + 3] = 255;
      }
      buffer.putImageData(image, 0, 0);
      // Keep redrawing while tiles of the wanted order are still missing.
      this.key = complete ? key : '';
    }
    context.save();
    context.globalAlpha = alpha;
    context.globalCompositeOperation = 'lighter';
    context.imageSmoothingEnabled = true;
    context.drawImage(this.canvas, 0, 0, width, height);
    context.restore();
  }
}
