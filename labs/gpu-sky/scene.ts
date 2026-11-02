import {AstroTime, Body, Observer, RotateVector, Rotation_HOR_EQJ, Vector} from 'astronomy-engine';
import {objects} from '../../src/data';
import {candidateObjects} from '../../src/candidateObjects';
import {objectPositioner, positionAt, showObjectMarker, solarAppearance, stockholm, type ObservingLocation, type SkyPosition} from '../../src/astronomy';
import {horizontalStarCatalog, prepareHorizontalDirections, prepareHorizontalStars, createPerspectiveProjector, createPreparedPerspectiveProjector, perspectiveFocal, type MapPoint, type ViewDirection} from '../../src/skyProjection';
import {constellationSky, drawConstellations} from '../../src/constellations';
import {boundarySky, drawBoundaries} from '../../src/constellationBoundaries';
import {ConstellationReveal} from '../../src/constellationReveal';
import {groundOpacity} from '../../src/groundView';
import {darkSkyVisibility, projectedStarVisibility, stellarBrightness} from '../../src/skyVisibility';
import {MilkyWayPainter, type MilkyWayTexture} from '../../src/milkyWay';
import {GpuSky} from './GpuSky';

export type Mode = 'canvas' | 'gpu' | 'gpu-stars' | 'gpu-milky';
export type Parts = {milky: number; stars: number; other: number; total: number};
export const fixtureTime = new Date('2026-01-15T22:00:00Z');
export const fixtureLocation = stockholm;
export const startView = {heading: 180, pitch: 31};

export class LabScene {
  stars;
  figures;
  boundaries;
  sun;
  objectSky;
  basis: Float32Array;
  key: string;
  reveal = new ConstellationReveal();
  private milkyPainter = new MilkyWayPainter();

  constructor(readonly time: Date, readonly location: ObservingLocation, readonly texture: MilkyWayTexture) {
    this.key = [time.getTime(), location.latitude, location.longitude].join('|');
    this.stars = prepareHorizontalStars(horizontalStarCatalog(time, location));
    this.figures = constellationSky(this.stars, 'all');
    this.boundaries = boundarySky(time, location).map(arc => prepareHorizontalDirections(arc));
    this.sun = positionAt(Body.Sun, time, location);
    const resolve = objectPositioner(time, location);
    this.objectSky = [...objects, ...candidateObjects].flatMap(object => {
      const position = resolve(object), appearance = object.kind === 'Planet' ? solarAppearance(object, time) : null;
      return position ? [{object, position, appearance}] : [];
    });
    const rotation = Rotation_HOR_EQJ(time, new Observer(location.latitude, location.longitude, 0));
    const instant = new AstroTime(time);
    this.basis = new Float32Array([[1, 0, 0], [0, 1, 0], [0, 0, 1]].flatMap(([x, y, z]) => {
      const p = RotateVector(rotation, new Vector(x, y, z, instant));return [p.x, p.y, p.z];
    }));
  }

  markers(view: ViewDirection, width: number, height: number, zoom: number) {
    return this.objectSky.flatMap(({object, position, appearance}) => {
      if (!showObjectMarker(object, this.sun.altitude, appearance) || (position.altitude < 0 && groundOpacity(view.pitch) > .9)) return [];
      const point = createPerspectiveProjector(view, width, height, true, view.pitch < 0, zoom)(position);
      return point ? [{object, point, opacity: position.altitude < 0 ? (1 - groundOpacity(view.pitch)) * .8 : 1}] : [];
    });
  }

