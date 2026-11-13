import {Search, SlidersHorizontal, X} from 'lucide-react';
import {useEffect, useId, useMemo, useRef, useState} from 'react';
import type {SpaceObject} from './data';
import {catalogIdentifier, matchesCatalogQuery} from './catalogSearch';
import {KindIcon, kindIconName} from './KindIcon';

type Lang = 'en' | 'sv';
const t = (lang: Lang, en: string, sv: string) => lang === 'sv' ? sv : en;

/** Best matches first: exact catalogue ID, then names that start with the query, then other matches. */
export function rankSearch(objects: SpaceObject[], query: string, limit = 8) {
  const text = query.trim().toLocaleLowerCase();
  if (!text) return [];
  const identifier = catalogIdentifier(text);
  const scored: {object: SpaceObject; score: number}[] = [];
  for (const object of objects) {
    if (!matchesCatalogQuery(object, text)) continue;
    const names = [object.sv, object.en].map(name => name.toLocaleLowerCase());
    const score = identifier && (object.id === identifier || object.aliases?.some(alias => catalogIdentifier(alias) === identifier)) ? 0
      : names.some(name => name === text) ? 0
      : names.some(name => name.startsWith(text)) ? 1
      : names.some(name => name.split(/[\s(–-]+/).some(word => word.startsWith(text))) ? 2
      : 3;
    scored.push({object, score});
  }
  // F-075: with many more catalogue objects, ties go to the solar system and named stars, then Messier, then the rest.
  const tier = (object: SpaceObject) => ['Planet', 'Moon', 'Dwarf planet', 'Asteroid', 'Satellite'].includes(object.kind) ? 0 : object.kind === 'Star' ? 1 : object.id.startsWith('dso-') ? 3 : 2;
  return scored.sort((a, b) => a.score - b.score || tier(a.object) - tier(b.object)).slice(0, limit).map(entry => entry.object);
}

/**
 * F-054: Stellarium-style search field on the sky. Results appear while typing; choosing one
 * moves the sky to the object (via onPick). The full search sheet with filters stays one tap away.
 */
export function TopSearch({language, objects, describe, onPick, onOpenFull, context}: {
  language: Lang; objects: SpaceObject[];
  describe: (object: SpaceObject) => string;
  onPick: (object: SpaceObject) => void; onOpenFull: (query: string) => void;
  /** F-070: place and time as a second line in the search capsule; tapping it opens Time & place. */
  context?: {label: string; detail: string; tone: string; ariaLabel: string; onOpen: () => void};
}) {
  const lang = language, listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => rankSearch(objects, query), [objects, query]);
  useEffect(() => setActive(0), [query]);
  const pick = (object: SpaceObject) => { onPick(object); setQuery(''); setOpen(false); input.current?.blur(); };
  const showList = open && query.trim().length > 0;
  return <div className="top-search" role="search" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <div className="top-search-field">
      <Search size={18} aria-hidden="true"/>
      <div className={`top-search-stack ${context && !open && !query ? 'with-context' : ''}`}>
      <input ref={input} value={query} placeholder={t(lang, 'Search…', 'Sök…')} aria-label={t(lang, 'Search the sky', 'Sök på himlen')}
        role="combobox" aria-expanded={showList} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
        onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => Math.min(results.length - 1, index + 1)); }
          else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(0, index - 1)); }
          else if (event.key === 'Enter' && results[active]) { event.preventDefault(); pick(results[active]); }
          else if (event.key === 'Escape') { event.preventDefault(); if (query) setQuery(''); else input.current?.blur(); setOpen(false); }
        }}/>
      {context && !open && !query && <button className={`top-search-context ${context.tone}`} aria-label={context.ariaLabel} onClick={context.onOpen}><span>{context.label}</span> · <small>{context.detail}</small></button>}
      </div>
      {query && <button className="top-search-clear" aria-label={t(lang, 'Clear search', 'Rensa sökning')} onClick={() => { setQuery(''); input.current?.focus(); }}><X size={16}/></button>}
      <button className="top-search-filter" aria-label={t(lang, 'All results and filters', 'Alla resultat och filter')} title={t(lang, 'All results and filters', 'Alla resultat och filter')} onClick={() => { onOpenFull(query); setQuery(''); setOpen(false); }}><SlidersHorizontal size={17}/></button>
    </div>
    {showList && <div className="top-search-results" id={listId} role="listbox" aria-label={t(lang, 'Search results', 'Sökresultat')}>
      {results.length ? results.map((object, index) => <button key={object.id} id={`${listId}-${index}`} role="option" aria-selected={index === active} className={index === active ? 'active' : ''}
        onMouseEnter={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => pick(object)}>
        <KindIcon name={kindIconName(object)} size={20} color={object.color}/>
        <span><strong>{lang === 'sv' ? object.sv : object.en}</strong><small>{describe(object)}</small></span>
      </button>) : <p className="top-search-empty">{t(lang, 'Not in Noxari’s catalogue', 'Finns inte i Noxaris katalog')}</p>}
      <button className="top-search-all" onMouseDown={event => event.preventDefault()} onClick={() => { onOpenFull(query); setQuery(''); setOpen(false); }}>{t(lang, 'All results and filters', 'Visa alla resultat och filter')}</button>
    </div>}
  </div>;
}
