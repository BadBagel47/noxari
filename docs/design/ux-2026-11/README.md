# UX-skiss, november 2026

Designskiss utan appkodändringar. Godkänd att ta fram av användaren 2026-11-12 (”Kör”, rekommenderad modell Opus).

- `before/` – skärmbilder av nuvarande app (390×844, @2x, nattförhandsvisning Stockholm).
- `after/` – förslag, renderade från `mockups/*.html` ovanpå en riktig himmelsbild (`assets/sky.png`, svenskt läge, överlägg dolda).
- `compare/jamforelse-1..7.png` och `index.html` – före/efter med kommentarer. Bygg om med `python3 build_index.py`.

## Förslagets huvuddrag

1. Nedre rad: Sök · Ikväll · Lager · Tid & plats · Mer (Stellarium-lik täthet, inställningar ett tryck bort).
2. En Följ-knapp uppe till höger ersätter Manual + Follow.
3. Lager-snabbpanel med stora reglage, vy och Vanliga/Alla; Visning och Inställningar slås ihop.
4. Mer grupperas: Mina objekt · Inställningar (Språk Auto/SV/EN, Helskärm, Telefonriktning) · Prototyp/felsökning · Om.
5. Kompakt söklista med liten höjdkurva; ny filterknapp Synligt nu.
6. Ikväll: nattsammanfattning + förslag först; utrustning som knappar; skäl och ca-tider synliga; begränsning på en rad.
7. Tid & plats: Nu / Ikväll (mörkast) / Välj, Använd min position som huvudknapp, koordinater under Avancerat.
8. Objektkort med typ, höjd och bästa tid samt Guida/Detaljer/Spara/Dela.

## Oförändrat / att beakta vid bygge

- F-020 (alla lager på), F-021 (kvällshimmelsstart med synlig märkning) och synliga felsökningsverktyg behålls.
- Språk Auto = operativsystemets/webbläsarens språk (svenska annars engelska) med manuell överstyrning.
- Begränsningar och ca-tider ska fortsatt vara synliga enligt AGENTS.md; skissen kortar texten men tar inte bort den.
- ”Rutnät” och ”Synligt nu” är nya idéer som kräver eget godkännande. Siffror i skissen (tider, höjder, månfas) är illustrativa.
- Rendering, sensorlogik och beräkningar påverkas inte; prestanda kontrolleras ändå vid bygget.
