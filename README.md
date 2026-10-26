# Noxari — React + TypeScript prototype

A mobile-first, runnable **UI prototype** of an astronomy planetarium and observing guide.

## Start locally

Requires Node.js 20.19+ or 22.12+ and npm.

```bash
npm ci
npm run dev
```

Open the local address printed by Vite (normally http://localhost:5173). For a production build:

```bash
npm run build
npm run preview
```

To test on a phone on the same Wi-Fi network, use the `Network` URL printed by Vite (your firewall may need to allow it).

## Included

- **Sky** — illustrated star field with tappable objects, constellation overlay toggle and a demo time slider.
- **Tonight** — cards with mini altitude charts and equipment filtering.
- **Explore** — search by English/Swedish name, object ID or constellation; category filters and a zodiac constellation name reference.
- **Saved** — bookmarked objects, persisted in localStorage.
- **Object details** — descriptions, distance, magnitude, constellation, equipment and enlarged visibility chart.
- **Sharing** — URL query links such as `?object=m31` (works when deployed; uses Web Share API or clipboard where supported).
- **Guided Finder** — clearly labeled design preview only, without device sensor access.
- **Language** — EN/SV toggle; Swedish object names and selected UI copy.

## Important scientific limitations

**This is a UX prototype, not a scientifically accurate sky map yet.** Object positions, nightly altitude curves, suggested peak hours, and the darkness overlay are illustrative placeholders in `src/data.ts`. The demo location is fixed to Stockholm; no location access is requested. Planet distances/magnitudes vary with time and are intentionally labeled as variable. The moon and real ephemerides are **not implemented**. No weather or light-pollution data is used. Do not use the prototype for navigation or real observing decisions.

The initial release does not embed astronomical photos. Before adding per-object imagery, verify its license and show its source and attribution.

## Next implementation milestones

1. Add a licensed star catalog (HYG or Gaia subset) with RA/Dec, proper motion and stellar magnitudes.
2. Integrate Astronomy Engine for topocentric Sun/Moon/planet ephemerides and sidereal-time coordinate transformations.
3. Compute altitude/azimuth time series, true twilight windows, moonlight impact, and realistic observation suitability. Reuse this for all mini and detail charts.
4. Add geolocation with explicit consent and manual location entry.
5. Replace illustration with a proper WebGL sky projection and calibrated object selection.
6. Add curated licensed object photos with individual source credits and a real device-sensor Guided Finder.
7. Add server-rendered Open Graph previews for shared object links.
8. Share complete observation lists (future release).

## Deploy to GitHub Pages

This project uses the existing `BadBagel47/noxari` repository. Push to `main` to run `.github/workflows/deploy.yml`, which installs from `package-lock.json`, builds, and deploys `dist/` through GitHub Actions. In repository **Settings → Pages**, select **GitHub Actions** as the build and deployment source. If the initial workflow ran before Pages was enabled, rerun it from the Actions tab.

The site is served at `https://badbagel47.github.io/noxari/`. Vite's production base path is `/noxari/`; query links such as `?object=m31` work on this static host. No database or API key is required for this demo.

**Note:** GitHub Pages publishes a public static website. Do not commit API secrets, private location data, or credentials. This is still a demo with illustrative astronomy values.
