# B-004 — first ordinary-app phone report, 2026-11-04

The user supplied `noxari-performance.json` from clean build `99e1b2a91e4e`. This document preserves the report/code analysis that preceded approval of the next step. The user subsequently approved its bounded proposal with “Kör”; see the implementation follow-up in GPU_RENDERING.md. Recommended model for the proposed graphics/resource work: **Sol High**. B-004 remains open; B-001 stays paused. The analysis itself did not change app code.

[Derived results](measurements/phone-performance-analysis-2026-11-04.json) retain the source SHA-256, measured summary and derived groups. The original user file, creation timestamp, exact viewport and full frame trace are not republished.

## What the report establishes

- Capture stopped at the 1,200-frame limit after **20,294.1 ms**. All 1,200 draws selected GPU, with no recorded errors/fallbacks and two GPU-to-Canvas snapshot calls per draw. The privacy-masked driver label was `Brave`; no hardware model is inferred.
- All five layers and All 88 figures were enabled, with stars/Milky Way visible; time mode was Live and zoom stayed 1×. The view crossed below the horizon.
- **750 manual-view requests across 749 frames**, no zoom or phone-publication requests, following intent false throughout. This does not test phone-following timing or compass accuracy.
- Recorded active draw-start intervals: median **16.4 ms**, p95 **25.0 ms**, maximum **77.6 ms**; **59/1,199** intervals exceed 25 ms. These are scheduled callback intervals, not presented FPS.
- Latest accepted request → synchronous command end: median **13.5 ms**, p95 **23.4 ms**, maximum **73.5 ms**. Post-enqueue wait is small (p95 **0.3 ms**); shared queue commit p95 is **1.5 ms**. Pre-enqueue input handling, other React updates and GPU/display completion remain outside these measurements.

## Strongest association: resolution transitions and renewed movement

Actual DPR switched **37 times**: 19 downshifts from 2 to 1.5 and 18 restorations. All 19 first/manual draws at DPR 2 were followed by a downshift on the next recorded draw. Apart from the initial frame, these full-resolution manual draws came after pauses. Code restores DPR 2 after **220 ms** and requires repeated movement before lowering it again. This recording's longest uninterrupted no-request run was about **484 ms**, so repeated short pauses can trigger restoration/reduction cycles while figure animation continues.

| Group | Draw count | Draw median / p95 / maximum, ms | Milky Way median / p95, ms | Stars median, ms |
| --- | ---: | ---: | ---: | ---: |
| Manual motion at stable DPR 1.5, excluding switches | 711 | 11.9 / 19.5 / 27.6 | 4.7 / 10.6 | 0.7 |
| All DPR switches | 37 | 24.6 / 41.8 / 71.0 | 14.2 / 30.8 | 4.4 |
| Downshift to DPR 1.5 | 19 | 28.5 / 71.0 / 71.0 | 17.5 / 50.5 | 3.9 |
| Restoration to DPR 2 | 18 | 23.0 / 34.3 / 34.3 | 9.5 / 21.1 | 4.6 |
| Manual draw at DPR 2 | 19 | 27.8 / 55.6 / 55.6 | 22.3 / 48.4 | 0.6 |

**24 of the 25 draws longer than 25 ms coincide with a DPR switch or a manual draw at full resolution.** Of the 59 long start-to-start intervals, **40 follow** one of those draws. The preceding draw matters: the interval stamped on frame i spans the start of i−1 to i. Correlating it only with frame i's own work would misattribute stalls.

This is a strong lead, not a randomized proof. Groups differ in camera/gesture phase, resolution and visible content. The capture does not isolate native GPU allocation, synchronization, shader execution or cached-data uploads. A faster recording with a fixed moving DPR in the earlier lab is consistent with this concern but is a different workload, not a controlled comparison against this run.

## Drawing stages and code review

| Stage, all 1,200 draws | Median / p95 / max, ms |
| --- | ---: |
| Milky Way | 3.2 / 12.0 / 50.5 |
| Constellation figures (including their names) | 3.6 / 5.4 / 11.2 |
| Grid | 0.9 / 1.5 / 5.7 |
| IAU boundaries | 0.9 / 1.5 / 3.6 |
| Stars | 0.5 / 1.1 / 15.4 |
| Nested GPU snapshot submission | 0.6 / 1.1 / 1.8 |

