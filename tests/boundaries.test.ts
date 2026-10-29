import {describe, expect, it, vi} from 'vitest';
import {AstroTime, Constellation, EquatorFromVector, RotateVector, Rotation_EQD_EQJ, Spherical, VectorFromSphere} from 'astronomy-engine';
import {constellationBoundaries} from '../src/generated/boundaries';
import {boundarySamples, boundarySky, drawBoundaries} from '../src/constellationBoundaries';
import {stockholm} from '../src/astronomy';
import {projectHorizontal, projectPerspective} from '../src/skyProjection';

const epoch = new AstroTime(-45655.74141261017);
const toJ2000 = Rotation_EQD_EQJ(epoch);
const region = (ra: number, dec: number) => {
  const eq = EquatorFromVector(RotateVector(toJ2000, VectorFromSphere(new Spherical(dec, ra * 15, 1), epoch)));
  return Constellation(eq.ra, eq.dec).symbol;
};

describe('official IAU boundaries in B1875', () => {
  it('covers 88 constellations and both separate Serpens regions with a connected, unduplicated edge network', () => {
    expect(constellationBoundaries).toHaveLength(781);
    const regions = new Set(constellationBoundaries.flatMap(edge => edge.slice(4) as string[]));
    expect(regions.size).toBe(89);
    expect(regions.has('Ser1') && regions.has('Ser2')).toBe(true);
    expect(new Set([...regions].map(id => id.replace(/[12]$/, ''))).size).toBe(88);
    const vertices = new Map<string, number>(), edges = new Set<string>();
    for (const [ra1, dec1, ra2, dec2] of constellationBoundaries) {
      expect(ra1 === ra2 || dec1 === dec2).toBe(true);
      const endpoints = [[ra1 % 24, dec1], [ra2 % 24, dec2]].map(v => JSON.stringify(v.map(value => Number(value.toFixed(9)))));
      for (const key of endpoints) vertices.set(key, (vertices.get(key) ?? 0) + 1);
      edges.add(endpoints.sort().join('|'));
    }
    expect(edges.size).toBe(781);
    expect([...vertices.values()].every(degree => degree >= 2)).toBe(true);
  });

  it('agrees with Astronomy Engine’s independent Roman-table region lookup on both sides of every edge', () => {
    for (const edge of constellationBoundaries) {
      const [ra1, dec1, ra2, dec2, left, right] = edge;
      const ra = (ra1 + ra2) / 2, dec = (dec1 + dec2) / 2;
      const delta = .005;
      const sides = ra1 === ra2
        ? [region(ra - delta / 15, dec), region(ra + delta / 15, dec)]
        : [region(ra, dec - delta), region(ra, dec + delta)];
      expect(sides.sort(), JSON.stringify(edge)).toEqual([left, right].map(id => id.replace(/[12]$/, '')).sort());
    }
  });

  it('follows source parallels across 24h and near the pole instead of great-circle chords', () => {
    const edge = constellationBoundaries.find(edge => edge[0] === 23 && edge[2] === 32 && edge[1] === 88)!;
    expect(edge).toBeDefined();
    const samples = boundarySamples(edge);
    expect(samples[0]).toEqual({ra: 23, dec: 88});
    expect(samples.at(-1)).toEqual({ra: 32, dec: 88});
    expect(samples.every(sample => sample.dec === 88)).toBe(true);
    const midpoint = (samples[Math.floor((samples.length - 1) / 2)].ra + samples[Math.ceil((samples.length - 1) / 2)].ra) / 2;
    expect(midpoint).toBeCloseTo(27.5);
    for (const edge of constellationBoundaries) {
      const samples = boundarySamples(edge);
      for (let i = 1; i < samples.length; i++) {
        expect(Math.abs(samples[i].ra - samples[i - 1].ra) * 15).toBeLessThanOrEqual(1.000001);
        expect(Math.abs(samples[i].dec - samples[i - 1].dec)).toBeLessThanOrEqual(1.000001);
      }
    }
  });

  it('rotates the fixed network with date/location and stays finite at northern/southern poles and zenith', () => {
    const date = new Date('2026-01-15T22:00:00Z');
    const first = boundarySky(date, stockholm), later = boundarySky(new Date('2026-01-16T04:00:00Z'), stockholm);
    expect(first).toHaveLength(781);
    expect(first[0][0].azimuth).not.toBeCloseTo(later[0][0].azimuth, 0);
    for (const latitude of [-90, -33.9, 0, 90]) {
      const sky = boundarySky(date, {...stockholm, latitude});
      for (const p of sky.flat()) {
        expect(Number.isFinite(p.altitude) && Number.isFinite(p.azimuth)).toBe(true);
        expect(Math.abs(p.altitude)).toBeLessThanOrEqual(90);
        expect(p.azimuth).toBeGreaterThanOrEqual(0);
        expect(p.azimuth).toBeLessThan(360);
      }
    }
  });

  it('breaks projected paths at the horizon and behind the camera and clips drawing to the viewport', () => {
    const context = Object.fromEntries(['save', 'restore', 'beginPath', 'rect', 'clip', 'setLineDash', 'moveTo', 'lineTo', 'stroke'].map(name => [name, vi.fn()])) as unknown as CanvasRenderingContext2D;
    const positions = [
      {altitude: 15, azimuth: 355}, {altitude: 15, azimuth: 0},
      {altitude: -1, azimuth: 5}, {altitude: 15, azimuth: 10}, {altitude: 15, azimuth: 15},
      {altitude: 15, azimuth: 180}, {altitude: 15, azimuth: 20}, {altitude: 15, azimuth: 25},
    ];
    drawBoundaries(context, [positions], p => projectPerspective(p, {heading: 0, pitch: 15}, 800, 600, false), 800, 600, 1);
    expect(context.rect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(context.clip).toHaveBeenCalledOnce();
    expect(context.moveTo).toHaveBeenCalledTimes(3);
    expect(context.lineTo).toHaveBeenCalledTimes(3);
    expect(context.restore).toHaveBeenCalledOnce();
    vi.clearAllMocks();
    drawBoundaries(context, [[positions[0], positions[2], positions[3], positions[4]]], p => projectHorizontal(p, 800, 600), 800, 600, 1);
    expect(context.moveTo).toHaveBeenCalledTimes(2);
    expect(context.lineTo).toHaveBeenCalledOnce();
    vi.clearAllMocks();
    drawBoundaries(context, [positions], () => ({x: 0, y: 0}), 800, 600, 0);
    expect(context.stroke).not.toHaveBeenCalled();
  });
});
