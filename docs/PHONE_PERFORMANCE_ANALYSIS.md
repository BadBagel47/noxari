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