  draw(surface: HTMLCanvasElement, gpu: GpuSky | null, requested: Mode, width: number, height: number, dpr: number, view: ViewDirection, zoom: number, now: number, reducedMotion: boolean) {
    const start = performance.now();
    const w = Math.round(width * dpr), h = Math.round(height * dpr);
    if (surface.width !== w) surface.width = w;if (surface.height !== h) surface.height = h;
    const context = surface.getContext('2d', {alpha: false})!;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);context.globalAlpha = 1;context.textAlign = 'left';
    const gpuReady = gpu?.available === true;
    const gpuMilky = gpuReady && (requested === 'gpu' || requested === 'gpu-milky');
    const gpuStars = gpuReady && (requested === 'gpu' || requested === 'gpu-stars');
    const belowReveal = 1 - groundOpacity(view.pitch);
    const project = createPerspectiveProjector(view, width, height, true, belowReveal > 0, zoom);
    const projectStar = createPreparedPerspectiveProjector(view, width, height, true, belowReveal > 0, zoom);
    const projectBoundary = createPreparedPerspectiveProjector(view, width, height, true, belowReveal > 0, zoom, 48);
    const daylight = Math.max(0, Math.min(1, (this.sun.altitude + 18) / 24));
    const starVisibility = darkSkyVisibility(this.sun.altitude);
    const horizonY = height / 2 + perspectiveFocal(width, height, zoom) * Math.tan(view.pitch * Math.PI / 180);
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, daylight ? `rgb(${Math.round(6 + 52 * daylight)},${Math.round(14 + 92 * daylight)},${Math.round(35 + 145 * daylight)})` : '#040c1b');
    sky.addColorStop(1, daylight ? `rgb(${Math.round(21 + 77 * daylight)},${Math.round(41 + 103 * daylight)},${Math.round(69 + 139 * daylight)})` : '#14304b');
    context.fillStyle = sky;context.fillRect(0, 0, width, height);
    if (belowReveal > 0) {
      context.save();const lower = context.createLinearGradient(0, Math.max(0, horizonY), 0, height);
      lower.addColorStop(0, '#071322');lower.addColorStop(1, '#030813');context.globalAlpha = belowReveal;context.fillStyle = lower;
      context.fillRect(0, Math.max(0, horizonY), width, height);context.restore();
    }
    const mwStart = performance.now();
    const mwVisibility = Math.max(0, Math.min(1, (-this.sun.altitude - 8) / 10));
    if (gpuMilky) gpu!.drawMilkyWay(context, width, height, dpr, view, mwVisibility, belowReveal > 0, zoom, this.basis, this.key);
    else this.milkyPainter.draw(context, this.texture, this.time, this.location, width, height, mwVisibility, view, belowReveal > 0, zoom);
    const milky = performance.now() - mwStart;
    const drawCurve = (samples: SkyPosition[]) => {
      context.beginPath();let previous: MapPoint | null = null;
      for (const position of samples) {
        const point = project(position);
        if (point) {
          if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < width / 8) context.lineTo(point.x, point.y);
          else context.moveTo(point.x, point.y);
        }
        previous = point;
      }
      context.stroke();
    };
    context.strokeStyle = 'rgba(171,209,233,.17)';context.lineWidth = 1;
    for (const altitude of (belowReveal > 0 ? [-60, -30, 0, 15, 30, 60] : [15, 30, 60])) drawCurve(Array.from({length: 361}, (_, azimuth) => ({altitude, azimuth})));
    for (let azimuth = 0; azimuth < 360; azimuth += 30) drawCurve(Array.from({length: belowReveal > 0 ? 181 : 91}, (_, i) => ({altitude: i - (belowReveal > 0 ? 90 : 0), azimuth})));
    drawBoundaries(context, this.boundaries, projectBoundary, width, height, starVisibility);
    const animating = drawConstellations(context, this.figures, p => project(p, false), width, height, starVisibility, true, {reveal: this.reveal, now, reducedMotion});
    const starStart = performance.now();
    if (starVisibility > 0 || belowReveal > 0) {
      if (gpuStars) gpu!.drawStars(context, width, height, dpr, view, starVisibility, belowReveal, zoom);
      else {
        context.fillStyle = '#e3f1ff';
        for (const star of this.stars) {
          const visibility = projectedStarVisibility(this.sun.altitude, star.altitude, belowReveal);
          if (visibility <= 0) continue;
          const point = projectStar(star);if (!point) continue;
          context.globalAlpha = visibility * (.28 + stellarBrightness(star.magnitude) * .72);
          const radius = star.magnitude < 0 ? 3 : star.magnitude < 2 ? 2.2 : star.magnitude < 4 ? 1.5 : .9;
          context.beginPath();context.arc(point.x, point.y, radius, 0, Math.PI * 2);context.fill();
        }
        context.globalAlpha = 1;
      }
    }
    const stars = performance.now() - starStart;
    if (starVisibility > .5 || belowReveal > .5) {
      context.fillStyle = '#b9d4e8';context.font = '13px system-ui, sans-serif';
      for (const star of this.stars) {
        if (!star.name || star.name === 'Sirius' || projectedStarVisibility(this.sun.altitude, star.altitude, belowReveal) <= .5) continue;
        const point = projectStar(star);if (point && point.x < width - 85 && point.y > 20) context.fillText(star.name, point.x + 6, point.y - 6);
      }
    }
    context.font = 'bold 12px system-ui, sans-serif';context.textAlign = 'center';context.fillStyle = '#d5e9f4';
    for (const azimuth of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const point = createPerspectiveProjector(view, width, height, true, false, zoom)({altitude: 4, azimuth});
      if (point && point.y > 35 && point.y < height - 32) context.fillText(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][azimuth / 45], point.x, point.y);
    }
    if (horizonY < height) {
      context.save();context.globalAlpha = groundOpacity(view.pitch);
      const ground = context.createLinearGradient(0, Math.max(0, horizonY), 0, height);
      ground.addColorStop(0, daylight > .4 ? '#233f4c' : '#142b38');ground.addColorStop(1, '#061420');
      context.fillStyle = ground;context.fillRect(0, Math.max(0, horizonY), width, height);context.restore();
      if (horizonY >= 0) {context.strokeStyle = 'rgba(174,216,238,.6)';context.lineWidth = 1;context.beginPath();context.moveTo(0, horizonY + .5);context.lineTo(width, horizonY + .5);context.stroke();}
    }
    const total = performance.now() - start;
    return {animating, effective: gpuReady ? requested : 'canvas', parts: {milky, stars, other: total - milky - stars, total} satisfies Parts};
  }
}
