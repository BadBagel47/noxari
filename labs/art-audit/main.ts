// Development-only audit: every constellation drawing against its stars and figure lines.
import {constellationArtSky, drawConstellationArt, ConstellationArtImages} from '../../src/constellationArt';
import {constellationArt} from '../../src/generated/constellationArt';
import {constellationFigures} from '../../src/generated/constellations';
import {brightStars} from '../../src/generated/brightStars';
import {catalogHorizontalTransform, createPreparedPerspectiveProjector, prepareHorizontalDirection} from '../../src/skyProjection';
import {stockholm} from '../../src/astronomy';

const offset = Number(new URLSearchParams(location.search).get('offset') ?? 0);
const time = new Date('2026-01-15T22:00:00Z');
const project = catalogHorizontalTransform(time, stockholm);
const sky = constellationArtSky(time, stockholm, 'all');
const byHip = new Map(brightStars.filter(s => s[6]).map(s => [s[6]!, s]));
const images = new ConstellationArtImages('/noxari/');
const W = 200, H = 300;
const cells = sky.map(art => {
  const div = document.createElement('div'); const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H; div.append(canvas); const label = document.createElement('span'); label.textContent = art.id; div.append(label); document.body.append(div);
  return {art, canvas};
});
const draw = () => {
  for (const {art, canvas} of cells) {
    const ctx = canvas.getContext('2d')!; ctx.clearRect(0, 0, W, H);
    const c = art.anchors[0];
    const proj = createPreparedPerspectiveProjector({heading: c.azimuth + offset, pitch: c.altitude}, W, H, false, true, 1.3);
    drawConstellationArt(ctx, [art], proj, W, H, 1, images, () => setTimeout(draw, 50));
    const fig = constellationFigures.find(f => f.id === art.id);
    ctx.strokeStyle = 'rgba(255,200,120,.9)'; ctx.lineWidth = 1;
    for (const line of fig?.lines ?? []) {
      ctx.beginPath(); let open = false;
      for (const hip of line) { const s = byHip.get(hip); if (!s) { open = false; continue; } const p = project(s[0], s[1]); const pt = proj({...p, ...prepareHorizontalDirection(p)}); if (!pt) { open = false; continue; } if (open) ctx.lineTo(pt.x, pt.y); else ctx.moveTo(pt.x, pt.y); open = true; }
      ctx.stroke();
    }
    ctx.fillStyle = '#ff5050';
    for (const [, , , ra, dec] of constellationArt.find(a => a.id === art.id)!.anchors) { const p = project(ra, dec); const pt = proj({...p, ...prepareHorizontalDirection(p)}); if (pt) { ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.5, 0, 7); ctx.fill(); } }
  }
};
draw(); setTimeout(draw, 1500); setTimeout(draw, 3000);
