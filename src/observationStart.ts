import {darkestNightSample, nightContext, type ObservingLocation} from './astronomy';

// Temporary user-requested testing default. Returning to Now remains explicit.
export function initialObservation(now: Date, location: ObservingLocation) {
  const night = nightContext(now, location);
  const darkest = darkestNightSample(night);
  return {time: darkest?.time ?? now, mode: darkest ? 'preview' as const : 'live' as const, night,
    warning: night.window.kind === 'polarDay' ? 'polarDay' as const : darkest && darkest.sunAltitude > -14 ? 'bright' as const : null};
}
