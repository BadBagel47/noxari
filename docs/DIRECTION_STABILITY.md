# Direction stability and recalibration

**2026-10-31 status: B-001 — paused by the user.** Prioritize the remaining functionality in [BACKLOG.md](../BACKLOG.md). Keep the deployed sensor implementation and the evidence below. Physical automatic-recovery validation and long-term pointing accuracy remain incomplete; this is not a resolved-bug declaration. Resume investigation only after an explicit user decision.

The user approved this bounded stability fix after reporting over 100° of yaw error after figure-eight movements while Google Maps returned a stable direction. A subsequent Android/Brave report captures an already uncertain session; startup and the onset of the original error remain unrecorded. This implementation guards the reproduced failure paths and exposes a local report for physical validation. It does not establish instrument accuracy or claim that every browser exposes an independent compass.

**Physical feedback after deployment (2026-10-30):** the user reports that the error still occurs and reloading the page restores correct direction. The reported physical problem is therefore unresolved. The subsequent report and screenshots confirm Check north and a large disagreement; see the measured evidence below. Reload resets the app tracker and sensor subscription; this observation alone cannot distinguish an app-reference problem from browser sensor state. The checks below require comparable stable streams and do not detect or correct every form of drift.

## Physical report analysis, 2026-10-30

- The user supplied a local report and two Android/Brave screenshots. Screenshots show **Check north**, held following and 56.6° heading disagreement. The report contains 400 retained samples over 11.833 seconds: 198 regular relative events and 202 absolute events. All 400 already have `uncertain / disagreement`; the transition into uncertainty and the initial north anchor are outside the retained window.
- Both streams are fresh in the retained data: diagnostic motion age is at most 67.4 ms and compass age at most 17.3 ms. The nearest retained absolute sample to each retained relative sample is within 33.1 ms. This window does not show a missing or stale stream as the explanation. Raw flags remain false for regular events and true for absolute events throughout this window.
- The app offset reconstructed as candidate heading minus raw back-screen heading is constant at −17.889473°. The discrepancy is therefore not an app offset progressively changing during this captured interval. The relative stream plus that fixed offset disagrees with the absolute reference by 49.56–57.11° (median 56.11°).
- An early matched pair gives raw relative back-screen heading 164.17°, candidate app heading 146.28° and absolute heading 90.17°, a 56.11° disagreement. A late pair gives candidate 144.50° and absolute 92.09°, a 52.41° disagreement. Candidate directions in the report are internal values; the hook holds the displayed sky once uncertain.
- `compassReady` is true in 150 of the 400 retained checks and false at download. The user has been asked to hold still, choose **Use compass reference**, then **Resume following**, and verify real alignment without reloading. This checks the existing explicit recovery against the correct physical direction.
- These observations confirm that the warning/hold path has run on the physical device. They do not establish which sensor agrees with true north, what changed at onset, or whether the two underlying OS estimates are independent. The earlier figure-eight/Maps/reload observations remain useful context, not a simultaneous ground-truth heading in this report. No automatic recovery or alternative sensor fusion is implemented by this analysis; a new development strategy requires the user's approval.

Only aggregate measurements are stored here; the user's full sensor report and screenshots are not committed to the repository.

### Follow-up: explicit recovery confirmed

The user supplied a second report and confirmed that **Use compass reference → Resume following** jumps back to the correct real direction without reloading. This physically validates the existing explicit recovery in this trial; a sensor subscription restart was not required. It supports loss of agreement between the retained relative reference and the usable current compass as the next correction target, while the original onset mechanism remains unrecorded.

The second report contains 400 retained events over 13.649 seconds (200 regular, 200 absolute). It starts about 1.74 seconds after the new reference and ends about 15.39 seconds after it. All retained checks have no uncertainty reason: 250 consistent, 150 checking. The download snapshot is consistent, with 2.8° disagreement and a ready compass. Retained signed differences range from −0.30° to 6.17°, median 2.80°. The reconstructed app offset is constant at +55.60°. These are sensor agreement measurements, not measured true-north accuracy or proof of stability over longer movement sequences. The reanchor action itself is outside the retained sample window; the user's observation supplies its physical result.

The user subsequently approved the following development with **Kör**, and it is implemented below: guarded automatic reanchoring for compass-origin sessions after a large sustained disagreement and fresh stable stationary data. Keep relative motion during turns, preserve manually aligned true north, expose any correction clearly, and retain uncertainty/manual recovery when data cannot support a correction. Record the warning/reanchor transition so future reports retain the onset instead of only the final rolling window. Continuous small compass corrections are not proposed. The current guards, transition behavior and regression cases are described below. Physical validation of automatic recovery is still required.

