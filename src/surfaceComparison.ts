import {SkyPerformance, type PerformanceScene} from './skyPerformance';
import type {ViewDirection} from './skyProjection';

export type SurfacePolicy = 'auto' | 'exact' | 'retained';
export type ComparisonStop = 'complete' | 'manual' | 'user-interaction' | 'page-hidden' | 'view-unavailable' | 'scene-changed' | 'gpu-unavailable' | 'time-limit' | 'frame-error' | 'reset';
type Status = {active: boolean; pass: number; phase: 'idle' | 'warmup' | 'measure' | 'complete' | 'cancelled'; reason: ComparisonStop | null};
type Renderer = {reset: (policy: SurfacePolicy) => boolean; policy: () => SurfacePolicy | null};
type Bindings = {apply: (view: ViewDirection) => void; restore: () => void};
const order = ['exact', 'retained', 'retained', 'exact'] as const;
export const comparisonWarmFrames = 84;
export const comparisonMeasureFrames = 240;
const STEP_MS = 1000 / 60;

/** A fixed simulation clock/path, independent of actual RAF cadence. */
export function comparisonPose(step: number): ViewDirection {
  if (step < comparisonWarmFrames) {
    return step < 24 ? {heading: 180 + step * .25, pitch: 31} : {heading: 180, pitch: 31};
  }
  const frame = step - comparisonWarmFrames;
  const t = frame < 60 ? frame / 59 : frame < 120 ? 1 : frame < 180 ? 1 - (frame - 120) / 59 : 0;
  return {heading: 180 + 30 * t, pitch: 31 - 50 * t};
}

/** Bounded opt-in controller. SkyFrames calls it; it owns no RAF or sensor input. */
export class SurfaceComparison {
  static readonly maxDurationMs = 60_000;
  private status: Status = {active: false, pass: 0, phase: 'idle', reason: null};
  private listeners = new Set<() => void>();
  private renderer: Renderer | null = null;
  private bindings: Bindings | null = null;
  private pass = 0;
  private step = 0;
  private resetPending = false;
  private started = 0;
  private stopped = 0;
  private createdAt = '';
  private deadline: ReturnType<typeof setTimeout> | null = null;
  private identity: string | null = null;
  private configuration: Record<string, number | string | boolean> | null = null;
  private invalid: ComparisonStop | null = null;
  private sourceMode = '';
  private runs: {policy: 'exact' | 'retained'; complete: boolean; log: SkyPerformance}[] = [];
  private log: SkyPerformance | null = null;
  private inputKey = Symbol('scripted view');
  constructor(readonly ordinary: SkyPerformance, private clock: () => number = () => performance.now()) {}
  get active() { return this.status.active; }
  get recorder() { return this.log; }
  get needsFrame() { return this.active; }
  get simulationTime() { return this.step * STEP_MS; }
  get passIndex() { return this.pass; }
  now() { return this.clock(); }
  getSnapshot = () => this.status;
  subscribe = (listener: () => void) => {this.listeners.add(listener);return () => {this.listeners.delete(listener);};};
  private notify(status: Status) {this.status = status;for (const listener of this.listeners) listener();}
  attach(renderer: Renderer) {this.renderer = renderer;}
  detach() {this.cancel('view-unavailable');this.renderer = null;}

  start(bindings: Bindings, sourceMode: 'live' | 'fixed' | 'preview') {
    if (this.active || this.ordinary.active || !this.renderer || this.ordinary.scene?.backend !== 'gpu' || this.ordinary.scene.following || !this.ordinary.scene.width || !this.ordinary.scene.height) return false;
    this.invalid = null;this.bindings = bindings;this.sourceMode = sourceMode;
    this.pass = this.step = 0;this.resetPending = true;this.runs = [];this.log = null;
    this.identity = null;this.configuration = null;this.started = this.stopped = this.clock();this.createdAt = new Date().toISOString();
    this.deadline = setTimeout(() => this.cancel('time-limit'), SurfaceComparison.maxDurationMs);
    this.notify({active: true, pass: 1, phase: 'warmup', reason: null});return true;
  }

