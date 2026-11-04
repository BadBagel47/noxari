import {memo, useEffect, useMemo, useState, useSyncExternalStore} from 'react';
import {X} from 'lucide-react';
import type {SurfaceComparison} from './surfaceComparison';
import {SkyPerformance} from './skyPerformance';

const text = (sv: boolean, en: string, swedish: string) => sv ? swedish : en;
function download(log: SkyPerformance) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(log.snapshot(), null, 2)], {type: 'application/json'}));
  const link = document.createElement('a');link.href = url;link.download = 'noxari-performance.json';link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const rendererReason = (reason: string, sv: boolean) => ({
  'requested-canvas': text(sv, 'Canvas selected manually', 'Canvas valt manuellt'),
  'software-renderer': text(sv, 'Software renderer', 'Mjukvarurenderare'),
  'context-lost': text(sv, 'GPU connection interrupted', 'GPU-åtkomsten avbröts'),
  'gpu-initialization': text(sv, 'GPU could not start', 'GPU kunde inte startas'),
  'point-size-limit': text(sv, 'GPU mode unsupported', 'GPU-läget stöds inte'),
  'scene-upload': text(sv, 'GPU data upload failed', 'GPU-data kunde inte laddas'),
  'gpu-draw': text(sv, 'GPU drawing failed', 'GPU-ritningen misslyckades'),
  'not-drawn': text(sv, 'Sky not drawn yet', 'Himlen har inte ritats ännu'),
}[reason] ?? text(sv, 'Fallback', 'Reservläge'));
const reasonLabel = (reason: string | null, sv: boolean) => ({
  manual: text(sv, 'Stopped', 'Stoppad'), 'time-limit': text(sv, '30-second limit reached', '30-sekundersgränsen nådd'),
  'frame-limit': text(sv, 'Frame limit reached', 'Bildrutegränsen nådd'), 'context-limit': text(sv, 'Configuration limit reached', 'Gränsen för visningsändringar nådd'),
  'page-hidden': text(sv, 'Page was hidden', 'Sidan doldes'), 'view-unavailable': text(sv, 'Horizon view was closed', 'Horisontvyn stängdes'),
  reset: text(sv, 'View session ended', 'Vysessionen avslutades'),
}[reason ?? ''] ?? text(sv, 'Ready', 'Redo'));

