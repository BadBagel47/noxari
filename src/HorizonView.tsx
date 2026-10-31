import {useEffect, useMemo, useRef, useState, type Dispatch, type PointerEvent, type SetStateAction} from 'react';
import {constellationSky, drawConstellations, type FigureMode} from './constellations';
import {ConstellationReveal} from './constellationReveal';
import {useReducedMotion} from './useReducedMotion';
import {boundarySky, drawBoundaries} from './constellationBoundaries';
import {Body} from 'astronomy-engine';
import {nextObjectRise, objectPosition, objectPositioner, positionAt, showObjectMarker, type ObservingLocation, type SkyPosition} from './astronomy';
import {objects, type SpaceObject} from './data';
import {horizontalStarCatalog, perspectiveFocal, projectPerspective, type MapPoint, type ViewDirection} from './skyProjection';
import {GuidedFinder} from './GuidedFinder';
import {clampViewPitch, groundOpacity} from './groundView';
import {MilkyWayPainter, type MilkyWayTexture} from './milkyWay';
import type {usePhoneOrientation} from './usePhoneOrientation';

type Props = {
  selectedId?: string;
  time: Date;
  location: ObservingLocation;
  label: (object: SpaceObject) => string;
  sunLabel: string;
  onSelect: (object: SpaceObject) => void;
  language: 'en' | 'sv';
  showFigures: boolean;
  showFigureNames: boolean;
  figureMode: FigureMode;
  showBoundaries: boolean;
  milkyWay: MilkyWayTexture | null;
  view: ViewDirection;
  onViewChange: Dispatch<SetStateAction<ViewDirection>>;
  finderTarget: SpaceObject | null;
  phone: ReturnType<typeof usePhoneOrientation>;
  onStopFinder: () => void;
  onFinderDetails: () => void;
};

const wrap = (degrees: number) => (degrees % 360 + 360) % 360;
const cardinal = (heading: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(wrap(heading) / 45) % 8];

