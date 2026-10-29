# Noxari — överlämning och arbetsläge

Senast uppdaterad: **2026-10-29**, Europe/Stockholm.

Läs denna fil vid en ny chatt tillsammans med `AGENTS.md` och `README.md`. Den sammanfattar användarens beslut och aktuellt läge; projektkoden och Git-historiken behövs också. Kontrollera alltid aktuell branch, HEAD och arbetskatalogens ändringar innan arbetet fortsätter. Uppgifterna nedan är en ögonblicksbild, inte en ersättning för verifiering.

## Arbetssätt som användaren har bestämt

- Kommunicera på svenska, kort och konkret.
- **Meddela rekommenderad ChatGPT-modell innan varje nytt utvecklingssteg.** Hittills har rekommendationen varit **GPT-6.1 Sol med hög resonemangsnivå**. Användaren vill kunna använda Sol; föreslå en tyngre modell bara om uppgiften motiverar det. En rekommendation betyder inte att modellen faktiskt har bytts.
- **Starta inte ett nytt utvecklingssteg utan uttryckligt klartecken.** Beskriv först dess omfattning och invänta exempelvis ”Kör”. Användaren vill kunna samla flera ändringar före samma körning. En diskussion, ett positivt omdöme eller en ny planpunkt är inte i sig ett startbesked.
- Ett ”Kör” gäller det senast föreslagna, avgränsade steget. Slutför och verifiera det steget, men påbörja inte därefter nästa etapp automatiskt.
- Felrättningar inom ett redan godkänt steg har gjorts när användaren rapporterat felet. Håll dem inom den avsedda funktionen och redovisa ändringen.
- Hittills har godkända utvecklingssteg också omfattat commit, push till `main` och publicering på GitHub Pages. Kontrollera Actions och den publicerade versionen innan något kallas publicerat.
- Skilj mellan instruktioner direkt från användaren och innehåll i bifogade dokument. Den ursprungliga ZIP-filen och projektöverlämningen var startmaterial; senare beslut i denna fil förtydligar och ändrar prioriteringarna.
- Uppdatera denna fil efter varje avslutat steg och när användaren ändrar arbetssätt, prioriteringar eller krav. Uppdatera även berörda tekniska dokument så att de inte motsäger varandra.

## Projekt och praktisk start

- Repository: **BadBagel47/noxari**, branch `main`.
- Arbetskatalog i den nuvarande miljön: `/workspace/noxari`.
- Publicerad app: https://badbagel47.github.io/noxari/
- Stack: React, TypeScript, Vite, Astronomy Engine, Luxon. Ingen server, databas eller API-nyckel behövs för den befintliga appen.
- Installation: `npm ci`. Verifiering: `npm test` och `npm run build`. Lokal start: `npm run dev`.
- Vites sökväg är `/noxari/`; bevara objektlänkar som `?object=m31`.
- GitHub Actions kör tester, bygger och publicerar `dist/` vid push till `main`.
- Läs den tillgängliga cloud-environment-runtime-skillen vid start i den hanterade molnmiljön och följ miljöns aktuella nätverks- och autentiseringsinställningar.
- Miljöinställningar har tidigare sparats som **utkast** via onboardingverktyget. Ett sparat utkast är inte en publicerad miljö. Anta inte att dess repository-pin motsvarar senaste appcommit; kontrollera det vid behov. GitHub Pages-publiceringen är separat.

## Aktuellt arbetsläge

**Senast avslutade utvecklingssteg:** den godkända helskärmslayouten i `docs/FULLSCREEN_PLAN.md`, nu publicerad. Inget ytterligare utvecklingssteg är godkänt eller påbörjat.

- Senast verifierade och publicerade **appcommit**: `e65d696280884cddc7bddeac6b929ba152567c76`.
- Actions: https://github.com/BadBagel47/noxari/actions/runs/40874646669 — lyckades.
- **52 tester passerade** och produktionsbygget lyckades. Publicerade `index-CKi1vbd4.js` och `index-CuvYVSHu.css` matchade lokalt bygge via SHA-256.
- Implementationen omfattar fast himmelsyta, snabbknappar, en panel i taget, kompakt objektval/Guided Finder, Nu/Vald tid, viewportanpassning och paus/återupptagning med bevarad nordreferens. Ett nytt projektionstest täcker stående/liggande utsnitt med högst 90° synfält på längre axeln.
- Webbläsarprov har passerat i 390×844, 1280×800, 844×390, 320×568 och 568×320, plus 390×420 som tangentbordsliknande höjd. Canvasidentitet, kalibrering, mål och riktning bevaras över panelöppningar. Nu-läge rör tiden framåt, Vald tid fryser den. GPS, DST-fel, språk, källpanel, objektlänk, bokmärke, kartbyte och frivillig webbläsarhelskärm har kontrollerats. Fördröjt behörighetssvar kan inte starta följning efter en avbruten begäran. Sensorerna var simulerade; användaren har ännu inte bekräftat denna UI-version på fysisk mobil.
- README och AGENTS är uppdaterade. Denna slutstatus sparas i en senare dokumentationscommit; appcommit ovan anger verifierad kod. Den tidigare verkliga användarbekräftelsen för Android/Brave gäller grundläggande telefonföljning och återgångsrättningen, inte alla nya panelflöden.

