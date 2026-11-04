import {describe, expect, it} from 'vitest';
import {MotionResolution} from '../src/motionResolution';

describe('motion canvas resolution', () => {
  it('keeps full detail for stillness, initial placement, a single jump and sensor jitter', () => {
    const quality = new MotionResolution();
    expect(quality.sample({heading: 180, pitch: 30}, 1, 3, 0)).toEqual({dpr: 2, restoreAt: null});
    expect(quality.sample({heading: 90, pitch: 40}, 1, 3, 16).dpr).toBe(2);
    expect(quality.sample({heading: 90.01, pitch: 40.01}, 1, 3, 32).dpr).toBe(2);
    expect(quality.sample({heading: 90.02, pitch: 40}, 1, 3, 1000)).toEqual({dpr: 2, restoreAt: null});
  });

  it('uses one lower resolution through sustained motion, then restores after settling', () => {
    const quality = new MotionResolution();
    quality.sample({heading: 0, pitch: 0}, 1, 2, 0);
    const ratios: number[] = [];
    for (let i = 1; i <= 20; i++) ratios.push(quality.sample({heading: i, pitch: 0}, 1, 2, i * 16).dpr);
    expect(ratios).toEqual([2, ...Array(19).fill(1.5)]);
    expect(quality.sample({heading: 20, pitch: 0}, 1, 2, 1000)).toEqual({dpr: 1.5, restoreAt: 1120});
    expect(quality.sample({heading: 20, pitch: 0}, 1, 2, 1120)).toEqual({dpr: 2, restoreAt: null});
    expect(quality.sample({heading: 30, pitch: 0}, 1, 2, 2000).dpr).toBe(2);
  });

  it('handles wraparound, vertical movement and pinch without changing view or zoom', () => {
    const quality = new MotionResolution();
    const view = {heading: 359.98, pitch: 30};
    quality.sample(view, 1, 2, 0);
    expect(quality.sample({heading: .01, pitch: 30}, 1, 2, 16).dpr).toBe(2);
    expect(quality.sample({heading: .01, pitch: 31}, 1, 2, 32).dpr).toBe(2);
    expect(quality.sample({heading: .01, pitch: 31}, 1.05, 2, 48).dpr).toBe(1.5);
    expect(view).toEqual({heading: 359.98, pitch: 30});
  });

  it('does not bounce back to full resolution if a slow frame already has fresh movement', () => {
    const quality = new MotionResolution();
    quality.sample({heading: 0, pitch: 0}, 1, 2, 0);
    quality.sample({heading: 1, pitch: 0}, 1, 2, 16);
    quality.sample({heading: 2, pitch: 0}, 1, 2, 32);
    expect(quality.sample({heading: 3, pitch: 0}, 1, 2, 400)).toEqual({dpr: 1.5, restoreAt: 1200});
    expect(quality.sample({heading: 3, pitch: 0}, 1, 2, 1201).dpr).toBe(2);
  });

  it('keeps buffers through brief pauses and renewed movement, but restores after a real stop', () => {
    const quality = new MotionResolution();
    quality.sample({heading: 0, pitch: 0}, 1, 2, 0);
    quality.sample({heading: 1, pitch: 0}, 1, 2, 16);
    quality.sample({heading: 2, pitch: 0}, 1, 2, 32);
    expect(quality.sample({heading: 2, pitch: 0}, 1, 2, 432).dpr).toBe(1.5);
    expect(quality.sample({heading: 3, pitch: 0}, 1, 2, 500)).toEqual({dpr: 1.5, restoreAt: 1300});
    expect(quality.sample({heading: 3, pitch: 0}, 1, 2, 984).dpr).toBe(1.5);
    expect(quality.sample({heading: 4, pitch: 0}, 1, 2, 1000)).toEqual({dpr: 1.5, restoreAt: 1800});
    expect(quality.sample({heading: 4, pitch: 0}, 1, 2, 1800)).toEqual({dpr: 2, restoreAt: null});
    expect(quality.sample({heading: 5, pitch: 0}, 1, 2, 2000).dpr).toBe(2);
    expect(quality.sample({heading: 6, pitch: 0}, 1, 2, 2016).dpr).toBe(1.5);
  });

  it('does not let sub-threshold jitter extend the settling period', () => {
    const quality = new MotionResolution();
    quality.sample({heading: 0, pitch: 0}, 1, 2, 0);
    quality.sample({heading: 1, pitch: 0}, 1, 2, 16);
    quality.sample({heading: 2, pitch: 0}, 1, 2, 32);
    expect(quality.sample({heading: 2.01, pitch: .01}, 1.0001, 2, 600)).toEqual({dpr: 1.5, restoreAt: 832});
    expect(quality.sample({heading: 2.02, pitch: 0}, 1, 2, 832)).toEqual({dpr: 2, restoreAt: null});
  });

  it('does not upscale low-DPR displays or request a pointless restore repaint', () => {
    for (const native of [1, 1.25, 1.5]) {
      const quality = new MotionResolution();
      quality.sample({heading: 0, pitch: 0}, 1, native, 0);
      quality.sample({heading: 1, pitch: 0}, 1, native, 16);
      expect(quality.sample({heading: 2, pitch: 0}, 1, native, 32)).toEqual({dpr: native, restoreAt: null});
    }
  });
});