export function HorizonView({selectedId, time, location, label, sunLabel, onSelect, language, view, onViewChange, showFigures, showFigureNames, figureMode, showBoundaries, milkyWay, finderTarget, phone, onStopFinder, onFinderDetails}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reveal = useRef(new ConstellationReveal());
  const milkyWayPainter = useRef(new MilkyWayPainter());
  const reducedMotion = useReducedMotion();
  const drag = useRef<{id: number; x: number; y: number; startX: number; startY: number; moved: boolean; marker: HTMLButtonElement | null} | null>(null);
  const suppressClick = useRef(false);
  const [size, setSize] = useState({width: 0, height: 0});
  const stars = useMemo(() => horizontalStarCatalog(time, location), [time, location]);
  const figures = useMemo(() => constellationSky(stars, figureMode), [stars, figureMode]);
  const boundaries = useMemo(() => showBoundaries ? boundarySky(time, location) : [], [showBoundaries, time, location]);
  const sun = useMemo(() => positionAt(Body.Sun, time, location), [time, location]);
  const targetPosition = useMemo(() => finderTarget ? objectPosition(finderTarget, time, location) : null, [finderTarget, time, location]);
  const nextRise = useMemo(() => finderTarget && targetPosition && targetPosition.altitude < 0 ? nextObjectRise(finderTarget, time, location) : null, [finderTarget, targetPosition, time, location]);
  const objectSky = useMemo(() => {
    const resolve = objectPositioner(time, location);
    return objects.flatMap(object => {
      const position = resolve(object);
      return position ? [{object, position}] : [];
    });
  }, [time, location]);
  const markers = useMemo(() => objectSky.flatMap(({object, position}) => {
    if (object.id === finderTarget?.id) return [];
    if (!showObjectMarker(object, sun.altitude)) return [];
    if (position.altitude < 0 && groundOpacity(view.pitch) > .9) return [];
    const point = position && projectPerspective(position, view, size.width, size.height, true, view.pitch < 0);
    return point ? [{object, position, point}] : [];
  }), [objectSky, sun.altitude, view, size, finderTarget]);
  const belowReveal = 1 - groundOpacity(view.pitch);
  const project = (position: SkyPosition, clip = true) => projectPerspective(position, view, size.width, size.height, clip, belowReveal > 0);
  const sunPoint = project(sun);

  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const {width, height} = entry.contentRect;
      setSize({width, height});
    });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const end = (event: globalThis.PointerEvent) => {
      if (drag.current?.id === event.pointerId) drag.current = null;
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  useEffect(() => {
    const surface = canvas.current;
    if (!surface || !size.width || !size.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(size.width * dpr), pixelHeight = Math.round(size.height * dpr);
    if (surface.width !== pixelWidth) surface.width = pixelWidth;
    if (surface.height !== pixelHeight) surface.height = pixelHeight;
    const context = surface.getContext('2d');
    if (!context) return;
    let frame = 0;
    const render = () => {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.globalAlpha = 1;
      context.textAlign = 'left';
      const {width, height} = size;
      const daylight = Math.max(0, Math.min(1, (sun.altitude + 18) / 24));
      const starVisibility = Math.max(0, Math.min(1, (-sun.altitude - 2) / 12));
      const sky = context.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, daylight ? `rgb(${Math.round(6 + 52 * daylight)},${Math.round(14 + 92 * daylight)},${Math.round(35 + 145 * daylight)})` : '#040c1b');
      sky.addColorStop(1, daylight ? `rgb(${Math.round(21 + 77 * daylight)},${Math.round(41 + 103 * daylight)},${Math.round(69 + 139 * daylight)})` : '#14304b');
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);

      if (milkyWay) milkyWayPainter.current.draw(context, milkyWay, time, location, width, height, Math.max(0, Math.min(1, (-sun.altitude - 8) / 10)), view, belowReveal > 0);

      const drawCurve = (samples: SkyPosition[]) => {
        context.beginPath();
        let previous: MapPoint | null = null;
        for (const position of samples) {
          const point = project(position);
          if (point) {
            if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < width / 8) context.lineTo(point.x, point.y);
            else context.moveTo(point.x, point.y);
          }
          previous = point;
        }
        context.stroke();
      };
      context.strokeStyle = 'rgba(171,209,233,.17)';
      context.lineWidth = 1;
      for (const altitude of (belowReveal > 0 ? [-60, -30, 0, 15, 30, 60] : [15, 30, 60])) drawCurve(Array.from({length: 361}, (_, azimuth) => ({altitude, azimuth})));
      for (let azimuth = 0; azimuth < 360; azimuth += 30) drawCurve(Array.from({length: belowReveal > 0 ? 181 : 91}, (_, i) => ({altitude: i - (belowReveal > 0 ? 90 : 0), azimuth})));

      if (showBoundaries) drawBoundaries(context, boundaries, position => project(position, false), width, height, starVisibility);

      const animating = showFigures && drawConstellations(context, figures, position => project(position, false), width, height, starVisibility, showFigureNames, {reveal: reveal.current, now: performance.now(), reducedMotion});
      if (!showFigures) reveal.current.reset();

      if (starVisibility > 0) {
        context.fillStyle = '#e3f1ff';
        for (const star of stars) {
          const point = project(star);
          if (!point) continue;
          const brightness = Math.max(.18, Math.min(1, (6.1 - star.magnitude) / 5.8));
          context.globalAlpha = starVisibility * (.28 + brightness * .72);
          const radius = star.magnitude < 0 ? 3 : star.magnitude < 2 ? 2.2 : star.magnitude < 4 ? 1.5 : .9;
          context.beginPath();
          context.arc(point.x, point.y, radius, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 1;
        if (starVisibility > .5) {
          context.fillStyle = '#b9d4e8';
          context.font = '13px system-ui, sans-serif';
          for (const star of stars) {
            if (!star.name || star.name === 'Sirius') continue;
            const point = project(star);
            if (point && point.x < width - 85 && point.y > 20) context.fillText(star.name, point.x + 6, point.y - 6);
          }
        }
      }

      context.font = 'bold 12px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillStyle = '#d5e9f4';
      for (let azimuth = 0; azimuth < 360; azimuth += 45) {
        const point = projectPerspective({altitude: 4, azimuth}, view, width, height);
        if (point && point.y > 35 && point.y < height - 32) context.fillText(cardinal(azimuth), point.x, point.y);
      }
      // A level camera makes the geometric horizon horizontal at any heading.
      const horizonY = height / 2 + perspectiveFocal(width, height) * Math.tan(view.pitch * Math.PI / 180);
      if (horizonY < height) {
        context.save();
        context.globalAlpha = groundOpacity(view.pitch);
        const ground = context.createLinearGradient(0, Math.max(0, horizonY), 0, height);
        ground.addColorStop(0, daylight > 0.4 ? '#233f4c' : '#142b38');
        ground.addColorStop(1, '#061420');
        context.fillStyle = ground;
        context.fillRect(0, Math.max(0, horizonY), width, height);
        context.restore();
        if (horizonY >= 0) {
          context.strokeStyle = 'rgba(174,216,238,.6)';
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(0, horizonY + .5);
          context.lineTo(width, horizonY + .5);
          context.stroke();
        }
      }

      if (animating) frame = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(frame);
  }, [size, view, stars, figures, boundaries, showFigures, showFigureNames, figureMode, showBoundaries, reducedMotion, sun.altitude, milkyWay, time, location]);

  const move = (heading: number, pitch: number) => onViewChange(current => ({heading: wrap(current.heading + heading), pitch: clampViewPitch(current.pitch + pitch)}));
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || drag.current) return;
    if (event.target instanceof Element && (event.target.closest('[data-sky-controls]') || (event.target.closest('button') && !event.target.closest('button.sky-object')))) return;
    suppressClick.current = false;
    const marker = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button.sky-object') : null;
    drag.current = {id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false, marker};
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.id !== event.pointerId || !size.width) return;
    if (!drag.current.moved) {
      if (Math.hypot(event.clientX - drag.current.startX, event.clientY - drag.current.startY) < 8) return;
      drag.current.moved = true;
      suppressClick.current = true;
      // Defer capture until a drag is established so stationary marker taps
      // still activate the original button (including native keyboard clicks).
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus({preventScroll: true});
    }
    const deltaX = event.clientX - drag.current.x;
    const deltaY = event.clientY - drag.current.y;
    drag.current.x = event.clientX; drag.current.y = event.clientY;
    const focal = perspectiveFocal(size.width, size.height);
    const horizontalField = 2 * Math.atan(size.width / (2 * focal)) * 180 / Math.PI;
    const verticalField = 2 * Math.atan(size.height / (2 * focal)) * 180 / Math.PI;
    move(-deltaX * horizontalField / size.width, deltaY * verticalField / size.height);
  };
  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === event.pointerId) drag.current = null;
  };
  const finishPointer = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = drag.current;
    if (gesture?.id === event.pointerId && !gesture.moved && gesture.marker?.isConnected && event.pointerType === 'touch') {
      // Touch browsers can omit the compatibility click immediately after a
      // pan. Activate a settled marker tap here and suppress its later click.
      suppressClick.current = true;
      gesture.marker.click();
    }
    endPointer(event);
  };

  return <div className={`sky-canvas horizon-view ${finderTarget ? 'finder-active' : ''}`} ref={root} tabIndex={0}
    aria-label={phone.active ? (language === 'sv' ? 'Telefonföljning aktiv. Tryck Stoppa för manuell styrning.' : 'Phone following active. Press Stop for manual control.') : (language === 'sv' ? 'Svepbar himmelsvy. Dra för att vrida, använd piltangenter för att ändra riktning.' : 'Interactive sky view. Drag to turn, or use arrow keys to change direction.')}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishPointer} onPointerCancel={endPointer}
    onLostPointerCapture={event => { if (event.target === event.currentTarget) endPointer(event); }}
    onClickCapture={event => { if (suppressClick.current && event.detail !== 0 && event.target instanceof Element && !event.target.closest('[data-sky-controls], .horizon-controls')) { event.preventDefault(); event.stopPropagation(); } }}
    onKeyDown={event => {
      if (finderTarget && event.key === 'Escape') { event.preventDefault(); onStopFinder(); return; }
      const changes: Record<string, [number, number]> = {ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 8], ArrowDown: [0, -8]};
      const change = changes[event.key];
      if (change && event.target === event.currentTarget) { event.preventDefault(); move(...change); }
    }}>
    <canvas ref={canvas} aria-hidden="true"/>
    <div className="horizon-heading" aria-live="off">{language === 'sv' ? 'Mot' : 'Facing'} {cardinal(view.heading)} · {Math.round(view.heading)}° <span>{view.pitch < 0 ? '↓' : '↑'} {Math.round(Math.abs(view.pitch))}°</span>{view.pitch < 0 && <span className="below-horizon-label">{language === 'sv' ? 'Under horisonten · simulerad vy' : 'Below horizon · simulated view'}</span>}</div>
    {markers.map(({object, position, point}) => <button key={object.id} className={`sky-object ${selectedId === object.id ? 'is-selected' : ''}`} aria-pressed={selectedId === object.id} style={{left: point.x, top: point.y, opacity: position.altitude < 0 ? belowReveal * .8 : 1}} onClick={() => onSelect(object)} title={`${label(object)} · ${position.altitude.toFixed(1)}°`} aria-label={`${label(object)}, ${language === 'sv' ? 'höjd' : 'altitude'} ${position.altitude.toFixed(1)}°`}><span className="sky-point" style={{width: object.size + 4, height: object.size + 4, background: object.color, boxShadow: `0 0 16px ${object.color}`}}/><span>{label(object)}</span></button>)}
    {sunPoint && <span className="sky-object sky-sun" style={{left: sunPoint.x, top: sunPoint.y, opacity: sun.altitude < 0 ? belowReveal * .8 : 1}} role="img" aria-label={`${sunLabel}, ${language === 'sv' ? 'höjd' : 'altitude'} ${sun.altitude.toFixed(1)}°`}><span className="sky-point"/><span>{sunLabel}</span></span>}
    {finderTarget && targetPosition && <GuidedFinder object={finderTarget} position={targetPosition} nextRise={nextRise} location={location} view={view} width={size.width} height={size.height} language={language} phone={phone} sunAltitude={sun.altitude} onClose={onStopFinder} onDetails={onFinderDetails}/>}
    <div className="horizon-help">{language === 'sv' ? 'Dra eller svep för att se dig omkring' : 'Drag or swipe to look around'}</div>
    <div className="horizon-controls" aria-label={language === 'sv' ? 'Styr vyn' : 'View controls'}>
      <button onClick={() => move(-30, 0)} aria-label={language === 'sv' ? 'Vrid åt vänster' : 'Turn left'}>←</button>
      <button onClick={() => move(0, 15)} aria-label={language === 'sv' ? 'Titta upp' : 'Look up'}>↑</button>
      <button onClick={() => move(0, -15)} aria-label={language === 'sv' ? 'Titta ner' : 'Look down'}>↓</button>
      <button onClick={() => move(30, 0)} aria-label={language === 'sv' ? 'Vrid åt höger' : 'Turn right'}>→</button>
    </div>
  </div>;
}
