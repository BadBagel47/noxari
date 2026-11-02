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

  constructor(private host: FrameHost) {}

  enqueue(key: symbol, update: () => void) {
    this.updates.set(key, update);
    this.request();
  }

  cancelUpdate(key: symbol) {
    this.updates.delete(key);
    this.cancelIfIdle();
  }

  setRenderer(renderer: SkyFrameRenderer) {
    this.renderer = renderer;
    this.dirty = true;
    this.request();
  }

  clearRenderer() {
    this.renderer = null;
    this.dirty = this.animating = false;
    this.cancelIfIdle();
  }

  reset() {
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
      this.dirty = false;
      this.animating = this.renderer?.(now) ?? false;
    } finally {
      this.running = false;
      if (this.updates.size || this.dirty || this.animating) this.request();
    }
  };
}
