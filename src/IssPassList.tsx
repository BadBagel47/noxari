import {DateTime} from 'luxon';
import {useMemo} from 'react';
import type {ObservingLocation} from './astronomy';
import {issElementAgeDays, issPasses} from './iss';

/** F-032: upcoming ISS passes (next three days) in the ISS details panel. */
export function IssPassList({language, location, start, onShow, ready}: {language: 'en' | 'sv'; location: ObservingLocation; start: Date; onShow: (time: Date) => void; ready: boolean}) {
  const sv = language === 'sv';
  const passes = useMemo(() => ready ? issPasses(start, location, 72) : [], [ready, start.getTime(), location.latitude, location.longitude]);
  const age = ready ? issElementAgeDays(start) : null;
  const when = (time: Date, format = 'ccc d LLL · HH:mm') => DateTime.fromJSDate(time, {zone: location.timeZone}).setLocale(sv ? 'sv' : 'en').toFormat(format);
  if (!ready) return <p className="chart-note">{sv ? 'Banelement saknas just nu, så passager kan inte beräknas.' : 'Orbital elements are not available right now, so passes cannot be calculated.'}</p>;
  return <section className="iss-passes">
    <h3>{sv ? 'Passager kommande tre dygn' : 'Passes in the next three days'}</h3>
    {passes.length ? <div className="object-list">{passes.map(pass => <article className="object-row" key={pass.peak.getTime()}>
      <button className="row-main" onClick={() => onShow(pass.peak)}><span className="row-text"><strong>{when(pass.peak)} · {Math.round(pass.peakAltitude)}°</strong><small>{when(pass.rise, 'HH:mm')}–{when(pass.set, 'HH:mm')} · {pass.visible ? (sv ? 'synlig (solbelyst, mörk himmel)' : 'visible (sunlit, dark sky)') : (sv ? 'ej synlig (i skugga eller ljus himmel)' : 'not visible (in shadow or bright sky)')}</small></span><span className="event-go">{sv ? 'Visa' : 'Show'}</span></button>
    </article>)}</div> : <p className="chart-note">{sv ? 'Inga passager över 10° hittades.' : 'No passes above 10° found.'}</p>}
    <p className="chart-note">{sv ? `Beräknat från CelesTraks banelement (SGP4)${age !== null ? `, ${age.toFixed(1).replace('.', ',')} dygn gamla` : ''}. Tider ungefärliga; äldre element ger större fel.` : `Calculated from CelesTrak orbital elements (SGP4)${age !== null ? `, ${age.toFixed(1)} days old` : ''}. Times approximate; older elements give larger errors.`}</p>
  </section>;
}
