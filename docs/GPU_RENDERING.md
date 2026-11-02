# B-004 — GPU layers in the ordinary horizon view

The user approved this bounded integration with “Kör” after the Android/Brave prototype report and the **Sol High** recommendation. The horizon view now uses the shared GPU star/Milky Way layers when WebGL2 is available and suitable. The all-sky map keeps its existing Canvas rendering. B-004 remains open for physical full-app feedback; B-001 direction drift stays paused and its sensor mathematics/reference rules are unchanged.

## Rendering and ownership

`src/gpuSky.ts` contains the shared WebGL2 layer implementation; the diagnostic lab re-exports it. The ordinary app does not import lab code or the lab controller. `src/horizonGpu.ts` owns a detached context, uploads/recovery and the bounded Canvas fallback. `HorizonView` calls it only from its existing `SkyFrames` renderer. There is no added rendering RAF, sensor queue, polling loop, user permission or stored preference.

The opaque 2D scene still owns background, grid, IAU boundaries, figures/labels, star names, cardinal directions and ground, in their existing order. The Milky Way and star layers each snapshot into that scene at their original positions. Two GPU-to-Canvas copies remain in combined mode; an all-GPU composition is outside this step. Scene stars upload only when their time/location array changes, not during camera movement. The source Milky Way texture uploads only when its reference changes. Its J2000 basis/key follows time and location; shader rays, horizon mask, 240-long-axis raster and zoom use the original projection. The Milky Way toggle does not disable GPU stars.

Object/selection/Finder overlays still use the shared CPU projection and are committed with camera state before drawing. Existing layer defaults, camera/zoom ranges, pinch/tap distinction, animations, reduced motion, daylight/lower-sky visibility and `MotionResolution` are retained.

## Star coverage refinement

The prototype's radial-distance sprite produced a brighter tiny star (about +12% integrated opacity in its centered DPR-2 fixture). Stars now use a cached **Canvas circle coverage atlas**: four existing radius bins, 16×16 subpixel phases, 16-pixel tiles. A single `POINTS` draw selects each star's tile, retaining its existing magnitude-dependent opacity. Even integer point sizes and a one-device-pixel-to-one-device-pixel snapshot avoid point-size rounding and whole-surface resampling. Coverage is snapped to the nearest 1/16 device pixel; this is not pixel-identical rendering or a new physical photometry model.

Each atlas is 256×1024 RGBA (1 MiB). At most two DPR images are cached per renderer, plus one uploaded atlas texture; camera movement does not regenerate them. Entry/exit of movement density reuses those images. Textures, VBOs, programs/shaders, framebuffer, atlas cache and owned context are released on map switch/unmount. Partial shader initialization also cleans its resources.

Browser readback checks on Chromium/SwiftShader:

- 32 geometric/masking cases: CPU versus GPU star centroids differ by at most **0.041 CSS px** at DPR 2, including wrap, zoom, ±89.9° pitch, daylight and simulated lower sky.
- Four centered radius bins at DPR 2: integrated-opacity ratios **1.000, 1.0002, 1.000, 1.0053** versus the Canvas fixture. The formerly +12% smallest point is about +0.5% in this fixture.
- 64 phase/magnitude/DPR combinations (1, 1.25, 1.5, 2): ratios **0.9773–1.0688**. This bounded sample is not exhaustive across device rasterizers; minor subpixel/quantization differences remain.
- Ten Milky Way comparisons: alpha RMSE ≤**0.366/255**, maximum individual difference 8/255. CPU and GPU use the same time/place orientation and source texture.

## Fallback and diagnostics

Missing WebGL2, shader/link failure, insufficient point-size limit, scene upload error, failed GPU drawing or context loss use the existing Canvas layers. A context loss invalidates `SkyFrames` once; recovery rebuilds the GPU resources with the latest time/location scene and keeps the latest view. Switching to the map releases the owned context. Known software implementations (SwiftShader, llvmpipe, Software Rasterizer) use Canvas in automatic mode because the measured software path is slower. A privacy-masked renderer string such as “Brave” is not treated as a hardware identifier or a software rejection.

Read-only diagnostic URLs allow reproducible comparisons without adding ordinary UI controls:

- `/noxari/?skyRenderer=canvas` forces Canvas.
- `/noxari/?skyRenderer=gpu` attempts GPU even on software; initialization/drawing failures still fall back.
- `/noxari/` is automatic. Overrides are session URL parameters, not saved settings.

`.horizon-view` exposes `data-sky-renderer` (`gpu`/`canvas`) and `data-sky-renderer-reason` for browser checks. These are diagnostic metadata; the ordinary user flow stays unchanged. The separate `/noxari/labs/gpu-sky/` comparison remains available, now using the shared refined layer code. Historical phone measurements in [GPU_PROTOTYPE.md](GPU_PROTOTYPE.md) used the earlier sprite shader and do **not** establish the final ordinary app's performance.

## Verification and input timing

