"""Own constellation illustrations (style test 3, F-041).

Coordinates are in the 400x400 panel produced by project.py (north up, east
left, as seen in the sky). Every path is drawn by hand around the real figure
stars. Style lessons were taken from looking at Stellarium's modern sky-culture
illustrations (Free Art License): large figures, dynamic poses, a clear outer
contour with few thin inner details, organic curves. Nothing is traced or
copied from any third-party artwork.

`body` = closed/open contour paths (only closed shapes are filled in style B).
`detail` = thin inner lines (muscles, folds, feathers, fur), never filled."""
from pathlib import Path
from project import load

ART = {
  'Ori': {  # Orion lunging forward: club raised behind his head, lion pelt held out
    'name': ('Orion', 'Orion · jägaren'),
    'body': [
      'M180 128 C184 118 200 116 206 124 C210 132 212 140 216 146 C212 148 208 150 206 156 C200 162 188 162 182 156 C176 148 176 136 180 128 Z',  # head
      'M128 176 C146 164 200 162 224 178 C230 196 224 222 214 244 C206 258 190 268 172 272 C158 254 146 228 136 204 C132 194 128 186 128 176 Z',  # torso
      'M168 268 C156 290 148 308 142 322 C164 334 218 330 240 314 C230 292 222 270 214 248 Z',  # tunic
      'M156 326 C152 338 150 348 146 358 C152 362 164 362 170 358 C170 348 172 338 176 328 Z',  # back leg
      'M214 318 C226 312 238 304 248 302 C256 312 256 330 254 346 C250 352 240 352 236 346 C238 334 238 324 236 316 C230 322 222 326 216 328 Z',  # bent front leg
      'M132 182 C118 168 106 152 102 136 C100 124 104 114 110 106 L124 110 C120 120 118 130 122 142 C128 154 138 164 148 172 Z',  # raised arm
      'M114 112 C112 96 118 76 128 60 C134 50 146 42 152 48 C156 54 148 66 140 78 C132 92 126 104 124 114 Z',  # club
      'M216 182 C240 182 262 182 284 180 L284 194 C262 196 240 198 218 198 Z',  # forward arm
      'M282 150 C298 156 306 176 304 198 C302 216 296 232 286 246 C282 236 280 222 284 210 C276 200 278 186 282 176 C278 166 278 156 282 150 Z',  # lion pelt
    ],
    'detail': [
      'M182 126 C176 120 176 112 184 110 C192 106 202 110 206 118 M206 156 C204 164 198 168 192 166',  # hair, beard
      'M150 196 C170 204 196 204 212 196 M178 210 C180 228 182 244 186 256',   # chest, abdomen
      'M166 262 C182 256 198 250 212 244 M168 272 C184 266 200 260 214 254',  # belt
      'M182 282 L178 320 M202 278 L206 322 M190 268 C190 282 188 294 186 304',  # folds, sword
      'M148 352 l20 -2 M238 342 l14 2 M246 306 c4 4 4 10 0 14',               # sandals, knee
      'M120 126 c6 -2 10 0 12 4 M134 70 l10 6 M126 88 l10 6',                  # fist, club knots
      'M280 148 C284 138 296 138 298 146 M292 214 l8 6 M290 230 l8 8 M300 182 l8 0',  # pelt head, paws
    ],
  },
  'UMa': {  # Ursa Major: a heavy walking bear; the Dipper handle is its long tail
    'name': ('Ursa Major', 'Stora björnen'),
    'body': [
      'M140 168 C150 146 186 132 230 130 C254 128 268 122 282 120 C298 114 318 112 332 118 C342 122 350 126 354 132 '
      'C348 138 336 142 324 144 C314 148 306 156 302 166 C302 180 306 192 312 200 C326 206 342 210 352 214 L352 224 '
      'C338 224 322 222 306 216 C296 218 290 226 286 236 C282 250 280 262 278 276 L262 278 C262 262 262 248 258 236 '
      'C246 226 230 222 214 222 C206 226 202 234 204 244 C210 252 216 258 218 266 L204 268 C196 256 186 246 178 238 '
      'C168 226 160 212 152 198 C144 188 140 178 140 168 Z',               # body
      'M142 166 C122 156 98 156 76 162 C64 166 54 168 48 170',             # tail
      'M296 122 C294 108 308 104 314 114',                                  # ear
    ],
    'detail': [
      'M332 124 a2 2 0 1 1 -0.1 0 M344 134 l8 2 M320 140 C328 142 338 140 346 136',  # eye, nose, mouth
      'M200 140 C210 150 214 160 212 170 M250 134 C256 146 258 160 254 172 M290 132 C292 142 292 150 290 158',  # fur
      'M176 214 C186 222 196 228 206 230 M266 236 C270 246 272 256 270 266',  # haunch, shoulder
      'M352 216 l6 2 M352 220 l6 4 M276 276 l-4 6 M268 278 l0 7 M212 266 l-4 6 M206 268 l0 7',  # claws
    ],
  },
  'Cas': {  # Cassiopeia: the queen leaning back on her throne, holding up a mirror
    'name': ('Cassiopeia', 'Cassiopeja · drottningen'),
    'body': [
      'M226 135 a15 15 0 1 1 -0.1 0',                                       # head
      'M213 134 l3 -12 l7 8 l6 -11 l6 11 l7 -8 l3 12 Z',                    # crown
      'M214 166 C204 176 198 192 200 210 C202 232 210 250 222 262 L270 262 C268 240 262 216 254 196 C248 180 240 170 232 164 Z',  # bodice
      'M222 262 C210 276 196 300 182 330 C176 342 172 350 170 356 L300 356 C296 338 290 318 284 300 C280 286 276 272 270 262 Z',  # gown
      'M208 186 C186 184 160 186 138 184 C118 168 98 146 82 128 L90 120 C104 136 122 158 140 172 C164 174 188 174 210 176 Z',  # raised arm
      'M76 98 a14 16 -20 1 1 -0.1 0',                                       # mirror
      'M296 170 C306 164 318 164 326 172 L330 304 L262 300',                # throne back, seat
    ],
    'detail': [
      'M238 140 C250 150 252 170 244 186',                                  # hair
      'M220 290 L206 350 M246 286 L244 352 M268 292 L280 350 M214 214 C228 220 244 220 256 214',  # folds, sash
      'M84 112 L84 124',                                                    # mirror handle
      'M252 200 C270 214 286 222 306 226 M300 200 L328 202',                # arm on armrest
      'M272 304 L268 352 M328 304 L330 352 M308 164 C310 156 316 156 318 164',  # throne legs, finial
    ],
  },
  'Cyg': {  # Cygnus: a swan in full flight, wings spread wide, neck stretched forward
    'name': ('Cygnus', 'Svanen'),
    'body': [
      'M196 150 C214 158 246 182 260 210 C270 230 262 248 246 250 C228 252 214 236 206 216 C198 196 194 172 196 150 Z',  # body
      'M196 150 C186 140 180 130 178 122 C188 126 196 130 200 136 C202 128 206 122 212 120 C210 130 208 140 206 148 Z',  # tail fan
      'M254 236 C270 252 284 264 296 276 C314 294 330 312 342 322 L336 330 C322 318 306 302 288 284 C276 272 262 260 246 246 Z',  # neck
      'M336 318 C346 312 356 318 356 328 C356 336 346 338 338 334 Z',       # head
      'M240 200 C262 176 288 156 304 134 C318 112 330 88 342 64 C344 84 342 100 336 112 C340 120 338 130 330 138 C332 148 326 156 318 162 C316 172 306 178 296 180 C290 190 278 194 268 196 C260 202 250 206 240 206 Z',  # upper wing
      'M224 236 C200 258 170 278 140 292 C110 304 76 310 44 312 C58 296 72 290 86 284 C96 276 108 272 120 268 C130 260 142 256 154 252 C164 244 176 240 188 236 C200 230 212 228 224 230 Z',  # lower wing
    ],
    'detail': [
      'M356 326 L372 334 L354 334 M346 322 a1.6 1.6 0 1 1 -0.1 0',           # beak, eye
      'M330 96 L314 112 M326 120 L304 134 M318 144 L292 156 M304 166 L276 176 M286 182 L262 190',  # upper wing feathers
      'M70 300 L86 292 M100 292 L116 282 M128 284 L146 270 M160 274 L176 260 M190 264 L204 248',  # lower wing feathers
      'M214 190 C222 204 230 216 240 224',                                  # body shading
    ],
  },
}

