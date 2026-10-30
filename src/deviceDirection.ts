import type {ViewDirection} from './skyProjection';

export type OrientationReading = {
  alpha: number | null; beta: number | null; gamma: number | null;
  absolute?: boolean; webkitCompassHeading?: number; webkitCompassAccuracy?: number;
};
export const wrapHeading = (angle: number) => (angle % 360 + 360) % 360;

export function orientationSampleTime(stamp: number, now: number, timeOrigin: number) {
  const value = stamp > 1e12 ? stamp - timeOrigin : stamp;
  return Number.isFinite(value) && value >= 0 && value <= now + 5 ? value : now;
}

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
  const pitch = Math.asin(Math.max(-1, Math.min(1, up))) / rad;
  return {heading: wrapHeading(Math.atan2(east, north) / rad + correction), pitch: Math.abs(pitch) < 1e-10 ? 0 : pitch, absolute: hasCompass || reading.absolute === true};
}

type Direction = NonNullable<ReturnType<typeof deviceDirection>>;
type Sample = {value: Direction; raw: Direction; at: number; frame: boolean; independent: boolean};
export type DirectionDiagnostics = {
  motionSource: 'relative' | 'earth' | 'compass' | 'none';
  reference: 'none' | 'compass' | 'manual';
  referenceAgeMs: number | null;
  check: 'waiting' | 'no-compass' | 'manual-only' | 'checking' | 'consistent' | 'compass-only' | 'uncertain';
  reason: 'reference-changed' | 'source-changed' | 'disagreement' | null;
  differenceDegrees: number | null;
  compassReady: boolean;
  motionAgeMs: number | null;
  compassAgeMs: number | null;
};
const delta = (a: number, b: number) => (a - b + 540) % 360 - 180;
const fresh = (sample: Sample | null, now: number) => Boolean(sample && now - sample.at >= 0 && now - sample.at <= 500);

// Relative motion drives the view. Absolute readings independently check its
// reference; they never continuously pull a settled view back toward north.
export class PhoneDirectionTracker {
  private motion: Sample | null = null;
  private compass: Sample | null = null;
  private motionHistory: Sample[] = [];
  private compassHistory: Sample[] = [];
  private fallbackHistory: Sample[] = [];
  private northOffset: number | null = null;
  private origin: DirectionDiagnostics['reference'] = 'none';
  private referenceAt = 0;
  private compassBias: number | null = null;
  private uncertain: DirectionDiagnostics['reason'] = null;
  private mismatchSince: number | null = null;
  private lastMismatchAt: number | null = null;

  private append(history: Sample[], sample: Sample) {
    // Privacy-reduced browser clocks can give successive events equal stamps.
    // Keep the newest pose without counting duplicates as a stability window.
    if (history[history.length - 1]?.at === sample.at) history[history.length - 1] = sample;
    else history.push(sample);
    while (history.length > 240 || history[0].at < sample.at - 2400) history.shift();
  }
  private stable(history: Sample[], now: number, maxAge = 500) {
    const last = history[history.length - 1];
    if (!last || now - last.at < 0 || now - last.at > maxAge) return false;
    const window = history.filter(sample => sample.at >= last.at - 1200);
    return window.length >= 2 && last.at - window[0].at >= 800
      && window.every(sample => Math.abs(delta(sample.value.heading, last.value.heading)) <= 3 && Math.abs(sample.value.pitch - last.value.pitch) <= 3);
  }
  private paired(now: number) {
    return Boolean(this.motion && this.compass && fresh(this.motion, now) && fresh(this.compass, now)
      && Math.abs(this.motion.at - this.compass.at) <= 150
      && Math.abs(this.motion.value.pitch) < 75 && Math.abs(this.compass.value.pitch) < 75
      && Math.abs(this.motion.value.pitch - this.compass.value.pitch) <= 8);
  }
  private compassReady(now: number) {
    return this.motion
      ? this.paired(now) && this.stable(this.motionHistory, now) && this.stable(this.compassHistory, now)
      : fresh(this.compass, now) && this.stable(this.fallbackHistory, now) && this.stable(this.compassHistory, now);
  }
  private invalidate(reason: NonNullable<DirectionDiagnostics['reason']>) {
    this.uncertain ??= reason;
    this.mismatchSince = null;
    this.lastMismatchAt = null;
  }
  private anchor(offset: number, origin: 'compass' | 'manual', now: number) {
    this.northOffset = wrapHeading(offset); this.origin = origin; this.referenceAt = now;
    this.uncertain = null; this.mismatchSince = null;
    this.lastMismatchAt = null;
  }

