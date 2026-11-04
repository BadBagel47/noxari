import {SurfaceComparison} from './surfaceComparison';
import {SkyPerformance, type PerformanceInput} from './skyPerformance';

export type SkyFrameRenderer = (now: number) => boolean;
type FrameHost = {
  request: (callback: FrameRequestCallback) => number;
  cancel: (id: number) => void;
  commit: (updates: () => void) => void;
};

/** One frame owns input publication, the matching DOM commit, and sky drawing. */
export class SkyFrames {
  readonly comparison: SurfaceComparison;
  private requestedAt: number | null = null;
  get activePerformance() { return this.comparison.recorder ?? this.performance; }
  private pending: number | null = null;
  private running = false;
  private dirty = false;
  private animating = false;
  private renderer: SkyFrameRenderer | null = null;
  private updates = new Map<symbol, () => void>();

  constructor(private host: FrameHost, readonly performance = new SkyPerformance()) { this.comparison = new SurfaceComparison(performance); }

  enqueue(key: symbol, update: () => void, source?: PerformanceInput) {
    if (source && !this.running) this.performance.input(key, source);
    this.updates.set(key, update);
    this.request();
  }

  cancelUpdate(key: symbol) {
    this.performance.cancelInput(key);
    this.updates.delete(key);
    this.cancelIfIdle();
  }

  setRenderer(renderer: SkyFrameRenderer) {
    this.renderer = renderer;
    this.invalidate();
  }

  invalidate() {
    this.dirty = true;
    this.request();
  }

  clearRenderer() {
    this.comparison.cancel('view-unavailable');
    this.performance.stop('view-unavailable');
    this.renderer = null;
    this.dirty = this.animating = false;
    this.cancelIfIdle();
  }

  reset() {
    this.comparison.cancel('reset');
    this.performance.stop('reset');
    if (this.pending !== null) this.host.cancel(this.pending);
    this.pending = null;
    this.updates.clear();
    this.renderer = null;
    this.dirty = this.animating = false;
  }

  private cancelIfIdle() {
    if (!this.updates.size && !this.dirty && !this.animating && !this.comparison.active && this.pending !== null) {
      this.host.cancel(this.pending);
      this.pending = null;
    }
  }

  private request() {
    if (this.pending === null && !this.running) {
      this.requestedAt = this.comparison.active ? this.comparison.now() : this.performance.timestamp();
      this.pending = this.host.request(this.tick);
    }
  }

  private tick = (now: number) => {
    const callback = this.comparison.active ? this.comparison.now() : this.performance.timestamp();
    const requested = this.requestedAt;
    this.pending = null;
    this.running = true;
    this.animating = false;
    this.comparison.beforeFrame(callback ?? now);
    const recorder = this.activePerformance;
    const measurement = recorder.beginFrame(callback === null ? undefined : {requested, callback, rafTimestamp: now});
    const hadUpdates = this.updates.size > 0;
    let failed = true;
    try {
      // Publication can stage camera/zoom state in this same commit. Layout
      // effects install the renderer for the committed pose before it is drawn.
      if (this.updates.size) this.host.commit(() => {
        while (this.updates.size) {
          const updates = [...this.updates.values()];
          this.updates.clear();
          for (const update of updates) update();
        }
      });
      measurement?.committed(hadUpdates);
      this.dirty = false;
      this.animating = this.renderer?.(now) ?? false;
      failed = false;
    } finally {
      recorder.endFrame(measurement, this.animating || this.comparison.active, failed);
      this.comparison.afterFrame(failed);
      this.running = false;
      if (this.updates.size || this.dirty || this.animating || this.comparison.needsFrame) this.request();
    }
  };
}
