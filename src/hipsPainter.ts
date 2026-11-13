import type {ObservingLocation} from './astronomy';
import {hipsLocateFast} from './hips';
import {allskyOffset, type HipsTiles} from './hipsTiles';
import {milkyWayBasis} from './milkyWay';
import type {ViewDirection} from './skyProjection';

/**
 * F-062/F-063: real sky images (DSS2 colour, STScI/NASA, coloured by CDS) blended in beyond 3× zoom
 * in the eye-level view. The GPU renderer draws them per pixel in a shader (gpuSky.drawHips); this
 * Canvas painter is the fallback for software renderers and uses the same tiles, the same
 * background subtraction and the same all-sky preview, so both paths show the same picture.
 */
export const HIPS_START_ZOOM = 3;
export const MAX_SKY_ZOOM = 200;
/** 0 below 3×, fully shown from 6×. */
export const hipsAlpha = (zoom: number) => Math.max(0, Math.min(1, (zoom - HIPS_START_ZOOM) / 3));
/** DSS sky background level (0–255), subtracted so the photo adds light to Noxari's own sky. */
export const HIPS_BLACK = 16;

export class HipsPainter {
  private canvas: HTMLCanvasElement | null = null;
  private key = '';

  constructor(private tiles: HipsTiles) {}

  /** Samples on the long axis: coarser while the view moves, sharp once it rests. */
  draw(context: CanvasRenderingContext2D, time: Date, location: ObservingLocation, view: ViewDirection, zoom: number,
       width: number, height: number, alpha: number, belowHorizon: boolean, moving: boolean, order: number) {
    if (alpha <= 0 || width <= 0 || height <= 0) return;
    const samples = moving ? 240 : 720;
    const scale = Math.max(width, height) / samples;
    const cols = Math.max(1, Math.round(width / scale)), rows = Math.max(1, Math.round(height / scale));
    const key = [time.getTime(), location.latitude, location.longitude, width, height, view.heading, view.pitch, zoom, belowHorizon, samples, this.tiles.version].join('|');
    if (!this.canvas || this.key !== key) {
      this.canvas ??= document.createElement('canvas');
      this.canvas.width = cols; this.canvas.height = rows;
      const buffer = this.canvas.getContext('2d')!, image = buffer.createImageData(cols, rows);
      const basis = milkyWayBasis(time, location), allsky = this.tiles.allskyData();
      const heading = view.heading * Math.PI / 180, pitch = view.pitch * Math.PI / 180;
      const ch = Math.cos(heading), sh = Math.sin(heading), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const focal = Math.max(cols, rows) / 2 * zoom;
      const located = new Int32Array(1);
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const right = (col + .5 - cols / 2) / focal, above = (rows / 2 - row - .5) / focal;
        const n = cp * ch - right * sh - above * sp * ch, w = -cp * sh - right * ch + above * sp * sh, u = sp + above * cp;
        if (u < 0 && !belowHorizon) continue;
        const x = n * basis[0] + w * basis[3] + u * basis[6], y = n * basis[1] + w * basis[4] + u * basis[7], z = n * basis[2] + w * basis[5] + u * basis[8];
        const ra = (Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI), sinDec = z / Math.sqrt(x * x + y * y + z * z);
        // Same levels as the GPU shader: sharp, the preview two levels coarser, then the all-sky preview.
        let pixel: Uint8ClampedArray | null = null, offset = 0;
        for (const k of order > 3 ? [order, Math.max(3, order - 2)] : [order]) {
          if (pixel) break;
          const tile = hipsLocateFast(ra, sinDec, k, located), loaded = this.tiles.get(k, tile);
          if (loaded) { pixel = loaded.pixels(); offset = located[0]; }
        }
        if (!pixel && allsky) {
          const tile = hipsLocateFast(ra, sinDec, 3, located);
          pixel = allsky; offset = allskyOffset(tile, located[0]);
        }
        if (!pixel) continue;
        const o = (row * cols + col) * 4;
        image.data[o] = Math.max(0, pixel[offset] - HIPS_BLACK);
        image.data[o + 1] = Math.max(0, pixel[offset + 1] - HIPS_BLACK);
        image.data[o + 2] = Math.max(0, pixel[offset + 2] - HIPS_BLACK);
        image.data[o + 3] = 255;
      }
      buffer.putImageData(image, 0, 0);
      this.key = key;
    }
    context.save();
    context.globalAlpha = alpha;
    context.globalCompositeOperation = 'lighter';
    context.imageSmoothingEnabled = true;
    context.drawImage(this.canvas, 0, 0, width, height);
    context.restore();
  }
}
