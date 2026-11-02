import textureUrl from '../../src/generated/milkyWay.png';
import {GpuSky} from './GpuSky';
import {LabScene, fixtureLocation, fixtureTime, startView, type Mode, type Parts} from './scene';
import {MotionResolution} from '../../src/motionResolution';
import {clampViewPitch} from '../../src/groundView';
import {prepareHorizontalStars, projectPerspective, type ViewDirection} from '../../src/skyProjection';
import {MilkyWayPainter, milkyWaySample, type MilkyWayTexture} from '../../src/milkyWay';
import type {ObservingLocation} from '../../src/astronomy';

declare const __LAB_BUILD_REF__: string;
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const summary = (samples: number[]) => {
  const sorted = [...samples].sort((a, b) => a - b);
  const round = (value: number) => Math.round(value * 100) / 100;
  return {count: sorted.length, median: round(sorted[Math.floor(sorted.length * .5)] ?? 0), p95: round(sorted[Math.floor(sorted.length * .95)] ?? 0), max: round(sorted.at(-1) ?? 0)};
};
async function loadTexture(): Promise<MilkyWayTexture> {
  const image = new Image();image.src = textureUrl;await image.decode();
  const canvas = document.createElement('canvas');canvas.width = image.width;canvas.height = image.height;
  const context = canvas.getContext('2d')!;context.drawImage(image, 0, 0);
  return {width: image.width, height: image.height, pixels: context.getImageData(0, 0, image.width, image.height).data};
}

type Run = {
  requested: Mode; effective: string; frames: number; width: number; height: number; dpr: number;
  intervals: ReturnType<typeof summary>; over25ms: number; draw: ReturnType<typeof summary>;
  stages: {milky: ReturnType<typeof summary>; stars: ReturnType<typeof summary>; other: ReturnType<typeof summary>};
};
type Config = {mode?: Mode; view?: ViewDirection; zoom?: number; density?: 'motion'|'full'; time?: string; location?: ObservingLocation};
type LabApi = {
  configure: (config: Config) => void;
  render: () => ReturnType<LabScene['draw']>;
  sweep: (mode: Mode, frames?: number) => Promise<Run>;
  compare: () => Promise<unknown>;
  cancel: () => void;
  gpu: () => GpuSky | null;
  scene: () => LabScene;
  testing: {GpuSky: typeof GpuSky; prepareHorizontalStars: typeof prepareHorizontalStars; projectPerspective: typeof projectPerspective; MilkyWayPainter: typeof MilkyWayPainter; milkyWaySample: typeof milkyWaySample; texture: MilkyWayTexture};
};
declare global {interface Window {skyLab: LabApi}}

