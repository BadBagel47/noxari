import {DateTime} from 'luxon';
import {CalendarDays, Info, Moon, MoonStar, Orbit, Play, Sparkles, Sun} from 'lucide-react';
import {KindIcon} from './KindIcon';
import {moonInfo, moonPhaseLabel} from './moonInfo';
import {useState} from 'react';
import type {SkyEvent} from './skyEvents';
import type {IssPass} from './iss';
import {CloudForecast} from './CloudForecast';
import {KindIcon as SatelliteIcon} from './KindIcon';
import type {ReactNode} from 'react';
import type {Gear, SpaceObject} from './data';
import {clockTime, type NightContext, type ObservingLocation} from './astronomy';
import {isDiffuse, moonSeparation, type recommend, type rankTonight} from './recommendations';

type Recommendation = ReturnType<typeof recommend>;
export function SuggestionSummary({suggestion, language, timeZone}: {suggestion: Recommendation; language: 'en' | 'sv'; timeZone: string}) {
  const sv = language === 'sv', best = suggestion.best;
  if (!best) {
    const reasons = {bright: sv ? 'Ingen återstående tid med tillräckligt mörk himmel.' : 'No remaining slot with a sufficiently dark sky.',
      low: sv ? 'Ingen tillräckligt hög position när himlen är mörk nog.' : 'No sufficiently high position while the sky is dark enough.',
      nearSun: sv ? 'För nära solen vid de möjliga tillfällena (under 15°).' : 'Too close to the Sun in the candidate slots (under 15°).',
      demo: sv ? 'Demokurva, ingår inte i rangordningen.' : 'Demo curve, excluded from ranking.'};
    return <div className="suggestion-summary muted">{reasons[suggestion.reason!]}</div>;
  }
  const time = clockTime(best.sample.time, timeZone);
  const range = suggestion.start!.getTime() === suggestion.end!.getTime() ? time : `${clockTime(suggestion.start!, timeZone)}–${clockTime(suggestion.end!, timeZone)}`;
  return <div className="suggestion-summary">
    <strong>{sv ? 'Föreslagen tid' : 'Suggested time'} ≈ {time} · {Math.round(best.sample.altitude).toLocaleString(sv ? 'sv-SE' : 'en-GB')}°</strong>
    <span>{sv ? 'Bra intervall' : 'Favorable range'} ≈ {range}</span>
    <span>{sv ? 'Solens höjd' : 'Sun altitude'} {best.sample.sunAltitude.toLocaleString(sv ? 'sv-SE' : 'en-GB', {maximumFractionDigits: 0})}°
      {isDiffuse(suggestion.object) && (best.sample.moonAltitude <= 0
        ? (sv ? ' · Månen under horisonten' : ' · Moon below horizon')
        : ` · ${sv ? 'Månen' : 'Moon'} ${Math.round(best.sample.moonIllumination * 100).toLocaleString(sv ? 'sv-SE' : 'en-GB')}% · ${Math.round(moonSeparation(best.sample)).toLocaleString(sv ? 'sv-SE' : 'en-GB')}° ${sv ? 'från objektet' : 'from target'}`)}</span>
    {best.moonPenalty > .15 && <span className="moon-impact">{sv ? 'Månljus sänker prioriteten' : 'Moonlight lowers priority'}</span>}
  </div>;
}

