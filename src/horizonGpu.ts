import {GpuSky} from './gpuSky';
import type {MilkyWayTexture} from './milkyWay';
import type {PreparedHorizontalStar} from './skyProjection';
import type {PerformanceFrame} from './skyPerformance';

export type SkyRendererPreference = 'auto' | 'canvas' | 'gpu';
export function skyRendererPreference(search: string): SkyRendererPreference {
  const value = new URLSearchParams(search).get('skyRenderer');
  return value === 'canvas' || value === 'gpu' ? value : 'auto';
}

/** Owns resources and recovery only. Drawing stays in the existing SkyFrames callback. */
export class HorizonGpu {
  private gpu: GpuSky | null = null;
  private context: WebGL2RenderingContext | null = null;
  private stars: PreparedHorizontalStar[] = [];
  private texture: MilkyWayTexture | null = null;
  private disposed = false;
  reason = '';
  driver = '';

  constructor(private canvas: HTMLCanvasElement, private invalidate: () => void, private preference: SkyRendererPreference) {
    canvas.addEventListener('webglcontextlost', this.lost);
    canvas.addEventListener('webglcontextrestored', this.restored);
    this.create();
  }

  get backend() { return this.gpu?.available ? 'gpu' : 'canvas'; }

  private create() {
    if (this.disposed || this.preference === 'canvas') { this.reason = 'requested-canvas'; return; }
    try {
      this.gpu = new GpuSky(this.canvas);
      this.context = this.gpu.gl;
      const info = this.gpu.info();
      this.driver = info.renderer;
      if (this.preference === 'auto' && /swiftshader|llvmpipe|software rasterizer/i.test(info.renderer)) {
        this.fail('software-renderer');
      } else if (info.pointRange[1] < 14) {
        this.fail('point-size-limit');
      } else {
        this.gpu.setScene(this.stars, this.texture);
        this.reason = '';
      }
    } catch {
      this.context ??= this.canvas.getContext('webgl2');
      this.fail('gpu-initialization');
    }
  }

  private fail(reason: string) {
    this.gpu?.dispose();
    this.gpu = null;
    this.reason = reason;
  }

  private lost = (event: Event) => {
    event.preventDefault();
    this.fail('context-lost');
    this.invalidate();
  };

  private restored = () => {
    this.create();
    this.invalidate();
  };

  setScene(stars: PreparedHorizontalStar[], texture: MilkyWayTexture | null) {
    this.stars = stars;
    this.texture = texture;
    if (this.gpu?.available) {
      try { this.gpu.setScene(stars, texture); }
      catch { this.fail('scene-upload'); }
    }
  }

  setMeasurement(frame: PerformanceFrame | null) {
    if (this.gpu) this.gpu.measurement = frame;
  }

  drawMilkyWay(...args: Parameters<GpuSky['drawMilkyWay']>) {
    return this.draw(gpu => gpu.drawMilkyWay(...args));
  }

  drawStars(...args: Parameters<GpuSky['drawStars']>) {
    return this.draw(gpu => gpu.drawStars(...args));
  }

  private draw(render: (gpu: GpuSky) => void) {
    if (!this.gpu?.available) return false;
    try { render(this.gpu); return true; }
    catch { this.fail('gpu-draw'); return false; }
  }

  dispose() {
    this.disposed = true;
    this.canvas.removeEventListener('webglcontextlost', this.lost);
    this.canvas.removeEventListener('webglcontextrestored', this.restored);
    const gl = this.context;
    this.fail('disposed');
    // Release the owned context on map switches / StrictMode cleanup as well as its buffers.
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.canvas.width = this.canvas.height = 1;
  }
}
