import {DateTime} from 'luxon';
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
    <strong>{sv ? 'Föreslagen tid' : 'Suggested time'} ≈ {time} · {Math.round(best.sample.altitude)}°</strong>
    <span>{sv ? 'Bra intervall' : 'Favorable range'} ≈ {range}</span>
    <span>{sv ? 'Solens höjd' : 'Sun altitude'} {best.sample.sunAltitude.toFixed(0)}°
      {isDiffuse(suggestion.object) && (best.sample.moonAltitude <= 0
        ? (sv ? ' · Månen under horisonten' : ' · Moon below horizon')
        : ` · ${sv ? 'Månen' : 'Moon'} ${Math.round(best.sample.moonIllumination * 100)}% · ${Math.round(moonSeparation(best.sample))}° ${sv ? 'från objektet' : 'from target'}`)}</span>
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
  return <>
    <section className="night-summary" aria-label={sv ? 'Nattens förutsättningar' : 'Night conditions'}>
      <strong>{date(window.start)} – {date(window.end)}</strong><span>{location.timeZone}</span>
      <p>{polar ?? `${sv ? 'Solnedgång' : 'Sunset'} ${clockTime(window.sunset!, location.timeZone)} · ${sv ? 'Soluppgång' : 'Sunrise'} ${clockTime(window.sunrise!, location.timeZone)}`}</p>
      <p>{samples.some(sample => sample.sunAltitude < -18) ? (sv ? 'Astronomiskt mörker förekommer.' : 'Astronomical darkness occurs.') : (sv ? 'Inget astronomiskt mörker hittat (cirka 10 minuters upplösning).' : 'No astronomical darkness found (about 10-minute sampling).')}</p>
    </section>
    <p className="planning-note">{sv ? 'Förslagen bygger på höjd, mörker och månljus för vald natt och utrustning. Väder, lokal terräng och ljusföroreningar ingår inte. Endast tillfällen efter vald tid föreslås. Tiderna är ungefärliga.' : 'Suggestions use altitude, darkness and moonlight for the selected night and equipment. Weather, local terrain and light pollution are not included. Only slots after the selected time are suggested. Times are approximate.'}</p>
    <div className="filters"><label>{sv ? 'Utrustning' : 'Equipment'} <select value={gear} onChange={event => onGearChange(event.target.value as 'all' | Gear)}><option value="all">{sv ? 'All utrustning' : 'All equipment'}</option><option value="eye">{sv ? 'Blotta ögat' : 'Naked eye'}</option><option value="binoculars">{sv ? 'Upp till kikare' : 'Up to binoculars'}</option><option value="telescope">{sv ? 'Även teleskop' : 'All including telescope'}</option></select></label></div>
    <details className="ranking-method"><summary>{sv ? 'Så väljs förslagen' : 'How suggestions are chosen'}</summary><p>{sv ? 'Minst 10° över horisonten (15° för galaxer, nebulosor och stjärnhopar). Solen ska vara under −1° för ljusa planeter och månen, −6° för stjärnor och −12° för djuprymden, Uranus och Neptunus. Planeter behöver minst 15° vinkelavstånd från solen. Högre höjd och mörkare himmel prioriteras; en ljus måne ovanför horisonten sänker djuprymdens prioritet, särskilt nära objektet. Utrustning filtrerar listan. Cirka 10 minuters upplösning; ingen sannolikhet för faktisk synlighet beräknas. Stjärnbildernas demokurvor ingår inte.' : 'At least 10° above the horizon (15° for galaxies, nebulae and clusters). Sun below −1° for bright planets and the Moon, −6° for stars, and −12° for deep sky, Uranus and Neptune. Planets need at least 15° separation from the Sun. Higher altitude and darker sky take priority; a bright Moon above the horizon lowers deep-sky priority, especially nearby. Equipment filters the list. Approximately 10-minute sampling; no probability of actual visibility is calculated. Constellation demo curves are excluded.'}</p></details>
    <div className="section-heading"><h2>{sv ? 'Föreslagna objekt' : 'Suggested objects'} ({suggested.length})</h2></div>
    {suggested.length ? <div className="cards-grid">{suggested.map(item => renderCard(item.object, item))}</div> : <div className="empty"><p>{sv ? 'Inga objekt uppfyller kriterierna för denna natt och utrustning. Prova en annan natt eller plats.' : 'No targets meet the criteria for this night and equipment. Try another night or location.'}</p></div>}
    {other.length > 0 && <details className="outside-criteria"><summary>{sv ? 'Utanför kriterierna' : 'Outside the criteria'} ({other.length})</summary><div className="cards-grid">{other.map(item => renderCard(item.object, item))}</div></details>}
  </>;
}
