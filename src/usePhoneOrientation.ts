import {clampViewPitch} from './groundView';
import {useCallback, useEffect, useRef, useState} from 'react';
import {deviceDirection, orientationSampleTime, PhoneDirectionTracker, type DirectionDiagnostics, type OrientationReading} from './deviceDirection';
import type {ViewDirection} from './skyProjection';

export type SensorStatus = 'off' | 'requesting' | 'waiting' | 'align' | 'tracking' | 'paused' | 'denied' | 'unavailable' | 'missing' | 'recalibrate';
type SensorConstructor = typeof DeviceOrientationEvent & {requestPermission?: () => Promise<string>};

export function usePhoneOrientation(enabled: boolean, onDirection: (view: ViewDirection) => void) {
  const [status, setStatus] = useState<SensorStatus>('off');
  const [needsAlignment, setNeedsAlignment] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DirectionDiagnostics>(() => new PhoneDirectionTracker().diagnostics());
  const trace = useRef<object[]>([]);
  const traceAt = useRef<Record<string, number>>({});
  const uiAt = useRef(0);
  const lastDiagnostics = useRef(diagnostics);
  const refreshDiagnostics = (force = false) => {
    const now = performance.now(), next = tracker.current.diagnostics(now);
    if (force || now - uiAt.current >= 200 || next.reason !== lastDiagnostics.current.reason
      || next.reference !== lastDiagnostics.current.reference || next.compassReady !== lastDiagnostics.current.compassReady || next.check !== lastDiagnostics.current.check) {
      uiAt.current = now; lastDiagnostics.current = next; setDiagnostics(next);
    }
    return next;
  };
  const cleanup = useRef<() => void>(() => {});
  const generation = useRef(0);
  const last = useRef<ReturnType<typeof deviceDirection>>(null);
  const tracker = useRef(new PhoneDirectionTracker());
  const running = useRef(false), following = useRef(false), requesting = useRef(false);
  const allowed = useRef(enabled);
  allowed.current = enabled;
  const callback = useRef(onDirection);
  callback.current = onDirection;
  const stop = useCallback(() => {
    generation.current++;
    running.current = false; following.current = false; requesting.current = false;
    cleanup.current(); cleanup.current = () => {};
    last.current = null;
    setNeedsAlignment(false); setStatus('off');
  }, []);
  const pause = useCallback(() => {
    if (requesting.current) { stop(); return; }
    if (!running.current) return;
    following.current = false;
    setStatus(tracker.current.diagnostics().reason ? 'recalibrate' : 'paused');
  }, [stop]);
  // A panel pauses publication, not the calibrated sensor session. Continuing
  // to read the same source preserves its relative reference while editing.
  useEffect(() => { if (!enabled) pause(); }, [enabled, pause]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); stop(); };
  }, [stop]);

  const publish = () => {
    if (!allowed.current || !following.current) return;
    const check = refreshDiagnostics();
    if (check.reason) { setNeedsAlignment(true); setStatus('recalibrate'); return; }
    if (check.motionAgeMs !== null && check.motionAgeMs > 500) { setStatus('waiting'); return; }
    const direction = last.current;
    if (direction?.absolute) {
      callback.current({heading: direction.heading, pitch: clampViewPitch(direction.pitch)});
      setStatus('tracking');
    } else setStatus(direction ? 'align' : 'waiting');
  };
  const applyReference = (kind: 'north' | 'compass') => {
    const direction = kind === 'north' ? tracker.current.alignNorth() : tracker.current.useCompass();
    refreshDiagnostics(true);
    if (!direction) return;
    last.current = direction; setNeedsAlignment(false);
    if (!following.current || !allowed.current) setStatus('paused'); else publish();
  };
  const alignNorth = () => applyReference('north');
  const useCompass = () => applyReference('compass');
  const downloadReport = () => {
    const data = {application: 'Noxari', createdAt: new Date().toISOString(), sessionActive: running.current,
      diagnostics: tracker.current.diagnostics(), samples: trace.current};
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'noxari-direction.json'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const start = async () => {
    if (running.current) {
      following.current = true;
      // Panel closing and resume may occur in the same user gesture.
      requestAnimationFrame(publish);
      return;
    }
    stop();
    const token = generation.current;
    if (!window.isSecureContext || typeof DeviceOrientationEvent === 'undefined') { setStatus('unavailable'); return; }
    requesting.current = true;
    setStatus('requesting');
    try {
      const permission = (DeviceOrientationEvent as SensorConstructor).requestPermission;
      if (permission && await permission.call(DeviceOrientationEvent) !== 'granted') {
        if (token === generation.current) { requesting.current = false; setStatus('denied'); }
        return;
      }
    } catch { if (token === generation.current) { requesting.current = false; setStatus('denied'); } return; }
    if (token !== generation.current) return;
    requesting.current = false;
    tracker.current = new PhoneDirectionTracker();
    trace.current = []; traceAt.current = {}; refreshDiagnostics(true);
    running.current = true; following.current = true;
    let frame = 0, lastAt = performance.now();
    setStatus('waiting');
    const receive = (event: Event) => {
      const reading = event as DeviceOrientationEvent & OrientationReading;
      const now = performance.now();
      const input: OrientationReading = {alpha: reading.alpha, beta: reading.beta, gamma: reading.gamma,
        absolute: reading.absolute || event.type === 'deviceorientationabsolute',
        webkitCompassHeading: reading.webkitCompassHeading, webkitCompassAccuracy: reading.webkitCompassAccuracy};
      const sampleAt = orientationSampleTime(reading.timeStamp, now, performance.timeOrigin);
      const direction = tracker.current.update(input, event.type, sampleAt, now);
      const check = refreshDiagnostics();
      if (now - (traceAt.current[event.type] ?? -Infinity) >= 50) {
        traceAt.current[event.type] = now;
        trace.current.push({receivedAtMs: now, sampleAtMs: sampleAt, source: event.type, rawAbsolute: reading.absolute, input, direction, check});
        if (trace.current.length > 400) trace.current.shift();
      }
      if (check.reason) { setNeedsAlignment(true); setStatus('recalibrate'); }
      if (direction) { last.current = direction; lastAt = now; setNeedsAlignment(!direction.absolute); }
      if (!check.reason && check.motionAgeMs !== null && check.motionAgeMs > 500 && following.current && allowed.current) setStatus('waiting');
      if ((!direction && !check.reason) || !following.current || !allowed.current) return;
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; publish(); });
    };
    const timeout = window.setInterval(() => {
      const check = refreshDiagnostics();
      if (check.reason) { setNeedsAlignment(true); setStatus('recalibrate'); }
      else if (check.motionAgeMs !== null && check.motionAgeMs > 500 && following.current && allowed.current) setStatus('waiting');
      if (performance.now() - lastAt > 8000) { stop(); setStatus('missing'); }
    }, 1000);
    window.addEventListener('deviceorientationabsolute', receive);
    window.addEventListener('deviceorientation', receive);
    cleanup.current = () => {
      window.removeEventListener('deviceorientationabsolute', receive);
      window.removeEventListener('deviceorientation', receive);
      clearInterval(timeout); cancelAnimationFrame(frame);
    };
  };
  return {status, start, stop, pause, alignNorth, useCompass, downloadReport, diagnostics, hasReport: trace.current.length > 0, needsAlignment, active: ['requesting', 'waiting', 'align', 'tracking', 'recalibrate'].includes(status)};
}
