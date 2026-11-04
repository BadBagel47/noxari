# B-004 figure cache, B-006 pointer focus, B-007 startup

The user approved this bundled step with “Kör enligt rekommendation” after the Sol High recommendation. The first-resolution-change stall and paused B-001 drift are outside this batch. The preceding clean `0246034e081a` phone report is analyzed in [phone performance analysis](PHONE_PERFORMANCE_ANALYSIS.md); no subjective smoothness conclusion or startup sensor evidence is inferred from it.

## B-004 — reuse figure geometry and text metrics

`ConstellationDrawingCache` belongs to each mounted horizon/map view. It retains one scene's prepared horizontal sine/cosine directions and one view's projected/clipped strokes, segment lengths, visible/entry-eligible IDs and label positions. Scene array identity, projector identity, CSS dimensions or inner-entry rule changes replace that data. The horizon projector is memoized by heading, pitch, dimensions, zoom and below-horizon permission. DPR-only changes reuse CSS geometry. New time/location, Common/All selection, pan, pinch or resize therefore cannot use the wrong projection. Prepared projection uses the same equations as the old raw-angle path.

Animation progress remains in the existing `ConstellationReveal`; the geometry cache does not store time or progress. Animation-only frames reuse geometry/lengths and update stroke length/opacity and label collision placement. Per-arc IDs, 1,000 ms entrance, inner entry inset, 180 ms edge-exit tolerance, daylight reset, reduced-motion completion and idle shutdown remain unchanged. Names use the same system font, visibility/progress threshold and placement order. Per-context text metrics are cached by font/name, capped at 128 entries; contexts are weakly held. There is no global history of poses or scenes. Unmount drops each view's cache. The shared lab scene uses the same cache and projection policy; historical lab reports keep their original build identities.

No new frame loop, permanent resolution reduction, sky layer changes or grid rewrite is introduced. F-020 defaults and the prior 800 ms density hysteresis/GPU resource reuse remain.

## B-006 — pointer steering without the keyboard outline

The user confirmed a thin light frame. The old drag path programmatically focused the tabbable horizon root, whose `:focus-visible` rule draws the inset frame. Drag no longer transfers focus. A pointer-modality attribute suppresses the root outline during pointer steering even if a preceding panel left keyboard-visible focus; blur clears it and keyboard input clears it immediately. The root remains in tab order, retains its visible keyboard focus and arrow/Escape actions. Marker focus/selection rings, drag/tap thresholds and pinch behavior are retained.

Real browser mouse and CDP touch checks begin with keyboard-visible root focus, pan, verify no outline, then verify that arrow-key control restores the visible outline and Tab can leave the root. This establishes the tested interaction, not every browser's rendering.

## B-007 — bounded recovery of a silent initial subscription

The user reports that the first activation often fails, while top-right Manual → Follow phone again works. Their screenshot has inactive Manual/Follow plus a generic unavailable banner. It does not identify whether this was denied permission, missing API or an eight-second no-usable-data timeout. No physical-device root cause is claimed.

The approved startup handling now:

- Makes **one** remove/add of both existing orientation listeners after at least **3 seconds** with **zero usable directions**, within the original >8-second no-data threshold checked by the existing one-second interval. This targets an initially silent/unusable subscription without asking the user to restart it.
- Uses the same handler, tracker, reference and following intent. It never requests permission again, creates another frame queue or resets the north reference during this retry. There is no retry after any usable direction has arrived, including relative-only data. Later primary-data loss retains the original shutdown rule.
- Preserves denied access/unsupported API handling, manual fallback, pending-permission cancellation, Stop, hidden-page cleanup and stale-generation protection. A duplicate direct start while a permission promise is pending is ignored; explicit Stop still cancels it.
- Distinguishes denied permission, a thrown permission request, missing browser support, no usable data and retry-in-progress in the ordinary notice/control messages. An API exception is not labeled a user denial.
- Keeps the downloaded version-2 direction report compatible with an optional `startup` object containing a finite phase and scalar counts (`listenerRestarts`, `receivedEvents`, `usableDirections`). A failed startup can now export a report even if it received zero events. No coordinates, browser exception text, persistent storage or automatic upload is added. Existing bounded sensor/incident data remain. If a new permission attempt fails before a new sensor session starts, retained direction samples still describe the last sensor session; `startup` describes the latest attempt.

