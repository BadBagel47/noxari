# B-004 — separate GPU rendering prototype

Approved by the user's “Kör” after the recommendation **Sol High**. This bounded step profiles the existing production view and tests GPU stars/Milky Way separately. It does not authorize migrating the app renderer. B-004 remains open; B-001 direction drift remains paused. F-020 defaults are preserved.

## Test from chat / on a phone

Open https://badbagel47.github.io/noxari/labs/gpu-sky/ . The ordinary app remains at https://badbagel47.github.io/noxari/ .

1. Choose **Canvas – referens**, collapse the heading and drag/pinch. Then compare **GPU – stjärnor + Vintergata** with the same view. The two individual GPU layer modes help isolate a difference.
2. Expand the heading and press **Jämför natthimmel**. Keep the tab foreground and the same screen size until it finishes. No GPS or motion permission is requested; this is a manual rendering test.
3. Press **Spara rapport**, then attach `noxari-gpu-prototype.json` in chat and describe which mode felt smoother. The download contains browser/backend, build, fixed Stockholm/night preset and timing summaries, without GPS coordinates. Nothing is sent automatically.

The default is Canvas. Missing WebGL2 or lost GPU resources use Canvas and say so. A failed GPU run is never counted as a successful GPU benchmark. Stop, hidden-page and resize cancel the comparison. Returning from context loss rebuilds the buffers/textures. The `?v=<commit>` parameter can refresh the test URL; it does not pin a release.

## Architecture and preserved geometry

`labs/gpu-sky/` is a separately built page, not imported by `src/App.tsx` or the app renderer. `npm run build` builds it under `dist/labs/gpu-sky/` after the ordinary app/share pages. It adds no dependencies and loads no remote datasets. The original main app's JS/CSS content hashes remain unchanged.

The harness reuses the pinned 8,922 HYG stars, star magnitudes, astronomy transforms, All 88 figures, boundary preparation/drawing and ground visibility helpers. Positions are calculated once for the fixed time/place, not on every camera frame. DOM object positions use the shared CPU projection. Other Canvas layers retain their draw order.

- **Stars:** immutable direction/radius/opacity attributes in one VBO; a `POINTS` draw projects them using the same heading/pitch/focal length and below-horizon policy. Offscreen/behind-camera directions are clipped. No catalog reduction.
- **Milky Way:** inverse-ray shader uses the same J2000 rotation, periodic RA sampling and north-at-top source texture. It caches a framebuffer raster with 240 samples on the long axis, like the current painter, then scales it for zoom. This is not a hidden quality reduction or a new high-resolution visual design.
- **Bridge:** GPU pixels are copied into the 2D scene at the original layer positions, twice in the combined mode. The measured submission time includes both `drawImage` calls; transfers/synchronization can erase shader savings. A future all-GPU composition would be a different implementation requiring separate approval.

The harness excludes React panels, the real input pipeline, Finder and sensors. It cannot measure full-app input latency or sensor accuracy. Its absolute cadence must not be compared directly with the main app's gesture sweep as if the workloads were identical.

## Measurements, 2026-11-02

[Raw results](measurements/gpu-prototype-2026-11-02.json) record the pre-commit working tree (`b55cf179a3c5+dirty`). The renderer code is the code in this step; the subsequent HTML change only bounds the scrolling controls and supplies a favicon.

### Existing production app

390×844 CSS pixels, device DPR 2 with the existing adaptive policy, Stockholm, 2026-01-15 22:00 UTC, All 88/all layers. Same 90 synthetic RAF pointer movements, 83 actual draws after the gesture threshold. “Draw proxy” is the synchronous drawing task, not GPU completion.

| Variant | RAF p95, ms | Intervals >25 ms /90 | Draw proxy median/p95, ms |
| --- | ---: | ---: | ---: |
| All layers | 27 | 6 | 5 / 7 |
| Milky Way off | 18 | 1 | 3 / 4 |
| Figures off | 29 | 12 | 5 / 6 |
| Boundaries off | 29 | 6 | 5 / 7 |
| All layers repeat | 31 | 8 | 5 / 7 |

These small samples are noisy. Turning off the Milky Way gave the clearest positive signal; they do not prove the other layers have no cost.

