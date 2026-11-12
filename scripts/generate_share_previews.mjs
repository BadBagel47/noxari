import {readFile, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const siteOrigin = process.env.NOXARI_SITE_ORIGIN || 'https://badbagel47.github.io';
const basePath = process.env.NOXARI_BASE_PATH || '/noxari/';

function jpegDimensions(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Share image is not a JPEG');
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset++; continue; }
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) break;
    if (startOfFrame.has(marker)) return {height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5)};
    offset += length;
  }
  throw new Error('Could not read dimensions from share JPEG');
}

const server = await createServer({
  root,
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  server: {middlewareMode: true, hmr: false},
});

try {
  const [{objects}, {candidateObjects}, {buildSharePreviewRecords, createSharePreviewHtml, mayUseSharePreviewImage}] = await Promise.all([
    server.ssrLoadModule('/src/data.ts'),
    server.ssrLoadModule('/src/candidateObjects.ts'),
    server.ssrLoadModule('/src/sharePreview.ts'),
  ]);
  const imageManifest = JSON.parse(await readFile(path.join(root, 'data/object-images.json'), 'utf8'));
  const images = new Map();
  for (const image of imageManifest) {
    // Link previews (og:image) use the original JPEG thumbnails only; F-048 WebP photos stay in the app.
    if (!mayUseSharePreviewImage(image.license) || !/\.jpe?g$/i.test(image.file)) continue;
    const file = path.basename(image.file);
    const assetPath = path.join(root, 'public/images/objects', file);
    const dimensions = jpegDimensions(await readFile(assetPath));
    images.set(image.id, {...image, file, ...dimensions});
  }

  const records = buildSharePreviewRecords(objects, candidateObjects, images);
  for (const record of records) {
    const html = createSharePreviewHtml(record, siteOrigin, basePath);
    const output = path.join(dist, 'share', record.language, record.object.id, 'index.html');
    await mkdir(path.dirname(output), {recursive: true});
    await writeFile(output, html);
  }
  console.log(`Generated ${records.length} localized share-preview pages for ${objects.length + candidateObjects.length} objects.`);
} finally {
  await server.close();
}
