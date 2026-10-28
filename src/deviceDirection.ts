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

// Use the compass to establish north once, then follow rotation from the same
// event stream. Reapplying its slowly settling heading on every sample makes
// the view retreat after a turn even when the orientation angles are steady.
export class PhoneDirectionTracker {
  private source: string | null = null;
  private northOffset: number | null = null;
  private rotation: ViewDirection | null = null;
  private relative = false;

  update(reading: OrientationReading, source: string): ReturnType<typeof deviceDirection> {
    const raw = deviceDirection({...reading, webkitCompassHeading: undefined});
    const referenced = deviceDirection(reading);
    if (!raw || !referenced) return null;
    const relative = source === 'deviceorientation' && (!referenced.absolute || (this.relative && this.source === source));
    // Android's relative (game rotation) stream avoids the magnetometer's
    // settling corrections. Absolute readings only establish its north offset.
    if (this.relative && !relative) {
      if (this.northOffset === null && referenced.absolute && this.rotation) {
        this.northOffset = wrapHeading(referenced.heading - this.rotation.heading);
        return this.direction();
      }
      return null;
    }
    if (relative && !this.relative && this.rotation) {
      const previous = this.direction()!;
      this.source = source;
      this.relative = true;
      this.rotation = raw;
      if (this.northOffset !== null) this.northOffset = wrapHeading(previous.heading - raw.heading);
      return this.direction();
    }
    // Before north is established we can upgrade to an absolute stream.
    // Once following, never alternate between independent sensor estimates.
    if (this.source !== null && this.source !== source && !(this.northOffset === null && referenced.absolute)) return null;
    this.source = source;
    this.relative = relative;
    this.rotation = raw;
    if (this.northOffset === null && referenced.absolute) this.northOffset = wrapHeading(referenced.heading - raw.heading);
    return this.direction();
  }

  alignNorth(): ReturnType<typeof deviceDirection> {
    if (!this.rotation) return null;
    this.northOffset = -this.rotation.heading;
    return this.direction();
  }

  private direction(): ReturnType<typeof deviceDirection> {
    return this.rotation && {
      heading: wrapHeading(this.rotation.heading + (this.northOffset ?? 0)),
      pitch: this.rotation.pitch,
      absolute: this.northOffset !== null,
    };
  }
}
