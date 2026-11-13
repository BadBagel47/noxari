import {describe, expect, it} from 'vitest';
import {hipsLocate, hipsOrderFor, hipsTilePixel, hipsTileUrl, interleave, loc2xyf} from '../src/hips';
import {hipsAlpha} from '../src/hipsPainter';

describe('HiPS tiles (F-062)', () => {
  it('puts the poles and the equator on the right HEALPix base faces', () => {
    expect(loc2xyf(1, 0.1, 1).face).toBeLessThan(4);
    expect(loc2xyf(-1, 0.1, 1).face).toBeGreaterThanOrEqual(8);
    const equator = loc2xyf(0, 0, 1);
    expect(equator.face).toBe(4);
    // Nested numbering at nside 1 is the face number itself.
    expect(hipsLocate(0, 0, 0).tile).toBe(4);
  });
  it('interleaves x on even and y on odd bits', () => {
    expect(interleave(1, 0)).toBe(1);
    expect(interleave(0, 1)).toBe(2);
    expect(interleave(3, 3)).toBe(15);
    expect(interleave(5, 0)).toBe(17);
  });
  it('locates known DSS tiles (verified against the images)', () => {
    // Betelgeuse at order 6 is in tile 23611; Vega in 14906 (checked against DSS2 colour tiles).
    expect(hipsLocate(88.7929 * Math.PI / 180, 7.4071 * Math.PI / 180, 6).tile).toBe(23611);
    expect(hipsLocate(279.2347 * Math.PI / 180, 38.7837 * Math.PI / 180, 6).tile).toBe(14906);
  });
  it('maps face y to image column and face x to image row', () => {
    expect(hipsTilePixel(10, 300)).toEqual({col: 300, row: 10});
  });
  it('builds HiPS URLs and picks finer orders when zoomed in', () => {
    expect(hipsTileUrl('https://example.org/DSS', 6, 23611)).toBe('https://example.org/DSS/Norder6/Dir20000/Npix23611.jpg');
    expect(hipsOrderFor(90 / 3 / 720)).toBe(3);
    expect(hipsOrderFor(90 / 60 / 720)).toBeGreaterThan(hipsOrderFor(90 / 10 / 720));
    expect(hipsOrderFor(1e-5)).toBe(9);
  });
  it('fades images in from 3× to 6×', () => {
    expect(hipsAlpha(3)).toBe(0);
    expect(hipsAlpha(4.5)).toBeCloseTo(.5);
    expect(hipsAlpha(60)).toBe(1);
  });
});

describe('hipsLocateFast', () => {
  it('matches hipsLocate tile and pixel offset', async () => {
    const {hipsLocate, hipsLocateFast} = await import('../src/hips');
    const out = new Int32Array(1);
    for (let i = 0; i < 200; i++) {
      const ra = (i * 37.3 % 360) * Math.PI / 180, dec = ((i * 13.7 % 178) - 89) * Math.PI / 180;
      for (const order of [3, 6, 9]) {
        const slow = hipsLocate(ra, dec, order), tile = hipsLocateFast(ra, Math.sin(dec), order, out);
        expect(tile).toBe(slow.tile);
        expect(out[0]).toBe((slow.row * 512 + slow.col) * 4);
      }
    }
  });
});

describe('HiPS loader helpers (F-063)', () => {
  it('spreads tiles over the mirrors and finds all-sky preview pixels', async () => {
    const {DSS_MIRRORS, allskyOffset, mirrorUrl} = await import('../src/hipsTiles');
    expect(mirrorUrl(0, 6, 23611)).toBe(`${DSS_MIRRORS[0]}/Norder6/Dir20000/Npix23611.jpg`);
    expect(mirrorUrl(4, 6, 1)).toContain(DSS_MIRRORS[1]);
    // Tile 28 is in row 1, column 1 (27 per row); pixel (row 8, col 16) → (y 64 + 1, x 64 + 2).
    expect(allskyOffset(28, (8 * 512 + 16) * 4)).toBe((65 * 1728 + 66) * 4);
  });
});
