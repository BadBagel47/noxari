import {afterEach, describe, expect, it, vi} from 'vitest';
import {loadWikiSummary, wikiTitle} from '../src/wikiSummaryCore';

const reply = (body: unknown, ok = true) => Promise.resolve({ok, json: () => Promise.resolve(body)} as Response);
afterEach(() => vi.unstubAllGlobals());

describe('F-052 Wikipedia summary', () => {
  it('maps catalogue objects to English article titles and skips objects without a reliable article', () => {
    expect(wikiTitle({id: 'm31', en: 'Andromeda Galaxy', kind: 'Galaxy'})).toBe('Messier 31');
    expect(wikiTitle({id: 'mercury', en: 'Mercury', kind: 'Planet'})).toBe('Mercury (planet)');
    expect(wikiTitle({id: 'con-cyg', en: 'Cygnus', kind: 'Constellation'})).toBe('Cygnus (constellation)');
    expect(wikiTitle({id: 'star-27989', en: 'Betelgeuse', kind: 'Star'})).toBe('Betelgeuse');
    expect(wikiTitle({id: 'hip-12345', en: 'HD 1', kind: 'Star'})).toBeNull();
    expect(wikiTitle({id: '2026-ed138', en: '2026 ED138', kind: 'Dwarf planet candidate'})).toBeNull();
  });

  it('uses the Swedish article when it exists and sends only article titles', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      urls.push(url);
      if (url.includes('en.wikipedia.org/api')) return reply({type: 'standard', title: 'Saturn', extract: 'Saturn is the sixth planet.', content_urls: {desktop: {page: 'https://en.wikipedia.org/wiki/Saturn'}}});
      if (url.includes('langlinks')) return reply({query: {pages: [{langlinks: [{title: 'Saturnus'}]}]}});
      return reply({type: 'standard', title: 'Saturnus', extract: 'Saturnus är den sjätte planeten.', content_urls: {desktop: {page: 'https://sv.wikipedia.org/wiki/Saturnus'}}});
    }));
    const result = await loadWikiSummary({id: 'saturn', en: 'Saturn', kind: 'Planet'}, 'sv');
    expect(result).toMatchObject({language: 'sv', title: 'Saturnus'});
    expect(urls.some(url => url.includes('sv.wikipedia.org/api/rest_v1/page/summary/Saturnus'))).toBe(true);
    expect(urls.every(url => !/latitude|longitude|lat=|lon=/.test(url))).toBe(true);
  });

  it('falls back to English when the Swedish article cannot be loaded, and retries "(star)" for ambiguous star names', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/summary/Castor?')) return reply({type: 'disambiguation', title: 'Castor', extract: 'Castor may refer to'});
      if (url.includes('/summary/Castor_(star)')) return reply({type: 'standard', title: 'Castor (star)', extract: 'Castor is a star.', content_urls: {desktop: {page: 'https://en.wikipedia.org/wiki/Castor_(star)'}}});
      if (url.includes('langlinks')) return reply({query: {pages: [{langlinks: [{title: 'Castor (stjärna)'}]}]}});
      return Promise.reject(new Error('offline'));
    }));
    const result = await loadWikiSummary({id: 'star-36850', en: 'Castor', kind: 'Star'}, 'sv');
    expect(result).toMatchObject({language: 'en', title: 'Castor (star)'});
  });
});
