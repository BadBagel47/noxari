import {horizonGrid} from './skyGrid';
import {SkyMarkerPoint} from './KindIcon';
import {ConstellationArtImages, constellationArtSky, drawConstellationArt} from './constellationArt';
import {constellationArt} from './generated/constellationArt';
import {eclipticSky} from './ecliptic';
import {drawObjectPath, movesAmongStars, nightKey, nightPath, starPathSamples, starPathSky} from './objectPath';
import {LayerFades} from './layerFade';
import {namedStarObjects, namedStarShown} from './namedStars';
import {issObject} from './issObject';
import {satelliteCount, satelliteObject, satelliteSky, type SatelliteSky} from './satellites';

import {MotionResolution} from './motionResolution';
import {useSkyFrameState} from './useSkyFrames';
import type {SkyFrames} from './skyFrames';
import {useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type Dispatch, type PointerEvent, type SetStateAction} from 'react';
import {ConstellationDrawingCache, constellationSky, drawConstellations, type FigureMode} from './constellations';
import {ConstellationReveal} from './constellationReveal';
import {useReducedMotion} from './useReducedMotion';
import {boundarySky, drawBoundaries} from './constellationBoundaries';
import {Body, Illumination} from 'astronomy-engine';
import {nextObjectRise, objectPosition, objectPositioner, positionAt, showObjectMarker, solarAppearance, type ObservingLocation} from './astronomy';
import {objects, type SpaceObject} from './data';
import {candidateObjects} from './candidateObjects';
import {objectWeight, pickBest, pickRadius, starObject, starWeight, tappableGaiaMagnitude, tappableMagnitude, type PickCandidate} from './starPick';
import {faintStarBrightness, faintStarFade, shownAtSkyLevel, starMagnitudeLimit, type SkyGroups, type SkyLevel} from './skyLevel';
import {faintCount, faintSky, loadFaintStars, type FaintStars} from './binocularStars';
import {gaiaStarObject, gaiaTilesNear, loadGaiaIndex, loadGaiaTile, mergeFaintStars, viewCentre, type GaiaIndex, type GaiaTile} from './gaiaStars';
import {createDirectionProjector, createPerspectiveProjector, createPreparedPerspectiveProjector, horizontalStarCatalog, perspectiveFocal, prepareHorizontalDirection, prepareHorizontalDirections, prepareHorizontalStars, projectPerspective, type MapPoint, type PreparedHorizontalDirection, type ViewDirection} from './skyProjection';
import {GuidedFinder} from './GuidedFinder';
import {clampViewPitch, groundOpacity} from './groundView';
import {MilkyWayPainter, milkyWayBasis, type MilkyWayTexture} from './milkyWay';
import {HorizonGpu, skyRendererPreference} from './horizonGpu';
import type {PerformanceScene} from './skyPerformance';
import {darkSkyVisibility, projectedStarVisibility, starRadius, stellarBrightness} from './skyVisibility';
import {glowSprite} from './starGlow';
import {landscapeHeight} from './landscape';
import {starFill} from './starColor';
import {milkyWayZoomFade} from './milkyWay';
import {FAINT_TINTS, faintTintGroups} from './gaiaStars';
import type {usePhoneOrientation} from './usePhoneOrientation';
import {skyOverlayExclusions} from './objectLabels';
import {useObjectLabels} from './useObjectLabels';

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
  showArt: boolean;
  showGrid: boolean;
  showEcliptic: boolean;
  showMilkyWay: boolean;
  /** F-057: decorative horizon silhouette. */
  showLandscape?: boolean;
  /** Changes when externally loaded data (ISS elements) arrives. */
  dynamicKey?: number;
  onSelectConstellation?: (id: string) => void;
  skyLevel: SkyLevel;
  skyGroups: SkyGroups;
  milkyWay: MilkyWayTexture | null;
  view: ViewDirection;
  onViewChange: Dispatch<SetStateAction<ViewDirection>>;
  onDragViewChange: Dispatch<SetStateAction<ViewDirection>>;
  finderTarget: SpaceObject | null;
  phone: ReturnType<typeof usePhoneOrientation>;
  onStopFinder: () => void;
  onFinderDetails: () => void;
  /** F-044/F-045: lets guided tours animate the zoom inside the shared frame loop. */
  zoomControl?: {current: Dispatch<SetStateAction<number>> | null};
  /** F-050: a tapped catalogue star (not in the fixed object lists) shown as the selected marker. */
  extraObjects?: SpaceObject[];
  /** F-053: object whose track across the sky is drawn (selected object, when the layer is on). */
  pathObject?: SpaceObject | null;
  pathMotion?: boolean;
  /** F-055: moving satellite dots (version changes when new elements arrive). */
  showSatellites?: boolean;
  satellitesKey?: number;
};

