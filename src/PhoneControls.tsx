import type {usePhoneOrientation, SensorStatus} from './usePhoneOrientation';

const messages: Record<SensorStatus, [string, string]> = {
  off: ['Follow the sky as you turn your phone. Hold it upright, screen facing you. Uses the selected date and time.', 'Följ himlen när du vrider telefonen. Håll den upprätt med skärmen mot dig. Använder valt datum och tid.'],
  requesting: ['Allow motion and orientation access in your browser.', 'Tillåt rörelse- och riktningsåtkomst i webbläsaren.'],
  waiting: ['Waiting for direction. Hold the phone upright and still while north is checked.', 'Väntar på riktning. Håll telefonen upprätt och stilla medan norr kontrolleras.'],
  align: ['Hold the phone upright and still for a stable compass reference, or point its back toward known true north and tap Align north.', 'Håll telefonen upprätt och stilla för en stabil kompassreferens, eller rikta baksidan mot känd geografisk nord och tryck Rikta mot norr.'],
  tracking: ['Following phone direction. A large sustained disagreement can restore the compass reference once you hold still. Manual north alignment is preserved. Dragging switches to manual control. A compass may use magnetic north; align to true north for best agreement.', 'Följer telefonens riktning. En stor bestående skillnad kan återställa kompassreferensen när du håller stilla. Manuell nordkalibrering bevaras. Dra i vyn för manuell styrning. Kompassen kan visa magnetisk nord; rikta mot geografisk nord för bäst överensstämmelse.'],
  recalibrate: ['Direction is uncertain and sky following is held. Hold the phone upright and still, then use the compass reference or align to known true north. A figure-eight movement does not reset the app reference.', 'Riktningen är osäker och himmelsvyn hålls stilla. Håll telefonen upprätt och stilla, använd sedan kompassreferensen eller rikta mot känd geografisk nord. En åttarörelse återställer inte appens referens.'],
  denied: ['Sensor access was denied. You can allow it in browser settings and try again, or use manual control.', 'Sensoråtkomst nekades. Tillåt den i webbläsarens inställningar och försök igen, eller styr manuellt.'],
  unavailable: ['Phone sensors require HTTPS and a browser with orientation support. You can still drag the view.', 'Telefonsensorer kräver HTTPS och en webbläsare med riktningsstöd. Du kan fortfarande dra i vyn.'],
  missing: ['No usable direction received. Hold the phone upright and retry, or drag the view manually.', 'Ingen användbar riktning mottogs. Håll telefonen upprätt och försök igen, eller dra i vyn manuellt.'],
  paused: ['Following is paused. The sensor session keeps its north calibration. Resume when ready, or stop the session.', 'Följningen är pausad. Sensorsessionen behåller nordkalibreringen. Återuppta när du är redo eller avsluta sessionen.'],
};

