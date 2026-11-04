# B-004 — ordinary-app performance report

Approved with the user's “Kör” after the **Sol High** recommendation. This step first reviewed the measurement boundaries, then implemented a bounded opt-in report in the ordinary app. The renderer and sensor mathematics are unchanged; B-004 remains open pending a phone report and its analysis. B-001 direction investigation remains paused.

## For the user

1. Open ordinary Noxari, choose **More → Performance report** (**Mer → Prestandarapport**).
2. Press **Start recording / Starta mätning**. The panel closes. Drag the sky for 10–15 seconds, or use phone following that you have already enabled yourself.
3. Press **Stop recording / Stoppa mätning**, then **Save performance report / Spara prestandarapport**. Attach `noxari-performance.json` in chat and describe the input mode and perceived stutter.

Starting a new recording replaces the previous in-tab recording. Save it first if needed. Recording also stops at 30 seconds, 1,200 horizon draws or 64 distinct configurations, on hidden/page-leaving events and when the horizon view closes. Browser main-thread blocking can delay a timeout; no background session resumes automatically. A completed-report notice opens the report again and can be dismissed. On the all-sky map, starting is disabled and the previous report can still be saved. No GPS/sensor permission is requested by the report controls. For bright daytime tests, explicitly choose the existing night preview if that is the intended workload; the recorder does not change observing time or display layers.

## Measurement design

Use the existing `SkyFrames` callback, not a second animation loop. Only record after an explicit start. Keep the small capture notice and panel memoized and publish UI state on start/stop or backend changes, not on every frame. While recording, do not calculate live percentiles or serialize/export the report. Cold export sorts bounded arrays after stopping.

`src/skyPerformance.ts` owns the recorder; `PerformancePanel.tsx` provides the More entry, capture notice and local download. `SkyFrames` measures the shared commit and frame task. `useSkyFrameState` identifies accepted manual-view and zoom requests; the existing phone-publication enqueue is tagged without changing sensor processing or scheduling. Nested camera enqueues inside a phone commit are not double-counted. The manual-view source labels direct camera setters outside phone publication (including manual buttons/centering); it does not inspect raw browser input events. Cancellation removes pending input metadata. `HorizonView` marks eight drawing phases and updates a small mutable scene description; GPU snapshots contribute nested copy timings only while recording.

| Field / interval | Boundary and interpretation |
| --- | --- |
| Build | Git HEAD (12 hex digits) embedded at Vite build/dev startup, plus a dirty-source flag; never inferred from the URL cache parameter. Source archives may report `unknown`. |
| Backend/configuration | Actual final GPU/Canvas choice, fallback reason, cached driver label, preference, viewport/DPR, requested layers, figure mode, star count, visibility flags, following intent, reduced motion and time-mode enum. No selected date/place or view angles. |
| Latest request wait | Most recent accepted queue request → start of the shared frame callback. |
| Latest/oldest request → draw end | Accepted view/zoom or phone-publication queue request → synchronous drawing-command completion. Coalesced count and oldest/newest ages are separate. Raw event handling before enqueue, physical device arrival and sensor-fusion time are excluded. |
| Shared commit | The shared queue's `flushSync` update/React-DOM commit, including any work in that commit. Other React updates are not fully attributed. |
| Draw phases | Background/setup, Milky Way, grid, boundaries, figures, stars, labels/cardinals and ground, in the original rendering order. |
| GPU copy submission | Synchronous `drawImage` snapshot calls, **already included** in Milky Way/star times. May flush/wait for GPU commands; not isolated transfer cost or GPU execution time. Do not add this again to phase totals. |
| Frame task | Shared callback work through synchronous drawing completion; later bookkeeping, browser layout/paint, GPU completion and actual display are not fully measured. |
| Cadence | Start-to-start of scheduled horizon draws when animation was pending or a view request arrived within 120 ms after the previous draw ended. Idle gaps are excluded, but a long queue stall is retained when a request arrived promptly. It is not displayed FPS or a screen-refresh measurement. |

The report retains raw bounded frame records and median/p95/max summaries. Median is the upper middle observation; p95 is the nearest-rank 95th percentile. Stage medians need not add to a frame median. Zero-length short stages can result from browser clock quantization; zero is not proof of free work. A frame that begins on GPU and falls back can have `backendAtStart: gpu` with a final Canvas context and a partial copy count. Configuration records are deduplicated; continuous zoom lives on the frame record and does not exhaust configuration storage.

These measurements identify candidates for the next optimization. They do not promise physical input-to-display latency, presented FPS, independent GPU completion, actual compass accuracy or parity with Stellarium.

## Low-cost / disabled path

When disabled, collector input/frame methods return without clock reads, frame allocation, a timer or sample retention. The horizon only maintains its latest small scene descriptor and checks nullable instrumentation; no added per-frame statistics publication occurs. A capture has one cancellable limit timer, at most 1,200 samples/64 configurations and at most the app's three fixed input tokens. Existing animation/frame scheduling and idle shutdown remain unchanged. No `readPixels`, `gl.finish`, GPU timing query, screenshot capture or extra RAF is added.

Use a paired ordinary-app sweep with the same external probe to compare recording off/on. The probe's handled-input → task-end metric includes collector bookkeeping omitted from the report's internal completion timestamp. This estimates observer cost in that environment; it does not establish phone overhead. A visible but static capture notice is included in the on case.

