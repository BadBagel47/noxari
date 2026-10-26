# Noxari development guidance

This repository contains a **partly calculated prototype**, not a complete planetarium. The sky map projects HYG stars and above-horizon object markers for the selected time and place. The star brightness is stylized, proper motion is omitted, constellation figures/boundaries are not drawn, and constellation altitude curves remain demos. Preserve demo labels for those curves.

Stack: React, TypeScript, Vite. Deploy via GitHub Actions to GitHub Pages at `/noxari/`. Preserve query-string object deep links (`?object=m31`).

Priorities: (1) proper motion and constellation representation, (2) remaining planet positions, (3) trustworthy Tonight ranking, (4) guided finder. Existing catalog objects have calculated altitude curves; Orion and Ursa Major retain demo curves because a whole constellation has no unique center.

Mobile-first, dark sky-first UI; English interface with optional Swedish astronomical names. Prefer open datasets with verified licenses. Never present demo visibility as real calculations.
