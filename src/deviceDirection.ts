import type {ViewDirection} from './skyProjection';

export type OrientationReading = {
  alpha: number | null; beta: number | null; gamma: number | null;
  absolute?: boolean; webkitCompassHeading?: number; webkitCompassAccuracy?: number;
};
export const wrapHeading = (angle: number) => (angle % 360 + 360) % 360;

// W3C intrinsic Z-X'-Y'' rotation. Look along the back of the screen (-Z),
// rather than its top edge. This also handles portrait/landscape rotation.
export function deviceDirection(reading: OrientationReading): (ViewDirection & {absolute: boolean}) | null {
  const {alpha, beta, gamma} = reading;
  if (alpha === null || beta === null || gamma === null || ![alpha, beta, gamma].every(Number.isFinite)) return null;
  const rad = Math.PI / 180;
  const a = alpha * rad, b = beta * rad, g = gamma * rad;
  const east = -Math.cos(a) * Math.sin(g) - Math.sin(a) * Math.sin(b) * Math.cos(g);
  const north = -Math.sin(a) * Math.sin(g) + Math.cos(a) * Math.sin(b) * Math.cos(g);
  const up = -Math.cos(b) * Math.cos(g);
  // Heading is undefined when the screen faces straight up or down.
  if (Math.hypot(east, north) < .01) return null;
  const compass = reading.webkitCompassHeading;
  const hasCompass = typeof compass === 'number' && Number.isFinite(compass) && (reading.webkitCompassAccuracy === undefined || reading.webkitCompassAccuracy >= 0);
  const correction = hasCompass ? compass + alpha : 0;
  return {heading: wrapHeading(Math.atan2(east, north) / rad + correction), pitch: Math.asin(Math.max(-1, Math.min(1, up))) / rad, absolute: hasCompass || reading.absolute === true};
}
