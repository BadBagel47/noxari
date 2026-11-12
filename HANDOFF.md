# Noxari — handoff

- **Agentregler:** anpassat till v1.4 (2026-11-12). Globala regler: https://raw.githubusercontent.com/BadBagel47/agent-rules/main/AGENTS.md
- **Inventory: 2026-11-12** — en gren (`main`), inga öppna PR:er/issues, inga agentspecifika regelfiler, inga hemligheter eller privata koordinater i git-historiken (`.gitignore` täcker `.env`).
- **Projektspråk:** engelska (README, kod, commits, issues). Appens gränssnitt är tvåspråkigt EN/SV och följer enhetens språk (Auto/SV/EN).
- **Publicering:** push till `main` → GitHub Actions (`.github/workflows/deploy.yml`, tester + bygge) → GitHub Pages på https://noxari.trythis.one/ (egen domän, HTTPS påtvingat). Agenten pushar direkt till `main`; auto-merge-workflow behövs inte.

## Nuläge

En mobilförst, Stellarium-inspirerad planetariewebbapp (React/TypeScript/Vite) med beräknad himmel för vald tid och plats: 360°-vy med telefonföljning, stjärnkarta, HYG-stjärnor med färg och kikarstjärnor, Messier, planeter, dvärgplaneter, ISS, IAU-gränser, figurer och teckningar, färgad Vintergata, landskap, Ikväll med förslag/händelser/molnprognos, objektguide, visning och demoläge, sparade objekt, observationslogg, offline/installation. Ren standardvy (linjer, gränser, teckningar, rutnät av vid start). Inget är fysiskt verifierat på mobil sedan 2026-11-12 förutom etiketter (B-003/F-008) och första kompasstart (B-007, observeras).

## Senaste ändringar

1. 2026-11-12 — Anpassning till agentregler v1.4: denna fil (tidigare HANDOVER.md, historiken i docs/HANDOFF_LOG.md), kortade projektregler, backlog med prioritet/klart/parkerat/körförslag (äldre anteckningar i docs/BACKLOG_HISTORY.md), integritetstext i Om (F-058) och rättad Om-text om Vintergatan/landskapet. 233 tester, bygge och 15/15 funktionsflöden passerar.
2. 2026-11-12 — F-056 + F-057: färgad Vintergata, neutral natthimmel, ny ljusstyrkekurva, landskapssiluett; demoläget mjukare (lägre placering, sammanhängande zoom, svep för Kvällens förslag); B-012.
3. 2026-11-12 — B-010 (siffersökning) och B-011 (listradens bakgrund).
4. 2026-11-12 — F-049 + F-050: ren standardvy, stjärnfärger, tryckbara stjärnor med träffprioritet; mindre mark i startvyn.
5. 2026-11-12 — F-046 + F-047 + F-048: demoläge steg 2, telefonriktning under felsökning, 123 objektfoton.

Full historik med testbevis och commits: [docs/HANDOFF_LOG.md](docs/HANDOFF_LOG.md) och git.

## Nästa steg

Se ”Proposed runs” i [BACKLOG.md](BACKLOG.md). Ingen körning är godkänd. Fysisk mobilkontroll av allt från 2026-11-12 väntar på användaren.

## Mål och arbetssätt

- Målgrupp nybörjare–medel; allt ska vara så enkelt som möjligt (F-012). Stellarium-lik känsla och täthet föredras.
- Arbetsflödet följer de globala agentreglerna (samla poster → körförslag med modell/nivå → ”Kör” → test, publicering, rapport). Användaren arbetar bara via chatten.

## Beslut

