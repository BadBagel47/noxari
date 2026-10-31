import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe, expect, it} from 'vitest';
import manifest from '../data/object-images.json';
import {objects} from '../src/data';

describe('licensed object images', () => {
  it('has unique catalog IDs, accessible descriptions and per-image source/license metadata', () => {
    const ids = manifest.map(image => image.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(['m31', 'm42', 'm45', 'm13', 'm57', 'm51', 'm81', 'm104']));
    for (const image of manifest) {
      expect(objects.some(object => object.id === image.id)).toBe(true);
      expect(image.altEn.length).toBeGreaterThan(15);
      expect(image.altSv.length).toBeGreaterThan(15);
      expect(image.credit.length).toBeGreaterThan(3);
      expect(image.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(image.license).toBeTruthy();
      expect(image.licenseUrl).toMatch(/^https:\/\//);
    }
  });

  it('ships each image asset with the checksum recorded for its source thumbnail', () => {
    for (const image of manifest) {
      const bytes = readFileSync(new URL(`../public/images/objects/${image.file}`, import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(image.sha256);
      expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
    }
  });
});
