/** F-037: per-layer opacity that eases toward on/off over a short time; driven by the shared frame loop. */
export class LayerFades<K extends string> {
  private state = new Map<K, {from: number; to: number; start: number; value: number}>();
  constructor(private duration = 260) {}

  /** Returns each layer's opacity at `now` and whether any layer is still moving. */
  step(targets: Record<K, boolean>, now: number, instant: boolean) {
    const values = {} as Record<K, number>;
    let animating = false;
    for (const key of Object.keys(targets) as K[]) {
      const to = targets[key] ? 1 : 0;
      let entry = this.state.get(key);
      if (!entry) { entry = {from: to, to, start: now, value: to}; this.state.set(key, entry); }
      if (entry.to !== to) { entry.from = entry.value; entry.to = to; entry.start = now; }
      if (instant) entry.value = to;
      else {
        const k = Math.min(1, Math.max(0, (now - entry.start) / this.duration));
        const eased = k * k * (3 - 2 * k);
        entry.value = entry.from + (entry.to - entry.from) * eased;
        if (k < 1 && entry.from !== entry.to) animating = true;
      }
      values[key] = entry.value;
    }
    return {values, animating};
  }
}