export function TonightPanel({context, location, language, gear, onGearChange, ranked, renderCard, events, onShowTime, issPasses, issAgeDays, onShowPass, onTour}: {
  context: NightContext; location: ObservingLocation; language: 'en' | 'sv'; gear: 'all' | Gear;
  onGearChange: (gear: 'all' | Gear) => void; ranked: ReturnType<typeof rankTonight>;
  renderCard: (object: SpaceObject, recommendation: Recommendation) => ReactNode;
  events: SkyEvent[]; onShowTime: (time: Date) => void;
  issPasses: IssPass[]; issAgeDays: number | null; onShowPass: (time: Date) => void;
  /** F-072: the tour of tonight's picks is started from the action row under the list. */
  onTour?: () => void;
}) {
  const [tab, setTab] = useState<'tonight' | 'upcoming'>('tonight');
  const sv = language === 'sv', {window, samples} = context;
  const date = (time: Date) => DateTime.fromJSDate(time, {zone: location.timeZone}).setLocale(sv ? 'sv' : 'en').toFormat('dd LLL HH:mm');
  const suggested = ranked.filter(item => item.best), other = ranked.filter(item => !item.best);
  const polar = window.kind === 'polarDay' ? (sv ? 'Midnattssol: ingen solnedgång i detta dygn.' : 'Continuous daylight: no sunset in this window.')
    : window.kind === 'polarNight' ? (sv ? 'Polarnatt: ingen soluppgång i detta dygn.' : 'Polar night: no sunrise in this window.')
    : window.kind === 'partial' ? (sv ? 'Ofullständig natt: visar hela intervallet lokal middag till nästa middag.' : 'Partial night: showing local noon to the next noon.') : null;
  const dark = samples.filter(sample => sample.sunAltitude < -18);
  const darkText = dark.length ? `${sv ? 'Mörkt' : 'Dark'} ≈ ${clockTime(dark[0].time, location.timeZone)}–${clockTime(dark[dark.length - 1].time, location.timeZone)}` : (sv ? 'Inget helt mörker i natt' : 'No full darkness tonight');
  const moon = moonInfo(window.start, location);
  // Only rise/set events inside tonight's window are relevant; otherwise say whether the Moon is up or down all night.
  const inWindow = (time: Date | null) => time && time >= window.start && time <= window.end ? time : null;
  const moonUp = samples.filter(sample => sample.moonAltitude > 0).length;
  const moonTimes = [inWindow(moon.rise) && `${sv ? 'upp' : 'rises'} ${clockTime(moon.rise!, location.timeZone)}`, inWindow(moon.set) && `${sv ? 'ned' : 'sets'} ${clockTime(moon.set!, location.timeZone)}`].filter(Boolean).join(' · ')
    || (moonUp === 0 ? (sv ? 'nere hela natten' : 'down all night') : moonUp === samples.length ? (sv ? 'uppe hela natten' : 'up all night') : '');
  const gearOptions: ['eye' | 'binoculars' | 'all', string][] = [['eye', sv ? 'Ögat' : 'Eye'], ['binoculars', sv ? 'Kikare' : 'Binoculars'], ['all', sv ? 'Teleskop' : 'Telescope']];
  const tabs = <div className="segmented wide tonight-tabs" role="group" aria-label={sv ? 'Visa' : 'Show'}><button className={tab === 'tonight' ? 'chosen' : ''} aria-pressed={tab === 'tonight'} onClick={() => setTab('tonight')}>{sv ? 'I natt' : 'Tonight'}</button><button className={tab === 'upcoming' ? 'chosen' : ''} aria-pressed={tab === 'upcoming'} onClick={() => setTab('upcoming')}>{sv ? 'Kommande' : 'Upcoming'}</button></div>;
  const eventIcon: Record<SkyEvent['kind'], ReactNode> = {moonPhase: <Moon size={20}/>, lunarEclipse: <MoonStar size={20}/>, solarEclipse: <Sun size={20}/>, conjunction: <Sparkles size={20}/>, elongation: <Orbit size={20}/>, season: <CalendarDays size={20}/>, meteor: <KindIcon name="comet" size={22}/>};
  if (tab === 'upcoming') return <>
    {tabs}
    <p className="panel-note">{sv ? 'Beräknade händelser för vald plats: kommande 60 dagar (förmörkelser ett år framåt). Tider i platsens tidszon.' : 'Calculated events for the selected place: next 60 days (eclipses one year ahead). Times in the place’s timezone.'}</p>
    {events.length ? <div className="object-list event-list">{events.map(event => <article className="object-row event-row" key={event.kind + event.time.getTime() + event.title.en}>
      <button className="row-main" onClick={() => onShowTime(event.time)}><span className="event-icon" aria-hidden="true">{eventIcon[event.kind]}</span><span className="row-text"><strong>{sv ? event.title.sv : event.title.en}</strong><small>{DateTime.fromJSDate(event.time, {zone: location.timeZone}).setLocale(sv ? 'sv' : 'en').toFormat(event.kind === 'meteor' ? 'ccc d LLL' : 'ccc d LLL · HH:mm')} · {sv ? event.detail.sv : event.detail.en}</small></span><span className="event-go">{sv ? 'Visa' : 'Show'}</span></button>
    </article>)}</div> : <div className="empty"><p>{sv ? 'Inga händelser hittades.' : 'No events found.'}</p></div>}
  </>;
  // F-072: the night first (with a twilight timeline), then the list; tour, upcoming events and clouds after it.
  const band = (altitude: number) => altitude >= -6 ? 'civil' : altitude >= -18 ? 'twilight' : 'dark';
  const timeline = samples.reduce<{kind: string; count: number}[]>((runs, sample) => {
    const kind = sample.sunAltitude >= 0 ? 'day' : band(sample.sunAltitude), last = runs[runs.length - 1];
    if (last && last.kind === kind) last.count++; else runs.push({kind, count: 1});
    return runs;
  }, []);
  return <>
    <section className="night-summary hero" aria-label={sv ? 'Nattens förutsättningar' : 'Night conditions'}>
      <small>{sv ? `Natten i ${location.name}` : `The night in ${location.name}`}</small>
      <strong>{polar ?? darkText}</strong>
      {!polar && samples.length > 1 && <div className="night-timeline" aria-hidden="true">{timeline.map((run, index) => <i key={index} className={run.kind} style={{flexGrow: run.count}}/>)}</div>}
      <div className="night-legend">
        <span>{polar ? date(window.start) : `${sv ? 'solnedgång' : 'sunset'} ${clockTime(window.sunset!, location.timeZone)}`}</span>
        <span>{moonPhaseLabel(moon.phase, sv)} {Math.round(moon.illumination * 100)} %{moonTimes ? ` · ${sv ? 'månen' : 'Moon'} ${moonTimes}` : ''}</span>
        <span>{polar ? date(window.end) : `${sv ? 'soluppgång' : 'sunrise'} ${clockTime(window.sunrise!, location.timeZone)}`}</span>
      </div>
    </section>
    <div className="list-head">
      <h2 className="sheet-label">{sv ? 'Bäst i natt' : 'Best tonight'} ({suggested.length})</h2>
    </div>
    <div className="segmented wide gear-filter" role="group" aria-label={sv ? 'Utrustning' : 'Equipment'}>{gearOptions.map(([value, text]) => <button key={value} className={(gear === value || (value === 'all' && gear === 'telescope')) ? 'chosen' : ''} aria-pressed={gear === value || (value === 'all' && gear === 'telescope')} onClick={() => onGearChange(value)}>{text}</button>)}</div>
    {suggested.length ? <div className="object-list">{suggested.map(item => renderCard(item.object, item))}</div> : <div className="empty"><p>{sv ? 'Inga objekt uppfyller kriterierna för denna natt och utrustning. Prova en annan natt eller plats.' : 'No targets meet the criteria for this night and equipment. Try another night or location.'}</p></div>}
    <p className="planning-note panel-foot"><Info size={15} aria-hidden="true"/>{sv ? 'Beräknat från höjd, mörker och månljus; tider är ungefärliga och gäller efter vald tid. Väder, terräng och ljusföroreningar ingår inte.' : 'Calculated from altitude, darkness and moonlight; times are approximate and after the selected time. Weather, terrain and light pollution are not included.'}</p>
    <div className="tonight-actions">
      {onTour && <button onClick={onTour}><Play size={16} aria-hidden="true"/>{sv ? 'Visning' : 'Tour'}</button>}
      <button onClick={() => setTab('upcoming')}><CalendarDays size={16} aria-hidden="true"/>{sv ? 'Kommande' : 'Upcoming'}</button>
    </div>
    {issPasses.length > 0 && <>
      <h2 className="sheet-label">{sv ? 'ISS i natt' : 'ISS tonight'}</h2>
      <div className="object-list">{issPasses.map(pass => <article className="object-row" key={pass.peak.getTime()}><button className="row-main" onClick={() => onShowPass(pass.peak)}><span className="event-icon" aria-hidden="true"><SatelliteIcon name="satellite" size={22}/></span><span className="row-text"><strong>{sv ? 'Synlig passage' : 'Visible pass'} ≈ {clockTime(pass.peak, location.timeZone)} · {Math.round(pass.peakAltitude)}°</strong><small>{clockTime(pass.rise, location.timeZone)}–{clockTime(pass.set, location.timeZone)}{issAgeDays !== null && issAgeDays > 5 ? (sv ? ' · banelementen är gamla, tiden kan avvika' : ' · elements are old, time may be off') : ''}</small></span><span className="event-go">{sv ? 'Visa' : 'Show'}</span></button></article>)}</div>
    </>}
    <CloudForecast location={location} window={window} language={language}/>
    <details className="ranking-method"><summary>{sv ? 'Så väljs förslagen' : 'How suggestions are chosen'}</summary><p>{sv ? 'Minst 10° över horisonten (15° för galaxer, nebulosor, stjärnhopar och stjärnmoln). Solen ska vara under −1° för ljusa planeter och månen, −6° för stjärnor och −12° för djuprymden, Uranus och Neptunus. Planeter behöver minst 15° vinkelavstånd från solen. Högre höjd och mörkare himmel prioriteras; en ljus måne ovanför horisonten sänker djuprymdens prioritet, särskilt nära objektet. Utrustning filtrerar listan. Cirka 10 minuters upplösning; ingen sannolikhet för faktisk synlighet beräknas. Stjärnbildernas demokurvor ingår inte.' : 'At least 10° above the horizon (15° for galaxies, nebulae, clusters and star clouds). Sun below −1° for bright planets and the Moon, −6° for stars, and −12° for deep sky, Uranus and Neptune. Planets need at least 15° separation from the Sun. Higher altitude and darker sky take priority; a bright Moon above the horizon lowers deep-sky priority, especially nearby. Equipment filters the list. Approximately 10-minute sampling; no probability of actual visibility is calculated. Constellation demo curves are excluded.'}</p></details>
    {other.length > 0 && <details className="outside-criteria"><summary>{sv ? 'Utanför kriterierna' : 'Outside the criteria'} ({other.length})</summary><div className="object-list">{other.map(item => renderCard(item.object, item))}</div></details>}
  </>;
}
