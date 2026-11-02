# B-004 — remaining sky-view stutter

Analysis requested 2026-11-02 after the user confirmed better performance but persistent stutter. Recommended model: Sol High. The user subsequently approved the shared-frame implementation with “Kör”; see the follow-up below. B-004 remains open for physical follow-up. B-001 remains paused.

## Findings

The first optimization helped, but its passing interaction checks did not establish smooth animation on the user's phone. The current eye-level renderer still has two routes to drawing: `HorizonView.tsx` draws immediately from a React effect after camera changes, and its constellation entrance animation schedules additional full-scene draws through `requestAnimationFrame`. During the measured 90-input sweep, the all-layer controls produced 102–103 canvas draws; without entrance animation there were 83. The first several inputs fall below the existing 8 px drag threshold. This is evidence of avoidable repeated drawing, not proof of the phone's complete frame pipeline.

Pointer moves call the parent `App` camera-state setter for every accepted event. This re-renders the app and moves DOM object markers as well as invalidating the canvas effect. Sensor direction publication already has an RAF gate in `usePhoneOrientation.ts`; a drawing refactor should consume the latest accepted pose without adding another mandatory frame of latency or changing direction/reference logic.

Canvas density is also material. At 390×844, DPR 2 uses about 1.32 million pixels; DPR 1.5 uses about 0.74 million (44% fewer). DPR 1 and 1.5 improved the measured cadence even though the drawing algorithms remained the same. This suggests raster/compositing cost contributes; a headless test does not identify the physical phone's GPU bottleneck.

The Milky Way still rebuilds its inverse-ray raster whenever heading or pitch changes (`milkyWay.ts` cache key). Constellation drawing reprojects and clips its arcs, builds temporary arrays, and measures labels on animation-only frames as well as view changes. Grid samples are allocated inside every full-scene render. These are secondary opportunities for caching. Hiding names or removing CSS blur had much smaller effects than disabling animation or changing DPR; removing these features is not the recommended first action.

## Measurements

Production artifact from app commit `777cc18ad982e6a5dfeae9d478bfa232cc0ae7ac`, repository HEAD `eebbc69c04d52bf5a3418ff6c72eaf36cce64c66`. Chromium 154.0.8037.57, headless Linux, viewport 390×844, fixed Date 2026-01-15 22:00 UTC, default Stockholm location, all 88 figures and all five display checkboxes enabled unless the row says otherwise. No application files were modified for the experiment.

A real mouse down established the active pointer; 90 synthetic primary pointer moves (1.1 CSS px each) were dispatched one per RAF callback. RAF timestamps measured cadence; the direction changed in every case and there were no page errors. These are RAF callback intervals, not compositor-presented FPS or physical touch/sensor measurements. Instrumentation around the primary canvas `setTransform` and an end-of-task microtask gave a drawing-task proxy; it is not a precise isolated render timer. No network work, catalog updates or initial panel-loading tasks were timed as part of the sweep.

| Condition | DPR | p95 RAF interval | Intervals >25 ms / 90 | Canvas draws |
| --- | --- | --- | --- | --- |
| All layers | 2 | 31 ms | 20 | 103 |
| All layers, repeated control | 2 | 32 ms | 20 | 102 |
| Milky Way off | 2 | 23 ms | 2 | 125 |
| Figures and their names off | 2 | 19 ms | 0 | 83 |
| IAU boundaries off | 2 | 28 ms | 14 | 97 |
| Stars/grid/ground only | 2 | 16 ms | 0 | 83 |
| Reduced motion (entrance animation disabled) | 2 | 22 ms | 1 | 83 |
| CSS blur/filter removed for diagnosis | 2 | 30 ms | 15 | 98 |
| Figure names off | 2 | 30 ms | 19 | 102 |
| All layers | 1.5 | 25 ms | 3 | 105 |
| All layers | 1 | 17 ms | 0 | 139 |

The all-layer drawing-task proxy had a 5 ms median and 6–7 ms p95, while the frame interval p95 was 31–32 ms. This is why absence of >50 ms long tasks is insufficient to claim smooth 60 Hz rendering: frames can be missed through combined drawing, layout and raster work below that threshold. At 60 Hz, one refresh budget is about 16.7 ms.

An additional artificial 4× CPU-throttle run gave 151 ms p95 and 75/90 intervals >25 ms. This is a stress experiment, not an Android-device benchmark. All tests ran on one host, and exact timings will vary across devices. Except for the repeated all-layer control, each condition was a single sweep; treat the rankings as prioritization evidence, not guaranteed improvements from a future implementation.

The previous analysis used wall time around serialized Playwright mouse calls and, in some runs, buffered long-task entries. Those figures included automation/scheduling overhead or setup tasks and should not be interpreted as phone FPS or used for precise percentage speed-up claims.

## Recommended next implementation

