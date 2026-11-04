# Development diagnostics

This page gathers the committed tools and repeatable checks used to develop Noxari. It is for contributors; it does not add diagnostic controls to the app.

## Main checks

Run from the repository root:

```sh
npm ci
npm test
npm run build
npm run catalogs:check
```

- `npm test` runs all committed offline Vitest tests in `tests/`. NASA/JPL fixture comparisons and catalog/source checks use checked-in fixtures; they do not need live astronomy APIs.
- `npm run build` runs the TypeScript project build and Vite production build. A warning about the large JavaScript bundle has been observed; check current output rather than treating it as a failed build.
- `npm run catalogs:check` compares OpenNGC, the selected HYG stars, Stellarium constellation/boundary data and listed JPL orbits in both small-body collections. It is read-only and reports additions, missing upstream IDs and changed values; it never edits catalog files. Missing entries require review before retirement. NASA/Hubble distance facts, candidate discovery/status and object images remain manual checks.
- `npm run dev` serves the app locally. `npm run preview` serves the production build. Use the Vite network address for a phone on the same network; sensor permissions require a secure context, so physical sensor checks belong on the deployed HTTPS site or a trusted local HTTPS setup.
- `.github/workflows/deploy.yml` repeats install, tests and build on pushes to `main`, then deploys the artifact to GitHub Pages. A successful local build does not confirm deployment; inspect the Actions run and the live app separately.

## Focused test areas

Vitest files are organized by calculation or behavior. For a fast focused run, pass test paths to Vitest:

```sh
npx vitest run tests/deviceDirection.test.ts tests/directionReport.test.ts
```

Notable groups include astronomy/planet references, recommendations, catalog and Messier data, sky projection and clipping, IAU boundaries, constellation reveal timing, Finder geometry, device-direction state transitions and bounded report history. `tests/fixtures/planets-horizons.json` contains reproducible external reference samples used offline.

Useful data-generation scripts are under `scripts/`; their inputs, pins, licenses and regeneration steps are described in `src/generated/README.md` and `data/README.md`. Do not regenerate from an unpinned current upstream source as part of ordinary tests.

## Browser and device checks

Optional committed browser scripts under `scripts/verify_*.mjs` use environment-provided Playwright/Chromium; the application has no browser automation dependency or mandatory Playwright test command. Early responsive checks were temporary session scripts. Distinguish these browser results from Vitest and physical-device validation. Check the critical workspace sizes at 390×844 (mobile), 1280×800 (desktop) and 568×320 (short landscape), plus any dimensions directly relevant to the change.

Physical Android/iOS sensor behavior cannot be established by synthetic browser events. Follow the controlled procedure in [`DIRECTION_STABILITY.md`](DIRECTION_STABILITY.md) for direction work. The direction report is downloaded locally only when requested; it contains bounded sensor histories and no GPS coordinates. Review its contents before sharing it.

## What a check establishes

- Unit tests validate the modeled inputs and code paths they exercise; they do not prove sky visibility, true-north accuracy or physical sensor quality.
- A successful build validates type checking and bundling, not runtime interaction.
- A browser smoke test validates the tested browser and viewport only.
- An Actions success validates the deployed workflow run. Compare the deployed version if confirming a particular build.
- A physical device report is evidence for that session, not general accuracy across devices.

## Rendering performance

See [B-004 performance analysis](PERFORMANCE_ANALYSIS.md) for the current production sweep, remaining stutter, timing limitations and proposed rendering scheduler. RAF cadence, actual scene draws and input latency matter; passing interaction checks or having no >50 ms long tasks does not establish smooth animation.

`tests/skyFrames.test.ts` checks shared-frame coalescing, sensor-to-camera publication within one callback, animation completion, cancellation, teardown/remount and drawing-error shutdown. The production comparison after the approved scheduler change is recorded in the analysis; physical Android/Brave cadence remains to be checked.

`tests/motionResolution.test.ts` covers motion-density entry/exit, jitter and single-jump rejection, wraparound/pinch, delayed-frame hysteresis and low-DPR preservation. The production comparison and buffer-allocation/visual checks for B-004 + F-020 are in the performance analysis.


## Separate GPU prototype (B-004)

[GPU prototype method/results](GPU_PROTOTYPE.md) describes `/noxari/labs/gpu-sky/`, built separately by `npm run build:gpu-prototype` (also part of the ordinary production build). It has Canvas/GPU/layer comparisons, cancellation, Canvas fallback and a local downloadable report. It does not use phone sensors or replace the main app. Optional browser geometry/image/context/fallback checks: `scripts/verify_gpu_prototype.mjs` with environment-provided Playwright/Chromium; see that document for invocation. Headless SwiftShader results do not establish hardware FPS or the phone’s performance.


