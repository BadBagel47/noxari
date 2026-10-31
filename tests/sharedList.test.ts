import {describe, expect, it} from 'vitest';
import {formatSharedList, parseSharedList} from '../src/sharedList';

describe('shared observation lists', () => {
  const catalog = ['sun', 'moon', 'm31'];

  it('keeps known IDs in order and removes duplicates and unknown IDs', () => {
    expect(parseSharedList('moon,unknown,M31,moon,sun', catalog)).toEqual(['moon', 'm31', 'sun']);
  });

  it('rejects oversized values and empty lists', () => {
    expect(parseSharedList('x'.repeat(4097), catalog)).toEqual([]);
    expect(parseSharedList('unknown,, ', catalog)).toEqual([]);
  });

  it('formats unique known IDs for a share link', () => {
    expect(formatSharedList(['m31', 'moon', 'm31', 'unknown'], catalog)).toBe('m31,moon');
  });
});
