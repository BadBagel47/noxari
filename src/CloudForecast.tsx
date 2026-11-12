import {Cloud, CloudOff} from 'lucide-react';
import {useEffect, useState} from 'react';
import {clockTime, type NightWindow, type ObservingLocation} from './astronomy';

/**
 * F-030: hourly total cloud cover for tonight from Open-Meteo (CC BY 4.0).
 * Opt-in: the place is rounded to one decimal (about 10 km) before it leaves
 * the device. A forecast, not a guarantee; haze, light pollution and local
 * conditions are not included.
 */
const CONSENT = 'noxari-weather-consent';
type Hour = {time: Date; cover: number};
const cache = new Map<string, Promise<Hour[]>>();

export function roundedForecastUrl(latitude: number, longitude: number) {
  const lat = Math.round(latitude * 10) / 10, lon = Math.round(longitude * 10) / 10;
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cloud_cover&forecast_days=3&timezone=UTC`;
}

function load(location: ObservingLocation) {
  const url = roundedForecastUrl(location.latitude, location.longitude);
  let pending = cache.get(url);
  if (!pending) {
    pending = fetch(url).then(response => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then((data: {hourly?: {time?: string[]; cloud_cover?: number[]}}) => (data.hourly?.time ?? []).map((time, index) => ({time: new Date(time + 'Z'), cover: data.hourly!.cloud_cover?.[index] ?? NaN})).filter(hour => Number.isFinite(hour.cover)));
    pending.catch(() => cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}

export function summarizeClouds(hours: Hour[], sv: boolean, timeZone: string) {
  if (!hours.length) return '';
  const clear = hours.filter(hour => hour.cover <= 30);
  const average = hours.reduce((sum, hour) => sum + hour.cover, 0) / hours.length;
  if (clear.length === hours.length) return sv ? 'Mest klart hela natten' : 'Mostly clear all night';
  if (!clear.length) return average > 80 ? (sv ? 'Mulet hela natten' : 'Overcast all night') : (sv ? 'Växlande molnighet hela natten' : 'Variable cloud all night');
  return `${sv ? 'Klarast' : 'Clearest'} ≈ ${clockTime(clear[0].time, timeZone)}–${clockTime(new Date(clear[clear.length - 1].time.getTime() + 3_600_000), timeZone)}`;
}

export function CloudForecast({location, window: night, language}: {location: ObservingLocation; window: NightWindow; language: 'en' | 'sv'}) {
  const sv = language === 'sv';
  const [consent, setConsent] = useState(() => localStorage.getItem(CONSENT) === '1');
  const [state, setState] = useState<{status: 'idle' | 'loading' | 'ready' | 'error'; hours: Hour[]}>({status: 'idle', hours: []});
  useEffect(() => {
    if (!consent) return;
    let live = true;
    setState(current => ({...current, status: 'loading'}));
    load(location).then(hours => { if (live) setState({status: 'ready', hours: hours.filter(hour => hour.time >= night.start && hour.time <= night.end)}); })
      .catch(() => { if (live) setState({status: 'error', hours: []}); });
    return () => { live = false; };
  }, [consent, location.latitude, location.longitude, night.start.getTime(), night.end.getTime()]);

  if (!consent) return <section className="cloud-box">
    <div className="cloud-head"><Cloud size={20}/><strong>{sv ? 'Molnprognos' : 'Cloud forecast'}</strong></div>
    <p>{sv ? 'Hämtas från Open-Meteo. Din plats avrundas till cirka 10 km innan den skickas.' : 'Fetched from Open-Meteo. Your place is rounded to about 10 km before it is sent.'}</p>
    <button className="wide-action" onClick={() => { localStorage.setItem(CONSENT, '1'); setConsent(true); }}>{sv ? 'Visa molnprognos' : 'Show cloud forecast'}</button>
  </section>;

  const hours = state.hours;
  return <section className="cloud-box" aria-live="polite">
    <div className="cloud-head">{state.status === 'error' ? <CloudOff size={20}/> : <Cloud size={20}/>}<strong>{sv ? 'Molnprognos' : 'Cloud forecast'}</strong>
      <span>{state.status === 'loading' ? (sv ? 'Hämtar…' : 'Loading…') : state.status === 'error' ? (sv ? 'Inte tillgänglig just nu (ingen uppkoppling?)' : 'Not available right now (offline?)') : summarizeClouds(hours, sv, location.timeZone)}</span></div>
    {state.status === 'ready' && hours.length > 0 && <div className="cloud-bars" role="img" aria-label={hours.map(hour => `${clockTime(hour.time, location.timeZone)} ${Math.round(hour.cover)} %`).join(', ')}>
      {hours.map(hour => <span key={hour.time.getTime()} className="cloud-bar"><i style={{height: `${Math.max(4, hour.cover)}%`, opacity: .35 + hour.cover / 160}}/><small>{clockTime(hour.time, location.timeZone).slice(0, 2)}</small></span>)}
    </div>}
    {state.status === 'ready' && !hours.length && <p>{sv ? 'Ingen prognos för den här natten (endast tre dygn framåt).' : 'No forecast for this night (three days ahead only).'}</p>}
    <p className="cloud-note">{sv ? 'Total molnmängd per timme. En prognos, ingen garanti. ' : 'Total cloud cover per hour. A forecast, not a guarantee. '}<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · CC BY 4.0 · <button className="link-button inline" onClick={() => { localStorage.removeItem(CONSENT); setConsent(false); }}>{sv ? 'Stäng av' : 'Turn off'}</button></p>
  </section>;
}
