import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {execFileSync} from 'node:child_process';

let build = {commit: 'unknown', dirty: false};
try {
  build = {commit: execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {encoding: 'utf8'}).trim(),
    dirty: Boolean(execFileSync('git', ['status', '--porcelain'], {encoding: 'utf8'}).trim())};
} catch { /* Source archives can have no Git metadata. */ }

// GitHub Pages serves this repository from /noxari/.
export default defineConfig({
  plugins: [react()],
  base: '/noxari/',
  define: {__NOXARI_BUILD__: JSON.stringify(build)},
});