export function PhoneControls({phone, language, compact = false, onStart}: {phone: ReturnType<typeof usePhoneOrientation>; language: 'en' | 'sv'; compact?: boolean; onStart?: () => void}) {
  const sv = language === 'sv';
  const d = phone.diagnostics;
  const ended = ['off', 'missing', 'denied', 'unavailable'].includes(phone.status);
  const canCalibrate = ['tracking', 'align', 'paused', 'recalibrate'].includes(phone.status);
  const checks = {
    waiting: ['Waiting for readings', 'Väntar på avläsningar'],
    'no-compass': ['No fresh compass check', 'Ingen färsk kompasskontroll'],
    'manual-only': ['Manual north; compass comparison unavailable', 'Manuell norr; kompassjämförelse saknas'],
    checking: ['Checking direction — hold still', 'Kontrollerar riktningen – håll stilla'],
    consistent: ['No large disagreement between sensors', 'Ingen stor skillnad mellan sensorerna'],
    'compass-only': ['Compass only; no independent check', 'Endast kompass; ingen oberoende kontroll'],
    uncertain: ['North reference needs recalibration', 'Nordreferensen behöver kalibreras om'],
  };
  const references = {none: ['Not established', 'Inte fastställd'], compass: ['Compass reference', 'Kompassreferens'], manual: ['Manually aligned north', 'Manuellt riktad norr']};
  return <div className={`phone-controls ${compact ? 'compact' : ''}`}>
    <div className="phone-buttons"><button aria-pressed={phone.active} onClick={phone.active ? phone.stop : onStart ?? phone.start}>{phone.active ? (sv ? 'Stoppa synkning' : 'Stop following') : phone.status === 'paused' ? (sv ? 'Återuppta följning' : 'Resume following') : (sv ? 'Följ telefonen' : 'Follow phone')}</button>
      {canCalibrate && <button onClick={phone.alignNorth}>{sv ? 'Rikta mot norr' : 'Align north'}</button>}
      {canCalibrate && <button onClick={phone.useCompass} disabled={!d.compassReady}>{sv ? 'Använd kompassreferens' : 'Use compass reference'}</button>}
      {(phone.status === 'paused' || phone.status === 'recalibrate') && <button onClick={phone.stop}>{sv ? 'Avsluta session' : 'End session'}</button>}
      {phone.status === 'tracking' && <span className="sensor-live">{sv ? 'Följer rörelser' : 'Following motion'}</span>}
    </div>
    {(!compact || !['off', 'tracking'].includes(phone.status)) && <p role="status">{messages[phone.status][sv ? 1 : 0]}</p>}
    {phone.needsAlignment && phone.status === 'paused' && <p>{messages.align[sv ? 1 : 0]}</p>}
    {!ended && d.autoCorrections > 0 && <p role="status">{sv ? `Nordreferensen har återställts automatiskt ${d.autoCorrections} ${d.autoCorrections === 1 ? 'gång' : 'gånger'}. Senaste korrigering: ${Math.abs(d.lastAutoCorrectionDegrees!).toFixed(1)}°.` : `North reference restored automatically ${d.autoCorrections} ${d.autoCorrections === 1 ? 'time' : 'times'}. Last correction: ${Math.abs(d.lastAutoCorrectionDegrees!).toFixed(1)}°.`}</p>}
    {(phone.hasReport || d.motionSource !== 'none' || !ended) && <details className="direction-diagnostics"><summary>{ended ? (sv ? 'Senaste riktningskontroll' : 'Last direction check') : (sv ? 'Riktningskontroll' : 'Direction check')}</summary>
      {ended && <p>{sv ? 'Sensorsessionen är avslutad. Uppgifterna nedan är från den senaste kontrollen.' : 'The sensor session has ended. These values are from its last check.'}</p>}
      <p>{checks[d.check][sv ? 1 : 0]}</p>
      <dl><dt>{sv ? 'Referens' : 'Reference'}</dt><dd>{references[d.reference][sv ? 1 : 0]}</dd>
      <dt>{sv ? 'Rörelsedata' : 'Motion data'}</dt><dd>{d.motionSource === 'none' ? (sv ? 'Inga användbara värden' : 'No usable readings') : d.motionSource === 'relative' ? (sv ? 'Relativ riktning' : 'Relative orientation') : d.motionSource === 'earth' ? (sv ? 'Jordrefererad riktning' : 'Earth-referenced orientation') : (sv ? 'Kompass' : 'Compass')}</dd>
      <dt>{sv ? 'Skillnad i sidled' : 'Heading disagreement'}</dt><dd>{d.differenceDegrees === null ? (sv ? 'Ej jämförbar just nu' : 'Not comparable right now') : `${Math.abs(d.differenceDegrees).toFixed(1)}°`}</dd></dl>
      <p>{sv ? 'Sensorjämförelsen verifierar inte verklig precision. Kompassen kan använda magnetisk nord. Kompassreferensen blir tillgänglig efter färska avläsningar medan telefonen hålls upprätt och stilla.' : 'The sensor comparison does not verify real accuracy. The compass may use magnetic north. A compass reference becomes available after fresh readings while the phone is upright and still.'}</p>
      <button className="panel-action" onClick={phone.downloadReport}>{sv ? 'Ladda ned riktningsrapport' : 'Download direction report'}</button>
      <p>{sv ? 'Rapporten innehåller senaste sensorvärden samt sparade förlopp före och efter varningar och återankring, utan GPS-position. Den skickas bara om du själv väljer att dela filen.' : 'The report contains recent sensor readings and saved readings around warnings and reanchoring, without GPS coordinates. It is only shared if you choose to send the file.'}</p>
    </details>}
  </div>;
}
