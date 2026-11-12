import type {SpaceObject} from './data';

export function catalogIdentifier(query: string) {
  const match = query.trim().match(/^(messier|m|ngc|ic)\s*0*(\d+)$/i);
  if (!match) return null;
  return `${match[1].toLowerCase() === 'messier' ? 'm' : match[1].toLowerCase()}${Number(match[2])}`;
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
