export const PERFORMANCE_STAGES = ['background', 'milkyWay', 'grid', 'boundaries', 'figures', 'stars', 'labels', 'ground'] as const;
export type PerformanceStage = typeof PERFORMANCE_STAGES[number];
export type PerformanceInput = 'manual-view' | 'zoom' | 'phone-publication' | 'scripted-view';
export type PerformanceStop = 'manual' | 'time-limit' | 'frame-limit' | 'context-limit' | 'page-hidden' | 'view-unavailable' | 'reset';
export type PerformanceScene = {
  backend: 'gpu' | 'canvas'; reason: string; driver: string; preference: string;
  width: number; height: number; dpr: number; zoom: number; starCount: number;
  starsVisible: boolean; milkyWayVisible: boolean; belowHorizon: boolean;
  layerMask: number; figureMode: string; following: boolean; reducedMotion: boolean; timeMode: string;
};
type Input = {source: PerformanceInput; first: number; last: number; count: number};
type Status = {active: boolean; frames: number; reason: PerformanceStop | null};
const round = (n: number) => Math.round(Math.max(0, n) * 1000) / 1000;
const summary = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {count: sorted.length, median: sorted.length ? sorted[Math.floor(sorted.length * .5)] : null,
    p95: sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * .95) - 1)] : null,
    max: sorted.length ? sorted[sorted.length - 1] : null};
};

export type FrameSchedule = {requested: number | null; callback: number; rafTimestamp: number};

export class PerformanceFrame {
  readonly started: number;
  commitMs = 0;
  drawStarted: number | null = null;
  cursor = 0;
  copyMs = 0;
  copyCalls = 0;
  backendAtStart: 'gpu' | 'canvas' | null = null;
  readonly stages = Object.fromEntries(PERFORMANCE_STAGES.map(key => [key, 0])) as Record<PerformanceStage, number>;
  constructor(readonly clock: () => number, readonly inputs: Input[], readonly schedule?: FrameSchedule) { this.started = clock(); }
  committed(hasUpdates: boolean) { if (hasUpdates) this.commitMs = this.clock() - this.started; }
  beginDraw(backend: 'gpu' | 'canvas') { this.backendAtStart = backend;this.cursor = this.drawStarted = this.clock(); }
  phase(stage: PerformanceStage) { const now = this.clock();this.stages[stage] += now - this.cursor;this.cursor = now; }
}

type Sample = {
  atMs: number; zoom: number; context: number; animationPending: boolean; error: boolean; backendAtStart: 'gpu' | 'canvas';
  cadenceIntervalMs: number | null; requestToDrawEndMs: number | null; oldestRequestToDrawEndMs: number | null;
  latestRequestWaitMs: number | null; commitMs: number; drawMs: number; frameTaskMs: number;
  rafWaitMs: number | null; callbackAgeMs: number | null; callbackToFrameStartMs: number | null; callbackToDrawEndMs: number | null; bookkeepingMs: number;
  stagesMs: Record<PerformanceStage, number>; gpuCopySubmissionMs: number; gpuCopyCalls: number;
  inputs: Record<PerformanceInput, number>;
};

/** Opt-in, bounded diagnostics. No RAF, per-frame UI publication, GPU synchronization or storage. */
export class SkyPerformance {
  static readonly maxFrames = 1200;
  static readonly maxDurationMs = 30_000;
  static readonly maxContexts = 64;
  scene: PerformanceScene | null = null;
  current: PerformanceFrame | null = null;
  private status: Status = {active: false, frames: 0, reason: null};
  private listeners = new Set<() => void>();
  private inputs = new Map<symbol, Input>();
  private samples: Sample[] = [];
  private contexts: Omit<PerformanceScene, 'zoom'>[] = [];
  private contextIndices = new Map<string, number>();
  private previous: {started: number; ended: number; animation: boolean} | null = null;
  private started = 0;
  private stopped = 0;
  private cancelledRequests = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private createdAt = '';
  private shownBackend: string | null = null;
  private shownReason: string | null = null;
  constructor(readonly build = {commit: 'unknown', dirty: false}, private clock: () => number = () => performance.now()) {}
  get active() { return this.status.active; }
  getSnapshot = () => this.status;
  subscribe = (listener: () => void) => { this.listeners.add(listener);return () => { this.listeners.delete(listener); }; };
  private notify(status: Status) { this.status = status;for (const listener of this.listeners) listener(); }