- 2026-11-12 — ID-systemet behålls: F-### och B-### med separata nummerserier (ingen gemensam serie).
- 2026-11-12 — Handoff kort enligt agentreglerna; detaljerad historik i docs/HANDOFF_LOG.md.
- 2026-11-12 — Rapporterade buggar samlas och föreslås före rättning, utom när användaren uttryckligen ber om direkt rättning.
- 2026-11-12 — Gränssnittets språk följer enheten (Auto) med manuellt val SV/EN; `?lang=` gäller för besöket.
- 2026-11-12 — Ren standardvy som Stellarium: figurer, gränser, teckningar, rutnät och planeternas väg av från start; Vintergata och landskap på. Synlighetsnivå Blotta ögat som standard; hela solsystemet syns alltid.
- 2026-11-12 — Stellariums figurteckningar (Free Art License) med kredit; ESO/S. Brunier-panoramat (CC BY 4.0) för Vintergatan; objektfoton bara med fri licens och kredit.
- 2026-11-12 — Pilknappar och manuell centrering borttagna; Följ visas bara med pekskärm; Telefonriktning under Prototyp · felsökning.
- 2026-11-12 — Startvy: darkest-night-förhandsvisning (F-021, tillfällig teststandard) behålls tills vidare.
- 2026-11-04 — Funktioner före vidare optimering: B-004 (ryckighet) parkerad; B-001 (riktningsdrift) parkerad sedan 2026-10-31.
- 2026-11-12 — Demoläge: sparade listor behåller användarens ordning; Kvällens förslag ordnas som ett svep och närliggande objekt hoppas över.

## Begränsningar och engångsåtgärder

- 2026-11-12: GitHub GraphQL (`gh pr/issue list`) och Pages-API är spärrade via proxyn; REST fungerar. Schemalagd körning i workflow-filen nekades av behörighetsklassning.
- Molnmiljön ”noxari” har nätåtkomst till ESO, Open-Meteo, CelesTrak, Wikipedia/Commons och den publicerade sajten (godkänt av användaren).
- Klart: egen domän + Enforce HTTPS (användaren, 2026-11-12). Ersatt/inte behövd: daglig schemalagd publicering (F-042 hämtar ISS-data i appen).

## Dokumentkarta

| Dokument | Innehåll |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Hänvisning till globala agentregler + projektregler |
| [BACKLOG.md](BACKLOG.md) | Buggar, funktioner, prioritet, körförslag, klart |
| [README.md](README.md) | Produktbeskrivning, start, data och licenser |
| [docs/HANDOFF_LOG.md](docs/HANDOFF_LOG.md) | Fullständig tidigare handoff-historik med testbevis |
| [docs/BACKLOG_HISTORY.md](docs/BACKLOG_HISTORY.md) | Äldre backlog-anteckningar |
| [src/generated/README.md](src/generated/README.md), [data/README.md](data/README.md) | Datakällor, versioner, licenser, generatorer |
| [docs/DEVELOPMENT_DIAGNOSTICS.md](docs/DEVELOPMENT_DIAGNOSTICS.md) | Utvecklarverktyg och testskript |
| [docs/DIRECTION_STABILITY.md](docs/DIRECTION_STABILITY.md), [docs/DAYLIGHT_DIRECTION_ANALYSIS.md](docs/DAYLIGHT_DIRECTION_ANALYSIS.md) | Telefonriktning, kompass, B-001 |
| [docs/PERFORMANCE_ANALYSIS.md](docs/PERFORMANCE_ANALYSIS.md), [docs/PERFORMANCE_REPORT.md](docs/PERFORMANCE_REPORT.md), [docs/PHONE_PERFORMANCE_ANALYSIS.md](docs/PHONE_PERFORMANCE_ANALYSIS.md), [docs/SURFACE_COMPARISON.md](docs/SURFACE_COMPARISON.md), [docs/SURFACE_REUSE_AND_TEST_DEFAULTS.md](docs/SURFACE_REUSE_AND_TEST_DEFAULTS.md), [docs/FIGURE_CACHE_AND_STARTUP.md](docs/FIGURE_CACHE_AND_STARTUP.md) | Prestanda (B-004) och mätningar |
| [docs/GPU_RENDERING.md](docs/GPU_RENDERING.md), [docs/GPU_PROTOTYPE.md](docs/GPU_PROTOTYPE.md) | GPU-ritning och prototyp |
| [docs/SHARE_PREVIEWS.md](docs/SHARE_PREVIEWS.md) | Delningssidor (F-006) |
| [docs/FUNCTIONAL_REVIEW.md](docs/FUNCTIONAL_REVIEW.md), [docs/FEATURE_GAP_ANALYSIS_2026-11.md](docs/FEATURE_GAP_ANALYSIS_2026-11.md), [docs/FULLSCREEN_PLAN.md](docs/FULLSCREEN_PLAN.md) | Granskningar och planer |
| [docs/design/](docs/design/), [docs/measurements/](docs/measurements/) | Designskisser och mätfiler |
