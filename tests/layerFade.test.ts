import {describe, expect, it} from 'vitest';
import {LayerFades} from '../src/layerFade';

describe('layer fades', () => {
  it('starts settled, eases on toggle and stops animating when done', () => {
    const fades = new LayerFades<'grid'>(200);
    expect(fades.step({grid: true}, 0, false)).toEqual({values: {grid: 1}, animating: false});
    const mid = fades.step({grid: false}, 1000, false);
    expect(mid.values.grid).toBe(1); expect(mid.animating).toBe(true);
    const half = fades.step({grid: false}, 1100, false);
    expect(half.values.grid).toBeCloseTo(.5, 5);
    expect(fades.step({grid: false}, 1250, false)).toEqual({values: {grid: 0}, animating: false});
  });
  it('switches immediately with reduced motion', () => {
    const fades = new LayerFades<'art'>();
    fades.step({art: false}, 0, true);
    expect(fades.step({art: true}, 5, true)).toEqual({values: {art: 1}, animating: false});
  });
});
