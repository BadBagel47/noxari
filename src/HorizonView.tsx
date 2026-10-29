import {useEffect, useMemo, useRef, useState, type Dispatch, type PointerEvent, type SetStateAction} from 'react';
import {constellationSky, drawConstellations} from './constellations';
import {Body} from 'astronomy-engine';
import {objectPosition, positionAt, type ObservingLocation, type SkyPosition} from './astronomy';
import {objects, type SpaceObject} from './data';
import {horizontalStarCatalog, projectPerspective, type MapPoint, type ViewDirection} from './skyProjection';

type Props = {
  time: Date;
  location: ObservingLocation;
  label: (object: SpaceObject) => string;
  sunLabel: string;
  onSelect: (object: SpaceObject) => void;
  language: 'en' | 'sv';
  showFigures: boolean;
  showFigureNames: boolean;
  view: ViewDirection;
  onViewChange: Dispatch<SetStateAction<ViewDirection>>;
};

const wrap = (degrees: number) => (degrees % 360 + 360) % 360;
const clamp = (pitch: number) => Math.max(-10, Math.min(90, pitch));
const cardinal = (heading: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(wrap(heading) / 45) % 8];

export function HorizonView({time, location, label, sunLabel, onSelect, language, view, onViewChange, showFigures, showFigureNames}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{id: number; x: number; y: number} | null>(null);
  const [size, setSize] = useState({width: 0, height: 0});
  const stars = useMemo(() => horizontalStarCatalog(time, location), [time, location]);
  const figures = useMemo(() => constellationSky(stars), [stars]);
  const sun = useMemo(() => positionAt(Body.Sun, time, location), [time, location]);
  const markers = useMemo(() => objects.flatMap(object => {
    if (sun.altitude >= -6 && object.id !== 'moon') return [];
    const position = objectPosition(object, time, location);
    const point = position && projectPerspective(position, view, size.width, size.height);
    return point ? [{object, position, point}] : [];
  }), [time, location, sun.altitude, view, size]);
  const sunPoint = projectPerspective(sun, view, size.width, size.height);

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
    const surface = canvas.current;
    if (!surface || !size.width || !size.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(size.width * dpr), pixelHeight = Math.round(size.height * dpr);
    if (surface.width !== pixelWidth) surface.width = pixelWidth;
    if (surface.height !== pixelHeight) surface.height = pixelHeight;
    const context = surface.getContext('2d');
    if (!context) return;
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

    // A level camera makes the geometric horizon horizontal at any heading.
    const horizonY = height / 2 + width / 2 * Math.tan(view.pitch * Math.PI / 180);
    if (horizonY < height) {
      const ground = context.createLinearGradient(0, Math.max(0, horizonY), 0, height);
      ground.addColorStop(0, daylight > 0.4 ? '#233f4c' : '#142b38');
      ground.addColorStop(1, '#061420');
      context.fillStyle = ground;
      context.fillRect(0, Math.max(0, horizonY), width, height);
      if (horizonY >= 0) {
        context.strokeStyle = 'rgba(174,216,238,.6)';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(0, horizonY + .5);
        context.lineTo(width, horizonY + .5);
        context.stroke();
      }
    }

    const drawCurve = (samples: SkyPosition[]) => {
      context.beginPath();
      let previous: MapPoint | null = null;
      for (const position of samples) {
        const point = projectPerspective(position, view, width, height);
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
    for (const altitude of [15, 30, 60]) drawCurve(Array.from({length: 361}, (_, azimuth) => ({altitude, azimuth})));
    for (let azimuth = 0; azimuth < 360; azimuth += 30) drawCurve(Array.from({length: 91}, (_, altitude) => ({altitude, azimuth})));

    if (showFigures) drawConstellations(context, figures, position => projectPerspective(position, view, width, height, false), width, height, starVisibility, showFigureNames);

    if (starVisibility > 0) {
      context.fillStyle = '#e3f1ff';
      for (const star of stars) {
        const point = projectPerspective(star, view, width, height);
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
        context.font = '11px system-ui, sans-serif';
        for (const star of stars) {
          if (!star.name || star.name === 'Sirius') continue;
          const point = projectPerspective(star, view, width, height);
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
  }, [size, view, stars, figures, showFigures, showFigureNames, sun.altitude]);

  const move = (heading: number, pitch: number) => onViewChange(current => ({heading: wrap(current.heading + heading), pitch: clamp(current.pitch + pitch)}));
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('button')) return;
    drag.current = {id: event.pointerId, x: event.clientX, y: event.clientY};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.id !== event.pointerId || !size.width) return;
    const deltaX = event.clientX - drag.current.x;
    const deltaY = event.clientY - drag.current.y;
    drag.current = {id: event.pointerId, x: event.clientX, y: event.clientY};
    move(-deltaX * 90 / size.width, deltaY * 90 / size.width);
  };
  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === event.pointerId) drag.current = null;
  };

  return <div className="sky-canvas horizon-view" ref={root} tabIndex={0}
    aria-label={language === 'sv' ? 'Svepbar himmelsvy. Dra för att vrida, använd piltangenter för att ändra riktning.' : 'Interactive sky view. Drag to turn, or use arrow keys to change direction.'}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPointer} onPointerCancel={endPointer}
    onKeyDown={event => {
      const changes: Record<string, [number, number]> = {ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 8], ArrowDown: [0, -8]};
      const change = changes[event.key];
      if (change && event.target === event.currentTarget) { event.preventDefault(); move(...change); }
    }}>
    <canvas ref={canvas} aria-hidden="true"/>
    <div className="horizon-heading" aria-live="off">{language === 'sv' ? 'Mot' : 'Facing'} {cardinal(view.heading)} · {Math.round(view.heading)}° <span>↑ {Math.round(view.pitch)}°</span></div>
    {markers.map(({object, position, point}) => <button key={object.id} className="sky-object" style={{left: point.x, top: point.y}} onClick={() => onSelect(object)} title={`${label(object)} · ${position.altitude.toFixed(1)}°`} aria-label={`${label(object)}, ${language === 'sv' ? 'höjd' : 'altitude'} ${position.altitude.toFixed(1)}°`}><span className="sky-point" style={{width: object.size + 4, height: object.size + 4, background: object.color, boxShadow: `0 0 16px ${object.color}`}}/><span>{label(object)}</span></button>)}
    {sunPoint && <span className="sky-object sky-sun" style={{left: sunPoint.x, top: sunPoint.y}} role="img" aria-label={`${sunLabel}, ${language === 'sv' ? 'höjd' : 'altitude'} ${sun.altitude.toFixed(1)}°`}><span className="sky-point"/><span>{sunLabel}</span></span>}
    <div className="horizon-help">{language === 'sv' ? 'Dra eller svep för att se dig omkring' : 'Drag or swipe to look around'}</div>
    <div className="horizon-controls" aria-label={language === 'sv' ? 'Styr vyn' : 'View controls'}>
      <button onClick={() => move(-30, 0)} aria-label={language === 'sv' ? 'Vrid åt vänster' : 'Turn left'}>←</button>
      <button onClick={() => move(0, 15)} aria-label={language === 'sv' ? 'Titta upp' : 'Look up'}>↑</button>
      <button onClick={() => move(0, -15)} aria-label={language === 'sv' ? 'Titta ner' : 'Look down'}>↓</button>
      <button onClick={() => move(30, 0)} aria-label={language === 'sv' ? 'Vrid åt höger' : 'Turn right'}>→</button>
    </div>
  </div>;
}
