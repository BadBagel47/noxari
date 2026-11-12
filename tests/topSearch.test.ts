import {describe, expect, it} from 'vitest';
import {objects} from '../src/data';
import {rankSearch} from '../src/TopSearch';

describe('F-054 top search ranking', () => {
  it('puts the exact catalogue ID first and limits the list', () => {
    expect(rankSearch(objects, 'M31')[0].id).toBe('m31');
    expect(rankSearch(objects, 'm', 8).length).toBeLessThanOrEqual(8);
    expect(rankSearch(objects, '   ')).toEqual([]);
  });
  it('prefers names that start with the text in either language', () => {
    expect(rankSearch(objects, 'satur')[0].id).toBe('saturn');
    expect(rankSearch(objects, 'månen')[0].id).toBe('moon');
  });
});
