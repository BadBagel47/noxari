import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe, expect, it} from 'vitest';
import manifest from '../data/object-images.json';
import {objects} from '../src/data';

describe('licensed object images', () => {
  it('has unique catalog IDs, accessible descriptions and per-image source/license metadata', () => {
    const ids = manifest.map(image => image.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ['m31', 'm42', 'm45', 'm13', 'm57', 'm51', 'm81', 'm104']) expect(ids).toContain(id);
    // F-048: most Messier objects and the solar-system bodies, only with free licenses.
    expect(ids.length).toBeGreaterThanOrEqual(120);
    for (const id of ['jupiter', 'saturn', 'moon', 'mars', 'pluto', 'm1', 'm27', 'm33']) expect(ids).toContain(id);
    expect(ids).not.toContain('m38');
    for (const image of manifest) {
      expect(objects.some(object => object.id === image.id)).toBe(true);
      expect(image.altEn.length).toBeGreaterThan(15);
      expect(image.altSv.length).toBeGreaterThan(15);
      expect(image.credit.length).toBeGreaterThanOrEqual(3); // ESO's required credit line is just 'ESO'
      expect(image.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(image.license).toMatch(/^(Public domain|CC0|CC BY(-SA)? [\d.]+( us| igo)?)$/);
      expect(image.licenseUrl).toMatch(/^https:\/\//);
    }
  });

  it('ships each image asset with the checksum recorded for its source thumbnail', () => {
    for (const image of manifest) {
      const bytes = readFileSync(new URL(`../public/images/objects/${image.file}`, import.meta.url));
      const shipped = (image as {fileSha256?: string}).fileSha256;
      // F-048 entries record the source-thumbnail hash (checked on download) and the re-encoded WebP hash.
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(shipped ?? image.sha256);
      if (shipped) expect(bytes.subarray(8, 12).toString('ascii')).toBe('WEBP');
      else expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
    }
  });
});
