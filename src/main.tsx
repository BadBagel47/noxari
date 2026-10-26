import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Search, Star, Compass, Bookmark, Settings2, MapPin, Clock3, ChevronRight, Share2, X, Eye, LocateFixed, Globe2, Layers, Info, Check} from 'lucide-react';
import {objects, starField, zodiac, type SpaceObject, type Gear} from './data';
import {clockTime, localDateTimeValue, nightVisibility, objectPosition, positionAt, selectedLocalTime, stockholm, type ObservingLocation} from './astronomy';
import {Body} from 'astronomy-engine';
import {DateTime} from 'luxon';
import {VisibilityChart, peakSample} from './VisibilityChart';
import './style.css';

type Tab = 'Sky'|'Tonight'|'Explore'|'Saved';
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
  const [tab, setTab] = useState<Tab>('Sky');
  const [lang, setLang] = useState<Lang>(() => localStorage.getItem('noxari-lang') === 'sv' ? 'sv' : 'en');
  const [saved, setSaved] = useState<string[]>(() => {
    try { const value = JSON.parse(localStorage.getItem('noxari-saved') || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  });
  const [selected, setSelected] = useState<SpaceObject|null>(null);
  const [search, setSearch] = useState('');
  const [gear, setGear] = useState<'all'|Gear>('all');
  const [category, setCategory] = useState('All');
  const [showLines, setShowLines] = useState(true);
  const [time, setTime] = useState(() => new Date());
  const [location, setLocation] = useState<ObservingLocation>(initialLocation);
  const [latitudeInput, setLatitudeInput] = useState(String(initialLocation.latitude));
  const [longitudeInput, setLongitudeInput] = useState(String(initialLocation.longitude));
  const [timeZoneInput, setTimeZoneInput] = useState(initialLocation.timeZone);
  const [settings, setSettings] = useState(false);
  const [toast, setToast] = useState('');
  const [finder, setFinder] = useState(false);

  useEffect(() => { localStorage.setItem('noxari-saved', JSON.stringify(saved)); }, [saved]);
  useEffect(() => { localStorage.setItem('noxari-lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('noxari-location', JSON.stringify(location)); }, [location]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('object');
    const object = objects.find(item => item.id === id);
    if (object) { setSelected(object); setTab('Sky'); }
  }, []);

  const series = useMemo(() => new Map(objects.map(object => [object.id, nightVisibility(object, time, location)])), [time, location]);
  const sun = useMemo(() => positionAt(Body.Sun, time, location), [time, location]);
  const selectedPosition = selected ? objectPosition(selected, time, location) : null;
  const filtered = useMemo(() => objects.filter(object => {
    const query = search.trim().toLowerCase();
    const matches = !query || [object.en, object.sv, object.id, object.kind, object.constellation].some(value => value.toLowerCase().includes(query));
    const equipment = gear === 'all' || (gear === 'eye' ? object.gear === 'eye' : gear === 'binoculars' ? object.gear !== 'telescope' : true);
    return matches && (category === 'All' || object.kind === category) && equipment;
  }), [search, gear, category]);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const toggleSaved = (id: string) => setSaved(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const closeDetail = () => { setSelected(null); setFinder(false); };
  const selectPreset = (name: string) => {
    const preset = presets.find(item => item.name === name);
    if (!preset) return;
    setLocation(preset);
    setLatitudeInput(String(preset.latitude));
    setLongitudeInput(String(preset.longitude));
    setTimeZoneInput(preset.timeZone);
  };
  const applyCoordinates = () => {
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
  async function share(object: SpaceObject) {
    const url = new URL(window.location.href);
    url.searchParams.set('object', object.id);
    const title = `${object.en} — Noxari`;
    try {
      if (navigator.share) await navigator.share({title, url: url.toString()});
      else { await navigator.clipboard.writeText(url.toString()); notify(t(lang, 'Link copied', 'Länk kopierad')); }
    } catch { notify(t(lang, 'Sharing cancelled or unavailable', 'Delning avbruten eller ej tillgänglig')); }
  }

  const card = (object: SpaceObject) => {
    const visibility = series.get(object.id)!;
    const peak = peakSample(visibility);
    return <article className="object-card" key={object.id}>
      <button className="card-main" onClick={() => setSelected(object)}>
        <div className="card-top"><span className="object-dot" style={{background: object.color}}/><div className="card-title"><strong>{display(object, lang)}</strong><small>{object.id.toUpperCase()} · {object.kind}</small></div><ChevronRight size={17}/></div>
        <VisibilityChart series={visibility}/>
        <div className="card-foot"><span><Eye size={13}/>{visibility.real ? t(lang, 'Calculated altitude', 'Beräknad höjd') : t(lang, 'DEMO curve', 'DEMO-kurva')}</span><span>{visibility.real ? peak ? `${t(lang, 'Highest', 'Högst')} ${clockTime(peak.time, location.timeZone)}` : t(lang, 'Not visible in twilight/night', 'Ej synlig i skymning/natt') : t(lang, 'Illustrative only', 'Endast illustration')}</span></div>
      </button>
      <button className={'save-btn ' + (saved.includes(object.id) ? 'active' : '')} aria-label={saved.includes(object.id) ? 'Remove bookmark' : 'Bookmark'} onClick={() => toggleSaved(object.id)}><Bookmark size={17} fill={saved.includes(object.id) ? 'currentColor' : 'none'}/></button>
    </article>;
  };

  return <div className="app">
    <header className="topbar"><button className="brand" onClick={() => setTab('Sky')}><span className="brand-symbol">✦</span><span>Noxari</span></button><div className="top-actions"><span className="demo-pill">DEMO SKY</span><button className="icon-btn" title="Settings" onClick={() => setSettings(true)}><Settings2 size={20}/></button></div></header>
    <main>
      <div className="main-head"><div><div className="eyebrow">{t(lang, 'YOUR WINDOW TO THE UNIVERSE', 'DITT FÖNSTER MOT UNIVERSUM')}</div><h1>{tab === 'Sky' ? t(lang, 'Explore the sky', 'Utforska himlen') : tab === 'Tonight' ? t(lang, 'Tonight’s objects', 'Kvällens objekt') : tab === 'Explore' ? t(lang, 'Explore objects', 'Utforska objekt') : t(lang, 'Saved objects', 'Sparade objekt')}</h1><p className="subhead">{tab === 'Sky' ? t(lang, 'Explore the illustrated map and calculated object positions.', 'Utforska den illustrerade kartan och beräknade objektpositioner.') : tab === 'Tonight' ? t(lang, 'Calculated altitude, without observation-quality ranking yet.', 'Beräknad höjd, ännu utan rangordning av observationskvalitet.') : tab === 'Explore' ? t(lang, 'Search the universe, one object at a time.', 'Sök bland universums objekt.') : t(lang, 'Your personal observing shortlist.', 'Din personliga observationslista.')}</p></div><div className="location"><MapPin size={15}/>{location.name} · {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°</div></div>

      <section className="observation-controls" aria-label="Observation settings">
        <label><span><Clock3 size={15}/>{t(lang, 'Date and time', 'Datum och tid')}</span><input type="datetime-local" value={localDateTimeValue(time, location.timeZone)} onChange={event => { const next = selectedLocalTime(event.target.value, location.timeZone); if (next) setTime(next); else if (event.target.value) notify(t(lang, 'This local time does not exist in the selected timezone.', 'Denna lokala tid finns inte i den valda tidszonen.')); }}/></label>
        <button className="control-button" onClick={() => setTime(new Date())}>{t(lang, 'Now', 'Nu')}</button>
        <label><span><MapPin size={15}/>{t(lang, 'Location', 'Plats')}</span><select value={presets.some(item => item.name === location.name) ? location.name : 'Custom'} onChange={event => selectPreset(event.target.value)}>{presets.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}<option value="Custom">{t(lang, 'Custom coordinates', 'Egna koordinater')}</option></select></label>
        <label className="coordinate"><span>{t(lang, 'Latitude', 'Latitud')}</span><input aria-label="Latitude" type="number" min="-90" max="90" step="any" value={latitudeInput} onChange={event => setLatitudeInput(event.target.value)}/></label>
        <label className="coordinate"><span>{t(lang, 'Longitude', 'Longitud')}</span><input aria-label="Longitude" type="number" min="-180" max="180" step="any" value={longitudeInput} onChange={event => setLongitudeInput(event.target.value)}/></label>
        <label className="timezone"><span>{t(lang, 'Timezone', 'Tidszon')}</span><input aria-label="Timezone" type="text" value={timeZoneInput} onChange={event => setTimeZoneInput(event.target.value)}/></label>
        <button className="control-button" onClick={applyCoordinates}>{t(lang, 'Apply', 'Använd')}</button>
        <p>{t(lang, 'Times use the selected observation timezone (IANA name). Coordinates use north/east as positive. Altitudes are geometric; local terrain and weather are not included.', 'Tider använder vald observationsplats tidszon (IANA-namn). Nord/öst är positiva koordinater. Höjderna är geometriska; lokal horisont och väder ingår inte.')}</p>
      </section>

      {tab === 'Sky' && <>
        <section className="sky-panel"><div className="sky-toolbar"><div className="chip"><Clock3 size={15}/>{clockTime(time, location.timeZone)} <span>· {t(lang, 'selected time', 'vald tid')}</span></div><button className={'chip toggle ' + (showLines ? 'on' : '')} onClick={() => setShowLines(value => !value)}><Layers size={15}/>{t(lang, 'Constellations', 'Stjärnbilder')}</button></div>
          <div className="sky-canvas"><div className="sky-glow"/>{starField.map((star, index) => <span className="sky-star" key={index} style={{left: star.x+'%', top: star.y+'%', width: star.r*2, height: star.r*2, opacity: star.opacity}}/>)}{showLines && <svg className="sky-lines" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="18,34 32,28 48,35 59,52 75,40 84,56"/><polyline points="24,64 33,54 41,63 50,72"/><polyline points="64,15 73,30 82,16"/></svg>}{objects.filter(object => object.kind !== 'Constellation').map(object => <button key={object.id} className="sky-object" style={{left: object.x+'%', top: object.y+'%'}} onClick={() => setSelected(object)} title={display(object, lang)}><span className="sky-point" style={{width: object.size+4, height: object.size+4, background: object.color, boxShadow: `0 0 16px ${object.color}`}}/><span>{display(object, lang)}</span></button>)}<div className="horizon"><span>W</span><span>SW</span><span>S</span><span>SE</span><span>E</span></div></div>
          <div className="sky-bottom"><span><Info size={14}/>{t(lang, 'Illustrative sky positions and lines — not for navigation', 'Illustrativa himmelspositioner och linjer – inte för navigering')}</span><span>{t(lang, 'Sun altitude', 'Solens höjd')}: {sun.altitude.toFixed(1)}°</span></div>
        </section>
        <div className="section-heading"><div><h2>{t(lang, 'Objects to explore', 'Objekt att utforska')}</h2><p>{t(lang, 'Altitude curves use your selected time and location', 'Höjdkurvorna använder vald tid och plats')}</p></div><button className="text-link" onClick={() => setTab('Tonight')}>{t(lang, 'View all', 'Visa alla')} <ChevronRight size={16}/></button></div><div className="cards-grid">{objects.slice(0, 3).map(card)}</div>
      </>}
      {tab === 'Tonight' && <><div className="notice"><Info size={17}/>{t(lang, 'Positions and altitude curves are calculated. This list is not yet ranked by moonlight, equipment, weather or observing quality. Constellation curves remain demos.', 'Positioner och höjdkurvor är beräknade. Listan rangordnas ännu inte efter månljus, utrustning, väder eller observationskvalitet. Stjärnbildernas kurvor är fortfarande demo.')}</div><div className="filters"><label>{t(lang, 'Equipment', 'Utrustning')} <select value={gear} onChange={event => setGear(event.target.value as typeof gear)}><option value="all">{t(lang, 'All equipment', 'All utrustning')}</option><option value="eye">{t(lang, 'Naked eye', 'Blotta ögat')}</option><option value="binoculars">{t(lang, 'Up to binoculars', 'Upp till kikare')}</option><option value="telescope">{t(lang, 'All including telescope', 'Även teleskop')}</option></select></label></div><div className="cards-grid">{filtered.map(card)}</div></>}
      {tab === 'Explore' && <><div className="search-box"><Search size={20}/><input placeholder={t(lang, 'Search by name, catalog ID or constellation…', 'Sök namn, katalog-ID eller stjärnbild…')} value={search} onChange={event => setSearch(event.target.value)}/>{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={17}/></button>}</div><div className="category-scroll">{['All', 'Galaxy', 'Nebula', 'Star cluster', 'Planet', 'Moon', 'Star', 'Constellation'].map(item => <button className={'category ' + (category === item ? 'selected' : '')} key={item} onClick={() => setCategory(item)}>{item === 'All' ? t(lang, 'All objects', 'Alla objekt') : item}</button>)}</div><p className="results-count">{filtered.length} {t(lang, 'objects', 'objekt')}</p><div className="cards-grid">{filtered.map(card)}</div><section className="zodiac"><h2>{t(lang, 'Constellation names', 'Stjärnbildsnamn')}</h2><p>{t(lang, 'The 12 classical zodiac constellations (name reference)', 'De 12 klassiska zodiakstjärnbilderna (namnreferens)')}</p><div className="zodiac-grid">{zodiac.map(([en, sv]) => <span key={en}>{lang === 'sv' ? sv : en}</span>)}</div></section></>}
      {tab === 'Saved' && <>{saved.length ? <div className="cards-grid">{objects.filter(object => saved.includes(object.id)).map(card)}</div> : <div className="empty"><Bookmark size={34}/><h2>{t(lang, 'Nothing saved yet', 'Inget sparat ännu')}</h2><p>{t(lang, 'Bookmark objects from the sky map, Tonight or Explore.', 'Bokmärk objekt från himlen, Tonight eller Explore.')}</p><button className="primary" onClick={() => setTab('Explore')}>{t(lang, 'Explore objects', 'Utforska objekt')}</button></div>}</>}
    </main>
    <nav className="bottom-nav" aria-label="Main navigation">{([['Sky', Star], ['Tonight', Clock3], ['Explore', Compass], ['Saved', Bookmark]] as const).map(([name, Icon]) => <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}><Icon size={21}/><span>{name}</span></button>)}</nav>

    {selected && <div className="modal-backdrop" onClick={closeDetail}><section className="detail" role="dialog" aria-modal="true" aria-label={display(selected, lang)} onClick={event => event.stopPropagation()}><div className="detail-hero"><div className="detail-stars">{starField.slice(0, 70).map((star, index) => <span key={index} style={{left: star.x+'%', top: star.y+'%', opacity: star.opacity}}/>)}</div><span className="hero-orb" style={{background: selected.color}}/><button className="close" aria-label="Close" onClick={closeDetail}><X size={20}/></button><div className="hero-label">{selected.kind} · {selected.id.toUpperCase()}</div></div><div className="detail-body"><h2>{display(selected, lang)}</h2><p className="description">{lang === 'sv' ? selected.descriptionSv : selected.description}</p><div className="stat-grid"><div><small>{t(lang, 'Distance', 'Avstånd')}</small><strong>{selected.distance}</strong></div><div><small>{t(lang, 'Apparent magnitude', 'Skenbar magnitud')}</small><strong>{selected.magnitude}</strong></div><div><small>{t(lang, 'Constellation', 'Stjärnbild')}</small><strong>{selected.constellation}</strong></div><div><small>{t(lang, 'Equipment', 'Utrustning')}</small><strong>{equipmentLabel(selected.gear, lang)}</strong></div>{selectedPosition && <><div><small>{t(lang, 'Altitude now', 'Höjd nu')}</small><strong>{selectedPosition.altitude.toFixed(1)}°</strong></div><div><small>{t(lang, 'Azimuth from north', 'Azimut från norr')}</small><strong>{selectedPosition.azimuth.toFixed(1)}°</strong></div></>}</div><div className="detail-chart-title"><h3>{t(lang, 'Altitude through the night', 'Höjd under natten')}</h3><small>{selected.position ? t(lang, 'CALCULATED', 'BERÄKNAD') : 'DEMO'}</small></div><VisibilityChart series={series.get(selected.id)!} large/><p className="chart-note">{selected.position ? t(lang, 'From your selected coordinates, local evening 18:00–06:00. Dark blue is astronomical darkness; lighter blue is twilight. The dot marks the highest visible altitude during twilight/night.', 'Från valda koordinater, lokal kväll 18.00–06.00. Mörkblått är astronomiskt mörker; ljusare blått är skymning. Punkten markerar högsta synliga höjd under skymning/natt.') : t(lang, 'Illustrative object curve only. Background twilight is calculated.', 'Endast illustrativ objektkurva. Bakgrundens skymning är beräknad.')}</p>{finder ? <div className="finder"><Compass size={35}/><strong>{t(lang, 'Guided Finder — preview', 'Guided Finder – förhandsvisning')}</strong><p>{t(lang, 'Phone sensor tracking and calibration are planned. No live direction is shown.', 'Telefonsensorer och kalibrering är planerade. Ingen riktning i realtid visas.')}</p><button onClick={() => setFinder(false)}>{t(lang, 'Back to details', 'Tillbaka till detaljer')}</button></div> : <div className="detail-actions"><button className="primary" onClick={() => setFinder(true)}><LocateFixed size={17}/>{t(lang, 'Guided Finder (preview)', 'Guided Finder (demo)')}</button><button onClick={() => toggleSaved(selected.id)}><Bookmark size={17} fill={saved.includes(selected.id) ? 'currentColor' : 'none'}/>{saved.includes(selected.id) ? t(lang, 'Saved', 'Sparad') : t(lang, 'Save', 'Spara')}</button><button onClick={() => share(selected)}><Share2 size={17}/>{t(lang, 'Share', 'Dela')}</button></div>}</div></section></div>}
    {settings && <div className="modal-backdrop" onClick={() => setSettings(false)}><section className="settings" role="dialog" aria-modal="true" aria-label="Settings" onClick={event => event.stopPropagation()}><div className="settings-head"><h2>{t(lang, 'Settings', 'Inställningar')}</h2><button onClick={() => setSettings(false)} aria-label="Close"><X size={20}/></button></div><div className="setting-row"><div><Globe2 size={19}/><strong>{t(lang, 'Object names', 'Objektnamn')}</strong><small>{t(lang, 'Choose English or Swedish names', 'Välj engelska eller svenska namn')}</small></div><div className="segmented"><button className={lang === 'en' ? 'chosen' : ''} onClick={() => setLang('en')}>EN</button><button className={lang === 'sv' ? 'chosen' : ''} onClick={() => setLang('sv')}>SV</button></div></div><p className="settings-note">{t(lang, 'The sky illustration and constellation curves are demos. Catalog object positions, solar system positions and twilight use real calculations for your chosen time and coordinates.', 'Himmelillustrationen och stjärnbildernas kurvor är demo. Katalogobjektens och solsystemets positioner samt skymning beräknas för vald tid och valda koordinater.')}</p></section></div>}
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
