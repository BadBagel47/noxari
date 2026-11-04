import {describe, expect, it, vi} from 'vitest';
import {ConstellationDrawingCache, constellationSky, drawConstellations} from '../src/constellations';
import {ConstellationReveal} from '../src/constellationReveal';
import {createPerspectiveProjector, createPreparedPerspectiveProjector, horizontalStarCatalog} from '../src/skyProjection';
import {stockholm} from '../src/astronomy';

const fixture = () => [{id: 'Ori', name: 'Orion', center: {altitude: 100, azimuth: 50}, arcs: [[{altitude: 100, azimuth: -100}, {altitude: 100, azimuth: 200}]]}];
const context = () => {
  const ctx = Object.fromEntries(['save', 'restore', 'beginPath', 'rect', 'clip', 'moveTo', 'lineTo', 'stroke', 'fillText'].map(name => [name, vi.fn()])) as unknown as CanvasRenderingContext2D;
  ctx.measureText = vi.fn(() => ({width: 20} as TextMetrics));return ctx;
};

describe('bounded constellation drawing cache', () => {
  it('reuses projected strokes through animation but refreshes scene, projection, dimensions and entry rules', () => {
    const cache = new ConstellationDrawingCache(), figures = fixture();
    const project = vi.fn(p => ({x: p.azimuth, y: p.altitude}));
    const first = cache.geometry(figures, project, 100, 200, true), calls = project.mock.calls.length;
    expect(cache.geometry(figures, project, 100, 200, true)).toBe(first);
    expect(project).toHaveBeenCalledTimes(calls);
    const moved = cache.geometry(figures, p => ({x: p.azimuth + 10, y: p.altitude}), 100, 200, true);
    expect(moved).not.toBe(first);expect(moved.labels[0].point?.x).toBe(60);
    expect(cache.geometry(figures, project, 120, 200, true).strokes[0].length).toBeCloseTo(120, 8);
    expect(cache.geometry(figures, project, 120, 220, true)).not.toBe(moved);
    expect(cache.geometry(figures, project, 120, 220, false)).not.toBe(first);
    const updated = fixture();updated[0].arcs[0][1].altitude = 130;
    expect(cache.geometry(updated, project, 100, 200, true).strokes[0].segments[0].length).toBeGreaterThan(100);
  });

  it('keeps reveal progress separate and measures a name only once across poses and toggles', () => {
    const cache = new ConstellationDrawingCache(), figures = fixture(), ctx = context(), reveal = new ConstellationReveal();
    const project = vi.fn(p => ({x: p.azimuth, y: p.altitude}));
    const draw = (now: number, names = true) => drawConstellations(ctx, figures, project, 100, 200, 1, names, {reveal, now, reducedMotion: false}, cache);
    expect(draw(0)).toBe(true);const calls = project.mock.calls.length;
    expect(draw(500)).toBe(true);expect(ctx.lineTo).toHaveBeenLastCalledWith(50, 100);
    expect(draw(1000)).toBe(false);expect(ctx.lineTo).toHaveBeenLastCalledWith(100, 100);
    expect(project).toHaveBeenCalledTimes(calls);expect(ctx.measureText).toHaveBeenCalledTimes(1);
    draw(1200, false);draw(1300);expect(ctx.measureText).toHaveBeenCalledTimes(1);
    drawConstellations(ctx, figures, p => ({x: p.azimuth + 1, y: p.altitude}), 100, 200, 1, true, {reveal, now: 1400, reducedMotion: false}, cache);
    expect(ctx.fillText).toHaveBeenLastCalledWith('Orion', 51, 100);expect(ctx.measureText).toHaveBeenCalledTimes(1);
    const other = context();cache.textWidth(other, 'Orion');expect(other.measureText).toHaveBeenCalledOnce();
    ctx.font = 'bold 18px serif';cache.textWidth(ctx, 'Orion');expect(ctx.measureText).toHaveBeenCalledTimes(2);
  });

  it('matches the former projection/clipping across all figures, wrap, downward and near-zenith views', () => {
    const figures = constellationSky(horizontalStarCatalog(new Date('2026-01-15T22:00:00Z'), stockholm));
    for (const view of [{heading: 0, pitch: 0}, {heading: 359, pitch: 31}, {heading: 180, pitch: -25}, {heading: 13, pitch: 89.9}]) {
      const width = 390, height = 844, zoom = 1.7, below = view.pitch < 0;
      const legacy = createPerspectiveProjector(view, width, height, true, below, zoom);
      const before = new ConstellationDrawingCache().geometry(figures, p => legacy(p, false), width, height, true);
      const after = new ConstellationDrawingCache().geometry(figures, createPreparedPerspectiveProjector(view, width, height, false, below, zoom), width, height, true);
      expect(after.visible).toEqual(before.visible);expect(after.eligible).toEqual(before.eligible);
      for (let i = 0; i < before.strokes.length; i++) {
        expect(after.strokes[i].length).toBeCloseTo(before.strokes[i].length, 7);
        expect(after.strokes[i].segments.length).toBe(before.strokes[i].segments.length);
      }
    }
  });
});
