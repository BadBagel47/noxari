import {describe, expect, it} from 'vitest';
import {brightStars} from '../src/generated/brightStars';
import {starDetails} from '../src/generated/starDetails';
import {starColorIndex} from '../src/generated/starColors';
import {objectWeight, pickBest, pickRadius, starObject, starWeight, tappableMagnitude} from '../src/starPick';
import {starRgb} from '../src/starColor';
import {namedStarShown} from '../src/namedStars';

const indexOfHip = (hip: number) => brightStars.findIndex(star => star[6] === hip);

describe('F-050 tap priority', () => {
  it('prefers a known object over a slightly closer faint star, but a direct hit on a star wins', () => {
    const planet = {x: 100, y: 100, weight: objectWeight({kind: 'Planet', id: 'mars'}), key: 'mars'};
    const faint = {x: 112, y: 100, weight: starWeight(5.8), key: 'faint'};
    expect(pickBest([planet, faint], 108, 100, pickRadius('touch', 1))?.key).toBe('mars');
    expect(pickBest([planet, faint], 112, 100, pickRadius('touch', 1))?.key).toBe('faint');
    expect(pickBest([planet, faint], 160, 100, pickRadius('touch', 1))).toBeNull();
  });

  it('uses a smaller reach for a mouse and when zoomed in', () => {
    expect(pickRadius('mouse', 1)).toBeLessThan(pickRadius('touch', 1));
    expect(pickRadius('touch', 3)).toBeLessThan(pickRadius('touch', 1));
    expect(starWeight(0)).toBeGreaterThan(starWeight(6));
    expect(tappableMagnitude(1)).toBeLessThan(5);
    expect(tappableMagnitude(2)).toBe(6.5);
  });
});

describe('F-049/F-050 star data', () => {
  it('aligns colour and detail tables with the bright-star catalogue', () => {
    expect(starColorIndex).toHaveLength(brightStars.length);
    expect(starDetails).toHaveLength(brightStars.length);
    const betelgeuse = indexOfHip(27989), rigel = indexOfHip(24436);
    expect(starDetails[betelgeuse][0]).toBe('α Ori');
    expect(starDetails[rigel][0]).toBe('β Ori');
    expect(starColorIndex[betelgeuse]!).toBeGreaterThan(140);
    expect(starColorIndex[rigel]!).toBeLessThan(0);
    expect(starRgb(-.03)[2]).toBeGreaterThan(starRgb(1.5)[2]);
  });

  it('returns the named-star object for a named star and a HYG-based card otherwise', async () => {
    expect((await starObject(indexOfHip(27989))).id).toBe('star-27989');
    expect((await starObject(indexOfHip(32349))).id).toBe('sirius');
    const index = brightStars.findIndex((star, i) => star[2] > 5 && star[6] && starDetails[i][0]);
    const card = await starObject(index);
    expect(card.id).toBe(`hip-${brightStars[index][6]}`);
    expect(card.kind).toBe('Star');
    expect(card.position).toMatchObject({kind: 'fixed'});
    expect(card.descriptionSv).toContain('HYG');
  });

  it('names only the brightest stars at 1× and more as you zoom in', () => {
    expect(namedStarShown({id: 'star-27989'}, 1)).toBe(true); // Betelgeuse V 0.45
    const polaris = 'star-11767';
    expect(namedStarShown({id: polaris}, 1)).toBe(false);
    expect(namedStarShown({id: polaris}, 2)).toBe(true);
    expect(namedStarShown({id: 'm31'}, 1)).toBe(true);
  });
});