## Reference lifecycle

- Regular `deviceorientation` drives relative motion when available. Absolute readings continue to be collected; they do not continuously move the displayed heading toward the compass.
- Automatic north anchoring requires fresh, stationary data. Motion and compass sample timestamps must be within 150 ms, each at most 500 ms old, with compatible tilt (within 8°, both below 75° absolute pitch). Both histories must span at least 800 ms, with heading and pitch within 3° of their latest value over the trailing 1,200 ms.
- A compass-only fallback also waits for a stable history, but is labeled as having no independent comparison. Earth-referenced motion compared with the same event's own angles is likewise not described as an independent check. iOS's separate webkit compass value can provide a comparison when valid.
- Browser event timestamps are normalized from monotonic or epoch time. Out-of-order motion samples are rejected. Equal rounded timestamps keep the latest pose without manufacturing a longer stability history.
- Manual **Align north** remains available with a fresh usable pose. It means the phone's back points toward known true geographic north. If a fresh stationary compass pair exists, its bias relative to this manual reference is retained, so magnetic/true-north differences do not silently override the user's alignment. Without such a pair the reference is explicitly manual-only/uncompared.

## Detecting uncertainty

Once anchored, a heading disagreement of at least 20° must persist for 1,500 ms with stationary motion/compass histories and fresh comparable samples. Recent evidence can bridge gaps in a slow compass stream for at most 1,500 ms; movement, unstable compass values or expired evidence cancel the candidate. This threshold catches large persistent discrepancies, not the Moon's angular diameter or sub-degree pointing accuracy.

A same-event change of the raw `absolute` flag accompanied by a heading change over 30° invalidates the reference when both poses have usable nonvertical heading. A flag/compass-availability change without such a raw jump preserves the previously supported cases. A late handoff from an already anchored compass-only stream to a new regular motion frame preserves the last candidate heading but requires an explicitly checked new reference.

These are uncertainty checks, not a claim to distinguish a sensor reset from every real rapid motion. Compass comparison is withheld for near-vertical poses. A relative reset with no trustworthy independent reference may remain undetectable; the UI must show that compass comparison is unavailable. Absolute-only browser corrections remain a device limitation.

## Guarded automatic recovery — approved implementation

This extends the previous warning/explicit-recovery behavior after the user confirmed that explicit compass reanchoring restored real direction without reloading.

- Relative readings continue to drive motion. Automatic recovery requires a previously established **compass** reference, a separate usable reference check, fresh compatible paired readings, and the same stationary histories as startup.
- At least 20° disagreement must persist for 1,500 ms after those stable comparisons become available. With normal high-rate streams this typically takes around 2.7 seconds after a large turn ends (history settling plus persistence); sparse/unstable readings may take longer. A movement or expired evidence resets the candidate as before.
- An eligible `disagreement` first records uncertainty, then sets the north offset to the current paired compass direction in one operation. It is a discrete correction, shown on the sky for six seconds and counted with the last correction angle in Phone direction. Small compass settling below 20° never adjusts the relative offset.
- There must be at least **10 seconds between automatic corrections**. Another sustained mismatch during that interval holds the sky with Check north; automatic recovery waits for both expiry and valid stable evidence. Explicit compass/manual recovery remains available.
- Manual north references are never automatically overwritten, including a manual reference made after an earlier automatic correction. Source/frame-change uncertainties still require explicit recovery. Compass-only/self-compared streams, incompatible/near-vertical poses, stale data and invalid compass quality cannot drive automatic recovery. Nonfinite webkit compass/accuracy values are rejected along with negative or greater-than-25° reported accuracy.
- B-005 supersedes panel pausing: automatic recovery applies during active following even with an open panel. Search, selection and panels preserve following; map return applies the latest fresh pose. Manual view control requires Stop. Stop/hidden-page/timeout behavior is preserved.
- Diagnostics are read-only; reanchoring is performed only while processing received sensor data. Every initial anchor, manual reference, disagreement candidate, uncertainty and automatic recovery has a timestamped transition with before/after offsets/headings and the comparable difference. The correction count and age are diagnostic state, not accuracy estimates.

Stability of a compass estimate does not establish its true-north accuracy. Automatic recovery follows the available compass, which can be magnetic or affected by its surroundings. It targets the demonstrated loss of agreement; the OS mechanism behind the original drift and long-term physical performance remain unconfirmed.

## Recovery and UI

