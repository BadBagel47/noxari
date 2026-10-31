import {MilkyWayPainter, type MilkyWayTexture} from './milkyWay';
import {useEffect, useMemo, useRef, useState, type PointerEvent} from 'react';
import {constellationSky, drawConstellations, type FigureMode} from './constellations';
import {ConstellationReveal} from './constellationReveal';
import {useReducedMotion} from './useReducedMotion';
import {boundarySky, drawBoundaries} from './constellationBoundaries';
import {Body} from 'astronomy-engine';
import {objectPositioner, positionAt, showObjectMarker, type ObservingLocation} from './astronomy';
import {objects, type SpaceObject} from './data';
import {horizontalStarCatalog, projectHorizontal} from './skyProjection';

type Props = {
  selectedId?: string;
  time: Date;
  location: ObservingLocation;
  label: (object: SpaceObject) => string;
  sunLabel: string;
  onSelect: (object: SpaceObject) => void;
  showFigures: boolean;
  showFigureNames: boolean;
  figureMode: FigureMode;
  showBoundaries: boolean;
  milkyWay: MilkyWayTexture | null;
};

export function SkyMap({selectedId, time, location, label, sunLabel, onSelect, showFigures, showFigureNames, figureMode, showBoundaries, milkyWay}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reveal = useRef(new ConstellationReveal());
  const milkyWayPainter = useRef(new MilkyWayPainter());
  const reducedMotion = useReducedMotion();
  const [size, setSize] = useState({width: 0, height: 0});
  const [zoom, setZoom] = useState(1);
  const touchPoints = useRef(new Map<number, {x: number; y: number}>());
  const pinch = useRef<{distance: number; zoom: number} | null>(null);
  const suppressClick = useRef(false);
  const sun = useMemo(() => positionAt(Body.Sun, time, location), [time, location]);
  const catalog = useMemo(() => horizontalStarCatalog(time, location), [time, location]);
  const figures = useMemo(() => constellationSky(catalog, figureMode), [catalog, figureMode]);
  const boundaries = useMemo(() => showBoundaries ? boundarySky(time, location) : [], [showBoundaries, time, location]);
  const stars = useMemo(() => catalog.flatMap(star => {
    const point = projectHorizontal(star, size.width, size.height, zoom);
    return point ? [{...star, ...point}] : [];
  }), [catalog, size, zoom]);
  const objectSky = useMemo(() => {
    const resolve = objectPositioner(time, location);
    return objects.flatMap(object => {
      const position = resolve(object);
      return position ? [{object, position}] : [];
    });
  }, [time, location]);
  const markers = useMemo(() => objectSky.flatMap(({object, position}) => {
    if (!size.width || !size.height) return [];
    // Markers distinguish civil twilight for planets from darker deep-sky conditions.
    if (!showObjectMarker(object, sun.altitude)) return [];
    const point = position && projectHorizontal(position, size.width, size.height, zoom);
    return point ? [{object, point, altitude: position.altitude}] : [];
  }), [objectSky, size.width, size.height, sun.altitude, zoom]);
  const sunPoint = size.width && size.height ? projectHorizontal(sun, size.width, size.height, zoom) : null;

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0].contentRect;
      setSize({width: rect.width, height: rect.height});
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!touchPoints.current.size && !pinch.current) suppressClick.current = false;
    if (event.pointerType !== 'touch') return;
    touchPoints.current.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (touchPoints.current.size === 2) {
      const points = [...touchPoints.current.values()];
      pinch.current = {distance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y), zoom};
      suppressClick.current = true;
      for (const id of touchPoints.current.keys()) {
        try { event.currentTarget.setPointerCapture(id); } catch { /* pointer may already have ended */ }
      }
    }
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' || !touchPoints.current.has(event.pointerId)) return;
    touchPoints.current.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (!pinch.current || touchPoints.current.size < 2) return;
    const points = [...touchPoints.current.values()];
    const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
    if (pinch.current.distance > 0) setZoom(Math.max(1, Math.min(2.5, pinch.current.zoom * distance / pinch.current.distance)));
  };
  const finishPointer = (event: PointerEvent<HTMLDivElement>) => {
    touchPoints.current.delete(event.pointerId);
    if (touchPoints.current.size < 2) pinch.current = null;
  };

  useEffect(() => {
    const surface = canvas.current;
    if (!surface || !size.width || !size.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    surface.width = Math.round(size.width * dpr);
    surface.height = Math.round(size.height * dpr);
    const context = surface.getContext('2d');
    if (!context) return;
    let frame = 0;
    const render = () => {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const {width, height} = size;
      const centerX = width / 2;
      const centerY = height / 2;
      const horizonRadius = Math.min(width, height) * 0.44;
      const daylight = Math.max(0, Math.min(1, (sun.altitude + 18) / 24));
      const starVisibility = Math.max(0, Math.min(1, (-sun.altitude - 2) / 12));

      context.fillStyle = daylight > 0 ? `rgb(${Math.round(6 + daylight * 48)},${Math.round(16 + daylight * 86)},${Math.round(32 + daylight * 122)})` : '#061020';
      context.fillRect(0, 0, width, height);
      const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, horizonRadius * 1.4);
      glow.addColorStop(0, 'rgba(55,102,145,.32)');
      glow.addColorStop(1, 'rgba(3,12,26,0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      if (milkyWay) milkyWayPainter.current.draw(context, milkyWay, time, location, width, height, Math.max(0, Math.min(1, (-sun.altitude - 8) / 10)), null, false, zoom);

      context.strokeStyle = 'rgba(141,189,225,.28)';
      context.lineWidth = 1;
      for (const altitude of [0, 30, 60]) {
        const radius = horizonRadius * (90 - altitude) / 90 * zoom;
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.stroke();
      }
      context.strokeStyle = 'rgba(141,189,225,.17)';
      for (const bearing of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        context.beginPath();
        context.moveTo(centerX, centerY);
        context.lineTo(centerX + horizonRadius * zoom * Math.sin(bearing), centerY - horizonRadius * zoom * Math.cos(bearing));
        context.stroke();
      }
      context.font = '13px system-ui, sans-serif';
      context.fillStyle = '#a9c8e2';
      context.textAlign = 'center';
      const edge = horizonRadius * zoom + 13;
      for (const [name, x, y] of [
        ['N', centerX, centerY - edge], ['E', centerX + edge, centerY + 4],
        ['S', centerX, centerY + edge + 8], ['W', centerX - edge, centerY + 4],
      ] as const) context.fillText(name, x, y);
      context.font = '12px system-ui, sans-serif';
      context.fillStyle = '#7fa2c0';
      context.fillText('Zenith', centerX, centerY - 7);

      if (showBoundaries) drawBoundaries(context, boundaries, position => projectHorizontal(position, width, height, zoom), width, height, starVisibility);

      const animating = showFigures && drawConstellations(context, figures, position => projectHorizontal(position, width, height, zoom), width, height, starVisibility, showFigureNames, {reveal: reveal.current, now: performance.now(), reducedMotion, entryInset: false});
      if (!showFigures) reveal.current.reset();

      if (starVisibility > 0) {
        for (const star of stars) {
          const brightness = Math.max(0.18, Math.min(1, (6.1 - star.magnitude) / 5.8));
          context.globalAlpha = starVisibility * (0.28 + brightness * 0.72);
          context.fillStyle = '#e2efff';
          const radius = star.magnitude < 0 ? 2.9 : star.magnitude < 2 ? 2.1 : star.magnitude < 4 ? 1.35 : 0.8;
          context.beginPath();
          context.arc(star.x, star.y, radius, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 1;
        if (starVisibility > 0.5) {
          context.font = '13px system-ui, sans-serif';
          context.fillStyle = '#a9c6df';
          context.textAlign = 'left';
          for (const star of stars) if (star.name && star.name !== 'Sirius') context.fillText(star.name, star.x + 5, star.y - 5);
        }
      }
      if (animating) frame = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(frame);
  }, [size, zoom, stars, figures, boundaries, showFigures, showFigureNames, figureMode, showBoundaries, reducedMotion, sun.altitude, milkyWay, time, location]);

  return <div className="sky-canvas sky-map" ref={container} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishPointer} onPointerCancel={finishPointer} onLostPointerCapture={finishPointer} onClickCapture={event => { if (suppressClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); } }}>
    <canvas ref={canvas} aria-label="Calculated zenith-centered sky with proper motion and optional constellation figures and IAU boundaries; horizon is the outer circle. Pinch to zoom." role="img"/>
    {markers.map(({object, point, altitude}) => <button key={object.id} className={`sky-object ${selectedId === object.id ? 'is-selected' : ''}`} aria-pressed={selectedId === object.id} style={{left: point.x, top: point.y}} onClick={() => onSelect(object)} title={`${label(object)} · ${altitude.toFixed(1)}°`} aria-label={`${label(object)}, altitude ${altitude.toFixed(1)}°`}><span className="sky-point" style={{width: object.size + 4, height: object.size + 4, background: object.color, boxShadow: `0 0 16px ${object.color}`}}/><span>{label(object)}</span></button>)}
    {sunPoint && <span className="sky-object sky-sun" style={{left: sunPoint.x, top: sunPoint.y}} role="img" aria-label={`${sunLabel}, altitude ${sun.altitude.toFixed(1)}°`}><span className="sky-point"/><span>{sunLabel}</span></span>}
  </div>;
}
