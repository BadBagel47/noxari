/**
 * F-062: HiPS (Hierarchical Progressive Survey) tiles of the DSS2 colour survey, for deep zoom.
 * HiPS tiles are HEALPix nested pixels: a tile at order k is a pixel at order k; its 512×512 image
 * covers the order k+9 pixels inside it. Directions map to tiles with the standard HEALPix
 * loc2xyf (Górski et al. 2005), and to a pixel inside the tile image via HIPS_TILE_PIXEL below.
 */
export const HIPS_TILE = 512;
const TILE_BITS = 9;
/** ESA ESASky mirror of the CDS DSS2 colour HiPS (CORS enabled); credit: STScI/NASA, coloured by CDS. */
export const DSS_HIPS = {url: 'https://skies.esac.esa.int/DSSColor', maxOrder: 9, format: 'jpg'};

export type FaceXY = {face: number; ix: number; iy: number};

/** HEALPix (face, ix, iy) for a unit direction at resolution nside (power of two). */
export function loc2xyf(z: number, phi: number, nside: number): FaceXY {
  const za = Math.abs(z);
  const tt = (((phi * 2 / Math.PI) % 4) + 4) % 4;
  if (za <= 2 / 3) {
    const temp1 = nside * (.5 + tt), temp2 = nside * (z * .75);
    const jp = Math.floor(temp1 - temp2), jm = Math.floor(temp1 + temp2);
    const ifp = Math.floor(jp / nside), ifm = Math.floor(jm / nside);
    const face = ifp === ifm ? (ifp | 4) : ifp < ifm ? ifp : ifm + 8;
    return {face, ix: jm & (nside - 1), iy: nside - (jp & (nside - 1)) - 1};
  }
  const ntt = Math.min(3, Math.floor(tt)), tp = tt - ntt;
  const tmp = nside * Math.sqrt(3 * (1 - za));
  const jp = Math.min(nside - 1, Math.floor(tp * tmp)), jm = Math.min(nside - 1, Math.floor((1 - tp) * tmp));
  return z >= 0 ? {face: ntt, ix: nside - jm - 1, iy: nside - jp - 1} : {face: ntt + 8, ix: jp, iy: jm};
}

/** Interleave the bits of x (even positions) and y (odd positions): HEALPix nested index within a face. */
export function interleave(x: number, y: number) {
  let result = 0;
  for (let bit = 0, weight = 1; (x | y) >> bit; bit++, weight *= 4) result += (((x >> bit) & 1) + 2 * ((y >> bit) & 1)) * weight;
  return result;
}

/** Nested tile number at `order` and pixel inside the 512×512 tile image for a J2000 direction (RA, Dec in radians). */
export function hipsLocate(ra: number, dec: number, order: number) {
  const nside = 2 ** (order + TILE_BITS);
  const {face, ix, iy} = loc2xyf(Math.sin(dec), ra, nside);
  const tx = ix >> TILE_BITS, ty = iy >> TILE_BITS;
  const tile = face * 4 ** order + interleave(tx, ty);
  return {tile, ...hipsTilePixel(ix & (HIPS_TILE - 1), iy & (HIPS_TILE - 1))};
}

/**
 * Allocation-free variant for per-sample use: returns the tile number and writes the byte offset of
 * the pixel inside the tile's RGBA data to out[0]. Same result as hipsLocate.
 */
export function hipsLocateFast(ra: number, sinDec: number, order: number, out: Int32Array) {
  const nside = 2 ** (order + TILE_BITS), za = Math.abs(sinDec);
  const tt = (((ra * 2 / Math.PI) % 4) + 4) % 4;
  let face: number, ix: number, iy: number;
  if (za <= 2 / 3) {
    const temp1 = nside * (.5 + tt), temp2 = nside * (sinDec * .75);
    const jp = Math.floor(temp1 - temp2), jm = Math.floor(temp1 + temp2);
    const ifp = Math.floor(jp / nside), ifm = Math.floor(jm / nside);
    face = ifp === ifm ? (ifp | 4) : ifp < ifm ? ifp : ifm + 8;
    ix = jm & (nside - 1); iy = nside - (jp & (nside - 1)) - 1;
  } else {
    const ntt = Math.min(3, Math.floor(tt)), tp = tt - ntt, tmp = nside * Math.sqrt(3 * (1 - za));
    const jp = Math.min(nside - 1, Math.floor(tp * tmp)), jm = Math.min(nside - 1, Math.floor((1 - tp) * tmp));
    if (sinDec >= 0) { face = ntt; ix = nside - jm - 1; iy = nside - jp - 1; } else { face = ntt + 8; ix = jp; iy = jm; }
  }
  out[0] = ((ix & (HIPS_TILE - 1)) * HIPS_TILE + (iy & (HIPS_TILE - 1))) * 4;
  return face * 4 ** order + interleave(ix >> TILE_BITS, iy >> TILE_BITS);
}

/**
 * HiPS image layout: inside a tile, the face y coordinate is the image column and face x the
 * image row (top = 0). Verified 2026-11-13 against DSS2 colour tiles: catalogue stars land on bright
 * pixels only with this mapping (mean brightness ≈ 250 against ≤ 85 for the other seven).
 */
export function hipsTilePixel(localX: number, localY: number) {
  return {col: localY, row: localX};
}

export const hipsTileUrl = (base: string, order: number, tile: number, format = 'jpg') =>
  `${base}/Norder${order}/Dir${Math.floor(tile / 10000) * 10000}/Npix${tile}.${format}`;

/** Tile order whose pixels are about one screen pixel: `degreesPerPixel` is the view's angular pixel size. */
export function hipsOrderFor(degreesPerPixel: number, maxOrder = DSS_HIPS.maxOrder) {
  // A tile at order k spans ≈ 58.6° / 2^k, so a tile pixel is that / 512.
  const order = Math.ceil(Math.log2(58.6 / (HIPS_TILE * Math.max(1e-6, degreesPerPixel))));
  return Math.max(3, Math.min(maxOrder, order));
}
