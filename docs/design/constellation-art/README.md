# Stjärnbildsteckningar — stiltest (F-041)

Godkänt med ”Kör” 2026-11-12 (Opus). Endast skiss; appen är oförändrad.

- `figures.json`: figurstjärnor (HYG-positioner) och figurlinjer för Ori, UMa, Cas, Cyg ur appens befintliga data.
- `project.py`: gnomonisk projektion (norr upp, öster vänster) till 400×400.
- `art.py`: egna, handskrivna SVG-banor runt stjärnorna och två stilar (A fin linjekonst, B mjuk silhuett). Inget är kalkerat från tredjepartsteckningar.
- `styletest.html` / `styletest.png`: resultat.

Nästa steg efter val av stil: rita fler figurer (förslagsvis de 24 vanliga), lägga dem som eget lager som följer himlens projektion, tona dem vid zoom och kontrollera prestanda.

## Inspiration (stiltest 3)

Tittade på Stellariums västerländska illustrationer (sky culture `modern`, pinnad commit daace2a…; licens enligt dess description.md: *Illustrations: Free Art License*, text/data CC BY-SA 4.0) för Orion, Ursa Major, Cassiopeia och Cygnus. Inga bilder har kopierats, kalkerats eller lagts i repot; endast stilprinciper togs med: stora figurer, rörelse i poserna, tydlig ytterkontur med få tunna detaljlinjer, organiska former. Wikimedia Commons (gamla atlaser i public domain) var inte nåbart från exekveringsmiljön.
