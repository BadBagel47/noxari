import {MilkyWayPainter, type MilkyWayTexture} from './milkyWay';
import {SkyMarkerPoint} from './KindIcon';
import {ConstellationArtImages, constellationArtSky, drawConstellationArt} from './constellationArt';
import {constellationArt} from './generated/constellationArt';
import {eclipticSky} from './ecliptic';
import {satelliteCount, satelliteSky} from './satellites';
import {drawObjectPath, movesAmongStars, nightKey, nightPath, starPathSamples, starPathSky} from './objectPath';
import {namedStarObjects, namedStarShown} from './namedStars';
import {issObject} from './issObject';
import {useEffect, useMemo, useRef, useState, type PointerEvent} from 'react';
import {ConstellationDrawingCache, constellationSky, drawConstellations, type FigureMode} from './constellations';
import {ConstellationReveal} from './constellationReveal';
import {useReducedMotion} from './useReducedMotion';
import {boundarySky, drawBoundaries} from './constellationBoundaries';
import {Body} from 'astronomy-engine';
import {objectPositioner, positionAt, showObjectMarker, solarAppearance, type ObservingLocation} from './astronomy';
import {objects, type SpaceObject} from './data';
import {candidateObjects} from './candidateObjects';
import {shownAtSkyLevel, type SkyGroups, type SkyLevel} from './skyLevel';
import {horizontalStarCatalog, projectHorizontal} from './skyProjection';
import {starRadius, stellarBrightness} from './skyVisibility';
import {starFill} from './starColor';
import {skyOverlayExclusions} from './objectLabels';
import {useObjectLabels} from './useObjectLabels';

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
  showArt: boolean;
  showGrid: boolean;
  showEcliptic: boolean;
  /** Changes when externally loaded data (ISS elements) arrives. */
  dynamicKey?: number;
  skyLevel: SkyLevel;
  skyGroups: SkyGroups;
  extraObjects?: SpaceObject[];
  milkyWay: MilkyWayTexture | null;
  /** F-053: object whose track across the sky is drawn. */
  pathObject?: SpaceObject | null;
  pathMotion?: boolean;
  showSatellites?: boolean;
  satellitesKey?: number;
};

