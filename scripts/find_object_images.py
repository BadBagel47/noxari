"""F-048: propose freely licensed photos for catalog objects (review aid, not run at build time).

For each object, take the lead image of its English Wikipedia article and read
the file's license metadata from Wikimedia Commons. Only public domain / CC0 /
CC BY / CC BY-SA files without extra restrictions are proposed. The output is a
candidate list for human review; accepted entries are copied into
data/object-images.json and fetched with scripts/download_object_images.py.

Run: python3 scripts/find_object_images.py > candidates.json
"""
import html, json, re, sys, time
from urllib.parse import urlencode
from urllib.error import HTTPError
from urllib.request import Request, urlopen

UA = {'User-Agent': 'Noxari open image attribution check/1.0'}
ARTICLES = {f'm{n}': f'Messier {n}' for n in range(1, 111)}
ARTICLES.update({'sun': 'Sun', 'moon': 'Moon', 'mercury': 'Mercury (planet)', 'venus': 'Venus', 'mars': 'Mars', 'jupiter': 'Jupiter',
                 'saturn': 'Saturn', 'uranus': 'Uranus', 'neptune': 'Neptune', 'pluto': 'Pluto', 'ceres': 'Ceres (dwarf planet)',
                 'eris': 'Eris (dwarf planet)', 'haumea': 'Haumea', 'makemake': 'Makemake', 'vesta': '4 Vesta'})
ACCEPT = re.compile(r'^(public domain|pd|cc0|cc by(-sa)? [\d.]+( igo)?)', re.I)


def api(host, **params):
    url = f'https://{host}/w/api.php?' + urlencode({'format': 'json', 'formatversion': 2, 'maxlag': 5, **params})
    for attempt in range(6):
        try:
            return json.loads(urlopen(Request(url, headers=UA), timeout=60).read())
        except HTTPError as error:
            if error.code != 429 or attempt == 5:
                raise
            time.sleep(int(error.headers.get('Retry-After') or 0) or 10 * (attempt + 1))


def chunks(items, size=40):
    return [items[i:i + size] for i in range(0, len(items), size)]


def text(value):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', value or ''))).strip()


def main():
    ids = sys.argv[1:] or list(ARTICLES)
    leads = {}
    for group in chunks(ids):
        result = api('en.wikipedia.org', action='query', titles='|'.join(ARTICLES[i] for i in group), redirects=1, prop='pageimages', piprop='name', pilimit=50)['query']
        alias = {item['from']: item['to'] for key in ('normalized', 'redirects') for item in result.get(key, [])}
        pages = {page['title']: page.get('pageimage') for page in result['pages']}
        for object_id in group:
            title = ARTICLES[object_id]
            while title in alias: title = alias[title]
            leads[object_id] = pages.get(title)
        time.sleep(2)
    files = sorted({name for name in leads.values() if name})
    infos = {}
    for group in chunks(files):
        result = api('commons.wikimedia.org', action='query', titles='|'.join('File:' + name for name in group), prop='imageinfo', iiprop='url|extmetadata|mime|size', iiurlwidth=800)['query']
        alias = {item['to']: item['from'] for item in result.get('normalized', [])}
        for page in result['pages']:
            infos[alias.get(page['title'], page['title'])[5:]] = page
        time.sleep(2)
    out = []
    for object_id in ids:
        name = leads[object_id]
        if not name:
            out.append({'id': object_id, 'status': 'no-lead-image'}); continue
        info = infos.get(name) or infos.get(name.replace('_', ' '))
        if not info or 'imageinfo' not in info:
            out.append({'id': object_id, 'status': 'not-on-commons', 'file': name}); continue
        ii = info['imageinfo'][0]; meta = ii.get('extmetadata', {})
        license = text(meta.get('LicenseShortName', {}).get('value'))
        restrictions = text(meta.get('Restrictions', {}).get('value'))
        ok = bool(ACCEPT.match(license)) and not restrictions and ii['mime'] in ('image/jpeg', 'image/png', 'image/tiff') and bool(ii.get('thumburl'))
        out.append({'id': object_id, 'status': 'candidate' if ok else 'rejected', 'commonsFile': name, 'mime': ii['mime'],
                    'width': ii['width'], 'height': ii['height'], 'thumbUrl': ii.get('thumburl'), 'sourceUrl': ii['descriptionurl'],
                    'license': license, 'licenseUrl': text(meta.get('LicenseUrl', {}).get('value')),
                    'artist': text(meta.get('Artist', {}).get('value'))[:160], 'credit': text(meta.get('Credit', {}).get('value'))[:160],
                    'restrictions': restrictions, 'description': text(meta.get('ImageDescription', {}).get('value'))[:200]})
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
