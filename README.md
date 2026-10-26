# Noxari — React + TypeScript prototype

A mobile-first planetarium prototype with calculated object positions and altitude curves. Its sky illustration remains a demo.

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

- **Sky** — illustrated star field with tappable objects and constellation overlay; this map is not geometrically projected.
- **Observation controls** — selected date/time and preset or manual latitude/longitude with an IANA timezone. Times and night curves use the selected observation timezone, including daylight saving changes; coordinates are stored locally in the browser.
- **Tonight** — calculated altitude charts on one local 18:00–06:00 scale, with twilight and astronomical darkness shading. The list is not yet ranked by observing quality.
- **Explore** — search by English/Swedish name, object ID or constellation; category filters and a zodiac constellation name reference.
- **Saved** — bookmarked objects, persisted in localStorage.
- **Object details** — descriptions, catalog information, current altitude/azimuth and enlarged visibility chart.
- **Sharing** — URL query links such as `?object=m31` (works when deployed; uses Web Share API or clipboard where supported).
- **Guided Finder** — clearly labeled design preview only, without device sensor access.
- **Language** — EN/SV toggle; Swedish object names and selected UI copy.

## Important scientific limitations

**The sky drawing is still illustrative and must not be used for navigation.** The screen positions of markers, background stars and constellation lines do not respond to the observer's time or location. Orion and Ursa Major have no single catalog center, so their altitude curves remain marked as demos.

The Sun, Moon, Jupiter and Saturn are calculated with [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT license). [Luxon](https://moment.github.io/luxon/) (MIT license) handles the observation timezone. Selected deep-sky objects and Sirius use fixed J2000/ICRS centers; their current altitude and azimuth are calculated for the chosen coordinates and time. The mini and detail charts sample geometric altitude through the local night. Twilight shading uses the calculated solar altitude: astronomical darkness below −18° and twilight from −18° to −6°. Atmospheric refraction, terrain, weather, light pollution, lunar brightness, horizon obstructions and star proper motion are not modeled. “Highest” means the highest sampled altitude while the Sun is below −6° and the object is above the geometric horizon; it is not an observing recommendation. Planet distances and magnitudes remain labeled variable.

Catalog center coordinates for M31/NGC 224, M42/NGC 1976, M13/NGC 6205 and M57/NGC 6720 come from [OpenNGC](https://github.com/mattiaverga/OpenNGC) by Mattia Verga (CC BY-SA 4.0). M45 and Sirius coordinates come from [SIMBAD](https://simbad.cds.unistra.fr/simbad/), operated at CDS, Strasbourg, France. These coordinates are factual catalog values, not embedded catalog imagery. The initial view defaults to Stockholm until a user selects another location; the app does not request device location.

The initial release does not embed astronomical photos. Before adding per-object imagery, verify its license and show its source and attribution.

## Next implementation milestones

1. Replace the illustrated sky with a real projection and licensed star catalog, including proper motion and all 88 constellations.
2. Add the remaining planets and rank Tonight using target altitude, lunar brightness, equipment and observing conditions.
3. Offer device geolocation with explicit consent and automatic timezone lookup for manual coordinates.
4. Add curated licensed object photos with individual source credits and a real device-sensor Guided Finder.
5. Add server-rendered Open Graph previews for shared object links and, later, complete observation-list sharing.

## Deploy to GitHub Pages

This project uses the existing `BadBagel47/noxari` repository. Push to `main` to run `.github/workflows/deploy.yml`, which installs from `package-lock.json`, runs the astronomy tests, builds, and deploys `dist/` through GitHub Actions. The repository's Pages source is GitHub Actions.

The site is served at `https://badbagel47.github.io/noxari/`. Vite's production base path is `/noxari/`; query links such as `?object=m31` work on this static host. No database or API key is required for this demo.

**Note:** GitHub Pages publishes a public static website. Do not commit API secrets, private location data, or credentials. Saved coordinates remain in the user's browser.
