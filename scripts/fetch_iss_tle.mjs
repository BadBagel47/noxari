// F-032: fetch current ISS orbital elements (CelesTrak GP data) at build time into dist/data/iss-tle.json.
// CelesTrak does not allow direct browser requests (no CORS), so elements are as fresh as the latest
// deploy; the app shows their age and warns when they are old. Fails softly: the app then reports
// that pass data is unavailable.
import {mkdirSync, writeFileSync} from 'node:fs';

const url = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';
const out = new URL('../dist/data/', import.meta.url).pathname;
try {
  const response = await fetch(url, {headers: {'user-agent': 'noxari-build'}});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const [name, line1, line2] = (await response.text()).trim().split(/\r?\n/).map(line => line.trim());
  if (!line1?.startsWith('1 ') || !line2?.startsWith('2 ')) throw new Error('unexpected TLE format');
  mkdirSync(out, {recursive: true});
  writeFileSync(out + 'iss-tle.json', JSON.stringify({name, line1, line2, fetchedAt: new Date().toISOString(), source: 'CelesTrak GP data', sourceUrl: url}) + '\n');
  console.log('ISS elements:', name);
} catch (error) {
  console.warn('ISS elements unavailable:', error.message);
}
