# B-004 / B-007 / F-021 / F-022

The user approved this bundle with “Kör” after a Sol High recommendation. It combines the next rendering step, one-second initial sensor retries, a temporary night-preview startup default and drag takeover. B-001 direction drift remains paused. The [preceding phone reports](PHONE_PERFORMANCE_ANALYSIS.md) show better submission/cadence metrics but the user still wants smoother motion; no new physical improvement is claimed here.

## B-004 — GPU surface capacity and prepared curves

`GpuSky` retains one drawing buffer at the largest requested density for the current CSS viewport. A motion/rest density change updates the **active** pixel viewport, shader pixel-size uniforms and a scissored clear. It does not reassign the backing canvas width/height. A genuine CSS resize replaces the capacity for that new viewport; low-DPR screens are not eagerly allocated at DPR 2. Callers retain the existing maximum DPR 2 and movement cap 1.5. Context recreation starts with empty capacity; disposal and map teardown retain the existing ownership rules. No historical viewport pool or extra frame loop is added.

WebGL's active rectangle is lower-left, so the Canvas snapshot crops from top-left `y = capacityHeight - activeHeight`. Both star and Milky Way copies use an integer source rectangle and **1:1 device-pixel** destination. Stars use active dimensions rather than capacity in `pixelViewport`. This prevents point displacement/stretching and stale border pixels. The old Milky Way copy could slightly rescale when CSS×DPR was fractional; making it 1:1 removes that filtering. It is not a claim of pixel identity to the former fractional resampling. The Milky Way's source, orientation, ray raster, brightness, zoom and layer order remain; both GPU layers still snapshot in their existing 2D positions.

### Software-renderer policy

A forced SwiftShader comparison found a concrete regression when retaining the larger surface: median command drawing rose from 17–18 ms to 23–24 ms and copy submission from 16–17 ms to 22–23 ms. The counter confirmed zero surface dimension writes instead of four, but software copies cost more. Therefore **known software renderers use exact-sized GPU surfaces**, even in explicit GPU diagnostic mode. Ordinary automatic mode already chooses Canvas for those renderers. Other/Brave-masked drivers use retained capacity. Driver inspection happens at construction, not per frame; it is not hardware-model identification. Optional constructor policy override is used only by direct browser verification to exercise retained capacity on the cloud software GPU.

This preserves the measured software path while testing a hardware-relevant allocation reduction. No hardware speedup is established by cloud checks; unknown/masked drivers and deferred GPU transfers still need phone comparison.

`skyGrid.ts` caches two fixed sets of horizontal curves (above/below-horizon), including prepared sine/cosine directions. Panning reprojects them with the existing prepared projector instead of allocating/recomputing thousands of raw samples each frame. Grid sample spacing, wrap, horizon inclusion and discontinuity checks remain. Figure clipping uses the same four scalar Liang–Barsky sides in the same order without allocating four temporary pairs for each segment. Figure reveal/geometry/text caches, IAU boundaries, star positions, labels and F-020 defaults remain.

## B-007 — one-second initial listener retries

The existing one-second interval retries both orientation listeners while **zero usable directions** have arrived: at 1, 2, …, 7 seconds under normal scheduling. At a total **8 seconds** without usable data it stops with the existing explicit no-data failure/report. Background throttling does not cause a burst of catch-up retries. The counter remains bounded at seven. No extra polling/RAF timer is created.

The first usable direction, including relative-only data, stops this startup retry series. Stable north-reference establishment continues under the existing freshness/stationarity guards. There is no retry after an established session loses its primary data. Permission denial, missing API or a thrown permission request is handled immediately; permission is never automatically requested again. Stop, hidden page, manual takeover and stale-generation checks cancel listeners/timers/pending publication. Local version-2 startup counters remain available with zero events. This handling does not identify the physical browser/hardware root cause or change B-001 sensor mathematics.

## F-021 — temporary night-preview test startup

`initialObservation()` selects the existing darkest sample in the selected/stored location's local night, once during page initialization. It shares that initial night context with the existing night calculations. Startup time is frozen and labeled **Night preview / Kvällshimmel**. **Now / Nu** returns to the real advancing clock; a manual date/time stays Selected time, and subsequent settings/panel changes do not force preview back on. Reload chooses the testing default again. The startup helper is the single place to remove the temporary default later.

No GPS/sensor permission is requested. Existing saved location and season/timezone logic apply. Polar day and bright summer nights retain the explanation that the selected time may still have no dark sky; startup shows the existing warning copy. No artificial dark date or physical-visibility guarantee is introduced. Object/list links and the normal controls remain supported.

## F-022 — same-gesture manual takeover

