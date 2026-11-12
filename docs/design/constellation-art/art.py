"""Own constellation illustrations (style test, F-041). Coordinates are in the
400x400 panel produced by project.py (north up, east left, as seen in the sky).
Every path is drawn by hand around the real figure stars; nothing is traced
from third-party artwork."""
from pathlib import Path
from project import load

ART = {
  'Ori': {  # Orion, the hunter: club raised behind the head, lion pelt held forward
    'name': ('Orion', 'Orion · jägaren'),
    'body': [
      'M180 128 C184 118 200 116 206 124 C210 132 212 140 216 146 C212 148 208 150 206 156 C200 162 188 162 182 156 C176 148 176 136 180 128 Z',  # head in profile
      'M182 126 C176 120 176 112 184 110 C192 106 202 110 206 118 M206 156 C204 164 198 168 192 166',  # hair, beard
      'M188 160 L186 170 M200 158 L202 170',                                # neck
      'M130 176 C150 166 200 166 222 180 C224 200 218 224 210 246 C204 258 190 266 172 270 C160 254 148 228 138 204 C134 194 130 186 130 176 Z',  # torso
      'M166 262 C182 256 198 250 212 244 M168 272 C184 266 200 260 214 254', # belt
      'M168 270 C158 290 150 306 146 318 C166 328 214 326 236 312 C228 292 220 270 212 250 Z',  # tunic
      'M182 280 L178 318 M200 276 L204 320 M190 268 C190 282 188 294 186 304',  # folds, sword
      'M160 322 C156 334 152 346 148 356 L164 360 C166 348 170 336 174 324',  # back leg
      'M212 322 C224 330 236 340 246 348 L254 340 C244 330 232 318 224 312',  # front leg
      'M134 180 C120 168 110 154 106 140 C104 128 108 116 114 108 M146 172 C134 160 124 148 120 136 C118 126 120 118 124 112',  # raised arm
      'M114 112 C112 96 118 76 128 60 C134 50 146 42 152 48 C156 54 148 66 140 78 C132 92 126 104 124 114 Z',  # club
      'M218 184 C240 186 262 188 282 186 M216 196 C238 198 260 198 282 196',  # forward arm
      'M282 150 C298 156 306 176 304 198 C302 216 296 232 286 246 C282 236 280 222 284 210 C276 200 278 186 282 176 C278 166 278 156 282 150 Z',  # lion pelt
      'M280 148 C284 138 296 138 298 146 M292 214 l8 6 M290 230 l8 8 M300 182 l8 0',  # pelt head, fringe
    ],
  },
  'UMa': {  # Ursa Major: a walking bear; the Dipper handle is its long tail
    'name': ('Ursa Major', 'Stora björnen'),
    'body': [
      'M140 168 C150 146 186 132 230 130 C254 128 268 122 282 120 C298 114 318 112 332 118 C342 122 350 126 354 132 '
      'C348 138 336 142 324 144 C314 148 306 156 302 166 C302 180 306 192 312 200 C326 206 342 210 352 214 L352 224 '
      'C338 224 322 222 306 216 C296 218 290 226 286 236 C282 250 280 262 278 276 L262 278 C262 262 262 248 258 236 '
      'C246 226 230 222 214 222 C206 226 202 234 204 244 C210 252 216 258 218 266 L204 268 C196 256 186 246 178 238 '
      'C168 226 160 212 152 198 C144 188 140 178 140 168 Z',               # body
      'M142 166 C122 156 98 156 76 162 C64 166 54 168 48 170',             # tail
      'M300 120 C300 110 310 108 312 116',                                  # ear
      'M332 124 a2 2 0 1 1 -0.1 0 M344 134 l8 2',                           # eye, mouth
      'M200 140 C210 150 214 160 212 170 M250 134 C256 146 258 160 254 172 M290 132 C292 142 292 150 290 158',  # fur
    ],
  },
  'Cas': {  # Cassiopeia: the queen on her throne, raising a palm frond
    'name': ('Cassiopeia', 'Cassiopeja · drottningen'),
    'body': [
      'M226 135 a15 15 0 1 1 -0.1 0',                                       # head
      'M213 134 l3 -12 l7 8 l6 -11 l6 11 l7 -8 l3 12 Z',                    # crown
      'M238 140 C250 150 252 170 244 186',                                  # hair
      'M214 166 C204 176 198 192 200 210 C202 232 210 250 222 262 L270 262 C268 240 262 216 254 196 C248 180 240 170 232 164 Z',  # bodice
      'M222 262 C210 276 196 300 182 330 C176 342 172 350 170 356 L300 356 C296 338 290 318 284 300 C280 286 276 272 270 262 Z',  # gown
      'M220 290 L206 350 M246 286 L244 352 M268 292 L280 350',              # folds
      'M208 186 C186 184 160 186 138 184 C118 168 98 146 82 128 M214 198 C190 198 164 198 140 196 C120 180 100 158 86 140',  # raised arm
      'M80 126 C68 112 60 98 56 82 M66 112 l-12 -2 M62 102 l-12 -4 M58 92 l-10 -6 M66 104 l8 -8 M62 94 l8 -10',  # palm
      'M252 200 C270 214 286 222 306 226',                                  # resting arm
      'M296 170 C306 164 318 164 326 172 L330 304 M262 300 L332 304 M272 304 L268 352 M328 304 L330 352 M300 200 L328 202',  # throne
    ],
  },
  'Cyg': {  # Cygnus: a swan in flight with outstretched wings
    'name': ('Cygnus', 'Svanen'),
    'body': [
      'M196 150 C214 158 246 182 260 210 C270 230 262 248 246 250 C228 252 214 236 206 216 C198 196 194 172 196 150 Z',  # body
      'M196 150 C186 140 180 130 178 122 M200 148 C198 136 198 126 200 116 M204 150 C210 138 216 130 222 126',  # tail
      'M254 236 C270 252 284 264 296 276 C314 294 330 312 342 322 M246 246 C262 260 276 272 288 284 C306 302 322 318 336 330',  # neck
      'M336 318 C346 312 356 318 356 328 C356 336 346 338 338 334 Z M356 326 L372 334 L354 334',  # head, beak
      'M240 200 C262 176 288 156 304 134 C318 112 330 88 342 64 C336 80 334 92 326 100 C324 110 318 118 312 122 C310 132 302 140 296 144 C292 154 284 160 278 164 C272 174 262 180 254 186 C248 194 244 198 240 200 Z',  # upper wing
      'M330 92 L314 108 M318 116 L300 130 M304 140 L286 152',              # upper wing feathers
      'M224 236 C200 258 170 278 140 292 C110 304 76 310 44 312 C58 300 70 298 80 292 C92 290 100 284 110 280 C122 278 130 272 140 268 C152 266 160 258 170 254 C182 252 190 244 200 240 C208 238 216 234 224 230 Z',  # lower wing
      'M80 300 L94 290 M112 292 L124 280 M142 282 L154 268',               # lower wing feathers
    ],
  },
}

