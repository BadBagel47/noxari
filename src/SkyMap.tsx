import {MilkyWayPainter, type MilkyWayTexture} from './milkyWay';
import {useEffect, useMemo, useRef, useState, type PointerEvent} from 'react';
import {ConstellationDrawingCache, constellationSky, drawConstellations, type FigureMode} from './constellations';
import {ConstellationReveal} from './constellationReveal';
import {useReducedMotion} from './useReducedMotion';
import {boundarySky, drawBoundaries} from './constellationBoundaries';
import {Body} from 'astronomy-engine';
import {objectPositioner, positionAt, showObjectMarker, solarAppearance, type ObservingLocation} from './astronomy';
import {objects, type SpaceObject} from './data';
import {candidateObjects} from './candidateObjects';
import {horizontalStarCatalog, projectHorizontal} from './skyProjection';
import {stellarBrightness} from './skyVisibility';
import {layoutObjectLabels, skyOverlayExclusions} from './objectLabels';

type Props = {
  selectedId?: string;
  time: Date;
  location: ObservingLocation;
  label: (object: SpaceObject) => string;
  language: 'en'|'sv';
  sunLabel: string;
  onSelect: (object: SpaceObject) => void;
  showFigures: boolean;
  showFigureNames: boolean;
  figureMode: FigureMode;
  showBoundaries: boolean;
  showCandidateCollection: boolean;
  milkyWay: MilkyWayTexture | null;
};