STYLES = {
  'line': {'label': 'A · Fin linjekonst', 'art': 'fill:none;stroke:#e6d3a3;stroke-opacity:.7;stroke-width:1.9;stroke-linejoin:round;stroke-linecap:round',
           'detail': 'fill:none;stroke:#e6d3a3;stroke-opacity:.45;stroke-width:1;stroke-linecap:round'},
  'soft': {'label': 'B · Mjuk silhuett', 'art': 'fill:#86cbef;fill-opacity:.11;stroke:#9fd6f5;stroke-opacity:.5;stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round;filter:url(#glow)',
           'detail': 'fill:none;stroke:#b7e2fa;stroke-opacity:.35;stroke-width:.9;stroke-linecap:round'},
}

def panel(cid, style, fig, seed):
    import random
    rnd = random.Random(seed)
    bg = ''.join(f'<circle cx="{rnd.uniform(0,400):.0f}" cy="{rnd.uniform(0,400):.0f}" r="{rnd.choice([.5,.6,.8,1])}" fill="#cfe0ff" opacity="{rnd.uniform(.2,.6):.2f}"/>' for _ in range(140))
    lines = ''.join('<polyline points="' + ' '.join(f'{fig["pts"][h][0]},{fig["pts"][h][1]}' for h in line) + '" fill="none" stroke="#6f9cc8" stroke-opacity=".28" stroke-width="1"/>' for line in fig['lines'])
    stars = ''.join(f'<circle cx="{x}" cy="{y}" r="{max(1.4, 4.6 - m*0.75):.1f}" fill="#fff8e6"/>' for x, y, m in fig['pts'].values())
    st = STYLES[style]
    # Only closed shapes are filled; open strokes never get a fill.
    art = ''.join(f'<path d="{d}" style="{st["art"]}{"" if d.rstrip().endswith("Z") else ";fill:none"}"/>' for d in ART[cid]['body'])
    art += ''.join(f'<path d="{d}" style="{st["detail"]}"/>' for d in ART[cid].get('detail', []))
    name = ART[cid]['name'][1]
    return (f'<figure><svg viewBox="0 0 400 400" width="300" height="300"><defs><filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            f'<radialGradient id="sky{seed}" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#14304f"/><stop offset="1" stop-color="#061020"/></radialGradient></defs>'
            f'<rect width="400" height="400" fill="url(#sky{seed})"/>{bg}{art}{lines}{stars}'
            f'<text x="200" y="388" text-anchor="middle" fill="#9fb8d6" font-size="15" font-style="italic" font-family="Inter,system-ui">{name}</text></svg></figure>')