## Privacy and lifecycle

The JSON is created locally and downloaded only on explicit save; no automatic sharing, network upload, localStorage persistence or analytics is added. Context fields are allowlisted. Excluded: GPS coordinates, location names, selected observation date/time, heading/pitch, object IDs, searches, saved lists, raw sensors, page URL and user agent. The creation timestamp is the recording's wall-clock start, not the selected sky time. Scene flags include only coarse visible/not-visible or below-horizon state. The WebGL driver string may be privacy-masked (e.g. `Brave`) and does not establish a GPU model.

Hidden page/view teardown stops the capture, clears its limit timer and preserves the last downloadable recording. Pending phone-publication cancellation is tracked without retaining readings. Context loss continues through the existing Canvas fallback and is recorded in configuration metadata. Reset/unmount cleans recording timers; initial StrictMode cleanup does not permanently disable a later session.

## Verification entry points

The existing offline suite includes `tests/skyPerformance.test.ts`: disabled behavior, coalescing/freshness, idle versus stalls, animation-only intervals, cancellation, fallback/configuration identity, zoom, frame/configuration/time bounds, immutable privacy-filtered snapshots and shared phone/camera publication without another RAF. Existing scheduler/GPU/astronomy tests remain applicable.

Optional environment-provided Playwright/Chromium, against a production preview:

```bash
npm test
npm run build
npm run preview -- --port 4194
# In another terminal, with externally installed Playwright/Chromium:
node scripts/verify_performance_report.mjs
node scripts/verify_horizon_gpu.mjs
node scripts/benchmark_performance_report.mjs
```

`PLAYWRIGHT_MODULE`, `CHROMIUM_PATH` and `APP_URL` select the supplied environment/browser/preview. `QA_OUTPUT` saves browser report fixtures; `PERF_OUTPUT` saves paired overhead results; `SKY_RENDERER` selects the benchmark's auto/canvas/gpu override. These scripts are optional developer checks, not a new npm application dependency. Browser tests cover English/Swedish mobile/desktop/short-landscape controls, local JSON download and build/backend/stage identities, no automatic GPS/sensor permission, idle shutdown, simulated phone tagging, actual GPU context loss, map stop, simulated hidden-page cleanup and a fake-clock automatic time limit. Sensor events in tests are simulated; they do not reopen B-001.

## Verified results, 2026-11-04

153 offline tests and complete TypeScript/production/lab builds passed. Production browser checks passed for English mobile/desktop and Swedish short-landscape reports, local export, no automatic permissions, phone-publication source tagging, live GPU→Canvas loss identity, map stop/retained report, simulated hidden-page stop and a fake-clock time limit. The existing whole-horizon regression suite also passed geometry/marker/overlay synchronization, coalesced bursts, gestures, idle, following across panels/map/Stop and all six backend/fallback cases. An active-report dev StrictMode smoke with an isolated Vite cache also passed burst coalescing, idle and export. No physical sensor accuracy is inferred.

[Paired overhead data](measurements/performance-report-overhead-2026-11-04.json), 390×844/DPR 2, all layers/88 figures, automatic Canvas on SwiftShader. The same external probe measures off → on → on → off; no other browser workload ran concurrently.

| External metric | Recording off, first / last | Recording on, first / repeat |
| --- | ---: | ---: |
| Synchronous draw-task median, ms | 5 / 5 | 5 / 5 |
| Draw-task p95, ms | 7 / 8 | 8 / 6 |
| Handled input→task-end median, ms | 7 / 6 | 8 / 7 |
| Handled input→task-end p95, ms | 22 / 21 | 19 / 22 |
| RAF interval p95, ms | 30 / 28 | 26 / 30 |
| Intervals >25 ms /90 | 8 / 5 | 5 / 6 |
| Draws in the external sweep | 83 / 83 | 83 / 83 |

The bounded sample shows the same draw median and overlapping/noisy p95, with a roughly 1 ms higher handled-input median in the on runs. This is not zero-cost evidence or a phone overhead guarantee. Internal reports retain 87–88 frames because recording includes animation/settling around the externally gated sweep; do not equate those windows or percentile definitions. The operator should keep the recording short and stop it before report serialization/download.

Build stamping now changes the ordinary app asset hash on each commit (including documentation-only commits). The report identifies the actual embedded build and dirty-source status. A URL `?v=` remains only cache variation, not version evidence or a release pin.

 Actual phone performance and the remaining B-004 cause await the user's ordinary-app report; no additional optimization is authorized by this diagnostics step.


## Deployment evidence

App commit `36f082d1cc99c637afe877b527014ffb174efe62` passed 153 tests, production/lab builds and Pages via [Actions 41757983282](https://github.com/BadBagel47/noxari/actions/runs/41757983282). Verified-TLS retrieval matched ordinary/lab HTML and JS and main CSS to clean local artifacts. Main JS `index-CUoIMRhq.js`: SHA-256 `f01a18082d3fb355be898fc5d1a2b39e836576d1a4cc71aeb7924ed4bfbf26a8`; CSS: `0329d56c2d02468d31dc4d217f695c030e554a79472a7b77adf3273ec3f6d343`. A clean-build production-browser download verified `build: {commit: "36f082d1cc99", dirty: false}`; pre-commit browser fixtures covered dirty metadata. Later documentation commits change embedded build identifiers/main asset hashes without changing capture or renderer logic. Actual phone data is still pending.