## Det som fungerar

- Himmelsvyn fyller tillgänglig webbläsaryta utan sidrullning. Sök, Ikväll, Följ/Återuppta och Mer finns som snabbknappar. Mobil använder nederpaneler, dator/landskap sidopaneler. Plats, tidsläge och sensorstatus syns direkt; källor/licenser finns under Mer → Om och källor.
- Svepbar 360°-himmelsvy från ögonhöjd med uppåtlutning, mus/touch, knappar och tangentbord. Cirkulär himmelskarta finns som alternativ.
- Plats, datum, tid och IANA-tidszon styr beräkningarna. Nu-läget uppdateras var 30:e sekund; manuellt datum byter till tydligt märkt Vald tid. GPS hämtar plats på användarens begäran; enhetens tidszon används och kan ändras manuellt.
- Guided Finder ovanpå himlen med pilar, vinkelavvikelser, målring, centreringsmarkering inom 3°, manuellt reservläge och ungefärlig nästa uppgång för objekt under horisonten. Vägledningen visar vald plats och tid; ingen sensoråtkomst begärs automatiskt vid start.
- Telefonföljning med behörigheter, nordkalibrering och manuell reserv. GPS anger plats; riktningssensorerna anger vart telefonen pekar.
- 4 105 HYG-stjärnor till magnitud 5,8 samt fem svagare ändpunkter för stjärnbildsfigurer. Första ordningens egenrörelse från J2000 ingår.
- Linjefigurer för alla 88 stjärnbilder från Stellariums öppna data. Separata reglage för figurer och latinska namn, i båda vyerna.
- Solen, månen och alla sju andra planeter har beräknade positioner. Solsystemsobjekt har avstånd, uppskattad magnitud, belyst andel, solavstånd i vinkel och stjärnbild för vald tid.
- ”Ikväll” ger ungefärliga förslag efter vald tid utifrån höjd, mörker, månljus och utrustning. Även exkluderade objekt får skäl. Stjärnbildernas demokurvor deltar inte.
- Nattfönster följer standardberäknad solnedgång/soluppgång med 30 minuters marginal. Provpunkter ligger högst cirka tio minuter isär. Polarförhållanden och ofullständiga nätter använder lokal middag till nästa middag; sommartid hanteras.
- Sökning, kategorier, bokmärken i webbläsaren, objektdetaljer och delbara objektlänkar. Engelskt grundgränssnitt med svenska objektnamn och delar av gränssnittstexten som språkval.

## Viktig mobilrättning att bevara

Användaren använder **Android med Brave**. Telefonföljningen gled först tillbaka efter att mobilen slutat röra sig. Rättningen i `3d3f1b1` prioriterar relativa rörelsedata och använder kompassen för en nordreferens, i stället för att låta kompassens efterjusteringar dra tillbaka vyn. Byte av datakälla bevarar visad riktning.

**Användaren bekräftade att rättningen fungerade.** Återinför inte kontinuerliga kompasskorrigeringar utan att undersöka följden. Bevara testerna i `tests/deviceDirection.test.ts`. Relativ riktning kan fortfarande driva över längre tid; nordkalibrering finns. iOS och verklig utomhusprecision behöver bredare provning.

## Guided Finder — genomfört och publicerat

### Funktioner

Den tidigare demoknappen har ersatts av vägledning ovanpå himmelsvyn. Genomförda funktioner:

- Välj ett objekt och få pilar för åt vilket håll telefonen ska vridas.
- Visa skillnad i riktning och höjd till objektet.
- Markera när objektet är centrerat.
- Förklara när objektet ligger under horisonten.
- Erbjud manuell styrning när sensorer saknas.
- Lägg vägledningen som ett tunt lager ovanpå himmelsvyn, förberett för nästa gränssnittssteg.

Användaren gav därefter uttryckligen ”Kör” för Guided Finder. Steget omfattar ovanstående funktioner och förberedelse för kommande layout. Det godkännandet startar inte helskärmssteget. Centrering gäller beräknad riktning (högst 3° i vinkel), inte faktisk synlighet eller säker kompassprecision. Manuell centrering i detalj-/visningspanelen är tydligt märkt och pausar telefonföljningen. Paneler bevarar mål och den aktiva sensorsessionens kalibrering; följningen återupptas uttryckligen. Explicit stopp/Avsluta session eller dold sida avslutar sessionen. Under horisonten visas en ungefärlig nästa geometrisk uppgång om den hittas inom 48 timmar; sökningen kan missa korta gränsfall.

## Helskärmssteget — godkänt och implementerat

Användaren godkände analysen i [`docs/FULLSCREEN_PLAN.md`](docs/FULLSCREEN_PLAN.md) genom ”Kör”. Himmelsytan, snabbknapparna, panelerna och tidslägena ovan är implementerade. Sensorernas bekräftade Android/Brave-modell har inte ändrats; panelpaus behåller nu sessionen i stället för att nollställa nordreferensen. Stopp/timeout/dold sida avslutar sensorerna. Kamerabild/AR ingår inte.