## Ordinary horizon GPU layers (B-004)

[GPU rendering](GPU_RENDERING.md) documents the approved ordinary-horizon integration, automatic/explicit Canvas fallback, context recovery, shader/coverage checks and full-app input timing. Optional Playwright entry points are `scripts/verify_horizon_gpu.mjs` and `scripts/benchmark_horizon_input.mjs` alongside `scripts/verify_gpu_prototype.mjs`; they use an environment-supplied browser package, not a new application dependency. Whole-app checks use actual shader uniforms/instances and DOM overlays. Timing is input handling to command submission, not physical display latency or presented FPS. The standalone lab now shares the refined layer code; old phone reports retain their original build identity.


## Ordinary-app performance recording (B-004)

**More → Performance report / Mer → Prestandarapport** is a local opt-in capture tool. Start, pan for 10–15 seconds (or use already-active phone following), stop and download `noxari-performance.json` for chat review. [Method/schema and limits](PERFORMANCE_REPORT.md) describe actual build/backend identification, accepted-request timing, shared commit and eight phases with nested snapshot timing, idle filtering, bounded memory/timer and privacy allowlists. It does not measure presented FPS, GPU completion or physical compass accuracy. Optional checks: `scripts/verify_performance_report.mjs`, `tests/skyPerformance.test.ts`, and `scripts/benchmark_performance_report.mjs` for paired collector off/on cost, using environment-provided Playwright. The older standalone GPU lab remains separate from ordinary-app recording.

## Motion-resolution / GPU-resource checks (B-004)

`scripts/verify_gpu_resources.mjs` verifies real WebGL warmed atlas reuse/image identity, two-texture eviction, framebuffer validation after resize and disposal. `scripts/benchmark_motion_resources.mjs` compares two production previews in paired order using six gestures and 400 ms pauses, ordinary local report summaries, DPR changes and test-only GL counters. Supply `APP_URL`, `BASELINE_URL`, optional `PERF_OUTPUT` and environment-provided Playwright. See [GPU rendering](GPU_RENDERING.md#approved-motionresource-follow-up-2026-11-04) for results and limits. Production diagnostics remain together under More; no new user controls were added.

## Figure cache and first activation (B-004 / B-006 / B-007)

[Implementation and limits](FIGURE_CACHE_AND_STARTUP.md) cover the per-view figure/text cache, pointer/keyboard focus and one bounded silent-start listener retry. Optional environment-provided Playwright scripts: `scripts/verify_startup_focus.mjs` for simulated startup/cancellation/report and real pointer focus; `scripts/verify_figure_cache.mjs` with `APP_URL` and `BASELINE_URL` for ordinary Canvas image comparison. Existing paired `benchmark_motion_resources.mjs` records the eight layer phases, including figures, without pixel readbacks during timing. Direction reports remain under the structured Phone direction diagnostics; failed startup now offers export even with no readings. Performance reports remain unchanged.

## Surface policy, startup timing and drag takeover

[Current bundle](SURFACE_REUSE_AND_TEST_DEFAULTS.md): `verify_test_defaults.mjs` covers F-021/F-022 and the same-frame sensor/manual race; `verify_startup_focus.mjs` covers B-007 one-second retry counts/deadline; `verify_gpu_resources.mjs` forces retained capacity for resize/fractional-coverage checks. `benchmark_motion_resources.mjs` now explicitly selects the same live fixture in both builds and counts test-only GPU dimension writes, as well as GL uploads/checks. Timings remain software/device-specific command submission, not display latency.

## Controlled B-004 comparison

More → Performance report → Start controlled comparison compares exact/retained surfaces in the ordinary horizon with ABBA order and fixed scripted movement. Save `noxari-surface-comparison.json` for chat. See [method, privacy and phone instructions](SURFACE_COMPARISON.md). Optional browser gate: `scripts/verify_surface_comparison.mjs`; no physical-phone improvement is inferred from cloud timings.

## F-009 functional review

[Results and five-step physical phone follow-up](FUNCTIONAL_REVIEW.md) cover the first bounded review. Optional `scripts/verify_functional_flows.mjs` checks search/selection, Finder, real CDP pinch in both views, saved-object persistence and stubbed object/list sharing, time/location/GPS and Swedish settings across mobile/desktop/landscape viewports. Supply `APP_URL`, `PLAYWRIGHT_MODULE`, optionally `CHROMIUM_PATH`, `ONLY` and `QA_OUTPUT`. Real native sharing/permissions/sensor accuracy remain physical checks. B-008 records the unresponsive Custom coordinates dropdown choice; no app fix was made in this review.
