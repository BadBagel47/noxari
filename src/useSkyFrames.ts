import {useCallback, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction} from 'react';
import {flushSync} from 'react-dom';
import {SkyFrames} from './skyFrames';

export function useSkyFrames() {
  const [frames] = useState(() => new SkyFrames({
    request: callback => requestAnimationFrame(callback),
    cancel: id => cancelAnimationFrame(id),
    commit: updates => flushSync(updates),
  }));
  useLayoutEffect(() => () => frames.reset(), [frames]);
  return frames;
}

/** Coalesce input while preserving every relative delta and the latest pose. */
export function useSkyFrameState<T>(initial: T | (() => T), frames: SkyFrames): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(initial);
  const requested = useRef(value);
  const key = useRef(Symbol('sky state'));
  const setRequested = useCallback<Dispatch<SetStateAction<T>>>(update => {
    requested.current = typeof update === 'function' ? (update as (current: T) => T)(requested.current) : update;
    frames.enqueue(key.current, () => setValue(requested.current));
  }, [frames]);
  useLayoutEffect(() => {
    const token = key.current;
    return () => frames.cancelUpdate(token);
  }, [frames]);
  return [value, setRequested];
}