The horizon's one-pointer drag starts at the existing **8 px** threshold. Its drag-specific callback consults synchronous sensor intent, stops the session and cancels queued phone publication, then enqueues the accumulated manual delta directly in `SkyFrames`. It bypasses the stale React `phone.active` guard for this deliberate handoff. Later drag samples do not repeatedly stop an already ended session. Marker-origin drags suppress selection as before.

A tap/jitter below threshold, object selection, Search or panel opening keeps following. Two-pointer pinch takes the zoom path and keeps following. A recognized drag also cancels pending permission, so a later permission result cannot restart following. Keyboard/manual-button policy and explicit Stop remain; this user-approved drag exception supersedes the earlier Stop-first requirement. No sensor heading correction is added.

## Verification and limits

- **162 offline tests** pass, including fixed grid samples and prepared/raw projection agreement for wrap, zoom and near-vertical/below-horizon views; startup darkest-time selection for stored northern/southern places and polar/bright limits. Existing reveal, scheduler, astrometry and direction tests pass.
- Complete main/lab build passes; the existing >500 kB warning remains.
- `verify_gpu_resources.mjs` forces retained capacity and checks zero dimension writes during warmed density changes, exact output versus a fresh renderer at integer and fractional CSS sizes/DPR 1.25/1.5, atlas limits, real resize/revalidation and disposal. The default known-software policy is measured separately.
- `verify_gpu_prototype.mjs` retains 32 geometry cases, 64 coverage samples and ten Milky Way comparisons (maximum alpha RMSE about 0.366/255 in those fixtures), context recovery/fallback and lab control checks.
- `verify_test_defaults.mjs` checks labeled preview/Now/manual time/reload, stored Sydney location, Swedish polar-day warning, no automatic permissions, real touch marker-origin takeover and pending-permission cancellation. A masked-driver override exercises retained capacity in the ordinary app for correctness only. At mobile/desktop size it enqueues a sensor pose and a drag before one RAF and checks that the exact first manual delta wins, with no later sensor pullback. Taps/search/pinch preserve following.
- `verify_startup_focus.mjs` checks retry counters each second through seven, the total deadline/zero-data report, first usable readings, normal sessions and stopped/hidden/permission/error cases. Sensor events are simulated, not hardware validation.
- Existing horizon/report checks pass for pose/marker/HUD alignment, coalescing, pinch/tap, density restoration/idle, context recovery, map teardown, failure fallback and bounded local report export. The updated timing/image scripts explicitly select the same **Now** fixture in before/after builds; this avoids comparing the new preview against the old live default.
- Twelve Canvas comparisons against the previous clean production build have zero changed channels across two viewports and All/Common/names/lower-sky/zoom/map states. These cover grid/clipping changes without readback during timed workloads.

Physical first activation, drag feel and rendering performance remain user checks. B-004/B-007 remain open; no subsequent development batch is approved.

## Final paired timing result

[Derived comparison/policy decision](measurements/surface-grid-comparison-2026-11-04.json) retains both the unsuccessful retained-software trial and the final exact-size-software comparison. In the final paired runs:

| Measure | Before (two runs) | After (two runs) |
| --- | ---: | ---: |
| Software GPU dimension writes during capture | 4 / 4 | 4 / 4 |
| Command draw median / p95, ms | 17/25, 17/22 | 16/26, 16/25 |
| Nested copy submission median, ms | 16 / 16 | 16 / 15 |
| Active cadence median / p95, ms | 32/40, 32/37 | 32/35, 32/36 |
| Latest input → command end median / p95, ms | 27/37, 27/38 | 27/37, 27/39 |

All runs accept manual requests on 42 draws and use two active-DPR changes, one moving-atlas upload and zero warmed raster checks. The after captures contain fewer draws as gesture/animation pacing differs, so raw long-interval counts are not an equal-duration FPS comparison. The software regression is avoided by exact sizing; the final modest median difference is not proof of a hardware or physical-input gain. In the forced retained-capacity correctness check, warming takes two initial width/height writes and eight density alternations add **zero**, while a genuine CSS aspect resize adds two. Integer/fractional retained snapshots exactly match fresh-density renderers. A new phone report is needed to establish the hardware path's effect on the 58 ms startup stall and steady panning.

## Publication

App commit `08b522d5aa374faea580375abe034c1d951e2a45`: [successful 162 tests/build/Pages run](https://github.com/BadBagel47/noxari/actions/runs/41847592223). Verified-TLS main/lab HTML, referenced JS and main CSS equal the clean local build. A local report export confirms `build.commit: 08b522d5aa37`, `dirty: false`. Later documentation commits can change hashes/build identity without functional changes. Physical phone comparison remains pending; no next batch is approved.
