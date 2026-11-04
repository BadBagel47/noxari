import {horizonGrid} from './skyGrid';
import {MotionResolution} from './motionResolution';
import {useSkyFrameState} from './useSkyFrames';
import type {SkyFrames} from './skyFrames';
import {useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type Dispatch, type PointerEvent, type SetStateAction} from 'react';
import {ConstellationDrawingCache, constellationSky, drawConstellations, type FigureMode} from './constellations';
import {ConstellationReveal} from './constellationReveal';
import {useReducedMotion} from './useReducedMotion';
import {boundarySky, drawBoundaries} from './constellationBoundaries';
import {Body} from 'astronomy-engine';
import {nextObjectRise, objectPosition, objectPositioner, positionAt, showObjectMarker, solarAppearance, type ObservingLocation} from './astronomy';
import {objects, type SpaceObject} from './data';
import {candidateObjects} from './candidateObjects';
import {createPerspectiveProjector, createPreparedPerspectiveProjector, horizontalStarCatalog, perspectiveFocal, prepareHorizontalDirections, prepareHorizontalStars, projectPerspective, type MapPoint, type PreparedHorizontalDirection, type ViewDirection} from './skyProjection';
import {GuidedFinder} from './GuidedFinder';
import {clampViewPitch, groundOpacity} from './groundView';
import {MilkyWayPainter, milkyWayBasis, type MilkyWayTexture} from './milkyWay';
import {HorizonGpu, skyRendererPreference} from './horizonGpu';
import type {PerformanceScene} from './skyPerformance';
import {darkSkyVisibility, projectedStarVisibility, stellarBrightness} from './skyVisibility';
import type {usePhoneOrientation} from './usePhoneOrientation';

type Props = {
  frames: SkyFrames;
  selectedId?: string;
  time: Date;
  timeMode: 'live' | 'fixed' | 'preview';
  location: ObservingLocation;
  label: (object: SpaceObject) => string;
  sunLabel: string;
  onSelect: (object: SpaceObject) => void;
  language: 'en' | 'sv';
  showFigures: boolean;
  showFigureNames: boolean;
  figureMode: FigureMode;
  showBoundaries: boolean;
  showCandidateCollection: boolean;
  milkyWay: MilkyWayTexture | null;
  view: ViewDirection;
  onViewChange: Dispatch<SetStateAction<ViewDirection>>;
  onDragViewChange: Dispatch<SetStateAction<ViewDirection>>;
  finderTarget: SpaceObject | null;
  phone: ReturnType<typeof usePhoneOrientation>;
  onStopFinder: () => void;
  onFinderDetails: () => void;
};

const wrap = (degrees: number) => (degrees % 360 + 360) % 360;
const cardinal = (heading: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(wrap(heading) / 45) % 8];