  update(reading: OrientationReading, source: string, at = performance.now(), now = at): ReturnType<typeof deviceDirection> {
    if (!Number.isFinite(at) || !Number.isFinite(now) || at > now + 5) return null;
    const raw = deviceDirection({...reading, webkitCompassHeading: undefined});
    const referenced = deviceDirection(reading);
    if (!raw || !referenced) return null;
    const sample: Sample = {value: raw, raw, at, frame: reading.absolute === true,
      independent: source !== 'deviceorientation' || typeof reading.webkitCompassHeading === 'number'};
    const isMotion = source === 'deviceorientation';
    const before = this.northOffset;
    if (isMotion) {
      if (this.motion && at < this.motion.at) return null;
      if (!this.motion && this.compass && this.northOffset !== null) {
        // Preserve the last display direction during a late source handoff,
        // but do not silently trust a reference from a different pose/frame.
        this.northOffset = wrapHeading(this.compass.raw.heading + this.northOffset - raw.heading);
        this.invalidate('source-changed');
      }
      if (this.motion && this.northOffset !== null && sample.frame !== this.motion.frame
        && Math.abs(raw.pitch) < 75 && Math.abs(this.motion.value.pitch) < 75
        && Math.abs(delta(raw.heading, this.motion.value.heading)) > 30) {
        this.invalidate('reference-changed');
        this.motionHistory = [];
      }
      this.motion = sample;
      this.append(this.motionHistory, sample);
    }
    const accuracy = reading.webkitCompassAccuracy;
    const badCompass = typeof reading.webkitCompassHeading === 'number' && accuracy !== undefined && (accuracy < 0 || accuracy > 25);
    if (referenced.absolute && !badCompass && (!this.compass || at > this.compass.at
      || (at === this.compass.at && (sample.independent || !this.compass.independent)))) {
      this.compass = {...sample, value: referenced};
      this.append(this.compassHistory, this.compass);
      this.append(this.fallbackHistory, sample);
    }
    this.evaluate(now);
    return isMotion || !this.motion || before !== this.northOffset ? this.direction() : null;
  }

  private evaluate(now: number) {
    const primary = this.motion ?? this.compass;
    if (this.northOffset === null && !this.uncertain && primary && this.compassReady(now)) {
      this.anchor(this.compass!.value.heading - primary.raw.heading, 'compass', now);
      this.compassBias = 0;
    }
    if (this.northOffset === null || this.uncertain || !this.motion || this.compassBias === null || !this.compass?.independent) return;
    if (!this.compassReady(now)) {
      // Sparse compass streams may leave gaps between valid pairs. Keep only
      // recent evidence while both poses remain stable; motion cancels it.
      if (!this.stable(this.motionHistory, now) || !this.stable(this.compassHistory, now, 1500)
        || this.lastMismatchAt === null || now - this.lastMismatchAt > 1500) {
        this.mismatchSince = null; this.lastMismatchAt = null;
      }
      return;
    }
    const difference = Math.abs(delta(this.motion.value.heading + this.northOffset, this.compass!.value.heading + this.compassBias));
    if (difference < 20) { this.mismatchSince = null; this.lastMismatchAt = null; return; }
    this.mismatchSince ??= now;
    this.lastMismatchAt = now;
    if (now - this.mismatchSince >= 1500) this.invalidate('disagreement');
  }

  alignNorth(now = performance.now()): ReturnType<typeof deviceDirection> {
    const primary = this.motion ?? this.compass;
    if (!primary || !fresh(primary, now)) return null;
    this.anchor(-primary.raw.heading, 'manual', now);
    // A manual true-north reference may deliberately differ from magnetic
    // north. Capture that bias only from fresh, stationary paired readings.
    this.compassBias = this.compassReady(now) ? delta(0, this.compass!.value.heading) : null;
    return this.direction();
  }

  useCompass(now = performance.now()): ReturnType<typeof deviceDirection> {
    if (!this.compassReady(now)) return null;
    const primary = this.motion ?? this.compass!;
    this.anchor(this.compass!.value.heading - primary.raw.heading, 'compass', now);
    this.compassBias = 0;
    return this.direction();
  }

  diagnostics(now = performance.now()): DirectionDiagnostics {
    this.evaluate(now);
    const primary = this.motion ?? this.compass;
    const paired = this.paired(now);
    const difference = paired && this.compass?.independent && this.northOffset !== null && this.compassBias !== null
      ? delta(this.motion!.value.heading + this.northOffset, this.compass!.value.heading + this.compassBias) : null;
    const check: DirectionDiagnostics['check'] = this.uncertain ? 'uncertain' : !primary ? 'waiting'
      : !this.motion ? 'compass-only' : !fresh(this.compass, now) ? 'no-compass' : !this.compass?.independent ? 'compass-only'
      : this.origin === 'manual' && this.compassBias === null ? 'manual-only'
      : this.northOffset !== null && this.compassReady(now) && difference !== null && Math.abs(difference) < 20 ? 'consistent' : 'checking';
    return {motionSource: this.motion ? this.motion.frame ? 'earth' : 'relative' : this.compass ? 'compass' : 'none',
      reference: this.origin, referenceAgeMs: this.origin === 'none' ? null : Math.max(0, now - this.referenceAt),
      check, reason: this.uncertain, differenceDegrees: difference, compassReady: this.compassReady(now),
      motionAgeMs: primary ? Math.max(0, now - primary.at) : null,
      compassAgeMs: this.compass ? Math.max(0, now - this.compass.at) : null};
  }

  private direction(): ReturnType<typeof deviceDirection> {
    const primary = this.motion ?? this.compass;
    return primary && {heading: wrapHeading(primary.raw.heading + (this.northOffset ?? 0)), pitch: primary.raw.pitch,
      absolute: this.northOffset !== null && !this.uncertain};
  }
}
