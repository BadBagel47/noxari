"""Generate 110 Messier entries from pinned OpenNGC data and NASA distance facts.

Usage: python3 scripts/generate_messier.py [NGC.csv addendum.csv]
No third-party Python dependencies. Generated adaptation: CC BY-SA 4.0.
"""
import csv
import hashlib
import io
import json
import re
import sys
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'be3cd6c5498806a2fbb2f7e0452ef802dbb02be0'
BASE = f'https://raw.githubusercontent.com/mattiaverga/OpenNGC/{COMMIT}/database_files/'
CHECKSUMS = {'NGC.csv': '54abea0b57b0a103831bfc7a8e3a99a23acfbf4bb581fcf3d8af539cbb826c84',
             'addendum.csv': 'c93f983dda6780b76b7b2e9271a856a892627710148a982ee98101a54c642fdd'}
DISTANCES_SHA = 'c7ebeb9fe4e74c70e3cd0aacc86d7ac40e3e08cc389408bfce7cc2b39d8b9d5a'
CONSTELLATIONS = dict(And='Andromeda', Aqr='Aquarius', Aur='Auriga', CMa='Canis Major', CVn='Canes Venatici',
 Cap='Capricornus', Cas='Cassiopeia', Cet='Cetus', Cnc='Cancer', Com='Coma Berenices', Cyg='Cygnus', Dra='Draco',
 Gem='Gemini', Her='Hercules', Hya='Hydra', Leo='Leo', Lep='Lepus', Lyr='Lyra', Mon='Monoceros', Oph='Ophiuchus',
 Ori='Orion', Peg='Pegasus', Per='Perseus', Psc='Pisces', Pup='Puppis', Sco='Scorpius', Sct='Scutum',
 Se1='Serpens (Caput)', Se2='Serpens (Cauda)', Sge='Sagitta', Sgr='Sagittarius', Tau='Taurus', Tri='Triangulum', UMa='Ursa Major', Vir='Virgo', Vul='Vulpecula')
TYPES = {'G': ('Galaxy','galaxy','galax'), 'GCl': ('Star cluster','globular star cluster','klotformig stjärnhop'),
 'OCl': ('Star cluster','open star cluster','öppen stjärnhop'), 'PN': ('Nebula','planetary nebula','planetarisk nebulosa'),
 'Neb': ('Nebula','nebula','nebulosa'), 'SNR': ('Nebula','supernova remnant','supernovarest'),
 'Cl+N': ('Nebula','star cluster and nebula','stjärnhop och nebulosa'), 'HII': ('Nebula','H II region','H II-region'),
 'RfN': ('Nebula','reflection nebula','reflektionsnebulosa'), '**': ('Double star','cataloged double star','katalogiserad dubbelstjärna')}
NAMES = {1: ('Crab Nebula','Krabbnebulosan'), 8: ('Lagoon Nebula','Lagunnebulosan'),
 13: ('Hercules Globular Cluster','Herkuleshopen'), 24: ('Small Sagittarius Star Cloud','Lilla stjärnmolnet i Skytten'),
 27: ('Dumbbell Nebula','Hantelnebulosan'), 31: ('Andromeda Galaxy','Andromedagalaxen'), 33: ('Triangulum Galaxy','Triangelgalaxen'),
 42: ('Orion Nebula','Orionnebulosan'), 44: ('Beehive Cluster','Praesepe'), 45: ('Pleiades','Plejaderna'),
 51: ('Whirlpool Galaxy','Virvelgalaxen'), 57: ('Ring Nebula','Ringnebulosan'), 81: ("Bode’s Galaxy",'Bodes galax'),
 82: ('Cigar Galaxy','Cigarrgalaxen'), 97: ('Owl Nebula','Ugglenebulosan'), 101: ('Pinwheel Galaxy','Messier 101'),
 102: ('Messier 102 (NGC 5866)','Messier 102 (NGC 5866)'), 104: ('Sombrero Galaxy','Sombrerogalaxen')}
