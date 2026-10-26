# Noxari development guidance

This repository contains a **partly calculated prototype**, not a complete planetarium. The background sky, marker screen positions and constellation curves remain demos. Preserve prominent demo labels for these until they are based on real sky geometry.

Stack: React, TypeScript, Vite. Deploy via GitHub Actions to GitHub Pages at `/noxari/`. Preserve query-string object deep links (`?object=m31`).

Priorities: (1) real projected sky with a licensed star catalog, (2) remaining planet positions and constellation representation, (3) trustworthy Tonight ranking, (4) guided finder. Existing catalog objects have calculated altitude curves; Orion and Ursa Major retain demo curves because a whole constellation has no unique center.

Mobile-first, dark sky-first UI; English interface with optional Swedish astronomical names. Prefer open datasets with verified licenses. Never present demo visibility as real calculations.
