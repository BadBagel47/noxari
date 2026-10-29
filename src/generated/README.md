# Generated sky datasets — provenance and licenses

## HYG stars

`brightStars.ts` is adapted from [HYG Database v4.1](https://github.com/astronexus/HYG-Database) by Astronexus contributors. The source and adapted subset are licensed under [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

Changes: exclude the Sun, select 4,105 stars to visual magnitude 5.8 plus five fainter HIP endpoints required by the constellation figures (4110 stars total), round coordinates/magnitudes, retain bright names, proper motions and HIP identifiers. Coordinates are epoch/equinox J2000; pmRA is the Hipparcos cos(dec)-weighted component in milliarcseconds/year. Missing proper-motion components default to zero. Apparent brightness remains stylized.

CSV source: `https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv`.

SHA-256: `d9f69fd86bbf90a4e4d52b4c5c53eacfa6dfc0bfdef85bfd94f095e0bebe4ebd`.

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

## Milky Way brightness grid — BSD 3-Clause

`milkyWay.png` is a grayscale **data grid**, adapted from José R. Vieira's Milky Way Outline Catalog as distributed in **d3-celestial by Olaf Frohn**. The pinned repository's README identifies `data/mw.json` as five brightness contours, credits Vieira, specifies J2000 RA/Dec (RA expressed as signed longitude degrees), and releases the distribution under its BSD license. The complete BSD 3-Clause text is retained at `public/licenses/milky-way-BSD-3-Clause.txt` and linked with both author credits in About & sources. The original catalog URL listed by upstream currently returns 404; reproduction uses the pinned d3-celestial distribution, not that unavailable page.

Upstream commit: `7e720a3de062059d4c5400a379146a601d9010e0`.

| Input | SHA-256 |
| --- | --- |
| `data/mw.json` | `aee221a7a0e879418e685de00c3e68fbdfac5667c0a8aab74929ef9cf4aab4fb` |
| `LICENSE` | `a8c79239001ad4bea243d1796b85084e1fc39309c5c5a663930a1b46320254c6` |
| `readme.md` | `c3d77ea7e64565a31876cd2be3c2bc71919712e0379ecd1d98b490afc68703e2` |

Changes: rasterize the five levels to a 720×360 equirectangular J2000 grid at 0.5° spacing, with RA increasing right from 0 to 24h and Dec decreasing down from +90° to −90°. Unwrap seam-crossing rings and close winding polar caps before even/odd filling. Preserve nested dark regions. Set grayscale levels to 51×contour level and apply two symmetric 3×3 box filters (periodic RA, clamped Dec) to soften steps. No photograph, invented dust shapes or prose is embedded. Brightness/color/opacity are stylized; this is not a calibrated surface-brightness or naked-eye visibility prediction.

Output PNG SHA-256: `ef8b95fc6d23fcc711a5d2727fd7626b034ab6f76985c894c5aa85987259749f` (22,998 bytes). Generate with `python3 scripts/generate_milky_way.py`; offline, pass local `mw.json`, `LICENSE` and `readme.md` paths in that order. All inputs are checksum-verified. Only the Python standard library is needed; builds/tests do not download data.

Runtime: inverse-project screen rays into the horizontal frame, rotate them to J2000 with Astronomy Engine and sample the grid bilinearly across the RA seam. This avoids polygon stitching across the camera/horizon. A cached diffuse layer uses at most 320 pixels on its longer axis and is reused for animation-only redraws. The local texture is loaded once, with an error/retry control if loading fails. Daylight fades it between Sun altitudes −18° and −8°. The all-sky map stays above the horizon; the eye-level view can expose the lower sky when looking down, with explicit simulation labeling. No proper motion is applied to this diffuse background.