SPECIAL_NOTES = {
24: ('A Milky Way star cloud, not the small cluster NGC 6603 within it. The catalog center is a pointing reference; the field contains stars at many distances.', 'Ett stjärnmoln i Vintergatan, inte den lilla hopen NGC 6603 inuti området. Katalogens centrum används som riktningspunkt; fältet innehåller stjärnor på många avstånd.'),
40: ('A cataloged pair of stars, not a star cluster. No common distance is assigned. The combined V magnitude is left unverified rather than adopting the uncertain pair value.', 'Ett katalogiserat stjärnpar, inte en stjärnhop. Inget gemensamt avstånd anges. Stjärnparets sammanlagda V-magnitud lämnas som ej verifierad.'),
73: ('OpenNGC classifies this as Other and notes four Galactic stars. It is grouped here as an asterism; a common physical distance is not assumed.', 'OpenNGC klassificerar detta som Other och anger fyra stjärnor i Vintergatan. Här grupperas objektet som en asterism; ett gemensamt fysiskt avstånd antas inte.'),
102: ('Identification disputed. OpenNGC’s M102 addendum treats it as a duplicate of M101. This entry instead follows NASA/Hubble’s adopted NGC 5866 identification. Coordinates and V magnitude refer to NGC 5866, not an undisputed historical identification.', 'Omstridd identifiering. OpenNGC:s M102-tillägg behandlar objektet som en dubblett av M101. Denna post följer i stället NASA/Hubbles identifiering NGC 5866. Koordinater och V-magnitud gäller NGC 5866, inte en entydigt fastställd historisk identifiering.')}

def verified(raw, expected):
    if hashlib.sha256(raw).hexdigest() != expected:
        raise SystemExit('Source checksum mismatch; review upstream changes before updating pins')
    return raw

def coords(value, declination=False):
    sign = -1 if value.startswith('-') else 1
    parts = [float(v) for v in value.lstrip('+-').split(':')]
    assert len(parts) == 3
    result = sign * (parts[0] + parts[1]/60 + parts[2]/3600)
    assert -90 <= result <= 90 if declination else 0 <= result < 24
    return round(result, 8)

def human_id(name):
    match = re.fullmatch(r'(NGC|IC|M)0*(\d+)(.*)', name)
    return f'{match[1]} {int(match[2])}{match[3]}' if match else name

def description(kind, subtype, subtype_sv, number, constellation):
    article = 'an' if subtype[0].lower() in 'aeiou' or subtype.startswith('H II') else 'a'
    en = f'Messier {number} is {article} {subtype} in {constellation}.'
    sv = f'Messier {number}: {subtype_sv} i {constellation}.'
    if kind == 'Galaxy':
        return en + ' Its extended light makes dark skies important; integrated magnitude does not describe surface brightness.', sv + ' Dess utbredda ljus gör mörk himmel viktig; totalmagnituden beskriver inte ytljusstyrkan.'
    if subtype == 'globular star cluster':
        return en + ' Resolving individual stars depends on telescope aperture and observing conditions.', sv + ' Möjligheten att urskilja enskilda stjärnor beror på teleskopets öppning och observationsförhållandena.'
    if kind == 'Nebula':
        return en + ' Its diffuse light makes sky darkness and appropriate optical equipment important.', sv + ' Dess diffusa ljus gör mörk himmel och lämplig optisk utrustning viktiga.'
    return en + ' A detailed star chart helps identify it among the surrounding stars.', sv + ' En detaljerad stjärnkarta hjälper dig att identifiera objektet bland de omgivande stjärnorna.'


