import {describe, expect, it} from 'vitest';
import {layoutObjectLabels, type ObjectLabelInput} from '../src/objectLabels';

const box = (label: ObjectLabelInput, dx: number, dy: number) => {
  const width = Math.min(155, Math.max(18, [...label.text].length * 7.2 + 8));
  return {left: label.x + dx - width / 2, right: label.x + dx + width / 2, top: label.y + dy - 10, bottom: label.y + dy + 10};
};

describe('sky object label layout', () => {
  it('moves labels away from crowded markers and gives selected objects first choice', () => {
    const labels = [
      {id: 'first', text: 'Andromeda Galaxy', x: 160, y: 120, priority: 300},
      {id: 'selected', text: 'Triangulum Galaxy', x: 160, y: 120, priority: 1000},
    ];
    const result = layoutObjectLabels(labels, 320, 240);
    expect(result.get('selected')?.visible).toBe(true);
    expect(result.get('first')?.visible).toBe(true);
    expect(result.get('selected')).not.toEqual(result.get('first'));
    const a = box(labels[0], result.get('first')!.dx, result.get('first')!.dy);
    const b = box(labels[1], result.get('selected')!.dx, result.get('selected')!.dy);
    expect(a.right + 5 <= b.left || b.right + 5 <= a.left || a.bottom + 5 <= b.top || b.bottom + 5 <= a.top).toBe(true);
  });

  it('keeps labels within the viewport when their marker is near an edge', () => {
    const label = {id: 'edge', text: 'Vesta', x: 3, y: 100};
    const placement = layoutObjectLabels([label], 240, 200).get('edge')!;
    expect(placement.visible).toBe(true);
    const rect = box(label, placement.dx, placement.dy);
    expect(rect.left).toBeGreaterThanOrEqual(6);
    expect(rect.right).toBeLessThanOrEqual(234);
  });

  it('moves labels clear of the status and navigation overlays', () => {
    const label = {id: 'marker', text: 'Messier 77', x: 60, y: 100};
    const blocked = [{left: 30, right: 90, top: 122, bottom: 142}];
    const placement = layoutObjectLabels([label], 240, 200, blocked).get('marker')!;
    expect(placement.visible).toBe(true);
    expect(placement.dy).toBe(-32);
  });

  it('hides a lower-priority label if no collision-free position exists', () => {
    const labels = Array.from({length: 10}, (_, index) => ({id: `object-${index}`, text: 'Sun', x: 160, y: 120, priority: index === 0 ? 1000 : 300}));
    const result = layoutObjectLabels(labels, 320, 240);
    expect(result.get('object-0')?.visible).toBe(true);
    expect([...result.values()].filter(placement => !placement.visible).length).toBeGreaterThan(0);
  });

  it('keeps both names in the same slots across the reported subpixel ordering change', () => {
    let memory = new Map();
    for (const delta of [-.2, .2, -.2, .2, -.2]) {
      const result = layoutObjectLabels([
        {id: 'a', text: 'Andromeda Galaxy', x: 160, y: 120, priority: 300},
        {id: 'b', text: 'Triangulum Galaxy', x: 200, y: 120 + delta, priority: 300},
      ], 390, 844, [], memory);
      if (memory.size) for (const id of ['a', 'b']) expect(result.get(id)).toEqual(memory.get(id));
      memory = result;
    }
  });

  it('does not blink when an edge conflict oscillates by a fraction of a pixel', () => {
    const input = (y: number) => [{id: 'a', text: 'Venus', x: 100, y}];
    let memory = layoutObjectLabels(input(100), 240, 200);
    expect(memory.get('a')?.visible).toBe(true);
    const slot = memory.get('a')!;
    for (const y of [153, 151.9, 152.1, 151.8, 152.2]) {
      memory = layoutObjectLabels(input(y), 240, 200, [], memory);
      expect(memory.get('a')?.visible).toBe(false);
      expect(memory.get('a')?.dy).toBe(slot.dy);
    }
    memory = layoutObjectLabels(input(143), 240, 200, [], memory);
    expect(memory.get('a')?.visible).toBe(true);
  });

  it('retains label slots across a continuous pan, reversal and temporary viewport exit', () => {
    let memory = new Map();
    let slot: {dx: number; dy: number} | undefined;
    for (const x of [...Array.from({length: 200}, (_, i) => 100 + i * 2), ...Array.from({length: 200}, (_, i) => 498 - i * 2)]) {
      memory = layoutObjectLabels([{id: 'a', text: 'Messier 77', x, y: 120}], 390, 844, [], memory);
      const placement = memory.get('a')!;
      slot ??= {dx: placement.dx, dy: placement.dy};
      expect({dx: placement.dx, dy: placement.dy}).toEqual(slot);
    }
    memory = layoutObjectLabels([], 390, 844, [], memory);
    memory = layoutObjectLabels([{id: 'a', text: 'Messier 77', x: 160, y: 120}], 390, 844, [], memory);
    expect(memory.get('a')).toMatchObject({...slot, visible: true});
  });

  it('does not evict an existing label when an equal-priority newcomer enters first in catalog order', () => {
    const b = {id: 'b', text: 'Triangulum Galaxy', x: 160, y: 120, priority: 300};
    const previous = layoutObjectLabels([b], 390, 844);
    const next = layoutObjectLabels([{...b, id: 'a'}, b], 390, 844, [], previous);
    expect(next.get('b')).toEqual(previous.get('b'));
  });

  it('bounds retained offscreen IDs', () => {
    let memory = new Map();
    for (let i = 0; i < 300; i++) memory = layoutObjectLabels([{id: String(i), text: 'Venus', x: 100, y: 100}], 390, 844, [], memory);
    expect(memory.size).toBeLessThanOrEqual(256);
    expect(memory.get('299')?.visible).toBe(true);
  });
});
