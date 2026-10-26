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

- **Look around** — the default eye-level, 90° horizontal perspective of 4,105 HYG stars brighter than magnitude 5.8. Drag or swipe to turn a full 360° and look up, or use the direction buttons or arrow keys. The displayed heading and pitch are manual; they do not track the phone. The flat ground and level line mark the geometric horizon, not the local landscape.
- **Sky map** — a switchable zenith-centered, azimuthal equidistant projection of the same stars. Its outer circle is the geometric horizon; north is up. Both views share calculated above-horizon positions for catalog objects, the Moon, Jupiter, Saturn and the Sun. Stars fade and deep-sky/planet markers are hidden in daylight and bright twilight; the Sun and Moon remain available.
- **Observation controls** — selected date/time and preset or manual latitude/longitude with an IANA timezone. Times and night curves use the selected observation timezone, including daylight saving changes; coordinates are stored locally in the browser.
- **Tonight** — calculated altitude charts on one local 18:00–06:00 scale, with twilight and astronomical darkness shading. The list is not yet ranked by observing quality.
- **Explore** — search by English/Swedish name, object ID or constellation; category filters and a zodiac constellation name reference.
- **Saved** — bookmarked objects, persisted in localStorage.
- **Object details** — descriptions, catalog information, current altitude/azimuth and enlarged visibility chart.
- **Sharing** — URL query links such as `?object=m31` (works when deployed; uses Web Share API or clipboard where supported).
- **Guided Finder** — clearly labeled design preview only, without device sensor access.
- **Language** — EN/SV toggle; Swedish object names and selected UI copy.

## Important scientific limitations

**The sky views show calculated directions, but are not navigation instruments.** The eye-level view uses a 90° rectilinear horizontal field of view and a generic level horizon. Star brightness and daylight fading are stylized. Both projections omit atmospheric refraction, terrain and light pollution. The star subset is limited to magnitude 5.8, uses J2000 coordinates without proper motion, and does not yet draw the 88 constellation boundaries or stick figures. Orion and Ursa Major have no single catalog center, so their altitude curves remain marked as demos. The stars in object-detail artwork are decorative.

The Sun, Moon, Jupiter and Saturn are calculated with [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT license). [Luxon](https://moment.github.io/luxon/) (MIT license) handles the observation timezone. Selected deep-sky objects and Sirius use fixed J2000/ICRS centers; their current altitude and azimuth are calculated for the chosen coordinates and time. The mini and detail charts sample geometric altitude through the local night. Twilight shading uses the calculated solar altitude: astronomical darkness below −18° and twilight from −18° to −6°. Atmospheric refraction, terrain, weather, light pollution, lunar brightness, horizon obstructions and star proper motion are not modeled. “Highest” means the highest sampled altitude while the Sun is below −6° and the object is above the geometric horizon; it is not an observing recommendation. Planet distances and magnitudes remain labeled variable.

The star map uses an adapted subset of [HYG Database v4.1](https://github.com/astronexus/HYG-Database) by Astronexus contributors, under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Its subset removes the Sun and stars fainter than magnitude 5.8, rounds coordinates for compact delivery, and retains a few bright names. The generated dataset in `src/generated/brightStars.ts` is shared under the same license. Reproduce it with `python3 scripts/generate_bright_stars.py`; the script verifies the pinned source checksum before writing it. Attribution and license links also appear below the map in the app.

Catalog center coordinates for M31/NGC 224, M42/NGC 1976, M13/NGC 6205 and M57/NGC 6720 come from [OpenNGC](https://github.com/mattiaverga/OpenNGC) by Mattia Verga (CC BY-SA 4.0). M45 and Sirius coordinates come from [SIMBAD](https://simbad.cds.unistra.fr/simbad/), operated at CDS, Strasbourg, France. These coordinates are factual catalog values, not embedded catalog imagery. The initial view defaults to Stockholm until a user selects another location; the app does not request device location.

The initial release does not embed astronomical photos. Before adding per-object imagery, verify its license and show its source and attribution.

## Next implementation milestones

1. With explicit permission, use phone geolocation to set the observing position and compass/gyro sensors to synchronize the eye-level view with the direction the phone faces. Include a manual fallback and calibration guidance. A live-camera overlay can be considered later.
2. Add proper motion, more stars, the 88 constellation figures/boundaries and optional map zoom and pan.
3. Add the remaining planets and rank Tonight using target altitude, lunar brightness, equipment and observing conditions.
4. Add curated licensed object photos with individual source credits and a real device-sensor Guided Finder.
5. Add server-rendered Open Graph previews for shared object links and, later, complete observation-list sharing.

## Deploy to GitHub Pages

This project uses the existing `BadBagel47/noxari` repository. Push to `main` to run `.github/workflows/deploy.yml`, which installs from `package-lock.json`, runs the astronomy tests, builds, and deploys `dist/` through GitHub Actions. The repository's Pages source is GitHub Actions.

The site is served at `https://badbagel47.github.io/noxari/`. Vite's production base path is `/noxari/`; query links such as `?object=m31` work on this static host. No database or API key is required for this demo.

**Note:** GitHub Pages publishes a public static website. Do not commit API secrets, private location data, or credentials. Saved coordinates remain in the user's browser.