1. Give the eye-level view one invalidation-driven RAF scheduler. Camera, zoom, settings and constellation progress must feed the same drawing request; multiple input events before a refresh should use the latest pose and draw once. Preserve the figure entrance timings, pointer tap/pinch rules, target/marker alignment and idle shutdown. Avoid accumulating callbacks or delaying sensor publication by an extra frame.
2. Measure again with the same production sweep and with real manual/phone following on Android/Brave. Check camera-to-marker alignment and input latency as well as cadence. Cache prepared grid/projection data and animation-only geometry/background work where the profile supports it.
3. If density remains limiting, test DPR 1.5 during sustained motion and restore full DPR 2 after settling, with a delay/hysteresis so canvas resizing does not itself cause stutter. Keep DOM controls/labels sharp. This trades temporary canvas sharpness for smoother motion and requires visual review; do not enable it silently as an unmeasured fallback.

Sol High was recommended for the scheduler/refactor and validation, and the user approved that step (see below). Any adaptive-resolution or larger WebGL/worker step requires a separate approval; a larger rendering migration is not justified by these measurements yet.

## Approved shared-frame implementation

The user approved the first recommended step after this analysis. The horizon view now has one `SkyFrames` scheduler (`src/skyFrames.ts`), shared by camera/zoom input, accepted sensor publication and constellation animation. Repeated updates are coalesced by key; relative pointer deltas are accumulated before committing the latest pose. The scheduled callback synchronously commits staged React state, lets layout effects install the matching scene renderer, and then draws once. Thus DOM markers, heading/Finder overlays and canvas use the same committed pose. The sensor publisher uses this existing shared frame instead of adding a separate RAF before rendering; sensor fusion, reference checking and calibration thresholds are unchanged. Animation stops scheduling when complete; pending publication is cancelled on Stop/session cleanup.

The canvas still uses DPR up to 2 and the existing 240 px Milky Way raster. Adaptive resolution was not part of this implementation.

A fresh baseline export of commit `1565b5d` was built in `/tmp/noxari-b004-before` (no worktree or application edits) and served alongside the new production artifact. The same fixed-time 90-input sweep at 390×844, DPR 2, all five settings and all 88 figures gave:

| Production version | Draws | Intervals >25 ms / 90 | p95 RAF interval |
| --- | --- | --- | --- |
| Before, control 1 | 102 | 19 | 32 ms |
| Before, control 2 | 102 | 19 | 31 ms |
| Shared scheduler, run 1 | 83 | 9 | 32 ms |
| Shared scheduler, run 2 | 83 | 9 | 33 ms |

The first seven moves are below the 8 px drag threshold; 83 draws match the remaining accepted camera updates. Extra full-scene animation draws during this sweep were removed. There were fewer slow intervals, but the slowest percentile did not improve. This does not establish smooth physical-device performance or eliminate the DPR/raster issue. Recheck on Android/Brave before deciding the next approved step.

Verification: 130 offline tests and production build pass. Chromium at 390×844, 1280×800 and 568×320 checked a burst of 36 pointer moves coalescing to one draw, accumulated camera deltas, canvas Sirius/DOM Sirius-marker/HUD alignment, pinch and marker-origin dragging/tapping, idle shutdown and no page errors. Separate checks at mobile/desktop sizes covered Finder centering, keyboard offsets, ring alignment under pinch and completion of the normal entrance animation. Synthetic sensor checks covered manual north, latest-sample publication, following across search, map/return, Stop cancelling queued publication, pending permission cancellation and denial. Physical compass precision was not tested or changed.

## Latest physical feedback

After the shared scheduler deployment, the user reported possibly slightly worse performance or no difference, and difficulty telling. Physical improvement is unconfirmed; regression is possible but not established. Fewer synthetic draws/slow intervals did not establish lower input-to-display latency or better perceived smoothness. Before another optimization, distinguish finger drag from phone following and compare the scheduler version with the preceding version under matched conditions, including latency and frame pacing. No further implementation or rollback is approved.

The user further described roughly similar stutter with finger drag and phone following, acceptable overall performance with room to improve, and substantially better perceived responsiveness in Stellarium Web. This is a same-user observation, not a controlled cross-app benchmark. The next approved performance batch should include F-020: all five sky display toggles enabled and All (88) figures selected by default, with existing stored defaults handled so repeat testing does not require manual layer setup. It does not authorize enabling sensors or GPS automatically. This follow-up was subsequently approved and implemented; see the B-004 + F-020 section below.

## Approved B-004 + F-020 follow-up

The user approved the follow-up after reporting similar stutter with finger drag and phone following, and requested all layers on by default for repeat testing. The horizon now uses `MotionResolution`: two meaningful camera/zoom changes close together enter DPR at most 1.5, with full DPR (up to 2) restored after 220 ms of stillness. Small jitter and one isolated jump do not enter the mode. A late frame with fresh movement does not prematurely upshift. The policy leaves lower-DPR displays at their native density. Buffer dimensions change only at the downshift/restoration, rather than on each event. One cancellable timeout invalidates the shared scheduler for the sharp redraw; it is cleared on unmount. The fully painted horizon canvas also requests `alpha:false`.

This trades temporary canvas sharpness for lower raster cost; DOM object labels and controls stay native, and CSS projection/Finder alignment is unchanged. The all-sky map remains at its existing density. No lower catalog limit, hidden layers, changed sensor calibration or new renderer dependency was introduced.

