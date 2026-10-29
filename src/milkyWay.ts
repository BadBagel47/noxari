import {AstroTime, Observer, RotateVector, Rotation_HOR_EQJ, Vector} from 'astronomy-engine';
import type {ObservingLocation} from './astronomy';
import type {ViewDirection} from './skyProjection';

export type MilkyWayTexture = {width: number; height: number; pixels: Uint8ClampedArray};
const TAU = 2 * Math.PI;

// The generated grid has RA increasing to the right (periodic), Dec north at
// the top. Bilinear samples cross the 0/24h seam without a texture discontinuity.
export function milkyWaySample(texture: MilkyWayTexture, x: number, y: number, z: number) {
  const lon = (Math.atan2(y, x) + TAU) % TAU;
  const lat = Math.atan2(z, Math.hypot(x, y));
  const u = lon / TAU * texture.width - .5;
  const v = Math.max(0, Math.min(texture.height - 1, (.5 - lat / Math.PI) * texture.height - .5));
  const left = Math.floor(u), top = Math.floor(v), fx = u - left, fy = v - top;
  const at = (col: number, row: number) => texture.pixels[(Math.min(texture.height - 1, row) * texture.width + (col + texture.width) % texture.width) * 4];
  return (at(left, top) * (1 - fx) + at(left + 1, top) * fx) * (1 - fy)
    + (at(left, top + 1) * (1 - fx) + at(left + 1, top + 1) * fx) * fy;
}

// An inverse ray lookup avoids polygon edges stretching across the camera or
// horizon. The field is cached between animation-only repaints. At most 320
// samples on the long axis keep the diffuse layer light on mobile devices.
export class MilkyWayPainter {
  private canvas: HTMLCanvasElement | null = null;
  private key = '';
  private texture: MilkyWayTexture | null = null;

  draw(context: CanvasRenderingContext2D, texture: MilkyWayTexture, time: Date, location: ObservingLocation, width: number, height: number, visibility: number, view: ViewDirection | null, belowHorizon = false) {
    if (visibility <= 0 || width <= 0 || height <= 0) return;
    const key = [time.getTime(), location.latitude, location.longitude, width, height, view?.heading, view?.pitch, belowHorizon].join('|');
    if (!this.canvas || this.key !== key || this.texture !== texture) {
      this.canvas ??= document.createElement('canvas');
      const scale = Math.max(width, height) / 320;
      const cols = Math.max(1, Math.round(width / scale)), rows = Math.max(1, Math.round(height / scale));
      this.canvas.width = cols; this.canvas.height = rows;
      const buffer = this.canvas.getContext('2d')!;
      const image = buffer.createImageData(cols, rows);
      const rotation = Rotation_HOR_EQJ(time, new Observer(location.latitude, location.longitude, 0));
      const instant = new AstroTime(time);
      const rotate = (x: number, y: number, z: number) => RotateVector(rotation, new Vector(x, y, z, instant));
      const north = rotate(1, 0, 0), west = rotate(0, 1, 0), up = rotate(0, 0, 1);
      const heading = (view?.heading ?? 0) * Math.PI / 180, pitch = (view?.pitch ?? 0) * Math.PI / 180;
      const ch = Math.cos(heading), sh = Math.sin(heading), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const radius = Math.min(cols, rows) * .44, focal = Math.max(cols, rows) / 2;
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const dx = col + .5 - cols / 2, dy = rows / 2 - row - .5;
        let n: number, w: number, u: number;
        if (view) {
          const right = dx / focal, above = dy / focal;
          n = cp * ch - right * sh - above * sp * ch;
          w = -cp * sh - right * ch + above * sp * sh;
          u = sp + above * cp;
        } else {
          const distance = Math.hypot(dx, dy) / radius;
          if (distance > 1) continue;
          const alt = (1 - distance) * Math.PI / 2, az = Math.atan2(dx, dy);
          n = Math.cos(alt) * Math.cos(az); w = -Math.cos(alt) * Math.sin(az); u = Math.sin(alt);
        }
        if (u < 0 && !belowHorizon) continue;
        const value = milkyWaySample(texture,
          n * north.x + w * west.x + u * up.x,
          n * north.y + w * west.y + u * up.y,
          n * north.z + w * west.z + u * up.z);
        const offset = (row * cols + col) * 4;
        image.data[offset] = 132; image.data[offset + 1] = 154; image.data[offset + 2] = 180;
        image.data[offset + 3] = value * .68;
      }
      buffer.putImageData(image, 0, 0);
      this.key = key;
      this.texture = texture;
    }
    context.save();
    context.globalAlpha = visibility;
    context.imageSmoothingEnabled = true;
    context.drawImage(this.canvas, 0, 0, width, height);
    context.restore();
  }
}
