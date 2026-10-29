# Messier distance facts

`messier-distances.json` contains 88 approximate **Distance** facts retrieved on 2026-10-29 from the [NASA/Hubble Messier catalog](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/). Each fact retains its source URL and the SHA-256 of the fetched HTML page. No article prose or imagery is embedded. The facts are approximate published estimates, not precision measurements or angular-position inputs.

Snapshot SHA-256: `c7ebeb9fe4e74c70e3cd0aacc86d7ac40e3e08cc389408bfce7cc2b39d8b9d5a`.

For M33, M67 and M76 the approximate distance is taken from the page's factual text rather than a structured Distance field. A missing/unsuitable source value is left missing. The generated catalog has 22 entries without a single distance: 19 missing source values and three special cases (M24, M40, M73) for which no common distance is assigned. No distances are inferred from redshift, magnitude or unrelated objects.

To review/update this snapshot, check each source page, retain the factual value, retrieval date and full-page checksum, then explicitly update the snapshot checksum in `scripts/generate_messier.py`. Page checksums record the retrieval; live NASA pages may change. Tests and builds use the committed snapshot without network requests. See `src/generated/README.md` for the separately licensed OpenNGC coordinate/type dataset and reproduction instructions.
