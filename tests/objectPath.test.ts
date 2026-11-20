import {describe, expect, it} from 'vitest';
import {objects} from '../src/data';
import {issObject} from '../src/issObject';
import {hasPath, movesAmongStars, nightPath, objectPath, starPathSamples} from '../src/objectPath';
import {objectPosition, stockholm} from '../src/astronomy';

const find = (id: string) => objects.find(object => object.id === id)!;
const time = new Date('2026-11-12T22:27:00Z');

describe('F-053 object path', () => {
  it('samples tonight every 10 minutes with whole-hour marks in the local time zone', () => {
    const {night, hours} = nightPath(find('m42'), time, stockholm);
    expect(night.length).toBeGreaterThan(80);
    expect(hours.length).toBeGreaterThan(12);
    expect(hours.every(mark => /^\d\d:00$/.test(mark.label))).toBe(true);
    expect(hours.map(mark => mark.label)).toContain('00:00');
    expect(nightPath(find('m42'), time, stockholm, 'sv').hours.map(mark => mark.label)).toContain('kl. 23');
  });

  it('passes through the object’s position at the hour marks', () => {
    const {hours} = nightPath(find('saturn'), time, stockholm);
    const mark = hours[3], actual = objectPosition(find('saturn'), mark.time, stockholm)!;
    expect(mark.altitude).toBeCloseTo(actual.altitude, 6);
    expect(mark.azimuth).toBeCloseTo(actual.azimuth, 6);
  });

  it('shows motion among the stars only for solar-system bodies and never for the ISS', () => {
    expect(movesAmongStars(find('jupiter'))).toBe(true);
    expect(movesAmongStars(find('m31'))).toBe(false);
    expect(hasPath(issObject)).toBe(false);
    expect(objectPath(find('m31'), time, stockholm).stars).toHaveLength(0);
    const moon = starPathSamples(find('moon'), time, stockholm, 'sv')!;
    expect(moon).toHaveLength(97);
    expect(moon.filter(sample => sample.label)).toHaveLength(6);
    // The Moon moves roughly 13° per day eastwards among the stars.
    const middle = moon[48], dayLater = moon[64];
    const separation = Math.acos(Math.sin(middle.dec * Math.PI / 180) * Math.sin(dayLater.dec * Math.PI / 180) + Math.cos(middle.dec * Math.PI / 180) * Math.cos(dayLater.dec * Math.PI / 180) * Math.cos((dayLater.ra - middle.ra) * Math.PI / 12)) * 180 / Math.PI;
    expect(separation).toBeGreaterThan(10);
    expect(separation).toBeLessThan(16);
  });

  it('the star-path sample at the shown time matches the calculated position', () => {
    const path = objectPath(find('mars'), time, stockholm, 'en');
    const actual = objectPosition(find('mars'), time, stockholm)!;
    expect(path.stars[48].altitude).toBeCloseTo(actual.altitude, 1);
    expect(path.days.length).toBe(8);
  });
});

describe('B-021 object path at every zoom', () => {
  const draw = async (zoom: number) => {
    const {drawObjectPath} = await import('../src/objectPath');
    const {createPreparedPerspectiveProjector} = await import('../src/skyProjection');
    const jupiter = find('jupiter'), path = objectPath(jupiter, time, stockholm, 'sv');
    // Look at the track between two hour marks, where no sample lies at the centre at high zoom.
    const up = path.hours.filter(mark => mark.altitude > 10), a = up[0], b = up[1];
    const half = ((b.azimuth - a.azimuth + 540) % 360 - 180) / 2;
    const view = {heading: (a.azimuth + half + 360) % 360, pitch: (a.altitude + b.altitude) / 2};
    const width = 390, height = 750, lines: number[][] = [];
    let at: number[] = [0, 0];
    const context = {save() {}, restore() {}, setLineDash() {}, beginPath() {}, stroke() {}, fill() {}, arc() {}, fillText() {},
      measureText: (text: string) => ({width: text.length * 6}),
      moveTo(x: number, y: number) { at = [x, y]; }, lineTo(x: number, y: number) { lines.push([...at, x, y]); at = [x, y]; }} as unknown as CanvasRenderingContext2D;
    drawObjectPath(context, path, {mark: createPreparedPerspectiveProjector(view, width, height, true, true, zoom),
      line: createPreparedPerspectiveProjector(view, width, height, false, true, zoom)}, width, height);
    const inside = lines.filter(([x1, y1, x2, y2]) => [x1, x2].some(x => x >= 0 && x <= width) && [y1, y2].some(y => y >= 0 && y <= height));
    return {lines, inside, width, height};
  };
  it('draws a continuous line through the view at 1×, 4×, 20× and 200×', async () => {
    for (const zoom of [1, 4.1, 20, 200]) {
      const {inside, lines, width, height} = await draw(zoom);
      expect(inside.length, `zoom ${zoom}`).toBeGreaterThan(3);
      // Clipped to a small margin: no huge coordinates reach the canvas.
      expect(lines.every(([x1, y1, x2, y2]) => [x1, x2].every(x => x >= -25 && x <= width + 25) && [y1, y2].every(y => y >= -25 && y <= height + 25))).toBe(true);
      // Short pieces, so the track is a curve and not a long chord.
      expect(Math.max(...inside.map(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1)))).toBeLessThan(40);
    }
  });
});
