"""F-075: Caldwell objects and deep-sky objects with established names, from the same pinned OpenNGC.

Selection (outside Messier, not Dup/NonEx rows):
  - every Caldwell object (identifier token "C 004" in NGC.csv, or the addendum's own C009/C014/C041/C099 rows): 109
  - every other object with an OpenNGC common name, except single stars/novae and galaxies fainter than V 13
Names: the first common name (or the NGC/IC/other designation when the common name is only a Greek-letter
abbreviation), Swedish names where an established one exists (SWEDISH below), and search aliases for every
designation: NGC/IC number, Caldwell ("C 4", "C4", "Caldwell 4"), all common names and OpenNGC identifiers.

Usage: python3 scripts/generate_named_deepsky.py [NGC.csv addendum.csv]
Output: src/generated/namedDeepSky.ts (CC BY-SA 4.0, adapted OpenNGC by Mattia Verga).
"""
import csv, hashlib, io, json, re, sys
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'be3cd6c5498806a2fbb2f7e0452ef802dbb02be0'  # same pin as scripts/generate_messier.py
BASE = f'https://raw.githubusercontent.com/mattiaverga/OpenNGC/{COMMIT}/database_files/'
CHECKSUMS = {'NGC.csv': '54abea0b57b0a103831bfc7a8e3a99a23acfbf4bb581fcf3d8af539cbb826c84',
             'addendum.csv': 'c93f983dda6780b76b7b2e9271a856a892627710148a982ee98101a54c642fdd'}

CONSTELLATIONS = dict(And='Andromeda', Ant='Antlia', Aps='Apus', Aqr='Aquarius', Aql='Aquila', Ara='Ara', Ari='Aries', Aur='Auriga',
  Boo='Boötes', Cae='Caelum', Cam='Camelopardalis', Cnc='Cancer', CVn='Canes Venatici', CMa='Canis Major', CMi='Canis Minor',
  Cap='Capricornus', Car='Carina', Cas='Cassiopeia', Cen='Centaurus', Cep='Cepheus', Cet='Cetus', Cha='Chamaeleon', Cir='Circinus',
  Col='Columba', Com='Coma Berenices', CrA='Corona Australis', CrB='Corona Borealis', Crv='Corvus', Crt='Crater', Cru='Crux',
  Cyg='Cygnus', Del='Delphinus', Dor='Dorado', Dra='Draco', Equ='Equuleus', Eri='Eridanus', For='Fornax', Gem='Gemini', Gru='Grus',
  Her='Hercules', Hor='Horologium', Hya='Hydra', Hyi='Hydrus', Ind='Indus', Lac='Lacerta', Leo='Leo', LMi='Leo Minor', Lep='Lepus',
  Lib='Libra', Lup='Lupus', Lyn='Lynx', Lyr='Lyra', Men='Mensa', Mic='Microscopium', Mon='Monoceros', Mus='Musca', Nor='Norma',
  Oct='Octans', Oph='Ophiuchus', Ori='Orion', Pav='Pavo', Peg='Pegasus', Per='Perseus', Phe='Phoenix', Pic='Pictor', Psc='Pisces',
  PsA='Piscis Austrinus', Pup='Puppis', Pyx='Pyxis', Ret='Reticulum', Sge='Sagitta', Sgr='Sagittarius', Sco='Scorpius', Scl='Sculptor',
  Sct='Scutum', Se1='Serpens (Caput)', Se2='Serpens (Cauda)', Ser='Serpens', Sex='Sextans', Tau='Taurus', Tel='Telescopium',
  Tri='Triangulum', TrA='Triangulum Australe', Tuc='Tucana', UMa='Ursa Major', UMi='Ursa Minor', Vel='Vela', Vir='Virgo',
  Vol='Volans', Vul='Vulpecula')
