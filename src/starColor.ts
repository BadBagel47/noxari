/**
 * F-049: star colour from the B–V colour index (HYG), as a gentle, Stellarium-like
 * tint: hot stars blue-white, the Sun-like stars white-cream, cool giants orange.
 * Saturation is deliberately low; this is a display choice, not calibrated colour.
 */
const STOPS: [number, [number, number, number]][] = [
  [-.33, [155, 178, 255]], [0, [196, 212, 255]], [.3, [236, 240, 255]], [.58, [255, 247, 236]],
  [.81, [255, 234, 206]], [1.15, [255, 216, 172]], [1.6, [255, 190, 136]], [2, [255, 168, 112]],
];

export function starRgb(colorIndex: number | null | undefined): [number, number, number] {
  const ci = colorIndex ?? .45;
  if (ci <= STOPS[0][0]) return STOPS[0][1];
  for (let i = 1; i < STOPS.length; i++) {
    const [x1, c1] = STOPS[i];
    if (ci <= x1) {
      const [x0, c0] = STOPS[i - 1], k = (ci - x0) / (x1 - x0);
      return [0, 1, 2].map(j => Math.round(c0[j] + (c1[j] - c0[j]) * k)) as [number, number, number];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

const cache = new Map<number, string>();
/** CSS colour, cached in 0.05 steps so the Canvas path reuses a few dozen strings. */
export function starFill(colorIndex: number | null | undefined) {
  const key = Math.round((colorIndex ?? .45) * 20);
  let value = cache.get(key);
  if (!value) { value = `rgb(${starRgb(key / 20).join(',')})`; cache.set(key, value); }
  return value;
}