STYLES = {
  'line': {'label': 'A · Fin linjekonst', 'art': 'fill:none;stroke:#e6d3a3;stroke-opacity:.62;stroke-width:1.7;stroke-linejoin:round;stroke-linecap:round'},
  'soft': {'label': 'B · Mjuk silhuett', 'art': 'fill:#86cbef;fill-opacity:.10;stroke:#9fd6f5;stroke-opacity:.42;stroke-width:1.3;stroke-linejoin:round;stroke-linecap:round;filter:url(#glow)'},
}

def panel(cid, style, fig, seed):
    import random
    rnd = random.Random(seed)
    bg = ''.join(f'<circle cx="{rnd.uniform(0,400):.0f}" cy="{rnd.uniform(0,400):.0f}" r="{rnd.choice([.5,.6,.8,1])}" fill="#cfe0ff" opacity="{rnd.uniform(.2,.6):.2f}"/>' for _ in range(140))
    lines = ''.join('<polyline points="' + ' '.join(f'{fig["pts"][h][0]},{fig["pts"][h][1]}' for h in line) + '" fill="none" stroke="#6f9cc8" stroke-opacity=".28" stroke-width="1"/>' for line in fig['lines'])
    stars = ''.join(f'<circle cx="{x}" cy="{y}" r="{max(1.4, 4.6 - m*0.75):.1f}" fill="#fff8e6"/>' for x, y, m in fig['pts'].values())
    # Only closed shapes are filled; open strokes (tails, arms, necks, feathers) never get a fill.
    art = ''.join(f'<path d="{d}" style="{STYLES[style]["art"]}{"" if d.rstrip().endswith("Z") else ";fill:none"}"/>' for d in ART[cid]['body'])
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
<h1>Egna stjärnbildsteckningar — stiltest 2 (friare)</h1><p>Riktiga stjärnpositioner och befintliga figurlinjer. Teckningarna är egna och ritade fritt kring stjärnorna, som i klassiska atlaser.</p>
<div class="head">{head}</div>{rows}'''

if __name__ == '__main__':
    Path('styletest.html').write_text(page(), encoding='utf-8')
