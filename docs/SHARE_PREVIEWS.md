# F-006: shared-object link previews

## Finding

Object sharing currently keeps the app at `/?object=<id>` and sends a title with the Web Share API. The deployed URL returns the same `index.html` for every query; its HTML has one generic Noxari title and description. Object names and descriptions are filled in later by React. A social crawler that reads the initial HTML therefore cannot get per-object Open Graph metadata from the query URL.

GitHub Pages can serve ordinary static files and directories, so the app does not need a server or a metadata API. Build-time pages with unique paths can return object-specific metadata in their initial HTML.

## Recommended implementation

Generate one static landing page per shareable object and language at:

```text
/noxari/share/en/<object-id>/
/noxari/share/sv/<object-id>/
```

The generator should run after Vite writes `dist/`, load the canonical `objects` and `candidateObjects` data rather than maintain a second catalog, and write `dist/share/<language>/<id>/index.html`. A small Node script can use Vite's middleware-mode SSR loader to import the TypeScript catalog modules, then close the temporary server; this avoids parsing or duplicating catalog source. Add it as the final command in `npm run build` so Vite's normal clean build runs before the pages are written. The route ID is the stable app ID. Use the current app names and descriptions in the requested language; retain candidate status in the title/description for provisional objects. Keep metadata descriptions concise and HTML-escape all catalog values.

Each page should have absolute, public URLs and include `title`, `description`, `canonical`, `og:type`, `og:title`, `og:description`, `og:url`, plus `twitter:card`, `twitter:title` and `twitter:description`. Set the page language to `en` or `sv`. Use `og:image`, `og:image:alt` and the matching Twitter image fields only when the object has a vetted image in `data/object-images.json`; construct image URLs under `/noxari/images/objects/`. Do not reuse an unreviewed remote image or imply that an artistic image is an unaided-eye view. The manifest has seven Public Domain photos and one CC BY-SA photo (M31). Initial previews should use the seven Public Domain files; omit M31's image unless the landing page can provide meaningful creator, source and license attribution before redirecting. Other objects can use text without an image until a general share graphic is designed.

Public-domain images may be used without a copyright attribution requirement; retain their existing source/creator credit where practical. Do not silently use the M31 CC BY-SA image in a share preview: the image card may circulate separately from Noxari's object details, and a fast redirect would make attribution hard to see. Reassess it only if the preview flow can show the required credit, source and license prominently.

Include a visible **Open in Noxari** link to the existing app deep link, `/noxari/?object=<id>`. A small client-side redirect can send ordinary browsers there after the static HTML loads; do not use user-agent bot detection or a meta-refresh redirect. Crawlers that do not run JavaScript can read the complete metadata from the static page, and browsers without JavaScript still have a working link. Preserve existing `?object=` URLs and `?list=` behavior.

Pass the locale through to the app deep link (for example `?object=m31&lang=sv`) and let the app honor that optional `lang` parameter; old links without it must continue to use the saved/default language. The preview URL itself remains the canonical/Open Graph URL for its locale, so each shared route has stable metadata and cache identity.

## Verification for the implementation step

- The production build emits a preview page for every ID accepted by the share action, including reviewed candidate objects.
- Raw HTML for representative English and Swedish objects contains escaped localized title/description, absolute Open Graph/Twitter URLs and the correct canonical preview URL. Candidate metadata never describes a candidate as confirmed.
- Only manifest-approved local images are referenced; the image route and dimensions are valid, and any CC BY-SA image has visible attribution and license links.
- Existing `?object=` deep links and `?list=` share/import flows continue to work. Opening a preview in a browser reaches the correct app object and language; the visible fallback works with JavaScript disabled.
- Chromium checks the landing page on desktop and mobile. Check the generated Pages artifact and deployed route. Platform previews can be cached; validate supported social crawlers and refresh their caches where a platform offers a debugger. Browser tests cannot guarantee every third-party platform's rendering.

This document records the technical recommendation only. It does not implement F-006 or authorize that implementation.
