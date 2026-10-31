# Development diagnostics

This page gathers the committed tools and repeatable checks used to develop Noxari. It is for contributors; it does not add diagnostic controls to the app.

## Main checks

Run from the repository root:

```sh
npm ci
npm test
npm run build
```

- `npm test` runs all committed offline Vitest tests in `tests/`. NASA/JPL fixture comparisons and catalog/source checks use checked-in fixtures; they do not need live astronomy APIs.
- `npm run build` runs the TypeScript project build and Vite production build. A warning about the large JavaScript bundle has been observed; check current output rather than treating it as a failed build.
- `npm run dev` serves the app locally. `npm run preview` serves the production build. Use the Vite network address for a phone on the same network; sensor permissions require a secure context, so physical sensor checks belong on the deployed HTTPS site or a trusted local HTTPS setup.
- `.github/workflows/deploy.yml` repeats install, tests and build on pushes to `main`, then deploys the artifact to GitHub Pages. A successful local build does not confirm deployment; inspect the Actions run and the live app separately.

## Focused test areas

Vitest files are organized by calculation or behavior. For a fast focused run, pass test paths to Vitest:

```sh
npx vitest run tests/deviceDirection.test.ts tests/directionReport.test.ts
```

Notable groups include astronomy/planet references, recommendations, catalog and Messier data, sky projection and clipping, IAU boundaries, constellation reveal timing, Finder geometry, device-direction state transitions and bounded report history. `tests/fixtures/planets-horizons.json` contains reproducible external reference samples used offline.

Useful data-generation scripts are under `scripts/`; their inputs, pins, licenses and regeneration steps are described in `src/generated/README.md` and `data/README.md`. Do not regenerate from an unpinned current upstream source as part of ordinary tests.

## Browser and device checks

The repository currently has no committed Playwright suite or browser automation dependency. Previous responsive Chromium checks were session-run smoke tests, not a repeatable project command. If one is needed again, create a temporary script outside the repository and clearly distinguish its result from Vitest and physical-device validation. Check the critical workspace sizes at 390×844 (mobile), 1280×800 (desktop) and 568×320 (short landscape), plus any dimensions directly relevant to the change.

Physical Android/iOS sensor behavior cannot be established by synthetic browser events. Follow the controlled procedure in [`DIRECTION_STABILITY.md`](DIRECTION_STABILITY.md) for direction work. The direction report is downloaded locally only when requested; it contains bounded sensor histories and no GPS coordinates. Review its contents before sharing it.

## What a check establishes

- Unit tests validate the modeled inputs and code paths they exercise; they do not prove sky visibility, true-north accuracy or physical sensor quality.
- A successful build validates type checking and bundling, not runtime interaction.
- A browser smoke test validates the tested browser and viewport only.
- An Actions success validates the deployed workflow run. Compare the deployed version if confirming a particular build.
- A physical device report is evidence for that session, not general accuracy across devices.
