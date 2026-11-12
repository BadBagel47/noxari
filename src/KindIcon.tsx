import type {ReactElement} from 'react';
import type {SpaceObject} from './data';

/** F-038: one symbol per object type, shared by sky markers and lists. */
export type KindIconName = 'galaxy' | 'nebula' | 'planetary' | 'open' | 'globular' | 'planet' | 'dwarf' | 'asteroid' | 'comet' | 'moon' | 'sun' | 'star' | 'double' | 'constellation' | 'satellite' | 'candidate';

export function kindIconName(object: Pick<SpaceObject, 'kind' | 'subtype' | 'id'>): KindIconName {
  const subtype = object.subtype?.toLowerCase() ?? '';
  switch (object.kind) {
    case 'Satellite': return 'satellite';
    case 'Galaxy': return 'galaxy';
    case 'Nebula': return subtype.includes('planetary') ? 'planetary' : 'nebula';
    case 'Star cluster': return subtype.includes('globular') ? 'globular' : 'open';
    case 'Star cloud': return 'open';
    case 'Planet': return 'planet';
    case 'Moon': return object.id === 'sun' ? 'sun' : 'moon';
    case 'Dwarf planet': return 'dwarf';
    case 'Asteroid': return 'asteroid';
    case 'Dwarf planet candidate': return 'candidate';
    case 'Double star': return 'double';
    case 'Constellation': case 'Asterism': return 'constellation';
    default: return 'star';
  }
}

const galaxyArm = 'M23 20L23.2 20.6L23.1 21.2L22.6 21.8L21.8 22.5L20.5 22.9L18.9 23.2L17 23.2L15 22.9L13.1 22.1L11.5 21L10.4 19.5L10.1 17.6L10.8 15.6L12.6 13.6L15.7 11.8L20 10.5';

const paths: Record<KindIconName, ReactElement> = {
  galaxy: <><g transform="rotate(-42 20 20)"><path d={galaxyArm}/><path d={galaxyArm} transform="rotate(180 20 20)"/></g><circle cx="20" cy="20" r="3.4" fill="currentColor" stroke="none"/></>,
  nebula: <path d="M8 22c0-6 5-10 10-9 2-4 9-4 11 1 5 0 7 6 4 9 2 4-2 8-6 6-3 4-10 3-11-1-5 1-9-2-8-6z"/>,
  planetary: <><circle cx="20" cy="20" r="8"/><circle cx="20" cy="20" r="2" fill="currentColor" stroke="none"/><path d="M20 6v5M20 29v5M6 20h5M29 20h5"/></>,
  open: <><circle cx="20" cy="20" r="14" strokeDasharray="3 3"/><g fill="currentColor" stroke="none"><circle cx="15" cy="16" r="1.8"/><circle cx="24" cy="15" r="1.8"/><circle cx="20" cy="23" r="1.8"/><circle cx="26" cy="24" r="1.4"/><circle cx="14" cy="25" r="1.4"/></g></>,
  globular: <><circle cx="20" cy="20" r="13"/><path d="M20 7v26M7 20h26"/></>,
  planet: <><circle cx="20" cy="20" r="8"/><ellipse cx="20" cy="20" rx="16" ry="5" transform="rotate(-20 20 20)"/></>,
  dwarf: <><circle cx="20" cy="20" r="7"/><circle cx="20" cy="20" r="13" strokeDasharray="2 3"/></>,
  asteroid: <><path d="M11 17l6-7 9 1 5 8-3 9-9 3-7-5z"/><circle cx="18" cy="18" r="1.5"/><circle cx="24" cy="24" r="1.2"/></>,
  comet: <><circle cx="27" cy="13" r="4" fill="currentColor"/><path d="M24 16 7 33M23 12 9 26M28 17 15 31"/></>,
  moon: <path d="M27 31a12 12 0 1 1 0-22 10 10 0 0 0 0 22z"/>,
  sun: <><circle cx="20" cy="20" r="7"/><path d="M20 5v5M20 30v5M5 20h5M30 20h5M9.4 9.4l3.5 3.5M27.1 27.1l3.5 3.5M9.4 30.6l3.5-3.5M27.1 12.9l3.5-3.5"/></>,
  star: <circle cx="20" cy="20" r="5" fill="currentColor" stroke="none"/>,
  double: <><circle cx="15" cy="20" r="5" fill="currentColor" stroke="none"/><circle cx="27" cy="18" r="3"/></>,
  constellation: <><path d="M7 29 15 14l9 8 9-14"/><g fill="currentColor" stroke="none"><circle cx="7" cy="29" r="2"/><circle cx="15" cy="14" r="2"/><circle cx="24" cy="22" r="2"/><circle cx="33" cy="8" r="2"/></g></>,
  satellite: <><rect x="16" y="16" width="8" height="8" transform="rotate(45 20 20)"/><path d="M7 11l8 8M25 21l8 8"/></>,
  candidate: <><circle cx="20" cy="20" r="7"/><path d="M20 4v4M20 32v4M4 20h4M32 20h4"/><text x="20" y="24" fontSize="10" textAnchor="middle" fill="currentColor" stroke="none">?</text></>,
};

export function KindIcon({name, size = 20, className, color}: {name: KindIconName; size?: number; className?: string; color?: string}) {
  return <svg className={className} viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={color ? {color} : undefined} aria-hidden="true" focusable="false">{paths[name]}</svg>;
}

/** Point-like objects keep a glowing dot in the sky; extended objects use their symbol. */
export function usesSkySymbol(name: KindIconName) {
  return !['planet', 'moon', 'sun', 'star', 'double'].includes(name);
}

/** F-039: the Moon drawn with its calculated phase; the lit limb points toward the Sun on screen. */
export function MoonPhaseGlyph({fraction, angle, size = 22}: {fraction: number; angle: number; size?: number}) {
  const f = Math.max(0, Math.min(1, fraction));
  const rx = 9 * Math.abs(1 - 2 * f);
  return <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" focusable="false" style={{overflow: 'visible'}}>
    <circle cx="10" cy="10" r="9" fill="#1b2433" stroke="#8494ab" strokeOpacity=".45" strokeWidth=".6"/>
    {f > .005 && <path transform={`rotate(${angle.toFixed(1)} 10 10)`} d={f >= .995 ? 'M10 1 A9 9 0 1 1 9.99 1 Z' : `M10 1 A9 9 0 0 1 10 19 A${rx.toFixed(2)} 9 0 0 ${f > .5 ? 1 : 0} 10 1 Z`} fill="#f4f1e6"/>}
  </svg>;
}

/** Marker glyph inside a sky button; keeps the existing .sky-point ring/focus hooks. */
export function SkyMarkerPoint({object, moonPhase}: {object: SpaceObject; moonPhase?: {fraction: number; angle: number}}) {
  if (object.kind === 'Moon' && object.id === 'moon' && moonPhase) return <span className="sky-point sky-moon" style={{filter: 'drop-shadow(0 0 8px #f4f1e699)'}}><MoonPhaseGlyph fraction={moonPhase.fraction} angle={moonPhase.angle}/></span>;
  const name = kindIconName(object);
  if (!usesSkySymbol(name)) return <span className="sky-point" style={{width: object.size + 4, height: object.size + 4, background: object.color, boxShadow: `0 0 ${object.kind === 'Planet' ? 22 : 16}px ${object.kind === 'Planet' ? 4 : 0}px ${object.color}`}}/>;
  return <span className="sky-point sky-symbol" style={{color: object.color}}><KindIcon name={name} size={20}/></span>;
}
