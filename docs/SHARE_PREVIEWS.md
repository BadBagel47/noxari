# F-006: shared-object link previews

Status: implemented. The user approved implementation after the technical analysis.

## Finding

Object sharing previously kept the app at `/?object=<id>` and sent a title with the Web Share API. The deployed URL returns the same `index.html` for every query; its HTML has one generic Noxari title and description. Object names and descriptions are filled in later by React. Social crawlers that read the initial HTML therefore cannot get per-object Open Graph metadata from the query URL.

GitHub Pages serves ordinary static files and directories, so the app does not need a server or a metadata API. Unique static pages return object-specific metadata in their initial HTML.

## Implemented design

The production build emits one page per shareable object and language:

```text
/noxari/share/en/<object-id>/
/noxari/share/sv/<object-id>/
```

`npm run build` first produces the normal Vite site, then runs `scripts/generate_share_previews.mjs`. The generator uses Vite's middleware-mode SSR loader to load canonical `objects` and `candidateObjects` from TypeScript and writes `dist/share/<language>/<id>/index.html`; it does not maintain a second catalog. The current build generated 256 localized pages for 128 objects. Stable app IDs form the routes. Names and descriptions are localized, candidate status remains in the metadata, descriptions are concise, and catalog text is HTML-escaped.

Each HTML page contains absolute canonical, Open Graph and Twitter metadata in the initial response, with localized language and URLs. Seven verified Public Domain object photos are included with alt text and dimensions. M31's CC BY-SA photo is intentionally omitted from preview cards because a quick redirect would make attribution hard to see. Objects without an approved image use text cards. No unreviewed remote images are used.

Each page has a visible **Open in Noxari** fallback link to `/noxari/?object=<id>&lang=<language>` and a short same-origin JavaScript redirect to that path. It uses no user-agent bot detection or meta-refresh. Crawlers without JavaScript can read the static metadata; browsers with JavaScript disabled can use the visible link. The app honors optional `lang=en|sv` on the deep link; older `?object=` links retain saved/default language behavior. Sharing saved lists continues to use the existing `?list=` path.

## Verification

- `npm test`: 121 tests pass, including localized route generation, candidate wording, HTML escaping, query-language handling and Public Domain image selection.
- `npm run build`: type check/build pass and generate 256 pages for all 128 current shareable objects.
- Raw HTML checks verified localized English/Swedish titles, metadata, candidate status, public image URLs, and the absence of an image card for M31.
- Chromium verified the localized redirect reaches the correct object details, the legacy `?object=` deep link and `?list=` view still open, and the no-JavaScript fallback works. At 390 px, the preview page had no horizontal overflow.
- Platform preview cards can be cached; no platform-specific crawler validator was run, and third-party platforms may render or cache metadata differently. Refresh platform caches through their debugger where available.
