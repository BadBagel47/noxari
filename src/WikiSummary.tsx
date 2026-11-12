import {useEffect, useState} from 'react';
import type {SpaceObject} from './data';
import {loadWikiSummary, wikiTitle, type WikiSummaryData} from './wikiSummaryCore';

export function WikiSummary({object, language}: {object: SpaceObject; language: 'en' | 'sv'}) {
  const sv = language === 'sv';
  const [state, setState] = useState<{status: 'loading' | 'ready' | 'none'; data: WikiSummaryData | null}>({status: 'loading', data: null});
  useEffect(() => {
    if (!wikiTitle(object)) { setState({status: 'none', data: null}); return; }
    let live = true;
    setState({status: 'loading', data: null});
    loadWikiSummary(object, language).then(data => { if (live) setState({status: data ? 'ready' : 'none', data}); });
    return () => { live = false; };
  }, [object.id, language]);
  if (state.status === 'none') return null;
  if (state.status === 'loading') return <section className="wiki-summary is-loading" aria-busy="true"><h3>Wikipedia</h3><p>{sv ? 'Hämtar sammanfattning…' : 'Loading summary…'}</p></section>;
  const data = state.data!;
  const extract = data.extract.length > 700 ? `${data.extract.slice(0, 700).replace(/\s+\S*$/, '')} …` : data.extract;
  return <section className="wiki-summary" lang={data.language}>
    <h3>{sv ? 'Från Wikipedia' : 'From Wikipedia'}</h3>
    <p>{extract}</p>
    <p className="wiki-source"><a href={data.url} target="_blank" rel="noopener noreferrer">{sv ? 'Läs mer på Wikipedia' : 'Read more on Wikipedia'}</a>{sv && data.language === 'en' ? ' (engelska)' : ''} · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a></p>
  </section>;
}
