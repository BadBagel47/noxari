import type {SpaceObject} from './data';

// Confirmed dwarf planets and one prominent asteroid. Keplerian elements are
// reviewed JPL SBDB snapshots at JD 2461200.5 (2026-06-09 TDB). Pluto uses
// Astronomy Engine's integrated Pluto ephemeris instead of a two-body orbit.
const jpl = (designation: string) => `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(designation)}`;
const iau = {label: 'IAU: dwarf planet definition and recognized bodies', url: 'https://www.iau.org/public/themes/pluto/'};

export const majorSmallBodies: SpaceObject[] = [
  {
    id: 'ceres', en: 'Ceres', sv: 'Ceres', aliases: ['1 Ceres'], kind: 'Dwarf planet',
    constellation: 'Varies', distance: 'Varies with date', magnitude: 'Variable', gear: 'binoculars',
    description: 'The only recognized dwarf planet in the asteroid belt and its largest body. NASA’s Dawn spacecraft studied Ceres from orbit. Its position, distance and estimated brightness update with the selected time.',
    descriptionSv: 'Den enda erkända dvärgplaneten i asteroidbältet och dess största himlakropp. NASA:s rymdfarkost Dawn undersökte Ceres från omloppsbana. Position, avstånd och uppskattad ljusstyrka ändras med vald tid.',
    catalogNote: 'Confirmed dwarf planet. Position uses JPL SBDB osculating orbit solution #48 at epoch JD 2461200.5 (2026-06-09 TDB); this two-body propagation omits planetary perturbations. Brightness uses the catalog H–G phase model.',
    catalogNoteSv: 'Bekräftad dvärgplanet. Positionen bygger på JPL SBDB:s svängningsbana, lösning 48 med epok JD 2461200.5 (2026-06-09 TDB); tvåkroppsberäkningen tar inte med planetstörningar. Ljusstyrkan använder katalogens H–G-fasmodell.',
    position: {kind: 'keplerian', epochJD: 2461200.5, semiMajorAxisAu: 2.765552595034094, eccentricity: 0.07969229514816586, inclinationDegrees: 10.58802780183462, ascendingNodeDegrees: 80.24862682043221, argumentOfPerihelionDegrees: 73.29421453021587, meanAnomalyDegrees: 274.4193463761342, meanMotionDegreesPerDay: 0.21430445064843, absoluteMagnitude: 3.34, phaseSlope: 0.12, jplSolutionId: '48'},
    references: [iau, {label: 'JPL Small-Body Database: 1 Ceres', url: jpl('1 Ceres')}],
    color: '#d8c8a3', size: 7,
  },
  {
    id: 'pluto', en: 'Pluto', sv: 'Pluto', aliases: ['134340 Pluto'], kind: 'Dwarf planet',
    constellation: 'Varies', distance: 'Varies with date', magnitude: 'Variable', gear: 'telescope',
    description: 'A trans-Neptunian dwarf planet with a complex system of moons. Its position and estimated appearance update with the selected time.',
    descriptionSv: 'En transneptunsk dvärgplanet med ett komplext system av månar. Position och uppskattat utseende ändras med vald tid.',
    catalogNote: 'Confirmed dwarf planet. The position and illumination use Astronomy Engine’s integrated Pluto ephemeris; apparent brightness is a model and does not account for observing conditions.',
    catalogNoteSv: 'Bekräftad dvärgplanet. Position och belysning använder Astronomy Engines integrerade Pluto-efemerid; skenbar ljusstyrka är en modell som inte tar hänsyn till observationsförhållanden.',
    position: {kind: 'solar', body: 'Pluto'},
    references: [iau, {label: 'JPL Small-Body Database: Pluto', url: jpl('134340 Pluto')}],
    color: '#cbb6a4', size: 6,
  },
  {
    id: 'eris', en: 'Eris', sv: 'Eris', aliases: ['136199 Eris'], kind: 'Dwarf planet',
    constellation: 'Varies', distance: 'Varies with date', magnitude: 'Variable', gear: 'telescope',
    description: 'A distant trans-Neptunian dwarf planet, slightly smaller than Pluto but more massive. Its position and estimated brightness update with the selected time.',
    descriptionSv: 'En avlägsen transneptunsk dvärgplanet, något mindre än Pluto men mer massiv. Position och uppskattad ljusstyrka ändras med vald tid.',
    catalogNote: 'Confirmed dwarf planet. Position uses JPL SBDB osculating orbit solution #103 at epoch JD 2461200.5 (2026-06-09 TDB), propagated as a two-body approximation. The magnitude estimate uses absolute magnitude H and ignores phase effects.',
    catalogNoteSv: 'Bekräftad dvärgplanet. Positionen bygger på JPL SBDB:s svängningsbana, lösning 103 med epok JD 2461200.5 (2026-06-09 TDB), beräknad som en tvåkroppsapproximation. Magnituden uppskattas från den absoluta magnituden H utan fasjustering.',
    position: {kind: 'keplerian', epochJD: 2461200.5, semiMajorAxisAu: 67.93394687853566, eccentricity: 0.4382385347971672, inclinationDegrees: 43.9258279471791, ascendingNodeDegrees: 36.00477044417249, argumentOfPerihelionDegrees: 150.7949235840312, meanAnomalyDegrees: 211.774434275007, meanMotionDegreesPerDay: 0.001760247770619088, absoluteMagnitude: -1.26, jplSolutionId: '103'},
    references: [iau, {label: 'JPL Small-Body Database: Eris', url: jpl('136199 Eris')}],
    color: '#d8e0eb', size: 6,
  },
  {
    id: 'haumea', en: 'Haumea', sv: 'Haumea', aliases: ['136108 Haumea'], kind: 'Dwarf planet',
    constellation: 'Varies', distance: 'Varies with date', magnitude: 'Variable', gear: 'telescope',
    description: 'A rapidly rotating, elongated dwarf planet beyond Neptune. Its position and estimated brightness update with the selected time.',
    descriptionSv: 'En snabbt roterande, avlång dvärgplanet bortom Neptunus. Position och uppskattad ljusstyrka ändras med vald tid.',
    catalogNote: 'Confirmed dwarf planet. Position uses JPL SBDB osculating orbit solution #132 at epoch JD 2461200.5 (2026-06-09 TDB), propagated as a two-body approximation. The magnitude estimate uses absolute magnitude H and ignores phase effects.',
    catalogNoteSv: 'Bekräftad dvärgplanet. Positionen bygger på JPL SBDB:s svängningsbana, lösning 132 med epok JD 2461200.5 (2026-06-09 TDB), beräknad som en tvåkroppsapproximation. Magnituden uppskattas från den absoluta magnituden H utan fasjustering.',
    position: {kind: 'keplerian', epochJD: 2461200.5, semiMajorAxisAu: 43.06029023650952, eccentricity: 0.1944430148898797, inclinationDegrees: 28.20847393040364, ascendingNodeDegrees: 121.7860561329425, argumentOfPerihelionDegrees: 240.6905472508661, meanAnomalyDegrees: 223.2104118812299, meanMotionDegreesPerDay: 0.003488097731816818, absoluteMagnitude: 0.14, jplSolutionId: '132'},
    references: [iau, {label: 'JPL Small-Body Database: Haumea', url: jpl('136108 Haumea')}],
    color: '#cad4ed', size: 6,
  },
  {
    id: 'makemake', en: 'Makemake', sv: 'Makemake', aliases: ['136472 Makemake'], kind: 'Dwarf planet',
    constellation: 'Varies', distance: 'Varies with date', magnitude: 'Variable', gear: 'telescope',
    description: 'A distant dwarf planet in the Kuiper belt. Its position and estimated brightness update with the selected time.',
    descriptionSv: 'En avlägsen dvärgplanet i Kuiperbältet. Position och uppskattad ljusstyrka ändras med vald tid.',
    catalogNote: 'Confirmed dwarf planet. Position uses JPL SBDB osculating orbit solution #130 at epoch JD 2461200.5 (2026-06-09 TDB), propagated as a two-body approximation. The magnitude estimate uses absolute magnitude H and ignores phase effects.',
    catalogNoteSv: 'Bekräftad dvärgplanet. Positionen bygger på JPL SBDB:s svängningsbana, lösning 130 med epok JD 2461200.5 (2026-06-09 TDB), beräknad som en tvåkroppsapproximation. Magnituden uppskattas från den absoluta magnituden H utan fasjustering.',
    position: {kind: 'keplerian', epochJD: 2461200.5, semiMajorAxisAu: 45.57093317300052, eccentricity: 0.1588889953992523, inclinationDegrees: 29.02785603743067, ascendingNodeDegrees: 79.2948338209406, argumentOfPerihelionDegrees: 297.0922733397207, meanAnomalyDegrees: 169.9379962048232, meanMotionDegreesPerDay: 0.003203850120050116, absoluteMagnitude: -0.25, jplSolutionId: '130'},
    references: [iau, {label: 'JPL Small-Body Database: Makemake', url: jpl('136472 Makemake')}],
    color: '#e4c7a6', size: 6,
  },
  {
    id: 'vesta', en: 'Vesta', sv: 'Vesta', aliases: ['4 Vesta'], kind: 'Asteroid',
    constellation: 'Varies', distance: 'Varies with date', magnitude: 'Variable', gear: 'binoculars',
    description: 'One of the largest asteroids in the main belt and occasionally visible to the unaided eye under dark skies. Its position and estimated brightness update with the selected time.',
    descriptionSv: 'En av de största asteroiderna i huvudbältet och ibland synlig för blotta ögat under mörk himmel. Position och uppskattad ljusstyrka ändras med vald tid.',
    catalogNote: 'Asteroid, not a dwarf planet. Position uses JPL SBDB osculating orbit solution #36 at epoch JD 2461200.5 (2026-06-09 TDB); this two-body propagation omits planetary perturbations. Brightness uses the catalog H–G phase model.',
    catalogNoteSv: 'Asteroid, inte dvärgplanet. Positionen bygger på JPL SBDB:s svängningsbana, lösning 36 med epok JD 2461200.5 (2026-06-09 TDB); tvåkroppsberäkningen tar inte med planetstörningar. Ljusstyrkan använder katalogens H–G-fasmodell.',
    position: {kind: 'keplerian', epochJD: 2461200.5, semiMajorAxisAu: 2.361365965127599, eccentricity: 0.09020374382834395, inclinationDegrees: 7.143925545058711, ascendingNodeDegrees: 103.701293265032, argumentOfPerihelionDegrees: 151.4686478221564, meanAnomalyDegrees: 81.19015607686903, meanMotionDegreesPerDay: 0.2716183613599909, absoluteMagnitude: 3.25, phaseSlope: 0.32, jplSolutionId: '36'},
    references: [{label: 'JPL Small-Body Database: 4 Vesta', url: jpl('4 Vesta')}],
    color: '#e1c49d', size: 6,
  },
];
