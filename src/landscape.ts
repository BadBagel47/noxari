/**
 * F-057: a decorative horizon silhouette (low hills with stands of spruce and leafy trees),
 * identical for every place. It is NOT local terrain and changes no calculation; objects
 * behind it are still calculated as above the horizon.
 */
type Tree = {azimuth: number; width: number; height: number; spruce: boolean; phase: number};
const TREES: Tree[] = [];
{
  // Deterministic pseudo-random stands (seeded LCG) so the skyline never changes.
  let seed = 20261112;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let stand = 0; stand < 22; stand++) {
    const centre = random() * 360, spread = 3 + random() * 14, count = 4 + Math.floor(random() * 16), spruce = random() < .65;
    for (let i = 0; i < count; i++) {
      const height = (spruce ? 1.6 : 1.2) + random() * (spruce ? 3.6 : 2.4);
      TREES.push({azimuth: (centre + (random() - .5) * spread + 360) % 360, width: spruce ? height * (.18 + random() * .08) : height * (.35 + random() * .25), height, spruce: spruce ? random() < .85 : random() < .2, phase: random() * 6.28});
    }
  }
}

const delta = (a: number, b: number) => ((a - b + 540) % 360) - 180;

/** Silhouette height above the geometric horizon, in degrees, for an azimuth in degrees. */
export function landscapeHeight(azimuth: number) {
  const r = azimuth * Math.PI / 180;
  let height = .55 + .35 * Math.sin(3 * r + 1.1) + .22 * Math.sin(7 * r + 2.3) + .1 * Math.sin(19 * r + .4);
  for (const tree of TREES) {
    const d = delta(azimuth, tree.azimuth) / tree.width;
    if (Math.abs(d) >= 1) continue;
    const a = Math.abs(d);
    // Spruce: a narrow cone with saw-toothed branch tiers. Leafy tree: a rounded, lumpy crown.
    const profile = tree.spruce
      ? (1 - a) * (1 - .16 * Math.abs(Math.sin((1 - a) * tree.height * 7 + tree.phase)))
      : Math.sqrt(1 - a * a) * (.88 + .12 * Math.sin(d * 9 + tree.phase)) * (a < .12 ? 1 : .97);
    height = Math.max(height, .5 + tree.height * profile);
  }
  return Math.max(.12, height);
}