This is a guarded recovery for a supported failure mode and clearer evidence for failures that remain. It does not bypass permission, relax stationary pairing/freshness/uncertainty checks, modify sensor fusion or resume B-001 drift work. Physical Android/Brave first-start behavior still needs user confirmation. The user subsequently clarified that the first failure appears after about eight seconds. This supports the no-usable-data timeout path and makes the three-second listener retry relevant, but does not establish the browser/hardware cause or verify physical recovery.

## Verification

- **158 offline tests** pass, including projection/clip agreement across all 88 figures, wrap/downward/near-zenith views; animation reuse and invalidation for scene/projection/size/entry rules; preserved progressive strokes, text measurement reuse and font/context distinctions.
- Complete main/lab TypeScript and production build passes; the existing >500 kB warning remains.
- `scripts/verify_startup_focus.mjs` exercises simulated silent-start recovery, normal first start, no-data deadline, no restart after primary-data loss, stopped/hidden and pending-permission cancellation, denied/thrown/unsupported API cases, zero-data report and real pointer/keyboard focus. It verifies integration/guards, not real sensor hardware or first-start causation.
- Existing `verify_horizon_gpu.mjs` and `verify_performance_report.mjs` pass: camera/GPU/marker/HUD alignment, coalescing, gestures, density restoration/idle, synthetic following across panels/map/Stop, backend/failure/context ownership, report export/lifecycle/privacy.
- `scripts/verify_figure_cache.mjs` compares ordinary Canvas output against the previous production build at mobile/desktop DPR 2, including All/Common, names off/on, lower sky, pinch and map. Set `APP_URL`, `BASELINE_URL` and environment-provided Playwright. Pixel comparisons are separated from timed workloads.

Further optimization and direction drift need a separate proposal/approval. B-004 and B-007 remain open for physical feedback; B-006's tested pointer-focus issue is implemented. No subsequent development batch is approved.

## Paired timing result

[Derived software-GPU comparison](measurements/figure-cache-comparison-2026-11-04.json) uses the existing ordinary-app recording and six gestures separated by 400 ms in before/after/after/before order. All four runs accept manual input on 42 draws and retain two DPR changes, one moving-atlas upload and no warmed raster attachment/status changes.

| Measure | Before (two runs) | After (two runs) |
| --- | ---: | ---: |
| Figure phase median / p95, ms | 1/2, 1/2 | 0/2, 0/1 |
| Complete draw median / p95, ms | 18/24, 18/27 | 17/28, 17/26 |
| Active cadence median / p95, ms | 32/39, 32/37 | 32/42, 32/38 |
| Latest input → command end median / p95, ms | 27/38, 28/40 | 27/41, 27/39 |

The benchmark clock yields integer-millisecond samples: the recorded zero figure median is below clock resolution, **not** zero work. Figure work falls in this controlled workload and median drawing is slightly lower, but cadence remains around 32 ms and tail costs do not clearly improve. The first after run also has a 78 ms draw, dominated by a 68 ms Milky Way phase; this batch does not claim to fix first-resize/GPU stalls or all browser scheduling. No physical-phone improvement is established. A new ordinary-app phone report and user feedback are the next checks, not an automatically approved optimization.

The 12 ordinary Canvas image comparisons (two viewports × six states) have **zero changed channels**, including the default all-figure sky, Common selection, names disabled, below-horizon view, pinch and map. This is a bounded browser sample; the numerical tests additionally cover wrap and near-zenith geometry.

## Publication

App commit `7f08e27f1c926533681fde30374fb9c4b4a701a2`: [successful tests/build/Pages workflow](https://github.com/BadBagel47/noxari/actions/runs/41833682902). Verified-TLS main/lab HTML, both referenced JavaScript bundles and main CSS equal the clean local build. A local ordinary-app report export confirms `build.commit: 7f08e27f1c92`, `dirty: false`. Subsequent documentation/build-ID commits can change hashes without functional changes. Physical first-start and smoothness confirmation remain pending; no next batch is approved.

## Subsequent approved startup/rendering update

The user then approved one-second initial retries up to the eight-second deadline, temporary night-preview startup and drag takeover, together with GPU surface/grid/clipping work. The single three-second retry and Stop-first drag policy above describe the earlier build. See [current implementation and verification](SURFACE_REUSE_AND_TEST_DEFAULTS.md); no B-001 drift work is reopened.
