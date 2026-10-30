import type {DirectionDiagnostics, DirectionTransition, OrientationReading, deviceDirection} from './deviceDirection';

export type DirectionSample = {
  receivedAtMs: number; sampleAtMs: number; source: string; rawAbsolute?: boolean;
  input: OrientationReading; direction: ReturnType<typeof deviceDirection>; check: DirectionDiagnostics;
  following: boolean; viewEnabled: boolean;
};
type Incident = {trigger: DirectionTransition; transitions: DirectionTransition[]; before: DirectionSample[]; after: DirectionSample[]};

// Keep recent readings plus bounded frozen windows around warnings/recovery.
// Waiting to download must not erase the event that prompted the report.
export class DirectionReportLog {
  private samples: DirectionSample[] = [];
  private transitions: DirectionTransition[] = [];
  private incidents: Incident[] = [];
  private sampledAt: Record<string, number> = {};

  get hasData() { return this.samples.length > 0 || this.transitions.length > 0; }

  recordTransition(event: DirectionTransition) {
    this.transitions.push(event);
    if (this.transitions.length > 32) this.transitions.shift();
    for (const incident of this.incidents) {
      if (incident.after.length < 100) {
        incident.transitions.push(event);
        if (incident.transitions.length > 32) incident.transitions.shift();
      }
    }
    if (event.kind !== 'uncertain' && event.kind !== 'auto-reanchor') return;
    const previous = this.incidents[this.incidents.length - 1];
    // Warning and automatic recovery can occur in the same sensor update.
    if (event.kind === 'auto-reanchor' && previous?.trigger.kind === 'uncertain'
      && event.atMs - previous.trigger.atMs <= 1000 && previous.after.length < 100) return;
    this.incidents.push({trigger: event, transitions: [event], before: this.samples.slice(-200), after: []});
    if (this.incidents.length > 3) this.incidents.shift();
  }

  recordSample(sample: DirectionSample, force = false) {
    if (!force && sample.receivedAtMs - (this.sampledAt[sample.source] ?? -Infinity) < 50) return;
    this.sampledAt[sample.source] = sample.receivedAtMs;
    this.samples.push(sample);
    if (this.samples.length > 400) this.samples.shift();
    for (const incident of this.incidents) if (incident.after.length < 100) incident.after.push(sample);
  }

  snapshot() {
    return {samples: [...this.samples], transitions: [...this.transitions],
      incidents: this.incidents.map(incident => ({...incident, transitions: [...incident.transitions], before: [...incident.before], after: [...incident.after]}))};
  }
}
