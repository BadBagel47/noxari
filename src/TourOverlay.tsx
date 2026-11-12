import {ChevronLeft, ChevronRight, Compass, Clapperboard, Play, Square} from 'lucide-react';
import {useEffect, useState} from 'react';
import type {SpaceObject} from './data';
import {KindIcon, kindIconName} from './KindIcon';
import type {ObjectFacts} from './objectFacts';
import type {TourMode, TourSource} from './tour';

type Lang = 'en' | 'sv';
const t = (lang: Lang, en: string, sv: string) => lang === 'sv' ? sv : en;

/** F-044: start sheet — choose the list and how to be guided. */
export function TourStart({language, source, onSource, savedCount, tonightCount, canPoint, onStart}: {
  language: Lang; source: TourSource; onSource: (source: TourSource) => void; savedCount: number; tonightCount: number;
  canPoint: boolean; onStart: (mode: TourMode) => void;
}) {
  const lang = language, empty = (source === 'saved' ? savedCount : tonightCount) === 0;
  return <section className="tour-start" aria-label={t(lang, 'Guided tour', 'Visning')}>
    <h2 className="sheet-label">{t(lang, 'List', 'Lista')}</h2>
    <div className="segmented wide" role="group" aria-label={t(lang, 'List', 'Lista')}>
      <button className={source === 'saved' ? 'chosen' : ''} aria-pressed={source === 'saved'} onClick={() => onSource('saved')}>{t(lang, 'My saved', 'Mina sparade')} ({savedCount})</button>
      <button className={source === 'tonight' ? 'chosen' : ''} aria-pressed={source === 'tonight'} onClick={() => onSource('tonight')}>{t(lang, 'Tonight’s picks', 'Kvällens förslag')} ({tonightCount})</button>
    </div>
    {empty && <p className="panel-note">{source === 'saved' ? t(lang, 'Save some objects first (bookmark in an object card), or choose Tonight’s picks.', 'Spara några objekt först (bokmärket i objektkortet), eller välj Kvällens förslag.') : t(lang, 'No suggestions for tonight at this place and time.', 'Inga förslag för i natt på den här platsen och tiden.')}</p>}
    <h2 className="sheet-label">{t(lang, 'How', 'Hur')}</h2>
    <div className="tour-modes">
      <button disabled={empty || !canPoint} onClick={() => onStart('point')}><Compass size={24}/><span><strong>{t(lang, 'Point yourself', 'Peka själv')}</strong><small>{canPoint ? t(lang, 'The object guide shows where to aim your phone. Tap Next when you are ready.', 'Objektguiden visar vart du ska rikta mobilen. Tryck Nästa när du vill gå vidare.') : t(lang, 'Needs a phone or tablet with a compass, so it is not available on this device. Use Show me instead.', 'Kräver en mobil eller surfplatta med kompass och går därför inte på den här enheten. Använd Visa åt mig i stället.')}</small></span></button>
      <button disabled={empty} onClick={() => onStart('show')}><Play size={24}/><span><strong>{t(lang, 'Show me', 'Visa åt mig')}</strong><small>{t(lang, 'The sky glides to each object. You tap Next yourself.', 'Himlen glider till varje objekt. Du trycker Nästa själv.')}</small></span></button>
      <button disabled={empty} onClick={() => onStart('demo')}><Clapperboard size={24}/><span><strong>{t(lang, 'Demo mode', 'Demoläge')}</strong><small>{t(lang, 'Plays by itself in full screen with name, type, distance and size. Tap anywhere to end.', 'Går av sig själv i helskärm med namn, typ, avstånd och storlek. Tryck var som helst för att avsluta.')}</small></span></button>
    </div>
    <p className="panel-note">{t(lang, 'Objects below the horizon right now are skipped.', 'Objekt som just nu är under horisonten hoppas över.')}</p>
  </section>;
}

/** F-044: Previous / Next / Stop in place of the dock while a tour runs. */
export function TourBar({language, mode, index, count, object, type, onPrevious, onNext, onStop}: {
  language: Lang; mode: TourMode; index: number; count: number; object: SpaceObject; type: string;
  onPrevious: () => void; onNext: () => void; onStop: () => void;
}) {
  const lang = language, name = lang === 'sv' ? object.sv : object.en;
  return <section className="tour-bar" aria-label={t(lang, 'Guided tour', 'Visning')}>
    <button aria-label={t(lang, 'Previous object', 'Föregående objekt')} disabled={index === 0} onClick={onPrevious}><ChevronLeft size={24}/></button>
    <div className="tour-info" aria-live="polite">
      <small>{index + 1} / {count} · {mode === 'point' ? t(lang, 'Aim your phone', 'Rikta mobilen') : t(lang, 'Tour', 'Visning')}</small>
      <strong><KindIcon name={kindIconName(object)} size={18} color={object.color}/>{name}</strong>
      <span>{type}</span>
    </div>
    <button className="tour-next" aria-label={t(lang, 'Next object', 'Nästa objekt')} disabled={index >= count - 1} onClick={onNext}><ChevronRight size={24}/></button>
    <button className="tour-stop" aria-label={t(lang, 'Stop the tour', 'Stoppa visningen')} onClick={onStop}><Square size={18}/></button>
  </section>;
}

/** F-045: full-screen self-running demo — title card, progress and a tap-to-end surface. */
export function DemoOverlay({language, caption, index, count, onStop}: {
  language: Lang; caption: {object: SpaceObject; type: string; facts: ObjectFacts; constellation: string; leaving: boolean; key: number} | null;
  index: number; count: number; onStop: () => void;
}) {
  const lang = language;
  const [hint, setHint] = useState(true);
  useEffect(() => { const timer = setTimeout(() => setHint(false), 3500); return () => clearTimeout(timer); }, []);
  const rows: [string, string | undefined][] = caption ? [
    [t(lang, 'Distance', 'Avstånd'), caption.facts.distance],
    [t(lang, 'Size in the sky', 'Storlek på himlen'), caption.facts.apparentSize],
    [t(lang, 'Actual size', 'Verklig storlek'), caption.facts.trueSize],
    [t(lang, 'Constellation', 'Stjärnbild'), caption.constellation && !/varies/i.test(caption.constellation) ? caption.constellation : undefined],
  ] : [];
  return <div className="demo-overlay" role="button" tabIndex={0} aria-label={t(lang, 'End demo mode', 'Avsluta demoläget')}
    onPointerDown={event => { event.preventDefault(); onStop(); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') { event.preventDefault(); onStop(); } }}>
    {caption && <div className={`demo-caption${caption.leaving ? ' leaving' : ''}`} key={caption.key} aria-live="polite">
      <span className="demo-kicker"><KindIcon name={kindIconName(caption.object)} size={20} color={caption.object.color}/>{caption.type}</span>
      <h2>{lang === 'sv' ? caption.object.sv : caption.object.en}</h2>
      <dl>{rows.filter(([, value]) => value).map(([label, value], row) => <div key={label} style={{animationDelay: `${450 + row * 160}ms`}}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div>}
    <div className="demo-progress" aria-hidden="true">{Array.from({length: count}, (_, i) => <i key={i} className={i === index ? 'on' : i < index ? 'done' : ''}/>)}</div>
    <p className={`demo-hint${hint ? '' : ' gone'}`}>{t(lang, 'Tap anywhere to end the demo', 'Tryck var som helst för att avsluta')}</p>
  </div>;
}
