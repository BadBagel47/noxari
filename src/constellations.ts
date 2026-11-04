import type {SkyPosition} from './astronomy';
import {constellationFigures} from './generated/constellations';
import {prepareHorizontalDirections, type HorizontalStar, type MapPoint, type PreparedHorizontalDirection} from './skyProjection';
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

type Figures = ReturnType<typeof constellationSky>;
type FigureProjector = (position: PreparedHorizontalDirection) => MapPoint | null;

/** One scene and one projected view per mounted sky; animation owns no geometry. */
export class ConstellationDrawingCache {
  private source: Figures | null = null;
  private prepared: {id: string; name: string; center: PreparedHorizontalDirection; arcs: PreparedHorizontalDirection[][]}[] = [];
  private projected: ReturnType<ConstellationDrawingCache['project']> | null = null;
  private projector: FigureProjector | null = null;
  private width = 0;
  private height = 0;
  private entryInset = true;
  private widths = new WeakMap<CanvasRenderingContext2D, Map<string, number>>();

  geometry(figures: Figures, project: FigureProjector, width: number, height: number, entryInset: boolean) {
    if (figures !== this.source) {
      this.source = figures;
      this.prepared = figures.map(figure => ({id: figure.id, name: figure.name,
        center: prepareHorizontalDirections([figure.center])[0], arcs: figure.arcs.map(prepareHorizontalDirections)}));
      this.projected = null;
    }
    if (!this.projected || project !== this.projector || width !== this.width || height !== this.height || entryInset !== this.entryInset) {
      this.projector = project; this.width = width; this.height = height; this.entryInset = entryInset;
      this.projected = this.project(project, width, height, entryInset);
    }
    return this.projected;
  }

  private project(project: FigureProjector, width: number, height: number, entryInset: boolean) {
    const insetX = entryInset ? Math.min(56, width * .12) : 0;
    const insetY = entryInset ? Math.min(80, height * .12) : 0;
    const strokes: {figureId: string; id: string; segments: {a: MapPoint; b: MapPoint; length: number}[]; length: number}[] = [];
    const visible: string[] = [], eligible: string[] = [];
    const labels = this.prepared.map(figure => {
      figure.arcs.forEach((arc, index) => {
        const segments: {a: MapPoint; b: MapPoint; length: number}[] = [];
        let previous: MapPoint | null = null, total = 0, enters = false;
        for (const sample of arc) {
          const point = project(sample);
          if (point && previous) {
            const clipped = clipFigureSegment(previous, point, width, height);
            if (clipped) {
              const [a, b] = clipped, length = Math.hypot(b.x - a.x, b.y - a.y);
              if (length > .1) {
                segments.push({a, b, length}); total += length;
                enters ||= Boolean(clipFigureSegment({x: a.x - insetX, y: a.y - insetY}, {x: b.x - insetX, y: b.y - insetY}, width - 2 * insetX, height - 2 * insetY));
              }
            }
          }
          previous = point;
        }
        if (segments.length) {
          const id = `${figure.id}:${index}`;
          strokes.push({figureId: figure.id, id, segments, length: total}); visible.push(id);
          if (enters) eligible.push(id);
        }
      });
      return {id: figure.id, name: figure.name, point: project(figure.center)};
    });
    return {strokes, visible, eligible, labels};
  }

  textWidth(context: CanvasRenderingContext2D, text: string) {
    let entries = this.widths.get(context);
    if (!entries) { entries = new Map(); this.widths.set(context, entries); }
    const key = `${context.font}|${text}`;
    let width = entries.get(key);
    if (width === undefined) {
      width = context.measureText(text).width;
      // Figure names use a single system font; keep even unusual callers bounded.
      if (entries.size >= 128) entries.clear();
      entries.set(key, width);
    }
    return width;
  }
}

export function drawConstellations(context: CanvasRenderingContext2D, figures: Figures, project: FigureProjector, width: number, height: number, visibility: number, showNames: boolean, animation?: {reveal: ConstellationReveal; now: number; reducedMotion: boolean; entryInset?: boolean}, cache = new ConstellationDrawingCache()) {
  if (visibility <= 0) { animation?.reveal.reset(); return false; }
  const geometry = cache.geometry(figures, project, width, height, animation?.entryInset !== false);
  const state = animation?.reveal.update(geometry.visible, animation.now, animation.reducedMotion, geometry.eligible);
  const figureProgress = new Map<string, number>();
  context.save();
  context.beginPath(); context.rect(0, 0, width, height); context.clip();
  context.strokeStyle = '#7cabe1'; context.lineWidth = 1;
  for (const {figureId, id, segments, length} of geometry.strokes) {
    const progress = state ? state.progress.get(id) ?? 0 : 1;
    figureProgress.set(figureId, Math.max(figureProgress.get(figureId) ?? 0, progress));
    context.globalAlpha = visibility * .6 * progress;
    let remaining = length * progress;
    context.beginPath();
    for (const {a, b, length} of segments) {
      if (remaining <= 0) break;
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
    for (const {id, name, point} of geometry.labels) {
      const progress = figureProgress.get(id) ?? 0;
      if (progress < .3 || !point) continue;
      context.globalAlpha = visibility * .95 * progress;
      const labelWidth = cache.textWidth(context, name);
      if (point.x < labelWidth / 2 + 6 || point.x > width - labelWidth / 2 - 6 || point.y < 60 || point.y > height - 60) continue;
      if (placed.some(other => Math.abs(other.y - point.y) < 22 && Math.abs(other.x - point.x) < (labelWidth + other.width) / 2 + 12)) continue;
      context.fillText(name, point.x, point.y);
      placed.push({...point, width: labelWidth});
    }
  }
  context.restore();
  return state?.animating ?? false;
}