Snapshot timings are already included in the Milky Way/star stages. Their small synchronous duration does not prove that transfers/deferred GPU work are cheap; a later GL call can pay for previously submitted work. The largest pauses fall mainly in the Milky Way stage, which also owns the first GL surface resize of a draw.

Code confirms plausible work at the measured transitions:

- `HorizonView` resizes the visible 2D buffer when DPR changes.
- `GpuSky.surface()` resizes the shared WebGL drawing buffer at changed DPR (width and height assignments), first reached by the Milky Way path in this workload.
- `drawStars()` caches two CPU coverage images but uploads the selected 1 MiB image again into a **single** atlas texture whenever DPR switches. Measured star-stage peaks at switches are consistent with additional work, but exact attribution is not proven.
- Milky Way reprojection reattaches the same raster texture and checks framebuffer completeness on every changed pose, even when the attachment dimensions have not changed. These are candidates for avoiding repeated driver/state work; no per-call trace establishes them as the stall cause.

Constellation drawing is also a substantial steady cost. `drawConstellations()` projects/clips arc samples and allocates geometry/reveal state per draw, including animation-only draws; it also measures figure names. All captured draws requested continuing figure animation, with 451 draws containing no new view request. Short pauses stayed below the 1,000 ms reveal duration, so this alone is not evidence of an idle-loop bug. Geometry preparation/caching is a subsequent optimization candidate. Shared commit and post-enqueue wait are not the measured leading costs in this run; this does not exclude all other UI/input work.

## Recommended bounded next step (subsequently approved)

**B-004: stabilize motion resolution and reuse GPU resources.**

1. Hold moving resolution through the observed short pauses and restore full sharpness after a longer stable interval; preserve jitter/single-jump rejection, coordinate/overlay alignment, low-DPR behavior and full resting quality. Choose/verify hysteresis from this evidence; do not promise a transition count from source requests alone, since the report intentionally contains no view angles.
2. Reuse atlas GPU textures/resources across DPR changes and remove redundant framebuffer attachment/status work where the state can be retained safely. Keep resource pools bounded and preserve cleanup, context recovery, source orientation, magnitude coverage, Canvas fallback and one SkyFrames queue.
3. Compare the same ordinary-app report metrics: DPR switch count, transition/renewed-motion peaks, command/cadence tails and manual responsiveness. Keep all layers enabled and recheck the existing geometry/gestures/sensor-publication regressions. Cloud software GPU checks can validate behavior, not the phone benefit.

