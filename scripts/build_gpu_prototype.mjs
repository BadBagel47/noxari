import {build} from 'vite';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ref = 'unknown';
try {
  ref = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
  if (execFileSync('git', ['status', '--porcelain'], {cwd: root, encoding: 'utf8'}).trim()) ref += '+dirty';
} catch { /* A source archive may have no Git metadata. */ }
await build({
  configFile: false,
  root: path.join(root, 'labs/gpu-sky'),
  base: '/noxari/labs/gpu-sky/',
  publicDir: false,
  define: {__LAB_BUILD_REF__: JSON.stringify(ref)},
  build: {outDir: path.join(root, 'dist/labs/gpu-sky'), emptyOutDir: true, target: 'es2022'},
});
