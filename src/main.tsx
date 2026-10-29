import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Search, Star, Compass, Bookmark, Settings2, MapPin, Clock3, ChevronRight, Share2, X, Eye, LocateFixed, Globe2, Info, Check, MoreHorizontal, SlidersHorizontal, Maximize, Minimize} from 'lucide-react';
import {objects, zodiac, type SpaceObject, type Gear} from './data';
import {clockTime, localDateTimeValue, nightContext, nightWindow, nightCatalog, objectPosition, positionAt, solarAppearance, selectedLocalTime, stockholm, type ObservingLocation} from './astronomy';
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
import {catalogIdentifier, matchesCatalogQuery} from './catalogSearch';
import './style.css';
import './workspace.css';

type Panel = 'search'|'tonight'|'saved'|'observation'|'view'|'settings'|'about'|'more'|'details'|'phone';
type Lang = 'en'|'sv';
const t = (lang: Lang, en: string, sv: string) => lang === 'sv' ? sv : en;
const display = (object: SpaceObject, lang: Lang) => lang === 'sv' ? object.sv : object.en;
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
  const [panel, setPanel] = useState<Panel | null>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const appRoot = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lang, setLang] = useState<Lang>(() => localStorage.getItem('noxari-lang') === 'sv' ? 'sv' : 'en');
  const [saved, setSaved] = useState<string[]>(() => {
    try { const value = JSON.parse(localStorage.getItem('noxari-saved') || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  });
  const [selected, setSelected] = useState<SpaceObject|null>(null);
  const [search, setSearch] = useState('');
  const [gear, setGear] = useState<'all'|Gear>('all');
  const [category, setCategory] = useState('All');
  const [time, setTime] = useState(() => new Date());
  const [timeMode, setTimeMode] = useState<'live' | 'fixed'>('live');
  const [location, setLocation] = useState<ObservingLocation>(initialLocation);
  const [latitudeInput, setLatitudeInput] = useState(String(initialLocation.latitude));
  const [longitudeInput, setLongitudeInput] = useState(String(initialLocation.longitude));
  const [timeZoneInput, setTimeZoneInput] = useState(initialLocation.timeZone);
  const [toast, setToast] = useState('');
  const [finderTarget, setFinderTarget] = useState<SpaceObject | null>(null);
  const [showFigures, setShowFigures] = useState(true);
  const [showFigureNames, setShowFigureNames] = useState(true);
  const [skyMode, setSkyMode] = useState<'horizon' | 'map'>('horizon');
  const [viewDirection, setViewDirection] = useState<ViewDirection>(() => ({heading: 180, pitch: Math.atan(.6 * innerHeight / Math.max(innerWidth, innerHeight)) * 180 / Math.PI}));
  const phone = usePhoneOrientation(skyMode === 'horizon' && panel === null, setViewDirection);
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
  useEffect(() => { localStorage.setItem('noxari-lang', lang); document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { localStorage.setItem('noxari-location', JSON.stringify(location)); }, [location]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('object');
    const object = objects.find(item => item.id === (id ? catalogIdentifier(id) ?? id.toLowerCase() : id));
    if (object) { setSelected(object); setPanel('details'); }
  }, []);

  const windowDescriptor = useMemo(() => nightWindow(time, location), [time, location]);
  const nightKey = `${windowDescriptor.start.getTime()}/${windowDescriptor.end.getTime()}`;
  const night = useMemo(() => nightContext(time, location), [nightKey, location]);
  const series = useMemo(() => nightCatalog(objects, night.window.start, location, night), [location, night]);
  const ranked = useMemo(() => rankTonight(objects, series, gear, time), [series, gear, time]);
  const sun = useMemo(() => positionAt(Body.Sun, time, location), [time, location]);
  const selectedAppearance = useMemo(() => selected ? solarAppearance(selected, time) : null, [selected, time]);
  const solarDistance = selectedAppearance ? selected?.kind === 'Moon' ? `${Math.round(selectedAppearance.distanceAu * 149597870.7).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB')} km` : `${selectedAppearance.distanceAu.toFixed(3)} AU` : null;
  const selectedPosition = selected ? objectPosition(selected, time, location) : null;
  const filtered = useMemo(() => objects.filter(object => {
    const matches = matchesCatalogQuery(object, search);
    return matches && (category === 'All' || object.kind === category);
  }), [search, category]);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const toggleSaved = (id: string) => setSaved(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const pickObject = (object: SpaceObject) => {
    setSelected(object); setFinderTarget(null); setPanel(null); phone.pause();
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.object-preview button')?.focus({preventScroll: true}));
  };
  const openPanel = (next: Panel) => { phone.pause(); setPanel(next); };
  const closePanel = () => setPanel(null);
  const manualView: React.Dispatch<React.SetStateAction<ViewDirection>> = next => { phone.pause(); setViewDirection(next); };
  const follow = () => { setSkyMode('horizon'); setPanel(null); void phone.start(); };
  const centerTarget = () => {
    const position = finderTarget && objectPosition(finderTarget, time, location);
    if (position && position.altitude >= 0) manualView({heading: position.azimuth, pitch: Math.min(89.9, position.altitude)});
    closePanel();
  };
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
    const preset = presets.find(item => item.name === name);
    if (!preset) return;
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
      setLatitudeInput(String(latitude)); setLongitudeInput(String(longitude)); setTimeZoneInput(timeZone);
      setGpsMessage(t(lang, `Location updated, reported accuracy ±${Math.round(accuracy)} m. Using device timezone: ${timeZone}.`, `Plats uppdaterad, rapporterad noggrannhet ±${Math.round(accuracy)} m. Använder enhetens tidszon: ${timeZone}.`));
    }, error => {
      if (token !== gpsRequest.current) return;
      setGpsPending(false);
      setGpsMessage(error.code === 1 ? t(lang, 'Location access denied. Allow it in browser settings or enter coordinates manually.', 'Platsåtkomst nekades. Tillåt den i webbläsarens inställningar eller ange koordinater manuellt.') : error.code === 3 ? t(lang, 'Location timed out. Try again outdoors or enter coordinates manually.', 'Platsförfrågan tog för lång tid. Försök utomhus eller ange koordinater manuellt.') : t(lang, 'Location is unavailable. Try again or enter coordinates manually.', 'Platsen är inte tillgänglig. Försök igen eller ange koordinater manuellt.'));
    }, {enableHighAccuracy: true, timeout: 15000, maximumAge: 60000});
  };
  async function share(object: SpaceObject) {
    const url = new URL(window.location.href);
    url.searchParams.set('object', object.id);
    const title = `${object.en} — Noxari`;
    try {
      if (navigator.share) await navigator.share({title, url: url.toString()});
      else { await navigator.clipboard.writeText(url.toString()); notify(t(lang, 'Link copied', 'Länk kopierad')); }
    } catch { notify(t(lang, 'Sharing cancelled or unavailable', 'Delning avbruten eller ej tillgänglig')); }
  }

  const card = (object: SpaceObject, suggestion?: ReturnType<typeof recommend>) => {
    const visibility = series.get(object.id)!;
    const peak = peakSample(visibility);
    return <article className="object-card" key={object.id}>
      <button className="card-main" onClick={() => pickObject(object)}>
        <div className="card-top"><span className="object-dot" style={{background: object.color}}/><div className="card-title"><strong>{display(object, lang)}</strong><small>{object.id.toUpperCase()} · {object.kind}</small></div><ChevronRight size={17}/></div>
        <VisibilityChart series={visibility}/>
        {suggestion && <SuggestionSummary suggestion={suggestion} language={lang} timeZone={location.timeZone}/>}
        <div className="card-foot"><span><Eye size={13}/>{visibility.real ? t(lang, 'Calculated altitude', 'Beräknad höjd') : t(lang, 'DEMO curve', 'DEMO-kurva')}</span><span>{visibility.real ? peak ? `${t(lang, 'Highest', 'Högst')} ${clockTime(peak.time, location.timeZone)}` : t(lang, 'No peak in suitable darkness', 'Ingen topp i lämpligt mörker') : t(lang, 'Illustrative only', 'Endast illustration')}</span></div>
      </button>
      <button className={'save-btn ' + (saved.includes(object.id) ? 'active' : '')} aria-label={saved.includes(object.id) ? 'Remove bookmark' : 'Bookmark'} onClick={() => toggleSaved(object.id)}><Bookmark size={17} fill={saved.includes(object.id) ? 'currentColor' : 'none'}/></button>
    </article>;
  };

  const titles: Record<Panel, string> = {
    search: t(lang, 'Search objects', 'Sök objekt'), tonight: t(lang, 'Tonight', 'Ikväll'), saved: t(lang, 'Saved objects', 'Sparade objekt'),
    observation: t(lang, 'Time & location', 'Tid och plats'), view: t(lang, 'Sky display', 'Himmelsvy'), settings: t(lang, 'Settings', 'Inställningar'),
    about: t(lang, 'About & sources', 'Om och källor'), more: t(lang, 'More', 'Mer'), details: selected ? display(selected, lang) : t(lang, 'Details', 'Detaljer'), phone: t(lang, 'Phone direction', 'Telefonriktning'),
  };
  const phoneLabel = phone.status === 'tracking' ? t(lang, 'Following', 'Följer') : phone.status === 'paused' ? t(lang, 'Paused', 'Pausad') : phone.status === 'align' ? t(lang, 'Align north', 'Kalibrera') : ['waiting', 'requesting'].includes(phone.status) ? t(lang, 'Waiting', 'Väntar') : t(lang, 'Manual', 'Manuell');
  const stamp = timeMode === 'live' ? `${t(lang, 'Now', 'Nu')} · ${clockTime(time, location.timeZone)}` : `${t(lang, 'Selected time', 'Vald tid')} · ${DateTime.fromJSDate(time, {zone: location.timeZone}).setLocale(lang).toFormat('dd LLL HH:mm')}`;
  const needsPhoneHelp = ['requesting', 'waiting', 'align', 'denied', 'unavailable', 'missing'].includes(phone.status);
  return <div className="app sky-app" ref={appRoot}>
    <div className="sky-workspace" ref={workspace}>
      <main className="sky-stage" aria-label={t(lang, 'Sky', 'Himlen')}>
        {skyMode === 'horizon' ? <HorizonView finderTarget={finderTarget} phone={phone} onFinderDetails={() => { if (finderTarget) { setSelected(finderTarget); openPanel('details'); } }} onStopFinder={() => { setFinderTarget(null); phone.pause(); }} showFigures={showFigures} showFigureNames={showFigureNames} time={time} location={location} label={object => display(object, lang)} sunLabel={t(lang, 'Sun', 'Solen')} onSelect={pickObject} language={lang} view={viewDirection} onViewChange={manualView}/> : <SkyMap showFigures={showFigures} showFigureNames={showFigureNames} time={time} location={location} label={object => display(object, lang)} sunLabel={t(lang, 'Sun', 'Solen')} onSelect={pickObject}/>}
      </main>
      <header className="sky-statusbar">
        <button className={`observation-chip ${timeMode}`} onClick={() => openPanel('observation')} aria-label={t(lang, 'Time & location', 'Tid och plats')}><MapPin size={15}/><span><strong>{location.name}</strong><small>{stamp}</small></span></button>
        <button className={`direction-chip ${phone.status}`} onClick={() => openPanel('phone')}><Compass size={16}/>{phoneLabel}</button>
      </header>
      <nav className="quick-tools" aria-label={t(lang, 'Quick actions', 'Snabbknappar')}>
        <button data-default-focus onClick={() => openPanel('search')} aria-haspopup="dialog"><Search size={21}/><span>{t(lang, 'Search', 'Sök')}</span></button>
        <button onClick={() => openPanel('tonight')} aria-haspopup="dialog"><Star size={21}/><span>{t(lang, 'Tonight', 'Ikväll')}</span></button>
        <button className={phone.active ? 'active' : ''} aria-pressed={phone.active} onClick={phone.active ? phone.stop : follow}><Compass size={21}/><span>{phone.active ? t(lang, 'Stop', 'Stoppa') : phone.status === 'paused' ? t(lang, 'Resume', 'Återuppta') : t(lang, 'Follow', 'Följ')}</span></button>
        <button onClick={() => openPanel('more')} aria-haspopup="dialog"><MoreHorizontal size={22}/><span>{t(lang, 'More', 'Mer')}</span></button>
      </nav>
      {needsPhoneHelp && <div className="phone-notice" role="status"><span>{phone.needsAlignment ? t(lang, 'Point true north and calibrate.', 'Rikta mot geografisk nord och kalibrera.') : phone.status === 'waiting' || phone.status === 'requesting' ? t(lang, 'Waiting for phone direction…', 'Väntar på telefonriktning…') : t(lang, 'Phone direction is unavailable. Manual control works.', 'Telefonriktning är inte tillgänglig. Manuell styrning fungerar.')}</span><button onClick={() => openPanel('phone')}>{t(lang, 'Controls', 'Kontroller')}</button></div>}
      {selected && (!finderTarget || skyMode === 'map') && <section className="object-preview" aria-label={t(lang, 'Selected object', 'Valt objekt')}><div><span className="object-dot" style={{background: selected.color}}/><strong>{display(selected, lang)}</strong><button className="preview-close" onClick={() => { setSelected(null); setFinderTarget(null); phone.pause(); }} aria-label={t(lang, 'Clear object', 'Avmarkera objekt')}><X size={18}/></button></div><div className="preview-actions"><button className="primary" disabled={!selected.position} onClick={() => startFinder(selected)}><LocateFixed size={16}/>{t(lang, 'Guide', 'Guida')}</button><button onClick={() => openPanel('details')}>{t(lang, 'Details', 'Detaljer')}</button><button aria-label={t(lang, 'Save object', 'Spara objekt')} onClick={() => toggleSaved(selected.id)}><Bookmark size={16} fill={saved.includes(selected.id) ? 'currentColor' : 'none'}/></button></div></section>}
    </div>
    {panel && <SkyPanel closeLabel={t(lang, 'Close panel', 'Stäng panel')} key={panel} name={panel} title={titles[panel]} onClose={closePanel}>
      {panel === 'observation' && <>      <section className="observation-controls" aria-label="Observation settings">
        <label><span><Clock3 size={15}/>{t(lang, 'Date and time', 'Datum och tid')}</span><input type="datetime-local" value={localDateTimeValue(time, location.timeZone)} onChange={event => { const next = selectedLocalTime(event.target.value, location.timeZone); if (next) { setTimeMode('fixed'); setTime(next); } else if (event.target.value) notify(t(lang, 'This local time does not exist in the selected timezone.', 'Denna lokala tid finns inte i den valda tidszonen.')); }}/></label>
        <button className="control-button" onClick={() => { setTimeMode('live'); setTime(new Date()); }}>{t(lang, 'Now', 'Nu')}</button>
        <label><span><MapPin size={15}/>{t(lang, 'Location', 'Plats')}</span><select aria-label={t(lang, 'Location', 'Plats')} value={presets.some(item => item.name === location.name) ? location.name : 'Custom'} onChange={event => selectPreset(event.target.value)}>{presets.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}<option value="Custom">{t(lang, 'Custom coordinates', 'Egna koordinater')}</option></select></label>
        <label className="coordinate"><span>{t(lang, 'Latitude', 'Latitud')}</span><input aria-label="Latitude" type="number" min="-90" max="90" step="any" value={latitudeInput} onChange={event => setLatitudeInput(event.target.value)}/></label>
        <label className="coordinate"><span>{t(lang, 'Longitude', 'Longitud')}</span><input aria-label="Longitude" type="number" min="-180" max="180" step="any" value={longitudeInput} onChange={event => setLongitudeInput(event.target.value)}/></label>
        <label className="timezone"><span>{t(lang, 'Timezone', 'Tidszon')}</span><input aria-label="Timezone" type="text" value={timeZoneInput} onChange={event => setTimeZoneInput(event.target.value)}/></label>
        <button className="control-button" onClick={useGps} disabled={gpsPending}>{gpsPending ? t(lang, 'Locating…', 'Hämtar plats…') : t(lang, 'Use my location', 'Använd min plats')}</button>
        <button className="control-button" onClick={applyCoordinates}>{t(lang, 'Apply', 'Använd')}</button>
        {gpsMessage && <p className="gps-status" role="status">{gpsMessage}</p>}
        <p>{t(lang, 'Times use the selected observation timezone (IANA name). Coordinates use north/east as positive. Altitudes are geometric; local terrain and weather are not included. Coordinates are saved only in this browser.', 'Tider använder vald observationsplats tidszon (IANA-namn). Nord/öst är positiva koordinater. Höjderna är geometriska; lokal horisont och väder ingår inte. Koordinater sparas bara i denna webbläsare.')}</p>
      </section></>}
      {panel === 'search' && <><div className="search-box"><Search size={20}/><input placeholder={t(lang, 'Search by name, catalog ID or constellation…', 'Sök namn, katalog-ID eller stjärnbild…')} value={search} onChange={event => setSearch(event.target.value)}/>{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={17}/></button>}</div><div className="category-scroll">{['All', 'Galaxy', 'Nebula', 'Star cluster', 'Planet', 'Moon', 'Star', 'Double star', 'Asterism', 'Star cloud', 'Constellation'].map(item => <button className={'category ' + (category === item ? 'selected' : '')} key={item} onClick={() => setCategory(item)}>{item === 'All' ? t(lang, 'All objects', 'Alla objekt') : item}</button>)}</div><p className="results-count">{filtered.length} {t(lang, 'objects', 'objekt')}</p><div className="cards-grid">{filtered.map(object => card(object))}</div><section className="zodiac"><h2>{t(lang, 'Constellation names', 'Stjärnbildsnamn')}</h2><p>{t(lang, 'The 12 classical zodiac constellations (name reference)', 'De 12 klassiska zodiakstjärnbilderna (namnreferens)')}</p><div className="zodiac-grid">{zodiac.map(([en, sv]) => <span key={en}>{lang === 'sv' ? sv : en}</span>)}</div></section></>}
      {panel === 'details' && selected && <div className="detail-body"><p className="description">{lang === 'sv' ? selected.descriptionSv : selected.description}</p>{selected.catalogNote && <p className="notice">{lang === 'sv' ? selected.catalogNoteSv ?? selected.catalogNote : selected.catalogNote}</p>}<div className="stat-grid"><div><small>{selectedAppearance ? t(lang, 'Distance from Earth', 'Avstånd från jorden') : t(lang, 'Distance', 'Avstånd')}</small><strong>{solarDistance ?? (lang === 'sv' ? selected.distanceSv ?? selected.distance : selected.distance)}</strong></div><div><small>{selectedAppearance ? t(lang, 'Estimated magnitude', 'Uppskattad magnitud') : `${t(lang, 'Apparent magnitude', 'Skenbar magnitud')}${selected.magnitudeBand ? ` (${selected.magnitudeBand})` : ''}`}</small><strong>{selectedAppearance ? selectedAppearance.magnitude.toFixed(1) : lang === 'sv' ? selected.magnitudeSv ?? selected.magnitude : selected.magnitude}</strong></div><div><small>{t(lang, 'Constellation', 'Stjärnbild')}</small><strong>{selectedAppearance?.constellation ?? selected.constellation}</strong></div><div><small>{t(lang, 'Equipment', 'Utrustning')}</small><strong>{equipmentLabel(selected.gear, lang)}</strong></div>{selectedAppearance && <><div><small>{t(lang, 'Sun separation', 'Vinkelavstånd från solen')}</small><strong>{selectedAppearance.sunSeparation.toFixed(1)}°</strong></div><div><small>{t(lang, 'Illuminated disk', 'Belyst skiva')}</small><strong>{Math.round(selectedAppearance.illuminatedFraction * 100)}%</strong></div></>}{selectedPosition && <><div><small>{t(lang, 'Altitude at selected time', 'Höjd vid vald tid')}</small><strong>{selectedPosition.altitude.toFixed(1)}°</strong></div><div><small>{t(lang, 'Azimuth from north', 'Azimut från norr')}</small><strong>{selectedPosition.azimuth.toFixed(1)}°</strong></div></>}</div>{selectedAppearance && <p className="chart-note">{t(lang, 'Values use the selected time. Distance, phase and Sun separation are measured from Earth’s center. Magnitude is a model without atmospheric dimming. 1 AU ≈ 149.6 million km.', 'Värdena gäller vald tid. Avstånd, fas och vinkelavstånd från solen räknas från jordens centrum. Magnituden är en modell utan atmosfärens dämpning. 1 AU ≈ 149,6 miljoner km.')}</p>}{selected.references && <div className="catalog-sources"><strong>{t(lang, 'Data sources', 'Datakällor')}</strong><ul>{selected.references.map(reference => <li key={reference.url}><a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.label}</a></li>)}</ul></div>}<div className="detail-chart-title"><h3>{t(lang, 'Altitude through the night', 'Höjd under natten')}</h3><small>{selected.position ? t(lang, 'CALCULATED', 'BERÄKNAD') : 'DEMO'}</small></div><VisibilityChart series={series.get(selected.id)!} large/><p className="chart-note">{selected.position ? t(lang, 'The window follows local sunset/sunrise with twilight margins; polar conditions use local noon to noon. Dark blue is astronomical darkness, lighter blue is twilight and purple is civil twilight. The dot marks the highest sampled altitude under the object’s darkness threshold, not the recommended time.', 'Tidsfönstret följer lokal solnedgång/soluppgång med skymningsmarginal; vid polarförhållanden används lokal middag till middag. Mörkblått är astronomiskt mörker, ljusare blått är skymning och lila är borgerlig skymning. Punkten markerar högsta beräknade höjd under objektets mörkergräns, inte rekommenderad tid.') : t(lang, 'Illustrative object curve only. Background twilight is calculated.', 'Endast illustrativ objektkurva. Bakgrundens skymning är beräknad.')}</p><div className="detail-actions">{finderTarget?.id === selected.id && <button onClick={centerTarget} disabled={!selectedPosition || selectedPosition.altitude < 0}>{t(lang, 'Center manual view', 'Centrera manuell vy')}</button>}<button className="primary" disabled={!selected.position} onClick={() => startFinder(selected)}><LocateFixed size={17}/>{t(lang, 'Guided Finder', 'Guided Finder')}</button><button onClick={() => toggleSaved(selected.id)}><Bookmark size={17} fill={saved.includes(selected.id) ? 'currentColor' : 'none'}/>{saved.includes(selected.id) ? t(lang, 'Saved', 'Sparad') : t(lang, 'Save', 'Spara')}</button><button onClick={() => share(selected)}><Share2 size={17}/>{t(lang, 'Share', 'Dela')}</button></div>{!selected.position && <p className="chart-note">{t(lang, 'Choose an individual object for guidance. A whole constellation has no single target position.', 'Välj ett enskilt objekt för vägledning. En hel stjärnbild har ingen entydig målposition.')}</p>}</div>}
      {panel === 'settings' && <><div className="setting-row"><div><Globe2 size={19}/><strong>{t(lang, 'Object names', 'Objektnamn')}</strong><small>{t(lang, 'Choose English or Swedish names', 'Välj engelska eller svenska namn')}</small></div><div className="segmented"><button className={lang === 'en' ? 'chosen' : ''} onClick={() => setLang('en')}>EN</button><button className={lang === 'sv' ? 'chosen' : ''} onClick={() => setLang('sv')}>SV</button></div></div><p className="settings-note">{t(lang, 'The star map uses catalog positions and calculated geometry, with stylized brightness. Constellation altitude curves remain demos. Twilight and solar-system positions use real calculations.', 'Stjärnkartan använder katalogpositioner och beräknad geometri, med stiliserad ljusstyrka. Stjärnbildernas höjdkurvor är fortfarande demo. Skymning och solsystemets positioner beräknas.')}</p></>}
      {panel === 'tonight' && <TonightPanel context={night} location={location} language={lang} gear={gear} onGearChange={setGear} ranked={ranked} renderCard={card}/>}
      {panel === 'saved' && <>{saved.length ? <div className="cards-grid">{objects.filter(object => saved.includes(object.id)).map(object => card(object))}</div> : <div className="empty"><Bookmark size={30}/><p>{t(lang, 'Nothing saved yet', 'Inget sparat ännu')}</p><button className="primary" onClick={() => openPanel('search')}>{t(lang, 'Search objects', 'Sök objekt')}</button></div>}</>}
      {panel === 'more' && <div className="more-menu">{([['saved', Bookmark], ['view', SlidersHorizontal], ['observation', Clock3], ['phone', Compass], ['settings', Settings2], ['about', Info]] as const).map(([next, Icon]) => <button key={next} onClick={() => openPanel(next)}><Icon size={20}/>{titles[next]}<ChevronRight size={17}/></button>)}{document.fullscreenEnabled && <button onClick={fullscreen}>{isFullscreen ? <Minimize size={20}/> : <Maximize size={20}/>} {isFullscreen ? t(lang, 'Exit fullscreen', 'Lämna helskärm') : t(lang, 'Fullscreen', 'Helskärm')}</button>}</div>}
      {panel === 'phone' && <PhoneControls phone={phone} language={lang} onStart={follow}/>}
      {panel === 'view' && <>
        <div className="sky-mode" role="group" aria-label={titles.view}><button className={skyMode === 'horizon' ? 'active' : ''} aria-pressed={skyMode === 'horizon'} onClick={() => setSkyMode('horizon')}>{t(lang, 'Look around', 'Se dig omkring')}</button><button className={skyMode === 'map' ? 'active' : ''} aria-pressed={skyMode === 'map'} onClick={() => setSkyMode('map')}>{t(lang, 'Sky map', 'Himmelskarta')}</button></div>
        <div className="figure-controls"><label><input type="checkbox" checked={showFigures} onChange={event => setShowFigures(event.target.checked)}/>{t(lang, 'Constellation figures', 'Stjärnbildsfigurer')}</label><label><input type="checkbox" checked={showFigureNames} disabled={!showFigures} onChange={event => setShowFigureNames(event.target.checked)}/>{t(lang, 'Latin names', 'Latinska namn')}</label></div>
        <p className="panel-note">{t(lang, 'Drag the sky or use the arrow keys. Manual changes pause phone following.', 'Dra i himlen eller använd piltangenter. Manuella ändringar pausar telefonföljningen.')}</p>
        <div className="manual-controls">{([[-30, 0, '←'], [0, 15, '↑'], [0, -15, '↓'], [30, 0, '→']] as const).map(([heading, pitch, arrow]) => <button key={arrow} aria-label={`${t(lang, 'Adjust view', 'Ändra vy')} ${arrow}`} onClick={() => manualView(current => ({heading: (current.heading + heading + 360) % 360, pitch: Math.max(-10, Math.min(90, current.pitch + pitch))}))}>{arrow}</button>)}</div>
        {finderTarget && <button className="panel-action" onClick={centerTarget} disabled={objectPosition(finderTarget, time, location)!.altitude < 0}>{t(lang, 'Center manual view', 'Centrera manuell vy')}</button>}
      </>}
      {panel === 'about' && <div className="about-copy"><p>{t(lang, 'Noxari · a calculated sky for your selected location and time.', 'Noxari · en beräknad himmel för vald plats och tid.')}</p><p>{t(lang, 'Markers show positions, not guaranteed visibility. Brightness is stylized. Terrain, weather, atmospheric refraction and light pollution are not included.', 'Markörer visar positioner, inte garanterad synlighet. Ljusstyrkan är stiliserad. Terräng, väder, atmosfärisk refraktion och ljusföroreningar ingår inte.')}</p><p>{t(lang, 'Sun altitude', 'Solens höjd')}: {sun.altitude.toFixed(1)}°</p>
<div className="sky-credit">{t(lang, 'Star catalog', 'Stjärnkatalog')}: <a href="https://github.com/astronexus/HYG-Database" target="_blank" rel="noopener noreferrer">HYG v4.1</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a> · {t(lang, 'Figures', 'Figurer')}: <a href="https://github.com/Stellarium/stellarium/tree/daace2add6a1bf886e8ee1934f51e9c69f818d18/skycultures/modern" target="_blank" rel="noopener noreferrer">Stellarium team</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. {t(lang, 'Figures are schematic guides, not official boundaries.', 'Figurerna är schematiska hjälplinjer, inte officiella gränser.')}</div><div className="sky-credit">{t(lang, 'Messier catalog', 'Messierkatalog')}: <a href="https://github.com/mattiaverga/OpenNGC" target="_blank" rel="noopener noreferrer">OpenNGC · Mattia Verga</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. {t(lang, 'Adapted types, aliases, Swedish names and equipment guidance; M102 follows NGC 5866 with a dispute note. Approximate distance facts: ', 'Bearbetade typer, alias, svenska namn och utrustningsråd; M102 följer NGC 5866 med en förklaring om tvisten. Ungefärliga avstånd: ')}<a href="https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/" target="_blank" rel="noopener noreferrer">NASA/Hubble</a>.</div></div>}
    </SkyPanel>}
    {toast && <div className="toast" role="status"><Check size={16}/>{toast}</div>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
