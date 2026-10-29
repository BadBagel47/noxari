# Noxari development guidance

This repository contains a **partly calculated prototype**, not a complete planetarium. The default eye-level view is a swipeable, optionally phone-synchronized 90° perspective of HYG stars and above-horizon object markers for the selected time and place. A zenith-centered all-sky map remains available. Both views use the same calculated horizontal directions. The ground is a generic geometric horizon, not local terrain. Star brightness is stylized, first-order proper motion is applied to the HYG stars and Sirius marker/curves, 88 schematic constellation figures are optional (official boundaries are not drawn), and constellation altitude curves remain demos. Preserve demo labels for those curves.

Stack: React, TypeScript, Vite. Deploy via GitHub Actions to GitHub Pages at `/noxari/`. Preserve query-string object deep links (`?object=m31`).

User-approved priority order: (1) manual 360° eye-level sky view (implemented), (2) phone geolocation plus device-orientation synchronization (implemented; user confirmed Android/Brave following, broader compass validation remains), (3) proper motion and constellation figures (implemented), (4) remaining planets and trustworthy Tonight ranking. Live-camera overlay is lower priority. GPS determines location; compass/gyro sensors determine the phone's orientation. Existing catalog objects have calculated altitude curves; Orion and Ursa Major retain demo curves because a whole constellation has no unique center.

Mobile-first, dark sky-first UI; English interface with optional Swedish astronomical names. Prefer open datasets with verified licenses. Never present demo visibility as real calculations.

Phone sensors are opt-in and require HTTPS. Relative orientation must be aligned to true north; absolute compass data can still use magnetic north, with no declination correction. Keep manual fallback, permission/error states, listener cleanup and the distinction between simulated browser tests and physical-device validation.
