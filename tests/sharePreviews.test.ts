import {describe, expect, it} from 'vitest';
import {objects} from '../src/data';
import {candidateObjects} from '../src/candidateObjects';
import sourceImages from '../data/object-images.json';
import {buildSharePreviewRecords, createSharePreviewHtml, mayUseSharePreviewImage, resolveShareLanguage, shareAppPath, sharePreviewPath} from '../src/sharePreview';

const site = 'https://badbagel47.github.io';
const image = {file: 'm42.jpg', altEn: 'Nebula <image>', altSv: 'Nebulosa & stjärnor', credit: 'NASA & ESA', sourceUrl: 'https://example.org/image', width: 960, height: 960};

describe('static object share previews', () => {
  it('creates one localized preview route per object and carries approved images only by supplied manifest', () => {
    const objects = [{id: 'm42', en: 'Orion Nebula', sv: 'Orionnebulosan', description: 'A nebula.', descriptionSv: 'En nebulosa.'}];
    const candidates = [{id: '2026-ed138', en: '2026 ED138 candidate', sv: '2026 ED138 kandidat', description: 'A candidate object.', descriptionSv: 'Ett kandidatobjekt.'}];
    const records = buildSharePreviewRecords(objects, candidates, new Map([['m42', image]]));
    expect(records.map(record => `${record.language}/${record.object.id}`)).toEqual([
      'en/m42', 'sv/m42', 'en/2026-ed138', 'sv/2026-ed138',
    ]);
    expect(records[0].image).toBe(image);
    expect(records[1].image).toBe(image);
    expect(records[2].image).toBeUndefined();
    expect(sharePreviewPath('sv', '2026-ed138')).toBe('/noxari/share/sv/2026-ed138/');
    expect(shareAppPath('sv', '2026-ed138')).toBe('/noxari/?object=2026-ed138&lang=sv');
    expect(() => sharePreviewPath('en', '../m42')).toThrow('Unsafe share object id');
  });

  it('covers the canonical catalogs and restricts preview photos to public-domain assets', () => {
    const records = buildSharePreviewRecords(objects, candidateObjects, new Map());
    expect(records).toHaveLength(2 * (objects.length + candidateObjects.length));
    expect(new Set(records.map(record => `${record.language}/${record.object.id}`)).size).toBe(records.length);
    expect(records.some(record => record.object.id === '2026-ed138' && record.language === 'sv')).toBe(true);
    expect(sourceImages.filter(image => mayUseSharePreviewImage(image.license))).toHaveLength(7);
    expect(mayUseSharePreviewImage('CC BY-SA 2.5')).toBe(false);
  });

  it('emits localized, escaped Open Graph and Twitter metadata plus a browser fallback link', () => {
    const html = createSharePreviewHtml({
      object: {id: 'm42', en: '<Orion>', sv: 'Orion & nebulosan', description: 'A nebula from <catalog> & sky.', descriptionSv: 'En nebulosa från "katalogen".'},
      language: 'sv',
      image,
    }, site);
    expect(html).toContain('<html lang="sv">');
    expect(html).toContain('<title>Orion &amp; nebulosan — Noxari</title>');
    expect(html).toContain('content="En nebulosa från &quot;katalogen&quot;."');
    expect(html).toContain('property="og:url" content="https://badbagel47.github.io/noxari/share/sv/m42/"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('https://badbagel47.github.io/noxari/images/objects/m42.jpg');
    expect(html).toContain('content="Nebulosa &amp; stjärnor"');
    expect(html).toContain('href="https://badbagel47.github.io/noxari/?object=m42&amp;lang=sv"');
    expect(html).toContain('window.location.replace("/noxari/?object=m42&lang=sv")');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('emits text-only cards for objects without an approved image and retains candidate status', () => {
    const html = createSharePreviewHtml({
      object: {id: '2026-ed138', en: '2026 ED138 (dwarf planet candidate)', sv: '2026 ED138 (dvärgplanetkandidat)', description: 'A trans-Neptunian dwarf planet candidate. More details follow.', descriptionSv: 'En transneptunsk dvärgplanetkandidat. Fler detaljer följer.', kind: 'Dwarf planet candidate'},
      language: 'en',
    }, site);
    expect(html).toContain('dwarf planet candidate');
    expect(html).toContain('A trans-Neptunian dwarf planet candidate.');
    expect(html).not.toContain('confirmed dwarf planet');
    expect(html).toContain('name="twitter:card" content="summary"');
    expect(html).not.toContain('property="og:image"');
    expect(html).not.toContain('<figure>');
  });

  it('uses a valid shared locale first while retaining old query-link language behavior', () => {
    expect(resolveShareLanguage('sv', 'en')).toBe('sv');
    expect(resolveShareLanguage('en', 'sv')).toBe('en');
    expect(resolveShareLanguage(null, 'sv')).toBe('sv');
    expect(resolveShareLanguage('fr', 'unknown')).toBe('en');
  });
});
