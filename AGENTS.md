> **Global agent rules:** follow https://raw.githubusercontent.com/BadBagel47/agent-rules/main/AGENTS.md (read at the start of every session; this repo is adapted to v1.6).
> **Handoff:** [HANDOFF.md](HANDOFF.md) (state, decisions, publishing, documentation map). **Backlog:** [BACKLOG.md](BACKLOG.md) (incl. "Proposed runs").
> Below are the **project rules** for this repo only. The full earlier rule text (2026-10-29 → 2026-11-12) is in git history before the v1.6 adaptation commit and summarised in [docs/HANDOFF_LOG.md](docs/HANDOFF_LOG.md).

# Noxari — project rules

## Product and honesty
- Noxari is a partly calculated planetarium prototype, not a complete planetarium. Never present demo values or illustrations as calculations, and never imply that a marker, forecast or suggestion guarantees that something is visible. Keep visible caveats (approximate times, thresholds, “calculated position”, “long exposure”, “≈” sizes, demo altitude curves for Orion/Ursa Major).
- Every function should be as simple to use as possible (F-012). Mobile first, dark sky first.
- The landscape silhouette is decorative and identical everywhere; never treat it as terrain or use it in observing constraints.

## Data, sources and licences
- Prefer open data with verified licences; keep every credit and licence link under More → About & sources and in `public/licenses/`. Current sources: HYG v4.1 (CC BY-SA 4.0), OpenNGC (CC BY-SA 4.0), Stellarium modern sky culture lines (CC BY-SA 4.0) and illustrations (Free Art License 1.3), IAU boundaries, ESO/S. Brunier Milky Way (CC BY 4.0), Wikimedia Commons photos (per-file licence), Open-Meteo (CC BY 4.0), CelesTrak (ISS + “visual” satellite group), Wikipedia summaries (CC BY-SA 4.0, fetched on “More”), satellite.js, Astronomy Engine.
- Generated data is reproducible from pinned sources with checksums (`scripts/generate_*`, `src/generated/README.md`, `data/README.md`). Do not change source pins or regenerate catalogue records without the user's approval; never delete an object only because a source omits it; keep the M24/M40/M73/M102 notes. `npm run catalogs:check` is read-only.
- HYG bright subset: exactly 8,920 stars to V 6.5 + 2 constellation endpoints (8,922). Binocular stars (V 6.5–8.5) load on demand and are not precached. Keep dim stars dimmer (monotonic `stellarBrightness`).
- Object photos only with a free licence (PD, CC0, CC BY, CC BY-SA, no extra restrictions), visible creator/source/licence, reviewed visually; share previews use public-domain JPEGs only. Candidate objects stay separate and labelled; dwarf planets/Vesta keep their orbit caveats.
- Privacy: the place stays on the device. Only an object/article name, catalogue requests without parameters (CelesTrak), or a place rounded to 0.1° after explicit consent (cloud forecast), may be sent to third parties; no tracking or analytics. Keep the privacy text in About accurate when adding network calls.

## Calculations and observing rules
- Planet markers from civil twilight (Sun < 0°), deep-sky from Sun < −6°; bright daytime planets only by the F-002 heuristic and labelled as calculated. Tonight suggestions: altitude ≥ 10° (diffuse ≥ 15°), planets ≥ 15° from the Sun, future slots only, reasons and thresholds visible. Charts follow sunset/sunrise ±30 min with ≤ 10-min samples; polar nights use noon to noon.
- Guided Finder centring is ≤ 3° and never true below the horizon. Below-horizon views are labelled simulations and never change observing constraints.
- IAU boundaries use the 781 B1875 edges converted via Astronomy Engine; cache by time/place, never recompute on phone movement.

## Rendering and interaction
- One shared `SkyFrames` scheduler draws everything; never add a separate drawing, animation or sensor-publication RAF. Camera moves (Show in sky, tours, demo, time glides) use `SkyFrames.setMotion`; never call `setMotion` from inside a motion step; tours read the latest view/time/place from refs. Respect reduced motion. Live satellites may only request frames from the scheduler with a plain timer (≈4/s, 1/s with reduced motion) while dots are shown.
- Keep the GPU path with Canvas fallback (software renderers use Canvas) and matching output in both; keep the shader colour ramp in sync with `src/starColor.ts`.
- Perspective is 90° on the longer axis at 1×; zoom 1–3× (map 1–2.5×) is a local projection scale shared by all layers. Marker taps vs drags: 8 px threshold; a pan never selects; known objects win tap priority (`src/starPick.ts`).
- Retest mobile panning after rendering changes and report measurements honestly (software-renderer numbers are not phone results).

## Phone sensors (B-001 parked)
- Sensors and GPS are opt-in, need HTTPS and a user gesture. Do not resume direction-drift investigation or change sensor logic without explicit approval. Preserve the Android/Brave relative-sensor model, reference guards, guarded automatic recovery, listener cleanup, startup retries and the bounded local direction report. Simulated browser sensors are never physical evidence. Browser tests must stream simulated orientation rather than rely on one event.

## Deployment
- Push to `main` publishes via GitHub Actions to https://noxari.trythis.one/ (root base path; `NOXARI_BASE_PATH=/` in CI, `/noxari/` locally). Keep `?object=` deep links, read-only `?list=` links and localized share previews working. The service worker precaches the app shell (not star files or object photos).
