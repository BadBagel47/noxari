import type {SkyFrames} from './skyFrames';
import {clampViewPitch} from './groundView';
import {useCallback, useEffect, useRef, useState} from 'react';
import {deviceDirection, orientationSampleTime, PhoneDirectionTracker, type DirectionDiagnostics, type OrientationReading} from './deviceDirection';
import type {ViewDirection} from './skyProjection';
import {DirectionReportLog} from './directionReport';

export type SensorStatus = 'off' | 'requesting' | 'waiting' | 'retrying' | 'error' | 'align' | 'tracking' | 'paused' | 'denied' | 'unavailable' | 'missing' | 'recalibrate';
type Startup = {phase: 'idle' | 'requesting' | 'listening' | 'retrying' | 'receiving' | 'denied' | 'permission-error' | 'unavailable' | 'missing' | 'stopped'; listenerRestarts: number; receivedEvents: number; usableDirections: number};
const newStartup = (): Startup => ({phase: 'idle', listenerRestarts: 0, receivedEvents: 0, usableDirections: 0});
type SensorConstructor = typeof DeviceOrientationEvent & {requestPermission?: () => Promise<string>};

export function usePhoneOrientation(enabled: boolean, onDirection: (view: ViewDirection) => void, frames: SkyFrames) {
  const startup = useRef<Startup>(newStartup());
  const publishKey = useRef(Symbol('phone publication'));
  const [status, setStatus] = useState<SensorStatus>('off');
  const [needsAlignment, setNeedsAlignment] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DirectionDiagnostics>(() => new PhoneDirectionTracker().diagnostics());
  const report = useRef(new DirectionReportLog());
  const uiAt = useRef(0);
  const lastDiagnostics = useRef(diagnostics);
  const refreshDiagnostics = (force = false) => {
    const now = performance.now(), next = tracker.current.diagnostics(now);
    if (force || now - uiAt.current >= 200 || next.reason !== lastDiagnostics.current.reason
      || next.reference !== lastDiagnostics.current.reference || next.compassReady !== lastDiagnostics.current.compassReady
      || next.autoCorrections !== lastDiagnostics.current.autoCorrections || next.check !== lastDiagnostics.current.check) {
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
    frames.cancelUpdate(publishKey.current);
    generation.current++;
    running.current = false; following.current = false; requesting.current = false;
    cleanup.current(); cleanup.current = () => {};
    last.current = null;
    if (startup.current.phase !== 'idle') startup.current.phase = 'stopped';
    setNeedsAlignment(false); setStatus('off');
  }, [frames]);
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
  // Return from the map with the latest pose and the same following choice.
  useEffect(() => { if (enabled) publish(); }, [enabled]);
  const applyReference = (kind: 'north' | 'compass') => {
    const direction = kind === 'north' ? tracker.current.alignNorth() : tracker.current.useCompass();
    for (const event of tracker.current.takeTransitions()) report.current.recordTransition(event);
    refreshDiagnostics(true);
    if (!direction) return;
    last.current = direction; setNeedsAlignment(false);
    if (allowed.current) publish(); else setStatus('tracking');
  };
  const alignNorth = () => applyReference('north');
  const useCompass = () => applyReference('compass');
  const downloadReport = () => {
    const data = {application: 'Noxari', reportVersion: 2, createdAt: new Date().toISOString(), sessionActive: running.current,
      following: following.current, viewEnabled: allowed.current,
      startup: {...startup.current}, diagnostics: tracker.current.diagnostics(), ...report.current.snapshot()};
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'noxari-direction.json'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const start = async () => {
    if (requesting.current) return;
    if (running.current) {
      following.current = true;
      // Panel closing and resume may occur in the same user gesture.
      frames.enqueue(publishKey.current, publish, 'phone-publication');
      return;
    }
    stop();
    const token = generation.current;
    startup.current = newStartup();
    if (!window.isSecureContext || typeof DeviceOrientationEvent === 'undefined') { startup.current.phase = 'unavailable'; setStatus('unavailable'); return; }
    requesting.current = true;
    startup.current.phase = 'requesting'; setStatus('requesting');
    try {
      const permission = (DeviceOrientationEvent as SensorConstructor).requestPermission;
      if (permission && await permission.call(DeviceOrientationEvent) !== 'granted') {
        if (token === generation.current) { requesting.current = false; startup.current.phase = 'denied'; setStatus('denied'); }
        return;
      }
    } catch { if (token === generation.current) { requesting.current = false; startup.current.phase = 'permission-error'; setStatus('error'); } return; }
    if (token !== generation.current) return;
    requesting.current = false;
    tracker.current = new PhoneDirectionTracker();
    report.current = new DirectionReportLog(); refreshDiagnostics(true);
    running.current = true; following.current = true;
    let lastAt = performance.now();
    startup.current.phase = 'listening'; setStatus('waiting');
    const receive = (event: Event) => {
      if (token !== generation.current || !running.current) return;
      startup.current.receivedEvents++;
      const reading = event as DeviceOrientationEvent & OrientationReading;
      const now = performance.now();
      const input: OrientationReading = {alpha: reading.alpha, beta: reading.beta, gamma: reading.gamma,
        absolute: reading.absolute || event.type === 'deviceorientationabsolute',
        webkitCompassHeading: reading.webkitCompassHeading, webkitCompassAccuracy: reading.webkitCompassAccuracy};
      const sampleAt = orientationSampleTime(reading.timeStamp, now, performance.timeOrigin);
      const direction = tracker.current.update(input, event.type, sampleAt, now);
      const check = refreshDiagnostics();
      const transitions = tracker.current.takeTransitions();
      for (const transition of transitions) report.current.recordTransition(transition);
      report.current.recordSample({receivedAtMs: now, sampleAtMs: sampleAt, source: event.type,
        rawAbsolute: reading.absolute, input, direction, check, following: following.current,
        viewEnabled: allowed.current}, transitions.length > 0);
      // Recovery changes the reference, not whether the user chose to follow.
      if (check.reason) { setNeedsAlignment(true); setStatus('recalibrate'); }
      if (direction) { startup.current.usableDirections++; startup.current.phase = 'receiving'; last.current = direction; lastAt = now; setNeedsAlignment(!direction.absolute);
        if (!allowed.current && !check.reason) setStatus(direction.absolute ? 'tracking' : 'align');
      }
      if (!check.reason && check.motionAgeMs !== null && check.motionAgeMs > 500 && following.current && allowed.current) setStatus('waiting');
      if ((!direction && !check.reason) || !following.current || !allowed.current) return;
      frames.enqueue(publishKey.current, publish, 'phone-publication');
    };
    const attach = () => {
      window.addEventListener('deviceorientationabsolute', receive);
      window.addEventListener('deviceorientation', receive);
    };
    const detach = () => {
      window.removeEventListener('deviceorientationabsolute', receive);
      window.removeEventListener('deviceorientation', receive);
    };
    const timeout = window.setInterval(() => {
      const check = refreshDiagnostics();
      if (check.reason) { setNeedsAlignment(true); setStatus('recalibrate'); }
      else if (check.motionAgeMs !== null && check.motionAgeMs > 500 && following.current && allowed.current) setStatus('waiting');
      const silentFor = performance.now() - lastAt;
      if (silentFor > 8000) { stop(); startup.current.phase = 'missing'; setStatus('missing'); }
      else if (silentFor >= 3000 && startup.current.usableDirections === 0 && startup.current.listenerRestarts === 0) {
        // Recover once if a cold subscription has not delivered usable data.
        // Retry once within the original startup deadline, without permissions,
        // tracker/reference reset, another user gesture or another frame queue.
        detach(); startup.current.listenerRestarts++; startup.current.phase = 'retrying';
        setStatus('retrying'); attach();
      }
    }, 1000);
    attach();
    cleanup.current = () => {
      detach();
      clearInterval(timeout); frames.cancelUpdate(publishKey.current);
    };
  };
  return {status, start, stop, alignNorth, useCompass, downloadReport, diagnostics, hasReport: report.current.hasData || startup.current.phase !== 'idle', needsAlignment, active: ['requesting', 'waiting', 'retrying', 'align', 'tracking', 'recalibrate'].includes(status)};
}
