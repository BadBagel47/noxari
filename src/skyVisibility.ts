// Catalog stars fade as daylight brightens. The simulated lower sky is a
// separate view behind the fading ground, so its stars follow the reveal.
export function darkSkyVisibility(sunAltitude: number) {
  return Math.max(0, Math.min(1, (-sunAltitude - 2) / 12));
}

export function projectedStarVisibility(sunAltitude: number, starAltitude: number, belowHorizonReveal: number) {
  const normal = darkSkyVisibility(sunAltitude);
  return starAltitude < 0 ? Math.max(normal, belowHorizonReveal) : normal;
}