F-020 starts figures, names, IAU boundaries, Milky Way and the candidate layer enabled, with All (88) selected, on each page load. Disabling a layer lasts for the session. The old persisted `noxari-show-candidates` value is no longer read or written; an existing saved false cannot block the new startup default. Candidate status/separation and opt-in GPS/phone following remain explicit.

### Production comparison

A clean export of preceding HEAD `9fdda36` (the shared-scheduler app code) was built separately under `/tmp/noxari-motion-before` and compared with the new production build. Both were explicitly set to all five toggles and All (88), fixed 2026-01-15 22:00 UTC/Stockholm, 390×844, device DPR 2, using the same 90-input RAF sweep as above. Runs were interleaved; no other browser test ran concurrently. The final combined implementation gave:

| Version | Median RAF interval | p95 interval | Intervals >25 ms / 90 | Draws |
| --- | --- | --- | --- | --- |
| Before, run 1 | 19 ms | 32 ms | 11 | 83 |
| Adaptive + opaque canvas, run 1 | 16 ms | 28 ms | 6 | 83 |
| Before, run 2 | 19 ms | 32 ms | 10 | 83 |
| Adaptive + opaque canvas, run 2 | 16 ms | 32 ms | 7 | 83 |

Draw instrumentation recorded only DPR 2 and DPR 1.5 during the moving sweeps. A preliminary adaptive-only comparison had median 16 ms vs 18–19 ms, p95 29 ms vs 31–32 ms and 6–7/90 long intervals vs 8–9/90. These small samples do not establish an independent benefit from opaque canvas; the final result is for the combined change. Median cadence improved, but high-percentile variation remains and a buffer transition can cost a frame. This is not measured presented FPS or guaranteed improvement on physical Android/Brave, nor a controlled Stellarium comparison. Do not mark B-004 physically resolved from these results.

### Verification

- 135 offline tests and production build pass, including sustained movement, jitter/single-jump behavior, wraparound, pinch, delayed-frame hysteresis and low-DPR handling.
- Chromium at 390×844, 1280×800 and 568×320/DPR 2, plus mobile DPR 1.25, verified new defaults despite an old stored false, layer disabling across map/panels, reload returning all layers, no automatic sensor/GPS prompts, opaque horizon rendering and idle shutdown.
- During a sustained swipe the primary canvas allocated one smaller and one restored buffer; low-DPR mode allocated neither. It restored full density after settling. Moving/resting snapshots were visually reviewed.
- Numerical/browser fixtures checked that Sirius's canvas star, DOM marker and heading share the exact CSS pose during lower-density motion and after restoration (canvas-coordinate tolerance 0.001 CSS px; serialized DOM styles 0.01 px). Touch pinch/marker-origin drag/tap and Finder centering/keyboard offsets/pinch geometry passed.
- Synthetic phone following also entered/restored motion density. Latest-pose publication, search persistence, map/return, Stop cancelling pending publication, permission cancellation and denial passed. These do not validate physical compass precision or latency.

F-020 is complete. B-004 awaits the user's physical evaluation. A further development step needs a fresh recommendation and approval.

## Remaining opportunities after motion density

The user reports “perhaps slightly better” after B-004 + F-020 and asks for further opportunities. A read-only review confirms that the Milky Way still rebuilds a CPU pixel raster for every new pose; visible stars use individual Canvas arcs/fills; figure drawing reprojects/allocates stroke geometry and measures labels; the grid allocates sample arrays on each draw. Camera state is still owned by App, so foreground panel trees can participate in React updates. The relative importance of these costs has not been reprofiled on the adaptive production build.

For a potentially larger improvement, recommend a bounded production profile and GPU prototype for the Milky Way/star field, compared against the current renderer before any broad migration is approved. Geometry caching and isolating camera updates from panel rendering remain other candidates. Preserve brightness, scientific directions, marker/Finder alignment and a compatible fallback. The user subsequently approved this bounded prototype with “Kör”, following the Sol High recommendation. See the results below. A broad migration remains unapproved.


## Approved GPU prototype: measured result

The isolated lab and current-production layer profile are complete: see [GPU prototype](GPU_PROTOTYPE.md) for architecture, reproducible method, raw results, known sprite coverage differences and the phone test link. Removing the Milky Way lowered the current app draw proxy from median 5 ms to 3 ms, with a positive but small/noisy cadence signal. On SwiftShader software WebGL2, the separate GPU-to-Canvas bridge was slower than its Canvas reference: median draw 18.2–18.9 ms vs 4.7–4.9 ms, p95 RAF 33.4 ms vs 16.7–16.8 ms. These are not phone GPU measurements or presented FPS. The root app renderer and JS/CSS remain unchanged.

Keep Canvas, leave B-004 open and request a physical phone comparison/report. The faint sprite coverage difference also needs review before any migration. F-020 defaults remain enabled; B-001 stays paused. Integration or another optimization batch requires a new recommendation and explicit approval.