def page():
    figs = load()
    rows = ''
    for i, cid in enumerate(['Ori', 'UMa', 'Cas', 'Cyg']):
        rows += '<div class="row">' + ''.join(panel(cid, s, figs[cid], i * 10 + j) for j, s in enumerate(STYLES)) + '</div>'
    head = ''.join(f'<div>{v["label"]}</div>' for v in STYLES.values())
    return f'''<!doctype html><meta charset="utf-8"><style>body{{margin:0;background:#060d18;color:#e8effb;font-family:Inter,system-ui,sans-serif;width:660px;padding:24px}}
h1{{font-size:22px;margin:0 0 4px}}p{{color:#8fa6c0;font-size:13px;margin:0 0 14px}}.head,.row{{display:grid;grid-template-columns:300px 300px;gap:20px}}.head div{{font-size:14px;font-weight:650;color:#c9dcef;margin-bottom:8px}}
figure{{margin:0 0 20px}}svg{{display:block;border-radius:16px;border:1px solid #22364f}}</style>
<h1>Egna stjärnbildsteckningar — stiltest 3</h1><p>Egna teckningar ritade fritt kring de riktiga stjärnorna. Tydlig ytterkontur, få tunna detaljlinjer, mjuka former.</p>
<div class="head">{head}</div>{rows}'''

if __name__ == '__main__':
    Path('styletest.html').write_text(page(), encoding='utf-8')
