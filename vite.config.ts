import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {execFileSync} from 'node:child_process';

let build = {commit: 'unknown', dirty: false};
try {
  build = {commit: execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {encoding: 'utf8'}).trim(),
    dirty: Boolean(execFileSync('git', ['status', '--porcelain'], {encoding: 'utf8'}).trim())};
} catch { /* Source archives can have no Git metadata. */ }

// Keep the repository-path default for GitHub Pages until the custom-domain cutover.
// Set NOXARI_BASE_PATH=/ and NOXARI_SITE_ORIGIN=https://noxari.trythis.one to build for the custom domain.
export default defineConfig({
  plugins: [react()],
  base: process.env.NOXARI_BASE_PATH || '/noxari/',
  define: {__NOXARI_BUILD__: JSON.stringify(build)},
});