  beforeFrame(now: number) {
    if (!this.active) return;
    if (now - this.started >= SurfaceComparison.maxDurationMs) {this.cancel('time-limit');return;}
    if (this.resetPending) {
      this.resetPending = false;
      if (!this.renderer?.reset(order[this.pass])) {this.cancel('gpu-unavailable');return;}
    }
    if (this.step === comparisonWarmFrames) {
      this.log = new SkyPerformance(this.ordinary.build, this.clock);
      this.log.scene = this.ordinary.scene;
      if (!this.log.start()) {this.cancel('scene-changed');return;}
      this.notify({active: true, pass: this.pass + 1, phase: 'measure', reason: null});
    }
    this.log?.input(this.inputKey, 'scripted-view');
    this.bindings?.apply(comparisonPose(this.step));
  }

  validateScene(scene: PerformanceScene, privateSceneIdentity: string, nativeDpr: number) {
    if (!this.active) return;
    if (scene.backend !== 'gpu' || this.renderer?.policy() !== order[this.pass]) {this.invalid = 'gpu-unavailable';return;}
    if (scene.following) {this.invalid = 'scene-changed';return;}
    const configuration = {width: scene.width, height: scene.height, nativeDpr, zoom: scene.zoom,
      layerMask: scene.layerMask, figureMode: scene.figureMode, starCount: scene.starCount,
      reducedMotion: scene.reducedMotion, timeMode: scene.timeMode};
    const identity = privateSceneIdentity + JSON.stringify(configuration);
    if (this.identity === null) {this.identity = identity;this.configuration = configuration;}
    else if (identity !== this.identity) this.invalid = 'scene-changed';
  }

  afterFrame(error: boolean) {
    if (!this.active) return;
    if (this.invalid) {this.finish(this.invalid);return;}
    if (error) {this.cancel('frame-error');return;}
    if (this.log && !this.log.active) {this.cancel('time-limit');return;}
    if (++this.step < comparisonWarmFrames + comparisonMeasureFrames) return;
    this.log!.stop('manual');this.runs.push({policy: order[this.pass], complete: true, log: this.log!});this.log = null;
    if (++this.pass === order.length) {this.finish('complete');return;}
    this.step = 0;this.resetPending = true;
    this.notify({active: true, pass: this.pass + 1, phase: 'warmup', reason: null});
  }

  cancel(reason: Exclude<ComparisonStop, 'complete'>) {if (this.active) this.finish(reason);}
  private finish(reason: ComparisonStop) {
    if (this.deadline !== null) clearTimeout(this.deadline);this.deadline = null;
    this.stopped = this.clock();
    if (this.log) {this.log.stop('manual');this.runs.push({policy: order[this.pass], complete: false, log: this.log});this.log = null;}
    const bindings = this.bindings;this.bindings = null;
    // Set inactive before restoring so all ordinary view/quality paths resume.
    this.status = {...this.status, active: false};
    this.renderer?.reset('auto');
    bindings?.restore();
    this.notify({active: false, pass: Math.min(this.pass + 1, 4), phase: reason === 'complete' ? 'complete' : 'cancelled', reason});
  }

  snapshot() {
    return {application: 'Noxari', kind: 'surface-comparison', reportVersion: 1, build: {...this.ordinary.build}, createdAt: this.createdAt,
      active: this.active, reason: this.status.reason, valid: this.status.reason === 'complete' && this.runs.length === 4 && this.runs.every(run => run.complete),
      durationMs: Math.round((this.active ? this.clock() : this.stopped) - this.started),
      method: {path: 'surface-sweep-v1', input: 'scripted-view', order: [...order], warmupFrames: comparisonWarmFrames,
        measuredFrames: comparisonMeasureFrames, simulationStepMs: STEP_MS, maxDurationMs: SurfaceComparison.maxDurationMs, sourceTimeMode: this.sourceMode},
      configuration: this.configuration ? {...this.configuration} : null,
      definitions: {motion: 'Fixed frame-indexed pose/animation/quality path; automated, not physical touch or sensors. Warmup is excluded.',
        timing: 'Real monotonic command/callback/request wait times. Not GPU completion, displayed FPS or physical input latency.',
        scene: 'Observation time/location/layers held during the test. Scene identity and original view are private and not serialized.',
        policy: 'Each pass recreates GPU resources, warms both densities and starts from the same pose/quality/reveal state. Original automatic policy and view/time mode are restored.',
        limitations: 'Paired order reduces warm/order bias but does not remove thermal/browser/refresh-rate variation. Recording adds bounded work. No automatic winner or production policy change.'},
      runs: this.runs.map(run => ({policy: run.policy, complete: run.complete, report: run.log.snapshot()}))};
  }
}
