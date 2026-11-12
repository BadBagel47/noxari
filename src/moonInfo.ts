import {Body, Illumination, MoonPhase, Observer, SearchRiseSet} from 'astronomy-engine';
import type {ObservingLocation} from './astronomy';

/** F-031: Moon phase and the next rise/set after a given time (standard refracted horizon). */
export type MoonInfo = {illumination: number; phaseAngle: number; phase: 'new' | 'waxingCrescent' | 'firstQuarter' | 'waxingGibbous' | 'full' | 'waningGibbous' | 'lastQuarter' | 'waningCrescent'; rise: Date | null; set: Date | null};

export function moonPhaseName(angle: number): MoonInfo['phase'] {
  const a = ((angle % 360) + 360) % 360;
  if (a < 11.25 || a >= 348.75) return 'new';
  if (a < 78.75) return 'waxingCrescent';
  if (a < 101.25) return 'firstQuarter';
  if (a < 168.75) return 'waxingGibbous';
  if (a < 191.25) return 'full';
  if (a < 258.75) return 'waningGibbous';
  if (a < 281.25) return 'lastQuarter';
  return 'waningCrescent';
}

export function moonInfo(time: Date, location: ObservingLocation): MoonInfo {
  const observer = new Observer(location.latitude, location.longitude, 0);
  const phaseAngle = MoonPhase(time);
  const rise = SearchRiseSet(Body.Moon, observer, +1, time, 1.2);
  const set = SearchRiseSet(Body.Moon, observer, -1, time, 1.2);
  return {illumination: Illumination(Body.Moon, time).phase_fraction, phaseAngle, phase: moonPhaseName(phaseAngle), rise: rise?.date ?? null, set: set?.date ?? null};
}

export const moonPhaseLabel = (phase: MoonInfo['phase'], sv: boolean) => ({
  new: sv ? 'Nymåne' : 'New moon', waxingCrescent: sv ? 'Tilltagande skära' : 'Waxing crescent', firstQuarter: sv ? 'Första kvarteret' : 'First quarter',
  waxingGibbous: sv ? 'Tilltagande' : 'Waxing gibbous', full: sv ? 'Fullmåne' : 'Full moon', waningGibbous: sv ? 'Avtagande' : 'Waning gibbous',
  lastQuarter: sv ? 'Sista kvarteret' : 'Last quarter', waningCrescent: sv ? 'Avtagande skära' : 'Waning crescent',
}[phase]);
