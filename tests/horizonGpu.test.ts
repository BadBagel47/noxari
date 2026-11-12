import {afterEach, describe, expect, it, vi} from 'vitest';
import type {PreparedHorizontalStar} from '../src/skyProjection';
import type {MilkyWayTexture} from '../src/milkyWay';

const state = vi.hoisted(() => ({software: false, initializationFails: false, drawFails: false, instances: [] as Array<{
  available: boolean; setScene: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn>; lose: ReturnType<typeof vi.fn>;
}>}));
vi.mock('../src/gpuSky', () => ({GpuSky: class {
  available = true;
  lose = vi.fn();
  gl = {isContextLost: () => false, getExtension: () => ({loseContext: this.lose})};
  setScene = vi.fn();
  dispose = vi.fn(() => { this.available = false; });
  surfacePolicy: 'exact' | 'retained';
  constructor(_canvas: HTMLCanvasElement, retain?: boolean) {
    this.surfacePolicy = (retain ?? !state.software) ? 'retained' : 'exact';
    if (state.initializationFails) throw new Error('unsupported');
    state.instances.push(this);
  }
  info() { return {renderer: state.software ? 'SwiftShader' : 'Brave', pointRange: [1, 511]}; }
  drawStars() { if (state.drawFails) throw new Error('draw failed'); }
  drawMilkyWay() { if (state.drawFails) throw new Error('draw failed'); }
}}));
import {HorizonGpu, skyRendererPreference} from '../src/horizonGpu';

const surface = () => Object.assign(new EventTarget(), {width: 1, height: 1, getContext: () => null}) as unknown as HTMLCanvasElement;
const stars = [] as PreparedHorizontalStar[];
const texture = {} as MilkyWayTexture;
const drawArgs = [{} as CanvasRenderingContext2D, 390, 844, 2, {heading: 180, pitch: 31}, 1, 0, 1] as const;
afterEach(() => {state.software = state.initializationFails = state.drawFails = false;state.instances.length = 0;});

describe('horizon GPU ownership and fallback', () => {
  it('keeps renderer overrides explicit and does not initialize GPU for Canvas', () => {
    expect(skyRendererPreference('?object=m31')).toBe('auto');
    expect(skyRendererPreference('?skyRenderer=canvas')).toBe('canvas');
    expect(skyRendererPreference('?skyRenderer=gpu')).toBe('gpu');
    expect(skyRendererPreference('?skyRenderer=unknown')).toBe('auto');
    const renderer = new HorizonGpu(surface(), vi.fn(), 'canvas');
    expect(renderer.drawStars(...drawArgs)).toBe(false);
    expect(state.instances).toHaveLength(0);
    renderer.dispose();
  });

  it('uses Canvas on known software renderers and still releases the owned context', () => {
    state.software = true;
    const renderer = new HorizonGpu(surface(), vi.fn(), 'auto');
    expect(renderer.backend).toBe('canvas');
    expect(renderer.reason).toBe('software-renderer');
    renderer.dispose();
    expect(state.instances[0].lose).toHaveBeenCalledOnce();
  });

  it('falls back when initialization or drawing fails without leaking a frame exception', () => {
    state.initializationFails = true;
    const unavailable = new HorizonGpu(surface(), vi.fn(), 'gpu');
    expect(unavailable.backend).toBe('canvas');
    unavailable.dispose();
    state.initializationFails = false;
    const renderer = new HorizonGpu(surface(), vi.fn(), 'gpu');
    expect(renderer.drawStars(...drawArgs)).toBe(true);
    state.drawFails = true;
    expect(renderer.drawStars(...drawArgs)).toBe(false);
    expect(renderer.backend).toBe('canvas');
    expect(state.instances[0].dispose).toHaveBeenCalledOnce();
    renderer.dispose();
  });

  it('restores the latest scene after loss and invalidates the shared queue', () => {
    const canvas = surface(), invalidate = vi.fn();
    const renderer = new HorizonGpu(canvas, invalidate, 'gpu');
    renderer.setScene(stars, texture);
    const loss = new Event('webglcontextlost', {cancelable: true});
    canvas.dispatchEvent(loss);
    expect(loss.defaultPrevented).toBe(true);
    expect(renderer.drawStars(...drawArgs)).toBe(false);
    const newerStars = [...stars];
    renderer.setScene(newerStars, null);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(renderer.backend).toBe('gpu');
    expect(state.instances[1].setScene).toHaveBeenLastCalledWith(newerStars, null, null);
    expect(invalidate).toHaveBeenCalledTimes(2);
    renderer.dispose();
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(state.instances).toHaveLength(2);
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(state.instances[1].lose).toHaveBeenCalledOnce();
  });

  it('recreates bounded GPU resources for policy changes then restores automatic sizing', () => {
    const canvas = surface(), renderer = new HorizonGpu(canvas, vi.fn(), 'gpu');renderer.setScene(stars, texture);
    expect(renderer.policy).toBe('retained');expect(renderer.resetSurface('exact')).toBe(true);expect(renderer.policy).toBe('exact');
    expect(state.instances[0].dispose).toHaveBeenCalledOnce();expect(state.instances[1].setScene).toHaveBeenCalledWith(stars, texture, null);
    expect(renderer.resetSurface('retained')).toBe(true);expect(renderer.policy).toBe('retained');
    state.software = true;expect(renderer.resetSurface('auto')).toBe(true);expect(renderer.policy).toBe('exact');
    renderer.dispose();for (const gpu of state.instances) expect(gpu.dispose).toHaveBeenCalledOnce();
    expect(state.instances.slice(0,-1).every(gpu => gpu.lose.mock.calls.length === 0)).toBe(true);
  });

  it('keeps the frame renderable in Canvas after a scene upload failure', () => {
    const renderer = new HorizonGpu(surface(), vi.fn(), 'gpu');
    state.instances[0].setScene.mockImplementation(() => { throw new Error('out of memory'); });
    expect(() => renderer.setScene(stars, texture)).not.toThrow();
    expect(renderer.backend).toBe('canvas');
    expect(renderer.reason).toBe('scene-upload');
    expect(renderer.drawStars(...drawArgs)).toBe(false);
    renderer.dispose();
    expect(state.instances[0].lose).toHaveBeenCalledOnce();
  });
});
