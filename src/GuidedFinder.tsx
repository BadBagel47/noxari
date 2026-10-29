import {ArrowUp, X} from 'lucide-react';
import {DateTime} from 'luxon';
import type {ObservingLocation, SkyPosition} from './astronomy';
import type {SpaceObject} from './data';
import {CENTER_TOLERANCE, finderArrowRotation, finderGuidance} from './finderGuidance';
import {projectPerspective, type ViewDirection} from './skyProjection';
import {PhoneControls} from './PhoneControls';
import type {usePhoneOrientation} from './usePhoneOrientation';

type Props = {
  object: SpaceObject; position: SkyPosition; nextRise: Date | null; time: Date; location: ObservingLocation;
  view: ViewDirection; width: number; height: number; language: 'en' | 'sv'; phone: ReturnType<typeof usePhoneOrientation>;
  sunAltitude: number; onClose: () => void; onCenter: () => void; onDetails: () => void;
};

export function GuidedFinder({object, position, nextRise, time, location, view, width, height, language, phone, sunAltitude, onClose, onCenter, onDetails}: Props) {
  const sv = language === 'sv', name = sv ? object.sv : object.en;
  const guidance = finderGuidance(position, view);
  const point = projectPerspective(position, view, width, height, false);
  const inView = point && point.x >= 12 && point.x <= width - 12 && point.y >= 12 && point.y <= height - 12;
  const arrowRotation = finderArrowRotation(position, view, width, height, point);
  const stamp = DateTime.fromJSDate(time, {zone: location.timeZone}).setLocale(sv ? 'sv' : 'en').toFormat('dd LLL HH:mm');
  const riseStamp = nextRise && DateTime.fromJSDate(nextRise, {zone: location.timeZone}).setLocale(sv ? 'sv' : 'en').toFormat('dd LLL HH:mm');
  const heading = `${guidance.headingDelta < 0 ? '←' : '→'} ${Math.abs(guidance.headingDelta).toFixed(0)}°`;
  const altitude = `${guidance.altitudeDelta < 0 ? '↓' : '↑'} ${Math.abs(guidance.altitudeDelta).toFixed(0)}°`;
  const status = guidance.belowHorizon ? (sv ? 'Under horisonten' : 'Below horizon') : guidance.centered ? (sv ? 'Centrerat i vyn' : 'Centered in view') : (sv ? 'Rikta mot objektet' : 'Point toward target');

  return <div className={`guided-finder ${guidance.centered ? 'is-centered' : ''} ${guidance.belowHorizon ? 'is-below' : ''}`}>
    <div className="finder-target-header" data-sky-controls><div className="finder-title"><div><strong>{name}</strong><span>{phone.status === 'tracking' ? (sv ? 'Telefonföljning' : 'Following phone') : (sv ? 'Manuell vy' : 'Manual view')} · {location.name} · {stamp}</span></div><button aria-label={sv ? 'Avsluta Guided Finder' : 'Stop Guided Finder'} onClick={onClose}><X size={18}/></button></div><PhoneControls phone={phone} language={language} compact/></div>
    <div className="finder-reticle" aria-hidden="true"><span/><span/></div>
    {!guidance.belowHorizon && inView && <div className="finder-target-ring" style={{left: point.x, top: point.y}} aria-hidden="true"><span>{name}</span></div>}
    <div className="finder-readout" data-sky-controls>
      {!guidance.belowHorizon && !guidance.centered && <div className="finder-direction-cue" aria-hidden="true"><ArrowUp size={26} style={{transform: `rotate(${arrowRotation}deg)`}}/></div>}
      <strong role="status">{status}{guidance.centered ? ` (≤${CENTER_TOLERANCE}°)` : ''}</strong>
      {guidance.belowHorizon ? <p>{sv ? 'Höjd' : 'Altitude'} {position.altitude.toFixed(1)}°. {riseStamp ? `${sv ? 'Nästa geometriska uppgång' : 'Next geometric rise'} ≈ ${riseStamp}` : (sv ? 'Ingen uppgång hittad under kommande 48 timmar.' : 'No rise found in the next 48 hours.')}</p>
        : !guidance.centered && <div className="finder-offsets"><span>{sv ? 'Vrid' : 'Turn'} {heading}</span><span>{sv ? 'Luta' : 'Tilt'} {altitude}</span><span>{sv ? 'Avstånd i vinkel' : 'Angular distance'} {guidance.separation.toFixed(1)}°</span></div>}
      {guidance.centered && <p>{sv ? 'Beräknad riktning i centrum; faktisk synlighet och kompassprecision kan variera.' : 'Calculated direction is centered; visibility and compass accuracy can vary.'}</p>}
      {!guidance.belowHorizon && sunAltitude >= -6 && <p className="finder-twilight">{sv ? 'Ljus himmel: markeringen visar beräknad position.' : 'Bright sky: the marker shows a calculated position.'}</p>}
      <div className="finder-actions"><button onClick={onDetails}>{sv ? 'Detaljer' : 'Details'}</button><button onClick={onCenter} disabled={guidance.belowHorizon}>{sv ? 'Centrera manuell vy' : 'Center manual view'}</button></div>
    </div>
  </div>;
}
