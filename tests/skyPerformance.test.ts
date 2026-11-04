import {afterEach, describe, expect, it, vi} from 'vitest';
import {SkyPerformance, type PerformanceScene} from '../src/skyPerformance';
import {SkyFrames} from '../src/skyFrames';

function harness() {
  let now = 0;
  const clock = vi.fn(() => now);
  const log = new SkyPerformance({commit: 'testbuild', dirty: true}, clock);
  const scene: PerformanceScene = {backend: 'gpu', reason: '', driver: 'Brave', preference: 'auto', width: 390, height: 844,
    dpr: 2, zoom: 1, starCount: 8922, layerMask: 31, figureMode: 'all', following: false, reducedMotion: false, timeMode: 'fixed',
    starsVisible: true, milkyWayVisible: true, belowHorizon: false};
  log.scene = scene;
  const at = (n: number) => { now = n; };
  const draw = (animation = false) => {
    const frame = log.beginFrame()!;frame.committed(false);frame.beginDraw(scene.backend);
    now++;frame.phase('stars');log.endFrame(frame, animation, false);
  };
  return {log, scene, clock, at, draw};
}
afterEach(() => vi.useRealTimers());

describe('ordinary sky performance reports', () => {
  it('does no clock reads, samples, timers or UI publications while disabled', () => {
    const {log, clock} = harness(), listener = vi.fn();log.subscribe(listener);
    log.input(Symbol(), 'manual-view');log.cancelInput(Symbol());
    expect(log.beginFrame()).toBeNull();log.endFrame(null, false, false);log.stop('manual');
    expect(log.snapshot().frames).toEqual([]);expect(clock).not.toHaveBeenCalled();expect(listener).not.toHaveBeenCalled();
  });

  it('publishes backend changes without publishing every draw or reading the clock', () => {
    const {log, scene, clock} = harness(), listener = vi.fn();log.subscribe(listener);
    log.sceneChanged();log.sceneChanged();expect(listener).toHaveBeenCalledTimes(1);
    scene.backend = 'canvas';scene.reason = 'context-lost';log.sceneChanged();log.sceneChanged();
    expect(listener).toHaveBeenCalledTimes(2);expect(clock).not.toHaveBeenCalled();
  });

  it('separates coalesced request freshness, queue wait, commit, stages and included copies', () => {
    const {log, at} = harness(), key = Symbol();log.start();
    at(5);log.input(key, 'manual-view');at(9);log.input(key, 'manual-view');
    at(16);const frame = log.beginFrame()!;at(20);frame.committed(true);frame.beginDraw('gpu');
    at(22);frame.phase('background');frame.copyCalls = 2;frame.copyMs = 1.5;
    at(26);frame.phase('stars');log.endFrame(frame, false, false);log.stop('manual');
    expect(log.snapshot().frames[0]).toMatchObject({atMs: 16, requestToDrawEndMs: 17, oldestRequestToDrawEndMs: 21,
      latestRequestWaitMs: 7, commitMs: 4, drawMs: 6, frameTaskMs: 10, gpuCopySubmissionMs: 1.5, gpuCopyCalls: 2,
      stagesMs: {background: 2, stars: 4}, inputs: {'manual-view': 2, zoom: 0, 'phone-publication': 0}});
  });

  it('separates scheduled waiting, callback preparation and command work', () => {
    const {log, at} = harness();log.start();at(21);
    const frame = log.beginFrame({requested: 4, callback: 20, rafTimestamp: 16})!;
    at(23);frame.committed(true);frame.beginDraw('gpu');at(27);log.endFrame(frame, true, false);log.stop('manual');
    expect(log.snapshot().frames[0]).toMatchObject({rafWaitMs: 16, callbackAgeMs: 4, callbackToFrameStartMs: 1, callbackToDrawEndMs: 7, frameTaskMs: 6, bookkeepingMs: 0});
  });

  it('excludes idle gaps and retains a long stall when a view request arrived promptly', () => {
    const {log, at, draw} = harness(), key = Symbol();log.start();
    at(1);log.input(key, 'manual-view');at(10);draw();
    at(2000);log.input(key, 'manual-view');at(2010);draw();
    at(2020);log.input(key, 'manual-view');at(2400);draw();log.stop('manual');
    expect(log.snapshot().frames.map(f => f.cadenceIntervalMs)).toEqual([null, null, 390]);
    expect(log.snapshot().summary.intervalsOver25Ms).toBe(1);
  });

  it('measures a scheduled animation without claiming an input latency for it', () => {
    const {log, at, draw} = harness();log.start();draw(true);at(16);draw(false);at(2000);draw();log.stop('manual');
    expect(log.snapshot().frames.map(f => f.cadenceIntervalMs)).toEqual([null, 16, null]);
    expect(log.snapshot().summary.requestToDrawEndMs.count).toBe(0);
  });

  it('counts cancellation without attributing cancelled phone data to a later frame', () => {
    const {log, draw} = harness(), key = Symbol();log.start();
    log.input(key, 'phone-publication');log.input(key, 'phone-publication');log.cancelInput(key);draw();log.stop('manual');
    expect(log.snapshot().summary.cancelledRequests).toBe(2);
    expect(log.snapshot().frames[0].inputs['phone-publication']).toBe(0);
  });

  it('records fallback transitions and reuses configuration contexts through zoom changes', () => {
    const {log, scene, draw, at} = harness();log.start();draw();
    for (let i = 0; i < 100; i++) { at(i + 10);scene.zoom = 1 + i / 100;draw(); }
    expect(log.active).toBe(true);expect(log.snapshot().contexts).toHaveLength(1);
    const frame = log.beginFrame()!;frame.beginDraw('gpu');frame.copyCalls = 1;
    scene.backend = 'canvas';scene.reason = 'context-lost';log.endFrame(frame, false, false);log.stop('manual');
    expect(log.snapshot().contexts).toHaveLength(2);
    expect(log.snapshot().frames.at(-1)).toMatchObject({backendAtStart: 'gpu', context: 1, gpuCopyCalls: 1});
  });

  it('bounds frame storage and publishes only start/stop UI state', () => {
    const {log, draw} = harness(), listener = vi.fn();log.subscribe(listener);log.start();
    for (let i = 0; i < SkyPerformance.maxFrames + 10; i++) { if (log.active) draw(); }
    expect(log.snapshot().frames).toHaveLength(SkyPerformance.maxFrames);
    expect(log.getSnapshot().reason).toBe('frame-limit');expect(listener).toHaveBeenCalledTimes(2);
  });

  it('bounds configuration storage without exporting an invalid context index', () => {
    const {log, scene, draw} = harness();log.start();
    for (let i = 0; i <= SkyPerformance.maxContexts; i++) { scene.width++;draw(); }
    expect(log.getSnapshot().reason).toBe('context-limit');
    expect(log.snapshot().contexts).toHaveLength(SkyPerformance.maxContexts);
    expect(log.snapshot().frames.every(f => f.context < SkyPerformance.maxContexts)).toBe(true);
  });

  it('expires without a drawing loop and cancels the limit timer on early stop', () => {
    vi.useFakeTimers();const {log, at} = harness();log.start();at(30_000);vi.advanceTimersByTime(30_000);
    expect(log.getSnapshot().reason).toBe('time-limit');expect(log.snapshot().frames).toEqual([]);
    log.start();log.stop('page-hidden');expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves the last report on map teardown and requires a ready horizon for a new one', () => {
    const {log, scene, draw} = harness();log.start();draw();log.detachScene(scene);
    expect(log.getSnapshot().reason).toBe('view-unavailable');expect(log.start()).toBe(false);
    expect(log.snapshot().frames).toHaveLength(1);log.scene = scene;expect(log.start()).toBe(true);
    expect(log.snapshot().frames).toEqual([]);log.stop('manual');
  });

  it('allowlists context fields and returns detached snapshots without location or sensor state', () => {
    const {log, scene, draw} = harness();Object.assign(scene, {latitude: 12.34567, longitude: 65.4321, selectedTime: 'SECRET_TIME', rawAlpha: 123, objectId: 'SECRET_OBJECT'});
    log.start();draw();log.stop('manual');const report = log.snapshot(), json = JSON.stringify(report);
    for (const secret of ['12.34567', '65.4321', 'SECRET_TIME', 'SECRET_OBJECT', 'rawAlpha', 'latitude', 'longitude']) expect(json).not.toContain(secret);
    report.contexts[0].backend = 'canvas';report.frames[0].stagesMs.stars = 999;
    expect(log.snapshot().contexts[0].backend).toBe('gpu');expect(log.snapshot().frames[0].stagesMs.stars).toBe(1);
  });

  it('observes phone-to-camera publication once in the shared queue without adding a RAF', () => {
    const {log, scene, at} = harness(), callbacks: FrameRequestCallback[] = [];
    const frames = new SkyFrames({request: callback => {callbacks.push(callback);return callbacks.length;}, cancel: () => {}, commit: fn => {at(20);fn();}}, log);
    frames.setRenderer(() => {log.current!.beginDraw(scene.backend);at(25);log.current!.phase('stars');return false;});
    log.start();at(5);frames.enqueue(Symbol(), () => frames.enqueue(Symbol(), () => {}, 'manual-view'), 'phone-publication');
    at(16);callbacks.shift()!(16);expect(callbacks).toHaveLength(0);log.stop('manual');
    expect(log.snapshot().frames[0].inputs).toEqual({'manual-view': 0, zoom: 0, 'phone-publication': 1, 'scripted-view': 0});
    expect(log.snapshot().frames[0].requestToDrawEndMs).toBe(20);
  });
});