The exact driver mechanism and physical improvement require a controlled implementation/comparison. Do not silently lower permanent quality, replace the whole renderer, change sensor fusion or begin a constellation migration under this proposal. The user subsequently approved this batch with “Kör”; implementation and verification are recorded in [GPU rendering](GPU_RENDERING.md#approved-motionresource-follow-up-2026-11-04). No subsequent development batch is approved. If the transition fix leaves significant steady cost, constellation geometry caching is the next candidate to discuss separately.

## Follow-up after implementation — clean `0246034e081a`

The second user file was received after the 800 ms/two-atlas/framebuffer-check step. [Derived results](measurements/phone-performance-followup-2026-11-04.json) preserve its SHA-256 and summaries without republishing the trace, exact viewport or creation timestamp.

| Ordinary-phone measure | Before `99e1b2a91e4e` | After `0246034e081a` |
| --- | ---: | ---: |
| Draws / capture duration | 1,200 / 20.29 s | 1,200 / 16.82 s |
| DPR switches | 37 | 1 |
| Command draw median / p95 | 9.7 / 20.8 ms | 5.9 / 8.7 ms |
| Latest accepted input → command end median / p95 | 13.5 / 23.4 ms | 7.2 / 10.3 ms |
| Active cadence median / p95 | 16.4 / 25.0 ms | 12.9 / 23.6 ms |
| Active intervals >25 ms | 59/1,199 (4.92%) | 28/1,199 (2.34%) |
| Draws >25 ms | 25 | 1 |
| Largest draw / interval | 71.0 / 77.6 ms | 82.4 / 90.3 ms |

GPU is selected for all 1,200 draws, with no recorded errors/fallbacks and two copies each. All five layers and All88 are enabled; the viewport matches the earlier capture, zoom remains 1× and stars/Milky Way are marked visible. There are 938 manual requests on 938 draws, no zoom/phone publications, and following is false throughout. These are different gesture recordings (earlier 750 requests across 749 draws); scene/time/visibility intensity are not proven identical. The comparison is promising measured evidence, not a controlled causal estimate or a user statement of improved feel.

The first draw uses DPR 2; the second switches to 1.5 and remains there for the rest of the capture. That switch is the only draw above 25 ms: **82.4 ms** (Milky Way 52.8, stars 17.1), followed by a 90.3 ms start-to-start interval. Initial buffer/atlas work remains a candidate, not per-call evidence. The largest stall has therefore not improved. The other 27 intervals above 25 ms follow synchronous draws between 3.7 and 8.7 ms: other browser scheduling/input/compositing/deferred work can contribute outside measured draw submission. Do not attribute those intervals solely to their own or preceding figure cost.

Stable-DPR manual draws, excluding the switch: 936, median/p95/max **5.8/8.7/14.6 ms** (earlier 711: 11.9/19.5/27.6). Milky Way median/p95 **0.2/0.3 ms**; figures **3.3/5.2 ms**. Figures remain the largest normal CPU layer and a later geometry-cache candidate, but no new optimization is approved. All captured draws request continuing animation; the longest no-input run is 27 draws spanning about 365 ms, below the reveal duration. Neither an idle-loop bug nor full-DPR restoration can be inferred from this trace. B-004 stays open pending subjective feedback/remaining issues; B-001 stays paused.

## Newly reported interactions — clarified, awaiting implementation approval

- **B-006 — sky surface gains a border during swiping.** Static source candidate: `HorizonView` focuses its tabbable root after crossing the 8 px drag threshold; `.horizon-view:focus-visible` gives a 2 px light-blue inset outline. The user has now confirmed a thin light frame, matching the focus-outline candidate rather than a missing-sky gap. This is still not a browser reproduction of the exact interaction. No browser reproduction or app fix has been performed. A future fix must preserve visible keyboard focus and arrow-key control.
- **B-007 — phone following/compass often needs a second activation.** New startup/lifecycle issue recorded separately from paused B-001 drift. The performance capture contains no following or sensor data and cannot diagnose this. Read-only review: permission/generation cancellation, hidden-page stop, 8 s no-usable-data timeout, first stable compass reference (≥800 ms stable fresh paired data), startup status and double activation need distinguishing. None is established as the reported cause. The user clarified that opening the top-right Manual chip again and choosing Follow phone makes it work. The screenshot shows Manual, the bottom Follow action and “Phone direction is unavailable. Manual control works.” Thus following is inactive at capture. This generic banner covers denied/unavailable/missing states and does not identify which occurred; it is not evidence of an active uncertainty/calibration hold. Investigate the failed first session and subsequent fresh start, not just compass alignment. Do not loosen reference guards or resume drift investigation as part of this issue.

Recommended next bounded batch: **B-006 + B-007, Sol High** — clarify/reproduce the frame and first-start path, preserve keyboard focus, permissions/Stop/visibility and existing sensor reference mathematics, then fix only supported causes. The user subsequently approved B-006/B-007 together with the recommended B-004 figure/text cache. See [implemented scope and verification](FIGURE_CACHE_AND_STARTUP.md). First-resize-stall work remains separate, and no following batch is approved.

## Third ordinary-app phone capture — clean `21637c3e2472`

[Derived summaries](measurements/figure-cache-phone-followup-2026-11-04.json) summarize the performance and separate direction attachments without republishing the traces, angles, exact viewport or creation timestamps. User feedback explicitly says more optimization is needed; B-004 remains open despite better measured submission/cadence values.

| Measure | Before figure cache `0246034` | After figure cache `21637c3` |
| --- | ---: | ---: |
| Draw count / capture duration | 1,200 / 16.82 s | 1,200 / 14.95 s |
| Draw median / p95 | 5.9 / 8.7 ms | 4.6 / 7.3 ms |
| Latest input → command end median / p95 | 7.2 / 10.3 ms | 6.4 / 8.9 ms |
| Active cadence median / p95 | 12.9 / 23.6 ms | 10.6 / 17.3 ms |
| Active intervals >25 ms | 28/1,199 | 5/1,199 |
| Figure phase median / p95 | 3.3 / 5.1 ms | 2.2 / 3.7 ms |
| Largest draw / interval | 82.4 / 90.3 ms | 58.4 / 64.5 ms |

All 1,200 draws selected GPU with no recorded errors, all five layers/All88, 1× zoom and one initial DPR 2→1.5 transition. There are 869 manual requests on 869 draws, no zoom or phone publications, and following=false. The recording is **night preview**, whereas the preceding capture was Live; same viewport/layer flags do not prove identical sky brightness or input speed. These are observed differences, not a controlled causal estimate or presented FPS.

Manual draws median/p95 are 5.2/7.5 ms; their figure phase is 2.6/3.9 ms. The 331 animation-only draws have draw median/p95 3.6/4.9 ms and figure median/p95 0.5/0.8 ms, consistent with the intended same-pose cache. Grid median/p95 is 0.9/1.5 ms and boundaries 0.8/1.3 ms. These normal costs remain candidates for reducing work during pans.

The only draw above 25 ms is the initial DPR switch, **58.4 ms**, including **48.9 ms** Milky Way and 0.6 ms stars; the following interval is 64.5 ms. The other four long intervals (25.3–30.1 ms) follow short 3.1–7.0 ms draws. Source review confirms GPU canvas width/height are still changed at DPR transitions, and Milky Way owns the first surface call; this supports testing allocation reuse but does not isolate driver/GPU causation. Small copy submission times cannot rule out deferred transfer/synchronization cost.

The separate version-2 direction report has an active following session, startup phase `receiving`, **zero listener restarts**, 400 retained samples, one initial compass transition and no incidents/current uncertainty. This establishes usable data and a compass-origin reference in that session, not true-north accuracy or success on the first user activation. A successful second manual session would also have zero automatic restarts. The performance capture itself has no sensor publications. B-007 remains open for first-activation confirmation; B-001 drift is not reopened.

### Proposed next bundle — await explicit “Kör”

Recommended model: **Sol High**.

- **B-004:** test bounded reuse of the GPU drawing surface across density changes (active viewport/cropped 1:1 snapshot instead of repeated backing-store resizing), keeping real viewport resize/context cleanup/fallback and star coverage correct. Prepare grid directions once and reduce temporary allocations in line clipping during pans. These are candidates to validate against image/geometry checks and the ordinary device report, not promised gains. No broad all-GPU rewrite or permanent quality reduction is implied.
- **B-007 (added user preference):** retry the initially silent/unusable orientation subscription at one-second intervals (1 through 7 seconds) until usable data arrives, with a total 8-second deadline and a clear no-data/diagnostics state thereafter. Stop/hidden page/error or first usable direction cancels retries; never repeat permission requests or reset north references. Relative data without a compass reference follows the existing hold-still/alignment path rather than repeatedly restarting it. Published behavior is still one listener restart at 3 seconds; this requested replacement awaits “Kör”.
- **F-021:** automatically choose the existing darkest-local-night preview on page startup as a **temporary testing default**, clearly labeled, using the chosen location and existing seasonal/polar rules. Preserve accessible Now and fixed observation links/settings; no automatic GPS/sensors. This user instruction supersedes the earlier no-auto-preview choice for the testing default. Polar day cannot be made physically dark by choosing a time; retain the existing explanation.
- **F-022:** a genuine one-finger drag takes over from phone following at the existing 8 px movement threshold, cancels pending sensor publication and applies the same gesture immediately from the current view. Taps and ordinary panel/search openings keep following. Pinch remains zoom and should not stop following merely because it has two pointers. Preserve marker-origin drag/tap suppression and do not let a queued phone pose overwrite the first manual delta. Current App.manualView rejects changes while phone.active, so the handoff must avoid stale React status in the same event. This supersedes the earlier explicit-Stop-only policy for drag takeover.

These requested behavior changes are recorded preferences/specifications. The standing user workflow still requires a model recommendation and explicit start approval; no new app code is changed in this analysis.

The user subsequently approved this whole proposal with “Kör”, including the added B-007 one-second retry preference. [Current implementation and checks](SURFACE_REUSE_AND_TEST_DEFAULTS.md) record the final software policy, prepared grid/scalar clipping, temporary night startup and same-gesture takeover. This analysis is historical proposal context; further batches are not approved.
