import type {SkyPosition} from './astronomy';
import {constellationFigures} from './generated/constellations';
import type {HorizontalStar, MapPoint} from './skyProjection';
import {clipFigureSegment, type ConstellationReveal} from './constellationReveal';

export type FigureMode = 'common' | 'all';
// A Noxari editorial selection, not an IAU popularity classification.
export const commonConstellationIds = new Set(['And', 'Aql', 'Aur', 'Boo', 'CMa', 'Cnc', 'Car', 'Cas', 'Cen', 'Cru', 'Cyg', 'Gem', 'Her', 'Leo', 'Lyr', 'Ori', 'Peg', 'Per', 'Sco', 'Sgr', 'Tau', 'UMa', 'UMi', 'Vir']);

const RAD = Math.PI / 180;
function vector(position: SkyPosition) {
  const altitude = position.altitude * RAD, azimuth = position.azimuth * RAD;
  return [Math.cos(altitude) * Math.sin(azimuth), Math.cos(altitude) * Math.cos(azimuth), Math.sin(altitude)];
}
function position(v: number[]): SkyPosition {
  return {altitude: Math.atan2(v[2], Math.hypot(v[0], v[1])) / RAD, azimuth: (Math.atan2(v[0], v[1]) / RAD + 360) % 360};
}

// Sample the minor great-circle arc before projecting, including stars below
// the horizon so each projection can clip the figure at its real horizon.
export function figureArc(start: SkyPosition, end: SkyPosition): SkyPosition[] {
  const a = vector(start), b = vector(end);
  const angle = Math.acos(Math.max(-1, Math.min(1, a.reduce((sum, value, i) => sum + value * b[i], 0))));
  if (angle < 1e-8) return [start, end];
  const steps = Math.max(1, Math.ceil(angle / RAD));
  return Array.from({length: steps + 1}, (_, i) => {
    const t = i / steps;
    const left = Math.sin((1 - t) * angle) / Math.sin(angle), right = Math.sin(t * angle) / Math.sin(angle);
    return position(a.map((value, j) => value * left + b[j] * right));
  });
}

export function constellationSky(stars: HorizontalStar[], mode: FigureMode = 'all') {
  const byHip = new Map(stars.filter(star => star.hip !== null).map(star => [star.hip, star]));
  return constellationFigures.filter(figure => mode === 'all' || commonConstellationIds.has(figure.id)).map(figure => {
    const ids = [...new Set(figure.lines.flat())];
    const members = ids.map(id => byHip.get(id)).filter((star): star is HorizontalStar => Boolean(star));
    const center = position(members.reduce((sum, star) => vector(star).map((value, i) => sum[i] + value), [0, 0, 0]));
    const arcs = figure.lines.flatMap(line => line.slice(1).flatMap((id, index) => {
      const start = byHip.get(line[index]), end = byHip.get(id);
      return start && end ? [figureArc(start, end)] : [];
    }));
    return {id: figure.id, name: figure.name, center, arcs};
  });
}

export function drawConstellations(context: CanvasRenderingContext2D, figures: ReturnType<typeof constellationSky>, project: (position: SkyPosition) => MapPoint | null, width: number, height: number, visibility: number, showNames: boolean, animation?: {reveal: ConstellationReveal; now: number; reducedMotion: boolean; entryInset?: boolean}) {
  if (visibility <= 0) { animation?.reveal.reset(); return false; }
  const insetX = animation?.entryInset === false ? 0 : Math.min(56, width * .12);
  const insetY = animation?.entryInset === false ? 0 : Math.min(80, height * .12);
  const projected = figures.flatMap(figure => figure.arcs.map((arc, index) => {
    const segments: [MapPoint, MapPoint][] = [];
    let previous: MapPoint | null = null;
    for (const sample of arc) {
      const point = project(sample);
      if (point && previous) {
        const clipped = clipFigureSegment(previous, point, width, height);
        if (clipped && Math.hypot(clipped[1].x - clipped[0].x, clipped[1].y - clipped[0].y) > .1) segments.push(clipped);
      }
      previous = point;
    }
    const eligible = segments.some(([a, b]) => clipFigureSegment(
      {x: a.x - insetX, y: a.y - insetY}, {x: b.x - insetX, y: b.y - insetY}, width - 2 * insetX, height - 2 * insetY));
    return {figure, id: `${figure.id}:${index}`, segments, eligible};
  }));
  const state = animation?.reveal.update(
    projected.filter(item => item.segments.length).map(item => item.id), animation.now, animation.reducedMotion,
    projected.filter(item => item.eligible).map(item => item.id));
  const figureProgress = new Map<string, number>();
  context.save();
  context.beginPath(); context.rect(0, 0, width, height); context.clip();
  context.strokeStyle = '#7cabe1'; context.lineWidth = 1;
  for (const {figure, id, segments} of projected) {
    const progress = state ? state.progress.get(id) ?? 0 : 1;
    figureProgress.set(figure.id, Math.max(figureProgress.get(figure.id) ?? 0, progress));
    context.globalAlpha = visibility * .6 * progress;
    let remaining = segments.reduce((sum, [a, b]) => sum + Math.hypot(b.x - a.x, b.y - a.y), 0) * progress;
    context.beginPath();
    for (const [a, b] of segments) {
      if (remaining <= 0) break;
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const fraction = length ? Math.min(1, remaining / length) : 1;
      context.moveTo(a.x, a.y);
      context.lineTo(a.x + (b.x - a.x) * fraction, a.y + (b.y - a.y) * fraction);
      remaining -= length;
    }
    context.stroke();
  }
  if (showNames && visibility > .5) {
    const placed: {x: number; y: number; width: number}[] = [];
    context.font = 'italic 15px system-ui, sans-serif'; context.textAlign = 'center';
    context.fillStyle = '#a9c6ec';
    for (const figure of figures) {
      const progress = figureProgress.get(figure.id) ?? 0;
      if (progress < .3) continue;
      context.globalAlpha = visibility * .95 * progress;
      const point = project(figure.center);
      if (!point) continue;
      const labelWidth = context.measureText(figure.name).width;
      if (point.x < labelWidth / 2 + 6 || point.x > width - labelWidth / 2 - 6 || point.y < 60 || point.y > height - 60) continue;
      if (placed.some(other => Math.abs(other.y - point.y) < 22 && Math.abs(other.x - point.x) < (labelWidth + other.width) / 2 + 12)) continue;
      context.fillText(figure.name, point.x, point.y);
      placed.push({...point, width: labelWidth});
    }
  }
  context.restore();
  return state?.animating ?? false;
}
