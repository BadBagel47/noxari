# B-004 — remaining sky-view stutter

Analysis requested 2026-11-02 after the user confirmed better performance but persistent stutter. Recommended model: Sol High. This is an analysis; a second implementation batch is not approved. B-004 is reopened. B-001 remains paused.

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

Recommend Sol High for the scheduler/refactor and validation. Await a new explicit approval before implementation. A larger WebGL/worker migration is not yet justified by these measurements.
