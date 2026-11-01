export type ShareLanguage = 'en'|'sv';

export type ShareableObject = {
  id: string;
  en: string;
  sv: string;
  description: string;
  descriptionSv: string;
  kind?: string;
};

export type SharePreviewImage = {
  file: string;
  altEn: string;
  altSv: string;
  credit: string;
  sourceUrl: string;
  width: number;
  height: number;
};

export type SharePreviewRecord = {
  object: ShareableObject;
  language: ShareLanguage;
  image?: SharePreviewImage;
};

export const mayUseSharePreviewImage = (license: string) => license === 'Public domain';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!));

const conciseDescription = (value: string) => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 200) return normalized;
  const firstSentence = normalized.match(/^.{1,200}?[.!?](?:\s|$)/)?.[0].trim();
  if (firstSentence && firstSentence.length <= 200) return firstSentence;
  return `${normalized.slice(0, 197).replace(/\s+\S*$/, '')}…`;
};

const validId = (id: string) => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`Unsafe share object id: ${id}`);
  return id;
};

export function resolveShareLanguage(queryLanguage: string|null, savedLanguage: string|null): ShareLanguage {
  if (queryLanguage === 'en' || queryLanguage === 'sv') return queryLanguage;
  return savedLanguage === 'sv' ? 'sv' : 'en';
}

export function sharePreviewPath(language: ShareLanguage, id: string) {
  return `/noxari/share/${language}/${validId(id)}/`;
}

export function shareAppPath(language: ShareLanguage, id: string) {
  return `/noxari/?object=${encodeURIComponent(validId(id))}&lang=${language}`;
}

export function buildSharePreviewRecords<T extends ShareableObject>(objects: T[], candidates: T[], images: Map<string, SharePreviewImage>) {
  return [...objects, ...candidates].flatMap(object => (['en', 'sv'] as const).map(language => ({
    object,
    language,
    image: images.get(object.id),
  })));
}

export function createSharePreviewHtml(record: SharePreviewRecord, siteOrigin: string) {
  const {object, language, image} = record;
  const name = language === 'sv' ? object.sv : object.en;
  const description = conciseDescription(language === 'sv' ? object.descriptionSv : object.description);
  const title = `${name} — Noxari`;
  const canonical = new URL(sharePreviewPath(language, object.id), siteOrigin).toString();
  const appPath = shareAppPath(language, object.id);
  const appUrl = new URL(appPath, siteOrigin).toString();
  const langLocale = language === 'sv' ? 'sv_SE' : 'en_US';
  const imageUrl = image ? new URL(`/noxari/images/objects/${image.file}`, siteOrigin).toString() : null;
  const cardType = imageUrl ? 'summary_large_image' : 'summary';
  const imageTags = image && imageUrl ? `
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="${image.width}">
  <meta property="og:image:height" content="${image.height}">
  <meta property="og:image:alt" content="${escapeHtml(language === 'sv' ? image.altSv : image.altEn)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta name="twitter:image:alt" content="${escapeHtml(language === 'sv' ? image.altSv : image.altEn)}">` : '';
  const imageFigure = image && imageUrl ? `
      <figure>
        <img src="${escapeHtml(imageUrl)}" width="${image.width}" height="${image.height}" alt="${escapeHtml(language === 'sv' ? image.altSv : image.altEn)}">
        <figcaption>${language === 'sv' ? 'Bild' : 'Image'}: ${escapeHtml(image.credit)} · <a href="${escapeHtml(image.sourceUrl)}" rel="noopener noreferrer">${language === 'sv' ? 'källa' : 'source'}</a></figcaption>
      </figure>` : '';
  const openLabel = language === 'sv' ? 'Öppna i Noxari' : 'Open in Noxari';
  const openingMessage = language === 'sv' ? 'Öppnar objektet i Noxari…' : 'Opening this object in Noxari…';
  const descriptionLabel = language === 'sv' ? 'En beräknad vy av natthimlen.' : 'A calculated view of the night sky.';

  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#07101f">
  <title>${escapeHtml(title)}</title>
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="alternate" hreflang="en" href="${escapeHtml(new URL(sharePreviewPath('en', object.id), siteOrigin).toString())}">
  <link rel="alternate" hreflang="sv" href="${escapeHtml(new URL(sharePreviewPath('sv', object.id), siteOrigin).toString())}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${langLocale}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">${imageTags}
  <meta name="twitter:card" content="${cardType}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <style>
    :root{color-scheme:dark;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#e8effb;background:#070f1d}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}
    main{width:min(100%,680px);padding:clamp(22px,5vw,42px);border:1px solid #304761;border-radius:20px;background:#101e30;box-shadow:0 24px 70px #0007}
    .brand{margin-bottom:28px;color:#9bd8fb;font-size:13px;font-weight:750;letter-spacing:.14em;text-transform:uppercase}
    h1{margin:0;font-size:clamp(30px,7vw,48px);letter-spacing:-.04em;line-height:1.08}p{color:#b9cbe0;line-height:1.65}
    figure{margin:24px 0 0}img{display:block;width:100%;height:auto;max-height:440px;object-fit:contain;border-radius:12px;background:#07101f}figcaption{margin-top:9px;color:#a7bad1;font-size:12px}a{color:#a7dcfb}
    .actions{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:24px}.open{display:inline-block;padding:12px 17px;border-radius:9px;background:#8bd1f5;color:#071522;font-weight:750;text-decoration:none}.fallback{font-size:13px}
    @media(prefers-reduced-motion:no-preference){.open{transition:filter .15s}.open:hover{filter:brightness(1.08)}}
  </style>
</head>
<body>
  <main>
    <div class="brand">Noxari · ${descriptionLabel}</div>
    <h1>${escapeHtml(name)}</h1>
    <p>${escapeHtml(description)}</p>${imageFigure}
    <div class="actions"><a class="open" href="${escapeHtml(appUrl)}">${openLabel}</a><span class="fallback" role="status">${openingMessage}</span></div>
  </main>
  <script>window.setTimeout(function(){window.location.replace(${JSON.stringify(appPath)})},250)</script>
</body>
</html>
`;
}
