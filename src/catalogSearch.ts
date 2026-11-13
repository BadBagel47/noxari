import type {SpaceObject} from './data';

export function catalogIdentifier(query: string) {
  // F-075: Caldwell numbers ("C 4", "Caldwell 4") are exact identifiers too.
  const match = query.trim().match(/^(messier|m|ngc|ic|caldwell|c)\s*0*(\d+)$/i);
  if (!match) return null;
  const prefix = match[1].toLowerCase();
  return `${prefix === 'messier' ? 'm' : prefix === 'caldwell' ? 'c' : prefix}${Number(match[2])}`;
}

export function matchesCatalogQuery(object: SpaceObject, query: string) {
  const text = query.trim().toLocaleLowerCase();
  if (!text) return true;
  const identifier = catalogIdentifier(text);
  if (identifier) return [object.id, ...(object.aliases ?? [])].some(alias => catalogIdentifier(alias) === identifier);
  // B-010: a bare number matches whole catalogue numbers (81 → M81, NGC 81), not digits inside longer designations.
  if (/^\d+$/.test(text)) {
    const wanted = Number(text);
    return [object.en, object.sv, object.id, ...(object.aliases ?? [])].some(value => (value.match(/\d+/g) ?? []).some(token => Number(token) === wanted && !/[+.\-]/.test(value)));
  }
  return [object.en, object.sv, object.id, object.kind, object.constellation, object.subtype ?? '', object.subtypeSv ?? '', ...(object.aliases ?? [])]
    .some(value => value.toLocaleLowerCase().includes(text));
}
