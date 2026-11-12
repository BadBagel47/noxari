"""Own constellation illustrations (style test, F-041). Coordinates are in the
400x400 panel produced by project.py (north up, east left, as seen in the sky).
Every path is drawn by hand around the real figure stars; nothing is traced
from third-party artwork."""
from pathlib import Path
from project import load

ART = {
  'Ori': {  # Orion, the hunter: raised club, lion pelt held out to the west
    'name': ('Orion', 'Orion · jägaren'),
    'body': [
      'M189 140 a13 13 0 1 1 -0.1 0',                                      # head (Meissa)
      'M182 160 L178 172 M196 160 L200 173',                                # neck
      'M140 179 C158 168 198 174 213 189 C212 214 207 236 201 252 C192 262 176 270 168 268 C160 250 150 226 140 179 Z',  # torso
      'M168 268 C162 282 154 298 148 312 C168 320 214 318 230 306 C222 290 212 270 201 252',  # tunic
      'M162 314 L154 346 M170 316 L160 348',                                # left leg to Saiph
      'M210 314 L236 332 M218 310 L244 328',                                # right leg to Rigel
      'M168 266 L205 252',                                                  # belt
      'M186 266 C186 280 184 292 182 302',                                  # sword
      'M140 181 C130 168 124 160 123 156 L112 110',                         # raised arm
      'M106 118 C98 100 108 70 128 52 C140 44 150 48 146 58 C138 74 124 100 116 116 Z',  # club
      'M213 190 C238 196 262 196 284 192',                                  # arm to pelt
      'M286 148 C306 166 308 214 280 238 C290 212 293 176 286 148 Z',       # lion pelt
      'M282 160 l-8 -6 M286 182 l-9 0 M284 206 l-9 4 M281 226 l-7 6',       # pelt fringe
    ],
  },
  'UMa': {  # Ursa Major, the great bear: the Dipper handle is the long tail
    'name': ('Ursa Major', 'Stora björnen'),
    'body': [
      'M125 160 C150 140 200 132 240 138 C262 140 280 128 300 120 C320 113 338 117 345 126 '
      'C338 134 320 140 302 148 C294 166 297 186 310 198 L348 210 L347 222 L302 214 '
      'C287 222 276 250 270 272 L258 276 C257 250 252 226 238 212 C216 214 202 220 198 232 '
      'L213 252 L206 262 L178 238 C168 222 165 206 160 195 C145 188 132 176 125 160 Z',
      'M128 160 C108 150 92 152 72 160 C64 163 56 166 50 169',             # tail along the handle
      'M293 122 C294 112 304 110 307 118',                                  # ear
      'M326 124 a2 2 0 1 1 -0.1 0',                                         # eye
      'M330 140 l12 2 M332 145 l11 4',                                      # muzzle
    ],
  },
  'Cas': {  # Cassiopeia, the queen seated on her throne, one arm raised with a palm
    'name': ('Cassiopeia', 'Cassiopeja · drottningen'),
    'body': [
      'M214 154 a14 14 0 1 1 -0.1 0',                                       # head
      'M202 152 l3 -11 l6 7 l6 -10 l6 10 l6 -7 l3 11',                      # crown
      'M210 182 L206 194',                                                  # neck
      'M206 194 C224 198 238 212 246 232 C252 252 256 272 259 291',         # back
      'M200 200 C196 226 200 252 212 278',                                  # front
      'M212 278 C222 286 240 290 259 291 M212 278 L198 300',                # lap
      'M198 300 C190 318 180 336 172 352 L250 352 C246 330 244 312 250 296',  # gown
      'M204 198 C170 205 140 206 118 202 C96 170 72 138 54 112',            # raised arm
      'M54 112 C40 96 42 80 52 70 M50 96 l-10 -4 M48 88 l-10 -6 M52 80 l-9 -8 M54 92 l8 -8 M56 84 l8 -9',  # palm
      'M240 220 C270 236 300 244 330 246',                                  # arm on armrest
      'M350 196 L352 344 M330 246 L350 246 M259 296 L352 300 M268 300 L264 346 M342 196 C344 184 356 184 358 196',  # throne
    ],
  },
  'Cyg': {  # Cygnus, the swan flying south along the Milky Way
    'name': ('Cygnus', 'Svanen'),
    'body': [
      'M200 152 C224 166 252 196 254 222 C254 240 232 242 220 228 C206 210 198 182 200 152 Z',  # body
      'M200 152 l-12 -12 M202 150 l-2 -18 M206 152 l10 -14',               # tail (Deneb)
      'M248 230 C266 244 280 254 289 262 C306 282 330 306 344 322',         # neck
      'M344 322 C352 320 358 326 356 332 C352 336 346 334 344 330 Z M356 332 l12 6 l-13 0',  # head, beak (Albireo)
      'M238 206 C262 186 290 172 303 161 C316 140 320 112 321 91 C326 82 332 75 338 70 C330 96 316 122 300 140 C286 162 266 186 246 210 Z',  # wing 1
      'M318 104 l-14 6 M312 124 l-16 4 M302 146 l-18 2',                   # wing 1 feathers
      'M222 226 C208 244 196 260 187 272 C160 286 140 298 125 304 C100 306 74 308 50 308 C80 294 112 280 140 268 C170 254 196 240 214 222 Z',  # wing 2
      'M90 300 l8 -12 M120 292 l8 -12 M150 280 l8 -12 M178 266 l6 -12',    # wing 2 feathers
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
    lines = ''.join('<polyline points="' + ' '.join(f'{fig["pts"][h][0]},{fig["pts"][h][1]}' for h in line) + '" fill="none" stroke="#6f9cc8" stroke-opacity=".55" stroke-width="1"/>' for line in fig['lines'])
    stars = ''.join(f'<circle cx="{x}" cy="{y}" r="{max(1.4, 4.6 - m*0.75):.1f}" fill="#fff8e6"/>' for x, y, m in fig['pts'].values())
    art = ''.join(f'<path d="{d}" style="{STYLES[style]["art"]}"/>' for d in ART[cid]['body'])
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
<h1>Egna stjärnbildsteckningar — stiltest</h1><p>Riktiga stjärnpositioner och befintliga figurlinjer. Teckningarna är egna och ritade runt stjärnorna.</p>
<div class="head">{head}</div>{rows}'''

if __name__ == '__main__':
    Path('styletest.html').write_text(page(), encoding='utf-8')
