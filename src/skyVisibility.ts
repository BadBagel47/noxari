// Catalog stars fade as daylight brightens. The simulated lower sky is a
// separate view behind the fading ground, so its stars follow the reveal.
export function darkSkyVisibility(sunAltitude: number) {
  return Math.max(0, Math.min(1, (-sunAltitude - 2) / 12));
}

export function projectedStarVisibility(sunAltitude: number, starAltitude: number, belowHorizonReveal: number) {
  const normal = darkSkyVisibility(sunAltitude);
  return starAltitude < 0 ? Math.max(normal, belowHorizonReveal) : normal;
}

/**
 * F-057: perceived brightness, closer to how the eye (and Stellarium) presents the sky:
 * stars to V≈2 at full strength, V 3–4 still clearly visible, then a steady fall so the
 * faintest naked-eye stars remain a fine texture. Dim stars stay dimmer than bright ones.
 */
export function stellarBrightness(magnitude: number) {
  const points: [number, number][] = [[2, 1], [4, .75], [5, .45], [6, .2], [6.5, .08]];
  if (magnitude <= points[0][0]) return 1;
  for (let i = 1; i < points.length; i++) {
    const [m1, b1] = points[i];
    if (magnitude <= m1) { const [m0, b0] = points[i - 1]; return b0 + (b1 - b0) * (magnitude - m0) / (m1 - m0); }
  }
  return .08;
}

/** Star disc radius (CSS px) by magnitude; F-049 widened the bright tiers for clearer contrast. */
export function starRadius(magnitude: number) {
  return magnitude < .5 ? 3 : magnitude < 2 ? 2.2 : magnitude < 4 ? 1.5 : .9;
}