When uncertainty cannot be automatically recovered under the guards above, the sky stops publishing sensor changes, a **Check north / Kalibrera** indicator appears and the sensor session keeps receiving data. Eligible compass-based disagreement instead gets a single automatic correction with a visible notice. Manual sky controls remain available.

Under **More → Phone direction**, hold the phone upright and still, then:

1. **Use compass reference / Använd kompassreferens** explicitly reanchors from fresh stable readings when the button is enabled. A compass may use magnetic north; its real precision is unknown.
2. **Align north / Rikta mot norr** sets a manual reference while pointing toward known true north.
3. After explicit reference recovery, active following continues automatically. Opening/closing a panel keeps the same session and following intent (B-005).

The panel's Direction check shows reference origin, motion source and comparable yaw difference. It distinguishes unchecked/manual-only, compass-only, checking, agreement and uncertain states. Agreement only means that no large disagreement was detected. It is not measured accuracy. Motion data older than 500 ms pause publication with Waiting; an eight-second loss of usable primary readings ends the session even if a secondary compass stream continues. End/Stop and a hidden page also release the session; app switching requires a fresh session on return.

## Local direction report

The report button downloads `noxari-direction.json` with `reportVersion: 2`. It contains current diagnostic state, following/view-enabled flags and:

- The latest 400 sampled sensor events, ordinarily throttled to at most one per source per 50 ms (about ten seconds for two 20 Hz streams). An event that causes a transition is always sampled, even inside that throttle interval.
- The latest 32 transitions: initial compass anchor, manual north, explicit compass reference, disagreement candidate, uncertainty and automatic reanchor. Metadata includes the reference origin, reason, timestamps, before/after headings and offsets, comparable disagreement and signed correction. Explicit button actions are logged even when no sensor event is occurring at that instant.
- The latest three frozen incident windows around uncertainty or automatic recovery, each containing up to 200 preceding sampled readings and 100 following readings, plus up to 32 associated transitions. A warning and recovery in the same update share one window. Later rolling readings do not overwrite those windows. A cooldown-delayed correction can have its own window.

Fields include receipt/sample times, raw event/reference flags, alpha/beta/gamma, compass fields when supplied, candidate direction, check results and following/view-enabled flags. Candidate directions are not a claim that an uncertain or paused sky moved. The report contains no GPS position or observation settings and is not sent to a server. A stopped session's readings remain available until reload or a new session; the UI labels them as the last check. All arrays have fixed limits; full session recordings are not retained.

The browser may omit the compass or its accuracy. Webkit compass readings with negative accuracy or reported accuracy above 25° are not accepted as an automatic reference. The report is also available when incoming readings are unusable.

For physical validation: obtain a stable initial reference, note the direction toward a known landmark, make the previously troublesome movement, return to the same pose and hold still. Capture the warning/reference status and download a report promptly if the direction is wrong, before restarting the session. Google Maps comparison is useful but app switching hides Noxari and stops its session; record whether the next comparison follows a restart.

## Verification and scope

- 98 offline tests pass, including 26 direction tests and two report-history tests. Cases cover stale 120° startup pairing, both stream arrival orders, arbitrary relative origins, persistent 120° drift, explicit recovery, same-event frame changes, manual magnetic bias, iOS late compass availability, large legitimate movement, small compass settling, rounded timestamps, slow compass streams, stale/inaccurate readings, near-vertical poses and compass-only fallback. New cases cover automatic 120° and report-sized 56° recovery, subsequent relative motion with no small settling pull, the ten-second cooldown, no automatic changes to manual/vertical/compass-only sessions, invalid compass quality and retained incident windows after delayed download.
- Production-build Chromium checks at 390×844, 1280×800 and 568×320 cover automatic 120° recovery, a subsequent relative turn with 15° compass settling and no retreat, another correction behind a paused panel, held manual-north uncertainty, explicit fallback and delayed report download with frozen warning/correction data older than the rolling window. Screenshots were reviewed. The previous frame-change/startup checks are also covered by offline regressions. A separate mobile browser check confirms that loss of the primary motion stream pauses publication and ends the session despite continuing compass events. Existing workspace tests passed again at five sizes plus reduced-height conditions, and delayed permission cancellation remains intact.
- Automatic-recovery sensors were simulated. The user confirmed the previous explicit recovery on physical Android/Brave, but confirmation of automatic recovery on that device is still required. The particular OS mechanism behind the original failure is not proven by the synthetic regressions.
- Moon-based calibration, daylight/night-preview controls and the lower-sky daylight rendering fix are separate proposals and are not implemented in this step. Celestial positions, time/place and marker rendering rules are unchanged.
