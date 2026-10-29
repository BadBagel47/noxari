# Noxari — React + TypeScript prototype

A mobile-first planetarium prototype with a swipeable, calculated eye-level sky view, an all-sky map, object positions and altitude curves.

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

- **Look around** — the default eye-level, 90° horizontal perspective of 4,105 HYG stars to magnitude 5.8 plus five fainter constellation endpoints, with proper motion from epoch J2000. Drag or swipe to turn a full 360° and look up, or use the direction buttons or arrow keys. Manual control is available; Follow phone enables orientation sensors after a user gesture and permission where required. An absolute compass reference is used when available; otherwise the user must point toward true north and align before following starts. Dragging returns to manual control. The flat ground and level line mark the geometric horizon, not the local landscape.
- **Constellations** — optional schematic line figures for all 88 modern constellations, with independent Latin-name labels. Lines follow their stars and clip at the horizon. These figures are drawing conventions, not the official IAU area boundaries.
- **Sky map** — a switchable zenith-centered, azimuthal equidistant projection of the same stars. Its outer circle is the geometric horizon; north is up. Both views share calculated above-horizon positions for catalog objects, the Moon, Jupiter, Saturn and the Sun. Stars fade and deep-sky/planet markers are hidden in daylight and bright twilight; the Sun and Moon remain available.
- **Observation controls** — selected date/time and preset or manual latitude/longitude with an IANA timezone. Use my location requests a single browser geolocation fix and shows reported accuracy. It uses the device timezone, which can be changed manually; coordinates do not determine the timezone automatically. Times and night curves use the selected observation timezone, including daylight saving changes; coordinates are stored locally in the browser.
- **Tonight** — calculated altitude charts on one local 18:00–06:00 scale, with twilight and astronomical darkness shading. The list is not yet ranked by observing quality.
- **Explore** — search by English/Swedish name, object ID or constellation; category filters and a zodiac constellation name reference.
- **Saved** — bookmarked objects, persisted in localStorage.
- **Object details** — descriptions, catalog information, current altitude/azimuth and enlarged visibility chart.
- **Sharing** — URL query links such as `?object=m31` (works when deployed; uses Web Share API or clipboard where supported).
- **Guided Finder** — clearly labeled design preview only, without device sensor access.
- **Language** — EN/SV toggle; Swedish object names and selected UI copy.

## Important scientific limitations

**The sky views show calculated directions, but are not navigation instruments.** The eye-level view uses a 90° rectilinear horizontal field of view and a generic level horizon. Star brightness and daylight fading are stylized. Both projections omit atmospheric refraction, terrain and light pollution. The star subset contains 4,105 stars to magnitude 5.8 and five fainter line endpoints (to magnitude 6.65). It applies first-order tangent-plane proper motion to J2000 coordinates, followed by the date/location rotation. This is an approximation for dates near the present, without radial velocity, perspective acceleration or annual parallax. The 88 constellation figures are schematic guides; official IAU boundaries are not drawn. Orion and Ursa Major have no single catalog center, so their altitude curves remain marked as demos. The stars in object-detail artwork are decorative.

