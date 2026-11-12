"""Gnomonic projection (north up, east left) of figure stars into a 400x400 panel."""
import json, math
def load():
    data = json.load(open('figures.json'))
    res = {}
    for cid, f in data.items():
        st = {int(h): v for h, v in f['stars'].items()}
        ras = [v[0] * 15 for v in st.values()]
        # circular mean of RA
        sx = sum(math.cos(math.radians(r)) for r in ras); sy = sum(math.sin(math.radians(r)) for r in ras)
        ra0 = math.radians(math.degrees(math.atan2(sy, sx)))
        dec0 = math.radians(sum(v[1] for v in st.values()) / len(st))
        pts = {}
        for h, (ra, dec, mag, name) in st.items():
            a, d = math.radians(ra * 15), math.radians(dec)
            cosc = math.sin(dec0)*math.sin(d) + math.cos(dec0)*math.cos(d)*math.cos(a-ra0)
            x = math.cos(d)*math.sin(a-ra0)/cosc
            y = (math.cos(dec0)*math.sin(d) - math.sin(dec0)*math.cos(d)*math.cos(a-ra0))/cosc
            pts[h] = (-x, -y, mag)  # east left, north up (screen y down)
        xs = [p[0] for p in pts.values()]; ys = [p[1] for p in pts.values()]
        span = max(max(xs)-min(xs), max(ys)-min(ys))
        s = 300/span; cx = (max(xs)+min(xs))/2; cy = (max(ys)+min(ys))/2
        res[cid] = {'lines': f['lines'], 'pts': {h: (round(200+(p[0]-cx)*s,1), round(200+(p[1]-cy)*s,1), p[2]) for h, p in pts.items()}}
    return res
if __name__ == '__main__':
    for cid, r in load().items():
        print(cid); [print(' ', h, p) for h, p in sorted(r['pts'].items(), key=lambda kv: kv[1][1])]
        print('  lines', r['lines'])