def main():
    rows, by_name, records = [], {}, {}
    for index, (filename, checksum) in enumerate(CHECKSUMS.items(), 1):
        raw = Path(sys.argv[index]).read_bytes() if len(sys.argv) > index else urlopen(BASE + filename, timeout=60).read()
        for row in csv.DictReader(io.StringIO(verified(raw, checksum).decode()), delimiter=';'):
            row['_file'] = filename; rows.append(row); by_name[row['Name']] = row
            if row['M'] and row['Type'] != 'Dup':
                number = int(row['M'])
                if number in records: raise SystemExit(f'Duplicate M{number}')
                records[number] = row
    assert set(records) == set(range(1,111)) - {102}, 'Review Messier mapping changes'
    records[102] = by_name['NGC5866']
    facts_raw = verified((ROOT / 'data/messier-distances.json').read_bytes(), DISTANCES_SHA)
    distances = json.loads(facts_raw)['distances']
    result = []
    for number in range(1,111):
        row = records[number]
        if number == 24: kind, subtype, subtype_sv = 'Star cloud', 'Milky Way star cloud', 'stjärnmoln i Vintergatan'
        elif number == 73: kind, subtype, subtype_sv = 'Asterism', 'four-star asterism', 'asterism med fyra stjärnor'
        else: kind, subtype, subtype_sv = TYPES[row['Type']]
        constellation = CONSTELLATIONS[row['Const']]
        common = [name.strip() for name in row['Common names'].split(',') if name.strip()]
        en, sv = NAMES.get(number, (common[0] if common else f'Messier {number}', f'Messier {number}'))
        aliases = [f'M{number}', f'M {number}', f'M{number:03d}', f'Messier {number}', row['Name'], human_id(row['Name']), *common]
        for prefix in ['NGC','IC']:
            aliases += [human_id(prefix + item.strip()) for item in row[prefix].split(',') if item.strip()]
        aliases += [item.strip() for item in row['Identifiers'].split(',') if item.strip()]
        if number == 76: aliases += ['NGC 651']
        if number == 102: aliases += ['Spindle Galaxy']
        # Never import another Messier identity through an alias/duplicate row.
        aliases = [a for a in aliases if not re.fullmatch(r'(?:M|MESSIER)\s*0*(\d+)',a,re.I) or int(re.fullmatch(r'(?:M|MESSIER)\s*0*(\d+)',a,re.I)[1]) == number]
        aliases = sorted(set(aliases))
        source_url = f'https://github.com/mattiaverga/OpenNGC/blob/{COMMIT}/database_files/{row["_file"]}'
        references = [{'label': f'OpenNGC: {human_id(row["Name"])} (J2000, type, V)', 'url': source_url}]
        distance, distance_sv = 'Not supplied by source', 'Uppgift saknas i källan'
        fact = distances.get(str(number))
        if fact and number not in [24,40,73]:
            raw = re.sub(r'^(About\s+|~\s*)', '', fact['value'], flags=re.I)
            distance = '~' + raw
            distance_sv = '~' + raw.replace(',', ' ').replace('.', ',').replace('million', 'miljoner').replace('billion', 'miljarder').replace('thousand', 'tusen').replace('light-years', 'ljusår').replace('light years','ljusår')
            references.append({'label':'NASA/Hubble: approximate distance' + (' and adopted identification' if number == 102 else ''), 'url':fact['sourceUrl']})
        if number in [24,40,73]: distance, distance_sv = 'No single distance assigned', 'Inget enskilt avstånd anges'
        magnitude = row['V-Mag'] if row['V-Mag'] and number != 40 else None
        if magnitude is not None: assert -10 < float(magnitude) < 30
        gear = 'binoculars' if row['Type'] == 'OCl' or number in [3,4,5,8,13,17,22,24,27,33,92] else 'telescope'
        if number in [31,42,44,45]: gear = 'eye'
        color = {'Galaxy':'#b6d6ff','Nebula':'#ffc0aa','Star cluster':'#a6c9ff','Double star':'#e9f2ff','Asterism':'#d3c2ef','Star cloud':'#ebdab4'}[kind]
        description_en, description_sv = description(kind, subtype, subtype_sv, number, constellation)
        entry = dict(id=f'm{number}', en=en, sv=sv, kind=kind, subtype=subtype, subtypeSv=subtype_sv,
            constellation=constellation, distance=distance, distanceSv=distance_sv,
            magnitude=magnitude or ('Unverified for pair' if number == 40 else 'Not supplied (V)'),
            magnitudeSv=magnitude or ('Ej verifierad för stjärnparet' if number == 40 else 'Uppgift saknas (V)'),
            magnitudeBand='V', gear=gear,
            description=description_en,
            descriptionSv=description_sv,
            position=dict(kind='fixed',raHours=coords(row['RA']),decDegrees=coords(row['Dec'],True)),
            aliases=aliases, references=references, catalogNumber=number, color=color, size=5)
        if number in SPECIAL_NOTES: entry['catalogNote'], entry['catalogNoteSv'] = SPECIAL_NOTES[number]
        result.append(entry)
    output = ROOT / 'src/generated/messier.ts'
    header = ('// Generated by scripts/generate_messier.py. Adapted OpenNGC by Mattia Verga, CC BY-SA 4.0.\n'
      f'// OpenNGC commit: {COMMIT}; NASA/Hubble factual distance snapshot: data/messier-distances.json.\n'
      '// Noxari adapts types, aliases, translations and equipment guidance; M102 follows NGC5866 with a dispute note.\n'
      "import type {SpaceObject} from '../data';\n")
    output.write_text(header + 'export const messierObjects: SpaceObject[] = ' + json.dumps(result, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f'Wrote {len(result)} objects; {sum(e["distance"].startswith("~") for e in result)} sourced approximate distances; {sum(e["magnitude"][0].isdigit() for e in result)} V magnitudes')

if __name__ == '__main__': main()
