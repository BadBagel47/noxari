import type {usePhoneOrientation, SensorStatus} from './usePhoneOrientation';

const messages: Record<SensorStatus, [string, string]> = {
  off: ['Follow the sky as you turn your phone. Hold it upright, screen facing you. Uses the selected date and time.', 'Följ himlen när du vrider telefonen. Håll den upprätt med skärmen mot dig. Använder valt datum och tid.'],
  requesting: ['Allow motion and orientation access in your browser.', 'Tillåt rörelse- och riktningsåtkomst i webbläsaren.'],
  waiting: ['Waiting for direction. Hold your phone upright and move it gently.', 'Väntar på riktning. Håll telefonen upprätt och rör den försiktigt.'],
  align: ['North reference needed: face a known true north direction, hold your phone upright and tap Align north.', 'Nordreferens behövs: rikta telefonens baksida mot känd geografisk nordriktning, håll den upprätt och tryck Rikta mot norr.'],
  tracking: ['Following phone direction. If it drifts, move away from metal, then point north and align. Dragging switches to manual control. The horizon stays level. A compass may use magnetic north; align to true north for best agreement.', 'Följer telefonens riktning. Vid avvikelse, gå bort från metall, rikta mot norr och kalibrera. Dra i vyn för manuell styrning. Horisonten hålls vågrät. Kompassen kan visa magnetisk nord; rikta mot geografisk nord för bäst överensstämmelse.'],
  denied: ['Sensor access was denied. You can allow it in browser settings and try again, or use manual control.', 'Sensoråtkomst nekades. Tillåt den i webbläsarens inställningar och försök igen, eller styr manuellt.'],
  unavailable: ['Phone sensors require HTTPS and a browser with orientation support. You can still drag the view.', 'Telefonsensorer kräver HTTPS och en webbläsare med riktningsstöd. Du kan fortfarande dra i vyn.'],
  missing: ['No usable direction received. Hold the phone upright and retry, or drag the view manually.', 'Ingen användbar riktning mottogs. Håll telefonen upprätt och försök igen, eller dra i vyn manuellt.'],
};

export function PhoneControls({phone, language}: {phone: ReturnType<typeof usePhoneOrientation>; language: 'en' | 'sv'}) {
  const sv = language === 'sv';
  return <div className="phone-controls">
    <div className="phone-buttons"><button aria-pressed={phone.active} onClick={phone.active ? phone.stop : phone.start}>{phone.active ? (sv ? 'Stoppa synkning' : 'Stop following') : (sv ? 'Följ telefonen' : 'Follow phone')}</button>
      {(phone.status === 'tracking' || phone.status === 'align') && <button onClick={phone.alignNorth}>{sv ? 'Rikta mot norr' : 'Align north'}</button>}
      {phone.status === 'tracking' && <span className="sensor-live">{sv ? 'Synkad' : 'Following'}</span>}
    </div>
    <p role="status">{messages[phone.status][sv ? 1 : 0]}</p>
  </div>;
}