const noObjects: SpaceObject[] = [];
export function SkyMap({selectedId, time, location, label, language, sunLabel, onSelect, showFigures, showFigureNames, figureMode, showBoundaries, showArt, showGrid, showEcliptic, dynamicKey, skyLevel, skyGroups, milkyWay, extraObjects = noObjects, pathObject = null, pathMotion = false, showSatellites = false, satellitesKey = 0}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reveal = useRef(new ConstellationReveal());
  const figureCache = useRef(new ConstellationDrawingCache());
  const milkyWayPainter = useRef(new MilkyWayPainter());
  const artImages = useRef(new ConstellationArtImages(import.meta.env.BASE_URL));
  const [artLoaded, setArtLoaded] = useState(0);
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
  const projectArtNode = useMemo(() => (position: Parameters<typeof projectHorizontal>[0]) => {
    if (position.altitude < -60) return null;
    const radius = (90 - position.altitude) / 90 * Math.min(size.width, size.height) * .44 * zoom, angle = position.azimuth * Math.PI / 180;
    return {x: size.width / 2 + radius * Math.sin(angle), y: size.height / 2 - radius * Math.cos(angle)};
  }, [size.width, size.height, zoom]);
  const boundaries = useMemo(() => showBoundaries ? boundarySky(time, location) : [], [showBoundaries, time, location]);
  const artSky = useMemo(() => showArt ? constellationArtSky(time, location, figureMode) : [], [showArt, time, location, figureMode]);
  const ecliptic = useMemo(() => showEcliptic ? eclipticSky(time, location) : [], [showEcliptic, time, location]);
  const pathNightKey = nightKey(time);
  const pathNight = useMemo(() => pathObject ? nightPath(pathObject, time, location) : null, [pathObject, pathNightKey, location]);
  const pathStarKey = Math.floor(time.getTime() / (pathObject?.id === 'moon' ? 3_600_000 : 21_600_000));
  const pathSamples = useMemo(() => pathMotion && movesAmongStars(pathObject) ? starPathSamples(pathObject!, time, location, language) : null, [pathObject, pathMotion, pathStarKey, location, language]);
  const pathStars = useMemo(() => starPathSky(pathSamples, time, location), [pathSamples, time, location]);
  const objectTrack = useMemo(() => pathNight ? {...pathNight, ...pathStars} : null, [pathNight, pathStars]);
  // F-055: the map shows satellites at the shown time (the sky view animates them live).
  const satellites = useMemo(() => showSatellites && satellitesKey > 0 && satelliteCount() && sun.altitude < -6 ? satelliteSky(time, location).filter(item => item.sunlit) : [], [showSatellites, satellitesKey, sun.altitude, time, location]);
  useEffect(() => { if (showArt) artImages.current.preload(constellationArt.map(art => art.id), () => setArtLoaded(count => count + 1)); }, [showArt]);
  const stars = useMemo(() => catalog.flatMap(star => {
    const point = projectHorizontal(star, size.width, size.height, zoom);
    return point ? [{...star, ...point}] : [];
  }), [catalog, size, zoom]);
  const objectSky = useMemo(() => {
    const resolve = objectPositioner(time, location);
    return [...objects, issObject, ...namedStarObjects, ...candidateObjects, ...extraObjects].flatMap(object => {
      const position = resolve(object);
      const appearance = object.kind === 'Planet' ? solarAppearance(object, time) : null;
      return position ? [{object, position, appearance}] : [];
    });
  }, [time, location, dynamicKey, extraObjects]);
  const markers = useMemo(() => objectSky.flatMap(({object, position, appearance}) => {
    if (!size.width || !size.height) return [];
    if (object.id !== selectedId && (!shownAtSkyLevel(object, skyLevel, skyGroups) || !namedStarShown(object, zoom))) return [];
    // Markers distinguish civil twilight for planets from darker deep-sky conditions.
    if (!showObjectMarker(object, sun.altitude, appearance)) return [];
    const point = position && projectHorizontal(position, size.width, size.height, zoom);
    return point ? [{object, point, altitude: position.altitude}] : [];
  }), [objectSky, size.width, size.height, sun.altitude, zoom, skyLevel, skyGroups, selectedId]);
  const hasDaylightPlanetMarker = sun.altitude >= 0 && markers.some(marker => marker.object.kind === 'Planet');
  const sunPoint = size.width && size.height ? projectHorizontal(sun, size.width, size.height, zoom) : null;
  const labelExclusions = useMemo(() => skyOverlayExclusions(container.current), [size.width, size.height, selectedId, language]);
  const labelPlacements = useObjectLabels([
    ...markers.map(({object, point}) => ({id: object.id, text: label(object), x: point.x, y: point.y, priority: object.id === selectedId ? 1000 : object.kind === 'Moon' ? 800 : object.kind === 'Planet' ? 700 : 300})),
    ...(sunPoint ? [{id: 'sun', text: sunLabel, x: sunPoint.x, y: sunPoint.y, priority: 900}] : []),
  ], size.width, size.height, labelExclusions, language);

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
      for (const altitude of showGrid ? [0, 30, 60] : [0]) {
        const radius = horizonRadius * (90 - altitude) / 90 * zoom;
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.stroke();
      }
      context.strokeStyle = 'rgba(141,189,225,.17)';
      for (const bearing of showGrid ? [0, Math.PI / 2, Math.PI, Math.PI * 1.5] : []) {
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

      if (showEcliptic && ecliptic.length) {
        context.save();
        context.strokeStyle = 'rgba(242,201,138,.55)';
        context.setLineDash([6, 5]);
        context.lineWidth = 1.2;
        context.beginPath();
        let open = false;
        for (const position of ecliptic) {
          const point = projectHorizontal(position, width, height, zoom);
          if (!point) { open = false; continue; }
          if (open) context.lineTo(point.x, point.y); else context.moveTo(point.x, point.y);
          open = true;
        }
        context.stroke();
        context.restore();
      }
      if (satellites.length) {
        context.save();
        context.fillStyle = '#f2f6fb';
        context.globalAlpha = .85;
        for (const satellite of satellites) {
          const point = projectHorizontal(satellite, width, height, zoom);
          if (!point) continue;
          context.beginPath();
          context.arc(point.x, point.y, 1.6, 0, Math.PI * 2);
          context.fill();
        }
        context.restore();
      }
      if (objectTrack) drawObjectPath(context, objectTrack, position => projectHorizontal(position, width, height, zoom), width, Math.max(.75, starVisibility));
      if (showBoundaries) drawBoundaries(context, boundaries, position => projectHorizontal(position, width, height, zoom), width, height, starVisibility);
      // Below-horizon mesh nodes still project (outside the circle) so cells are not dropped; the horizon circle clips them.
      if (showArt) { context.save(); context.beginPath(); context.arc(width / 2, height / 2, Math.min(width, height) * .44 * zoom, 0, Math.PI * 2); context.clip(); }
      const artFading = showArt && drawConstellationArt(context, artSky, projectArtNode, width, height, starVisibility * .38 * Math.max(.3, Math.min(1, 1.3 - .3 * zoom)), artImages.current, () => setArtLoaded(count => count + 1));
      if (showArt) context.restore();

      const animating = showFigures && drawConstellations(context, figures, projectFigure, width, height, starVisibility, showFigureNames, {reveal: reveal.current, now: performance.now(), reducedMotion, entryInset: false}, figureCache.current);
      if (!showFigures) reveal.current.reset();

      if (starVisibility > 0) {
        for (const star of stars) {
          const brightness = stellarBrightness(star.magnitude);
          context.globalAlpha = starVisibility * (0.28 + brightness * 0.72);
          context.fillStyle = starFill(star.ci);
          const radius = starRadius(star.magnitude) * .92;
          context.beginPath();
          context.arc(star.x, star.y, radius, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 1;
      }
      if (animating || artFading) frame = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(frame);
  }, [projectFigure, projectArtNode, size, zoom, stars, figures, boundaries, showFigures, showFigureNames, figureMode, showBoundaries, showArt, showGrid, showEcliptic, artSky, ecliptic, artLoaded, reducedMotion, sun.altitude, milkyWay, time, location, objectTrack, satellites]);

  return <div className="sky-canvas sky-map" ref={container} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishPointer} onPointerCancel={finishPointer} onLostPointerCapture={finishPointer} onClickCapture={event => { if (suppressClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); } }}>
    <canvas ref={canvas} aria-label={language === 'sv' ? 'Beräknad zenitcentrerad himmel med egenrörelse och valbara stjärnbildsfigurer och IAU-gränser; horisonten är den yttre cirkeln. Nyp för att zooma.' : 'Calculated zenith-centered sky with proper motion and optional constellation figures and IAU boundaries; horizon is the outer circle. Pinch to zoom.'} role="img"/>
    {hasDaylightPlanetMarker && <p className="daylight-marker-note">{language === 'sv' ? 'Beräknad dagsposition · synlighet varierar' : 'Calculated daytime position · visibility varies'}</p>}
    {markers.map(({object, point, altitude}) => {const placement = labelPlacements.get(object.id)!;return <button key={object.id} className={`sky-object ${selectedId === object.id ? 'is-selected' : ''}`} aria-pressed={selectedId === object.id} style={{left: point.x, top: point.y}} onClick={() => onSelect(object)} title={`${label(object)} · ${altitude.toLocaleString(language === 'sv' ? 'sv-SE' : 'en-GB', {minimumFractionDigits: 1, maximumFractionDigits: 1})}°`} aria-label={`${label(object)}, ${language === 'sv' ? 'höjd' : 'altitude'} ${altitude.toLocaleString(language === 'sv' ? 'sv-SE' : 'en-GB', {minimumFractionDigits: 1, maximumFractionDigits: 1})}°`}><SkyMarkerPoint object={object}/><span className="sky-object-label" aria-hidden="true" data-visible={placement.visible} style={{left: `calc(50% + ${placement.dx}px)`, top: `calc(50% + ${placement.dy}px)`}}>{label(object)}</span></button>;})}
    {sunPoint && <span className="sky-object sky-sun" style={{left: sunPoint.x, top: sunPoint.y}} role="img" aria-label={`${sunLabel}, ${language === 'sv' ? 'höjd' : 'altitude'} ${sun.altitude.toLocaleString(language === 'sv' ? 'sv-SE' : 'en-GB', {minimumFractionDigits: 1, maximumFractionDigits: 1})}°`}><span className="sky-point"/><span className="sky-object-label" aria-hidden="true" data-visible={labelPlacements.get('sun')?.visible ?? false} style={{left: `calc(50% + ${labelPlacements.get('sun')?.dx ?? 0}px)`, top: `calc(50% + ${labelPlacements.get('sun')?.dy ?? 32}px)`}}>{sunLabel}</span></span>}
  </div>;
}
