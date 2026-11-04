# B-004: controlled ordinary-app surface comparison

## Phone workflow

Open **More → Performance report → Start controlled comparison** (Swedish: **Mer → Prestandarapport → Starta kontrollerad jämförelse**). Stop phone following and any ordinary recording first; wait for any GPS/sky loading. Requires the horizon's GPU renderer. The panel closes; leave the screen untouched until the completion notice, then **View report → Save comparison report**. Attach `noxari-surface-comparison.json` in chat. Usually about 20–40 seconds, bounded at 60 seconds; slower devices can return an interrupted report. No permissions are requested, uploads performed or data persisted.

This is a diagnostic comparison. B-004 remains open until phone evidence supports a next change. The ordinary renderer's automatic policy is unchanged. B-001 drift stays paused.

## Controlled work

- Four passes: exact, retained, retained, exact (ABBA). Exact uses the active DPR size; retained keeps maximum requested DPR capacity for the current CSS viewport, with the existing active viewport/scissor and cropped 1:1 copies.
- Dispose/recreate GPU resources on the same WebGL context before each pass. Reset comparison-only density, figure reveal and drawing caches. Warm 84 frames (moving density then full density); exclude these from measured samples. CPU grid/driver/browser caches are shared; warmup and paired order reduce but do not eliminate bias.
- 240 measured frames/pass, driven by the existing shared `SkyFrames` callback. Warmup plus measured work totals 1,296 frames. No additional RAF, GPU synchronization, readback or timing query.
- A frame-indexed 60 Hz simulation clock drives the identical pose, density hysteresis and reveal path regardless of real callback cadence. The path pans 30° while looking from 31° to −19°, holds, returns and holds, exercising DPR changes and the simulated lower sky. Each 60-frame segment lasts one **simulation** second; actual time varies with callback cadence.
- Freeze the current observation time, location and display layers. Force local comparison zoom 1× while preserving the user's normal zoom. Preserve selected object/Finder and require scene identity to remain unchanged. Report source time-mode enum but never the actual observation time, coordinates, directions or object IDs.
- Restore original view, zoom, time mode and automatic surface policy after completion/cancellation. Originally live time resumes at current Now, not the old frozen instant.
- Reject overlap with ordinary recording, following or pending sensor/GPS startup. Cancel on scene/viewport/native DPR changes, GPU failure, drawing error, manual stop, sky interaction, hidden page, unmount or watchdog expiry. Partial results are explicitly invalid for a complete comparison.

## Timing and privacy

Each measured pass embeds a separate version-2 `sky-performance` report. Its ordinary report remains untouched. There are four bounded 240-sample logs, never a background history. Status publishes only at pass/phase changes, not every frame.

New fields distinguish RAF request→callback entry (`rafWaitMs`), callback entry minus RAF timestamp (`callbackAgeMs`), callback preparation (`callbackToFrameStartMs`), callback entry→synchronous command completion (`callbackToDrawEndMs`), and sample-collection overhead after command completion (`bookkeepingMs`). First-frame RAF wait may be unavailable when a recording starts after its request. Existing queue latency/draw/stage/copy/cadence fields retain their measurement boundaries. Scripted requests use a distinct `scripted-view` input source and must not be interpreted as physical touch latency.

These are synchronous CPU/submission times. They do **not** measure GPU completion, composition, physical input arrival, presented FPS or perceived smoothness. RAF age is a browser scheduling indication, not screen latency. Collection/phase-boundary work and thermal/refresh/browser variation remain limitations. No automatic winner is selected. Compare matching motion/density segments and both repetitions on the same phone before recommending a new policy.

Exports use an explicit safe field list; private scene identity is retained only in memory while active. Build ID, safe display configuration, policy order, cancellation reason and measured times are included. There is no network request or raw sensor data. Inactive diagnostics perform no collector clock reads, samples or timers.

## Verification

`npm test` includes deterministic path/order, warmup exclusion, equal sample counts, bounded timer cleanup, privacy, scheduling metrics and the single shared-frame commit. Optional `scripts/verify_surface_comparison.mjs` verifies the production UI, real GPU source sizes/crops, restoration/idle, interruption and EN/SV export. Cloud software GPU timing is not physical-phone performance evidence.

Local verification on 2026-11-04: **175 offline tests**, complete main/lab build, existing ordinary-performance production-browser suite and controlled-comparison suite pass. The latter completes four 240-frame passes in mobile 390×844/DPR2, confirms retained and exact source dimensions with correct device-pixel crops, one shared WebGL context, no GPS/sensor permission calls, view/time restoration and idle, and invalidates interrupted touch/resize/hidden/GPU/Stop runs. EN/SV exports and switching back to ordinary capture are checked. Screenshot inspected for readable mobile actions. No physical-device smoothness or accuracy conclusion is made.
