"""Builds index.html: before/after comparison of the UX sketch (design only)."""
from pathlib import Path

HERE = Path(__file__).parent
HEAD = """<!doctype html><html lang="sv"><meta charset="utf-8"><title>Noxari UX-skiss</title>
<style>body{margin:0;background:#060d18;color:#e8effb;font-family:Inter,system-ui,sans-serif;width:900px;padding:28px 30px}
h1{font-size:26px;margin:0 0 4px}p.sub{color:#8fa6c0;margin:0 0 24px;font-size:14px}
section{display:grid;grid-template-columns:260px 260px 1fr;gap:22px;align-items:start;padding:20px 0 30px;border-top:1px solid #22364f}
figure{margin:0}figure img{width:260px;border-radius:18px;border:1px solid #2a3f59;display:block}figcaption{font-size:12px;color:#8fa6c0;margin-top:6px;text-align:center}
h2{font-size:19px;margin:0 0 10px}ul{margin:0;padding-left:18px;font-size:14px;line-height:1.55;color:#c9d8ea}li{margin-bottom:6px}</style>
<h1>Noxari — UX-skiss, november 2026</h1><p class="sub">Före = nuvarande app. Efter = förslag. Ingen appkod är ändrad. Mobil 390×844.</p>
"""

PAIRS = [
    ("Himlen", "01-himmel", "01-himmel", [
        "Följ ersätter Manual och följ-knappen i den nedre raden: en tydlig knapp uppe till höger.",
        "Ny nedre rad i Stellarium-anda: Sök · Ikväll · Lager · Tid & plats · Mer. Himlens inställningar nås med ett tryck.",
        "Riktningen visas som en liten centrerad rad i stället för en ruta.",
        "Kvällshimmel-märkningen behålls synlig.",
    ]),
    ("Valt objekt", "09-objekt", "07-objekt", [
        "Kortet visar typ, höjd och bästa tid direkt, så man ofta slipper öppna detaljer.",
        "Guida, Detaljer, Spara och Dela på samma rad.",
    ]),
    ("Lager", "03-visning", "03-lager", [
        "Ny snabbpanel från knappen Lager, med stora reglage som rutor i stället för små kryssrutor.",
        "Vy (Se dig omkring / Stjärnkarta) och Vanliga/Alla stjärnbilder på samma ställe.",
        "Förklarande text kortad till en rad med Läs mer.",
        "Rutnät visas som möjligt framtida lager (finns inte som val i dag).",
    ]),
    ("Mer", "02-mer", "02-mer", [
        "Grupperat: Mina objekt · Inställningar · Prototyp/felsökning · Om.",
        "Språk med Auto (följer telefonen) direkt i listan; Visning och Inställningar slås ihop.",
        "Helskärm blir ett reglage. Felsökningen syns kvar men samlas för sig.",
    ]),
    ("Sök", "06-sok", "04-sok", [
        "En rad per objekt med typ, bästa tid och höjd. Liten kurva i stället för stor graf, så fler träffar syns.",
        "Nytt filter Synligt nu. Svenska namn i svenskt läge.",
        "Den stora höjdkurvan finns kvar i objektets detaljer.",
    ]),
    ("Ikväll", "07-ikvall", "05-ikvall", [
        "Förslagen kommer först; kort sammanfattning av natten överst.",
        "Utrustning som tre knappar i stället för rullista.",
        "Varje förslag har skäl och ungefärlig tid synligt. Begränsningarna står kvar på en rad, med länk till hur förslagen väljs.",
    ]),
    ("Tid & plats", "08-tid-plats", "06-tid-plats", [
        "Tre snabbval: Nu · Ikväll (mörkast) · Välj.",
        "Använd min position som huvudknapp; ortsval under.",
        "Koordinater och tidszon flyttas till Avancerat.",
    ]),
]

TAIL = """<section style="display:block"><h2>Samma som i dag</h2><ul>
<li>Alla lager på vid start, kvällshimmelsstart och synliga felsökningsverktyg (tillfälligt, enligt beslut).</li>
<li>Himlens rendering, sensorlogik och beräkningar ändras inte.</li>
<li>Språk: Auto följer telefonens språk; man kan byta.</li></ul></section>"""

html = HEAD
for title, before, after, notes in PAIRS:
    items = "".join(f"<li>{n}</li>" for n in notes)
    html += (f'<section><figure><img src="before/{before}.png"><figcaption>Före</figcaption></figure>'
             f'<figure><img src="after/{after}.png"><figcaption>Efter</figcaption></figure>'
             f'<div><h2>{title}</h2><ul>{items}</ul></div></section>')
(HERE / "index.html").write_text(html + TAIL, encoding="utf-8")