The Sun, Moon, Jupiter and Saturn are calculated with [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT license). [Luxon](https://moment.github.io/luxon/) (MIT license) handles the observation timezone. Selected deep-sky objects use fixed J2000/ICRS centers; Sirius uses its HYG center and proper motion for both the map marker and altitude charts; their current altitude and azimuth are calculated for the chosen coordinates and time. The mini and detail charts sample geometric altitude through the local night. Twilight shading uses the calculated solar altitude: astronomical darkness below −18° and twilight from −18° to −6°. Atmospheric refraction, terrain, weather, light pollution, lunar brightness and horizon obstructions are not modeled. “Highest” means the highest sampled altitude while the Sun is below −6° and the object is above the geometric horizon; it is not an observing recommendation. Planet distances and magnitudes remain labeled variable.

The star map uses an adapted subset of [HYG Database v4.1](https://github.com/astronexus/HYG-Database) by Astronexus contributors, under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Its subset removes the Sun, selects stars to magnitude 5.8 plus five fainter constellation endpoints, rounds coordinates for compact delivery, and retains proper motions, HIP IDs and a few bright names. The generated dataset in `src/generated/brightStars.ts` is shared under the same license. Reproduce it with `python3 scripts/generate_bright_stars.py`; the script verifies the pinned source checksum before writing it. Attribution and license links also appear below the map in the app.

Constellation connectivity and Latin names are adapted from the [Stellarium modern skyculture](https://github.com/Stellarium/stellarium/tree/daace2add6a1bf886e8ee1934f51e9c69f818d18/skycultures/modern) by the Stellarium team, under CC BY-SA 4.0. We retain only the HIP line lists and names, and compute label centers from their member stars. No illustrations are embedded. The adapted `src/generated/constellations.ts` remains under the same license. The generator verifies both upstream checksums; see `src/generated/README.md` for provenance.

Catalog center coordinates for M31/NGC 224, M42/NGC 1976, M13/NGC 6205 and M57/NGC 6720 come from [OpenNGC](https://github.com/mattiaverga/OpenNGC) by Mattia Verga (CC BY-SA 4.0). M45 coordinates and the original Sirius catalog reference come from [SIMBAD](https://simbad.cds.unistra.fr/simbad/), operated at CDS, Strasbourg, France. These coordinates are factual catalog values, not embedded catalog imagery. The initial view defaults to Stockholm until a user selects another location. Geolocation is requested only by Use my location; coordinates are stored only in this browser.

The initial release does not embed astronomical photos. Before adding per-object imagery, verify its license and show its source and attribution.

## Phone location and direction

Open the HTTPS site on your phone, tap **Use my location**, then **Follow phone** in Look around. Allow the requested permissions and hold the phone upright with the screen facing you. Use **Now** for the current sky, or keep a selected time to explore another date. Point the back of the phone toward a known **true north** direction and tap **Align north** if asked, or if the compass drifts. The browser's compass may report magnetic north; magnetic declination is not modeled. Stay away from metal and magnetic cases. Compass accuracy varies by device. The user has confirmed that following and the compass-settling correction work on Android with Brave; broader outdoor alignment and iOS validation remain.

On Android, relative orientation is preferred for movement, with an absolute compass reading used once to establish north. Switching to relative readings preserves the displayed heading. On iOS, the compass offset is also anchored once rather than reapplied on every reading. This avoids compass settling pulling the view back after a turn. Relative orientation can drift over longer sessions; Align north resets the reference. If only absolute readings are available, device-level compass corrections can still affect the view.

The view follows the back-screen direction with a level horizon; screen roll is not rendered. Readings directly upward/downward have no usable heading. Permission denial, unsupported APIs and missing readings leave manual control available. Following stops on manual input, a tab/map switch, opening details/settings, or hiding the page, and must be restarted explicitly. No location watch, sensor access on load or camera access is used. Browser-level GPS, permission and orientation flows have been checked with simulated inputs; this does not verify real compass accuracy.

## Next implementation milestones

1. Add the remaining planets and rank Tonight using target altitude, lunar brightness, equipment and observing conditions.
2. Extend phone validation to iOS, outdoor alignment and portrait/landscape transitions. A live-camera overlay can be considered later.
3. Add official constellation boundaries, a deeper star catalog and optional map zoom.
4. Add curated licensed object photos with individual source credits and a real device-sensor Guided Finder.
5. Add server-rendered Open Graph previews for shared object links and, later, complete observation-list sharing.

## Deploy to GitHub Pages

This project uses the existing `BadBagel47/noxari` repository. Push to `main` to run `.github/workflows/deploy.yml`, which installs from `package-lock.json`, runs the astronomy tests, builds, and deploys `dist/` through GitHub Actions. The repository's Pages source is GitHub Actions.

The site is served at `https://badbagel47.github.io/noxari/`. Vite's production base path is `/noxari/`; query links such as `?object=m31` work on this static host. No database or API key is required for this demo.

**Note:** GitHub Pages publishes a public static website. Do not commit API secrets, private location data, or credentials. Saved coordinates remain in the user's browser.
