import type {SpaceObject} from './data';

// A reviewed extra collection. JPL SBDB orbit solution #2 was issued
// 2026-10-29, with epoch JD 2461200.5 (2026-10-31 TDB).
export const candidateObjects: SpaceObject[] = [{
  id: '2026-ed138',
  en: '2026 ED138 (dwarf planet candidate)',
  sv: '2026 ED138 (dvärgplanetkandidat)',
  kind: 'Dwarf planet candidate',
  constellation: 'Varies',
  distance: 'About 47 AU from Earth (Oct 2026)',
  distanceSv: 'Cirka 47 AE från jorden (okt 2026)',
  magnitude: 'About 19.8 (Oct 2026)',
  magnitudeSv: 'Cirka 19,8 (okt 2026)',
  gear: 'telescope',
  description: 'A trans-Neptunian object identified as a dwarf planet candidate by the Rubin Observatory team. Its orbit is calculated from a preliminary JPL solution and its position changes with the selected date. The estimated 600–1,500 km size depends on assumed reflectivity; infrared observations are needed to constrain its size and confirm dwarf-planet status. At about magnitude 19.8 in October 2026, it is far too faint for the unaided eye.',
  descriptionSv: 'Ett transneptunskt objekt som Rubinobservatoriets forskargrupp identifierat som dvärgplanetkandidat. Banan beräknas från en preliminär JPL-lösning och positionen ändras med vald tid. Storleksuppskattningen 600–1 500 km beror på antagen reflektionsförmåga; infraröda observationer behövs för att begränsa storleken och bekräfta dvärgplanetstatus. Vid cirka magnitud 19,8 i oktober 2026 är det alldeles för svagt för blotta ögat.',
  catalogNote: 'Candidate, not a confirmed dwarf planet. Orbit is a two-body approximation from JPL SBDB solution #2 (2026-10-29); small-body perturbations are not modeled by this app. Near the current epoch its declination is about −42°, so it never rises from Stockholm; a location south of roughly 48°N is needed to see it above the geometric horizon.',
  catalogNoteSv: 'Kandidat, inte en bekräftad dvärgplanet. Banan är en tvåkropparsapproximation från JPL SBDB-lösning 2 (2026-10-29); appen modellerar inte småkroppsstörningar. Nära aktuell epok är deklinationen cirka −42°, så den går inte upp över Stockholms horisont; en plats söder om ungefär 48°N behövs för att se den över den geometriska horisonten.',
  references: [
    {label: 'Rubin Observatory: dwarf planet candidate', url: 'https://rubinobservatory.org/news/rubin-first-dwarf-planet-candidate'},
    {label: 'JPL Small-Body Database: 2026 ED138', url: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=2026%20ED138'},
  ],
  aliases: ['ED138', '2026 ED 138'],
  position: {
    kind: 'keplerian',
    epochJD: 2461200.5,
    semiMajorAxisAu: 42.94869526572302,
    eccentricity: 0.1417448328770402,
    inclinationDegrees: 24.47104038674766,
    ascendingNodeDegrees: 322.5008984905298,
    argumentOfPerihelionDegrees: 167.9532328404424,
    meanAnomalyDegrees: 128.3342024098231,
    meanMotionDegreesPerDay: 0.003501701413101125,
  },
  color: '#d2b8ff',
  size: 5,
}];
