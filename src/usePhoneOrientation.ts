import {useCallback, useEffect, useRef, useState} from 'react';
import {deviceDirection, wrapHeading, type OrientationReading} from './deviceDirection';
import type {ViewDirection} from './skyProjection';

export type SensorStatus = 'off' | 'requesting' | 'waiting' | 'align' | 'tracking' | 'denied' | 'unavailable' | 'missing';
type SensorConstructor = typeof DeviceOrientationEvent & {requestPermission?: () => Promise<string>};

export function usePhoneOrientation(enabled: boolean, onDirection: (view: ViewDirection) => void) {
  const [status, setStatus] = useState<SensorStatus>('off');
  const cleanup = useRef<() => void>(() => {});
  const generation = useRef(0);
  const last = useRef<ReturnType<typeof deviceDirection>>(null);
  const offset = useRef(0);
  const aligned = useRef(false);
  const callback = useRef(onDirection);
  callback.current = onDirection;
  const stop = useCallback(() => {
    generation.current++;
    cleanup.current();
    cleanup.current = () => {};
    last.current = null;
    setStatus('off');
  }, []);
  useEffect(() => {
    if (!enabled) stop();
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); stop(); };
  }, [enabled, stop]);

  const publish = () => {
    const direction = last.current;
    if (direction && (direction.absolute || aligned.current)) {
      callback.current({heading: wrapHeading(direction.heading + offset.current), pitch: Math.max(-80, Math.min(89.9, direction.pitch))});
      setStatus('tracking');
    }
  };
  const alignNorth = () => {
    if (!last.current) return;
    offset.current = -last.current.heading;
    aligned.current = true;
    publish();
  };
  const start = async () => {
    stop();
    const token = generation.current;
    if (!window.isSecureContext || typeof DeviceOrientationEvent === 'undefined') { setStatus('unavailable'); return; }
    setStatus('requesting');
    try {
      // iOS requires this call directly from a user gesture.
      const permission = (DeviceOrientationEvent as SensorConstructor).requestPermission;
      if (permission && await permission.call(DeviceOrientationEvent) !== 'granted') {
        if (token === generation.current) setStatus('denied');
        return;
      }
    } catch { if (token === generation.current) setStatus('denied'); return; }
    if (token !== generation.current) return;
    offset.current = 0;
    aligned.current = false;
    let absoluteSeen = false, frame = 0, lastAt = Date.now();
    setStatus('waiting');
    const receive = (event: Event) => {
      const reading = event as DeviceOrientationEvent & OrientationReading;
      const direction = deviceDirection({...reading, alpha: reading.alpha, beta: reading.beta, gamma: reading.gamma,
        absolute: reading.absolute || event.type === 'deviceorientationabsolute',
        webkitCompassHeading: reading.webkitCompassHeading, webkitCompassAccuracy: reading.webkitCompassAccuracy});
      if (!direction || (absoluteSeen && !direction.absolute)) return;
      if (direction.absolute && !absoluteSeen && last.current && !last.current.absolute) {
        offset.current = 0;
        aligned.current = false;
      }
      absoluteSeen ||= direction.absolute;
      last.current = direction;
      lastAt = Date.now();
      if (!direction.absolute && !aligned.current) { setStatus('align'); return; }
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
      clearInterval(timeout);
      cancelAnimationFrame(frame);
    };
  };
  return {status, start, stop, alignNorth, active: ['requesting', 'waiting', 'align', 'tracking'].includes(status)};
}
