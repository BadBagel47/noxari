import type {ViewDirection} from './skyProjection';

// Enter only after repeated visible movement, then hold one resolution through
// short pauses. Canvas allocation must not oscillate on every sensor sample.
export class MotionResolution {
  private previous: {view: ViewDirection; zoom: number} | null = null;
  private lastMoveAt: number | null = null;
  private movingUntil = -Infinity;
  private inMotion = false;

  sample(view: ViewDirection, zoom: number, deviceDpr: number, now: number) {
    const fullDpr = Number.isFinite(deviceDpr) && deviceDpr > 0 ? Math.min(deviceDpr, 2) : 1;
    if (this.previous) {
      const headingDelta = Math.abs((view.heading - this.previous.view.heading + 540) % 360 - 180);
      const moved = headingDelta > .05 || Math.abs(view.pitch - this.previous.view.pitch) > .05 || Math.abs(zoom - this.previous.zoom) > .001;
      if (moved) {
        if ((this.lastMoveAt !== null && now - this.lastMoveAt <= 120) || this.inMotion) this.movingUntil = now + 220;
        this.lastMoveAt = now;
      }
    }
    this.previous = {view: {...view}, zoom};
    this.inMotion = now < this.movingUntil;
    const dpr = this.inMotion ? Math.min(fullDpr, 1.5) : fullDpr;
    return {dpr, restoreAt: dpr < fullDpr ? this.movingUntil : null};
  }
}