export function SkyMap({selectedId, time, location, label, language, sunLabel, onSelect, showFigures, showFigureNames, figureMode, showBoundaries, showCandidateCollection, milkyWay}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reveal = useRef(new ConstellationReveal());
  const figureCache = useRef(new ConstellationDrawingCache());
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
  const projectFigure = useMemo(() => (position: Parameters<typeof projectHorizontal>[0]) => projectHorizontal(position, size.width, size.height, zoom), [size.width, size.height, zoom]);
  const boundaries = useMemo(() => showBoundaries ? boundarySky(time, location) : [], [showBoundaries, time, location]);
  const stars = useMemo(() => catalog.flatMap(star => {
    const point = projectHorizontal(star, size.width, size.height, zoom);
    return point ? [{...star, ...point}] : [];
  }), [catalog, size, zoom]);
  const objectSky = useMemo(() => {
    const resolve = objectPositioner(time, location);
    return [...objects, ...(showCandidateCollection ? candidateObjects : [])].flatMap(object => {
      const position = resolve(object);
      const appearance = object.kind === 'Planet' ? solarAppearance(object, time) : null;
      return position ? [{object, position, appearance}] : [];
    });
  }, [time, location, showCandidateCollection]);
  const markers = useMemo(() => objectSky.flatMap(({object, position, appearance}) => {
    if (!size.width || !size.height) return [];
    // Markers distinguish civil twilight for planets from darker deep-sky conditions.
    if (!showObjectMarker(object, sun.altitude, appearance)) return [];
    const point = position && projectHorizontal(position, size.width, size.height, zoom);
    return point ? [{object, point, altitude: position.altitude}] : [];
  }), [objectSky, size.width, size.height, sun.altitude, zoom]);
  const hasDaylightPlanetMarker = sun.altitude >= 0 && markers.some(marker => marker.object.kind === 'Planet');
  const sunPoint = size.width && size.height ? projectHorizontal(sun, size.width, size.height, zoom) : null;
  const labelExclusions = useMemo(() => skyOverlayExclusions(container.current), [size.width, size.height, selectedId, language]);
  const labelPlacements = useMemo(() => layoutObjectLabels([
    ...markers.map(({object, point}) => ({id: object.id, text: label(object), x: point.x, y: point.y, priority: object.id === selectedId ? 1000 : object.kind === 'Moon' ? 800 : object.kind === 'Planet' ? 700 : 300})),
    ...(sunPoint ? [{id: 'sun', text: sunLabel, x: sunPoint.x, y: sunPoint.y, priority: 900}] : []),
  ], size.width, size.height, labelExclusions), [markers, size.width, size.height, label, selectedId, sunPoint, sunLabel, labelExclusions]);

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
      const directions = language === 'sv' ? ['N', 'Ö', 'S', 'V'] as const : ['N', 'E', 'S', 'W'] as const;
      for (const [name, x, y] of [
        [directions[0], centerX, centerY - edge], [directions[1], centerX + edge, centerY + 4],
        [directions[2], centerX, centerY + edge + 8], [directions[3], centerX - edge, centerY + 4],
      ] as const) context.fillText(name, x, y);
      context.font = '12px system-ui, sans-serif';
      context.fillStyle = '#7fa2c0';
      context.fillText(language === 'sv' ? 'Zenit' : 'Zenith', centerX, centerY - 7);

      if (showBoundaries) drawBoundaries(context, boundaries, position => projectHorizontal(position, width, height, zoom), width, height, starVisibility);

      const animating = showFigures && drawConstellations(context, figures, projectFigure, width, height, starVisibility, showFigureNames, {reveal: reveal.current, now: performance.now(), reducedMotion, entryInset: false}, figureCache.current);
      if (!showFigures) reveal.current.reset();

      if (starVisibility > 0) {
        for (const star of stars) {
          const brightness = stellarBrightness(star.magnitude);
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
  }, [projectFigure, size, zoom, stars, figures, boundaries, showFigures, showFigureNames, figureMode, showBoundaries, reducedMotion, sun.altitude, milkyWay, time, location]);

  return <div className="sky-canvas sky-map" ref={container} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishPointer} onPointerCancel={finishPointer} onLostPointerCapture={finishPointer} onClickCapture={event => { if (suppressClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); } }}>
    <canvas ref={canvas} aria-label={language === 'sv' ? 'Beräknad zenitcentrerad himmel med egenrörelse och valbara stjärnbildsfigurer och IAU-gränser; horisonten är den yttre cirkeln. Nyp för att zooma.' : 'Calculated zenith-centered sky with proper motion and optional constellation figures and IAU boundaries; horizon is the outer circle. Pinch to zoom.'} role="img"/>
    {hasDaylightPlanetMarker && <p className="daylight-marker-note">{language === 'sv' ? 'Beräknad dagsposition · synlighet varierar' : 'Calculated daytime position · visibility varies'}</p>}
    {markers.map(({object, point, altitude}) => {const placement = labelPlacements.get(object.id)!;return <button key={object.id} className={`sky-object ${selectedId === object.id ? 'is-selected' : ''}`} aria-pressed={selectedId === object.id} style={{left: point.x, top: point.y}} onClick={() => onSelect(object)} title={`${label(object)} · ${altitude.toLocaleString(language === 'sv' ? 'sv-SE' : 'en-GB', {minimumFractionDigits: 1, maximumFractionDigits: 1})}°`} aria-label={`${label(object)}, ${language === 'sv' ? 'höjd' : 'altitude'} ${altitude.toLocaleString(language === 'sv' ? 'sv-SE' : 'en-GB', {minimumFractionDigits: 1, maximumFractionDigits: 1})}°`}><span className="sky-point" style={{width: object.size + 4, height: object.size + 4, background: object.color, boxShadow: `0 0 16px ${object.color}`}}/><span className="sky-object-label" aria-hidden="true" hidden={!placement.visible} style={{left: `calc(50% + ${placement.dx}px)`, top: `calc(50% + ${placement.dy}px)`}}>{label(object)}</span></button>;})}
    {sunPoint && <span className="sky-object sky-sun" style={{left: sunPoint.x, top: sunPoint.y}} role="img" aria-label={`${sunLabel}, ${language === 'sv' ? 'höjd' : 'altitude'} ${sun.altitude.toLocaleString(language === 'sv' ? 'sv-SE' : 'en-GB', {minimumFractionDigits: 1, maximumFractionDigits: 1})}°`}><span className="sky-point"/><span className="sky-object-label" aria-hidden="true" hidden={!labelPlacements.get('sun')?.visible} style={{left: `calc(50% + ${labelPlacements.get('sun')?.dx ?? 0}px)`, top: `calc(50% + ${labelPlacements.get('sun')?.dy ?? 32}px)`}}>{sunLabel}</span></span>}
  </div>;
}
