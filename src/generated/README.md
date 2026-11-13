# Generated sky datasets — provenance and licenses

## Reviewing source updates

Run `npm run catalogs:check` from the repository root to produce a read-only report for OpenNGC, the app's selected HYG stars, Stellarium constellation/boundary data and pinned JPL orbits for Keplerian small bodies. The report compares stable IDs and retained values; it does not write generated files. Missing upstream entries are review items, never automatic deletions. Update source revision/checksum pins only after reviewing the diff and license, then regenerate and inspect the checked-in changes. NASA/Hubble fact pages and object-photo files use their own manual source and checksum procedures in `data/README.md`.

## HYG stars

`brightStars.ts` is adapted from [HYG Database v4.1](https://github.com/astronexus/HYG-Database) by Astronexus contributors. The source and adapted subset are licensed under [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

Changes: exclude the Sun, select 8,920 stars to visual magnitude 6.5 plus HIP 30665 (V=6.60) and HIP 33165 (V=6.65), which are required endpoints for the constellation figures (8,922 stars total). Round coordinates/magnitudes and retain bright names, proper motions and HIP identifiers. Stars beyond V=5.8 use a dimmer display curve. Coordinates are epoch/equinox J2000; pmRA is the Hipparcos cos(dec)-weighted component in milliarcseconds/year. Missing proper-motion components default to zero. Apparent brightness remains stylized.

CSV source: `https://raw.githubusercontent.com/astronexus/HYG-Database/3bf37f4b2d5460e1278286320d1d62fab9b493c1/hyg/CURRENT/hygdata_v41.csv` (pinned commit `3bf37f4b2d5460e1278286320d1d62fab9b493c1`).

SHA-256: `d9f69fd86bbf90a4e4d52b4c5c53eacfa6dfc0bfdef85bfd94f095e0bebe4ebd`.

## Binocular stars (F-043)

`public/stars/binocular-v1.bin` holds the 52,894 HYG v4.1 stars with 6.5 < V ≤ 8.5 that are not in the bright subset (HIP 30665 and 33165 already ship there), from the same pinned HYG commit and checksum (CC BY-SA 4.0, credited with the other HYG data in About & sources). Generator: `python3 scripts/generate_binocular_stars.py [local hygdata_v41.csv]`; provenance and output SHA-256 in `data/binocular-stars/manifest.json`. Layout: magic `NXS1`, uint32 count, uint16 RA (24 h/65,536), int16 Dec (90°/32,767), uint8 (V − 6.5)·100; sorted by magnitude. Proper motion is omitted (a few arcseconds since J2000 for these stars, below the ~10–20″ encoding). The file (264 kB, ≈212 kB gzip) is fetched only when the Binoculars or Whole catalog level is chosen, is not precached by the service worker and is cached at runtime on first use. The app rotates the J2000 vectors with one Astronomy Engine EQJ→HOR matrix per time change, draws only the magnitude-sorted prefix up to a zoom-dependent limit (V 7.0 at 1×, rising to 8.5 at 2×) and fades stars in near that limit. Only the eye-level view draws them; the all-sky map keeps the bright subset.

## Messier apparent sizes (F-045)

`messierSizes.ts` holds OpenNGC MajAx/MinAx (arcminutes) for the 110 Messier objects, from the same pinned OpenNGC commit and checksums as `messier.ts` and the same identity mapping (M102 = NGC 5866). 108 have a size (M40 and M73 have none). `distanceLy` is parsed from the existing NASA/Hubble distance snapshot (88 objects). The demo shows the apparent size and an approximate true size = distance × angle, always marked ≈. Generate with `python3 scripts/generate_messier_sizes.py [NGC.csv addendum.csv]`; `messier.ts` records are not changed. Solar-system diameters in `src/objectFacts.ts` are standard mean values.

## Constellation figures

`constellations.ts` is adapted from Stellarium's **modern** skyculture by the Stellarium team. [Pinned source](https://github.com/Stellarium/stellarium/blob/daace2add6a1bf886e8ee1934f51e9c69f818d18/skycultures/modern/index.json). [License declaration](https://github.com/Stellarium/stellarium/blob/daace2add6a1bf886e8ee1934f51e9c69f818d18/skycultures/modern/description.md#license): “Text and data: CC BY-SA 4.0”. Both original data and this adaptation are under CC BY-SA 4.0.

Changes: retain only 88 constellation abbreviations, Latin/native names and HIP line connectivity. Discard illustrations, common star names, boundaries and other metadata. Label centers are computed at runtime from the member stars. These line figures are schematic conventions, not official IAU boundaries. No artwork is embedded.

Upstream commit: `daace2add6a1bf886e8ee1934f51e9c69f818d18`.

Index SHA-256: `1f2f5ffd6c9e25a7d0dcfdbf1f756e2db03dd3b8ed4ec016a2839b09f6b0fe1e`.

## Official constellation boundaries

`boundaries.ts` adapts the **IAU** `edges` from the same pinned Stellarium modern skyculture index (`daace2add6a1bf886e8ee1934f51e9c69f818d18`). Its `edges_source` credits [Pierre Barbier’s B1875 edge table](https://pbarbier.com/constellations/edges_18.txt). Source `edges_epoch` is **B1875**, not J2000. There are 781 unique shared edges, covering 88 constellations / 89 regions because Serpens has two separate parts (Ser1 and Ser2).

The Stellarium team’s [license declaration](https://github.com/Stellarium/stellarium/blob/daace2add6a1bf886e8ee1934f51e9c69f818d18/skycultures/modern/description.md#license) states “Text and data: CC BY-SA 4.0”. This adaptation retains that license and source credits. No artwork or narrative text is embedded.

Changes: retain only edge endpoints, adjacent region IDs and increasing-RA direction; convert sexagesimal RA/declination to decimal hours/degrees; represent a P+ crossing of 24h with an end RA greater than 24h. Each shared edge is stored/drawn once. Region IDs are normalized to the usual mixed-case abbreviations, retaining Ser1/Ser2. No graticule or stick-figure lines are substituted for official boundaries.

The generator verifies the index checksum above and the license-description SHA-256 `4b58344f63168d7c816fdfef405103b5770fda2e1f4a4bf5c8871041ce042586`, and checks the epoch, source, edge directions, uniqueness and coverage. Run `python3 scripts/generate_boundaries.py`, or pass local `index.json` and `description.md` paths for offline reproduction. Only the Python standard library is needed. App builds/tests use the committed output without fetching upstream.

Runtime sampling follows source meridians and declination parallels in B1875 at at-most-1° coordinate increments, including wrap crossings and polar small circles. Astronomy Engine’s `Rotation_EQD_EQJ` at the same B1875 instant/frame convention used by its `Constellation` classifier converts samples to fixed J2000 vectors; `Rotation_EQJ_HOR` then converts to the selected date/location. Boundaries have no stellar proper motion. This uses the library’s frame convention rather than a separate FK4/FK5 transformation; it is a visual boundary layer, not a sub-arcsecond astrometric reference. All 781 edges were checked on both sides against Astronomy Engine’s separate Roman-table classification. Canvas drawing clips at the viewport and breaks paths where samples are below the geometric horizon or behind the camera. Tessellation and horizon clipping are sampled approximations (a terminal gap can be up to one sample); refraction/terrain remain excluded.

## Messier catalog

`messier.ts` adapts [OpenNGC](https://github.com/mattiaverga/OpenNGC) by **Mattia Verga**, under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); this adapted dataset is shared under the same license. The pinned upstream commit is `be3cd6c5498806a2fbb2f7e0452ef802dbb02be0`. Its README declares the data license, with the license text in `LICENSES/CC-BY-SA-4.0.txt`.

Inputs under that commit's `database_files/` directory:

| File | SHA-256 |
| --- | --- |
| `NGC.csv` | `54abea0b57b0a103831bfc7a8e3a99a23acfbf4bb581fcf3d8af539cbb826c84` |
| `addendum.csv` | `c93f983dda6780b76b7b2e9271a856a892627710148a982ee98101a54c642fdd` |

Changes: retain 110 Messier identities, J2000 centers, constellation, object type, aliases and available integrated V magnitudes; convert sexagesimal coordinates; author English/Swedish descriptions, type groups, translations and broad equipment guidance. Equipment guidance is Noxari's heuristic, not an OpenNGC measurement. Per-object source links and app-level attribution remain visible under More → About & sources.

Explicit adaptations and uncertainty:

- **M24** is the IC 4715 Milky Way star cloud, not the embedded NGC 6603 cluster.
- **M40** is a cataloged star pair. No common distance or verified combined V magnitude is assigned.
- **M73** is grouped as a four-star asterism, following OpenNGC's Other type and four-Galactic-stars note. No common distance is assumed.
- **M102** is historically disputed. OpenNGC's duplicate addendum associates it with M101; this adaptation instead follows [NASA/Hubble's NGC 5866 identification](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-102/). Coordinates and V magnitude come from the OpenNGC NGC 5866 row. The dispute is displayed in the object details; M101 remains a separate entry.
- M76 uses NGC 650's center and also accepts NGC 651 as an alias. Other Messier-number aliases are excluded to avoid duplicate identity matches.
- 102 entries display source V magnitudes. M22, M35, M62, M69, M70, M71 and M107 lack V values; M40 is left unverified. Other bands and central-star magnitudes are not substituted.
- 88 approximate distances come from the committed NASA/Hubble factual snapshot, with separate per-object citations. Missing values and the three group cases are explicit; see `data/README.md`.

Regenerate with `python3 scripts/generate_messier.py`. It verifies both pinned downloads and the committed distance snapshot before writing. Offline: `python3 scripts/generate_messier.py /path/to/NGC.csv /path/to/addendum.csv`. Only the Python standard library is required; app builds and tests do not regenerate or fetch sources.

## Reproduce stars and constellation figures

Run `python3 scripts/generate_bright_stars.py`. Both downloads are checksum-verified before writing. To regenerate offline, pass the HYG CSV and Stellarium index JSON as the first and second arguments. No third-party Python packages are needed. The app links to the authors/sources and CC BY-SA 4.0 in More → About & sources.

## Milky Way brightness grid — ESO/S. Brunier, CC BY 4.0 (F-040)

Since 2026-11-12 `milkyWay.png` is derived from the ESO all-sky panorama **eso0932a** ("The Milky Way panorama", credit **ESO/S. Brunier**, CC BY 4.0; credit line mandatory). Source: `https://cdn.eso.org/images/large/eso0932a.jpg` (page `https://www.eso.org/public/images/eso0932a/`), input SHA-256 `60400c92c54b7c1bd12299c69e83b16e5b6256e7dabacc478c021758ecd28179`, recorded in `data/milky-way-eso/manifest.json`. The credit and license link appear in More → About & sources; `public/licenses/milky-way-NOTICE.txt` states the source, license and modifications.

Changes (`python3 scripts/generate_milky_way_eso.py [local eso0932a.jpg]`, needs numpy + Pillow): luminance → resize to 3000×1500 → 9 px median filter (removes point stars, which the app draws from its own catalogue) → Gaussian blur 1.2 px → reproject from galactic (l=0 at centre, increasing left) to a 1440×720 J2000 equirectangular grid (RA 0→24 h left to right, Dec +90→−90 down) with the IAU J2000→galactic rotation and bilinear sampling → subtract the 55th-percentile sky floor, normalise to the 99.7th percentile, gamma 0.8 → 8-bit grayscale PNG. Output SHA-256 `3ec4ebdd258e48b13e9bb9dfe96c83d0a68abb33f2e195ca69087497587d837e` (212,932 bytes). Orientation was checked against the previous contour grid (correlation 0.83) and by unit tests (Galactic centre and Carina bright, both Galactic poles dark, continuous RA seam). Tint, opacity and smoothing are visual choices; this is not a calibrated surface-brightness or naked-eye visibility prediction.

Colour texture (F-056, 2026-11-12): `public/sky/milky-way-color-v1.webp` (2880×1440, ≈1.3 MB) from the same ESO file and checksum via `python3 scripts/generate_milky_way_color.py <eso0932a.jpg>`: 5 px median at full resolution (keeps the grain of unresolved star clouds and the dust lanes), the same galactic→J2000 reprojection, brightness = luminance above the 55th percentile normalised to the 99.8th (gamma 0.85) stored in A, colour at full value (45 % desaturated) in RGB; isolated bright points (bright stars and planets present on the photo) are replaced by their 17×17 local median. Manifest: `data/milky-way-eso/color-manifest.json`. The app loads it first and falls back to `milkyWay.png`; both renderers use A×0.4 as opacity and RGB as colour. The grey grid stays for tests and fallback.

Previous grid (until 2026-11-12): a contour rasterisation of José R. Vieira's Milky Way Outline Catalog from the BSD 3-Clause d3-celestial distribution by Olaf Frohn (upstream commit `7e720a3de062059d4c5400a379146a601d9010e0`, output SHA-256 `ef8b95fc…749f`). `scripts/generate_milky_way.py` and `public/licenses/milky-way-BSD-3-Clause.txt` are kept for reproduction/history; that grid no longer ships in the app.

Runtime: inverse-project screen rays into the horizontal frame, rotate them to J2000 with Astronomy Engine and sample the grid bilinearly across the RA seam. This avoids polygon stitching across the camera/horizon. A cached diffuse layer uses at most 320 pixels on its longer axis and is reused for animation-only redraws. The local texture is loaded once, with an error/retry control if loading fails. Daylight fades it between Sun altitudes −18° and −8°. The all-sky map stays above the horizon; the eye-level view can expose the lower sky when looking down, with explicit simulation labeling. No proper motion is applied to this diffuse background.

## Constellation drawings (F-041) and named stars (F-026)

- `constellationArt.ts` + `public/constellation-art/*.webp`: generated by `python3 scripts/prepare_constellation_art.py` from Stellarium's `modern` sky culture at commit `daace2add6a1bf886e8ee1934f51e9c69f818d18` (illustrations: Free Art License 1.3; see `public/licenses/constellation-art-NOTICE.txt`). Images are resized to 384 px and recolored (light blue, alpha from brightness); anchor RA/Dec come from the pinned HYG v4.1 CSV. Placement is an affine fit through three anchor stars per frame — an approximation that ignores perspective curvature inside a figure; placements stretched by more than 12× are skipped.
- `starNames.ts`: generated by `python3 scripts/generate_star_names.py` from the same pinned HYG v4.1 CSV (CC BY-SA 4.0): named stars (IAU WGSN names as carried in HYG) brighter than V 2.6 that are already in the 8,922-star subset. Distances are HYG estimates. These become selectable `Star` objects (`src/namedStars.ts`); Sirius keeps its existing curated object.

B-015 (2026-11-13): the app box-filters the colour texture once after decoding (`prefilterMilkyWay`, one 3-texel pass, raster 360) because both painters sample it at ≈0.375°; the file itself is unchanged.

## Gaia DR3 faint stars (F-061, 2026-11-13)

`public/stars/gaia-v1/` holds Gaia DR3 stars with G ≤ 11 that are not already shipped from HYG (ESA/Gaia/DPAC, **CC BY-NC 3.0 IGO** – non-commercial; see `public/licenses/gaia-NOTICE.txt` and the decision in HANDOFF.md). Generator: `python3 scripts/generate_gaia_stars.py --cache <dir>`; it runs one fixed ADQL query per HEALPix level-2 pixel against ESA's Gaia archive (Gaia DR3 is a fixed release, so the query is the pin), moves positions from epoch 2016.0 to J2000 with Gaia proper motions, removes stars within 15″ of a HYG star (G ≤ 9.5) and writes ~420 sky tiles (18 Dec bands of 10°, RA cells ≈ 10° wide). Per tile: `t<i>.bin` (`NXG1`, uint32 count, then per star uint16 RA and Dec offsets in the cell, uint8 (G − 6)·50, uint8 (BP−RP + 0.5)·50 or 255; sorted by G) and `d<i>.bin` (int64 source_id, uint16 parallax·100 mas). `index.json` has the grid and counts; `data/gaia-stars/manifest.json` has the query, row and output checksums. The app fetches `index.json` and the tiles around the view only on the Whole catalog level beyond 2× zoom (limit rising from V 8.5 at 2× to G 11 at 3×), and a detail file only when a star in that tile is tapped. `stars/` is excluded from the service-worker precache; fetched tiles are cached at runtime.

F-060 (2026-11-13): the app now loads `public/sky/milky-way-color-v2.webp` (same ESO source and checksum, parameters in `data/milky-way-eso/color-manifest.json`: brightness floor 20th percentile, top 99.5, gamma 0.7, saturation 0.8; ≈2.3 MB). Both renderers use A × 0.7 as opacity, scaled by `milkyWayZoomFade` (about half at 3×). `milky-way-color-v1.webp` stays in the repository for history but is no longer loaded or precached.

F-065 (2026-11-13): `public/stars/gaia12-v1/` is a second layer with 11 < G ≤ 12 from the same script (`--min-g 11 --max-g 12 --band 5 --mag-base 10 --mag-scale 100`; 5° bands, ≈ 72 RA cells at the equator; magnitude byte = (G − 10)·100). Same tile format and licence; provenance in `data/gaia-stars/manifest-g12.json`. The app loads it on the Whole catalog level beyond 3× (limit G 11 at 3× rising to G 12 at 6×), at most 36 tiles around the view; tags encode layer·4096 + tile and the index within the tile (2¹⁴ per tile).

## Caldwell and named deep-sky objects (F-075, 2026-11-13)

`src/generated/namedDeepSky.ts` is made by `python3 scripts/generate_named_deepsky.py [NGC.csv addendum.csv]` from the same pinned OpenNGC commit and checksums as the Messier catalogue (CC BY-SA 4.0). It holds every Caldwell object (109, including the addendum rows C009, C014, C041 and C099) and every other non-Messier object with an OpenNGC common name, except single stars, novae and galaxies fainter than magnitude 13: 177 objects. Names: first readable common name (Greek-letter abbreviations fall back to the designation), established Swedish names from a fixed list; aliases cover NGC/IC, Caldwell ("C 4", "Caldwell 4"), common names and OpenNGC identifiers. Distances are not supplied by the source. Equipment class from magnitude, with diffuse nebulae never classed as naked-eye on integrated magnitude alone, and a short override list for objects without a magnitude.
