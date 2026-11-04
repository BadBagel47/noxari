import {SkyPerformance, type PerformanceInput} from './skyPerformance';

export type SkyFrameRenderer = (now: number) => boolean;
type FrameHost = {
  request: (callback: FrameRequestCallback) => number;
  cancel: (id: number) => void;
  commit: (updates: () => void) => void;
};

/** One frame owns input publication, the matching DOM commit, and sky drawing. */
export class SkyFrames {
  private pending: number | null = null;
  private running = false;
  private dirty = false;
  private animating = false;
  private renderer: SkyFrameRenderer | null = null;
  private updates = new Map<symbol, () => void>();

  constructor(private host: FrameHost, readonly performance = new SkyPerformance()) {}

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
    this.performance.stop('view-unavailable');
    this.renderer = null;
    this.dirty = this.animating = false;
    this.cancelIfIdle();
  }

  reset() {
    this.performance.stop('reset');
    if (this.pending !== null) this.host.cancel(this.pending);
    this.pending = null;
    this.updates.clear();
    this.renderer = null;
    this.dirty = this.animating = false;
  }

  private cancelIfIdle() {
    if (!this.updates.size && !this.dirty && !this.animating && this.pending !== null) {
      this.host.cancel(this.pending);
      this.pending = null;
    }
  }

  private request() {
    if (this.pending === null && !this.running) this.pending = this.host.request(this.tick);
  }

  private tick = (now: number) => {
    this.pending = null;
    this.running = true;
    this.animating = false;
    const measurement = this.performance.beginFrame();
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
      this.performance.endFrame(measurement, this.animating, failed);
      this.running = false;
      if (this.updates.size || this.dirty || this.animating) this.request();
    }
  };
}
