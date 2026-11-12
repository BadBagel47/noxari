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

/** Unit vector for J2000 RA (hours) / Dec (degrees). */
const unit = (ra: number, dec: number) => {
  const a = ra * Math.PI / 12, d = dec * Math.PI / 180;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)] as const;
};

/**
 * Fit each image to the sky once, in a gnomonic tangent plane around its
 * anchor stars, then derive three well-spread reference points around the
 * image centre. Placing the image through those points (a local linear map at
 * its centre) avoids the blow-ups an affine through three closely spaced or
 * nearly collinear anchors produces once perspective bends the anchors.
 */
const references = constellationArt.map(art => {
  const vectors = art.anchors.map(([, , , ra, dec]) => unit(ra, dec));
  const sum = vectors.reduce((acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]], [0, 0, 0]);
  const length = Math.hypot(sum[0], sum[1], sum[2]);
  const c = [sum[0] / length, sum[1] / length, sum[2] / length];
  // Tangent basis: east (e) and north (n) at the centre.
  const e0 = [-c[1], c[0], 0]; const el = Math.hypot(e0[0], e0[1]) || 1;
  const e = [e0[0] / el, e0[1] / el, 0];
  const n = [c[1] * e[2] - c[2] * e[1], c[2] * e[0] - c[0] * e[2], c[0] * e[1] - c[1] * e[0]];
  const toPlane = (v: readonly number[]) => {
    const dot = v[0] * c[0] + v[1] * c[1] + v[2] * c[2];
    return {x: (v[0] * e[0] + v[1] * e[1] + v[2] * e[2]) / dot, y: (v[0] * n[0] + v[1] * n[1] + v[2] * n[2]) / dot};
  };
  const fit = affineFromTriangles(art.anchors.map(([u, v]) => [u, v] as [number, number]), vectors.map(toPlane));
  if (!fit) return null;
  const image: [number, number][] = [[art.w / 2, art.h / 2], [art.w * .75, art.h / 2], [art.w / 2, art.h * .75]];
  const sky = image.map(([u, v]) => {
    const x = fit.a * u + fit.c * v + fit.e, y = fit.b * u + fit.d * v + fit.f;
    const w = [c[0] + x * e[0] + y * n[0], c[1] + x * e[1] + y * n[1], c[2] + x * e[2] + y * n[2]];
    const r = Math.hypot(w[0], w[1], w[2]);
    return [((Math.atan2(w[1], w[0]) * 12 / Math.PI) + 24) % 24, Math.asin(w[2] / r) * 180 / Math.PI] as [number, number];
  });
  return {id: art.id, w: art.w, h: art.h, image, sky};
});

export function constellationArtSky(time: Date, location: ObservingLocation, mode: FigureMode): ArtSky[] {
  const project = catalogHorizontalTransform(time, location);
  return references.filter((ref): ref is NonNullable<typeof ref> => ref !== null && (mode === 'all' || commonConstellationIds.has(ref.id))).map(ref => ({
    id: ref.id, w: ref.w, h: ref.h, image: ref.image,
    anchors: ref.sky.map(([ra, dec]) => { const position = project(ra, dec); return {...position, ...prepareHorizontalDirection(position)}; }),
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

/**
 * Perspective views: fade a drawing out as its centre moves away from the view
 * direction (full up to 42°, gone at 58°). Near 90° the perspective blows the
 * image up across the whole screen, so far-off drawings are not drawn at all.
 */
export function artViewFade(center: PreparedHorizontalDirection, view: {heading: number; pitch: number}) {
  const h = view.heading * Math.PI / 180, p = view.pitch * Math.PI / 180;
  const cosAngle = center.cosAltitude * Math.cos(p) * (center.cosAzimuth * Math.cos(h) + center.sinAzimuth * Math.sin(h)) + center.sinAltitude * Math.sin(p);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;
  const k = Math.max(0, Math.min(1, (58 - angle) / 16));
  return k * k * (3 - 2 * k);
}

export function drawConstellationArt(context: CanvasRenderingContext2D, sky: ArtSky[], project: (position: PreparedHorizontalDirection) => MapPoint | null,
  width: number, height: number, alpha: number, images: ConstellationArtImages, onLoad: () => void, view?: {heading: number; pitch: number}) {
  if (alpha <= 0.01) return;
  for (const art of sky) {
    const viewFade = view ? artViewFade(art.anchors[0], view) : 1;
    if (viewFade <= 0.01) continue;
    const points = art.anchors.map(project);
    if (points.some(point => !point)) continue;
    const m = affineFromTriangles(art.image, points as MapPoint[]);
    if (!m) continue;
    // Reject placements the affine fit cannot represent well: anchors far outside
    // the view (strong perspective), extreme scale or strong shear/stretch.
    if (Math.abs(points[0]!.x - width / 2) > width * 1.5 || Math.abs(points[0]!.y - height / 2) > height * 1.5) continue;
    const p = m.a * m.a + m.b * m.b, q = m.c * m.c + m.d * m.d, r = m.a * m.c + m.b * m.d;
    const root = Math.sqrt(Math.max(0, (p - q) * (p - q) + 4 * r * r));
    const s1 = Math.sqrt((p + q + root) / 2), s2 = Math.sqrt(Math.max(0, (p + q - root) / 2));
    if (!Number.isFinite(s1) || s1 > 16 || s2 < 0.02 || s1 / s2 > 4) continue;
    const corners = [[0, 0], [art.w, 0], [0, art.h], [art.w, art.h]].map(([u, v]) => [m.a * u + m.c * v + m.e, m.b * u + m.d * v + m.f]);
    const xs = corners.map(c => c[0]), ys = corners.map(c => c[1]);
    if (Math.max(...xs) < 0 || Math.min(...xs) > width || Math.max(...ys) < 0 || Math.min(...ys) > height) continue;
    const image = images.get(art.id, onLoad);
    if (!image) continue;
    context.save();
    context.globalAlpha = alpha * viewFade;
    context.transform(m.a, m.b, m.c, m.d, m.e, m.f);
    context.drawImage(image, 0, 0, art.w, art.h);
    context.restore();
  }
}
