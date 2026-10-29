import {useCallback, useEffect, useRef, useState} from 'react';
import {deviceDirection, PhoneDirectionTracker, type OrientationReading} from './deviceDirection';
import type {ViewDirection} from './skyProjection';

export type SensorStatus = 'off' | 'requesting' | 'waiting' | 'align' | 'tracking' | 'paused' | 'denied' | 'unavailable' | 'missing';
type SensorConstructor = typeof DeviceOrientationEvent & {requestPermission?: () => Promise<string>};

export function usePhoneOrientation(enabled: boolean, onDirection: (view: ViewDirection) => void) {
  const [status, setStatus] = useState<SensorStatus>('off');
  const [needsAlignment, setNeedsAlignment] = useState(false);
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
    setStatus('paused');
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
    const direction = last.current;
    if (direction?.absolute) {
      callback.current({heading: direction.heading, pitch: Math.max(-80, Math.min(89.9, direction.pitch))});
      setStatus('tracking');
    } else setStatus(direction ? 'align' : 'waiting');
  };
  const alignNorth = () => {
    last.current = tracker.current.alignNorth();
    if (last.current) setNeedsAlignment(false);
    publish();
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
    running.current = true; following.current = true;
    let frame = 0, lastAt = Date.now();
    setStatus('waiting');
    const receive = (event: Event) => {
      const reading = event as DeviceOrientationEvent & OrientationReading;
      const direction = tracker.current.update({alpha: reading.alpha, beta: reading.beta, gamma: reading.gamma,
        absolute: reading.absolute || event.type === 'deviceorientationabsolute',
        webkitCompassHeading: reading.webkitCompassHeading, webkitCompassAccuracy: reading.webkitCompassAccuracy}, event.type);
      if (!direction) return;
      last.current = direction; lastAt = Date.now();
      setNeedsAlignment(!direction.absolute);
      if (!following.current || !allowed.current) return;
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; publish(); });
    };
    const timeout = window.setInterval(() => {
      if (Date.now() - lastAt > 8000) { stop(); setStatus('missing'); }
    }, 1000);
    window.addEventListener('deviceorientationabsolute', receive);
    window.addEventListener('deviceorientation', receive);
    cleanup.current = () => {
      window.removeEventListener('deviceorientationabsolute', receive);
      window.removeEventListener('deviceorientation', receive);
      clearInterval(timeout); cancelAnimationFrame(frame);
    };
  };
  return {status, start, stop, pause, alignNorth, needsAlignment, active: ['requesting', 'waiting', 'align', 'tracking'].includes(status)};
}