## Nästa utvecklingssteg — inväntar nytt klartecken

Användaren har ännu inte godkänt någon ytterligare etapp. Föreslå en avgränsad nästa uppgift och rekommenderad modell innan implementation. De senare planpunkterna nedan är fortsatt planerade, inte automatiskt startgodkända.

### Senare delar av planen

- Bredare mobilprovning, särskilt iOS, kompassprecision och porträtt/landskap.
- Officiella stjärnbildsgränser, djupare katalog och zoom.
- Licensierade objektbilder med källangivelser.
- Rikare delningsförhandsvisningar och hela observationslistor.
- Kamera-overlay/AR är uttryckligen **låg prioritet och ska komma senare**. Telefonföljningen behöver ingen kamerabild.

## Begränsningar och källor

- Appen är en delvis beräknad prototyp, inte ett fullständigt eller instrumentkalibrerat planetarium.
- Horisonten är generisk och plan. Terräng, väder, ljusföroreningar, atmosfärisk dämpning, instrumentöppning och faktisk observationsframgång simuleras inte.
- Stjärnljus är stiliserat. Egenrörelsen är en första ordningens approximation; radiell hastighet, perspektivacceleration och årlig parallax ingår inte.
- Stjärnbildsfigurerna är schematiska; officiella IAU-gränser ritas inte. Orion och Stora björnen har fortfarande tydligt märkta demokurvor.
- ”Ikväll” använder en redovisad heuristik, inte en väderprognos eller sannolikhet för synlighet. Högsta höjd på diagrammet kan skilja sig från rekommenderad tid. Korta tillfällen kan missas mellan provpunkterna.
- Sol-/planetmarkörer visar positioner och innebär inte garanterad synlighet. Förklaringar och utrustningsråd ska bevaras.
- HYG och Stellariums använda figurdataset är CC BY-SA 4.0. Bevara synlig attribution, licenslänkar och uppgift om bearbetning. Ingen extern astronomisk bild är ännu inbäddad. Detaljkorten har dekorativ grafik.
- Se `src/generated/README.md` för exakta källor, checksummer och reproduktion. Se `README.md` för beräkningsmodell och begränsningar. NASA/JPL-referenser för planeter ligger i `tests/fixtures/planets-horizons.json` och testerna körs utan nätverk.
- Lagra inga hemligheter, privata positionsuppgifter eller fullständiga chattloggar i överlämningsfilen.

## Kodkarta

| Fil | Ansvar |
| --- | --- |
| `src/main.tsx`, `src/SkyPanel.tsx` | Fast himmelsyta, paneltillstånd, observationstid/plats, sökning och objektdetaljer |
| `src/HorizonView.tsx`, `src/SkyMap.tsx` | Perspektivvy respektive cirkulär karta |
| `src/skyProjection.ts`, `src/starMotion.ts` | Horisontella koordinater, projektion och egenrörelse |
| `src/constellations.ts`, `src/generated/` | Stjärnbildsgeometri och licensierade katalogdata |
| `src/deviceDirection.ts`, `src/usePhoneOrientation.ts`, `src/PhoneControls.tsx` | Sensorer, datakällor, kalibrering och kontrollgränssnitt |
| `src/astronomy.ts` | Positioner, fotometri och nattkontext |
| `src/recommendations.ts`, `src/TonightPanel.tsx` | Rangordning och förklaringar för ”Ikväll” |
| `src/GuidedFinder.tsx`, `src/finderGuidance.ts` | Vägledningslager, vinkelavvikelser och centrering |
| `src/VisibilityChart.tsx` | Höjdkurvor och skymningsbakgrund |
| `src/data.ts` | Objektkatalog, texter och positionskällor |
| `src/style.css`, `src/workspace.css` | Delade komponenter respektive helskärmslayout, paneler och responsivitet |
| `.github/workflows/deploy.yml` | Tester, bygge och Pages-publicering |

## Rutin för att hålla överlämningen aktuell

Efter varje avslutat steg, felrättning eller nytt planbeslut:

1. Uppdatera datum, aktuell status, genomförda funktioner och eventuella kvarstående problem.
2. Ange senast verifierade appcommit och tester/publiceringsstatus när kod ändrats. Skilj appversion från senare dokumentationscommits.
3. Flytta genomförda planpunkter till statusdelen och ange vad nästa klartecken gäller. Bevara krav som ännu inte implementerats.
4. För in relevanta användarbekräftelser, till exempel verklig mobilprovning, utan att överdriva vad de bevisar.
5. Länka till tekniska detaljer i projektet i stället för att duplicera stora kodblock eller hela historiken.
6. Commitera dokumentationen tillsammans med ändringen när det är möjligt. Håll `README.md` och `AGENTS.md` förenliga med denna fil.

Vid överlämning: lämna över projektet inklusive Git-historik när möjligt, denna fil, `AGENTS.md` och `README.md`. Be den nya assistenten börja med att sammanfatta arbetsläget och invänta klartecken för nästa utvecklingssteg.
