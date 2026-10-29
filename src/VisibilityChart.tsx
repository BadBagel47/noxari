import {clockTime, type NightSample, type VisibilitySeries} from './astronomy';

export function peakSample(series: VisibilitySeries): NightSample | null {
  const visible = series.samples.filter(sample => sample.sunAltitude < series.maxSunAltitude && sample.altitude > 0);
  return visible.length ? visible.reduce((best, sample) => sample.altitude > best.altitude ? sample : best) : null;
}

export function VisibilityChart({series, large = false}: {series: VisibilitySeries; large?: boolean}) {
  const {samples, real} = series;
  const x = (index: number) => index * 320 / (samples.length - 1);
  const y = (altitude: number) => Math.max(3, Math.min(68, 62 - altitude * 0.7));
  const points = samples.map((sample, index) => `${x(index)},${y(sample.altitude)}`).join(' ');
  const peak = real ? peakSample(series) : null;
  const peakIndex = peak ? samples.indexOf(peak) : -1;
  const ticks = Array.from({length: 5}, (_, i) => Math.round(i * (samples.length - 1) / 4));
  const description = real
    ? `Calculated object altitude from ${clockTime(samples[0].time, series.timeZone)} to ${clockTime(samples[samples.length - 1].time, series.timeZone)}. Dark blue is astronomical darkness, lighter blue is twilight.`
    : 'Illustrative object altitude. The curve does not represent a real observation.';

  return <div className={'visibility ' + (large ? 'large' : '')}>
    <svg viewBox="0 0 320 87" role="img" aria-label={description}>
      <rect x="0" y="3" width="320" height="64" rx="5" fill="#14243a"/>
      {samples.slice(0, -1).map((sample, index) => {
        const next = samples[index + 1];
        const sun = (sample.sunAltitude + next.sunAltitude) / 2;
        const color = sun <= -18 ? '#163b60' : sun <= -12 ? '#365c7f' : sun <= -6 ? '#48647d' : sun < 0 ? '#796376' : '#202e40';
        return <rect key={index} x={x(index)} y="3" width={x(index + 1) - x(index) + 0.3} height="64" fill={color} opacity=".75"/>;
      })}
      {[20, 40, 60].map(altitude => <line key={altitude} x1="0" x2="320" y1={y(altitude)} y2={y(altitude)} stroke="#9cb2ca" opacity=".2" strokeDasharray="3 4"/>)}
      <line x1="0" x2="320" y1={y(0)} y2={y(0)} stroke="#b3c5da" opacity=".7"/>
      <polyline points={points} fill="none" stroke={real ? '#83c9ef' : '#c6a9ec'} strokeWidth={large ? 3 : 2.5} strokeLinecap="round" strokeLinejoin="round"/>
      {peak && <circle cx={x(peakIndex)} cy={y(peak.altitude)} r={large ? 4 : 3} fill="#fce6aa"/>}
      {ticks.map(index => <text key={index} x={x(index)} y="82" fontSize="10" textAnchor={index === 0 ? 'start' : index === samples.length - 1 ? 'end' : 'middle'} fill="#a9bed6">{clockTime(samples[index].time, series.timeZone)}</text>)}
    </svg>
  </div>;
}
