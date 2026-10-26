# HYG bright-star subset

`brightStars.ts` is adapted from [HYG Database v4.1](https://github.com/astronexus/HYG-Database) by Astronexus contributors. The source and this adapted subset are licensed under [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

Changes: exclude HYG's Sun row and stars fainter than visual magnitude 5.8, round right ascension and declination to six decimal places and magnitude to two decimal places, and retain common names only for stars brighter than magnitude 0.5. The result contains 4,105 stars. The app also links to the source and license beside the map.

Run `python3 scripts/generate_bright_stars.py` from the repository root to regenerate it. The script fetches the pinned upstream CSV over verified HTTPS and checks SHA-256 `d9f69fd86bbf90a4e4d52b4c5c53eacfa6dfc0bfdef85bfd94f095e0bebe4ebd` before using it. Pass an existing local CSV as the first argument to generate without downloading.