TYPES = {'G': ('Galaxy', 'galaxy', 'galax'), 'GGroup': ('Galaxy', 'galaxy group', 'galaxgrupp'),
  'GPair': ('Galaxy', 'interacting galaxy pair', 'samverkande galaxpar'), 'GTrpl': ('Galaxy', 'galaxy triplet', 'galaxtrio'),
  'GCl': ('Star cluster', 'globular star cluster', 'klotformig stjärnhop'), 'OCl': ('Star cluster', 'open star cluster', 'öppen stjärnhop'),
  'PN': ('Nebula', 'planetary nebula', 'planetarisk nebulosa'), 'Neb': ('Nebula', 'nebula', 'nebulosa'),
  'SNR': ('Nebula', 'supernova remnant', 'supernovarest'), 'Cl+N': ('Nebula', 'star cluster and nebula', 'stjärnhop och nebulosa'),
  'HII': ('Nebula', 'H II region', 'H II-region'), 'RfN': ('Nebula', 'reflection nebula', 'reflektionsnebulosa'),
  'EmN': ('Nebula', 'emission nebula', 'emissionsnebulosa'), 'DrkN': ('Nebula', 'dark nebula', 'mörk nebulosa'),
  '*Ass': ('Asterism', 'stellar grouping', 'stjärngruppering')}
SPECIAL = {'C014': ('Star cluster', 'pair of open star clusters', 'par av öppna stjärnhopar'),
           'Cl399': ('Asterism', 'asterism', 'asterism')}
# Established Swedish names (otherwise the English name is used in Swedish too).
SWEDISH = {'Iris Nebula': 'Irisnebulosan', 'Pelican Nebula': 'Pelikannebulosan', 'North America Nebula': 'Nordamerikanebulosan',
  'Cocoon Nebula': 'Kokongnebulosan', 'Double Cluster': 'Dubbelhopen i Perseus', 'Veil Nebula': 'Slöjnebulosan',
  'Helix Nebula': 'Helixnebulosan', 'Rosette Nebula': 'Rosettnebulosan', "Cat's Eye Nebula": 'Kattögenebulosan',
  'Eskimo Nebula': 'Eskimånebulosan', 'Cone Nebula': 'Konnebulosan', 'Bubble Nebula': 'Bubbelnebulosan',
  'Large Magellanic Cloud': 'Stora magellanska molnet', 'Small Magellanic Cloud': 'Lilla magellanska molnet',
  'Jewel Box': 'Smyckeskrinet', 'Carina Nebula': 'Carinanebulosan', 'Tarantula Nebula': 'Tarantelnebulosan',
  'Saturn Nebula': 'Saturnusnebulosan', 'Ghost of Jupiter': 'Jupiters spöke', 'Crescent Nebula': 'Halvmånenebulosan',
  'Fireworks Galaxy': 'Fyrverkerigalaxen', 'Whale Galaxy': 'Valgalaxen', 'Needle Galaxy': 'Nålgalaxen', 'Cave Nebula': 'Grottnebulosan',
  'Hyades': 'Hyaderna', 'Coalsack Nebula': 'Kolsäcken', 'Horsehead Nebula': 'Hästhuvudnebulosan', 'Flaming Star Nebula': 'Flammande stjärnans nebulosa',
  'Antennae Galaxies': 'Antenngalaxerna', 'Sculptor Galaxy': 'Skulptörgalaxen', 'Owl Cluster': 'Ugglehopen', 'Christmas Tree Cluster': 'Julgranshopen',
  "Stephan's Quintet": 'Stephans kvintett', "Brocchi's Cluster": 'Klädhängaren', 'Coathanger Asterism': 'Klädhängaren',
  'Omega Centauri': 'Omega Centauri', '47 Tuc Cluster': '47 Tucanae', 'Heart Nebula': 'Hjärtnebulosan', 'Soul Nebula': 'Själnebulosan',
  'Elephant Trunk Nebula': 'Elefantsnabelnebulosan', 'Pencil Nebula': 'Pennnebulosan', 'Blue Snowball': 'Blå snöbollen',
  'Little Gem': 'Lilla juvelen', 'Spindle Galaxy': 'Spolgalaxen', 'Sunflower Galaxy': 'Solrosgalaxen', 'Silver Coin': 'Silvermyntet'}
