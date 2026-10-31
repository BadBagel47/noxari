# Messier distance facts

`messier-distances.json` contains 88 approximate **Distance** facts retrieved on 2026-10-29 from the [NASA/Hubble Messier catalog](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/). Each fact retains its source URL and the SHA-256 of the fetched HTML page. No article prose or imagery is embedded. The facts are approximate published estimates, not precision measurements or angular-position inputs.

Snapshot SHA-256: `c7ebeb9fe4e74c70e3cd0aacc86d7ac40e3e08cc389408bfce7cc2b39d8b9d5a`.

For M33, M67 and M76 the approximate distance is taken from the page's factual text rather than a structured Distance field. A missing/unsuitable source value is left missing. The generated catalog has 22 entries without a single distance: 19 missing source values and three special cases (M24, M40, M73) for which no common distance is assigned. No distances are inferred from redshift, magnitude or unrelated objects.

To review/update this snapshot, check each source page, retain the factual value, retrieval date and full-page checksum, then explicitly update the snapshot checksum in `scripts/generate_messier.py`. Page checksums record the retrieval; live NASA pages may change. Tests and builds use the committed snapshot without network requests. See `src/generated/README.md` for the separately licensed OpenNGC coordinate/type dataset and reproduction instructions.

## Selected Messier images

`object-images.json` is the source of record for eight 960-pixel Commons thumbnails used in object Details. It retains the individual source-file page, creator credit, license label/link, accessible English/Swedish descriptions, download URL and SHA-256 for the exact thumbnail bytes shipped in `public/images/objects/`. Reproduce or integrity-check the files with:

```sh
python3 scripts/download_object_images.py
```

The original Commons records identify seven images as public domain and the M31 photograph as CC BY-SA 2.5. The app shows each creator, source record and license beside its image. The M31 file is distributed unchanged and its source license remains linked. Images are processed astronomical images; colors and contrast may be enhanced and do not represent unaided-eye appearance. Tests verify IDs, accessibility text, source/license metadata, JPEG headers and asset hashes offline.

| Object | Commons record | Creator credit | Commons license |
| --- | --- | --- | --- |
| M31 | [M31-Andromede-16-09-2023-Hamois.jpg](https://commons.wikimedia.org/wiki/File:M31-Andromede-16-09-2023-Hamois.jpg) | Lviatour | [CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5/) |
| M42 | [Orion Nebula - Hubble 2006 mosaic 18000.jpg](https://commons.wikimedia.org/wiki/File:Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg) | NASA, ESA, M. Robberto and the Hubble Orion Treasury Team | Public domain |
| M45 | [Pleiades large.jpg](https://commons.wikimedia.org/wiki/File:Pleiades_large.jpg) | NASA, ESA, AURA/Caltech, Palomar Observatory and listed science team | Public domain |
| M13 | [Heart of M13 Hercules Globular Cluster.jpg](https://commons.wikimedia.org/wiki/File:Heart_of_M13_Hercules_Globular_Cluster.jpg) | ESA/Hubble and NASA | Public domain |
| M57 | [Hubble image of the Ring Nebula (Messier 57).jpg](https://commons.wikimedia.org/wiki/File:Hubble_image_of_the_Ring_Nebula_(Messier_57).jpg) | NASA, ESA, C. Robert O’Dell | Public domain |
| M51 | [Messier51 sRGB.jpg](https://commons.wikimedia.org/wiki/File:Messier51_sRGB.jpg) | NASA and the European Space Agency | Public domain |
| M81 | [Messier 81 HST.jpg](https://commons.wikimedia.org/wiki/File:Messier_81_HST.jpg) | NASA, ESA and the Hubble Heritage Team | Public domain |
| M104 | [M104 ngc4594 sombrero galaxy hi-res.jpg](https://commons.wikimedia.org/wiki/File:M104_ngc4594_sombrero_galaxy_hi-res.jpg) | NASA/ESA and the Hubble Heritage Team | Public domain |

## Reviewed small-body candidate collection

`src/candidateObjects.ts` is a separate, reviewed collection, independent of the ordinary Messier/solar-system catalog. Its first entry is **2026 ED138**, labeled as a dwarf-planet candidate rather than a confirmed dwarf planet. Source background and the estimated 600–1,500 km size range are documented by the [Rubin Observatory release](https://rubinobservatory.org/news/rubin-first-dwarf-planet-candidate).

The orbit is pinned from JPL Small-Body Database solution #2, issued 2026-10-29 at epoch JD 2461200.5 (2026-10-31 TDB). The app propagates those osculating elements with a two-body Kepler solver, converts the heliocentric ecliptic vector to J2000 equatorial coordinates, and iterates light-time against Astronomy Engine's Earth vector. It omits small-body perturbations and observer parallax; review the orbit against updated JPL/MPC solutions before a later data refresh. The estimated size is not a direct measurement; infrared observations are needed to constrain it. The sky layer defaults to off and its preference is stored locally. Candidate records are updated manually after source review; the app does not fetch catalog changes at runtime.

## Reviewing catalog updates

Run `npm run catalogs:check` (or `python3 scripts/check_catalog_updates.py`) to compare the current snapshots with upstream OpenNGC, the selected HYG star subset, Stellarium skyculture data and JPL orbit solutions for already-listed small-body candidates. This audit is read-only: it reports new, missing and changed identities/fields and never regenerates or deletes app data. Add `--fail-on-changes` to use it as a review gate.

If an upstream entry disappears, keep the app record and its stable ID until a person confirms whether it was renamed, merged, corrected or withdrawn. Add aliases for confirmed renames; only retire a record after review, preserving a redirect or alias when useful. A source change alone is not permission to alter the app catalog. For an accepted update, review the source revision, license and field changes; update the exact source pin/checksum; regenerate the committed snapshot; inspect the diff; then run tests and build. NASA/Hubble distance facts, selected object images, and candidate discovery/status/physical-size claims remain manually reviewed. The audit checks orbits of listed candidates but does not automatically discover or approve new candidates.
