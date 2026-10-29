import type {SkyPosition} from './astronomy';
import {constellationFigures} from './generated/constellations';
import type {HorizontalStar, MapPoint} from './skyProjection';

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

export function constellationSky(stars: HorizontalStar[]) {
  const byHip = new Map(stars.filter(star => star.hip !== null).map(star => [star.hip, star]));
  return constellationFigures.map(figure => {
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

export function drawConstellations(context: CanvasRenderingContext2D, figures: ReturnType<typeof constellationSky>, project: (position: SkyPosition) => MapPoint | null, width: number, height: number, visibility: number, showNames: boolean) {
  if (visibility <= 0) return;
  context.save();
  context.beginPath(); context.rect(0, 0, width, height); context.clip();
  context.globalAlpha = visibility * .5;
  context.strokeStyle = '#7cabe1'; context.lineWidth = 1;
  for (const figure of figures) {
    context.beginPath();
    for (const arc of figure.arcs) {
      let connected = false;
      for (const sample of arc) {
        const point = project(sample);
        if (!point) { connected = false; continue; }
        if (connected) context.lineTo(point.x, point.y);
        else context.moveTo(point.x, point.y);
        connected = true;
      }
    }
    context.stroke();
  }
  if (showNames && visibility > .5) {
    const placed: {x: number; y: number; width: number}[] = [];
    context.globalAlpha = visibility * .85;
    context.font = 'italic 12px system-ui, sans-serif'; context.textAlign = 'center';
    context.fillStyle = '#a9c6ec';
    for (const figure of figures) {
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
}
