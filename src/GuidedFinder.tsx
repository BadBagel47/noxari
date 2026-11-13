import {useEffect, useRef} from 'react';
import {ArrowUp, X} from 'lucide-react';
import {DateTime} from 'luxon';
import type {ObservingLocation, SkyPosition} from './astronomy';
import type {SpaceObject} from './data';
import {CENTER_TOLERANCE, continuousAngle, finderArrowRotation, finderGuidance} from './finderGuidance';
import {projectPerspective, type ViewDirection} from './skyProjection';
import type {usePhoneOrientation} from './usePhoneOrientation';

type Props = {
  object: SpaceObject; position: SkyPosition; nextRise: Date | null; location: ObservingLocation;
  view: ViewDirection; width: number; height: number; language: 'en' | 'sv'; phone: ReturnType<typeof usePhoneOrientation>;
  sunAltitude: number; zoom: number; onClose: () => void; onDetails: () => void;
};

export function GuidedFinder({object, position, nextRise, location, view, width, height, language, phone, sunAltitude, zoom, onClose, onDetails}: Props) {
  const sv = language === 'sv', name = sv ? object.sv : object.en;
  const guidance = finderGuidance(position, view);
  const wasCentered = useRef(guidance.centered);
  useEffect(() => {
    // F-037: a short buzz when the phone first lands on the target (where supported).
    if (guidance.centered && !wasCentered.current && phone.active) navigator.vibrate?.(35);
    wasCentered.current = guidance.centered;
  }, [guidance.centered, phone.active]);
  const point = projectPerspective(position, view, width, height, false, false, zoom);
  const inView = point && point.x >= 12 && point.x <= width - 12 && point.y >= 12 && point.y <= height - 12;
  const lastArrow = useRef<number | null>(null);
  const arrowRotation = lastArrow.current = continuousAngle(lastArrow.current, finderArrowRotation(position, view, width, height, point));
  const riseStamp = nextRise && DateTime.fromJSDate(nextRise, {zone: location.timeZone}).setLocale(sv ? 'sv' : 'en').toFormat('dd LLL HH:mm');
  const number = (value: number, digits = 0) => value.toLocaleString(sv ? 'sv-SE' : 'en-GB', {minimumFractionDigits: digits, maximumFractionDigits: digits});
  const heading = `${guidance.headingDelta < 0 ? '←' : '→'} ${number(Math.abs(guidance.headingDelta))}°`;
  const altitude = `${guidance.altitudeDelta < 0 ? '↓' : '↑'} ${number(Math.abs(guidance.altitudeDelta))}°`;
  const status = guidance.belowHorizon ? (sv ? 'Under horisonten' : 'Below horizon') : guidance.centered ? (sv ? 'Centrerat i vyn' : 'Centered in view') : (sv ? 'Rikta mot objektet' : 'Point toward target');

  // F-076: the guide starts following by itself on phones; otherwise it says how to aim manually.
  const mode = phone.status === 'tracking' ? (sv ? 'Följer telefonen' : 'Following phone')
    : phone.status === 'paused' ? (sv ? 'Följning pausad' : 'Following paused')
    : ['requesting', 'waiting', 'retrying'].includes(phone.status) ? (sv ? 'Startar följning…' : 'Starting to follow…')
    : phone.status === 'align' || phone.status === 'recalibrate' ? (sv ? 'Följer – kalibrera norr' : 'Following – align north')
    : (sv ? 'Manuell vy · dra mot pilen' : 'Manual view · drag toward the arrow');

  return <div className={`guided-finder ${guidance.centered ? 'is-centered' : ''} ${guidance.belowHorizon ? 'is-below' : ''}`}>
    <div className="finder-reticle" aria-hidden="true">
      {!guidance.centered && !guidance.belowHorizon && <span className="finder-orbit-arrow" style={{transform: `translate(-50%,-50%) rotate(${arrowRotation}deg)`}}><ArrowUp size={24}/></span>}
    </div>
    {!guidance.belowHorizon && inView && <div className="finder-target-ring" style={{left: point.x, top: point.y}} aria-hidden="true"><span>{name}</span></div>}
    <div className="finder-readout finder-hud" data-sky-controls>
      <div className="finder-title"><div><strong>{name}</strong><span>{mode}</span></div><div className="finder-hud-actions"><button onClick={onDetails}>{sv ? 'Detaljer' : 'Details'}</button><button aria-label={sv ? 'Avsluta objektguiden' : 'Stop Guided Finder'} onClick={onClose}><X size={18}/></button></div></div>
      <strong role="status">{status}{guidance.centered ? ` (≤${CENTER_TOLERANCE}°)` : ''}</strong>
      {guidance.belowHorizon ? <p>{sv ? 'Höjd' : 'Altitude'} {number(position.altitude, 1)}°. {riseStamp ? `${sv ? 'Nästa geometriska uppgång' : 'Next geometric rise'} ≈ ${riseStamp}` : (sv ? 'Ingen uppgång hittad under kommande 48 timmar.' : 'No rise found in the next 48 hours.')}</p>
        : !guidance.centered && <div className="finder-offsets"><span>{sv ? 'Vrid' : 'Turn'} {heading}</span><span>{sv ? 'Luta' : 'Tilt'} {altitude}</span><span>{sv ? 'Avstånd i vinkel' : 'Angular distance'} {number(guidance.separation, 1)}°</span></div>}

      {!guidance.belowHorizon && sunAltitude >= -6 && <p className="finder-twilight">{sv ? 'Ljus himmel: markeringen visar beräknad position.' : 'Bright sky: the marker shows a calculated position.'}</p>}
    </div>
  </div>;
}