async function main() {
  const texture = await loadTexture();
  const canvas = element<HTMLCanvasElement>('sky'), gpuCanvas = element<HTMLCanvasElement>('gpu-canvas');
  const stage = element<HTMLDivElement>('stage'), markerRoot = element<HTMLDivElement>('markers');
  const modeSelect = element<HTMLSelectElement>('mode'), densitySelect = element<HTMLSelectElement>('density');
  const status = element('status'), error = element('error'), result = element('result');
  const compare = element<HTMLButtonElement>('compare'), stop = element<HTMLButtonElement>('stop'), download = element<HTMLButtonElement>('download');
  let scene = new LabScene(fixtureTime, fixtureLocation, texture);
  let gpu: GpuSky | null = null, gpuProblem = '';
  let mode: Mode = 'canvas', density: 'motion'|'full' = 'motion', view: ViewDirection = {...startView}, zoom = 1;
  let width = innerWidth, height = innerHeight, frame = 0, settle: ReturnType<typeof setTimeout> | undefined;
  let busy = false, cancelled = false, resolution = new MotionResolution();
  let lastReport: unknown = null;
  const markers = new Map<string, HTMLSpanElement>();
  let latest: ReturnType<LabScene['draw']>;

  function setGpuStatus() {
    const info = gpu?.available ? gpu.info() : null;
    element('backend').textContent = info ? `WebGL 2 · ${info.renderer}` : `Canvas-reservläge · ${gpuProblem || 'GPU tillfälligt otillgänglig'}`;
    for (const option of modeSelect.options) option.disabled = option.value !== 'canvas' && !info;
    error.textContent = gpuProblem;
  }
  function createGpu() {
    gpu?.dispose();gpu = null;
    try {gpu = new GpuSky(gpuCanvas);gpu.setScene(scene.stars, texture);gpuProblem = '';}
    catch (reason) {gpuProblem = reason instanceof Error ? reason.message : String(reason);}
    setGpuStatus();
  }
  createGpu();
  gpuCanvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();cancelled = true;gpuProblem = 'GPU-kontexten förlorades. Canvas används tills den återkommer.';
    gpu?.dispose();gpu = null;setGpuStatus();request();
  });
  gpuCanvas.addEventListener('webglcontextrestored', () => {createGpu();request();});

  function updateMarkers() {
    const visible = new Set<string>();
    for (const {object, point, opacity} of scene.markers(view, width, height, zoom)) {
      visible.add(object.id);let marker = markers.get(object.id);
      if (!marker) {
        marker = document.createElement('span');marker.className = 'marker';
        const dot = document.createElement('span');dot.className = 'dot';dot.style.background = object.color;dot.style.color = object.color;
        marker.append(dot, document.createTextNode(object.sv));markers.set(object.id, marker);markerRoot.append(marker);
      }
      marker.hidden = false;marker.style.left = `${point.x}px`;marker.style.top = `${point.y}px`;marker.style.opacity = String(opacity);
    }
    for (const [id, marker] of markers) if (!visible.has(id)) marker.hidden = true;
  }
  function render(now: number, benchmarkDpr?: number) {
    const quality = density === 'full' ? {dpr: Math.min(devicePixelRatio || 1, 2), restoreAt: null}
      : resolution.sample(view, zoom, devicePixelRatio || 1, performance.now());
    if (settle !== undefined) clearTimeout(settle);
    settle = benchmarkDpr === undefined && quality.restoreAt !== null ? setTimeout(request, Math.max(1, quality.restoreAt - performance.now() + 1)) : undefined;
    try {
      latest = scene.draw(canvas, gpu, mode, width, height, benchmarkDpr ?? quality.dpr, view, zoom, now, busy || matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (reason) {
      gpuProblem = `GPU-provet avbröts: ${reason instanceof Error ? reason.message : String(reason)}`;
      gpu?.dispose();gpu = null;cancelled = true;setGpuStatus();
      latest = scene.draw(canvas, null, 'canvas', width, height, benchmarkDpr ?? quality.dpr, view, zoom, now, true);
    }
    updateMarkers();
    element('pose').textContent = `Mot ${view.heading.toFixed(1)}° · höjd ${view.pitch.toFixed(1)}° · ${zoom.toFixed(2)}×${view.pitch < 0 ? ' · Under horisonten: simulerad vy' : ''}`;
    return latest;
  }
  function request() {
    if (!frame && !busy) frame = requestAnimationFrame(now => {frame = 0;if (render(now).animating) request();});
  }
  function replaceScene(time: Date, location: ObservingLocation) {
    scene = new LabScene(time, location, texture);gpu?.setScene(scene.stars, texture);resolution = new MotionResolution();
  }
  function configure(config: Config) {
    if (busy) throw new Error('Jämförelsen pågår.');
    if (config.mode) {mode = config.mode;modeSelect.value = mode;}
    if (config.view) view = {...config.view};
    if (config.zoom !== undefined) zoom = Math.max(1, Math.min(3, config.zoom));
    if (config.density) {density = config.density;densitySelect.value = density;resolution = new MotionResolution();}
    if (config.time || config.location) replaceScene(config.time ? new Date(config.time) : scene.time, config.location ?? scene.location);
    request();
  }
  modeSelect.onchange = () => configure({mode: modeSelect.value as Mode});
  densitySelect.onchange = () => configure({density: densitySelect.value as 'motion'|'full'});
  element('reset').onclick = () => configure({view: startView, zoom: 1});
  const observer = new ResizeObserver(([entry]) => {width = entry.contentRect.width;height = entry.contentRect.height;if (busy) cancelled = true;request();});
  observer.observe(stage);

  const touches = new Map<number, {x: number; y: number}>();
  let drag: {id: number; x: number; y: number} | null = null, pinch: {distance: number; zoom: number} | null = null;
  stage.onpointerdown = event => {
    if (busy || event.button !== 0) return;
    touches.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (touches.size === 2) {const [a, b] = [...touches.values()];pinch = {distance: Math.hypot(a.x - b.x, a.y - b.y), zoom};drag = null;}
    else if (touches.size === 1) drag = {id: event.pointerId, x: event.clientX, y: event.clientY};
    stage.setPointerCapture(event.pointerId);stage.focus({preventScroll: true});
  };
  stage.onpointermove = event => {
    if (busy || !touches.has(event.pointerId)) return;
    touches.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (pinch && touches.size === 2) {
      const [a, b] = [...touches.values()];if (pinch.distance > 0) zoom = Math.max(1, Math.min(3, pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinch.distance));request();return;
    }
    if (!drag || drag.id !== event.pointerId) return;
    const focal = Math.max(width, height) / 2 * zoom;
    view = {heading: (view.heading - (event.clientX - drag.x) * 2 * Math.atan(width / (2 * focal)) * 180 / Math.PI / width + 360) % 360,
      pitch: clampViewPitch(view.pitch + (event.clientY - drag.y) * 2 * Math.atan(height / (2 * focal)) * 180 / Math.PI / height)};
    drag.x = event.clientX;drag.y = event.clientY;request();
  };
  const end = (event: PointerEvent) => {touches.delete(event.pointerId);if (touches.size < 2) pinch = null;if (drag?.id === event.pointerId) drag = null;};
  stage.onpointerup = end;stage.onpointercancel = end;stage.onlostpointercapture = end;
  stage.onkeydown = event => {
    if (busy) return;
    const delta = ({ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 8], ArrowDown: [0, -8]} as Record<string, number[]>)[event.key];
    if (delta) {event.preventDefault();view = {heading: (view.heading + delta[0] + 360) % 360, pitch: clampViewPitch(view.pitch + delta[1])};request();}
  };

  const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve));
  async function sweep(requested: Mode, count = 90): Promise<Run> {
    mode = requested;modeSelect.value = mode;
    const ratio = density === 'full' ? Math.min(devicePixelRatio || 1, 2) : Math.min(devicePixelRatio || 1, 1.5);
    view = {...startView};zoom = 1;scene.reveal.reset();
    for (let warm = 0; warm < 12; warm++) {if (cancelled) throw new Error('Jämförelsen avbröts.');render(await nextFrame(), ratio);}
    const intervals: number[] = [], draws: number[] = [], parts: Parts[] = [];
    let previous = await nextFrame(), effective = '';
    for (let i = 0; i < count; i++) {
      if (cancelled || document.hidden) throw new Error('Jämförelsen avbröts.');
      view = {heading: startView.heading - i * .14, pitch: startView.pitch};
      const t = performance.now(), drawn = render(previous, ratio);effective = drawn.effective;draws.push(performance.now() - t);parts.push(drawn.parts);
      const now = await nextFrame();intervals.push(now - previous);previous = now;
    }
    if (requested !== 'canvas' && effective !== requested) throw new Error('GPU saknas; reservläget räknas inte som ett GPU-resultat.');
    return {requested, effective, frames: count, width, height, dpr: ratio, intervals: summary(intervals), over25ms: intervals.filter(t => t > 25).length, draw: summary(draws),
      stages: {milky: summary(parts.map(p => p.milky)), stars: summary(parts.map(p => p.stars)), other: summary(parts.map(p => p.other))}};
  }
  async function exclusive<T>(run: () => Promise<T>) {
    if (busy) throw new Error('Jämförelsen pågår redan.');
    busy = true;cancelled = false;compare.disabled = true;stop.disabled = false;modeSelect.disabled = true;densitySelect.disabled = true;
    if (frame) cancelAnimationFrame(frame);frame = 0;if (settle !== undefined) clearTimeout(settle);
    const previous = {scene, view, zoom, mode};
    try {return await run();}
    finally {scene = previous.scene;view = previous.view;zoom = previous.zoom;mode = previous.mode;modeSelect.value = mode;gpu?.setScene(scene.stars, texture);busy = false;compare.disabled = false;stop.disabled = true;modeSelect.disabled = false;densitySelect.disabled = false;resolution = new MotionResolution();request();}
  }
  async function compareModes() {
    return exclusive(async () => {
      if (!gpu?.available) throw new Error('GPU är inte tillgängligt; Canvas-reserven kan användas manuellt.');
      replaceScene(fixtureTime, fixtureLocation);
      const info = gpu.info(), runs: Run[] = [];
      for (const requested of ['canvas', 'gpu', 'gpu', 'canvas'] as Mode[]) {
        status.textContent = `Jämförelse ${runs.length + 1}/4: ${requested}. Byt inte flik eller skärmstorlek.`;
        runs.push(await sweep(requested));
      }
      lastReport = {prototypeBuild: __LAB_BUILD_REF__, userAgent: navigator.userAgent, webgl: info, fixture: {time: fixtureTime.toISOString(), preset: 'Stockholm', stars: scene.stars.length},
        note: 'Isolerad renderingsprototyp, GPU-till-Canvas-brygga. Ingen React/sensorbedömning, inga GPS-koordinater. GPU-kommandotid är inte GPU-sluttid. Inga readPixels/finish i tidsmätningen.', runs};
      result.textContent = runs.map(run => `${run.effective}: median ${run.intervals.median} ms · p95 ${run.intervals.p95} ms · ${run.over25ms}/${run.frames} över 25 ms\n  ritkommando median ${run.draw.median} ms (MW ${run.stages.milky.median}, stjärnor ${run.stages.stars.median})`).join('\n');
      status.textContent = 'Jämförelsen är klar. Bedöm även den manuella känslan i båda lägena.';download.disabled = false;
      return lastReport;
    });
  }
  compare.onclick = () => {void compareModes().catch(reason => {status.textContent = reason instanceof Error ? reason.message : String(reason);});};
  stop.onclick = () => {cancelled = true;};
  download.onclick = () => {
    if (!lastReport) return;const url = URL.createObjectURL(new Blob([JSON.stringify(lastReport, null, 2)], {type: 'application/json'}));
    const link = document.createElement('a');link.href = url;link.download = 'noxari-gpu-prototype.json';link.click();setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  document.addEventListener('visibilitychange', () => {if (document.hidden) cancelled = true;});
  window.addEventListener('pagehide', () => {cancelled = true;if (frame) cancelAnimationFrame(frame);frame = 0;if (settle !== undefined) clearTimeout(settle);observer.disconnect();gpu?.dispose();gpu = null;});
  window.addEventListener('pageshow', event => {if (event.persisted) {observer.observe(stage);createGpu();request();}});
  window.skyLab = {
    configure, render: () => render(performance.now()), sweep: (requested, count) => exclusive(() => sweep(requested, count)), compare: compareModes,
    cancel: () => {cancelled = true;}, gpu: () => gpu, scene: () => scene,
    testing: {GpuSky, prepareHorizontalStars, projectPerspective, MilkyWayPainter, milkyWaySample, texture},
  };
  status.textContent = `Redo. ${scene.stars.length.toLocaleString('sv-SE')} stjärnor, alla 88 figurer och IAU-gränser. Inga sensorer används.`;
  request();
}
void main().catch(reason => {element('error').textContent = `Prototypen kunde inte starta: ${reason instanceof Error ? reason.message : String(reason)}`;});
