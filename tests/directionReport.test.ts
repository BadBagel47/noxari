import {describe, expect, it} from 'vitest';
import {PhoneDirectionTracker, type DirectionTransition} from '../src/deviceDirection';
import {DirectionReportLog, type DirectionSample} from '../src/directionReport';

const check = new PhoneDirectionTracker().diagnostics(0);
const sample = (time: number): DirectionSample => ({receivedAtMs: time, sampleAtMs: time, source: 'deviceorientation',
  rawAbsolute: false, input: {alpha: 0, beta: 90, gamma: 0}, direction: null, check, following: true, viewEnabled: true});
const transition = (id: number, atMs: number, kind: DirectionTransition['kind']): DirectionTransition => ({
  id, atMs, kind, reason: 'disagreement', reference: 'compass', offsetBeforeDegrees: 0, offsetAfterDegrees: 240,
  headingBeforeDegrees: 120, headingAfterDegrees: 0, differenceDegrees: 120, correctionDegrees: -120});

describe('local direction report history', () => {
  it('retains warning onset and exact recovery metadata after the rolling window has expired', () => {
    const log = new DirectionReportLog();
    for (let t = 0; t < 20000; t += 50) log.recordSample(sample(t));
    log.recordTransition(transition(1, 19960, 'uncertain'));
    log.recordTransition(transition(2, 19960, 'auto-reanchor'));
    // Triggering reading is kept even when it arrives inside the normal throttle.
    log.recordSample(sample(19960), true);
    for (let t = 20050; t < 80000; t += 50) log.recordSample(sample(t));
    const report = log.snapshot();
    expect(report.samples).toHaveLength(400);
    expect(report.samples[0].receivedAtMs).toBeGreaterThan(20000);
    expect(report.incidents).toHaveLength(1);
    expect(report.incidents[0].before).toHaveLength(200);
    expect(report.incidents[0].before[0].receivedAtMs).toBe(10000);
    expect(report.incidents[0].after).toHaveLength(100);
    expect(report.incidents[0].after[0].receivedAtMs).toBe(19960);
    expect(report.incidents[0].transitions.map(event => event.kind)).toEqual(['uncertain', 'auto-reanchor']);
    expect(report.transitions[1].differenceDegrees).toBe(120);
    expect(report.transitions[1].correctionDegrees).toBe(-120);
  });

  it('bounds repeated incidents, transitions and readings while preserving a delayed explicit recovery', () => {
    const log = new DirectionReportLog();
    for (let cycle = 0; cycle < 20; cycle++) {
      const at = cycle * 10000;
      log.recordTransition(transition(cycle * 2, at, 'uncertain'));
      for (let t = at; t < at + 8000; t += 50) log.recordSample(sample(t));
      log.recordTransition(transition(cycle * 2 + 1, at + 8000, 'compass-reference'));
    }
    const report = log.snapshot();
    expect(log.hasData).toBe(true);
    expect(report.samples).toHaveLength(400);
    expect(report.transitions).toHaveLength(32);
    expect(report.transitions.at(-1)?.kind).toBe('compass-reference');
    expect(report.incidents).toHaveLength(3);
    for (const incident of report.incidents) {
      expect(incident.before.length).toBeLessThanOrEqual(200);
      expect(incident.after).toHaveLength(100);
      expect(incident.transitions.length).toBeLessThanOrEqual(32);
    }
  });
});
