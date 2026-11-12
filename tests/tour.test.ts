import {describe, expect, it} from 'vitest';
import {objects} from '../src/data';
import {stockholm} from '../src/astronomy';
import {cinematicPose, glideDuration, holdPose, separation, tourStops} from '../src/tour';
import {demoZoom, lookHint, objectFacts} from '../src/objectFacts';
import {messierSizes} from '../src/generated/messierSizes';
import {issObject} from '../src/issObject';

const byId = (id: string) => objects.find(object => object.id === id)!;
const time = new Date('2026-01-15T22:00:00Z');

describe('F-044 tour stops and camera moves', () => {
  it('keeps list order and skips objects below the horizon or without a position', () => {
    const list = [byId('m42'), byId('orion'), byId('m31'), byId('m7'), byId('sirius')];
    const {stops, skipped} = tourStops(list, time, stockholm);
    expect(stops.map(object => object.id)).toEqual(['m42', 'm31', 'sirius']);
    expect(skipped.map(object => object.id)).toEqual(['m7']);
  });

  it('starts and ends exactly at the poses, pulls back to 1× on long swings and not on short hops', () => {
    const from = {heading: 10, pitch: 20}, goal = {heading: 200, pitch: 40};
    expect(cinematicPose(0, from, 2, goal, 2.5).view).toEqual(from);
    expect(cinematicPose(0, from, 2, goal, 2.5).zoom).toBeCloseTo(2);
    const end = cinematicPose(1, from, 2, goal, 2.5);
    expect(end.view.heading).toBeCloseTo(200); expect(end.view.pitch).toBeCloseTo(40); expect(end.zoom).toBeCloseTo(2.5);
    expect(cinematicPose(.45, from, 2, goal, 2.5).zoom).toBeCloseTo(1);
    const near = {heading: 14, pitch: 21};
    expect(cinematicPose(.45, from, 2, near, 2.5, false).zoom).toBeGreaterThan(1.8);
    // Cinematic hops between neighbours still pull back about half-way and rise in an arc.
    expect(cinematicPose(.45, from, 2, near, 2.5).zoom).toBeLessThan(1.6);
    expect(cinematicPose(.5, from, 2, near, 2.5).view.pitch).toBeGreaterThan(cinematicPose(.5, from, 2, near, 2.5, false).view.pitch + 2);
    expect(glideDuration(from, near, true)).toBeGreaterThanOrEqual(2600);
    // Heading takes the short way round the north point.
    expect(cinematicPose(.5, {heading: 350, pitch: 0}, 1, {heading: 10, pitch: 0}, 1).view.heading).toBeCloseTo(0, 0);
    for (let k = 0; k <= 1; k += .05) { const zoom = cinematicPose(k, from, 3, goal, 3).zoom; expect(zoom).toBeGreaterThanOrEqual(1); expect(zoom).toBeLessThanOrEqual(3); }
    expect(glideDuration(from, goal, true)).toBeGreaterThan(glideDuration(from, near, true));
    expect(separation(from, from)).toBeCloseTo(0);
  });
});

describe('F-045 demo facts', () => {
  it('has OpenNGC apparent sizes for 108 of 110 Messier objects and derives approximate true sizes', () => {
    expect(Object.keys(messierSizes)).toHaveLength(110);
    expect(Object.values(messierSizes).filter(size => size.major).length).toBe(108);
    const m31 = objectFacts(byId('m31'), time, 'sv');
    expect(m31.apparentSize).toBe('≈ 3° × 1,2°');
    expect(m31.trueSize).toMatch(/^≈ 130\s000 ljusår$/);
    expect(objectFacts(byId('m13'), time, 'en').trueSize).toBe('≈ 120 light-years');
    expect(objectFacts(byId('m40'), time, 'en').apparentSize).toBeUndefined();
  });

  it('gives solar-system bodies their diameter and calculated distance', () => {
    const jupiter = objectFacts(byId('jupiter'), time, 'en');
    expect(jupiter.trueSize).toBe('139,820 km');
    expect(jupiter.distance).toMatch(/AU · \d+ million km/);
    expect(jupiter.apparentSize).toMatch(/″$/);
    expect(objectFacts(byId('moon'), time, 'sv').distance).toMatch(/km$/);
    expect(objectFacts(issObject, time, 'sv').trueSize).toContain('109 m');
  });

  it('frames large objects wider than small ones', () => {
    expect(demoZoom(byId('m31'))).toBeLessThan(demoZoom(byId('m57')));
    expect(demoZoom(byId('m57'))).toBeLessThanOrEqual(3);
  });
});

describe('F-046 demo motion and look hints', () => {
  it('keeps moving while an object is shown: slow push-in and drift, starting from the landed pose', () => {
    const base = {heading: 100, pitch: 30};
    expect(holdPose(0, base, 2)).toEqual({view: base, zoom: 2});
    const end = holdPose(1, base, 2);
    expect(end.zoom).toBeCloseTo(2.32); expect(end.view.heading).toBeCloseTo(102.5);
    expect(holdPose(1, base, 2.9).zoom).toBeLessThanOrEqual(3);
  });

  it('says where to look in words and hand widths', () => {
    expect(lookHint({altitude: 34, azimuth: 135}, 'sv').text).toBe('Titta mot sydost, 3 handbredder upp (34°)');
    expect(lookHint({altitude: 12, azimuth: 2}, 'en').text).toBe('Look north, 1 hand up (12°)');
    expect(lookHint({altitude: 3, azimuth: 270}, 'sv').height).toBe('strax ovanför horisonten');
    expect(lookHint({altitude: 80, azimuth: 270}, 'sv').height).toBe('nästan rakt upp');
  });
});
