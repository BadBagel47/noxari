# Noxari development guidance

This repository currently contains a **demo prototype**, not an accurate planetarium. Preserve prominent DEMO DATA labels until positions and visibility are computed from real astronomy.

Stack: React, TypeScript, Vite. Deploy via GitHub Actions to GitHub Pages at `/noxari/`. Preserve query-string object deep links (`?object=m31`).

Priorities: (1) reliable build and deployment, (2) accurate positions and time/location selection, (3) real altitude visibility curves on all object cards, (4) Tonight ranking, (5) guided finder.

Mobile-first, dark sky-first UI; English interface with optional Swedish astronomical names. Prefer open datasets with verified licenses. Never present demo visibility as real calculations.
