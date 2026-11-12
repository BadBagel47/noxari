import {it} from 'vitest';
import {constellationArtSky, affineFromTriangles} from '../src/constellationArt';
import {constellationArt} from '../src/generated/constellationArt';
import {catalogHorizontalTransform, createPreparedPerspectiveProjector, prepareHorizontalDirection} from '../src/skyProjection';
import {stockholm} from '../src/astronomy';

it('audit placement', () => {
  const time = new Date('2026-01-15T22:00:00Z');
  const sky = constellationArtSky(time, stockholm, 'all');
  const project = catalogHorizontalTransform(time, stockholm);
  const rows: string[] = [];
  for (const art of sky) {
    const src = constellationArt.find(a => a.id === art.id)!;
    const anchors = src.anchors.map(([u, v, , ra, dec]) => { const p = project(ra, dec); return {u, v, dir: {...p, ...prepareHorizontalDirection(p)}}; });
    const center = art.anchors[0];
    let worstErr = 0, worstRatio = 0, worstScale = 0;
    for (const dh of [-40, -20, 0, 20, 40]) for (const dp of [-25, 0, 25]) {
      const view = {heading: center.azimuth + dh, pitch: Math.max(-80, Math.min(80, center.altitude + dp))};
      const proj = createPreparedPerspectiveProjector(view, 390, 844, false, true, 1);
      const pts = art.anchors.map(proj);
      if (pts.some(p => !p)) continue;
      const m = affineFromTriangles(art.image, pts as {x: number; y: number}[]);
      if (!m) continue;
      const p = m.a * m.a + m.b * m.b, q = m.c * m.c + m.d * m.d, r = m.a * m.c + m.b * m.d;
      const root = Math.sqrt(Math.max(0, (p - q) ** 2 + 4 * r * r));
      const s1 = Math.sqrt((p + q + root) / 2), s2 = Math.sqrt(Math.max(0, (p + q - root) / 2));
      const truth = anchors.map(a => proj(a.dir));
      if (truth.some(t => !t)) continue;
      const spread = Math.max(...truth.map(t => Math.hypot(t!.x - truth[0]!.x, t!.y - truth[0]!.y)), 1);
      const err = Math.max(...anchors.map((a, i) => Math.hypot(m.a * a.u + m.c * a.v + m.e - truth[i]!.x, m.b * a.u + m.d * a.v + m.f - truth[i]!.y))) / spread;
      worstErr = Math.max(worstErr, err); worstRatio = Math.max(worstRatio, s1 / s2); worstScale = Math.max(worstScale, s1);
    }
    rows.push(`${art.id.padEnd(4)} err ${worstErr.toFixed(2)} ratio ${worstRatio.toFixed(2)} scale ${worstScale.toFixed(2)}`);
  }
  rows.sort((a, b) => Number(b.split('ratio ')[1].split(' ')[0]) - Number(a.split('ratio ')[1].split(' ')[0]));
  console.log(rows.slice(0, 25).join('\n'));
});
