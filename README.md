# Noxari — React + TypeScript prototype

A mobile-first planetarium prototype with a full-viewport calculated sky, swipeable eye-level and all-sky views, foreground panels, object positions and altitude curves.

For a new chat or project handover, read [HANDOVER.md](HANDOVER.md) together with [AGENTS.md](AGENTS.md). The handover is maintained as work and plans change and records the user's model-recommendation and approval workflow.

## Start locally

Requires Node.js 20.19+ or 22.12+ and npm.

```bash
npm ci
npm run dev
```

Open the local address printed by Vite (normally http://localhost:5173). For a production build:

```bash
npm run build
npm test
npm run preview
```

To test on a phone on the same Wi-Fi network, use the `Network` URL printed by Vite (your firewall may need to allow it).

## Included

- **Workspace** — a persistent sky filling the available browser viewport, with Search, Tonight, Follow/Resume and More quick actions. Mobile uses a bottom dock and bottom sheets; desktop/landscape uses a side rail and side sheets. Exactly one sheet opens at a time, with its own scrolling, focus containment and Escape/close support. Time/location and sensor status stay visible. Compact object selection offers Guide, Details and Save. More contains Saved, Sky display, Time & location, Phone direction, Settings and About & sources. Native fullscreen is optional where supported.
- **Look around** — the default eye-level perspective (90° on the longer viewport axis) of 4,105 HYG stars to magnitude 5.8 plus five fainter constellation endpoints, with proper motion from epoch J2000. Drag or swipe to turn a full 360° and look up, use the arrow keys, or open manual direction buttons under More → Sky display. Manual control is available; Follow enables orientation sensors after a user gesture and permission where required. An absolute compass reference is used when available; otherwise the user must point toward true north and align before following starts. Dragging returns to manual control. The flat ground and level line mark the geometric horizon, not the local landscape.
- **Constellations** — optional schematic line figures for all 88 modern constellations, with independent Latin-name labels. Lines follow their stars and clip at the horizon. These figures are drawing conventions, not the official IAU area boundaries.
- **Sky map** — a switchable zenith-centered, azimuthal equidistant projection of the same stars. Its outer circle is the geometric horizon; north is up. Both views share calculated above-horizon positions for catalog objects, the Moon, all seven other planets (Mercury through Neptune), and the Sun. Stars fade in daylight. Planet markers appear when the geometric Sun is below 0°; deep-sky markers require the Sun below −6°. The Sun and Moon remain available. Markers indicate calculated positions rather than guaranteed naked-eye visibility; Uranus and Neptune have optical-equipment guidance.
- **Observation controls** — Time & location opens from the top status chip or More. The default Now mode advances every 30 seconds and refreshes on return to the page. Manually changing the date/time enters a clearly labeled Selected time mode; Now returns to the live clock. Selected date/time and preset or manual latitude/longitude with an IANA timezone. Use my location requests a single browser geolocation fix and shows reported accuracy. It uses the device timezone, which can be changed manually; coordinates do not determine the timezone automatically. Times and night curves use the selected observation timezone, including daylight saving changes; coordinates are stored locally in the browser.
- **Tonight** — suggested objects ranked by an explicit altitude/darkness/moonlight heuristic, with approximate best times and contiguous favorable intervals after the selected time. Equipment filters the recommendations. Targets outside the criteria have explanations; constellation demo curves are excluded. The chart window follows standard sunset/sunrise with 30-minute margins, with noon-to-noon fallbacks for polar/partial nights. Shading distinguishes astronomical, nautical and civil twilight. All cards share the same night window.
- **Explore** — search by English/Swedish name, object ID or constellation; category filters and a zodiac constellation name reference.
- **Saved** — bookmarked objects, persisted in localStorage.
- **Object details** — descriptions, catalog information, altitude/azimuth at the selected time and an enlarged visibility chart. Solar-system objects also show geocentric distance, modeled visual magnitude, illuminated disk fraction, angular separation from the Sun and constellation for that time.
- **Sharing** — URL query links such as `?object=m31` (works when deployed; uses Web Share API or clipboard where supported).
- **Guided Finder** — select a calculated object and choose Guide from its compact card, or Guided Finder in its details, to open an overlay on Look around. Turn/tilt offsets and an arrow guide toward the target; a ring marks its calculated position and a center reticle turns green within 3° of the view direction. Phone-following and north calibration remain opt-in. Drag and keys are manual fallbacks; Center manual view is in the target’s Details or Sky display panel. The compact target HUD keeps the center clear. Below-horizon targets are never marked centered and show an approximate next geometric rise when found in the next 48 hours. Whole-constellation demo cards have no unique target and cannot start guidance.
- **Language** — EN/SV toggle; Swedish object names and selected UI copy.

## Important scientific limitations

**The sky views show calculated directions, but are not navigation instruments.** The eye-level view uses a rectilinear field of view capped at 90° on the longer viewport axis and a generic level horizon. Star brightness and daylight fading are stylized. Both projections omit atmospheric refraction, terrain and light pollution. The star subset contains 4,105 stars to magnitude 5.8 and five fainter line endpoints (to magnitude 6.65). It applies first-order tangent-plane proper motion to J2000 coordinates, followed by the date/location rotation. This is an approximation for dates near the present, without radial velocity, perspective acceleration or annual parallax. The 88 constellation figures are schematic guides; official IAU boundaries are not drawn. Orion and Ursa Major have no single catalog center, so their altitude curves remain marked as demos.

The Sun, Moon and all seven other planets are calculated with [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT license). [Luxon](https://moment.github.io/luxon/) (MIT license) handles the observation timezone. Selected deep-sky objects use fixed J2000/ICRS centers; Sirius uses its HYG center and proper motion for both the map marker and altitude charts; their current altitude and azimuth are calculated for the chosen coordinates and time. The mini and detail charts sample geometric altitude through the local night. Twilight shading uses the calculated solar altitude: astronomical darkness below −18° and twilight from −18° to −6°. Altitude curves omit atmospheric refraction, terrain, weather, light pollution and horizon obstructions. Standard sunrise/set times include the Sun’s upper limb and normal refraction, so these events differ slightly from the geometric solar-center horizon. Moon phase, height and angular separation influence the planning heuristic. “Highest” marks the highest sampled altitude with the object above the horizon and the Sun below the object’s darkness threshold; it can differ from the suggested time, which also weighs moonlight and excludes past slots. Solar-system distances, phases, Sun separations and constellation assignments refer to Earth’s center. Visual magnitudes are model estimates without atmospheric extinction, weather, equipment or local visibility corrections. Samples are spaced at most 10 minutes apart, so brief observing opportunities and exact optimal times can be missed; suggested times/ranges are explicitly approximate. The marker view accepts any selected time.

The star map uses an adapted subset of [HYG Database v4.1](https://github.com/astronexus/HYG-Database) by Astronexus contributors, under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Its subset removes the Sun, selects stars to magnitude 5.8 plus five fainter constellation endpoints, rounds coordinates for compact delivery, and retains proper motions, HIP IDs and a few bright names. The generated dataset in `src/generated/brightStars.ts` is shared under the same license. Reproduce it with `python3 scripts/generate_bright_stars.py`; the script verifies the pinned source checksum before writing it. Attribution and license links remain accessible through More → About & sources in the app.

Constellation connectivity and Latin names are adapted from the [Stellarium modern skyculture](https://github.com/Stellarium/stellarium/tree/daace2add6a1bf886e8ee1934f51e9c69f818d18/skycultures/modern) by the Stellarium team, under CC BY-SA 4.0. We retain only the HIP line lists and names, and compute label centers from their member stars. No illustrations are embedded. The adapted `src/generated/constellations.ts` remains under the same license. The generator verifies both upstream checksums; see `src/generated/README.md` for provenance.

Catalog center coordinates for M31/NGC 224, M42/NGC 1976, M13/NGC 6205 and M57/NGC 6720 come from [OpenNGC](https://github.com/mattiaverga/OpenNGC) by Mattia Verga (CC BY-SA 4.0). M45 coordinates and the original Sirius catalog reference come from [SIMBAD](https://simbad.cds.unistra.fr/simbad/), operated at CDS, Strasbourg, France. These coordinates are factual catalog values, not embedded catalog imagery. The initial view defaults to Stockholm until a user selects another location. Geolocation is requested only by Use my location; coordinates are stored only in this browser.

The initial release does not embed astronomical photos. Before adding per-object imagery, verify its license and show its source and attribution.

## Phone location and direction

Open the HTTPS site on your phone, tap the top time/location chip and **Use my location**, close the panel, then choose **Follow** in the quick dock. Allow the requested permissions and hold the phone upright with the screen facing you. Use **Now** for the current sky, or keep a selected time to explore another date. Point the back of the phone toward a known **true north** direction and open the sensor-status chip and tap **Align north** if asked, or if the compass drifts. Resume following explicitly after closing/editing a panel. The browser's compass may report magnetic north; magnetic declination is not modeled. Stay away from metal and magnetic cases. Compass accuracy varies by device. The user has confirmed that following and the compass-settling correction work on Android with Brave; broader outdoor alignment and iOS validation remain.

On Android, relative orientation is preferred for movement, with an absolute compass reading used once to establish north. Switching to relative readings preserves the displayed heading. On iOS, the compass offset is also anchored once rather than reapplied on every reading. This avoids compass settling pulling the view back after a turn. Relative orientation can drift over longer sessions; Align north resets the reference. If only absolute readings are available, device-level compass corrections can still affect the view.

The view follows the back-screen direction with a level horizon; screen roll is not rendered. Readings directly upward/downward have no usable heading. Permission denial, unsupported APIs and missing readings leave manual control available. Manual input, map selection or opening a panel pauses following without resetting the active sensor session. The same session continues receiving readings to retain its north reference while the sky stays still. Closing a panel does not resume following automatically; Resume does. The Phone direction panel offers End session to release listeners. Explicit Stop, missing sensor data or hiding the page ends the session; a fresh start may need north alignment again. No location watch, sensor access on load or camera access is used. Browser-level GPS, permission and orientation flows have been checked with simulated inputs; this does not verify real compass accuracy.

## Guided Finder

Open an individual object’s details and choose **Guided Finder**. The app switches to Look around and focuses the persistent sky; it keeps the selected date, time and location, shown in the target header. Enable **Follow** using the quick dock and calibrate north in the Phone direction panel if needed, or turn/tilt the manual view. Starting the finder does not request sensors or location automatically. **Center manual view** (in Details or Sky display) pauses following and points the simulated view at the target; it does not demonstrate physical phone alignment. **Details** opens a panel and pauses following while retaining the guidance target and view direction. Other panels and map selection also retain the target. Escape closes the top panel first; Escape in the sky exits guidance. Exiting guidance returns to the compact object card.

Horizontal turn is the shortest signed azimuth difference; tilt is the altitude difference. Angular distance and the 3° centered test use great-circle separation, so near-zenith targets work even if azimuths differ greatly. Centering means the calculated direction matches the view, not that the object has been visually detected. Compass drift, magnetic north, unrendered screen roll, atmospheric effects and the generic horizon still limit accuracy. A daylight target is explicitly marked as a calculated position. There is no camera overlay.

For a below-horizon target, a 30-minute-step search over the next 48 hours brackets upward geometric altitude crossings and refines the first detected one to approximately one minute. This omits refraction and can miss very brief grazing crossings; no crossing found is reported explicitly. These rise times differ from standard upper-limb/refraction sunrise/set times used to frame the night charts.

## Workspace verification

The fullscreen/panel change was checked in Chromium at 390×844, 1280×800, 844×390 landscape, 320×568 and 568×320 landscape, plus a reduced-height 390×420 viewport for keyboard-like conditions. Browser checks covered persistent canvas identity, no page overflow, object preview/save/deep links, independent panel scrolling/focus, target/ring centering, relative sensor calibration across panel pause/resume, no compass-settling retreat, live clock progression versus fixed time, GPS success/denial/timezone, DST rejection, language changes and native fullscreen enter/exit. A pending permission result cannot unexpectedly restart following after a panel has interrupted it. Sensor inputs were simulated; new physical Android/Brave and iOS checks remain useful.

## Next implementation milestones

1. Extend phone validation to iOS, outdoor alignment and portrait/landscape transitions.
2. Add official constellation boundaries, a deeper star catalog and optional map zoom.
3. Add curated licensed object photos with individual source credits.
4. Add server-rendered Open Graph previews for shared object links and, later, complete observation-list sharing. A live-camera overlay remains lower priority.

## Tonight planning model

The night is assigned within a local noon-to-next-noon interval using calendar arithmetic across DST. Standard sunset and sunrise are searched within that interval. Normal charts begin 30 minutes before sunset and end 30 minutes after sunrise. Before dawn the current night is retained; after the morning window ends, the next evening is selected. If no events occur, the chart uses the full noon-to-noon interval and identifies polar day/night. Single/reversed crossings (including unusual manually paired longitude/timezone combinations) use a labeled partial-night fallback.

`nightContext` computes shared Sun/Moon samples at no more than 10-minute spacing. Bright planets and the Moon require Sun below −1°, stars below −6°, diffuse targets and Uranus/Neptune below −12°. Recommendations require altitude ≥10° (≥15° for galaxies, nebulae and clusters); planets also require Sun separation ≥15°. Equipment is a minimum-class filter, not an aperture or sensitivity simulation. These are conservative planning choices, not visibility guarantees or safe-pointing instructions.

For diffuse objects, score = `0.65 × sin(altitude) + 0.35 × darkness − 0.4 × moonPenalty`, where darkness increases linearly from 0 at solar altitude −6° to 1 at −18°. Moon penalty is illuminated fraction × positive sine of Moon altitude × `(0.25 + 0.75 × (1 − targetMoonSeparation/180))`. Other targets use `0.8 × sin(altitude) + 0.2`. Only future samples relative to the selected time can be suggested. A favorable interval is the contiguous run around the best sample within 0.08 score units of its score. Scores are used to order suggestions and are not presented as probabilities. Weather, skyglow, surface brightness, lunar scattering, atmospheric extinction, instrument aperture and an observer’s eyesight are not simulated. Changing these weights would change the order; the interface explains the factors and exclusions.

Tests cover lunar interference, horizon/daylight constraints, inner-planet twilight, equipment and demo exclusions, past-slot filtering, disjoint intervals, DST and polar conditions. The algorithm has not been calibrated against measured observing success.

## Planet reference checks

`tests/fixtures/planets-horizons.json` records independent NASA/JPL Horizons airless apparent azimuth/elevation references for Mercury, Venus, Mars, Uranus and Neptune at Greenwich on 2026-01-15 at 22:00 UTC. Each sample contains its reproducible Horizons API URL. Tests compare positions within 0.05° (3 arcmin) and run offline. Additional checks cover Venus phases, Mars opposition, ice-giant photometry and civil-twilight marker policy.

## Deploy to GitHub Pages

This project uses the existing `BadBagel47/noxari` repository. Push to `main` to run `.github/workflows/deploy.yml`, which installs from `package-lock.json`, runs the astronomy tests, builds, and deploys `dist/` through GitHub Actions. The repository's Pages source is GitHub Actions.

The site is served at `https://badbagel47.github.io/noxari/`. Vite's production base path is `/noxari/`; query links such as `?object=m31` work on this static host. No database or API key is required for this demo.

**Note:** GitHub Pages publishes a public static website. Do not commit API secrets, private location data, or credentials. Saved coordinates remain in the user's browser.