### Isolated prototype

Headless Chromium 154 on Linux with **SwiftShader software WebGL2**, not a phone GPU. Fixed 390×844, DPR 1.5, same night/pan/zoom, all figures/boundaries/names/objects. Twelve warm-up frames, then 90 measured frames per run; reduced figure animation in **both** modes. No readback or `gl.finish` inside the timed loop. Each run uses the same heading sweep; Canvas → GPU → GPU → Canvas reduces order bias. RAF deltas reflect callback cadence, not presented FPS; draw time is synchronous command submission including marker updates, not GPU completion. Stage medians do not necessarily add to the overall median.

| Mode/run | RAF median/p95, ms | >25 ms /90 | Draw median, ms | MW median, ms | Stars median, ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Canvas first | 16.7 / 16.7 | 0 | 4.9 | 2.6 | 0.8 |
| GPU both first | 16.7 / 33.4 | 42 | 18.2 | 10.8 | 5.6 |
| GPU both repeat | 33.3 / 33.4 | 47 | 18.9 | 11.4 | 5.8 |
| Canvas last | 16.7 / 16.8 | 0 | 4.7 | 2.5 | 0.8 |
| GPU MW only, additional | 16.7 / 33.4 | 19 | 13.2 | 10.9 | 0.8 |
| GPU stars only, additional | 16.7 / 16.8 | 4 | 9.8 | 2.5 | 5.5 |
| Canvas additional | 16.7 / 16.7 | 0 | 4.6 | 2.6 | 0.8 |

**No performance win demonstrated.** The bridge is slower on this software backend. These measurements do not isolate copy cost from shader execution and cannot establish physical Android performance. They are grounds to retain Canvas and request a real-device comparison, not to claim that GPU rendering in general is worse or faster.

## Correctness and verification

The optional `scripts/verify_gpu_prototype.mjs` runs against the built preview with environment-provided Playwright/Chromium. It is not an added npm dependency or part of the astronomy unit-test count.

```bash
npm run build
npm run preview -- --port 4194
# In another terminal, with Playwright available as a module:
node scripts/verify_gpu_prototype.mjs
# PLAYWRIGHT_MODULE can select its installed module path; CHROMIUM_PATH and LAB_URL are optional.
```

Chromium readbacks, outside timing runs:

- 32 synthetic star cases cover four magnitude/radius bins, heading wrap, 1×/3× zoom, ±89.9° pitch, below-horizon reveal, daytime suppression and behind-camera clipping. Visible centroids differ from the CPU projection by at most **0.027 CSS px** at DPR 2. This checks rendering geometry, not celestial accuracy against independent ephemerides.
- Ten Milky Way image comparisons against the unmodified painter cover positive/negative pitch, near-vertical views, heading wrap and zoom. Alpha RMSE ≤**0.366/255**, maximum individual alpha difference **8/255** at the horizon/interpolation edges. Sampling/quantization are not pixel-identical.
- Star sprite antialiasing is approximate: centered integrated opacity ratios versus Canvas at DPR 2 are **1.021, 1.026, 0.976, 1.124** for magnitudes −1, 1, 3 and 6.5. The faintest tiny sprite is about 12% stronger in this test. Magnitude ordering remains, but this coverage difference is a **migration blocker to review/refine**, especially at other DPRs. Do not describe the prototype as preserving identical photometry.
- Real controller tests exercise context loss/restoration, unavailable WebGL2, cancellation and resize cancellation, Canvas fallback, and mobile/desktop/short-landscape layouts. Touch/pinch, keyboard panning and a four-run JSON download passed. The ordinary app’s 135 tests and complete production build passed; its JS/CSS matched the previous public assets byte for byte over verified TLS. No physical compass/GPS validation is included.

## Decision / next step

Keep the existing app renderer. Ask the user for the phone report and manual comparison before proposing migration. If hardware results are promising, separately approve brightness/edge-parity refinement and a renderer integration plan that preserves `SkyFrames`, overlays, fallback and scientific projection. Otherwise consider optimizing the current Milky Way CPU raster, cached grid/figure geometry, or isolating camera state from panel renders. These are possible next steps, not current approvals.
