import type {MapPoint} from './skyProjection';

// Clip before measuring the animated stroke: offscreen pieces must not delay
// the reveal of a figure that is just entering the viewport.
export function clipFigureSegment(a: MapPoint, b: MapPoint, width: number, height: number): [MapPoint, MapPoint] | null {
  if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) return null;
  const dx = b.x - a.x, dy = b.y - a.y;
  let lo = 0, hi = 1;
  for (const [p, q] of [[-dx, a.x], [dx, width - a.x], [-dy, a.y], [dy, height - a.y]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) lo = Math.max(lo, t); else hi = Math.min(hi, t);
    if (lo > hi) return null;
  }
  return [{x: a.x + lo * dx, y: a.y + lo * dy}, {x: a.x + hi * dx, y: a.y + hi * dy}];
}

export class ConstellationReveal {
  private entries = new Map<string, {start: number | null; exitedAt: number | null}>();
  reset() { this.entries.clear(); }

  update(visibleIds: string[], now: number, reducedMotion: boolean, eligibleIds = visibleIds) {
    const visible = new Set(visibleIds);
    const eligible = new Set(eligibleIds);
    for (const [id, entry] of this.entries) if (!visible.has(id) && entry.exitedAt === null) entry.exitedAt = now;
    const progress = new Map<string, number>();
    let animating = false;
    for (const id of visible) {
      let entry = this.entries.get(id);
      // Brief edge crossings retain progress instead of flashing on every turn.
      if (!entry || (entry.exitedAt !== null && now - entry.exitedAt >= 180)) {
        entry = {start: null, exitedAt: null}; this.entries.set(id, entry);
      }
      entry.exitedAt = null;
      if (reducedMotion) entry.start = now - 1000;
      if (entry.start === null && eligible.has(id)) entry.start = now;
      const value = entry.start === null ? 0 : Math.max(0, Math.min(1, (now - entry.start) / 1000));
      progress.set(id, value * value * (3 - 2 * value));
      animating ||= entry.start !== null && value < 1;
    }
    return {progress, animating};
  }
}
