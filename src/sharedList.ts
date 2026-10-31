/** Parse an untrusted shared-list query value into unique catalog IDs. */
export function parseSharedList(value: string, catalogIds: Iterable<string>): string[] {
  if (value.length > 4096) return [];
  const known = new Set(catalogIds);
  const result: string[] = [];
  for (const item of value.split(',')) {
    const id = item.trim().toLowerCase();
    if (known.has(id) && !result.includes(id)) result.push(id);
    if (result.length >= known.size) break;
  }
  return result;
}

export function formatSharedList(ids: Iterable<string>, catalogIds: Iterable<string>): string {
  const known = new Set(catalogIds);
  return [...new Set(ids)].filter(id => known.has(id)).join(',');
}
