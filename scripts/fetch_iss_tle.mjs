// F-032: fetch current ISS orbital elements (CelesTrak GP data) at build time into dist/data/iss-tle.json.
// The app also refreshes the elements itself from CelesTrak (F-042, CORS allowed); this build copy
// is the offline/first-visit fallback. Fails softly: the app then reports that pass data is unavailable.
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

// F-055: bright satellites (CelesTrak "visual" group) for the moving-satellite layer; same fallback role.
const visualUrl = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=TLE';
try {
  const response = await fetch(visualUrl, {headers: {'user-agent': 'noxari-build'}});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const lines = (await response.text()).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const satellites = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].startsWith('1 ') || !lines[i + 1].startsWith('2 ')) continue;
    const norad = Number(lines[i].slice(2, 7));
    if (norad !== 25544) satellites.push({name: (lines[i - 1] ?? `NORAD ${norad}`).replace(/\s+/g, ' '), norad, line1: lines[i], line2: lines[i + 1]});
    i++;
  }
  if (satellites.length < 10) throw new Error('unexpected TLE format');
  mkdirSync(out, {recursive: true});
  writeFileSync(out + 'visual-tle.json', JSON.stringify({fetchedAt: new Date().toISOString(), source: 'CelesTrak GP data (visual)', sourceUrl: visualUrl, satellites}) + '\n');
  console.log('Bright satellites:', satellites.length);
} catch (error) {
  console.warn('Satellite elements unavailable:', error.message);
}
