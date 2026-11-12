import {describe, expect, it, vi} from 'vitest';
import {SkyFrames} from '../src/skyFrames';

function harness() {
  let sequence = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  const commit = vi.fn((update: () => void) => update());
  const frames = new SkyFrames({
    request: callback => { callbacks.set(++sequence, callback); return sequence; },
    cancel: id => { callbacks.delete(id); },
    commit,
  });
  const tick = (now: number) => {
    const scheduled = [...callbacks.values()];
    callbacks.clear();
    scheduled.forEach(callback => callback(now));
  };
  return {frames, callbacks, commit, tick};
}

describe('shared sky frame scheduling', () => {
  it('runs an eased camera motion inside the shared frame and stops when it finishes', () => {
    const {frames, callbacks, tick, commit} = harness();
    const camera = Symbol('camera'), poses: number[] = [];
    frames.setRenderer(() => false);
    tick(0);
    let step = 0;
    frames.setMotion(() => { const pose = ++step; frames.enqueue(camera, () => { poses.push(pose); }); return pose < 3; });
    expect(callbacks.size).toBe(1);
    tick(16); tick(32); tick(48);
    expect(poses).toEqual([1, 2, 3]);
    expect(commit).toHaveBeenCalledTimes(3);
    expect(callbacks.size).toBe(0);
    frames.setMotion(() => true);
    frames.setMotion(null);
    expect(callbacks.size).toBe(0);
  });

  it('coalesces input, commits the latest pose and matching overlay before drawing once', () => {
    const {frames, callbacks, tick, commit} = harness();
    const key = Symbol('camera'), draws: number[] = [];
    let overlay = -1;
    frames.setRenderer(() => { draws.push(-1); return false; });
    for (const pose of [10, 20, 30]) frames.enqueue(key, () => {
      overlay = pose;
      frames.setRenderer(() => { draws.push(overlay); return false; });
    });
    expect(callbacks.size).toBe(1);
    tick(16);
    expect(draws).toEqual([30]);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(callbacks.size).toBe(0);
  });

  it('publishes sensor input and staged camera state in one frame without an extra RAF', () => {
    const {frames, callbacks, tick} = harness();
    const sensor = Symbol('sensor'), camera = Symbol('camera');
    let pose = 0;
    const draw = vi.fn(() => false);
    frames.setRenderer(() => { draw(pose); return false; });
    frames.enqueue(sensor, () => frames.enqueue(camera, () => { pose = 123; }));
    tick(16);
    expect(draw).toHaveBeenCalledWith(123);
    expect(callbacks.size).toBe(0);
  });

  it('shares the animation request with new view invalidations and stops at completion', () => {
    const {frames, callbacks, tick} = harness();
    const oldDraw = vi.fn(() => true), latestDraw = vi.fn(() => false);
    frames.setRenderer(oldDraw);
    tick(16);
    expect(callbacks.size).toBe(1);
    frames.setRenderer(latestDraw);
    frames.setRenderer(latestDraw);
    expect(callbacks.size).toBe(1);
    tick(32);
    expect(oldDraw).toHaveBeenCalledTimes(1);
    expect(latestDraw).toHaveBeenCalledExactlyOnceWith(32);
    expect(callbacks.size).toBe(0);
  });

  it('cancels pending publication and releases animation on view teardown', () => {
    const {frames, callbacks, tick} = harness();
    const key = Symbol('sensor'), publish = vi.fn(), draw = vi.fn(() => true);
    frames.enqueue(key, publish);
    frames.cancelUpdate(key);
    expect(callbacks.size).toBe(0);
    frames.setRenderer(draw);
    tick(16);
    frames.clearRenderer();
    expect(callbacks.size).toBe(0);
    tick(32);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
  });

  it('does not keep scheduling an animation after a drawing error', () => {
    const {frames, callbacks, tick} = harness();
    const draw = vi.fn().mockReturnValueOnce(true).mockImplementationOnce(() => { throw new Error('draw failed'); });
    frames.setRenderer(draw);
    tick(16);
    expect(() => tick(32)).toThrow('draw failed');
    expect(callbacks.size).toBe(0);
  });

  it('keeps a queued camera update through map teardown and supports a fresh mount', () => {
    const {frames, callbacks, tick} = harness();
    const update = vi.fn(), draw = vi.fn(() => false);
    frames.setRenderer(draw);
    frames.enqueue(Symbol('camera'), update);
    frames.clearRenderer();
    tick(16);
    expect(update).toHaveBeenCalledOnce();
    expect(draw).not.toHaveBeenCalled();
    frames.reset();
    frames.setRenderer(draw);
    tick(32);
    expect(draw).toHaveBeenCalledExactlyOnceWith(32);
    expect(callbacks.size).toBe(0);
  });
});
