# Funktionsanalys 2026-11-12

Jämförelse mot Stellarium/Sky Guide för nybörjare–medelvana, baserad på nuvarande kod och funktioner. Endast analys; inget är startgodkänt.

## Saknas — hög nytta
- F-026 Namn på ljusa stjärnor + tryck på stjärna. HYG-urvalet har egennamn men de visas inte och stjärnor går inte att välja (endast objektmarkörer).
- F-027 Tidsreglage. I dag finns bara datum/tid-fält, Nu och kvällsförhandsvisning.
- F-028 Offline/installerbar app. Ingen manifest/service worker finns.
- F-029 Händelsekalender (månfaser, meteorskurar, förmörkelser, planetmöten). Astronomy Engine kan räkna faser/förmörkelser/konjunktioner lokalt; meteorskurar som fast, källhänvisad lista.
- F-030 Molnprognos. Kräver extern tjänst; avrunda positionen och märk som prognos.

## Saknas — medel
- F-031 Måne upp/ned och fas tydligt. F-032 ISS-passager. F-033 Observationslogg. F-034 Introduktion. F-035 Ekliptikalinje. F-036 Stjärnbildsinfo.

## Befintliga förbättringar
- F-024 Rödfilter, F-025 UX-översyn (godkänd plan).
- B-004 svepflyt (pausad; Stellarium upplevs mjukare) — bör tas efter UX-stegen med prestandakontroll.
- F-021 tillfällig kvällsstart tas bort när testfasen är över. B-001/B-007 oförändrade.

## Föreslagen ordning
1. F-025 steg 1 + F-024.
2. F-025 steg 2 + F-026 + F-035.
3. F-027 + F-028.
4. F-029 + F-031, därefter F-030/F-032/F-033/F-034/F-036 efter behov.

## Visuellt (tillägg)
- F-037 Mjuka övergångar: i dag byter paneler, vyläge, centrering, Följ-start, tidsbyten och lager läge direkt utan animation (endast etiketttoning och små knappeffekter finns).
- F-038 Objektsymboler: i dag visas alla objekt som färgade prickar; typer skiljs inte åt visuellt.
- F-039 Himlens visuella förfining (stjärnfärger, månfas, planetskivor, horisontsken, väderstreck, textnivåer).
