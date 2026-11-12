// Catalog stars fade as daylight brightens. The simulated lower sky is a
// separate view behind the fading ground, so its stars follow the reveal.
export function darkSkyVisibility(sunAltitude: number) {
  return Math.max(0, Math.min(1, (-sunAltitude - 2) / 12));
}

export function projectedStarVisibility(sunAltitude: number, starAltitude: number, belowHorizonReveal: number) {
  const normal = darkSkyVisibility(sunAltitude);
  return starAltitude < 0 ? Math.max(normal, belowHorizonReveal) : normal;
}

/** Preserve existing star rendering through V=5.8, then fade added catalog stars to V=6.5. */
export function stellarBrightness(magnitude: number) {
  if (magnitude <= 5.8) return Math.max(0.18, Math.min(1, (6.1 - magnitude) / 5.8));
  return Math.max(0.05, 0.18 - (magnitude - 5.8) * (0.13 / 0.7));
}

/** Star disc radius (CSS px) by magnitude; F-049 widened the bright tiers for clearer contrast. */
export function starRadius(magnitude: number) {
  return magnitude < .5 ? 3 : magnitude < 2 ? 2.2 : magnitude < 3.5 ? 1.5 : .9;
}
