import type {ObservingLocation} from './astronomy';
import {commonConstellationIds, type FigureMode} from './constellations';
import {constellationArt} from './generated/constellationArt';
import {catalogHorizontalTransform, prepareHorizontalDirection, type MapPoint, type PreparedHorizontalDirection} from './skyProjection';

/**
 * F-041: Stellarium "modern" sky-culture illustrations (Stellarium team,
 * Free Art License 1.3), tinted for Noxari. Each image is placed by three
 * anchor stars: the screen positions of those stars define an affine image
 * transform, so the figure follows the same projection as stars and lines.
 */
export type ArtSky = {id: string; w: number; h: number; image: [number, number][]; anchors: PreparedHorizontalDirection[]};

export function constellationArtSky(time: Date, location: ObservingLocation, mode: FigureMode): ArtSky[] {
  const project = catalogHorizontalTransform(time, location);
  return constellationArt.filter(art => mode === 'all' || commonConstellationIds.has(art.id)).map(art => ({
    id: art.id, w: art.w, h: art.h,
    image: art.anchors.map(([u, v]) => [u, v] as [number, number]),
    anchors: art.anchors.map(([, , , ra, dec]) => { const position = project(ra, dec); return {...position, ...prepareHorizontalDirection(position)}; }),
  }));
}

/** Solve the affine map (u, v) -> (x, y) through three point pairs; null if degenerate. */
export function affineFromTriangles(source: [number, number][], target: MapPoint[]) {
  const [[u0, v0], [u1, v1], [u2, v2]] = source;
  const det = u0 * (v1 - v2) - v0 * (u1 - u2) + (u1 * v2 - u2 * v1);
  if (Math.abs(det) < 1e-6) return null;
  const solve = (p0: number, p1: number, p2: number) => [
    (p0 * (v1 - v2) - v0 * (p1 - p2) + (p1 * v2 - p2 * v1)) / det,
    (u0 * (p1 - p2) - p0 * (u1 - u2) + (u1 * p2 - u2 * p1)) / det,
    (u0 * (v1 * p2 - v2 * p1) - v0 * (u1 * p2 - u2 * p1) + p0 * (u1 * v2 - u2 * v1)) / det,
  ];
  const [a, c, e] = solve(target[0].x, target[1].x, target[2].x);
  const [b, d, f] = solve(target[0].y, target[1].y, target[2].y);
  return {a, b, c, d, e, f};
}

/** Lazily loaded tinted images; the callback asks the shared frame loop for a redraw. */
export class ConstellationArtImages {
  private images = new Map<string, HTMLImageElement>();
  constructor(private base: string) {}
  get(id: string, onLoad: () => void) {
    let image = this.images.get(id);
    if (!image) {
      image = new Image();
      image.decoding = 'async';
      image.onload = onLoad;
      image.src = `${this.base}constellation-art/${id}.webp`;
      this.images.set(id, image);
    }
    return image.complete && image.naturalWidth > 0 ? image : null;
  }
}

export function drawConstellationArt(context: CanvasRenderingContext2D, sky: ArtSky[], project: (position: PreparedHorizontalDirection) => MapPoint | null,
  width: number, height: number, alpha: number, images: ConstellationArtImages, onLoad: () => void) {
  if (alpha <= 0.01) return;
  for (const art of sky) {
    const points = art.anchors.map(project);
    if (points.some(point => !point)) continue;
    const m = affineFromTriangles(art.image, points as MapPoint[]);
    if (!m) continue;
    // Reject placements the affine fit cannot represent well: anchors far outside
    // the view (strong perspective), extreme scale or strong shear/stretch.
    if ((points as MapPoint[]).some(point => Math.abs(point.x - width / 2) > width * 1.6 || Math.abs(point.y - height / 2) > height * 1.6)) continue;
    const p = m.a * m.a + m.b * m.b, q = m.c * m.c + m.d * m.d, r = m.a * m.c + m.b * m.d;
    const root = Math.sqrt(Math.max(0, (p - q) * (p - q) + 4 * r * r));
    const s1 = Math.sqrt((p + q + root) / 2), s2 = Math.sqrt(Math.max(0, (p + q - root) / 2));
    if (!Number.isFinite(s1) || s1 > 12 || s2 < 0.02 || s1 / s2 > 3.2) continue;
    const corners = [[0, 0], [art.w, 0], [0, art.h], [art.w, art.h]].map(([u, v]) => [m.a * u + m.c * v + m.e, m.b * u + m.d * v + m.f]);
    const xs = corners.map(c => c[0]), ys = corners.map(c => c[1]);
    if (Math.max(...xs) < 0 || Math.min(...xs) > width || Math.max(...ys) < 0 || Math.min(...ys) > height) continue;
    const image = images.get(art.id, onLoad);
    if (!image) continue;
    context.save();
    context.globalAlpha = alpha;
    context.transform(m.a, m.b, m.c, m.d, m.e, m.f);
    context.drawImage(image, 0, 0, art.w, art.h);
    context.restore();
  }
}