# Naked-eye or binocular objects whose magnitude OpenNGC does not give (or gives misleadingly for diffuse light).
GEAR = {'C014': 'eye', 'C041': 'eye', 'C099': 'eye', 'NGC3372': 'eye', 'NGC7000': 'binoculars', 'IC5070': 'telescope', 'NGC2070': 'binoculars'}
GREEK = re.compile(r'^(alf|bet|gam|del|eps|zet|eta|tet|iot|kap|lam|mu|nu|xi|omi|pi|rho|sig|tau|ups|phi|chi|psi|ome)\b', re.I)
NICE = {'47 Tuc Cluster': '47 Tucanae', 'h Persei Cluster': 'h Persei', 'chi Persei Cluster': 'chi Persei', '30 Dor Cluster': '30 Doradus'}


def verified(raw, expected):
    if hashlib.sha256(raw).hexdigest() != expected:
        raise SystemExit('Source checksum mismatch; review upstream changes before updating pins')
    return raw


def coords(value, declination=False):
    sign = -1 if value.startswith('-') else 1
    parts = [float(v) for v in value.lstrip('+-').split(':')]
    result = sign * (parts[0] + parts[1] / 60 + parts[2] / 3600)
    assert (-90 <= result <= 90) if declination else (0 <= result < 24)
    return round(result, 8)


def human_id(name):
    for prefix in ('NGC', 'IC', 'ESO', 'PGC', 'UGC', 'HCG', 'Mel', 'Cl'):
        match = re.fullmatch(prefix + r'0*(\d+)(.*)', name)
        if match:
            return f'{prefix} {int(match[1])}{match[2]}'.replace(' NED0', ' NED ')
    match = re.fullmatch(r'B0*(\d+)', name)
    return f'Barnard {int(match[1])}' if match else name


def caldwell(row):
    match = re.fullmatch(r'C0*(\d+)', row['Name'])
    if match:
        return int(match[1])
    found = [int(m[1]) for m in re.finditer(r'(?:^|,)\s*C 0*(\d{1,3})\s*(?=,|$)', row['Identifiers'] or '')]
    return found[0] if found else None


def magnitude(row):
    value = row['V-Mag'] or row['B-Mag']
    return float(value) if value else None


