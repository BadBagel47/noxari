# Generated sky datasets — CC BY-SA 4.0

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

## Reproduce

Run `python3 scripts/generate_bright_stars.py`. Both downloads are checksum-verified before writing. To regenerate offline, pass the HYG CSV and Stellarium index JSON as the first and second arguments. No third-party Python packages are needed. The app links to both authors/sources and CC BY-SA 4.0 in More → About & sources.
