import type {SpaceObject} from './data';

/**
 * F-052: Wikipedia summaries (CC BY-SA 4.0). Only the article title is sent to Wikipedia — never
 * the user's place. Swedish uses the Swedish article when one exists (via the English article's
 * language links), otherwise English.
 */
const SOLAR: Record<string, string> = {sun: 'Sun', moon: 'Moon', mercury: 'Mercury (planet)', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
  uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto', ceres: 'Ceres (dwarf planet)', eris: 'Eris (dwarf planet)', haumea: 'Haumea', makemake: 'Makemake',
  vesta: '4 Vesta', iss: 'International Space Station', orion: 'Orion (constellation)', 'ursa-major': 'Ursa Major'};

/** English Wikipedia title for an object, or null when there is no reliable article. */
export function wikiTitle(object: Pick<SpaceObject, 'id' | 'en' | 'kind'>) {
  const messier = object.id.match(/^m(\d+)$/);
  if (messier) return `Messier ${messier[1]}`;
  if (SOLAR[object.id]) return SOLAR[object.id];
  if (object.id.startsWith('con-')) return `${object.en} (constellation)`;
  if (object.id === 'sirius' || object.id.startsWith('star-')) return object.en;
  return null;
}

export type WikiSummaryData = {title: string; extract: string; url: string; language: 'en' | 'sv'};
const cache = new Map<string, Promise<WikiSummaryData | null>>();

async function summary(language: 'en' | 'sv', title: string): Promise<WikiSummaryData | null> {
  const response = await fetch(`https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}?redirect=true`);
  if (!response.ok) return null;
  const data = await response.json() as {type?: string; title?: string; extract?: string; content_urls?: {desktop?: {page?: string}}};
  if (data.type === 'disambiguation' || !data.extract) return null;
  return {title: data.title ?? title, extract: data.extract, url: data.content_urls?.desktop?.page ?? `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title)}`, language};
}

async function swedishTitle(englishTitle: string) {
  const response = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&redirects=1&prop=langlinks&lllang=sv&titles=${encodeURIComponent(englishTitle)}`);
  if (!response.ok) return null;
  const data = await response.json() as {query?: {pages?: {langlinks?: {title: string}[]}[]}};
  return data.query?.pages?.[0]?.langlinks?.[0]?.title ?? null;
}

export function loadWikiSummary(object: Pick<SpaceObject, 'id' | 'en' | 'kind'>, language: 'en' | 'sv') {
  const title = wikiTitle(object);
  if (!title) return Promise.resolve(null);
  const key = `${language}:${title}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = (async () => {
      let english = await summary('en', title);
      if (!english && object.kind === 'Star') english = await summary('en', `${title} (star)`);
      if (!english || language === 'en') return english;
      const sv = await swedishTitle(english.title).catch(() => null);
      return (sv && await summary('sv', sv).catch(() => null)) || english;
    })().catch(() => null);
    pending.then(result => { if (!result) cache.delete(key); });
    cache.set(key, pending);
  }
  return pending;
}

