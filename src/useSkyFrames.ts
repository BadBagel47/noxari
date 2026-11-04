import {useCallback, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction} from 'react';
import {flushSync} from 'react-dom';
import {SkyFrames} from './skyFrames';
import {SkyPerformance, type PerformanceInput} from './skyPerformance';

export function useSkyFrames() {
  const [frames] = useState(() => new SkyFrames({
    request: callback => requestAnimationFrame(callback),
    cancel: id => cancelAnimationFrame(id),
    commit: updates => flushSync(updates),
  }, new SkyPerformance(__NOXARI_BUILD__)));
  useLayoutEffect(() => {
    const hidden = () => { if (document.hidden) { frames.comparison.cancel('page-hidden');frames.performance.stop('page-hidden'); } };
    const leave = () => { frames.comparison.cancel('page-hidden');frames.performance.stop('page-hidden'); };
    document.addEventListener('visibilitychange', hidden);window.addEventListener('pagehide', leave);
    return () => { document.removeEventListener('visibilitychange', hidden);window.removeEventListener('pagehide', leave);frames.reset(); };
  }, [frames]);
  return frames;
}

/** Coalesce input while preserving every relative delta and the latest pose. */
export function useSkyFrameState<T>(initial: T | (() => T), frames: SkyFrames, source: PerformanceInput = 'manual-view'): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(initial);
  const requested = useRef(value);
  const key = useRef(Symbol('sky state'));
  const setRequested = useCallback<Dispatch<SetStateAction<T>>>(update => {
    requested.current = typeof update === 'function' ? (update as (current: T) => T)(requested.current) : update;
    frames.enqueue(key.current, () => setValue(requested.current), source);
  }, [frames, source]);
  useLayoutEffect(() => {
    const token = key.current;
    return () => frames.cancelUpdate(token);
  }, [frames]);
  return [value, setRequested];
}
