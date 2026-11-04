import {afterEach, describe, expect, it, vi} from 'vitest';
import {SurfaceComparison, comparisonWarmFrames, comparisonMeasureFrames, comparisonPose, type SurfacePolicy} from '../src/surfaceComparison';
import {SkyPerformance, type PerformanceScene} from '../src/skyPerformance';
import {SkyFrames} from '../src/skyFrames';

function harness() {
  let now = 0, policy: SurfacePolicy = 'auto';
  const log = new SkyPerformance({commit: 'test', dirty: false}, () => now);
  const scene: PerformanceScene = {backend: 'gpu', reason: '', driver: 'Brave', preference: 'auto', width: 390, height: 844, dpr: 2, zoom: 1,
    starCount: 8922, layerMask: 31, figureMode: 'all', following: false, reducedMotion: false, timeMode: 'fixed', starsVisible: true, milkyWayVisible: true, belowHorizon: false};
  log.scene = scene;
  const comparison = new SurfaceComparison(log, () => now);
  const reset = vi.fn((value: SurfacePolicy) => {policy = value;return true;});
  comparison.attach({reset, policy: () => policy});
  const apply = vi.fn(), restore = vi.fn();
  const tick = (identity = 'PRIVATE_TIME_AND_LOCATION') => {
    comparison.beforeFrame(now);
    const recorder = comparison.recorder, frame = recorder?.beginFrame();
    frame?.beginDraw('gpu');now += 3;
    comparison.validateScene(scene, identity, 2);
    recorder?.endFrame(frame ?? null, true, false);
    comparison.afterFrame(false);now += 13;
  };
  return {log, scene, comparison, apply, restore, reset, tick};
}
afterEach(() => vi.useRealTimers());
describe('controlled GPU surface comparison', () => {
  it('uses ABBA, equal measured poses, excluded warmups, bounded reports and automatic restoration', () => {
    vi.useFakeTimers();const h = harness();expect(h.comparison.start({apply: h.apply, restore: h.restore}, 'preview')).toBe(true);
    for (let i = 0; i < 4 * (comparisonWarmFrames + comparisonMeasureFrames); i++) h.tick();
    const report = h.comparison.snapshot();expect(report.valid).toBe(true);
    expect(report.runs.map(r => r.policy)).toEqual(['exact', 'retained', 'retained', 'exact']);
    expect(report.runs.map(r => r.report.frames.length)).toEqual([240, 240, 240, 240]);
    expect(report.runs.every(r => r.report.frames.every(f => f.inputs['scripted-view'] === 1 && f.inputs['manual-view'] === 0))).toBe(true);
    expect(h.reset.mock.calls.flat()).toEqual(['exact', 'retained', 'retained', 'exact', 'auto']);
    expect(h.restore).toHaveBeenCalledOnce();expect(h.log.snapshot().frames).toEqual([]);expect(vi.getTimerCount()).toBe(0);
    const poses = h.apply.mock.calls.map(c => c[0]);expect(poses.slice(0,324)).toEqual(poses.slice(324,648));
    expect(poses[324-1]).toEqual({heading: 180, pitch: 31});
    const json = JSON.stringify(report);expect(json).not.toContain('PRIVATE_TIME_AND_LOCATION');expect(json).not.toContain('latitude');
    report.runs[0].report.frames[0].drawMs = 999;expect(h.comparison.snapshot().runs[0].report.frames[0].drawMs).toBe(3);
  });
  it.each(['page-hidden', 'user-interaction', 'view-unavailable', 'reset'] as const)('cancels %s preserving a partial report and cleaning timers', reason => {
    vi.useFakeTimers();const h = harness();h.comparison.start({apply: h.apply, restore: h.restore}, 'fixed');
    for(let i=0;i<comparisonWarmFrames+2;i++)h.tick();h.comparison.cancel(reason);h.comparison.cancel(reason);
    expect(h.comparison.snapshot()).toMatchObject({valid:false, reason, runs:[{complete:false,report:{summary:{frames:2}}}]});
    expect(h.restore).toHaveBeenCalledOnce();expect(h.reset).toHaveBeenLastCalledWith('auto');expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['viewport', 'time', 'sensor', 'backend'] as const)('rejects a changed %s during measurement', change => {
    vi.useFakeTimers();const h = harness();h.comparison.start({apply:h.apply,restore:h.restore}, 'fixed');h.tick();
    if(change==='viewport')h.scene.width++;
    if(change==='sensor')h.scene.following=true;
    if(change==='backend')h.scene.backend='canvas';
    h.tick(change==='time'?'DIFFERENT_TIME':'PRIVATE_TIME_AND_LOCATION');
    expect(h.comparison.active).toBe(false);expect(h.comparison.snapshot().valid).toBe(false);expect(h.restore).toHaveBeenCalledOnce();
  });
  it('does not overlap ordinary recording, and expires without drawing', () => {
    vi.useFakeTimers();const h=harness();h.log.start();expect(h.comparison.start({apply:h.apply,restore:h.restore},'live')).toBe(false);
    h.log.stop('manual');h.scene.following=true;expect(h.comparison.start({apply:h.apply,restore:h.restore},'live')).toBe(false);h.scene.following=false;h.comparison.start({apply:h.apply,restore:h.restore},'live');vi.advanceTimersByTime(60_000);
    expect(h.comparison.snapshot()).toMatchObject({valid:false,reason:'time-limit'});expect(h.restore).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
  });
  it('runs through the shared scheduler and commits each scripted pose before its only draw', () => {
    vi.useFakeTimers();const h=harness(), callbacks=new Map<number,FrameRequestCallback>();let seq=0, pose={heading:0,pitch:0};
    const frames=new SkyFrames({request:fn=>{callbacks.set(++seq,fn);return seq;},cancel:id=>{callbacks.delete(id);},commit:fn=>fn()},h.log);
    let policy: SurfacePolicy='auto';frames.comparison.attach({reset:p=>{policy=p;return true;},policy:()=>policy});
    const key=Symbol();const drawn: typeof pose[]=[];
    frames.setRenderer(()=>{drawn.push(pose);frames.activePerformance.current?.beginDraw('gpu');frames.comparison.validateScene(h.scene,'private',2);return false;});
    frames.comparison.start({apply:v=>frames.enqueue(key,()=>{pose=v;}),restore:()=>{}},'fixed');
    for(let i=0;i<1296;i++){expect(callbacks.size).toBe(1);const callback=[...callbacks.values()][0];callbacks.clear();callback(i*16);}
    expect(drawn).toHaveLength(1296);expect(drawn[84]).toEqual(comparisonPose(84));expect(frames.comparison.snapshot().valid).toBe(true);expect(callbacks.size).toBe(0);
  });
});