`tests/horizonGpu.test.ts` covers explicit override policy, software fallback/context release, initialization/drawing/upload failures, newest-scene recovery, shared-queue invalidation and disposed listener cleanup. The existing astronomy, visibility, scheduler, input/sensor and catalog tests remain unchanged.

Optional environment-provided Playwright/Chromium checks, against a production preview on port 4194:

```bash
npm test
npm run build
npm run preview -- --port 4194
# Separate terminal; PLAYWRIGHT_MODULE/CHROMIUM_PATH select supplied installations if necessary:
node scripts/verify_gpu_prototype.mjs
node scripts/verify_horizon_gpu.mjs
node scripts/benchmark_horizon_input.mjs
```

The shader/image check includes the coverage samples above. Whole-app checks cover coalesced bursts, 8,922 GPU star instances, actual shader pose versus DOM marker/HUD coordinates, changing/restored DPR, pinch and marker taps, idle shutdown, context loss/restoration, three consecutive map/context releases, shader/draw/unavailable failures and default/software/explicit modes. Layout checks use 390×844 (DPR 2), 1280×800 (DPR 1 for forced software GPU), 568×320 (DPR 2). Existing Canvas/default checks also cover desktop DPR 2 and mobile DPR 1.25. Synthetic following across panels/map/Stop and permission cancellation verify integration only; this does not resume B-001 investigation or verify physical compass accuracy. Finder center/offset/zoom/idle checks pass at mobile and desktop DPR 2. A dev StrictMode smoke check with an isolated Vite cache verifies initial context release, one remaining live context, one draw for a coalesced burst and idle shutdown. Keep dev/SSR caches separate to avoid stale optimized dependency 504 responses. All five default toggles remain enabled despite an older stored candidate-off value, and no sensor/GPS permission is requested automatically.

The benchmark uses the actual application and shared frame queue, fixed Stockholm 2026-01-15 22:00 UTC, all layers/88 figures and the existing adaptive DPR policy. It dispatches 90 RAF pointer moves (83 scene draws after gesture threshold), then a separate sweep of trusted browser mouse events. Input-to-draw-end is measured from pointer event handling to the end of the synchronous drawing task via a microtask. It includes the frame wait/React commit/drawing command submission, but **not** physical input hardware, GPU completion, displayed pixels or presented FPS. `BASELINE_URL` may select a previous build; otherwise the comparison reference is forced Canvas in the same build. `APP_URL` and `PERF_OUTPUT` select the preview and optional result file. [Raw input and shader results](measurements/horizon-gpu-integration-2026-11-02.json) record the final renderer working tree/main asset hash. The baseline is the TLS-verified pre-integration published main asset `index-BIU8FzUJ.js` (same main runtime as `ff175bf` / `2d4cf45`), served locally. Runs execute sequentially without another browser workload, in baseline → auto → forced GPU → forced GPU → auto → baseline order.

| Whole-app variant, two runs | RAF p95, ms | >25 ms /90 | Draw median, ms | Synthetic input→draw-end p95, ms | Trusted pointer sweep median / p95, ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Previous production Canvas | 29 / 30 | 6 / 8 | 5 / 6 | 21 / 22 | 9 / 13; 10 / 13 |
| New automatic (Canvas on SwiftShader) | 28 / 27 | 6 / 6 | 5 / 5 | 20 / 20 | 9 / 14; 8 / 13 |
| New forced GPU on SwiftShader | 39 / 42 | 73 / 75 | 20 / 20 | 32 / 34 | 30 / 44; 30 / 41 |

The trusted mouse sweeps contain 21 captured trusted pointer events and 19–21 corresponding draws, not a guaranteed one-draw-per-event policy; coalescing is intentional. The automatic path preserves roughly the previous software-renderer behavior in this small/noisy sample. Forced software GPU is slower and is avoided automatically. These timings do not establish full-app hardware performance; no physical phone input-to-display latency or controlled Stellarium benchmark was measured. The existing Android prototype results remain supporting evidence for testing the new ordinary-app hardware path, not measurements of this build.

## Status

Integration is implemented; ordinary-app physical Android/Brave feedback is pending. The previous phone prototype supports this direction but is not a performance guarantee for this build or proof of parity with Stellarium. No further development batch is authorized by this completed step.


## Deployment evidence

App commit `de4f4b2cb25e276e2c5a18cf024cd8afdd9586c3` passed 140 tests, production/lab builds and Pages via [Actions 41474970062](https://github.com/BadBagel47/noxari/actions/runs/41474970062). Verified-TLS public retrieval matched main/lab HTML and JS, main CSS, Milky Way image and BSD license against local artifacts. Main `index-BTsF-5ed.js`: SHA-256 `574b1096ad030c65f47948bf36e89b0d5057cbaa0a50af64c92c46580ea80b00` (also the measured main artifact); CSS stayed unchanged. The published main URL now exercises the integrated renderer; app sensor behavior/accuracy is not physically revalidated. A subsequent documentation commit may alter the lab asset hash because it embeds the build commit, while main JS and renderer code remain the verified app version.