const noObjects: SpaceObject[] = [];
const wrap = (degrees: number) => (degrees % 360 + 360) % 360;
const cardinal = (heading: number, language: 'en' | 'sv') => (language === 'sv' ? ['N', 'NO', 'Ö', 'SO', 'S', 'SV', 'V', 'NV'] : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'])[Math.round(wrap(heading) / 45) % 8];

export function HorizonView({frames, selectedId, time, timeMode, location, label, sunLabel, onSelect, language, view, onViewChange, onDragViewChange, showFigures, showFigureNames, figureMode, showBoundaries, showArt, showGrid, showEcliptic, showMilkyWay, showLandscape = true, dynamicKey, onSelectConstellation, skyLevel, skyGroups, milkyWay, finderTarget, phone, onStopFinder, onFinderDetails, zoomControl, extraObjects = noObjects, pathObject = null, pathMotion = false, showSatellites = false, satellitesKey = 0}: Props) {
  const comparisonStatus = useSyncExternalStore(frames.comparison.subscribe, frames.comparison.getSnapshot);
  const [comparisonTrackers] = useState(() => ({current: {pass: -1, reveal: new ConstellationReveal(), cache: new ConstellationDrawingCache(), resolution: new MotionResolution()}}));
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reveal = useRef(new ConstellationReveal());
  const figureCache = useRef(new ConstellationDrawingCache());
  const artImages = useRef(new ConstellationArtImages(import.meta.env.BASE_URL));
  const fades = useRef(new LayerFades<'grid' | 'boundaries' | 'figures' | 'art' | 'ecliptic' | 'milkyWay'>());
  // Keep data for a layer once it has been shown, so it can fade out instead of vanishing.
  const shown = useRef({boundaries: false, art: false, ecliptic: false});
  if (showBoundaries) shown.current.boundaries = true;
  if (showArt) shown.current.art = true;
  if (showEcliptic) shown.current.ecliptic = true;
  useEffect(() => { if (showArt) artImages.current.preload(constellationArt.map(art => art.id), () => frames.invalidate()); }, [showArt, frames]);
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
  useLayoutEffect(() => {
    if (!zoomControl) return;
    zoomControl.current = setZoom;
    return () => { if (zoomControl.current === setZoom) zoomControl.current = null; };
  }, [zoomControl, setZoom]);
  const [size, setSize] = useState({width: 0, height: 0});
  const stars = useMemo(() => prepareHorizontalStars(horizontalStarCatalog(time, location)), [time, location]);
  // F-043: fainter binocular stars load on demand and rotate with one matrix per time change.
  const [faintData, setFaintData] = useState<FaintStars | null>(null);
  useEffect(() => {
    if (skyLevel === 'eye' || faintData) return;
    let live = true;
    loadFaintStars(import.meta.env.BASE_URL).then(data => { if (live) setFaintData(data); }).catch(() => {});
    return () => { live = false; };
  }, [skyLevel, faintData]);
  const magnitudeLimit = starMagnitudeLimit(skyLevel, zoom);
  // F-061: Gaia tiles around the view, only on the whole-catalogue level once zoomed past the binocular limit.
  const gaiaWanted = skyLevel === 'all' && magnitudeLimit > 8.5;
  const [gaiaIndex, setGaiaIndex] = useState<GaiaIndex | null>(null);
  const [gaiaTiles, setGaiaTiles] = useState<GaiaTile[]>([]);
  useEffect(() => {
    if (!gaiaWanted || gaiaIndex) return;
    let live = true;
    loadGaiaIndex(import.meta.env.BASE_URL).then(index => { if (live) setGaiaIndex(index); }).catch(() => {});
    return () => { live = false; };
  }, [gaiaWanted, gaiaIndex]);
  const aspect = size.width && size.height ? Math.min(size.width, size.height) / Math.max(size.width, size.height) : 1;
  const gaiaKey = gaiaWanted && gaiaIndex ? `${Math.round(view.heading / 3)}|${Math.round(view.pitch / 3)}|${Math.round(zoom * 4)}|${Math.round(time.getTime() / 600_000)}|${location.latitude}|${location.longitude}|${aspect.toFixed(1)}` : '';
  const gaiaTileList = useMemo(() => {
    if (!gaiaKey || !gaiaIndex) return [];
    const centre = viewCentre(view, time, location), half = 45 / zoom;
    return gaiaTilesNear(gaiaIndex, centre.ra, centre.dec, Math.hypot(half, half * aspect) + 4).slice(0, 24);
  }, [gaiaKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!gaiaIndex || !gaiaTileList.length) { if (!gaiaWanted) setGaiaTiles(current => current.length ? [] : current); return; }
    let live = true;
    // Wait for the pan to settle before fetching new tiles.
    const timer = window.setTimeout(() => {
      Promise.allSettled(gaiaTileList.map(tile => loadGaiaTile(import.meta.env.BASE_URL, gaiaIndex, tile))).then(results => {
        if (!live) return;
        const loaded = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
        setGaiaTiles(current => current.length === loaded.length && current.every((tile, i) => tile === loaded[i]) ? current : loaded);
      });
    }, 220);
    return () => { live = false; window.clearTimeout(timer); };
  }, [gaiaIndex, gaiaTileList, gaiaWanted]);
  const faintStars = useMemo(() => skyLevel === 'eye' ? null : mergeFaintStars(faintData, gaiaWanted ? gaiaTiles : []), [skyLevel, faintData, gaiaTiles, gaiaWanted]);
  const faint = useMemo(() => faintStars ? faintSky(faintStars, time, location) : null, [faintStars, time, location]);
  const faintGroups = useMemo(() => faintStars?.ci ? faintTintGroups(faintStars.ci) : null, [faintStars]);
  const milkyBasis = useMemo(() => milkyWayBasis(time, location), [time, location]);
  const sceneKey = `${time.getTime()}|${location.latitude}|${location.longitude}`;
  const figures = useMemo(() => constellationSky(stars, figureMode), [stars, figureMode]);
  const boundaries = useMemo(() => shown.current.boundaries ? boundarySky(time, location) : [], [showBoundaries, time, location]);
  const artSky = useMemo(() => shown.current.art ? constellationArtSky(time, location, figureMode) : [], [showArt, time, location, figureMode]);
  const ecliptic = useMemo(() => shown.current.ecliptic ? eclipticSky(time, location) : [], [showEcliptic, time, location]);
  // F-053: tonight's track per half hour of shown time; motion among stars per 6 h (Moon: per hour).
  const pathNightKey = nightKey(time);
  const pathNight = useMemo(() => pathObject ? nightPath(pathObject, time, location) : null, [pathObject, pathNightKey, location]);
  const pathStarKey = Math.floor(time.getTime() / (pathObject?.id === 'moon' ? 3_600_000 : 21_600_000));
  const pathSamples = useMemo(() => pathMotion && movesAmongStars(pathObject) ? starPathSamples(pathObject!, time, location, language) : null, [pathObject, pathMotion, pathStarKey, location, language]);
  const pathStars = useMemo(() => starPathSky(pathSamples, time, location), [pathSamples, time, location]);
  const objectTrack = useMemo(() => pathNight ? {...pathNight, ...pathStars} : null, [pathNight, pathStars]);
  const preparedBoundaries = useMemo(() => boundaries.map(arc => prepareHorizontalDirections(arc)), [boundaries]);
  const sun = useMemo(() => positionAt(Body.Sun, time, location), [time, location]);
  // F-055: satellites move about 1°/s, so in live mode they use the wall clock, cached per 200 ms
  // (shared by drawing and tap picking). A plain timer asks the shared scheduler for frames; no extra RAF.
  const satelliteCache = useRef<{key: string; list: SatelliteSky[]}>({key: '', list: []});
  const satellitesShown = showSatellites && satellitesKey > 0 && satelliteCount() > 0 && sun.altitude < -6 && !comparisonStatus.active;
  const satellitesNow = () => {
    const at = timeMode === 'live' ? Date.now() : time.getTime();
    const key = `${Math.floor(at / 200)}|${location.latitude}|${location.longitude}|${satellitesKey}`;
    if (satelliteCache.current.key !== key) satelliteCache.current = {key, list: satelliteSky(new Date(at), location)};
    return satelliteCache.current.list;
  };
  useEffect(() => {
    if (!satellitesShown || timeMode !== 'live') return;
    const timer = window.setInterval(() => frames.invalidate(), reducedMotion ? 1000 : 250);
    return () => window.clearInterval(timer);
  }, [satellitesShown, timeMode, frames, reducedMotion]);
  const targetPosition = useMemo(() => finderTarget ? objectPosition(finderTarget, time, location) : null, [finderTarget, time, location]);
  const nextRise = useMemo(() => finderTarget && targetPosition && targetPosition.altitude < 0 ? nextObjectRise(finderTarget, time, location) : null, [finderTarget, targetPosition, time, location]);
  const objectSky = useMemo(() => {
    const resolve = objectPositioner(time, location);
    return [...objects, issObject, ...namedStarObjects, ...candidateObjects, ...extraObjects].flatMap(object => {
      const position = resolve(object);
      const appearance = object.kind === 'Planet' ? solarAppearance(object, time) : null;
      return position ? [{object, position, appearance}] : [];
    });
  }, [time, location, dynamicKey, extraObjects]);
  const markers = useMemo(() => objectSky.flatMap(({object, position, appearance}) => {
    if (object.id === finderTarget?.id) return [];
    // F-043: the chosen level/groups decide which objects are drawn; a selected object always stays visible.
    if (object.id !== selectedId && (!shownAtSkyLevel(object, skyLevel, skyGroups) || !namedStarShown(object, zoom))) return [];
    if (!showObjectMarker(object, sun.altitude, appearance)) return [];
    if (position.altitude < 0 && groundOpacity(view.pitch) > .9) return [];
    const point = position && projectPerspective(position, view, size.width, size.height, true, view.pitch < 0, zoom);
    return point ? [{object, position, point}] : [];
  }), [objectSky, sun.altitude, view, size, finderTarget, zoom, skyLevel, skyGroups, selectedId]);
  const hasDaylightPlanetMarker = sun.altitude >= 0 && markers.some(marker => marker.object.kind === 'Planet');
  const belowReveal = 1 - groundOpacity(view.pitch);
  const project = createPerspectiveProjector(view, size.width, size.height, true, belowReveal > 0, zoom);
  const projectFigure = useMemo(() => createPreparedPerspectiveProjector(view, size.width, size.height, false, belowReveal > 0, zoom), [view.heading, view.pitch, size.width, size.height, belowReveal > 0, zoom]);
  // Drawings are cut into mesh cells; nodes below the horizon must still project, otherwise whole cells drop out and leave straight cuts. The ground covers them afterwards.
  const projectArt = useMemo(() => createPreparedPerspectiveProjector(view, size.width, size.height, false, true, zoom), [view.heading, view.pitch, size.width, size.height, zoom]);
  const sunPoint = project(sun);
  // F-039: lit fraction and on-screen bright-limb angle for the Moon marker.
  const moonFraction = useMemo(() => Illumination(Body.Moon, time).phase_fraction, [time]);
  const sunScreen = projectPerspective(sun, view, size.width, size.height, false, true, zoom);
  const moonPhase = (point: MapPoint) => ({fraction: moonFraction, angle: sunScreen ? Math.atan2(sunScreen.y - point.y, sunScreen.x - point.x) * 180 / Math.PI : 0});
  const labelExclusions = useMemo(() => skyOverlayExclusions(root.current), [size.width, size.height, selectedId, finderTarget, phone.status, language]);
  const labelPlacements = useObjectLabels([
    ...markers.map(({object, point}) => ({id: object.id, text: label(object), x: point.x, y: point.y, priority: object.id === selectedId ? 1000 : object.kind === 'Moon' ? 800 : object.kind === 'Planet' ? 700 : 300})),
    ...(sunPoint ? [{id: 'sun', text: sunLabel, x: sunPoint.x, y: sunPoint.y, priority: 900}] : []),
  ], size.width, size.height, labelExclusions, language);

  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const {width, height} = entry.contentRect;
      setSize({width, height});
    });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  // Mouse wheel / trackpad zoom (F-043: desktop users can reach fainter stars). Same 1×–3× range as pinch.
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (frames.comparison.active) return;
      event.preventDefault();
      const scale = Math.exp(-Math.max(-200, Math.min(200, event.deltaY * (event.deltaMode === 1 ? 33 : 1))) * .0015);
      setZoom(current => Math.max(1, Math.min(3, current * scale)));
    };
    element.addEventListener('wheel', wheel, {passive: false});
    return () => element.removeEventListener('wheel', wheel);
  }, [frames, setZoom]);

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
      renderer?.setScene(stars, milkyWay, faint);
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
      // F-039: darker zenith and a soft glow toward the horizon, anchored to the real horizon line.
      const skyTop = Math.min(0, horizonY - height * 1.4), skyBottom = Math.max(horizonY, 1);
      const sky = context.createLinearGradient(0, skyTop, 0, skyBottom);
      // F-061 step 1: a deep navy night sky like a dark site (F-057 was near-black), lighter toward the horizon; twilight/day keep their blue.
      sky.addColorStop(0, daylight ? `rgb(${Math.round(10 + 48 * daylight)},${Math.round(19 + 87 * daylight)},${Math.round(34 + 146 * daylight)})` : '#0a1322');
      sky.addColorStop(.62, daylight ? `rgb(${Math.round(13 + 61 * daylight)},${Math.round(24 + 100 * daylight)},${Math.round(41 + 151 * daylight)})` : '#0d1829');
      sky.addColorStop(1, daylight ? `rgb(${Math.round(22 + 76 * daylight)},${Math.round(35 + 109 * daylight)},${Math.round(58 + 150 * daylight)})` : '#16233a');
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);
      const twilight = sun.altitude > -18 && sun.altitude < 4 ? Math.min(1, (sun.altitude + 18) / 16) : 0;
      if (twilight > 0) {
        const glowPoint = projectPerspective({altitude: 0, azimuth: sun.azimuth}, view, width, height, false, true, zoom);
        if (glowPoint) {
          const radius = Math.max(width, height) * (.55 + .5 * twilight);
          const glow = context.createRadialGradient(glowPoint.x, horizonY, 0, glowPoint.x, horizonY, radius);
          glow.addColorStop(0, `rgba(255,${Math.round(150 + 40 * twilight)},${Math.round(90 + 60 * twilight)},${(.42 * twilight * twilight).toFixed(3)})`);
          glow.addColorStop(.45, `rgba(190,110,140,${(.16 * twilight * twilight).toFixed(3)})`);
          glow.addColorStop(1, 'rgba(60,70,140,0)');
          context.fillStyle = glow;
          context.fillRect(0, 0, width, height);
        }
      }

      // F-049: a faint haze band (air glow / extinction) just above the horizon.
      if (daylight < 1 && horizonY > 0) {
        const haze = context.createLinearGradient(0, horizonY - height * .22, 0, horizonY);
        haze.addColorStop(0, 'rgba(70,74,86,0)');
        haze.addColorStop(1, `rgba(84,86,96,${(.13 * (1 - daylight)).toFixed(3)})`);
        context.fillStyle = haze;
        context.fillRect(0, Math.max(0, horizonY - height * .22), width, Math.min(horizonY, height));
      }

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
      const fade = fades.current.step({grid: showGrid, boundaries: showBoundaries, figures: showFigures, art: showArt, ecliptic: showEcliptic, milkyWay: showMilkyWay}, now, reducedMotion || comparing);
      if (milkyWay && fade.values.milkyWay > 0) {
        // F-039: the Milky Way steps back a little where drawings are shown, so they read on top.
        // F-060: as in planetarium programs the glow steps back when zooming in, so resolved stars read on top of it.
        const visibility = Math.max(0, Math.min(1, (-sun.altitude - 8) / 10)) * fade.values.milkyWay * (1 - .25 * fade.values.art) * milkyWayZoomFade(zoom);
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
      if (fade.values.grid > 0) {
        context.strokeStyle = `rgba(171,209,233,${.17 * fade.values.grid})`;
        context.lineWidth = 1;
        for (const curve of horizonGrid(belowReveal > 0)) drawCurve(curve);
      }
      if (fade.values.ecliptic > 0 && ecliptic.length) {
        context.save();
        context.strokeStyle = `rgba(242,201,138,${.55 * fade.values.ecliptic})`;
        context.setLineDash([6, 5]);
        context.lineWidth = 1.2;
        drawCurve(ecliptic);
        context.restore();
      }

      measurement?.phase('grid');
      if (fade.values.boundaries > 0) drawBoundaries(context, preparedBoundaries, projectBoundary, width, height, starVisibility * fade.values.boundaries);
      const artFading = fade.values.art > 0 && drawConstellationArt(context, artSky, projectArt, width, height, starVisibility * fade.values.art * .46 * Math.max(.3, Math.min(1, 1.45 - .45 * zoom)), artImages.current, () => frames.invalidate(), view);

      measurement?.phase('boundaries');
      const animating = fade.values.figures > 0 && drawConstellations(context, figures, projectFigure, width, height, starVisibility * fade.values.figures, showFigureNames, {reveal: comparing ? trackers.reveal : reveal.current, now, reducedMotion}, comparing ? trackers.cache : figureCache.current);
      if (fade.values.figures <= 0) reveal.current.reset();
      measurement?.phase('figures');

      if (starVisibility > 0 || belowReveal > 0) {
        if (!renderer?.drawStars(context, width, height, dpr, view, starVisibility, belowReveal, zoom, magnitudeLimit)) {
          for (const star of stars) {
            const visibility = projectedStarVisibility(sun.altitude, star.altitude, belowReveal);
            if (visibility <= 0) continue;
            const point = projectStar(star);
            if (!point) continue;
            const brightness = stellarBrightness(star.magnitude);
            // F-049: stars dim a little close to the horizon (atmospheric extinction look).
            context.globalAlpha = visibility * (.28 + brightness * .72) * (star.altitude < 0 ? 1 : .55 + .45 * Math.min(1, star.altitude / 15));
            context.fillStyle = starFill(star.ci);
            const radius = starRadius(star.magnitude);
            context.beginPath();
            context.arc(point.x, point.y, radius, 0, Math.PI * 2);
            context.fill();
          }
          if (faint && magnitudeLimit > 6.5) {
            const tint = faint.ci;
            const project = createDirectionProjector(view, width, height, zoom);
            const count = faintCount(faint.magnitude, magnitudeLimit), direction = faint.direction;
            // F-061: one pass per colour group, so the fill colour changes a handful of times per frame, not per star.
            for (let group = 0; group < FAINT_TINTS.length; group++) {
              if (tint && !faintGroups) break;
              context.fillStyle = tint ? starFill(FAINT_TINTS[group]) : '#e3f1ff';
              for (let i = 0; i < count; i++) {
                if (faintGroups && faintGroups[i] !== group) continue;
                const z = direction[i * 3 + 2];
                const visibility = z < 0 ? Math.max(starVisibility, belowReveal) : starVisibility;
                if (visibility <= 0 || (z < 0 && belowReveal <= 0)) continue;
                const point = project(direction[i * 3], direction[i * 3 + 1], z);
                if (!point) continue;
                const magnitude = faint.magnitude[i];
                context.globalAlpha = visibility * faintStarBrightness(magnitude) * faintStarFade(magnitude, magnitudeLimit);
                // A 1.6 px square matches the 0.8 px-radius point on screen and is much cheaper than an arc (F-061: many stars).
                context.fillRect(point.x - .8, point.y - .8, 1.6, 1.6);
              }
              if (!faintGroups) break;
            }
          }
          context.globalAlpha = 1;
        }
      }
      // F-039/F-049/F-061: soft glow around the brighter stars (V ≤ 3.8), tinted by colour index, from cached sprites.
      if (starVisibility > 0 || belowReveal > 0) {
        context.save();
        context.globalCompositeOperation = 'lighter';
        for (const star of stars) {
          if (star.magnitude > 3.8) continue;
          const visibility = projectedStarVisibility(sun.altitude, star.altitude, belowReveal);
          if (visibility <= 0) continue;
          const point = projectStar(star);
          if (!point) continue;
          // F-061 step 1: a halo that grows with brightness and with zoom (as in Stellarium), still only a soft light.
          const strength = Math.min(1, (4.7 - star.magnitude) / 6);
          const radius = (5 + 46 * strength * strength) * Math.sqrt(zoom);
          context.globalAlpha = Math.min(1, .22 + .78 * strength) * visibility;
          context.drawImage(glowSprite(star.ci), point.x - radius, point.y - radius, radius * 2, radius * 2);
        }
        context.restore();
      }
      if (satellitesShown) {
        context.save();
        context.font = '600 11px system-ui, sans-serif';
        context.textAlign = 'left';
        for (const satellite of satellitesNow()) {
          const selectedSatellite = selectedId === `sat-${satellite.norad}`;
          if (!satellite.sunlit && !selectedSatellite) continue;
          const point = projectStar({...satellite, ...prepareHorizontalDirection(satellite)});
          if (!point) continue;
          context.globalAlpha = (satellite.sunlit ? .92 : .35) * Math.max(.4, starVisibility);
          context.fillStyle = '#f2f6fb';
          context.beginPath();
          context.arc(point.x, point.y, 1.8, 0, Math.PI * 2);
          context.fill();
          if (selectedSatellite) {
            context.strokeStyle = '#9fd3ff';
            context.lineWidth = 1.5;
            context.beginPath();
            context.arc(point.x, point.y, 9, 0, Math.PI * 2);
            context.stroke();
            context.fillStyle = '#d9ecff';
            context.fillText(satellite.name, point.x + 13, point.y + 4);
          }
        }
        context.restore();
      }
      if (objectTrack) drawObjectPath(context, objectTrack, projectStar, width, Math.max(.75, starVisibility, belowReveal));
      measurement?.phase('stars');
      // F-057: decorative silhouette (hills and trees) standing on the horizon; fades away when looking down.
      if (showLandscape && horizonY > -height && horizonY < height * 1.6) {
        const sweep = 90 / zoom * Math.max(1, width / height) * .75 + 10, step = Math.max(.08, sweep / 360);
        context.save();
        context.globalAlpha = groundOpacity(view.pitch);
        context.fillStyle = daylight > .4 ? '#1c3340' : '#020407';
        context.beginPath();
        let started = false;
        // B-018: sample on a fixed azimuth grid so tree tops keep their shape while the view moves.
        for (let azimuth = Math.floor((view.heading - sweep) / step) * step; azimuth <= view.heading + sweep + step; azimuth += step) {
          const point = projectPerspective({altitude: landscapeHeight((azimuth + 360) % 360), azimuth: (azimuth + 360) % 360}, view, width, height, false, true, zoom);
          if (!point) continue;
          if (started) context.lineTo(point.x, point.y); else { context.moveTo(point.x, Math.max(horizonY, height) + 2); context.lineTo(point.x, point.y); started = true; }
        }
        if (started) { context.lineTo(width + 4, Math.max(horizonY, height) + 2); context.closePath(); context.fill(); }
        context.restore();
      }
      context.font = 'bold 12px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillStyle = '#d5e9f4';
      for (let azimuth = 0; azimuth < 360; azimuth += 45) {
        const point = projectPerspective({altitude: 4, azimuth}, view, width, height, true, false, zoom);
        if (point && point.y > 35 && point.y < height - 32) context.fillText(cardinal(azimuth, language), point.x, point.y);
      }
      measurement?.phase('labels');
      // A level camera makes the geometric horizon horizontal at any heading.
      if (horizonY < height) {
        context.save();
        context.globalAlpha = groundOpacity(view.pitch);
        const ground = context.createLinearGradient(0, Math.max(0, horizonY), 0, height);
        ground.addColorStop(0, daylight > 0.4 ? '#233f4c' : '#04070b');
        ground.addColorStop(1, '#03070c');
        context.fillStyle = ground;
        context.fillRect(0, Math.max(0, horizonY), width, height);
        context.restore();
        if (horizonY >= 0) {
          context.strokeStyle = showLandscape ? 'rgba(174,216,238,.12)' : 'rgba(174,216,238,.6)';
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
      performanceScene.layerMask = Number(showFigures) | Number(showFigureNames) << 1 | Number(showBoundaries) << 2 | Number(Boolean(milkyWay)) << 3 | Number(skyLevel === 'all' && skyGroups.candidates) << 4;
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
      return Boolean(animating) || fade.animating || Boolean(artFading);
    };
    frames.setRenderer(render);
  }, [projectFigure, projectArt, frames, size, view, zoom, stars, figures, boundaries, preparedBoundaries, showFigures, showFigureNames, figureMode, showBoundaries, showArt, showGrid, showEcliptic, showMilkyWay, artSky, ecliptic, reducedMotion, sun.altitude, milkyWay, milkyBasis, sceneKey, time, timeMode, location, performanceScene, phone.active, showLandscape, skyLevel, skyGroups, faint, magnitudeLimit, comparisonStatus.active, selectedId, finderTarget, language, objectTrack, satellitesShown]);

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
    } else if (!pinch.current && gesture?.id === event.pointerId && !gesture.moved && !gesture.marker && root.current) {
      const box = root.current.getBoundingClientRect();
      const x = event.clientX - box.left, y = event.clientY - box.top;
      // F-050: a tap on open sky picks the best marker or catalogue star nearby; known objects win over closer faint stars.
      type Candidate = PickCandidate & {object?: SpaceObject; index?: number; gaia?: number};
      const candidates: Candidate[] = markers.map(({object, point}) => ({x: point.x, y: point.y, weight: objectWeight(object), key: object.id, object}));
      if (darkSkyVisibility(sun.altitude) > 0 || belowReveal > 0) {
        const projectTap = createPreparedPerspectiveProjector(view, size.width, size.height, true, belowReveal > 0, zoom), tapLimit = tappableMagnitude(zoom);
        for (const star of stars) {
          if (star.index === undefined || star.magnitude > tapLimit || (star.altitude < 0 && belowReveal <= 0)) continue;
          const point = projectTap(star);
          if (point) candidates.push({x: point.x, y: point.y, weight: starWeight(star.magnitude), key: `star-${star.index}`, index: star.index});
        }
      }
      // F-061: zoomed in on the whole-catalogue level, faint Gaia stars can be tapped too (lowest priority).
      const gaiaTapLimit = gaiaIndex && faint && faintStars ? tappableGaiaMagnitude(zoom, magnitudeLimit) : 0;
      if (gaiaTapLimit > 0 && faint && faintStars && (darkSkyVisibility(sun.altitude) > 0 || belowReveal > 0)) {
        const project = createDirectionProjector(view, size.width, size.height, zoom), direction = faint.direction;
        const count = faintCount(faint.magnitude, gaiaTapLimit);
        for (let i = 0; i < count; i++) {
          const tag = faintStars.tag[i];
          if (tag < 0 || (direction[i * 3 + 2] < 0 && belowReveal <= 0)) continue;
          const point = project(direction[i * 3], direction[i * 3 + 1], direction[i * 3 + 2]);
          if (point && Math.abs(point.x - x) < 40 && Math.abs(point.y - y) < 40) candidates.push({x: point.x, y: point.y, weight: .8, key: `gaia-${tag}`, gaia: tag});
        }
      }
      if (satellitesShown) {
        const projectTap = createPerspectiveProjector(view, size.width, size.height, true, belowReveal > 0, zoom);
        for (const satellite of satellitesNow()) {
          if (!satellite.sunlit) continue;
          const point = projectTap(satellite);
          if (point) candidates.push({x: point.x, y: point.y, weight: 3, key: `sat-${satellite.norad}`, object: satelliteObject(satellite.norad, satellite.name)});
        }
      }
      const best = pickBest(candidates, x, y, pickRadius(event.pointerType, zoom));
      if (best?.object) onSelect(best.object);
      else if (best?.index !== undefined) void starObject(best.index).then(onSelect);
      else if (best?.gaia !== undefined && gaiaIndex) void gaiaStarObject(import.meta.env.BASE_URL, gaiaIndex, best.gaia).then(onSelect).catch(() => {});
      else if (showFigures && showFigureNames && onSelectConstellation) {
        // F-036: a tap near a constellation name opens that constellation's info.
        let nearest: {id: string; distance: number} | null = null;
        for (const figure of figures) {
          const point = projectFigure({...figure.center, ...prepareHorizontalDirection(figure.center)});
          if (!point) continue;
          const distance = Math.hypot(point.x - x, point.y - y);
          if (distance < 40 && (!nearest || distance < nearest.distance)) nearest = {id: figure.id, distance};
        }
        if (nearest) onSelectConstellation(nearest.id);
      }
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
      if ((event.key === '+' || event.key === '=' || event.key === '-') && event.target === event.currentTarget) { event.preventDefault(); setZoom(current => Math.max(1, Math.min(3, current * (event.key === '-' ? 1 / 1.25 : 1.25)))); return; }
      const changes: Record<string, [number, number]> = {ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 8], ArrowDown: [0, -8]};
      const change = changes[event.key];
      if (change && event.target === event.currentTarget) { event.preventDefault(); move(...change); }
    }}>
    <canvas ref={canvas} aria-hidden="true"/>
    {hasDaylightPlanetMarker && <p className="daylight-marker-note">{language === 'sv' ? 'Beräknad dagsposition · synlighet varierar' : 'Calculated daytime position · visibility varies'}</p>}
    <div className="horizon-heading" aria-live="off">{language === 'sv' ? 'Mot' : 'Facing'} {cardinal(view.heading, language)} · {Math.round(view.heading)}° <span>{view.pitch < 0 ? '↓' : '↑'} {Math.round(Math.abs(view.pitch))}°</span>{view.pitch < 0 && <span className="below-horizon-label">{language === 'sv' ? 'Under horisonten · simulerad vy' : 'Below horizon · simulated view'}</span>}</div>
    {markers.map(({object, position, point}) => {const placement = labelPlacements.get(object.id)!;return <button key={object.id} className={`sky-object ${selectedId === object.id ? 'is-selected' : ''}`} aria-pressed={selectedId === object.id} style={{left: point.x, top: point.y, opacity: position.altitude < 0 ? belowReveal * .8 : 1}} onClick={() => onSelect(object)} title={`${label(object)} · ${position.altitude.toLocaleString(language === 'sv' ? 'sv-SE' : 'en-GB', {minimumFractionDigits: 1, maximumFractionDigits: 1})}°`} aria-label={`${label(object)}, ${language === 'sv' ? 'höjd' : 'altitude'} ${position.altitude.toLocaleString(language === 'sv' ? 'sv-SE' : 'en-GB', {minimumFractionDigits: 1, maximumFractionDigits: 1})}°`}><SkyMarkerPoint object={object} moonPhase={object.id === 'moon' ? moonPhase(point) : undefined}/><span className="sky-object-label" aria-hidden="true" data-visible={placement.visible} style={{left: `calc(50% + ${placement.dx}px)`, top: `calc(50% + ${placement.dy}px)`}}>{label(object)}</span></button>;})}
    {sunPoint && <span className="sky-object sky-sun" style={{left: sunPoint.x, top: sunPoint.y, opacity: sun.altitude < 0 ? belowReveal * .8 : 1}} role="img" aria-label={`${sunLabel}, ${language === 'sv' ? 'höjd' : 'altitude'} ${sun.altitude.toLocaleString(language === 'sv' ? 'sv-SE' : 'en-GB', {minimumFractionDigits: 1, maximumFractionDigits: 1})}°`}><span className="sky-point"/><span className="sky-object-label" aria-hidden="true" data-visible={labelPlacements.get('sun')?.visible ?? false} style={{left: `calc(50% + ${labelPlacements.get('sun')?.dx ?? 0}px)`, top: `calc(50% + ${labelPlacements.get('sun')?.dy ?? 32}px)`}}>{sunLabel}</span></span>}
    {finderTarget && targetPosition && <GuidedFinder object={finderTarget} position={targetPosition} nextRise={nextRise} location={location} view={view} width={size.width} height={size.height} language={language} phone={phone} sunAltitude={sun.altitude} zoom={zoom} onClose={onStopFinder} onDetails={onFinderDetails}/>}
    <div className="horizon-help">{language === 'sv' ? 'Dra för att se dig omkring · nyp eller skrolla för att zooma' : 'Drag to look around · pinch or scroll to zoom'}</div>
    <div className="horizon-controls" aria-label={language === 'sv' ? 'Styr vyn' : 'View controls'}>
      <button onClick={() => move(-30, 0)} aria-label={language === 'sv' ? 'Vrid åt vänster' : 'Turn left'}>←</button>
      <button onClick={() => move(0, 15)} aria-label={language === 'sv' ? 'Titta upp' : 'Look up'}>↑</button>
      <button onClick={() => move(0, -15)} aria-label={language === 'sv' ? 'Titta ner' : 'Look down'}>↓</button>
      <button onClick={() => move(30, 0)} aria-label={language === 'sv' ? 'Vrid åt höger' : 'Turn right'}>→</button>
    </div>
  </div>;
}