export const PerformancePanel = memo(function PerformancePanel({log, language, horizon, onStart, comparison, comparisonReady, onCompare}: {
  log: SkyPerformance; language: 'en' | 'sv'; horizon: boolean; onStart: () => void;
  comparison: SurfaceComparison; comparisonReady: boolean; onCompare: () => void;
}) {
  const sv = language === 'sv', status = useSyncExternalStore(log.subscribe, log.getSnapshot);
  const report = useMemo(() => !status.active && status.frames ? log.snapshot() : null, [log, status]);
  const scene = log.scene;
  return <div className="performance-panel">
    <p>{text(sv, 'Record sky responsiveness, then save the report to attach in chat.', 'Mät himmelsvyns flyt och spara rapporten för att bifoga i chatten.')}</p>
    <ol><li>{text(sv, 'Start recording. The panel closes.', 'Starta mätningen. Panelen stängs.')}</li><li>{text(sv, 'Look around for 10–15 seconds by dragging or with phone following already enabled.', 'Titta runt i 10–15 sekunder genom att svepa, eller med telefonföljning som du redan har slagit på.')}</li><li>{text(sv, 'Stop recording and save the report.', 'Stoppa mätningen och spara rapporten.')}</li></ol>
    <p className="panel-note">{text(sv, 'Recording stops after 30 seconds or 1,200 draws, and when the page is hidden or the sky map opens. No phone or GPS permission is requested.', 'Mätningen stoppas efter 30 sekunder eller 1 200 ritningar, och när sidan döljs eller himmelskartan öppnas. Ingen telefon- eller GPS-behörighet begärs.')}</p>
    <dl className="performance-status"><dt>{text(sv, 'App version', 'Appversion')}</dt><dd>{log.build.commit}{log.build.dirty ? ' + local changes' : ''}</dd>
      <dt>{text(sv, 'Selected renderer', 'Vald renderare')}</dt><dd>{scene?.backend === 'gpu' ? 'GPU' : 'Canvas'}{scene?.reason ? ` · ${rendererReason(scene.reason, sv)}` : ''}</dd>
      <dt>{text(sv, 'Recording', 'Mätning')}</dt><dd>{status.active ? text(sv, 'In progress', 'Pågår') : reasonLabel(status.reason, sv)}</dd></dl>
    {!horizon && <p className="notice">{text(sv, 'Choose Look around under Sky display before recording.', 'Välj Se dig omkring under Himmelsvy innan du mäter.')}</p>}
    <div className="performance-actions">{status.active ? <button className="panel-action" onClick={() => log.stop('manual')}>{text(sv, 'Stop recording', 'Stoppa mätning')}</button>
      : <button className="panel-action" disabled={comparison.active || !horizon || !scene?.width} onClick={onStart}>{status.frames ? text(sv, 'New recording', 'Ny mätning') : text(sv, 'Start recording', 'Starta mätning')}</button>}
      <button className="panel-action" disabled={status.active || !status.frames} onClick={() => download(log)}>{text(sv, 'Save performance report', 'Spara prestandarapport')}</button></div>
    {report && <><p role="status">{report.summary.frames} {text(sv, 'draws recorded.', 'ritningar uppmätta.')}</p>
      {report.summary.requestToDrawEndMs.count < 10 && <p className="notice">{text(sv, 'Few view updates were recorded. Try another recording with more movement.', 'Få vyändringar mättes. Prova en ny mätning med mer rörelse.')}</p>}
      <details><summary>{text(sv, 'Timing summary', 'Tidsöversikt')}</summary><dl className="performance-status">
        <dt>{text(sv, 'Active intervals, p95', 'Aktiva intervall, p95')}</dt><dd>{report.summary.cadenceMs.p95 ?? '—'} ms</dd>
        <dt>{text(sv, 'View request → command end, p95', 'Vyändring → kommandoslut, p95')}</dt><dd>{report.summary.requestToDrawEndMs.p95 ?? '—'} ms</dd>
        <dt>{text(sv, 'Shared commit, p95', 'Gemensam vyuppdatering, p95')}</dt><dd>{report.summary.commitMs.p95 ?? '—'} ms</dd>
        <dt>{text(sv, 'Drawing commands, p95', 'Ritkommandon, p95')}</dt><dd>{report.summary.drawMs.p95 ?? '—'} ms</dd></dl></details></>}
    <SurfaceComparisonControls comparison={comparison} sv={sv} ready={comparisonReady && horizon && scene?.backend === 'gpu' && !status.active} onStart={onCompare}/>
    <p className="panel-note">{text(sv, 'Timings cover accepted view updates and drawing commands, not when pixels appear on screen. Recording can slightly affect timings.', 'Tiderna gäller mottagna vyändringar och ritkommandon, inte när bilden syns på skärmen. Mätningen kan påverka tiderna något.')}</p>
    <p className="panel-note">{text(sv, 'The report stays in this tab until you save it. It contains no GPS coordinates, chosen place/time, sky directions or raw sensors. It is only shared if you attach the file yourself.', 'Rapporten stannar i fliken tills du sparar den. Den innehåller inga GPS-koordinater, vald plats/tid, himmelsriktningar eller råa sensordata. Den delas bara om du själv bifogar filen.')}</p>
  </div>;
});

export const PerformanceCapture = memo(function PerformanceCapture({log, language, onReview, visible}: {log: SkyPerformance; visible: boolean; language: 'en' | 'sv'; onReview: () => void}) {
  const sv = language === 'sv', status = useSyncExternalStore(log.subscribe, log.getSnapshot);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => { if (status.active) setDismissed(false); }, [status.active]);
  if (!visible || dismissed || (!status.active && !status.frames)) return null;
  return <div className="performance-capture" role="status"><span>{status.active ? text(sv, 'Recording sky responsiveness', 'Mäter himmelsvyns flyt') : text(sv, 'Performance report ready', 'Prestandarapport klar')}</span>
    <button onClick={() => { log.stop('manual');onReview(); }}>{status.active ? text(sv, 'Stop recording', 'Stoppa mätning') : text(sv, 'View report', 'Visa rapport')}</button>
    {!status.active && <button aria-label={text(sv, 'Hide recording notice', 'Dölj mätnotisen')} onClick={() => setDismissed(true)}><X size={18}/></button>}</div>;
});

