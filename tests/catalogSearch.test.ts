import {describe, expect, it} from 'vitest';
import {objects} from '../src/data';
import {matchesCatalogQuery} from '../src/catalogSearch';

const ids = (query: string) => objects.filter(object => matchesCatalogQuery(object, query)).map(object => object.id);

describe('B-010 numeric search', () => {
  it('matches whole catalogue numbers only', () => {
    const result = ids('81');
    expect(result).toContain('m81');
    expect(result).not.toContain('m33');
    expect(result).not.toContain('m70');
    expect(result.length).toBeLessThanOrEqual(3);
    expect(ids('31')).toContain('m31');
    expect(ids('M81')).toEqual(['m81']);
  });

  it('keeps name and constellation search', () => {
    expect(ids('andromeda')).toContain('m31');
    expect(ids('bode')).toContain('m81');
  });
});