def main():
    rows = []
    for index, (filename, checksum) in enumerate(CHECKSUMS.items(), 1):
        raw = Path(sys.argv[index]).read_bytes() if len(sys.argv) > index else urlopen(BASE + filename, timeout=60).read()
        for row in csv.DictReader(io.StringIO(verified(raw, checksum).decode()), delimiter=';'):
            row['_file'] = filename
            rows.append(row)
    chosen = []
    for row in rows:
        if row['M'] or row['Type'] in ('Dup', 'NonEx'):
            continue
        number = caldwell(row)
        common = [name.strip() for name in (row['Common names'] or '').split(',') if name.strip()]
        if number is None:
            if not common or row['Type'] in ('*', 'Nova', '**', 'Other'):
                continue
            mag = magnitude(row)
            if row['Type'].startswith('G') and row['Type'] != 'GCl' and mag is not None and mag > 13:
                continue
        if row['Type'] not in TYPES and row['Name'] not in SPECIAL:
            print('skipped type', row['Type'], row['Name'], common)
            continue
        chosen.append((row, number, common))
    assert sorted(n for _, n, _ in chosen if n) == list(range(1, 110)), 'Every Caldwell object must be present exactly once'
    result = []
    for row, number, common in chosen:
        kind, subtype, subtype_sv = SPECIAL.get(row['Name'], TYPES.get(row['Type']))
        designation = human_id(row['Name']) if not re.fullmatch(r'C0*\d+', row['Name']) else f'Caldwell {number}'
        readable = [NICE.get(name, name) for name in common if name in NICE or not GREEK.match(name)]
        en = readable[0] if readable else designation
        sv = next((SWEDISH[name] for name in common if name in SWEDISH), SWEDISH.get(en, en))
        constellation = CONSTELLATIONS.get(row['Const'], row['Const'])
        aliases = [designation, row['Name'], *common, *readable]
        for prefix in ('NGC', 'IC'):
            aliases += [human_id(prefix + item.strip()) for item in (row[prefix] or '').split(',') if item.strip()]
        aliases += [item.strip() for item in (row['Identifiers'] or '').split(',') if item.strip() and not re.fullmatch(r'C 0*\d{4,}', item.strip())]
        if number:
            aliases += [f'C {number}', f'C{number}', f'Caldwell {number}', f'C {number:03d}']
        if sv != en:
            aliases.append(sv)
        aliases = sorted({alias for alias in aliases if alias and alias not in (en, sv)})
        mag = magnitude(row)
        band = 'V' if row['V-Mag'] else 'B' if row['B-Mag'] else 'V'
        gear = 'eye' if mag is not None and mag <= 5 else 'binoculars' if mag is not None and mag <= 8.5 and kind != 'Galaxy' else 'telescope'
        if kind == 'Galaxy' and mag is not None and mag <= 6:
            gear = 'eye'
        # Diffuse nebulae spread their light: an integrated magnitude ≤ 5 does not make them naked-eye objects.
        if kind == 'Nebula' and gear == 'eye':
            gear = 'binoculars'
        gear = GEAR.get(row['Name'], gear)
        color = {'Galaxy': '#b6d6ff', 'Nebula': '#ffc0aa', 'Star cluster': '#a6c9ff', 'Asterism': '#d3c2ef'}[kind]
        title = f'{en} ({designation})' if en != designation else en
        lead_en = f'{title} is {"an" if subtype[0] in "aeiou" or subtype.startswith("H II") else "a"} {subtype} in {constellation}.'
        lead_sv = f'{sv if sv != designation else designation}: {subtype_sv} i {constellation}.'
        tail = (' Caldwell ' + str(number) + ' in Patrick Moore’s list of bright deep-sky objects.') if number else ''
        tail_sv = (' Nummer ' + str(number) + ' i Patrick Moores Caldwell-lista över ljusa djuprymdsobjekt.') if number else ''
        extra = (' Its diffuse light makes a dark sky important.', ' Dess diffusa ljus gör mörk himmel viktig.') if kind in ('Galaxy', 'Nebula') else ('', '')
        source_url = f'https://github.com/mattiaverga/OpenNGC/blob/{COMMIT}/database_files/{row["_file"]}'
        entry = dict(id='dso-' + re.sub(r'[^a-z0-9]+', '-', row['Name'].lower()).strip('-'), en=en, sv=sv, kind=kind,
          subtype=subtype, subtypeSv=subtype_sv, constellation=constellation,
          distance='Not supplied by source', distanceSv='Uppgift saknas i källan',
          magnitude=f'{mag:.2f}'.rstrip('0').rstrip('.') if mag is not None else f'Not supplied ({band})',
          magnitudeSv=(f'{mag:.2f}'.rstrip('0').rstrip('.').replace('.', ',') if mag is not None else f'Uppgift saknas ({band})'),
          magnitudeBand=band, gear=gear,
          description=lead_en + tail + extra[0], descriptionSv=lead_sv + tail_sv + extra[1],
          position=dict(kind='fixed', raHours=coords(row['RA']), decDegrees=coords(row['Dec'], True)),
          aliases=aliases, references=[{'label': f'OpenNGC: {designation} (J2000, type, magnitude)', 'url': source_url}],
          color=color, size=4)
        if number:
            entry['caldwell'] = number
        result.append(entry)
    result.sort(key=lambda entry: (entry.get('caldwell', 999), entry['en']))
    ids = [entry['id'] for entry in result]
    assert len(ids) == len(set(ids))
    output = ROOT / 'src/generated/namedDeepSky.ts'
    header = ('// Generated by scripts/generate_named_deepsky.py (F-075). Adapted OpenNGC by Mattia Verga, CC BY-SA 4.0.\n'
              f'// OpenNGC commit: {COMMIT}. Caldwell objects and objects with established names outside Messier.\n'
              "import type {SpaceObject} from '../data';\n")
    output.write_text(header + 'export const namedDeepSkyObjects: SpaceObject[] = ' + json.dumps(result, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f'Wrote {len(result)} objects ({sum(1 for e in result if "caldwell" in e)} Caldwell)')


if __name__ == '__main__':
    main()