function saveComparison(comparison: SurfaceComparison) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(comparison.snapshot(), null, 2)], {type: 'application/json'}));
  const link = document.createElement('a');link.href = url;link.download = 'noxari-surface-comparison.json';link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function comparisonLabel(comparison: SurfaceComparison, sv: boolean) {
  const status = comparison.getSnapshot();
  if (status.active) return `${text(sv, 'Comparison', 'Jämförelse')} ${status.pass}/4 · ${status.phase === 'warmup' ? text(sv, 'warming up', 'värmer upp') : text(sv, 'measuring', 'mäter')}`;
  return status.phase === 'complete' ? text(sv, 'Comparison complete', 'Jämförelsen klar') : text(sv, 'Comparison interrupted', 'Jämförelsen avbröts');
}
function SurfaceComparisonControls({comparison, sv, ready, onStart}: {comparison: SurfaceComparison; sv: boolean; ready: boolean; onStart: () => void}) {
  const status = useSyncExternalStore(comparison.subscribe, comparison.getSnapshot);
  const available = status.phase === 'complete' || status.phase === 'cancelled';
  return <section aria-label={text(sv, 'Controlled comparison', 'Kontrollerad jämförelse')}>
    <h3>{text(sv, 'Controlled comparison', 'Kontrollerad jämförelse')}</h3>
    <p>{text(sv, 'The sky moves automatically through four matching runs, testing two drawing-buffer strategies. Leave the screen untouched until it finishes (usually 20–40 seconds, at most 60). Your view and time mode are restored afterwards.', 'Himlen rör sig automatiskt genom fyra likadana körningar och jämför två ritbuffertar. Låt skärmen vara orörd tills provet är klart (oftast 20–40 sekunder, högst 60). Din vy och ditt tidsläge återställs efteråt.')}</p>
    {!ready && !status.active && <p className="panel-note">{text(sv, 'Use Look around with GPU rendering. Stop phone following and any recording; wait for location and sky loading to finish.', 'Använd Se dig omkring med GPU-rendering. Stoppa telefonföljning och eventuell mätning; vänta tills plats och himmel har laddats.')}</p>}
    <div className="performance-actions"><button className="panel-action" disabled={!ready || status.active} onClick={onStart}>{text(sv, 'Start controlled comparison', 'Starta kontrollerad jämförelse')}</button>
      <button className="panel-action" disabled={!available || status.active} onClick={() => saveComparison(comparison)}>{text(sv, 'Save comparison report', 'Spara jämförelserapport')}</button></div>
    {available && <p role="status">{comparisonLabel(comparison, sv)}{status.phase === 'cancelled' ? ` (${status.reason})` : ''}</p>}
    <p className="panel-note">{text(sv, 'This measures automated movement and callback waiting, not physical swipes or displayed FPS. Changing the scene, touching the sky or hiding the page interrupts the test. The report stays local and excludes location, observation time and directions.', 'Provet mäter automatisk rörelse och väntan på bildrutans callback, inte fysiska svep eller visad FPS. Ändrad scen, beröring av himlen eller dold sida avbryter provet. Rapporten stannar lokalt och innehåller inte plats, observationstid eller riktningar.')}</p>
  </section>;
}
export const SurfaceComparisonCapture = memo(function SurfaceComparisonCapture({comparison, language, onReview, visible}: {comparison: SurfaceComparison; language: 'en' | 'sv'; onReview: () => void; visible: boolean}) {
  const status = useSyncExternalStore(comparison.subscribe, comparison.getSnapshot), sv = language === 'sv';
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {if (status.active) setDismissed(false);}, [status.active]);
  if (!visible || dismissed || status.phase === 'idle') return null;
  return <div className="performance-capture" role="status"><span>{comparisonLabel(comparison, sv)}</span>
    <button onClick={() => {comparison.cancel('manual');onReview();}}>{status.active ? text(sv, 'Stop comparison', 'Stoppa jämförelse') : text(sv, 'View report', 'Visa rapport')}</button>
    {!status.active && <button aria-label={text(sv, 'Hide comparison notice', 'Dölj jämförelsenotisen')} onClick={() => setDismissed(true)}><X size={18}/></button>}
  </div>;
});
