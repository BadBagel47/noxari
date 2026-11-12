import {initialObservation} from './observationStart';
import {useSkyFrames, useSkyFrameState} from './useSkyFrames';
import {useMilkyWay} from './useMilkyWay';
import {clampViewPitch} from './groundView';
import {commonConstellationIds, type FigureMode} from './constellations';
import React, {useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {Search, Star, Compass, Bookmark, MapPin, Clock3, ChevronRight, Share2, X, LocateFixed, Globe2, Info, Check, MoreHorizontal, Maximize, Layers, Type, SquareDashed, Sparkles, Moon, Crosshair, Gauge, Smartphone, SlidersHorizontal, Brush, Grid2X2, Orbit, Rewind, FastForward, Download, NotebookPen, CheckCircle2, Trash2, Play} from 'lucide-react';
import {objects, zodiac, type SpaceObject, type Gear} from './data';
import {candidateObjects} from './candidateObjects';
import {defaultSkyGroups, type SkyGroup, type SkyGroups, type SkyLevel} from './skyLevel';
import {clockTime, darkestNightSample, nextObjectRise, objectPositioner, showObjectMarker, localDateTimeValue, nightContext, nightWindow, nightCatalog, objectPosition, positionAt, solarAppearance, selectedLocalTime, stockholm, type ObservingLocation} from './astronomy';
import {Body} from 'astronomy-engine';
import {DateTime} from 'luxon';
import {VisibilityChart, peakSample} from './VisibilityChart';
import {SkyMap} from './SkyMap';
import {HorizonView} from './HorizonView';
import type {ViewDirection} from './skyProjection';
import {usePhoneOrientation} from './usePhoneOrientation';
import {PhoneControls} from './PhoneControls';
import {rankTonight, recommend} from './recommendations';
import {SuggestionSummary, TonightPanel} from './TonightPanel';
import {SkyPanel} from './SkyPanel';
import {PerformancePanel, PerformanceCapture, SurfaceComparisonCapture} from './PerformancePanel';
import {catalogIdentifier, matchesCatalogQuery} from './catalogSearch';
import {objectImages} from './objectImages';
import {formatSharedList, parseSharedList} from './sharedList';
import {LANGUAGE_PREFERENCE_KEY, parseLanguagePreference, resolveLanguage, type LanguagePreference} from './languagePreference';
import {KindIcon, kindIconName} from './KindIcon';
import {DemoOverlay, TourBar, TourStart} from './TourOverlay';
import {cinematicPose, glideDuration, goalView, holdPose, tourStops, type TourMode, type TourSource} from './tour';
import {demoZoom, lookHint, objectFacts} from './objectFacts';
import {useReducedMotion} from './useReducedMotion';
import {namedStarObjects} from './namedStars';
import {ObjectRow} from './ObjectRow';
import {INTRO_KEY, IntroCard, shouldShowIntro} from './IntroCard';
import {moonInfo, moonPhaseLabel} from './moonInfo';
import {registerServiceWorker, useInstallPrompt} from './pwa';
import {constellationInfoObjects} from './constellationInfo';
import {useObservationLog} from './observationLog';
import {upcomingEvents} from './skyEvents';
import {issObject} from './issObject';
import {issElementAgeDays, issPasses, setIssElements} from './iss';
import {startIssElements} from './issRefresh';
import {IssPassList} from './IssPassList';
import './style.css';
import './workspace.css';

type Panel = 'tour'|'search'|'tonight'|'saved'|'shared'|'observation'|'view'|'about'|'more'|'details'|'phone'|'performance'|'log';
type Lang = 'en'|'sv';
const t = (lang: Lang, en: string, sv: string) => lang === 'sv' ? sv : en;
const display = (object: SpaceObject, lang: Lang) => lang === 'sv' ? object.sv : object.en;
const kindDisplay = (kind: SpaceObject['kind'], lang: Lang) => ({
  Galaxy: t(lang, 'Galaxy', 'Galax'),
  Nebula: t(lang, 'Nebula', 'Nebulosa'),
  'Star cluster': t(lang, 'Star cluster', 'Stjärnhop'),
  Planet: t(lang, 'Planet', 'Planet'),
  Moon: t(lang, 'Moon', 'Måne'),
  'Dwarf planet': t(lang, 'Dwarf planet', 'Dvärgplanet'),
  Asteroid: t(lang, 'Asteroid', 'Asteroid'),
  Star: t(lang, 'Star', 'Stjärna'),
  'Double star': t(lang, 'Double star', 'Dubbelstjärna'),
  Asterism: t(lang, 'Asterism', 'Asterism'),
  'Star cloud': t(lang, 'Star cloud', 'Stjärnmoln'),
  Constellation: t(lang, 'Constellation', 'Stjärnbild'),
  'Dwarf planet candidate': t(lang, 'Dwarf planet candidate', 'Dvärgplanetkandidat'),
  Satellite: t(lang, 'Satellite', 'Satellit'),
} as Partial<Record<SpaceObject['kind'], string>>)[kind] ?? kind;
const formatNumber = (value: number, lang: Lang, maximumFractionDigits = 1) => new Intl.NumberFormat(lang === 'sv' ? 'sv-SE' : 'en-GB', {maximumFractionDigits, minimumFractionDigits: maximumFractionDigits}).format(value);
const mainObjects = [...objects, issObject, ...namedStarObjects, ...constellationInfoObjects];
const allObjects = [...mainObjects, ...candidateObjects];
const equipmentLabel = (gear: Gear, lang: Lang) => ({eye: t(lang, 'Naked eye', 'Blotta ögat'), binoculars: t(lang, 'Binoculars', 'Kikare'), telescope: t(lang, 'Telescope', 'Teleskop')}[gear]);
const presets: ObservingLocation[] = [
  stockholm,
  {name: 'London', latitude: 51.5074, longitude: -0.1278, timeZone: 'Europe/London'},
  {name: 'New York', latitude: 40.7128, longitude: -74.0060, timeZone: 'America/New_York'},
  {name: 'Sydney', latitude: -33.8688, longitude: 151.2093, timeZone: 'Australia/Sydney'},
];
const initialLocation = (() => {
  try {
    const value = JSON.parse(localStorage.getItem('noxari-location') || 'null');
    if (value && typeof value.name === 'string' && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180 && typeof value.timeZone === 'string' && DateTime.now().setZone(value.timeZone).isValid) return value as ObservingLocation;
  } catch { /* Use the displayed Stockholm default. */ }
  return stockholm;
})();

function App() {
  const skyFrames = useSkyFrames();
  const [diagnosticMode, setDiagnosticMode] = useState<'ordinary' | 'comparison'>('ordinary');
  const [panel, setPanel] = useState<Panel | null>(null);
  const startPerformance = useCallback(() => { if (!skyFrames.comparison.active && skyFrames.performance.start()) {setDiagnosticMode('ordinary');setPanel(null);} }, [skyFrames]);
  const reviewPerformance = useCallback(() => setPanel('performance'), []);
  const workspace = useRef<HTMLDivElement>(null);
  const appRoot = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [langPreference, setLangPreference] = useState<LanguagePreference>(() => parseLanguagePreference(localStorage.getItem(LANGUAGE_PREFERENCE_KEY)));
  const [queryLanguage, setQueryLanguage] = useState(() => new URLSearchParams(window.location.search).get('lang'));
  const [deviceLanguages, setDeviceLanguages] = useState<readonly string[]>(() => navigator.languages ?? [navigator.language]);
  const lang: Lang = resolveLanguage(queryLanguage, langPreference, deviceLanguages);
  const chooseLanguage = (next: LanguagePreference) => { setQueryLanguage(null); setLangPreference(next); };
  const [redMode, setRedMode] = useState(() => localStorage.getItem('noxari-red-mode') === '1');
  const [advancedLocation, setAdvancedLocation] = useState(false);
  const reducedMotion = useReducedMotion();
  const installApp = useInstallPrompt();
  const observationLog = useObservationLog();
  const [issVersion, setIssVersion] = useState(0);
  useEffect(() => {
    // F-042: bundled/stored elements first, then a once-a-day refresh from CelesTrak (no location is sent).
    void startIssElements(import.meta.env.BASE_URL, elements => { setIssElements(elements); setIssVersion(version => version + 1); }).catch(() => { /* ISS stays unavailable */ });
  }, []);
  const [noteDraft, setNoteDraft] = useState('');
  // Phone following needs orientation sensors; devices without a touch screen (desktops/laptops) have none.
  const [canFollow, setCanFollow] = useState(() => window.matchMedia('(any-pointer: coarse)').matches);
  useEffect(() => {
    const query = window.matchMedia('(any-pointer: coarse)');
    const update = () => setCanFollow(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const [saved, setSaved] = useState<string[]>(() => {
    try { const value = JSON.parse(localStorage.getItem('noxari-saved') || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  });
  const [sharedList, setSharedList] = useState<string[]>([]);
  const [selected, setSelected] = useState<SpaceObject|null>(null);
  const [search, setSearch] = useState('');
  const [gear, setGear] = useState<'all'|Gear>('all');
  const [category, setCategory] = useState('All');
  const [catalogGroup, setCatalogGroup] = useState<'main'|'extra'>('main');
  // F-043: naked-eye level by default on every load (session-local like the other layers).
  const [skyLevel, setSkyLevel] = useState<SkyLevel>('eye');
  const [skyGroups, setSkyGroups] = useState<SkyGroups>(defaultSkyGroups);
  const [startupObservation] = useState(() => initialObservation(new Date(), initialLocation));
  const [time, setTime] = useState(startupObservation.time);
  const [timeMode, setTimeMode] = useState<'live' | 'fixed' | 'preview'>(startupObservation.mode);
  const [location, setLocation] = useState<ObservingLocation>(initialLocation);
  const [locationSelection, setLocationSelection] = useState(() => presets.some(item => item.name === initialLocation.name) ? initialLocation.name : 'Custom');
  const [latitudeInput, setLatitudeInput] = useState(String(initialLocation.latitude));
  const [longitudeInput, setLongitudeInput] = useState(String(initialLocation.longitude));
  const [timeZoneInput, setTimeZoneInput] = useState(initialLocation.timeZone);
  const [toast, setToast] = useState(() => startupObservation.warning === 'polarDay'
    ? t(lang, 'Polar day: no dark sky is calculated tonight. Showing the darkest time.', 'Midnattssol: ingen mörk stjärnhimmel beräknas i natt. Visar tiden då solen står som lägst.')
    : startupObservation.warning === 'bright' ? t(lang, 'No fully dark sky tonight. Showing the time when the Sun is lowest.', 'Ingen helt mörk stjärnhimmel i natt. Visar tiden då solen står som lägst.') : '');
  useEffect(() => {
    if (!startupObservation.warning) return;
    const timer = window.setTimeout(() => setToast(current => current === toast ? '' : current), 5000);
    return () => clearTimeout(timer);
  }, [startupObservation]);
  const [finderTarget, setFinderTarget] = useState<SpaceObject | null>(null);
  // F-044/F-045: guided tour and self-running demo.
  const [tour, setTour] = useState<{mode: TourMode; stops: SpaceObject[]; index: number} | null>(null);
  const [tourSource, setTourSource] = useState<TourSource>('saved');
  const [caption, setCaption] = useState<{object: SpaceObject; leaving: boolean; key: number} | null>(null);
  const tourRef = useRef(tour);
  tourRef.current = tour;
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoFullscreen = useRef(false);
  const zoomControl = useRef<React.Dispatch<React.SetStateAction<number>> | null>(null);
  /** F-027: time scrubber anchored at a moment; the slider adds −12…+12 hours. */
  const [intro, setIntro] = useState(shouldShowIntro);
  const closeIntro = () => { setIntro(false); try { localStorage.setItem(INTRO_KEY, '1'); } catch { /* private mode */ } };
  const [scrub, setScrub] = useState<{anchor: number; offset: number} | null>(null);
  const [showFigures, setShowFigures] = useState(true);
  const [figureMode, setFigureMode] = useState<FigureMode>('all');
  const [showFigureNames, setShowFigureNames] = useState(true);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showMilkyWay, setShowMilkyWay] = useState(true);
  const [showArt, setShowArt] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showEcliptic, setShowEcliptic] = useState(true);
  const milkyWay = useMilkyWay(showMilkyWay);
  const [skyMode, setSkyMode] = useState<'horizon' | 'map'>('horizon');
  const [viewDirection, setViewDirection] = useSkyFrameState<ViewDirection>(() => ({heading: 180, pitch: Math.atan(.6 * innerHeight / Math.max(innerWidth, innerHeight)) * 180 / Math.PI}), skyFrames);
  const phone = usePhoneOrientation(skyMode === 'horizon', setViewDirection, skyFrames);
  const [gpsPending, setGpsPending] = useState(false);
  const [gpsMessage, setGpsMessage] = useState('');
  const gpsRequest = useRef(0);
  useEffect(() => () => { gpsRequest.current++; }, []);

  useLayoutEffect(() => { if (workspace.current) workspace.current.inert = panel !== null; }, [panel]);
  useEffect(() => {
    if (timeMode !== 'live') return;
    const tick = () => setTime(new Date());
    const interval = window.setInterval(tick, 30000);
    const visible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', visible); };
  }, [timeMode]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      appRoot.current?.style.setProperty('--app-height', `${viewport?.height ?? innerHeight}px`);
      appRoot.current?.style.setProperty('--app-top', `${viewport?.offsetTop ?? 0}px`);
    };
    const fullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    resize(); viewport?.addEventListener('resize', resize); viewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize); document.addEventListener('fullscreenchange', fullscreen);
    return () => { viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', resize); window.removeEventListener('resize', resize); document.removeEventListener('fullscreenchange', fullscreen); };
  }, []);

  useEffect(() => { localStorage.setItem('noxari-saved', JSON.stringify(saved)); }, [saved]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { localStorage.setItem(LANGUAGE_PREFERENCE_KEY, langPreference); }, [langPreference]);
  useEffect(() => { localStorage.setItem('noxari-red-mode', redMode ? '1' : '0'); }, [redMode]);
  useEffect(() => {
    const update = () => setDeviceLanguages(navigator.languages ?? [navigator.language]);
    window.addEventListener('languagechange', update);
    return () => window.removeEventListener('languagechange', update);
  }, []);
  useEffect(() => { localStorage.setItem('noxari-location', JSON.stringify(location)); }, [location]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('list')) {
      setSharedList(parseSharedList(params.get('list') ?? '', allObjects.map(item => item.id)));
      setPanel('shared');
      return;
    }
    const id = params.get('object');
    const object = allObjects.find(item => item.id === (id ? catalogIdentifier(id) ?? id.toLowerCase() : id) || item.aliases?.some(alias => alias.toLowerCase() === id?.toLowerCase()));
    if (object) { setSelected(object); setPanel('details'); }
  }, []);

  const windowDescriptor = useMemo(() => nightWindow(time, location), [time, location]);
  const nightKey = `${windowDescriptor.start.getTime()}/${windowDescriptor.end.getTime()}`;
  const night = useMemo(() => location === initialLocation && windowDescriptor.start.getTime() === startupObservation.night.window.start.getTime()
    && windowDescriptor.end.getTime() === startupObservation.night.window.end.getTime() ? startupObservation.night : nightContext(time, location), [nightKey, location, startupObservation]);
  const series = useMemo(() => nightCatalog(allObjects, night.window.start, location, night), [location, night]);
  const ranked = useMemo(() => rankTonight(objects, series, gear, time), [series, gear, time]);
  const nightPasses = useMemo(() => panel === 'tonight' && issVersion ? issPasses(night.window.start, location, Math.max(1, (night.window.end.getTime() - night.window.start.getTime()) / 3_600_000)).filter(pass => pass.visible) : [], [panel === 'tonight', issVersion, night, location]);
  const events = useMemo(() => panel === 'tonight' ? upcomingEvents(new Date(Math.floor(time.getTime() / 3_600_000) * 3_600_000), location) : [], [panel === 'tonight', Math.floor(time.getTime() / 3_600_000), location]);
  const sun = useMemo(() => positionAt(Body.Sun, time, location), [time, location]);
  const selectedAppearance = useMemo(() => selected ? solarAppearance(selected, time) : null, [selected, time]);
  const selectedImage = selected ? objectImages[selected.id] : undefined;
  const solarDistance = selectedAppearance ? selected?.kind === 'Moon' ? `${new Intl.NumberFormat(lang === 'sv' ? 'sv-SE' : 'en-GB', {maximumFractionDigits: 0}).format(Math.round(selectedAppearance.distanceAu * 149597870.7))} km` : `${formatNumber(selectedAppearance.distanceAu, lang, 3)} AU` : null;
  const selectedPosition = selected ? objectPosition(selected, time, location) : null;
  const visibleNow = useMemo(() => {
    if (category !== 'Visible') return null;
    const resolve = objectPositioner(time, location);
    return new Set((catalogGroup === 'main' ? mainObjects : candidateObjects).filter(object => {
      const position = resolve(object);
      return position && position.altitude >= 0 && showObjectMarker(object, sun.altitude, object.kind === 'Planet' ? solarAppearance(object, time) : null);
    }).map(object => object.id));
  }, [category, catalogGroup, time, location, sun.altitude]);
  const filtered = useMemo(() => (catalogGroup === 'main' ? mainObjects : candidateObjects).filter(object => {
    const matches = matchesCatalogQuery(object, search);
    return matches && (category === 'All' || (category === 'Visible' ? visibleNow?.has(object.id) : object.kind === category));
  }), [search, category, catalogGroup, visibleNow]);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const showNightPreview = () => {
    if (phone.active) return;
    const sample = darkestNightSample(night);
    if (!sample) return;
    setScrub(null);
    setTimeMode('preview');
    glideTime(sample.time);
    closePanel();
    if (night.window.kind === 'polarDay') notify(t(lang, 'Polar day: no dark sky is calculated tonight. Showing the darkest time.', 'Midnattssol: ingen mörk stjärnhimmel beräknas i natt. Visar tiden då solen står som lägst.'));
    else if (sample.sunAltitude > -14) notify(t(lang, 'No fully dark sky tonight. Showing the time when the Sun is lowest.', 'Ingen helt mörk stjärnhimmel i natt. Visar tiden då solen står som lägst.'));
  };
  /** F-037: move smoothly to a new observation time (≤ 12 h away) inside the shared frame loop. */
  const glideTime = (target: Date) => {
    const from = time.getTime(), delta = target.getTime() - from;
    if (reducedMotion || Math.abs(delta) > 12 * 3_600_000 || delta === 0) { setTime(target); return; }
    let start: number | null = null;
    skyFrames.setMotion(now => {
      start ??= now;
      const k = Math.min(1, (now - start) / 650);
      const eased = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      setTime(new Date(from + delta * eased));
      return k < 1;
    });
  };
  const openScrubber = () => { setScrub({anchor: time.getTime(), offset: 0}); setTimeMode('fixed'); setPanel(null); };
  const scrubTo = (anchor: number, offset: number, glide = false) => { setScrub({anchor, offset}); setTimeMode('fixed'); const next = new Date(anchor + offset * 60_000); if (glide) glideTime(next); else { cancelGlide(); setTime(next); } };
  const toggleSaved = (id: string) => setSaved(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const pickObject = (object: SpaceObject) => {
    setSelected(object); setFinderTarget(null); setPanel(null);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.object-preview button')?.focus({preventScroll: true}));
  };
  const startComparison = () => {
    cancelGlide();
    if (phone.active || phone.status === 'requesting' || phone.status === 'waiting' || phone.status === 'retrying' || gpsPending || (showMilkyWay && !milkyWay.texture) || skyMode !== 'horizon') return;
    const originalView = viewDirection, originalTime = time, originalMode = timeMode;
    if (skyFrames.comparison.start({apply: setViewDirection, restore: () => {
      setViewDirection(originalView);setTimeMode(originalMode);setTime(originalMode === 'live' ? new Date() : originalTime);
    }}, timeMode)) {setDiagnosticMode('comparison');setTimeMode('fixed');setPanel(null);skyFrames.invalidate();}
  };
  const openPanel = (next: Panel) => { skyFrames.comparison.cancel('user-interaction');setPanel(next); };
  const closePanel = () => setPanel(null);
  const cancelGlide = () => skyFrames.setMotion(null);
  const manualView: React.Dispatch<React.SetStateAction<ViewDirection>> = next => { if (!phone.active) { cancelGlide(); setViewDirection(next); } };
  const dragView: React.Dispatch<React.SetStateAction<ViewDirection>> = next => {
    cancelGlide();
    phone.takeManualControl();
    setViewDirection(next);
  };
  const follow = () => { cancelGlide(); skyFrames.comparison.cancel('user-interaction');setSkyMode('horizon'); setPanel(null); void phone.start(); };
  const toggleFollow = () => {
    if (phone.status === 'recalibrate' || phone.status === 'align') openPanel('phone');
    else if (phone.active) phone.stop();
    else follow();
  };
  /** Turn the view to an above-horizon object with one eased camera move in the shared frame loop. */
  const showInSky = (object: SpaceObject) => {
    const target = objectPosition(object, time, location);
    if (!target || target.altitude < 0) return;
    skyFrames.comparison.cancel('user-interaction');
    if (phone.active) phone.takeManualControl();
    setSkyMode('horizon'); setPanel(null);
    const goal = {heading: target.azimuth, pitch: clampViewPitch(Math.min(89.9, target.altitude))};
    if (reducedMotion) { cancelGlide(); setViewDirection(goal); return; }
    const from = viewDirection;
    const headingDelta = ((goal.heading - from.heading + 540) % 360) - 180;
    const pitchDelta = goal.pitch - from.pitch;
    const duration = 700;
    let start: number | null = null;
    skyFrames.setMotion(now => {
      start ??= now;
      const k = Math.min(1, (now - start) / duration);
      const eased = k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      setViewDirection({heading: (from.heading + headingDelta * eased + 360) % 360, pitch: from.pitch + pitchDelta * eased});
      return k < 1;
    });
  };
  // Tours run from timers and frame callbacks: read the latest view/time/place, never a stale render's copy.
  const live = useRef({view: viewDirection, time, location});
  live.current = {view: viewDirection, time, location};
  const typeLabel = (object: SpaceObject) => {
    const subtype = lang === 'sv' ? object.subtypeSv : object.subtype;
    return subtype ? subtype[0].toUpperCase() + subtype.slice(1) : kindDisplay(object.kind, lang);
  };
  const tourList = (source: TourSource) => source === 'saved' ? allObjects.filter(object => saved.includes(object.id)) : ranked.filter(item => item.best).slice(0, 10).map(item => item.object);
  /** One camera move to an object inside the shared frame loop: pull back, swing, push in. */
  const flyTo = (object: SpaceObject, cinematic: boolean, done?: () => void) => {
    const target = objectPosition(object, live.current.time, live.current.location);
    if (!target || target.altitude < 0) return false;
    skyFrames.comparison.cancel('user-interaction');
    if (phone.active) phone.takeManualControl();
    setSkyMode('horizon');
    const goalZoom = cinematic ? demoZoom(object) : Math.min(1.8, demoZoom(object));
    // In the demo the object sits in the upper third of the screen, clear of the title card and photo. The offset
    // is recomputed for the current zoom every frame, so zooming in and out stays anchored on the object.
    const liftAt = (zoom: number) => cinematic ? Math.atan(.2 * innerHeight / (Math.max(innerWidth, innerHeight) / 2 * zoom)) * 180 / Math.PI : 0;
    const centred = goalView(target), framed = (view: ViewDirection, zoom: number, weight = 1) => ({...view, pitch: clampViewPitch(view.pitch - liftAt(zoom) * weight)});
    if (reducedMotion) { cancelGlide(); setViewDirection(framed(centred, goalZoom)); zoomControl.current?.(goalZoom); if (done) setTimeout(done, 0); return true; }
    const from = live.current.view;
    // The swing interpolates toward the object itself; the framing offset blends in with the move.
    const fromCentred = {...from, pitch: from.pitch}, duration = glideDuration(fromCentred, centred, cinematic);
    let start: number | null = null, fromZoom: number | null = null;
    let holdStart: number | null = null, landed = false;
    skyFrames.setMotion(now => {
      if (holdStart !== null) {
        // F-046: keep the shot alive with a slow push-in and drift (same motion slot, so the frame loop keeps it).
        const pose = holdPose((now - holdStart) / (DEMO_HOLD + DEMO_FADE), centred, goalZoom);
        zoomControl.current?.(pose.zoom); setViewDirection(framed(pose.view, pose.zoom));
        return now - holdStart < DEMO_HOLD + DEMO_FADE;
      }
      start ??= now;
      const k = Math.min(1, (now - start) / duration);
      const pose = cinematicPose(k, fromCentred, fromZoom ?? 1, centred, goalZoom, cinematic);
      zoomControl.current?.(current => { fromZoom ??= current; return cinematicPose(k, fromCentred, fromZoom, centred, goalZoom, cinematic).zoom; });
      const blend = k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      setViewDirection(framed(pose.view, pose.zoom, blend));
      if (k < 1) return true;
      if (!landed) { landed = true; if (done) setTimeout(done, 0); }
      if (!cinematic) return false;
      holdStart = now;
      return true;
    });
    return true;
  };
  const clearDemoTimer = () => { if (demoTimer.current !== null) clearTimeout(demoTimer.current); demoTimer.current = null; };
  const stopTour = () => {
    const current = tourRef.current;
    clearDemoTimer(); cancelGlide(); setCaption(null); setTour(null); tourRef.current = null; setFinderTarget(null);
    if (current?.mode === 'demo') {
      setSelected(null);
      zoomControl.current?.(1);
      if (demoFullscreen.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      demoFullscreen.current = false;
    }
  };
  const DEMO_HOLD = 7000, DEMO_FADE = 600;
  const runDemo = (state: {mode: TourMode; stops: SpaceObject[]; index: number}) => {
    clearDemoTimer(); setCaption(null);
    // Time moves on during a long demo: skip anything that has since set.
    let index = state.index;
    for (let tries = 0; tries < state.stops.length; tries++, index = (index + 1) % state.stops.length) {
      const position = objectPosition(state.stops[index], live.current.time, live.current.location);
      if (position && position.altitude >= 0) break;
      if (tries === state.stops.length - 1) { stopTour(); notify(t(lang, 'None of the objects is above the horizon any more.', 'Inget av objekten är längre över horisonten.')); return; }
    }
    const next = {...state, index}, object = next.stops[index];
    setTour(next); tourRef.current = next; setSelected(object);
    flyTo(object, true, () => {
      if (tourRef.current?.mode !== 'demo') return;
      setCaption({object, leaving: false, key: Date.now()});
      demoTimer.current = setTimeout(() => {
        setCaption(current => current && {...current, leaving: true});
        demoTimer.current = setTimeout(() => { const live = tourRef.current; if (live?.mode === 'demo') runDemo({...live, index: (live.index + 1) % live.stops.length}); }, DEMO_FADE);
      }, DEMO_HOLD);
    });
  };
  const goToStop = (state: {mode: TourMode; stops: SpaceObject[]; index: number}) => {
    if (state.mode === 'demo') { runDemo(state); return; }
    const object = state.stops[state.index];
    setTour(state); tourRef.current = state; setSelected(object); setPanel(null);
    if (state.mode === 'point') { setSkyMode('horizon'); setFinderTarget(object); }
    else { setFinderTarget(null); if (!flyTo(object, false)) notify(t(lang, 'This object has set below the horizon.', 'Objektet har gått ned under horisonten.')); }
  };
  const startTour = (mode: TourMode) => {
    const list = tourList(tourSource);
    const {stops, skipped} = tourStops(list, time, location);
    if (!list.length) { notify(tourSource === 'saved' ? t(lang, 'Save some objects first.', 'Spara några objekt först.') : t(lang, 'No suggestions tonight.', 'Inga förslag i natt.')); return; }
    if (!stops.length) { notify(t(lang, 'None of the objects is above the horizon right now.', 'Inget av objekten är över horisonten just nu.')); return; }
    if (skipped.length) notify(t(lang, `${skipped.length} below the horizon ${skipped.length === 1 ? 'is' : 'are'} skipped.`, `${skipped.length} objekt under horisonten hoppas över.`));
    setPanel(null); setScrub(null);
    if (mode === 'point' && !phone.active) follow();
    if (mode === 'demo' && !document.fullscreenElement && appRoot.current?.requestFullscreen) {
      appRoot.current.requestFullscreen().then(() => { demoFullscreen.current = true; }).catch(() => {});
    }
    goToStop({mode, stops, index: 0});
  };
  // Demo mode ends with Escape or when the user leaves full screen; timers never outlive the app.
  useEffect(() => {
    if (tour?.mode !== 'demo') return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') stopTour(); };
    const screen = () => { if (demoFullscreen.current && !document.fullscreenElement) { demoFullscreen.current = false; stopTour(); } };
    window.addEventListener('keydown', key); document.addEventListener('fullscreenchange', screen);
    return () => { window.removeEventListener('keydown', key); document.removeEventListener('fullscreenchange', screen); };
  }, [tour?.mode]);
  useEffect(() => () => clearDemoTimer(), []);
  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await appRoot.current?.requestFullscreen(); }
    catch { notify(t(lang, 'Fullscreen is unavailable in this browser.', 'Helskärm är inte tillgängligt i denna webbläsare.')); }
  };
  const startFinder = (object: SpaceObject) => {
    if (!object.position) return;
    setSelected(object); setPanel(null); setSkyMode('horizon'); setFinderTarget(object);
    requestAnimationFrame(() => document.querySelector<HTMLDivElement>('.horizon-view')?.focus({preventScroll: true}));
  };
  const cancelGps = () => { gpsRequest.current++; setGpsPending(false); setGpsMessage(''); };
  const selectPreset = (name: string) => {
    cancelGps();
    if (name === 'Custom') { setLocationSelection('Custom'); setAdvancedLocation(true); return; }
    const preset = presets.find(item => item.name === name);
    if (!preset) return;
    setLocationSelection(preset.name);
    setLocation(preset);
    setLatitudeInput(String(preset.latitude));
    setLongitudeInput(String(preset.longitude));
    setTimeZoneInput(preset.timeZone);
  };
  const applyCoordinates = () => {
    cancelGps();
    const latitude = Number(latitudeInput);
    const longitude = Number(longitudeInput);
    if (latitudeInput.trim() === '' || longitudeInput.trim() === '' || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      notify(t(lang, 'Enter latitude −90 to 90 and longitude −180 to 180.', 'Ange latitud −90 till 90 och longitud −180 till 180.'));
      return;
    }
    if (!DateTime.now().setZone(timeZoneInput).isValid) {
      notify(t(lang, 'Enter a valid IANA timezone, such as Europe/Stockholm.', 'Ange en giltig IANA-tidszon, till exempel Europe/Stockholm.'));
      return;
    }
    setLocation({name: t(lang, 'Custom coordinates', 'Egna koordinater'), latitude, longitude, timeZone: timeZoneInput});
    setLocationSelection('Custom');
    notify(t(lang, 'Observation location updated', 'Observationsplats uppdaterad'));
  };
  const useGps = () => {
    if (!window.isSecureContext || !navigator.geolocation) {
      setGpsMessage(t(lang, 'Location needs HTTPS and browser location support. Enter coordinates manually.', 'Plats kräver HTTPS och platsstöd i webbläsaren. Ange koordinater manuellt.'));
      return;
    }
    const token = ++gpsRequest.current;
    setGpsPending(true);
    setGpsMessage(t(lang, 'Waiting for your location…', 'Väntar på din plats…'));
    navigator.geolocation.getCurrentPosition(result => {
      if (token !== gpsRequest.current) return;
      const {latitude, longitude, accuracy} = result.coords;
      setGpsPending(false);
      if (![latitude, longitude, accuracy].every(Number.isFinite) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0) {
        setGpsMessage(t(lang, 'Invalid location received. Try again or enter coordinates.', 'Ogiltig plats mottogs. Försök igen eller ange koordinater.'));
        return;
      }
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || location.timeZone;
      setLocation({name: t(lang, 'Device location', 'Enhetens plats'), latitude, longitude, timeZone});
      setLocationSelection('Custom');
      setLatitudeInput(String(latitude)); setLongitudeInput(String(longitude)); setTimeZoneInput(timeZone);
      setGpsMessage(t(lang, `Location updated, reported accuracy ±${Math.round(accuracy)} m. Using device timezone: ${timeZone}.`, `Plats uppdaterad, rapporterad noggrannhet ±${Math.round(accuracy)} m. Använder enhetens tidszon: ${timeZone}.`));
    }, error => {
      if (token !== gpsRequest.current) return;
      setGpsPending(false);
      setGpsMessage(error.code === 1 ? t(lang, 'Location access denied. Allow it in browser settings or enter coordinates manually.', 'Platsåtkomst nekades. Tillåt den i webbläsarens inställningar eller ange koordinater manuellt.') : error.code === 3 ? t(lang, 'Location timed out. Try again outdoors or enter coordinates manually.', 'Platsförfrågan tog för lång tid. Försök utomhus eller ange koordinater manuellt.') : t(lang, 'Location is unavailable. Try again or enter coordinates manually.', 'Platsen är inte tillgänglig. Försök igen eller ange koordinater manuellt.'));
    }, {enableHighAccuracy: true, timeout: 15000, maximumAge: 60000});
  };
  async function share(object: SpaceObject) {
    // Named stars (F-026) have no static preview page; they use the app deep link instead.
    const url = object.id.startsWith('star-')
      ? new URL(`${import.meta.env.BASE_URL}?object=${encodeURIComponent(object.id)}&lang=${lang}`, window.location.origin)
      : new URL(`${import.meta.env.BASE_URL}share/${lang}/${encodeURIComponent(object.id)}/`, window.location.origin);
    const title = `${display(object, lang)} — Noxari`;
    try {
      if (navigator.share) await navigator.share({title, url: url.toString()});
      else { await navigator.clipboard.writeText(url.toString()); notify(t(lang, 'Link copied', 'Länk kopierad')); }
    } catch { notify(t(lang, 'Sharing cancelled or unavailable', 'Delning avbruten eller ej tillgänglig')); }
  }

  async function shareSavedList() {
    const ids = formatSharedList(saved, allObjects.map(item => item.id));
    if (!ids) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('object');
    url.searchParams.set('list', ids);
    const title = t(lang, 'Noxari observation list', 'Noxaris observationslista');
    const text = t(lang, `A list of ${ids.split(',').length} saved sky objects.`, `En lista med ${ids.split(',').length} sparade himmelsobjekt.`);
    try {
      if (navigator.share) await navigator.share({title, text, url: url.toString()});
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url.toString()); notify(t(lang, 'List link copied', 'Listlänk kopierad')); }
      else notify(t(lang, 'Sharing is unavailable in this browser.', 'Delning är inte tillgänglig i den här webbläsaren.'));
    } catch { notify(t(lang, 'Sharing cancelled or unavailable', 'Delning avbruten eller ej tillgänglig')); }
  }

  const saveSharedList = () => {
    setSaved(current => [...new Set([...current, ...sharedList])]);
    notify(t(lang, 'List saved to your bookmarks', 'Listan sparad bland dina bokmärken'));
  };

  const card = (object: SpaceObject, suggestion?: ReturnType<typeof recommend>) => <ObjectRow key={object.id} object={object} series={object.kind === 'Satellite' ? undefined : series.get(object.id)} time={time} timeZone={location.timeZone} language={lang}
    name={display(object, lang)} kind={lang === 'sv' ? object.subtypeSv ?? kindDisplay(object.kind, lang) : kindDisplay(object.kind, lang)} saved={saved.includes(object.id)} onOpen={() => pickObject(object)} onToggleSave={() => toggleSaved(object.id)}
    extra={suggestion && <SuggestionSummary suggestion={suggestion} language={lang} timeZone={location.timeZone}/>}/>;

  const titles: Record<Panel, string> = {
    search: t(lang, 'Search objects', 'Sök objekt'), tonight: t(lang, 'Tonight', 'Ikväll'), saved: t(lang, 'Saved objects', 'Sparade objekt'), shared: t(lang, 'Shared observation list', 'Delad observationslista'),
    observation: t(lang, 'Time & location', 'Tid & plats'), view: t(lang, 'Layers', 'Lager'),
    performance: t(lang, 'Performance report', 'Prestandarapport'), about: t(lang, 'About Noxari & sources', 'Om Noxari & källor'), log: t(lang, 'Observation log', 'Observationslogg'), tour: t(lang, 'Tour & demo', 'Visning & demo'), more: t(lang, 'More', 'Mer'), details: selected ? display(selected, lang) : t(lang, 'Details', 'Detaljer'), phone: t(lang, 'Phone direction', 'Telefonriktning'),
  };
  const phoneLabel = phone.status === 'recalibrate' ? t(lang, 'Check north', 'Kalibrera') : phone.status === 'tracking' ? t(lang, 'Following', 'Följer') : phone.status === 'paused' ? t(lang, 'Resume', 'Återuppta') : phone.status === 'align' ? t(lang, 'Align north', 'Kalibrera') : ['waiting', 'requesting', 'retrying'].includes(phone.status) ? t(lang, 'Waiting', 'Väntar') : t(lang, 'Follow', 'Följ');
  const followName = phone.status === 'recalibrate' || phone.status === 'align' ? t(lang, 'Open phone direction controls', 'Öppna kontroller för telefonriktning') : phone.active ? t(lang, 'Stop following the phone', 'Sluta följa telefonen') : t(lang, 'Follow the phone', 'Följ telefonen');
  const selectedPeak = selected?.position ? peakSample(series.get(selected.id)!) : null;
  const selectedRise = selected && selectedPosition && selectedPosition.altitude < 0 ? nextObjectRise(selected, time, location) : null;
  const selectedMoon = useMemo(() => selected?.id === 'moon' ? moonInfo(time, location) : null, [selected?.id, time, location]);
  const catalogTag = (object: SpaceObject) => /^(m|ngc|ic)\d/.test(object.id) ? object.id.toUpperCase() : null;
  const stamp = timeMode === 'live' ? `${t(lang, 'Now', 'Nu')} · ${clockTime(time, location.timeZone)}` : `${timeMode === 'preview' ? t(lang, 'Night preview', 'Kvällshimmel') : t(lang, 'Selected time', 'Vald tid')} · ${DateTime.fromJSDate(time, {zone: location.timeZone}).setLocale(lang).toFormat('dd LLL HH:mm')}`;
  const correctedRecently = ['tracking', 'paused'].includes(phone.status) && phone.diagnostics.lastAutoCorrectionAgeMs !== null && phone.diagnostics.lastAutoCorrectionAgeMs < 6000;
  const needsPhoneHelp = correctedRecently || ['requesting', 'waiting', 'align', 'denied', 'unavailable', 'missing', 'error', 'retrying', 'recalibrate'].includes(phone.status);
  return <div className={`app sky-app${redMode ? ' red-mode' : ''}${tour?.mode === 'demo' ? ` demo-active${caption && !caption.leaving ? ' demo-landed' : ''}` : tour ? ' touring' : ''}`} ref={appRoot}>
    <div className="sky-workspace" ref={workspace}>
      <main className="sky-stage" aria-label={t(lang, 'Sky', 'Himlen')}>
        <div className="view-switch" key={skyMode}>{skyMode === 'horizon' ? <HorizonView frames={skyFrames} selectedId={selected?.id} finderTarget={finderTarget} phone={phone} onFinderDetails={() => { if (finderTarget) { setSelected(finderTarget); openPanel('details'); } }} onStopFinder={() => { if (tourRef.current?.mode === 'point') stopTour(); else setFinderTarget(null); }} zoomControl={zoomControl} showFigures={showFigures} showFigureNames={showFigureNames} figureMode={figureMode} showBoundaries={showBoundaries} showArt={showArt} showGrid={showGrid} showEcliptic={showEcliptic} showMilkyWay={showMilkyWay} dynamicKey={issVersion} onSelectConstellation={id => { const object = mainObjects.find(item => item.id === `con-${id.toLowerCase()}`) ?? (id === 'Ori' ? objects.find(item => item.id === 'orion') : id === 'UMa' ? objects.find(item => item.id === 'ursa-major') : undefined); if (object) pickObject(object); }} skyLevel={skyLevel} skyGroups={skyGroups} milkyWay={milkyWay.texture} time={time} timeMode={timeMode} location={location} label={object => display(object, lang)} sunLabel={t(lang, 'Sun', 'Solen')} onSelect={pickObject} language={lang} view={viewDirection} onViewChange={manualView} onDragViewChange={dragView}/> : <SkyMap dynamicKey={issVersion} selectedId={selected?.id} showFigures={showFigures} showFigureNames={showFigureNames} figureMode={figureMode} showBoundaries={showBoundaries} showArt={showArt} showGrid={showGrid} showEcliptic={showEcliptic} skyLevel={skyLevel} skyGroups={skyGroups} milkyWay={showMilkyWay ? milkyWay.texture : null} time={time} location={location} label={object => display(object, lang)} language={lang} sunLabel={t(lang, 'Sun', 'Solen')} onSelect={pickObject}/>}</div>
      </main>
      <header className="sky-statusbar">
        <button className={`observation-chip ${timeMode}`} onClick={() => openPanel('observation')} aria-label={t(lang, 'Time & location', 'Tid och plats')}><MapPin size={15}/><span><strong>{location.name}</strong><small>{stamp}</small></span></button>
        {(canFollow || phone.active) && <button className={`direction-chip follow-toggle ${phone.status}`} aria-pressed={phone.active} aria-label={followName} title={followName} onClick={toggleFollow}><Compass size={17}/>{phoneLabel}</button>}
      </header>
      {tour && tour.mode !== 'demo' && <TourBar language={lang} mode={tour.mode} index={tour.index} count={tour.stops.length} object={tour.stops[tour.index]} type={typeLabel(tour.stops[tour.index])}
        onPrevious={() => goToStop({...tour, index: Math.max(0, tour.index - 1)})} onNext={() => goToStop({...tour, index: Math.min(tour.stops.length - 1, tour.index + 1)})} onStop={stopTour}/>}
      {tour?.mode === 'demo' && <DemoOverlay language={lang} index={tour.index} count={tour.stops.length} onStop={stopTour}
        caption={caption && (() => { const position = objectPosition(caption.object, time, location), photo = objectImages[caption.object.id]; return {...caption, type: typeLabel(caption.object), facts: objectFacts(caption.object, time, lang), constellation: solarAppearance(caption.object, time)?.constellation ?? caption.object.constellation, look: position && position.altitude >= 0 ? {...lookHint(position, lang), altitude: position.altitude, azimuth: position.azimuth} : null, photo: photo ? {src: `${import.meta.env.BASE_URL}images/objects/${photo.file}`, credit: photo.credit, license: photo.license} : null}; })()}/>}
      <nav className="quick-tools" aria-label={t(lang, 'Quick actions', 'Snabbknappar')}>
        <button data-default-focus onClick={() => openPanel('search')} aria-haspopup="dialog"><Search size={22}/><span>{t(lang, 'Search', 'Sök')}</span></button>
        <button onClick={() => openPanel('tonight')} aria-haspopup="dialog"><Star size={22}/><span>{t(lang, 'Tonight', 'Ikväll')}</span></button>
        <button onClick={() => openPanel('view')} aria-haspopup="dialog"><Layers size={22}/><span>{t(lang, 'Layers', 'Lager')}</span></button>
        <button onClick={() => openPanel('observation')} aria-haspopup="dialog"><Clock3 size={22}/><span>{t(lang, 'Time & place', 'Tid & plats')}</span></button>
        <button onClick={() => openPanel('more')} aria-haspopup="dialog"><MoreHorizontal size={22}/><span>{t(lang, 'More', 'Mer')}</span></button>
      </nav>
      {needsPhoneHelp && <div className="phone-notice" role="status" style={{top: skyMode === 'horizon' && viewDirection.pitch < 0 ? 'calc(140px + env(safe-area-inset-top))' : undefined}}><span>{phone.status === 'recalibrate' ? t(lang, 'Direction is uncertain. Open controls to recalibrate.', 'Riktningen är osäker. Öppna kontroller för att kalibrera om.') : correctedRecently ? t(lang, 'North reference restored automatically.', 'Nordreferensen återställdes automatiskt.') : phone.needsAlignment ? t(lang, 'Hold still for a compass reference, or open controls.', 'Håll stilla för kompassreferens eller öppna kontroller.') : phone.status === 'waiting' || phone.status === 'requesting' ? t(lang, 'Waiting for phone direction…', 'Väntar på telefonriktning…') : phone.status === 'retrying' ? t(lang, 'Restarting phone direction…', 'Startar om telefonriktningen…') : phone.status === 'denied' ? t(lang, 'Sensor access was denied. Open controls for help.', 'Sensoråtkomst nekades. Öppna kontroller för hjälp.') : phone.status === 'error' ? t(lang, 'Sensor access could not be requested. Open controls to retry.', 'Sensoråtkomst kunde inte begäras. Öppna kontroller för att försöka igen.') : phone.status === 'missing' ? t(lang, 'No usable phone direction arrived. Open controls to retry.', 'Ingen användbar telefonriktning mottogs. Öppna kontroller för att försöka igen.') : t(lang, 'Phone sensors are unavailable in this browser. Manual control works.', 'Telefonsensorer är inte tillgängliga i webbläsaren. Manuell styrning fungerar.')}</span><button onClick={() => openPanel('phone')}>{t(lang, 'Controls', 'Kontroller')}</button></div>}
      {scrub && <section className="time-scrubber" aria-label={t(lang, 'Time scrubber', 'Tidsreglage')}>
        <div className="scrub-head"><strong>{DateTime.fromJSDate(time, {zone: location.timeZone}).setLocale(lang).toFormat('ccc d LLL · HH:mm')}</strong><span>{scrub.offset === 0 ? t(lang, 'Drag to move through time', 'Dra för att flytta i tiden') : `${scrub.offset > 0 ? '+' : '−'}${Math.floor(Math.abs(scrub.offset) / 60)} h ${Math.abs(scrub.offset) % 60 ? `${Math.abs(scrub.offset) % 60} min` : ''}`}</span><button className="scrub-done" onClick={() => setScrub(null)}>{t(lang, 'Done', 'Klar')}</button></div>
        <div className="scrub-row">
          <button aria-label={t(lang, 'One day back', 'Ett dygn bakåt')} onClick={() => scrubTo(scrub.anchor - 86_400_000, scrub.offset, true)}><Rewind size={18}/><span>{t(lang, '1 d', '1 d')}</span></button>
          <button aria-label={t(lang, 'One hour back', 'En timme bakåt')} onClick={() => scrubTo(scrub.anchor + (scrub.offset - 60) * 60_000, 0, true)}>−1 h</button>
          <input type="range" min={-720} max={720} step={5} value={scrub.offset} aria-label={t(lang, 'Time offset in minutes', 'Tidsförskjutning i minuter')} onChange={event => scrubTo(scrub.anchor, Number(event.target.value))}/>
          <button aria-label={t(lang, 'One hour forward', 'En timme framåt')} onClick={() => scrubTo(scrub.anchor + (scrub.offset + 60) * 60_000, 0, true)}>+1 h</button>
          <button aria-label={t(lang, 'One day forward', 'Ett dygn framåt')} onClick={() => scrubTo(scrub.anchor + 86_400_000, scrub.offset, true)}><span>{t(lang, '1 d', '1 d')}</span><FastForward size={18}/></button>
        </div>
      </section>}
      {selected && !scrub && !tour && (!finderTarget || skyMode === 'map') && <section className="object-preview" aria-label={t(lang, 'Selected object', 'Valt objekt')}>
        <div className="preview-head"><span className="preview-icon"><KindIcon name={kindIconName(selected)} size={26} color={selected.color}/></span><div className="preview-title"><strong>{display(selected, lang)}</strong><small>{[catalogTag(selected), selectedMoon ? `${moonPhaseLabel(selectedMoon.phase, lang === 'sv')} ${Math.round(selectedMoon.illumination * 100)} %` : kindDisplay(selected.kind, lang), selectedPosition && selectedPosition.altitude >= 0 ? `${formatNumber(selectedPosition.altitude, lang, 0)}° ${t(lang, 'up', 'högt')}` : null, selectedPeak ? `${t(lang, 'best', 'bäst')} ${clockTime(selectedPeak.time, location.timeZone)}` : null, observationLog.entry(selected.id) ? `✓ ${t(lang, 'seen', 'sett')}` : null].filter(Boolean).join(' · ')}</small></div><button className="preview-close" onClick={() => { cancelGlide(); setSelected(null); setFinderTarget(null); }} aria-label={t(lang, 'Clear object', 'Avmarkera objekt')}><X size={18}/></button></div>
        {selectedMoon && <p className="preview-below moon-times">{[selectedMoon.rise && `${t(lang, 'Rises', 'Upp')} ${clockTime(selectedMoon.rise, location.timeZone)}`, selectedMoon.set && `${t(lang, 'sets', 'ned')} ${clockTime(selectedMoon.set, location.timeZone)}`].filter(Boolean).join(' · ')}</p>}
        {selectedPosition && selectedPosition.altitude < 0 && <p className="preview-below">{t(lang, 'Below the horizon', 'Under horisonten')}{selectedRise ? ` · ${t(lang, 'rises about', 'går upp ca')} ${DateTime.fromJSDate(selectedRise, {zone: location.timeZone}).setLocale(lang).toFormat(DateTime.fromJSDate(selectedRise).hasSame(DateTime.fromJSDate(time), 'day') ? 'HH:mm' : 'd LLL HH:mm')}` : ''}</p>}
        <div className="preview-actions">
          {selectedPosition && selectedPosition.altitude >= 0 && <button className="primary" onClick={() => showInSky(selected)}><Crosshair size={17}/>{t(lang, 'Show in sky', 'Visa på himlen')}</button>}
          <button className={selectedPosition && selectedPosition.altitude >= 0 ? '' : 'primary'} disabled={!selected.position} onClick={() => startFinder(selected)}><LocateFixed size={17}/>{t(lang, 'Guide', 'Guida')}</button>
          <button onClick={() => openPanel('details')}>{t(lang, 'Details', 'Detaljer')}</button>
          <button className="icon-only" aria-label={saved.includes(selected.id) ? t(lang, 'Remove bookmark', 'Ta bort bokmärke') : t(lang, 'Save object', 'Spara objekt')} title={saved.includes(selected.id) ? t(lang, 'Remove bookmark', 'Ta bort bokmärke') : t(lang, 'Save object', 'Spara objekt')} aria-pressed={saved.includes(selected.id)} onClick={() => toggleSaved(selected.id)}><Bookmark size={17} fill={saved.includes(selected.id) ? 'currentColor' : 'none'}/></button>
          <button className="icon-only" aria-label={t(lang, 'Share object', 'Dela objekt')} title={t(lang, 'Share object', 'Dela objekt')} onClick={() => share(selected)}><Share2 size={17}/></button>
        </div></section>}
    </div>
    {panel && <SkyPanel closeLabel={t(lang, 'Close panel', 'Stäng panel')} key={panel} name={panel} title={titles[panel]} onClose={closePanel}>
      {panel === 'observation' && <section className="time-place" aria-label={t(lang, 'Observation settings', 'Observationsinställningar')}>
        <h2 className="sheet-label">{t(lang, 'Time', 'Tid')}</h2>
        <div className="segmented wide" role="group" aria-label={t(lang, 'Time', 'Tid')}>
          <button className={timeMode === 'live' ? 'chosen' : ''} aria-pressed={timeMode === 'live'} onClick={() => { setScrub(null); setTimeMode('live'); glideTime(new Date()); }}>{t(lang, 'Now', 'Nu')}</button>
          <button className={timeMode === 'preview' ? 'chosen' : ''} aria-pressed={timeMode === 'preview'} disabled={phone.active} onClick={showNightPreview}>{t(lang, 'Tonight (darkest)', 'Ikväll (mörkast)')}</button>
          <button className={timeMode === 'fixed' ? 'chosen' : ''} aria-pressed={timeMode === 'fixed'} onClick={() => document.querySelector<HTMLInputElement>('.time-place input[type=datetime-local]')?.focus()}>{t(lang, 'Choose…', 'Välj…')}</button>
        </div>
        <label className="field-row"><Clock3 size={18}/><input aria-label={t(lang, 'Date and time', 'Datum och tid')} type="datetime-local" value={localDateTimeValue(time, location.timeZone)} onChange={event => { const next = selectedLocalTime(event.target.value, location.timeZone); if (next) { setTimeMode('fixed'); setTime(next); } else if (event.target.value) notify(t(lang, 'This local time does not exist in the selected timezone.', 'Denna lokala tid finns inte i den valda tidszonen.')); }}/>{timeMode === 'preview' && <span className="badge">{t(lang, 'Night preview', 'Kvällshimmel')}</span>}</label>
        <p className="field-note">{phone.active ? t(lang, 'Stop phone following before previewing another time.', 'Stoppa telefonföljningen innan du visar en annan tid.') : t(lang, 'Tonight uses the darkest calculated time of the local night. Summer skies may stay bright.', 'Ikväll använder nattens mörkaste beräknade tid. Sommarhimlen kan förbli ljus.')}</p>
        <button className="wide-action" onClick={openScrubber}><FastForward size={18}/>{t(lang, 'Scrub through time', 'Spola tiden')}</button>
        <h2 className="sheet-label">{t(lang, 'Place', 'Plats')}</h2>
        <button className="wide-action primary" onClick={useGps} disabled={gpsPending}><LocateFixed size={18}/>{gpsPending ? t(lang, 'Locating…', 'Hämtar plats…') : t(lang, 'Use my location', 'Använd min position')}</button>
        <label className="field-row"><MapPin size={18}/><select aria-label={t(lang, 'Location', 'Plats')} value={locationSelection} onChange={event => selectPreset(event.target.value)}>{presets.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}<option value="Custom">{location.name !== stockholm.name && !presets.some(item => item.name === location.name) ? location.name : t(lang, 'Custom coordinates', 'Egna koordinater')}</option></select></label>
        {gpsMessage && <p className="gps-status" role="status">{gpsMessage}</p>}
        <details className="advanced-location" open={advancedLocation} onToggle={event => setAdvancedLocation((event.currentTarget as HTMLDetailsElement).open)}>
          <summary><SlidersHorizontal size={18}/><span><strong>{t(lang, 'Advanced', 'Avancerat')}</strong><small>{t(lang, 'Coordinates and timezone', 'Koordinater och tidszon')}</small></span><ChevronRight size={17} className="summary-chevron"/></summary>
          <div className="advanced-fields">
            <label className="coordinate"><span>{t(lang, 'Latitude', 'Latitud')}</span><input aria-label={t(lang, 'Latitude', 'Latitud')} type="number" min="-90" max="90" step="any" value={latitudeInput} onChange={event => setLatitudeInput(event.target.value)}/></label>
            <label className="coordinate"><span>{t(lang, 'Longitude', 'Longitud')}</span><input aria-label={t(lang, 'Longitude', 'Longitud')} type="number" min="-180" max="180" step="any" value={longitudeInput} onChange={event => setLongitudeInput(event.target.value)}/></label>
            <label className="timezone"><span>{t(lang, 'Timezone', 'Tidszon')}</span><input aria-label={t(lang, 'Timezone', 'Tidszon')} type="text" value={timeZoneInput} onChange={event => setTimeZoneInput(event.target.value)}/></label>
            <button className="control-button" onClick={applyCoordinates}>{t(lang, 'Apply', 'Använd')}</button>
            <p>{t(lang, 'Changes take effect after you apply valid coordinates and an IANA timezone. North/east are positive.', 'Ändringarna gäller när du använder giltiga koordinater och en IANA-tidszon. Nord/öst är positiva.')}</p>
          </div>
        </details>
        <p className="panel-foot"><Info size={15}/>{t(lang, 'Terrain and weather are not included. Times use the place’s timezone. The place is saved only on this device.', 'Terräng och väder ingår inte. Tider visas i platsens tidszon. Platsen sparas bara på den här enheten.')}</p>
      </section>}
      {panel === 'search' && <><div className="collection-switch segmented" role="group" aria-label={t(lang, 'Object collection', 'Objektsamling')}><button className={catalogGroup === 'main' ? 'chosen' : ''} aria-pressed={catalogGroup === 'main'} onClick={() => { setCatalogGroup('main'); setCategory('All'); }}>{t(lang, 'Main catalog', 'Huvudsamling')}</button><button className={catalogGroup === 'extra' ? 'chosen' : ''} aria-pressed={catalogGroup === 'extra'} onClick={() => { setCatalogGroup('extra'); setCategory('All'); }}>{t(lang, 'Other objects', 'Övriga objekt')} ({candidateObjects.length})</button></div>{catalogGroup === 'extra' && <p className="panel-note">{t(lang, 'A reviewed collection of provisional or unusual objects. Candidate status and orbit estimates are shown in each entry.', 'En granskad samling av preliminära eller ovanliga objekt. Kandidatstatus och uppskattade banor anges för varje objekt.')}</p>}<div className="search-box"><Search size={20}/><input placeholder={t(lang, 'Search by name, catalog ID or constellation…', 'Sök namn, katalog-ID eller stjärnbild…')} value={search} onChange={event => setSearch(event.target.value)}/>{search && <button onClick={() => setSearch('')} aria-label={t(lang, 'Clear search', 'Rensa sökning')}><X size={17}/></button>}</div><div className="category-scroll">{(catalogGroup === 'main' ? ['All', 'Visible', 'Planet', 'Star', 'Satellite', 'Galaxy', 'Nebula', 'Star cluster', 'Moon', 'Dwarf planet', 'Asteroid', 'Double star', 'Asterism', 'Star cloud', 'Constellation'] : ['All', 'Visible', 'Dwarf planet candidate']).map(item => <button className={'category ' + (category === item ? 'selected' : '')} key={item} onClick={() => setCategory(item)}>{item === 'All' ? t(lang, 'All objects', 'Alla objekt') : item === 'Visible' ? t(lang, 'Visible now', 'Synligt nu') : kindDisplay(item as SpaceObject['kind'], lang)}</button>)}</div><p className="results-count">{filtered.length} {t(lang, 'objects', 'objekt')} · <span className="curve-hint">{t(lang, 'curve: evening → morning, line = horizon, dot = selected time', 'kurva: kväll → morgon, linje = horisont, prick = vald tid')}</span></p><div className="object-list">{filtered.map(object => card(object))}</div>{catalogGroup === 'main' && <section className="zodiac"><h2>{t(lang, 'Constellation names', 'Stjärnbildsnamn')}</h2><p>{t(lang, 'The 12 classical zodiac constellations (name reference)', 'De 12 klassiska zodiakstjärnbilderna (namnreferens)')}</p><div className="zodiac-grid">{zodiac.map(([en, sv]) => <span key={en}>{lang === 'sv' ? sv : en}</span>)}</div></section>}</>}
      {panel === 'details' && selected && <div className="detail-body"><p className="description">{lang === 'sv' ? selected.descriptionSv : selected.description}</p>{selectedImage && <figure className="object-photo"><img src={`${import.meta.env.BASE_URL}images/objects/${selectedImage.file}`} alt={lang === 'sv' ? selectedImage.altSv : selectedImage.altEn} loading="lazy" decoding="async"/><figcaption><span>{selectedImage.credit}</span><span>{t(lang, 'Processed astronomical image; colors and contrast may be enhanced.', 'Bearbetad astronomisk bild; färg och kontrast kan vara förstärkta.')}</span><span><a href={selectedImage.sourceUrl} target="_blank" rel="noopener noreferrer">{t(lang, 'Image source', 'Bildkälla')}</a> · <a href={selectedImage.licenseUrl} target="_blank" rel="noopener noreferrer">{selectedImage.license}</a></span></figcaption></figure>}{selected.catalogNote && <p className="notice">{lang === 'sv' ? selected.catalogNoteSv ?? selected.catalogNote : selected.catalogNote}</p>}<div className="stat-grid"><div><small>{selectedAppearance ? t(lang, 'Distance from Earth', 'Avstånd från jorden') : t(lang, 'Distance', 'Avstånd')}</small><strong>{solarDistance ?? (lang === 'sv' ? selected.distanceSv ?? selected.distance : selected.distance)}</strong></div><div><small>{selectedAppearance ? t(lang, 'Estimated magnitude', 'Uppskattad magnitud') : `${t(lang, 'Apparent magnitude', 'Skenbar magnitud')}${selected.magnitudeBand ? ` (${selected.magnitudeBand})` : ''}`}</small><strong>{selectedAppearance ? formatNumber(selectedAppearance.magnitude, lang, 1) : lang === 'sv' ? selected.magnitudeSv ?? selected.magnitude : selected.magnitude}</strong></div><div><small>{t(lang, 'Constellation', 'Stjärnbild')}</small><strong>{selectedAppearance?.constellation ?? selected.constellation}</strong></div><div><small>{t(lang, 'Equipment', 'Utrustning')}</small><strong>{equipmentLabel(selected.gear, lang)}</strong></div>{selectedAppearance && <><div><small>{t(lang, 'Sun separation', 'Vinkelavstånd från solen')}</small><strong>{formatNumber(selectedAppearance.sunSeparation, lang, 1)}°</strong></div><div><small>{t(lang, 'Illuminated disk', 'Belyst skiva')}</small><strong>{Math.round(selectedAppearance.illuminatedFraction * 100)}%</strong></div></>}{selectedPosition && <><div><small>{t(lang, 'Altitude at selected time', 'Höjd vid vald tid')}</small><strong>{formatNumber(selectedPosition.altitude, lang, 1)}°</strong></div><div><small>{t(lang, 'Azimuth from north', 'Azimut från norr')}</small><strong>{formatNumber(selectedPosition.azimuth, lang, 1)}°</strong></div></>}</div>{selected.kind === 'Planet' && sun.altitude >= 0 && <p className="chart-note">{t(lang, 'This is a calculated daytime position, not confirmation that the planet is visible. Clear sky, altitude and viewing conditions matter.', 'Detta är en beräknad dagsposition, inte ett besked om att planeten syns. Klar himmel, höjd och siktförhållanden spelar roll.')}</p>}{selectedAppearance && <p className="chart-note">{t(lang, 'Values use the selected time. Distance, phase and Sun separation are measured from Earth’s center. Magnitude is a model without atmospheric dimming. 1 AU ≈ 149.6 million km.', 'Värdena gäller vald tid. Avstånd, fas och vinkelavstånd från solen räknas från jordens centrum. Magnituden är en modell utan atmosfärens dämpning. 1 AU ≈ 149,6 miljoner km.')}</p>}{selected.references && <div className="catalog-sources"><strong>{t(lang, 'Data sources', 'Datakällor')}</strong><ul>{selected.references.map(reference => <li key={reference.url}><a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.label}</a></li>)}</ul></div>}<div className="detail-chart-title"><h3>{t(lang, 'Altitude through the night', 'Höjd under natten')}</h3><small>{selected.position ? t(lang, 'CALCULATED', 'BERÄKNAD') : 'DEMO'}</small></div>{selected.kind === 'Satellite' ? <IssPassList language={lang} location={location} start={time} onShow={when => { setScrub(null); setTimeMode('fixed'); setTime(when); closePanel(); }} ready={issVersion > 0}/> : <VisibilityChart series={series.get(selected.id)!} large/>}<p className="chart-note">{selected.position ? t(lang, 'The window follows local sunset/sunrise with twilight margins; polar conditions use local noon to noon. Dark blue is astronomical darkness, lighter blue is twilight and purple is civil twilight. The dot marks the highest sampled altitude under the object’s darkness threshold, not the recommended time.', 'Tidsfönstret följer lokal solnedgång/soluppgång med skymningsmarginal; vid polarförhållanden används lokal middag till middag. Mörkblått är astronomiskt mörker, ljusare blått är skymning och lila är borgerlig skymning. Punkten markerar högsta beräknade höjd under objektets mörkergräns, inte rekommenderad tid.') : t(lang, 'Illustrative object curve only. Background twilight is calculated.', 'Endast illustrativ objektkurva. Bakgrundens skymning är beräknad.')}</p>{(() => { const entry = observationLog.entry(selected.id); return <section className="log-box" aria-label={titles.log}>{entry ? <><p className="log-seen"><CheckCircle2 size={18}/>{t(lang, 'Seen', 'Sett')} {DateTime.fromISO(entry.at).setZone(location.timeZone).setLocale(lang).toFormat('d LLL yyyy · HH:mm')}</p><textarea aria-label={t(lang, 'Note', 'Anteckning')} placeholder={t(lang, 'Add a note (optional)', 'Lägg till en anteckning (valfritt)')} defaultValue={entry.note} maxLength={500} onBlur={event => observationLog.setNote(selected.id, event.target.value)}/><button className="link-button" onClick={() => observationLog.remove(selected.id)}><Trash2 size={15}/>{t(lang, 'Remove from log', 'Ta bort ur loggen')}</button></> : <><textarea aria-label={t(lang, 'Note', 'Anteckning')} placeholder={t(lang, 'Note (optional), e.g. sky conditions or equipment', 'Anteckning (valfritt), t.ex. väder eller utrustning')} value={noteDraft} maxLength={500} onChange={event => setNoteDraft(event.target.value)}/><button className="wide-action" onClick={() => { observationLog.mark(selected.id, noteDraft); setNoteDraft(''); }}><CheckCircle2 size={18}/>{t(lang, 'Mark as seen', 'Markera som sett')}</button></>}</section>; })()}<div className="detail-actions">{selected.position && <button onClick={() => showInSky(selected)} disabled={!selectedPosition || selectedPosition.altitude < 0}><Crosshair size={17}/>{t(lang, 'Show in sky', 'Visa på himlen')}</button>}<button className="primary" disabled={!selected.position} onClick={() => startFinder(selected)}><LocateFixed size={17}/>{t(lang, 'Guided Finder', 'Objektguide')}</button><button aria-label={saved.includes(selected.id) ? t(lang, 'Remove bookmark', 'Ta bort bokmärke') : t(lang, 'Save object', 'Spara objekt')} title={saved.includes(selected.id) ? t(lang, 'Remove bookmark', 'Ta bort bokmärke') : t(lang, 'Save object', 'Spara objekt')} aria-pressed={saved.includes(selected.id)} onClick={() => toggleSaved(selected.id)}><Bookmark size={17} fill={saved.includes(selected.id) ? 'currentColor' : 'none'}/></button><button aria-label={t(lang, 'Share object', 'Dela objekt')} title={t(lang, 'Share object', 'Dela objekt')} onClick={() => share(selected)}><Share2 size={17}/></button></div>{!selected.position && <p className="chart-note">{t(lang, 'Choose an individual object for guidance. A whole constellation has no single target position.', 'Välj ett enskilt objekt för vägledning. En hel stjärnbild har ingen entydig målposition.')}</p>}</div>}
            {panel === 'tonight' && <button className="panel-action" onClick={() => { setTourSource('tonight'); openPanel('tour'); }}><Play size={17}/>{t(lang, 'Tour of tonight’s picks', 'Visning av kvällens förslag')}</button>}
            {panel === 'tonight' && <TonightPanel context={night} location={location} language={lang} gear={gear} onGearChange={setGear} ranked={ranked} renderCard={card} events={events} issPasses={nightPasses} issAgeDays={issVersion ? issElementAgeDays(time) : null} onShowPass={when => { setScrub(null); setTimeMode('fixed'); glideTime(when); pickObject(issObject); }} onShowTime={when => { setScrub(null); setTimeMode('fixed'); glideTime(when); closePanel(); }}/>}
      {panel === 'log' && <>{observationLog.log.length ? <><p className="panel-note">{t(lang, 'Objects you have marked as seen. Stored only on this device.', 'Objekt du har markerat som sedda. Sparas bara på den här enheten.')}</p><div className="object-list">{observationLog.log.map(entry => { const object = allObjects.find(item => item.id === entry.id); if (!object) return null; return <article className="object-row log-row" key={entry.id}><button className="row-main" onClick={() => { pickObject(object); openPanel('details'); }}><KindIcon className="card-icon" name={kindIconName(object)} size={24} color={object.color}/><span className="row-text"><strong>{display(object, lang)}</strong><small>{DateTime.fromISO(entry.at).setZone(location.timeZone).setLocale(lang).toFormat('d LLL yyyy · HH:mm')}{entry.note ? ` · ${entry.note}` : ''}</small></span></button></article>; })}</div></> : <div className="empty"><NotebookPen size={30}/><p>{t(lang, 'Nothing logged yet. Open an object’s details and choose Mark as seen.', 'Inget loggat ännu. Öppna ett objekts detaljer och välj Markera som sett.')}</p></div>}</>}
      {panel === 'tour' && <TourStart language={lang} source={tourSource} onSource={setTourSource} savedCount={allObjects.filter(object => saved.includes(object.id) && object.position).length} tonightCount={tourList('tonight').length} canPoint={canFollow} onStart={startTour}/>}
      {panel === 'saved' && <>{saved.length ? <><button className="panel-action" onClick={() => { setTourSource('saved'); openPanel('tour'); }}><Play size={17}/>{t(lang, 'Start a tour', 'Starta visning')}</button><button className="panel-action" onClick={shareSavedList}><Share2 size={17}/>{t(lang, 'Share list', 'Dela listan')}</button><div className="object-list">{allObjects.filter(object => saved.includes(object.id)).map(object => card(object))}</div></> : <div className="empty"><Bookmark size={30}/><p>{t(lang, 'Nothing saved yet', 'Inget sparat ännu')}</p><button className="primary" onClick={() => openPanel('search')}>{t(lang, 'Search objects', 'Sök objekt')}</button></div>}</>}
      {panel === 'shared' && <>{sharedList.length ? <><p className="panel-note">{t(lang, 'This shared list is read-only. Save the objects to add them to your own Saved list.', 'Den här delade listan är skrivskyddad. Spara objekten för att lägga till dem i din egen lista.')}</p><button className="panel-action" onClick={saveSharedList}><Bookmark size={17}/>{t(lang, 'Save all to my list', 'Spara alla i min lista')}</button><div className="object-list">{allObjects.filter(object => sharedList.includes(object.id)).map(object => card(object))}</div></> : <div className="empty"><p>{t(lang, 'This shared list is empty or invalid.', 'Den delade listan är tom eller ogiltig.')}</p><button className="primary" onClick={() => openPanel('search')}>{t(lang, 'Search objects', 'Sök objekt')}</button></div>}</>}
      {panel === 'more' && <div className="more-menu grouped">
        <h2 className="sheet-label">{t(lang, 'My objects', 'Mina objekt')}</h2>
        <div className="menu-list"><button onClick={() => openPanel('saved')}><Bookmark size={20}/><span className="menu-text">{titles.saved}</span>{saved.length > 0 && <span className="menu-value" aria-hidden="true">{saved.length}</span>}<ChevronRight size={17}/></button><button onClick={() => openPanel('log')}><NotebookPen size={20}/><span className="menu-text">{titles.log}</span>{observationLog.log.length > 0 && <span className="menu-value" aria-hidden="true">{observationLog.log.length}</span>}<ChevronRight size={17}/></button><button onClick={() => { setTourSource(saved.length ? 'saved' : 'tonight'); openPanel('tour'); }}><Play size={20}/><span className="menu-text">{titles.tour}<small>{t(lang, 'Guided tour or self-running demo', 'Guidad visning eller självgående demo')}</small></span><ChevronRight size={17}/></button></div>
        <h2 className="sheet-label">{t(lang, 'Settings', 'Inställningar')}</h2>
        <div className="menu-list">
          <div className="menu-row"><Globe2 size={20}/><span className="menu-text">{t(lang, 'Language', 'Språk')}</span><div className="segmented" role="group" aria-label={t(lang, 'Interface language', 'Gränssnittsspråk')}>{(['auto', 'sv', 'en'] as const).map(option => <button key={option} className={langPreference === option ? 'chosen' : ''} aria-pressed={langPreference === option} onClick={() => chooseLanguage(option)}>{option === 'auto' ? 'Auto' : option.toUpperCase()}</button>)}</div></div>
          <button role="switch" aria-checked={redMode} onClick={() => setRedMode(value => !value)}><Moon size={20}/><span className="menu-text">{t(lang, 'Red night mode', 'Rödfilter (nattläge)')}<small>{t(lang, 'Protects night vision. Also lower screen brightness.', 'Skyddar mörkerseendet. Sänk även skärmens ljusstyrka.')}</small></span><span className={`toggle ${redMode ? 'on' : ''}`} aria-hidden="true"/></button>
          {document.fullscreenEnabled && <button role="switch" aria-checked={isFullscreen} onClick={fullscreen}><Maximize size={20}/><span className="menu-text">{t(lang, 'Fullscreen', 'Helskärm')}</span><span className={`toggle ${isFullscreen ? 'on' : ''}`} aria-hidden="true"/></button>}
          {installApp.canPrompt && <button onClick={() => void installApp.install()}><Download size={20}/><span className="menu-text">{t(lang, 'Install the app', 'Installera appen')}<small>{t(lang, 'Works offline once installed.', 'Fungerar utan uppkoppling när den är installerad.')}</small></span><ChevronRight size={17}/></button>}
          {installApp.iosHint && <div className="menu-row"><Download size={20}/><span className="menu-text">{t(lang, 'Install the app', 'Installera appen')}<small>{t(lang, 'In Safari: Share → Add to Home Screen. Works offline afterwards.', 'I Safari: Dela → Lägg till på hemskärmen. Fungerar sedan utan uppkoppling.')}</small></span></div>}
        </div>
        <h2 className="sheet-label">{t(lang, 'Prototype · diagnostics', 'Prototyp · felsökning')}</h2>
        <div className="menu-list">{/* F-047: compass diagnostics only where phone following exists; Follow opens calibration itself when needed. */}{(canFollow || phone.active) && <button onClick={() => openPanel('phone')}><Smartphone size={20}/><span className="menu-text">{titles.phone}<small>{t(lang, 'Compass check and direction report', 'Kompasskontroll och riktningsrapport')}</small></span><ChevronRight size={17}/></button>}<button onClick={() => openPanel('performance')}><Gauge size={20}/><span className="menu-text">{titles.performance}</span><ChevronRight size={17}/></button></div>
        <div className="menu-list spaced"><button onClick={() => { setPanel(null); setIntro(true); }}><Star size={20}/><span className="menu-text">{t(lang, 'Show introduction', 'Visa introduktion')}</span><ChevronRight size={17}/></button><button onClick={() => openPanel('about')}><Info size={20}/><span className="menu-text">{titles.about}</span><ChevronRight size={17}/></button></div>
      </div>}
      {panel === 'performance' && <PerformancePanel comparison={skyFrames.comparison} comparisonReady={!phone.active && !['requesting', 'waiting', 'retrying'].includes(phone.status) && !gpsPending && (!showMilkyWay || Boolean(milkyWay.texture))} onCompare={startComparison} log={skyFrames.performance} language={lang} horizon={skyMode === 'horizon'} onStart={startPerformance}/>}
      {panel === 'phone' && <PhoneControls phone={phone} language={lang} onStart={follow}/>}
      {panel === 'view' && <>
        <div className="segmented wide" role="group" aria-label={t(lang, 'View', 'Vy')}><button className={skyMode === 'horizon' ? 'chosen' : ''} aria-pressed={skyMode === 'horizon'} onClick={() => setSkyMode('horizon')}>{t(lang, 'Look around', 'Se dig omkring')}</button><button className={skyMode === 'map' ? 'chosen' : ''} aria-pressed={skyMode === 'map'} onClick={() => setSkyMode('map')}>{t(lang, 'Sky map', 'Stjärnkarta')}</button></div>
        <h2 className="sheet-label">{t(lang, 'What the sky shows', 'Vad som syns på himlen')}</h2>
        <div className="segmented wide sky-level" role="group" aria-label={t(lang, 'What the sky shows', 'Vad som syns på himlen')}>{(['eye', 'binoculars', 'all'] as const).map(level => <button key={level} className={skyLevel === level ? 'chosen' : ''} aria-pressed={skyLevel === level} onClick={() => setSkyLevel(level)}>{level === 'eye' ? t(lang, 'Naked eye', 'Blotta ögat') : level === 'binoculars' ? t(lang, 'Binoculars', 'Kikare') : t(lang, 'Whole catalog', 'Hela katalogen')}</button>)}</div>
        <p className="panel-note sky-level-note">{skyLevel === 'eye' ? t(lang, 'Stars and objects that can be seen without optical aid under a dark sky. The whole solar system is always shown.', 'Stjärnor och objekt som kan ses utan hjälpmedel under mörk himmel. Hela solsystemet visas alltid.') : skyLevel === 'binoculars' ? t(lang, 'Adds objects for binoculars. Zoom in to see fainter stars (Look around view).', 'Lägger till objekt för kikare. Zooma in för att se svagare stjärnor (vyn Se dig omkring).') : t(lang, 'Everything the app knows, including telescope objects and provisional candidates. Zoom in for fainter stars.', 'Allt appen känner till, även objekt som kräver teleskop och preliminära kandidater. Zooma in för svagare stjärnor.')}</p>
        <div className="sky-groups" role="group" aria-label={t(lang, 'Object groups', 'Objektgrupper')}>{(['galaxies', 'clusters', 'nebulae', ...(skyLevel === 'all' ? ['candidates'] as const : [])] as SkyGroup[]).map(group => <button key={group} className={'category ' + (skyGroups[group] ? 'selected' : '')} aria-pressed={skyGroups[group]} onClick={() => setSkyGroups(current => ({...current, [group]: !current[group]}))}><KindIcon name={group === 'galaxies' ? 'galaxy' : group === 'clusters' ? 'open' : group === 'nebulae' ? 'nebula' : 'candidate'} size={18}/>{group === 'galaxies' ? t(lang, 'Galaxies', 'Galaxer') : group === 'clusters' ? t(lang, 'Star clusters', 'Stjärnhopar') : group === 'nebulae' ? t(lang, 'Nebulae', 'Nebulosor') : t(lang, `Candidates (${candidateObjects.length})`, `Kandidater (${candidateObjects.length})`)}</button>)}</div>
        <h2 className="sheet-label">{t(lang, 'Layers', 'Lager')}</h2>
        <div className="layer-tiles">
          <button aria-pressed={showFigures} onClick={() => setShowFigures(value => !value)}><KindIcon name="constellation" size={26}/>{t(lang, 'Constellations', 'Stjärnbilder')}</button>
          <button aria-pressed={showFigures && showFigureNames} disabled={!showFigures} onClick={() => setShowFigureNames(value => !value)}><Type size={24}/>{t(lang, 'Names', 'Namn')}</button>
          <button aria-pressed={showBoundaries} onClick={() => setShowBoundaries(value => !value)}><SquareDashed size={24}/>{t(lang, 'Boundaries', 'Gränser')}</button>
          <button aria-pressed={showMilkyWay} onClick={() => setShowMilkyWay(value => !value)}><Sparkles size={24}/>{t(lang, 'Milky Way', 'Vintergatan')}</button>
          <button aria-pressed={showArt} onClick={() => setShowArt(value => !value)}><Brush size={24}/>{t(lang, 'Drawings', 'Teckningar')}</button>
          <button aria-pressed={showGrid} onClick={() => setShowGrid(value => !value)}><Grid2X2 size={24}/>{t(lang, 'Grid', 'Rutnät')}</button>
          <button aria-pressed={showEcliptic} onClick={() => setShowEcliptic(value => !value)}><Orbit size={24}/>{t(lang, 'Planets’ path', 'Planeternas väg')}</button>
          <button className="red-tile" aria-pressed={redMode} onClick={() => setRedMode(value => !value)}><Moon size={24}/>{t(lang, 'Red mode', 'Rödfilter')}</button>
        </div>
        {milkyWay.failed && <p className="notice">{t(lang, 'The Milky Way layer could not load. Toggle it off and on to retry.', 'Vintergatan kunde inte laddas. Slå av och på lagret för att försöka igen.')}</p>}
        <h2 className="sheet-label">{t(lang, 'Constellations', 'Stjärnbilder')}</h2>
        <div className="segmented wide" role="group" aria-label={t(lang, 'Constellation selection', 'Urval av stjärnbilder')}><button disabled={!showFigures} aria-pressed={figureMode === 'common'} className={figureMode === 'common' ? 'chosen' : ''} onClick={() => setFigureMode('common')}>{t(lang, 'Common', 'Vanliga')} ({commonConstellationIds.size})</button><button disabled={!showFigures} aria-pressed={figureMode === 'all'} className={figureMode === 'all' ? 'chosen' : ''} onClick={() => setFigureMode('all')}>{t(lang, 'All', 'Alla')} (88)</button></div>
        <details className="layer-help"><summary><Info size={16}/>{t(lang, 'What do the lines mean?', 'Vad betyder linjerna?')}</summary><p className="panel-note">{t(lang, 'Common shows a selection of familiar constellations from both hemispheres. The IAU boundary layer always covers all 88.', 'Vanliga visar ett urval välkända stjärnbilder från båda halvkloten. IAU-gränslagret omfattar alltid alla 88.')}</p> <p className="panel-note">{t(lang, 'Dashed purple lines mark the official constellation areas. Blue figures are schematic star patterns. Both fade in daylight.', 'Lila streckade linjer avgränsar de officiella stjärnbildsområdena. Blå figurer är schematiska stjärnmönster. Båda tonas bort i dagsljus.')}</p>
        
        </details>

      </>}
      {panel === 'about' && <div className="about-copy"><p>{t(lang, 'The star map uses catalog positions and calculated geometry, with stylized brightness. Constellation altitude curves remain demos. Twilight and solar-system positions use real calculations.', 'Stjärnkartan använder katalogpositioner och beräknad geometri, med stiliserad ljusstyrka. Stjärnbildernas höjdkurvor är fortfarande demo. Skymning och solsystemets positioner beräknas.')}</p><p>{t(lang, 'Milky Way brightness is stylized from catalog contours. Looking down fades the ground to reveal a simulated sky below the horizon; those objects are not visible through the Earth.', 'Vintergatans ljusstyrka är stiliserad från katalogkonturer. När du tittar ned tonas marken bort och en simulerad himmel under horisonten visas; dessa objekt syns inte genom jorden.')}</p><p>{t(lang, 'Noxari · a calculated sky for your selected location and time.', 'Noxari · en beräknad himmel för vald plats och tid.')}</p><p>{t(lang, 'Markers show positions, not guaranteed visibility. Brightness is stylized. Terrain, weather, atmospheric refraction and light pollution are not included.', 'Markörer visar positioner, inte garanterad synlighet. Ljusstyrkan är stiliserad. Terräng, väder, atmosfärisk refraktion och ljusföroreningar ingår inte.')}</p><p>{t(lang, 'Sun altitude', 'Solens höjd')}: {formatNumber(sun.altitude, lang, 1)}°</p>
<div className="sky-credit">{t(lang, 'Object photos', 'Objektfoton')}: <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> {t(lang, 'files (NASA, ESA/Hubble, ESO, NOIRLab and others). Each photo’s creator, source and license (public domain, CC0, CC BY or CC BY-SA) is shown with the object; resized and re-encoded for the app.', '(NASA, ESA/Hubble, ESO, NOIRLab m.fl.). Varje fotos fotograf, källa och licens (public domain, CC0, CC BY eller CC BY-SA) visas vid objektet; bilderna är förminskade och omkodade för appen.')}</div><div className="sky-credit">{t(lang, 'Star catalog', 'Stjärnkatalog')}: <a href="https://github.com/astronexus/HYG-Database" target="_blank" rel="noopener noreferrer">HYG v4.1</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a> · {t(lang, 'Figures & boundaries', 'Figurer och gränser')}: <a href="https://github.com/Stellarium/stellarium/tree/daace2add6a1bf886e8ee1934f51e9c69f818d18/skycultures/modern" target="_blank" rel="noopener noreferrer">Stellarium team</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. {t(lang, 'Figures are schematic guides. Optional IAU boundaries use the same licensed Stellarium data, with B1875 edges from ', 'Figurerna är schematiska hjälplinjer. Valbara IAU-gränser använder samma licensierade Stellariumdata, med B1875-segment från ')}<a href="https://pbarbier.com/constellations/edges_18.txt" target="_blank" rel="noopener noreferrer">Pierre Barbier</a>.</div><div className="sky-credit">{t(lang, 'Constellation drawings', 'Stjärnbildsteckningar')}: <a href="https://github.com/Stellarium/stellarium/tree/daace2add6a1bf886e8ee1934f51e9c69f818d18/skycultures/modern" target="_blank" rel="noopener noreferrer">Stellarium team</a> · <a href="https://artlibre.org/licence/lal/en/" target="_blank" rel="noopener noreferrer">Free Art License 1.3</a> · <a href={`${import.meta.env.BASE_URL}licenses/constellation-art-NOTICE.txt`} target="_blank" rel="noopener noreferrer">{t(lang, 'notice', 'information')}</a>. {t(lang, 'Recolored for Noxari; the recolored images are shared under the same license.', 'Omfärgade för Noxari; de omfärgade bilderna delas under samma licens.')} {t(lang, 'Cloud forecast (opt-in, place rounded to ~10 km)', 'Molnprognos (frivillig, plats avrundad till ca 10 km)')}: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. {t(lang, 'ISS orbital elements', 'ISS-banelement')}: <a href="https://celestrak.org/NORAD/elements/" target="_blank" rel="noopener noreferrer">CelesTrak</a> {t(lang, '(refreshed about once a day; no location is sent)', '(uppdateras ungefär en gång per dygn; ingen plats skickas)')}, {t(lang, 'propagated with', 'beräknade med')} <a href="https://github.com/shashwatak/satellite-js" target="_blank" rel="noopener noreferrer">satellite.js</a> (MIT). {t(lang, 'Events: Astronomy Engine; meteor shower dates are approximate (IMO calendar).', 'Händelser: Astronomy Engine; meteorskurarnas datum är ungefärliga (IMO:s kalender).')} {t(lang, 'Star names and distances', 'Stjärnnamn och avstånd')}: <a href="https://github.com/astronexus/HYG-Database" target="_blank" rel="noopener noreferrer">HYG v4.1</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a> ({t(lang, 'names per the IAU WGSN list', 'namn enligt IAU:s WGSN-lista')}).</div><div className="sky-credit">{t(lang, 'Milky Way', 'Vintergatan')}: <a href="https://www.eso.org/public/images/eso0932a/" target="_blank" rel="noopener noreferrer">ESO/S. Brunier</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. {t(lang, 'Panorama reprojected to J2000, stars removed (the app draws its own) and brightness adjusted.', 'Panoramat omprojicerat till J2000, stjärnor borttagna (appen ritar egna) och ljusstyrkan justerad.')}</div><div className="sky-credit">{t(lang, 'Messier catalog', 'Messierkatalog')}: <a href="https://github.com/mattiaverga/OpenNGC" target="_blank" rel="noopener noreferrer">OpenNGC · Mattia Verga</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. {t(lang, 'Adapted types, aliases, Swedish names and equipment guidance; M102 follows NGC 5866 with a dispute note. Approximate distance facts: ', 'Bearbetade typer, alias, svenska namn och utrustningsråd; M102 följer NGC 5866 med en förklaring om tvisten. Ungefärliga avstånd: ')}<a href="https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/" target="_blank" rel="noopener noreferrer">NASA/Hubble</a>.</div></div>}
    </SkyPanel>}
    <SurfaceComparisonCapture comparison={skyFrames.comparison} language={lang} onReview={reviewPerformance} visible={!panel && diagnosticMode === 'comparison'}/>
    <PerformanceCapture visible={!panel && diagnosticMode === 'ordinary'} log={skyFrames.performance} language={lang} onReview={reviewPerformance}/>
    {toast && <div className="toast" role="status"><Check size={16}/>{toast}</div>}
    {intro && <IntroCard language={lang} canFollow={canFollow} onClose={closeIntro}/>}
  </div>;
}

registerServiceWorker();
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
