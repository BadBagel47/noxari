import {starRgb} from './starColor';

/** F-049: one small radial-glow canvas per colour step, reused every frame (drawImage is cheap; gradients are not). */
const sprites = new Map<number, HTMLCanvasElement>();
export function glowSprite(colorIndex: number | null | undefined) {
  const key = Math.round((colorIndex ?? .45) * 10);
  let sprite = sprites.get(key);
  if (sprite) return sprite;
  sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const context = sprite.getContext('2d')!, [r, g, b] = starRgb(key / 10);
  const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, `rgba(${r},${g},${b},.85)`);
  glow.addColorStop(.1, `rgba(${r},${g},${b},.42)`);
  glow.addColorStop(.35, `rgba(${r},${g},${b},.1)`);
  glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
  sprites.set(key, sprite);
  return sprite;
}