  sceneChanged() {
    const backend = this.scene?.backend ?? null, reason = this.scene?.reason ?? null;
    if (backend !== this.shownBackend || reason !== this.shownReason) {
      this.shownBackend = backend;this.shownReason = reason;this.notify({...this.status});
    }
  }
  start() {
    if (this.active || !this.scene || this.scene.width <= 0 || this.scene.height <= 0) return false;
    this.samples = [];this.contexts = [];this.contextIndices.clear();this.previous = null;this.inputs.clear();
    this.current = null;this.cancelledRequests = 0;this.started = this.stopped = this.clock();this.createdAt = new Date().toISOString();
    this.timer = setTimeout(() => this.stop('time-limit'), SkyPerformance.maxDurationMs);
    this.notify({active: true, frames: 0, reason: null});return true;
  }
  stop(reason: PerformanceStop) {
    if (!this.active) return;
    this.stopped = this.clock();
    if (this.timer !== null) clearTimeout(this.timer);this.timer = null;
    this.inputs.clear();this.current = null;
    this.notify({active: false, frames: this.samples.length, reason});
  }
  detachScene(scene?: PerformanceScene) {
    if (scene && this.scene !== scene) return;
    this.stop('view-unavailable');this.scene = null;this.sceneChanged();
  }
  input(key: symbol, source: PerformanceInput) {
    if (!this.active) return;
    const now = this.clock(), previous = this.inputs.get(key);
    if (previous) { previous.last = now;previous.count++; }
    else this.inputs.set(key, {source, first: now, last: now, count: 1});
  }
  cancelInput(key: symbol) {
    if (!this.active) return;
    this.cancelledRequests += this.inputs.get(key)?.count ?? 0;this.inputs.delete(key);
  }
  timestamp() { return this.active ? this.clock() : null; }
  beginFrame(schedule?: FrameSchedule) {
    if (!this.active) return null;
    if (this.clock() - this.started >= SkyPerformance.maxDurationMs) { this.stop('time-limit');return null; }
    this.current = new PerformanceFrame(this.clock, [...this.inputs.values()], schedule);this.inputs.clear();return this.current;
  }
  endFrame(frame: PerformanceFrame | null, animation: boolean, error: boolean) {
    this.current = null;
    if (!frame || !this.active || frame.drawStarted === null || !frame.backendAtStart || !this.scene) return;
    const ended = this.clock(), scene = this.scene;
    // Explicit allowlist: no date/place, view direction, object IDs, sensor readings or search state.
    const context: Omit<PerformanceScene, 'zoom'> = {backend: scene.backend, reason: scene.reason, driver: scene.driver, preference: scene.preference,
      width: scene.width, height: scene.height, dpr: scene.dpr, starCount: scene.starCount,
      starsVisible: scene.starsVisible, milkyWayVisible: scene.milkyWayVisible, belowHorizon: scene.belowHorizon,
      layerMask: scene.layerMask, figureMode: scene.figureMode, following: scene.following, reducedMotion: scene.reducedMotion, timeMode: scene.timeMode};
    const key = JSON.stringify(context);
    let contextIndex = this.contextIndices.get(key);
    if (contextIndex === undefined) {
      if (this.contexts.length >= SkyPerformance.maxContexts) { this.stop('context-limit');return; }
      contextIndex = this.contexts.length;this.contexts.push(context);this.contextIndices.set(key, contextIndex);
    }
    const first = frame.inputs.length ? Math.min(...frame.inputs.map(i => i.first)) : null;
    const last = frame.inputs.length ? Math.max(...frame.inputs.map(i => i.last)) : null;
    // An idle pause is not a dropped display frame. Retain long stalls when a request arrived promptly.
    const continuous = this.previous && (this.previous.animation || (first !== null && first - this.previous.ended <= 120));
    const sources = {'manual-view': 0, zoom: 0, 'phone-publication': 0, 'scripted-view': 0};
    for (const input of frame.inputs) sources[input.source] += input.count;
    this.samples.push({atMs: round(frame.started - this.started), zoom: round(scene.zoom), context: contextIndex,
      animationPending: animation, error, backendAtStart: frame.backendAtStart,
      cadenceIntervalMs: continuous ? round(frame.started - this.previous!.started) : null,
      requestToDrawEndMs: last === null ? null : round(ended - last),
      oldestRequestToDrawEndMs: first === null ? null : round(ended - first), latestRequestWaitMs: last === null ? null : round(frame.started - last),
      commitMs: round(frame.commitMs), drawMs: round(ended - frame.drawStarted), frameTaskMs: round(ended - frame.started),
      rafWaitMs: frame.schedule?.requested == null ? null : round(frame.schedule.callback - frame.schedule.requested),
      callbackAgeMs: frame.schedule ? round(frame.schedule.callback - frame.schedule.rafTimestamp) : null,
      callbackToFrameStartMs: frame.schedule ? round(frame.started - frame.schedule.callback) : null,
      callbackToDrawEndMs: frame.schedule ? round(ended - frame.schedule.callback) : null, bookkeepingMs: 0,
      stagesMs: Object.fromEntries(PERFORMANCE_STAGES.map(stage => [stage, round(frame.stages[stage])])) as Record<PerformanceStage, number>,
      gpuCopySubmissionMs: round(frame.copyMs), gpuCopyCalls: frame.copyCalls, inputs: sources});
    this.samples[this.samples.length - 1].bookkeepingMs = round(this.clock() - ended);
    this.previous = {started: frame.started, ended, animation};
    if (this.samples.length >= SkyPerformance.maxFrames) this.stop('frame-limit');
  }
  snapshot() {
    const samples = this.samples;
    const nullable = (key: 'cadenceIntervalMs' | 'requestToDrawEndMs' | 'oldestRequestToDrawEndMs' | 'latestRequestWaitMs' | 'rafWaitMs' | 'callbackAgeMs' | 'callbackToFrameStartMs' | 'callbackToDrawEndMs') => samples.flatMap(s => s[key] === null ? [] : [s[key]!]);
    return {application: 'Noxari', reportVersion: 2, kind: 'sky-performance', build: {...this.build}, createdAt: this.createdAt,
      active: this.active, stopReason: this.status.reason, durationMs: round((this.active ? this.clock() : this.stopped) - this.started),
      limits: {frames: SkyPerformance.maxFrames, durationMs: SkyPerformance.maxDurationMs, contexts: SkyPerformance.maxContexts},
      definitions: {schedule: 'RAF request to callback entry, callback entry minus RAF timestamp, callback preparation and callback entry to synchronous command completion (before bookkeeping/controller handoff). Not displayed FPS or GPU completion. Bookkeeping measures sample collection after command end.',
        request: 'Accepted manual-view/zoom/phone-publication queue request or controlled scripted-view request; before shared commit. Not physical input arrival; event-handler work before enqueue and sensor-fusion timing are excluded.',
        latency: 'Latest accepted request to synchronous drawing-command completion. Not GPU completion, displayed-frame latency or presented FPS.',
        commit: 'Only the shared queue flushSync commit; other React updates and browser layout/paint are not fully attributed. Short timings can be quantized to zero by the browser clock.',
        cadence: 'Consecutive scheduled horizon draws with animation pending or a request arriving within 120 ms of the previous draw end. Idle gaps excluded.',
        copies: 'Synchronous GPU-to-Canvas drawImage submission, included in Milky Way/star stage totals; not separate GPU execution time.',
        privacy: 'No GPS coordinates, location names, selected time, sky directions, object IDs, raw sensors, URL or user agent.',
        overhead: 'Opt-in clock reads and bounded in-memory collection. No extra RAF, per-frame UI refresh, readPixels, finish or GPU timing queries.'},
      summary: {rafWaitMs: summary(nullable('rafWaitMs')), callbackAgeMs: summary(nullable('callbackAgeMs')),
        callbackToFrameStartMs: summary(nullable('callbackToFrameStartMs')), callbackToDrawEndMs: summary(nullable('callbackToDrawEndMs')), bookkeepingMs: summary(samples.map(s => s.bookkeepingMs)), frames: samples.length, cadenceMs: summary(nullable('cadenceIntervalMs')), intervalsOver25Ms: nullable('cadenceIntervalMs').filter(n => n > 25).length,
        requestToDrawEndMs: summary(nullable('requestToDrawEndMs')), oldestRequestToDrawEndMs: summary(nullable('oldestRequestToDrawEndMs')),
        latestRequestWaitMs: summary(nullable('latestRequestWaitMs')), commitMs: summary(samples.map(s => s.commitMs)), drawMs: summary(samples.map(s => s.drawMs)),
        stagesMs: Object.fromEntries(PERFORMANCE_STAGES.map(stage => [stage, summary(samples.map(s => s.stagesMs[stage]))])),
        gpuCopySubmissionMs: summary(samples.map(s => s.gpuCopySubmissionMs)), cancelledRequests: this.cancelledRequests},
      contexts: this.contexts.map(c => ({...c})), frames: samples.map(s => ({...s, stagesMs: {...s.stagesMs}, inputs: {...s.inputs}}))};
  }
}
