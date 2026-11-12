import type {ReactNode} from 'react';
import {Bookmark} from 'lucide-react';
import {clockTime, type VisibilitySeries} from './astronomy';
import type {SpaceObject} from './data';
import {KindIcon, kindIconName} from './KindIcon';
import {peakSample} from './VisibilityChart';

/**
 * F-025 step 2: compact list row with a mini altitude curve. The curve runs
 * from evening (left) to morning (right); the line is the horizon, the dot is
 * the selected time and higher means higher in the sky.
 */
export function MiniCurve({series, time, label}: {series: VisibilitySeries; time: Date; label: string}) {
  const {samples} = series;
  if (samples.length < 2) return null;
  const width = 52, height = 28;
  const x = (index: number) => 1 + index * (width - 2) / (samples.length - 1);
  const y = (altitude: number) => Math.max(1.5, Math.min(height - 1.5, 21 - altitude * 0.21));
  const start = samples[0].time.getTime(), end = samples[samples.length - 1].time.getTime();
  const nowIndex = time.getTime() >= start && time.getTime() <= end
    ? samples.reduce((best, sample, index) => Math.abs(sample.time.getTime() - time.getTime()) < Math.abs(samples[best].time.getTime() - time.getTime()) ? index : best, 0) : -1;
  const now = nowIndex >= 0 ? samples[nowIndex] : null;
  return <svg className="mini-curve" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label}>
    <line x1="0" x2={width} y1={y(0)} y2={y(0)} stroke="#8fa6c0" strokeOpacity=".55" strokeWidth="1"/>
    <polyline points={samples.map((sample, index) => `${x(index).toFixed(1)},${y(sample.altitude).toFixed(1)}`).join(' ')} fill="none"
      stroke={series.real ? '#83c9ef' : '#c6a9ec'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    {now && <circle cx={x(nowIndex)} cy={y(now.altitude)} r="2.8" fill="#fce6aa" stroke="#0f1d30" strokeWidth="1"/>}
  </svg>;
}

export function ObjectRow({object, series, time, timeZone, language, name, kind, saved, onOpen, onToggleSave, extra}: {
  object: SpaceObject; series: VisibilitySeries | undefined; time: Date; timeZone: string; language: 'en' | 'sv'; name: string; kind: string;
  saved: boolean; onOpen: () => void; onToggleSave: () => void; extra?: ReactNode;
}) {
  const sv = language === 'sv';
  const peak = series?.real ? peakSample(series) : null;
  const tag = /^(m|ngc|ic)\d/.test(object.id) ? object.id.toUpperCase() : null;
  const best = !series ? null : !series.real ? (sv ? 'demokurva' : 'demo curve')
    : peak ? `${sv ? 'bäst' : 'best'} ${clockTime(peak.time, timeZone)} · ${Math.round(peak.altitude)}°` : (sv ? 'inte högt nog i natt' : 'not high enough tonight');
  const curveLabel = sv ? `Höjd under natten för ${name}. Linjen är horisonten, punkten är vald tid.` : `Altitude through the night for ${name}. The line is the horizon, the dot is the selected time.`;
  return <article className="object-row">
    <button className="row-main" onClick={onOpen}>
      <KindIcon className="card-icon" name={kindIconName(object)} size={24} color={object.color}/>
      <span className="row-text"><strong>{name}</strong><small>{[tag, kind, best].filter(Boolean).join(' · ')}</small></span>
      {series && <MiniCurve series={series} time={time} label={curveLabel}/>}
    </button>
    <button className={'save-btn' + (saved ? ' active' : '')} aria-pressed={saved} aria-label={saved ? (sv ? 'Ta bort bokmärke' : 'Remove bookmark') : (sv ? 'Bokmärk' : 'Bookmark')} title={saved ? (sv ? 'Ta bort bokmärke' : 'Remove bookmark') : (sv ? 'Bokmärk' : 'Bookmark')} onClick={onToggleSave}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'}/></button>
    {extra && <div className="row-extra">{extra}</div>}
  </article>;
}