export function HorizonView({frames, selectedId, time, timeMode, location, label, sunLabel, onSelect, language, view, onViewChange, onDragViewChange, showFigures, showFigureNames, figureMode, showBoundaries, showCandidateCollection, milkyWay, finderTarget, phone, onStopFinder, onFinderDetails}: Props) {
  const comparisonStatus = useSyncExternalStore(frames.comparison.subscribe, frames.comparison.getSnapshot);
  const [comparisonTrackers] = useState(() => ({current: {pass: -1, reveal: new ConstellationReveal(), cache: new ConstellationDrawingCache(), resolution: new MotionResolution()}}));
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reveal = useRef(new ConstellationReveal());
  const figureCache = useRef(new ConstellationDrawingCache());
  const milkyWayPainter = useRef(new MilkyWayPainter());
  const gpu = useRef<HorizonGpu | null>(null);
  const [performanceScene] = useState<PerformanceScene>(() => ({backend: 'canvas', reason: 'not-drawn', driver: '',
    preference: skyRendererPreference(window.location.search), width: 0, height: 0, dpr: 1, zoom: 1, starCount: 0,
    starsVisible: false, milkyWayVisible: false, belowHorizon: false,
    layerMask: 0, figureMode: 'all', following: false, reducedMotion: false, timeMode: 'live'}));
  const resolution = useRef(new MotionResolution());
  const restoreResolution = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();
  const drag = useRef<{id: number; x: number; y: number; startX: number; startY: number; moved: boolean; marker: HTMLButtonElement | null} | null>(null);
  const touchPoints = useRef(new Map<number, {x: number; y: number}>());
  const pinch = useRef<{distance: number; zoom: number} | null>(null);
  const suppressClick = useRef(false);
  const [normalZoom, setZoom] = useSkyFrameState(1, frames, 'zoom');
  const zoom = comparisonStatus.active ? 1 : normalZoom;
  const [size, setSize] = useState({width: 0, height: 0});
  const stars = useMemo(() => prepareHorizontalStars(horizontalStarCatalog(time, location)), [time, location]);
  const milkyBasis = useMemo(() => milkyWayBasis(time, location), [time, location]);
  const sceneKey = `${time.getTime()}|${location.latitude}|${location.longitude}`;
  const figures = useMemo(() => constellationSky(stars, figureMode), [stars, figureMode]);
  const boundaries = useMemo(() => showBoundaries ? boundarySky(time, location) : [], [showBoundaries, time, location]);
  const preparedBoundaries = useMemo(() => boundaries.map(arc => prepareHorizontalDirections(arc)), [boundaries]);
  const sun = useMemo(() => positionAt(Body.Sun, time, location), [time, location]);
  const targetPosition = useMemo(() => finderTarget ? objectPosition(finderTarget, time, location) : null, [finderTarget, time, location]);
  const nextRise = useMemo(() => finderTarget && targetPosition && targetPosition.altitude < 0 ? nextObjectRise(finderTarget, time, location) : null, [finderTarget, targetPosition, time, location]);
  const objectSky = useMemo(() => {
    const resolve = objectPositioner(time, location);
    return [...objects, ...(showCandidateCollection ? candidateObjects : [])].flatMap(object => {
      const position = resolve(object);
      const appearance = object.kind === 'Planet' ? solarAppearance(object, time) : null;
      return position ? [{object, position, appearance}] : [];
    });
  }, [time, location, showCandidateCollection]);
  const markers = useMemo(() => objectSky.flatMap(({object, position, appearance}) => {
    if (object.id === finderTarget?.id) return [];
    if (!showObjectMarker(object, sun.altitude, appearance)) return [];
    if (position.altitude < 0 && groundOpacity(view.pitch) > .9) return [];
    const point = position && projectPerspective(position, view, size.width, size.height, true, view.pitch < 0, zoom);
    return point ? [{object, position, point}] : [];
  }), [objectSky, sun.altitude, view, size, finderTarget, zoom]);
  const hasDaylightPlanetMarker = sun.altitude >= 0 && markers.some(marker => marker.object.kind === 'Planet');
  const belowReveal = 1 - groundOpacity(view.pitch);
  const project = createPerspectiveProjector(view, size.width, size.height, true, belowReveal > 0, zoom);
  const projectFigure = useMemo(() => createPreparedPerspectiveProjector(view, size.width, size.height, false, belowReveal > 0, zoom), [view.heading, view.pitch, size.width, size.height, belowReveal > 0, zoom]);
  const sunPoint = project(sun);

  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const {width, height} = entry.contentRect;
      setSize({width, height});
    });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const end = (event: globalThis.PointerEvent) => {
      touchPoints.current.delete(event.pointerId);
      if (touchPoints.current.size < 2) pinch.current = null;
      if (drag.current?.id === event.pointerId) drag.current = null;
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  useLayoutEffect(() => {
    const renderer = new HorizonGpu(document.createElement('canvas'), () => frames.invalidate(), skyRendererPreference(window.location.search));
    gpu.current = renderer;
    frames.comparison.attach({reset: policy => {comparisonTrackers.current.pass = -1;return renderer.resetSurface(policy);}, policy: () => renderer.policy});
    frames.performance.scene = performanceScene;
    return () => {
      frames.comparison.detach();
      frames.clearRenderer();
      if (restoreResolution.current !== null) clearTimeout(restoreResolution.current);
      frames.performance.detachScene(performanceScene);
      renderer.dispose();
      gpu.current = null;
    };
  }, [frames, performanceScene]);

  useLayoutEffect(() => {
    const surface = canvas.current;
    if (!surface || !size.width || !size.height) { frames.clearRenderer(); return; }
    // The sky always paints an opaque background, so no canvas alpha buffer is needed.
    const context = surface.getContext('2d', {alpha: false});
    if (!context) { frames.clearRenderer(); return; }
    const render = (now: number) => {
      const renderer = gpu.current, measurement = frames.activePerformance.current;
      const comparing = frames.comparison.active;
      if (comparing && comparisonTrackers.current.pass !== frames.comparison.passIndex) {
        comparisonTrackers.current = {pass: frames.comparison.passIndex, reveal: new ConstellationReveal(), cache: new ConstellationDrawingCache(), resolution: new MotionResolution()};
      }
      const trackers = comparisonTrackers.current;
      if (comparing) now = frames.comparison.simulationTime;
      measurement?.beginDraw(renderer?.backend ?? 'canvas');
      renderer?.setMeasurement(measurement);
      renderer?.setScene(stars, milkyWay);
      const quality = (comparing ? trackers.resolution : resolution.current).sample(view, zoom, window.devicePixelRatio || 1, comparing ? now : performance.now());
      if (restoreResolution.current !== null) clearTimeout(restoreResolution.current);
      restoreResolution.current = comparing || quality.restoreAt === null ? null : setTimeout(() => {
        restoreResolution.current = null;
        frames.invalidate();
      }, Math.max(1, quality.restoreAt - performance.now() + 1));
      const dpr = quality.dpr;
      const pixelWidth = Math.round(size.width * dpr), pixelHeight = Math.round(size.height * dpr);
      if (surface.width !== pixelWidth) surface.width = pixelWidth;
      if (surface.height !== pixelHeight) surface.height = pixelHeight;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.globalAlpha = 1;
      context.textAlign = 'left';
      const {width, height} = size;
      const daylight = Math.max(0, Math.min(1, (sun.altitude + 18) / 24));
      const starVisibility = darkSkyVisibility(sun.altitude);
      const horizonY = height / 2 + perspectiveFocal(width, height, zoom) * Math.tan(view.pitch * Math.PI / 180);
      const projectStar = createPreparedPerspectiveProjector(view, width, height, true, belowReveal > 0, zoom);
      // Limit path commands to the visible viewport plus a small overscan.
      const projectBoundary = createPreparedPerspectiveProjector(view, width, height, true, belowReveal > 0, zoom, 48);
      const sky = context.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, daylight ? `rgb(${Math.round(6 + 52 * daylight)},${Math.round(14 + 92 * daylight)},${Math.round(35 + 145 * daylight)})` : '#040c1b');
      sky.addColorStop(1, daylight ? `rgb(${Math.round(21 + 77 * daylight)},${Math.round(41 + 103 * daylight)},${Math.round(69 + 139 * daylight)})` : '#14304b');
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);

      // Below the geometric horizon the transparent ground reveals a
      // deliberately simulated dark sky, even when the real sky is daytime.
      if (belowReveal > 0) {
        context.save();
        const lowerSky = context.createLinearGradient(0, Math.max(0, horizonY), 0, height);
        lowerSky.addColorStop(0, '#071322');
        lowerSky.addColorStop(1, '#030813');
        context.globalAlpha = belowReveal;
        context.fillStyle = lowerSky;
        context.fillRect(0, Math.max(0, horizonY), width, height);
        context.restore();
      }

      measurement?.phase('background');
      if (milkyWay) {
        const visibility = Math.max(0, Math.min(1, (-sun.altitude - 8) / 10));
        if (!renderer?.drawMilkyWay(context, width, height, dpr, view, visibility, belowReveal > 0, zoom, milkyBasis, sceneKey)) {
          milkyWayPainter.current.draw(context, milkyWay, time, location, width, height, visibility, view, belowReveal > 0, zoom);
        }
      }

      measurement?.phase('milkyWay');
      const drawCurve = (samples: PreparedHorizontalDirection[]) => {
        context.beginPath();
        let previous: MapPoint | null = null;
        for (const position of samples) {
          const point = projectStar(position);
          if (point) {
            if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < width / 8) context.lineTo(point.x, point.y);
            else context.moveTo(point.x, point.y);
          }
          previous = point;
        }
        context.stroke();
      };
      context.strokeStyle = 'rgba(171,209,233,.17)';
      context.lineWidth = 1;
      for (const curve of horizonGrid(belowReveal > 0)) drawCurve(curve);

      measurement?.phase('grid');
      if (showBoundaries) drawBoundaries(context, preparedBoundaries, projectBoundary, width, height, starVisibility);

      measurement?.phase('boundaries');
      const animating = showFigures && drawConstellations(context, figures, projectFigure, width, height, starVisibility, showFigureNames, {reveal: comparing ? trackers.reveal : reveal.current, now, reducedMotion}, comparing ? trackers.cache : figureCache.current);
      if (!showFigures) reveal.current.reset();
      measurement?.phase('figures');

      if (starVisibility > 0 || belowReveal > 0) {
        if (!renderer?.drawStars(context, width, height, dpr, view, starVisibility, belowReveal, zoom)) {
          context.fillStyle = '#e3f1ff';
          for (const star of stars) {
            const visibility = projectedStarVisibility(sun.altitude, star.altitude, belowReveal);
            if (visibility <= 0) continue;
            const point = projectStar(star);
            if (!point) continue;
            const brightness = stellarBrightness(star.magnitude);
            context.globalAlpha = visibility * (.28 + brightness * .72);
            const radius = star.magnitude < 0 ? 3 : star.magnitude < 2 ? 2.2 : star.magnitude < 4 ? 1.5 : .9;
            context.beginPath();
            context.arc(point.x, point.y, radius, 0, Math.PI * 2);
            context.fill();
          }
          context.globalAlpha = 1;
        }
      }
      measurement?.phase('stars');
      if (starVisibility > .5 || belowReveal > .5) {
        context.fillStyle = '#b9d4e8';
        context.font = '13px system-ui, sans-serif';
        for (const star of stars) {
          if (!star.name || star.name === 'Sirius') continue;
          if (projectedStarVisibility(sun.altitude, star.altitude, belowReveal) <= .5) continue;
          const point = projectStar(star);
          if (point && point.x < width - 85 && point.y > 20) context.fillText(star.name, point.x + 6, point.y - 6);
        }
      }

      context.font = 'bold 12px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillStyle = '#d5e9f4';
      for (let azimuth = 0; azimuth < 360; azimuth += 45) {
        const point = projectPerspective({altitude: 4, azimuth}, view, width, height, true, false, zoom);
        if (point && point.y > 35 && point.y < height - 32) context.fillText(cardinal(azimuth), point.x, point.y);
      }
      measurement?.phase('labels');
      // A level camera makes the geometric horizon horizontal at any heading.
      if (horizonY < height) {
        context.save();
        context.globalAlpha = groundOpacity(view.pitch);
        const ground = context.createLinearGradient(0, Math.max(0, horizonY), 0, height);
        ground.addColorStop(0, daylight > 0.4 ? '#233f4c' : '#142b38');
        ground.addColorStop(1, '#061420');
        context.fillStyle = ground;
        context.fillRect(0, Math.max(0, horizonY), width, height);
        context.restore();
        if (horizonY >= 0) {
          context.strokeStyle = 'rgba(174,216,238,.6)';
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(0, horizonY + .5);
          context.lineTo(width, horizonY + .5);
          context.stroke();
        }
      }

      measurement?.phase('ground');
      performanceScene.backend = renderer?.backend ?? 'canvas';performanceScene.reason = renderer?.reason ?? '';
      performanceScene.driver = renderer?.driver ?? '';performanceScene.width = width;performanceScene.height = height;
      performanceScene.dpr = dpr;performanceScene.zoom = zoom;performanceScene.starCount = stars.length;
      performanceScene.layerMask = Number(showFigures) | Number(showFigureNames) << 1 | Number(showBoundaries) << 2 | Number(Boolean(milkyWay)) << 3 | Number(showCandidateCollection) << 4;
      performanceScene.figureMode = figureMode;performanceScene.following = phone.active;performanceScene.reducedMotion = reducedMotion;
      performanceScene.timeMode = timeMode;performanceScene.starsVisible = starVisibility > 0 || belowReveal > 0;
      performanceScene.milkyWayVisible = Boolean(milkyWay) && sun.altitude < -8;performanceScene.belowHorizon = belowReveal > 0;
      if (root.current) {
        root.current.dataset.skyRenderer = renderer?.backend ?? 'canvas';
        root.current.dataset.skyRendererReason = renderer?.reason ?? '';
      }
      frames.activePerformance.scene = performanceScene;
      if (comparing) frames.comparison.validateScene(performanceScene, sceneKey + `|${finderTarget?.id ?? ''}|${selectedId ?? ''}|${language}`, window.devicePixelRatio || 1);
      frames.performance.sceneChanged();
      return Boolean(animating);
    };
    frames.setRenderer(render);
  }, [projectFigure, frames, size, view, zoom, stars, figures, boundaries, preparedBoundaries, showFigures, showFigureNames, figureMode, showBoundaries, reducedMotion, sun.altitude, milkyWay, milkyBasis, sceneKey, time, timeMode, location, performanceScene, phone.active, showCandidateCollection, comparisonStatus.active, selectedId, finderTarget, language]);

  const move = (heading: number, pitch: number) => onViewChange(current => ({heading: wrap(current.heading + heading), pitch: clampViewPitch(current.pitch + pitch)}));
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (frames.comparison.active) {frames.comparison.cancel('user-interaction');suppressClick.current = true;event.preventDefault();return;}
    event.currentTarget.dataset.pointerSteering = 'true';
    if (event.target instanceof Element && (event.target.closest('[data-sky-controls]') || (event.target.closest('button') && !event.target.closest('button.sky-object')))) return;
    if (event.pointerType === 'touch') {
      touchPoints.current.set(event.pointerId, {x: event.clientX, y: event.clientY});
      if (touchPoints.current.size === 2) {
        const points = [...touchPoints.current.values()];
        pinch.current = {distance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y), zoom};
        drag.current = null;
        suppressClick.current = true;
        for (const id of touchPoints.current.keys()) {
          try { event.currentTarget.setPointerCapture(id); } catch { /* pointer may already have ended */ }
        }
        return;
      }
      if (touchPoints.current.size > 2 || pinch.current) return;
    }
    if (!event.isPrimary || event.button !== 0 || drag.current) return;
    suppressClick.current = false;
    const marker = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button.sky-object') : null;
    drag.current = {id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false, marker};
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' && touchPoints.current.has(event.pointerId)) {
      touchPoints.current.set(event.pointerId, {x: event.clientX, y: event.clientY});
      if (pinch.current && touchPoints.current.size >= 2) {
        const points = [...touchPoints.current.values()];
        const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
        if (pinch.current.distance > 0) setZoom(Math.max(1, Math.min(3, pinch.current.zoom * distance / pinch.current.distance)));
        return;
      }
    }
    if (!drag.current || drag.current.id !== event.pointerId || !size.width) return;
    if (!drag.current.moved) {
      if (Math.hypot(event.clientX - drag.current.startX, event.clientY - drag.current.startY) < 8) return;
      drag.current.moved = true;
      suppressClick.current = true;
      // Defer capture until a drag is established so stationary marker taps
      // still activate the original button (including native keyboard clicks).
      event.currentTarget.setPointerCapture(event.pointerId);
      // A pointer drag needs no focus transfer. Keyboard users reach this
      // tabbable root normally and keep its visible focus/arrow controls.
    }
    const deltaX = event.clientX - drag.current.x;
    const deltaY = event.clientY - drag.current.y;
    drag.current.x = event.clientX; drag.current.y = event.clientY;
    const focal = perspectiveFocal(size.width, size.height, zoom);
    const horizontalField = 2 * Math.atan(size.width / (2 * focal)) * 180 / Math.PI;
    const verticalField = 2 * Math.atan(size.height / (2 * focal)) * 180 / Math.PI;
    onDragViewChange(current => ({heading: wrap(current.heading - deltaX * horizontalField / size.width), pitch: clampViewPitch(current.pitch + deltaY * verticalField / size.height)}));
  };
  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    touchPoints.current.delete(event.pointerId);
    if (touchPoints.current.size < 2) pinch.current = null;
    if (drag.current?.id === event.pointerId) drag.current = null;
  };
  const finishPointer = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = drag.current;
    if (!pinch.current && gesture?.id === event.pointerId && !gesture.moved && gesture.marker?.isConnected && event.pointerType === 'touch') {
      // Touch browsers can omit the compatibility click immediately after a
      // pan. Activate a settled marker tap here and suppress its later click.
      suppressClick.current = true;
      gesture.marker.click();
    }
    endPointer(event);
  };

  return <div className={`sky-canvas horizon-view ${finderTarget ? 'finder-active' : ''}`} ref={root} tabIndex={0}
    aria-label={phone.active ? (language === 'sv' ? 'Telefonföljning aktiv. Svep för att stoppa följningen och styra manuellt, nyp för att zooma.' : 'Phone following active. Drag to stop following and steer manually; pinch to zoom.') : (language === 'sv' ? 'Svepbar himmelsvy. Dra för att vrida, nyp för att zooma eller använd piltangenter för att ändra riktning.' : 'Interactive sky view. Drag to turn, pinch to zoom, or use arrow keys to change direction.')}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishPointer} onPointerCancel={endPointer}
    onLostPointerCapture={event => { if (event.target === event.currentTarget) endPointer(event); }}
    onClickCapture={event => { if (suppressClick.current && event.detail !== 0 && event.target instanceof Element && !event.target.closest('[data-sky-controls], .horizon-controls')) { event.preventDefault(); event.stopPropagation(); } }}
    onBlur={event => { if (event.target === event.currentTarget) delete event.currentTarget.dataset.pointerSteering; }}
    onKeyDown={event => {
      if (frames.comparison.active) {frames.comparison.cancel('user-interaction');event.preventDefault();event.stopPropagation();return;}
      delete event.currentTarget.dataset.pointerSteering;
      if (finderTarget && event.key === 'Escape') { event.preventDefault(); onStopFinder(); return; }
      const changes: Record<string, [number, number]> = {ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 8], ArrowDown: [0, -8]};
      const change = changes[event.key];
      if (change && event.target === event.currentTarget) { event.preventDefault(); move(...change); }
    }}>
    <canvas ref={canvas} aria-hidden="true"/>
    {hasDaylightPlanetMarker && <p className="daylight-marker-note">{language === 'sv' ? 'Beräknad dagsposition · synlighet varierar' : 'Calculated daytime position · visibility varies'}</p>}
    <div className="horizon-heading" aria-live="off">{language === 'sv' ? 'Mot' : 'Facing'} {cardinal(view.heading)} · {Math.round(view.heading)}° <span>{view.pitch < 0 ? '↓' : '↑'} {Math.round(Math.abs(view.pitch))}°</span>{view.pitch < 0 && <span className="below-horizon-label">{language === 'sv' ? 'Under horisonten · simulerad vy' : 'Below horizon · simulated view'}</span>}</div>
    {markers.map(({object, position, point}) => <button key={object.id} className={`sky-object ${selectedId === object.id ? 'is-selected' : ''}`} aria-pressed={selectedId === object.id} style={{left: point.x, top: point.y, opacity: position.altitude < 0 ? belowReveal * .8 : 1}} onClick={() => onSelect(object)} title={`${label(object)} · ${position.altitude.toFixed(1)}°`} aria-label={`${label(object)}, ${language === 'sv' ? 'höjd' : 'altitude'} ${position.altitude.toFixed(1)}°`}><span className="sky-point" style={{width: object.size + 4, height: object.size + 4, background: object.color, boxShadow: `0 0 16px ${object.color}`}}/><span>{label(object)}</span></button>)}
    {sunPoint && <span className="sky-object sky-sun" style={{left: sunPoint.x, top: sunPoint.y, opacity: sun.altitude < 0 ? belowReveal * .8 : 1}} role="img" aria-label={`${sunLabel}, ${language === 'sv' ? 'höjd' : 'altitude'} ${sun.altitude.toFixed(1)}°`}><span className="sky-point"/><span>{sunLabel}</span></span>}
    {finderTarget && targetPosition && <GuidedFinder object={finderTarget} position={targetPosition} nextRise={nextRise} location={location} view={view} width={size.width} height={size.height} language={language} phone={phone} sunAltitude={sun.altitude} zoom={zoom} onClose={onStopFinder} onDetails={onFinderDetails}/>}
    <div className="horizon-help">{language === 'sv' ? 'Dra för att se dig omkring · nyp för att zooma' : 'Drag to look around · pinch to zoom'}</div>
    <div className="horizon-controls" aria-label={language === 'sv' ? 'Styr vyn' : 'View controls'}>
      <button onClick={() => move(-30, 0)} aria-label={language === 'sv' ? 'Vrid åt vänster' : 'Turn left'}>←</button>
      <button onClick={() => move(0, 15)} aria-label={language === 'sv' ? 'Titta upp' : 'Look up'}>↑</button>
      <button onClick={() => move(0, -15)} aria-label={language === 'sv' ? 'Titta ner' : 'Look down'}>↓</button>
      <button onClick={() => move(30, 0)} aria-label={language === 'sv' ? 'Vrid åt höger' : 'Turn right'}>→</button>
    </div>
  </div>;
}
