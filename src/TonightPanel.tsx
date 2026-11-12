import {DateTime} from 'luxon';
import {Info, Moon} from 'lucide-react';
import {moonInfo, moonPhaseLabel} from './moonInfo';
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

export function TonightPanel({context, location, language, gear, onGearChange, ranked, renderCard}: {
  context: NightContext; location: ObservingLocation; language: 'en' | 'sv'; gear: 'all' | Gear;
  onGearChange: (gear: 'all' | Gear) => void; ranked: ReturnType<typeof rankTonight>;
  renderCard: (object: SpaceObject, recommendation: Recommendation) => ReactNode;
}) {
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
  return <>
    <section className="night-summary compact" aria-label={sv ? 'Nattens förutsättningar' : 'Night conditions'}>
      <Moon size={22} aria-hidden="true"/>
      <div>
        <strong>{polar ?? darkText}</strong>
        <span>{location.name} · {polar ? `${date(window.start)} – ${date(window.end)}` : `${sv ? 'solnedgång' : 'sunset'} ${clockTime(window.sunset!, location.timeZone)} · ${sv ? 'soluppgång' : 'sunrise'} ${clockTime(window.sunrise!, location.timeZone)}`}</span>
        <span>{moonPhaseLabel(moon.phase, sv)} {Math.round(moon.illumination * 100)} %{moonTimes ? ` · ${sv ? 'månen' : 'Moon'} ${moonTimes}` : ''}</span>
      </div>
    </section>
    <h2 className="sheet-label">{sv ? 'Utrustning' : 'Equipment'}</h2>
    <div className="segmented wide" role="group" aria-label={sv ? 'Utrustning' : 'Equipment'}>{gearOptions.map(([value, text]) => <button key={value} className={(gear === value || (value === 'all' && gear === 'telescope')) ? 'chosen' : ''} aria-pressed={gear === value || (value === 'all' && gear === 'telescope')} onClick={() => onGearChange(value)}>{text}</button>)}</div>
    <h2 className="sheet-label">{sv ? 'Bäst i natt' : 'Best tonight'} ({suggested.length})</h2>
    {suggested.length ? <div className="object-list">{suggested.map(item => renderCard(item.object, item))}</div> : <div className="empty"><p>{sv ? 'Inga objekt uppfyller kriterierna för denna natt och utrustning. Prova en annan natt eller plats.' : 'No targets meet the criteria for this night and equipment. Try another night or location.'}</p></div>}
    <p className="planning-note panel-foot"><Info size={15} aria-hidden="true"/>{sv ? 'Beräknat från höjd, mörker och månljus; tider är ungefärliga och gäller efter vald tid. Väder, terräng och ljusföroreningar ingår inte.' : 'Calculated from altitude, darkness and moonlight; times are approximate and after the selected time. Weather, terrain and light pollution are not included.'}</p>
    <details className="ranking-method"><summary>{sv ? 'Så väljs förslagen' : 'How suggestions are chosen'}</summary><p>{sv ? 'Minst 10° över horisonten (15° för galaxer, nebulosor, stjärnhopar och stjärnmoln). Solen ska vara under −1° för ljusa planeter och månen, −6° för stjärnor och −12° för djuprymden, Uranus och Neptunus. Planeter behöver minst 15° vinkelavstånd från solen. Högre höjd och mörkare himmel prioriteras; en ljus måne ovanför horisonten sänker djuprymdens prioritet, särskilt nära objektet. Utrustning filtrerar listan. Cirka 10 minuters upplösning; ingen sannolikhet för faktisk synlighet beräknas. Stjärnbildernas demokurvor ingår inte.' : 'At least 10° above the horizon (15° for galaxies, nebulae, clusters and star clouds). Sun below −1° for bright planets and the Moon, −6° for stars, and −12° for deep sky, Uranus and Neptune. Planets need at least 15° separation from the Sun. Higher altitude and darker sky take priority; a bright Moon above the horizon lowers deep-sky priority, especially nearby. Equipment filters the list. Approximately 10-minute sampling; no probability of actual visibility is calculated. Constellation demo curves are excluded.'}</p></details>
    {other.length > 0 && <details className="outside-criteria"><summary>{sv ? 'Utanför kriterierna' : 'Outside the criteria'} ({other.length})</summary><div className="object-list">{other.map(item => renderCard(item.object, item))}</div></details>}
  </>;
}
