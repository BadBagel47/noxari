import {describe, expect, it, vi} from 'vitest';
import {commonConstellationIds, constellationSky, drawConstellations} from '../src/constellations';
import {ConstellationReveal, clipFigureSegment} from '../src/constellationReveal';
import {horizontalStarCatalog} from '../src/skyProjection';
import {stockholm} from '../src/astronomy';

describe('common constellation selection', () => {
  it('keeps a valid 24-figure subset, including southern landmarks, without changing its star geometry', () => {
    const stars = horizontalStarCatalog(new Date('2026-01-15T22:00:00Z'), stockholm);
    const all = constellationSky(stars, 'all'), common = constellationSky(stars, 'common');
    expect(all).toHaveLength(88);
    expect(common).toHaveLength(24);
    expect(new Set(common.map(f => f.id))).toEqual(commonConstellationIds);
    for (const id of ['Ori', 'UMa', 'Cas', 'Cru', 'Cen', 'Car']) expect(common.some(f => f.id === id)).toBe(true);
    for (const figure of common) expect(figure).toEqual(all.find(f => f.id === figure.id));
  });
});

describe('constellation entrance animation', () => {
  it('progresses while the visible set is stable and completes without restarting on view updates', () => {
    const reveal = new ConstellationReveal();
    expect(reveal.update(['Ori'], 100, false).progress.get('Ori')).toBe(0);
    const middle = reveal.update(['Ori'], 310, false);
    expect(middle.progress.get('Ori')).toBeCloseTo(.875);
    expect(middle.animating).toBe(true);
    expect(reveal.update(['Ori', 'Gem'], 400, false).progress.get('Ori')).toBeGreaterThan(.875);
    expect(reveal.update(['Ori', 'Gem'], 400, false).progress.get('Gem')).toBe(0);
    expect(reveal.update(['Ori', 'Gem'], 1000, false).animating).toBe(false);
    expect(reveal.update(['Ori'], 1200, false).progress.get('Ori')).toBe(1);
  });

  it('ignores short edge crossings but animates a genuine reentry and a fresh enabled session', () => {
    const reveal = new ConstellationReveal();
    reveal.update(['Ori'], 0, false);
    reveal.update([], 500, false);
    expect(reveal.update(['Ori'], 600, false).progress.get('Ori')).toBe(1);
    reveal.update([], 700, false);
    expect(reveal.update(['Ori'], 1000, false).progress.get('Ori')).toBe(0);
    reveal.reset();
    expect(reveal.update(['Ori'], 2000, false).progress.get('Ori')).toBe(0);
  });

  it('respects reduced motion immediately, including preference changes during an animation', () => {
    const reveal = new ConstellationReveal();
    reveal.update(['Ori'], 0, false);
    const reduced = reveal.update(['Ori', 'Gem'], 100, true);
    expect([...reduced.progress.values()]).toEqual([1, 1]);
    expect(reduced.animating).toBe(false);
    expect(reveal.update(['Ori', 'Gem'], 200, false).animating).toBe(false);
  });

  it('clips crossing segments, rejects corner misses/nonfinite points and retains screen-edge geometry', () => {
    expect(clipFigureSegment({x: -20, y: 50}, {x: 120, y: 50}, 100, 100)).toEqual([{x: 0, y: 50}, {x: 100, y: 50}]);
    expect(clipFigureSegment({x: -20, y: 5}, {x: 5, y: -20}, 100, 100)).toBeNull();
    expect(clipFigureSegment({x: Infinity, y: 0}, {x: 1, y: 1}, 100, 100)).toBeNull();
    expect(clipFigureSegment({x: 100, y: 10}, {x: 100, y: 90}, 100, 100)).toEqual([{x: 100, y: 10}, {x: 100, y: 90}]);
  });

  it('draws a growing visible stroke, fades its label and stops requesting frames on completion', () => {
    const context = Object.fromEntries(['save', 'restore', 'beginPath', 'rect', 'clip', 'moveTo', 'lineTo', 'stroke', 'fillText'].map(name => [name, vi.fn()])) as unknown as CanvasRenderingContext2D;
    context.measureText = vi.fn(() => ({width: 20} as TextMetrics));
    const figures = [{id: 'Ori', name: 'Orion', center: {altitude: 100, azimuth: 50}, arcs: [[{altitude: 100, azimuth: -100}, {altitude: 100, azimuth: 200}]]}];
    const reveal = new ConstellationReveal();
    const draw = (now: number) => drawConstellations(context, figures, p => ({x: p.azimuth, y: p.altitude}), 100, 200, 1, true, {reveal, now, reducedMotion: false});
    expect(draw(0)).toBe(true);
    expect(context.lineTo).not.toHaveBeenCalled();
    expect(context.fillText).not.toHaveBeenCalled();
    expect(draw(210)).toBe(true);
    expect(context.lineTo).toHaveBeenLastCalledWith(87.5, 100);
    expect(context.fillText).toHaveBeenCalledWith('Orion', 50, 100);
    expect(draw(420)).toBe(false);
    expect(context.lineTo).toHaveBeenLastCalledWith(100, 100);
    expect(drawConstellations(context, figures, () => null, 100, 200, 0, true, {reveal, now: 500, reducedMotion: false})).toBe(false);
    expect(reveal.update(['Ori'], 600, false).progress.get('Ori')).toBe(0);
  });
});
