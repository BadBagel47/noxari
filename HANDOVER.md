# Noxari — överlämning och arbetsläge

Senast uppdaterad: **2026-10-29**, Europe/Stockholm.

Läs denna fil vid en ny chatt tillsammans med `AGENTS.md` och `README.md`. Den sammanfattar användarens beslut och aktuellt läge; projektkoden och Git-historiken behövs också. Kontrollera alltid aktuell branch, HEAD och arbetskatalogens ändringar innan arbetet fortsätter. Uppgifterna nedan är en ögonblicksbild, inte en ersättning för verifiering.

## Arbetssätt som användaren har bestämt

- Kommunicera på svenska, kort och konkret.
- **Meddela rekommenderad ChatGPT-modell innan varje nytt utvecklingssteg.** Hittills har rekommendationen varit **GPT-6.1 Sol med hög resonemangsnivå**. Användaren vill kunna använda Sol; föreslå en tyngre modell bara om uppgiften motiverar det. En rekommendation betyder inte att modellen faktiskt har bytts.
- **Starta inte ett nytt utvecklingssteg utan uttryckligt klartecken.** Beskriv först dess omfattning och invänta exempelvis ”Kör”. Användaren vill kunna samla flera ändringar före samma körning. En diskussion, ett positivt omdöme eller en ny planpunkt är inte i sig ett startbesked.
- Ett ”Kör” gäller det senast föreslagna, avgränsade steget. Slutför och verifiera det steget, men påbörja inte därefter nästa etapp automatiskt.
- Efter helskärmssteget bad användaren först att UI-förfining skulle vänta. Därefter godkändes uttryckligen ett avgränsat fempunktssteg för svep, stjärnbildsurval, animation, mobil läsbarhet och markörbakgrunder. Det senare klartecknet gäller dessa fem punkter. Övrig UI- eller funktionsutveckling behöver fortsatt nytt godkännande.
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

**Aktivt godkänt steg:** användarens fem punkter om svep från objekt, Vanliga/Alla stjärnbilder, animation, större mobiltext och fyrkantiga markörbakgrunder. Förslaget godkändes med ”Låter bra. Kör”. Koden är implementerad och lokalt verifierad; publiceringskontroll återstår. Inget ytterligare steg är godkänt.

- Föregående verifierade och publicerade **appcommit**: `911347cb213d22b309a7939f6570209052fc75f7`.
- Actions: https://github.com/BadBagel47/noxari/actions/runs/40918661311 — tester, bygge och publicering lyckades.
- **65 tester passerade**. Publicerade `index-yzH8NRRI.js` och `index-CnW1uSd_.css` matchade lokalt produktionsbygge via SHA-256. Gränsgeneratorn gav byteidentiskt resultat från låsta källfiler.
- 781 officiella gemensamma gränssegment för 88 stjärnbilder (89 regioner) finns i båda vyerna, med separat reglage under Mer → Himmelsvy. De är avstängda från start. Källor/licens finns under Mer → Om och källor. Se gränsavsnittet nedan.
- Webbläsarprov för gränser passerade i 390×844, 1280×800, 844×390 och 320×568, inklusive separat reglage, båda projektioner, bevarat val/mål, EN/SV, källor och ingen sidrullning. Skärmbilder har granskats visuellt.
- Helskärms-/sensorflöden passerade med aktivt gränslager i 390×844, 1280×800, 844×390, 320×568 och 568×320, plus 390×420 för tids-/sökflöden. Canvas, nordreferens, mål och riktning bevaras över panelöppningar; Nu/Vald tid, uttrycklig återupptagning och utebliven kompassåtergång fungerar med simulerade sensorer.
- Användarens tidigare fysiska Android/Brave-bekräftelse gäller grundläggande telefonföljning och återgångsrättningen. Senare panelflöden, Messierkatalogen och gränslagret är ännu inte bekräftade på fysisk mobil.
- README, AGENTS och källdokumentation är uppdaterade. Denna slutstatus sparas i en senare dokumentationscommit; appcommit ovan anger verifierad kod.

## Det som fungerar

- Himmelsvyn fyller tillgänglig webbläsaryta utan sidrullning. Sök, Ikväll, Följ/Återuppta och Mer finns som snabbknappar. Mobil använder nederpaneler, dator/landskap sidopaneler. Plats, tidsläge och sensorstatus syns direkt; källor/licenser finns under Mer → Om och källor.
- Svepbar 360°-himmelsvy från ögonhöjd med uppåtlutning, mus/touch, knappar och tangentbord. Cirkulär himmelskarta finns som alternativ.
- Plats, datum, tid och IANA-tidszon styr beräkningarna. Nu-läget uppdateras var 30:e sekund; manuellt datum byter till tydligt märkt Vald tid. GPS hämtar plats på användarens begäran; enhetens tidszon används och kan ändras manuellt.
- Guided Finder ovanpå himlen med pilar, vinkelavvikelser, målring, centreringsmarkering inom 3°, manuellt reservläge och ungefärlig nästa uppgång för objekt under horisonten. Vägledningen visar vald plats och tid; ingen sensoråtkomst begärs automatiskt vid start.
- Telefonföljning med behörigheter, nordkalibrering och manuell reserv. GPS anger plats; riktningssensorerna anger vart telefonen pekar.
- 4 105 HYG-stjärnor till magnitud 5,8 samt fem svagare ändpunkter för stjärnbildsfigurer. Första ordningens egenrörelse från J2000 ingår.
- Linjefigurer för alla 88 stjärnbilder samt separat valbara officiella IAU-gränser från Stellariums öppna data. Gränserna visas som lila streckade linjer och är avstängda från start. Mer → Himmelsvy har separata reglage för figurer, latinska namn och gränser, i båda vyerna.
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

## Messierkatalogen — godkänd och implementerad

- Alla **110 Messierobjekt**, totalt **121 katalogposter**: 119 beräknade objekt och två stjärnbildsdemos. Befintliga objekt-ID:n och länkar bevaras.
- OpenNGC av Mattia Verga, CC BY-SA 4.0, låst commit och checksummer. Koordinater, typer, alias och 102 integrerade V-magnituder. Sju V-värden saknas och M40:s parvärde lämnas ej verifierat; andra band används inte som ersättning.
- 88 ungefärliga avstånd från NASA/Hubbles faktauppgifter, separat källänk per objekt. 19 saknar källvärde; M24/M40/M73 får inget gemensamt avstånd. Tidigare fem Messieravstånd ersätts av dessa källbundna uppskattningar.
- M24 är stjärnmolnet IC 4715, M40 ett stjärnpar, M73 en asterism. M102 följer NASA/Hubbles NGC 5866-identifiering med tydlig tvistnotis, inte OpenNGC:s M101-dubblett. M76 accepterar även NGC 651.
- Sökning hanterar exakta och nollutfyllda M/NGC/IC-ID:n, svenska/engelska namn, alias och undertyper. Alla objekt deltar i filter, sparande, höjdkurvor, Ikväll och Guided Finder.
- Astronomy Engines åtta DefineStar-platser har ersatts av gemensam J2000→horisontell rotation per tid/plats. Precession/nutation ingår; årlig aberration och parallax utelämnas som för stjärnfältet. Sirius egenrörelse och planetberäkningar bevaras. Telefonrörelser återprojicerar cachade objektpositioner.
- **60 tester passerade**, produktionsbygge lyckades. Åtta nya tester täcker katalog, specialfall, saknade uppgifter, exakta alias, jämförelse med tidigare astrometri (<0,02° i testfallen) och gemensamma nattkurvor. Mobila/datorbaserade webbläsarprov täcker sökning, källor, osäkra värden, sparande, objektlänk, Guided Finder och utrustningsfilter. Helskärms-/sensorflöden passerade åter i fem skärmstorlekar plus reducerad höjd; sensorer simulerades.
- Ingen fortsatt gränssnittsförfining ingick. Utrustningsråd och Ikväll är breda heuristiker, utan modell för ytljusstyrka, instrumentöppning eller faktisk observationsframgång.
- Källor och reproduktion: `src/generated/README.md`, `data/README.md`. Test/bygge kräver inga datanedladdningar.

## Officiella stjärnbildsgränser — godkända och implementerade

- 781 unika gemensamma B1875-gränssegment för alla 88 stjärnbilder (89 regioner, eftersom Serpens har två delar). Samma låsta Stellarium-index och CC BY-SA 4.0 som figurerna; gränsernas ursprung anges som Pierre Barbier. Generatorn verifierar både data och licenstext via checksummer.
- B1875-meridianer och deklinationsparalleller samplas före omvandling till J2000 och vald tid/plats. RA-övergången vid 24h och polernas småcirklar bevaras. Egenrörelse tillämpas inte på stjärnbildsområden. Omvandlingen följer Astronomy Engines B1875-konvention; visuellt underlag, inte astrometri på bågsekundnivå.
- Nätet cachas per tid/plats och återprojiceras vid telefonrörelse. Linjer klipps vid bildytan och bryts när prover ligger under geometriska horisonten eller bakom kameran. Högst 1° koordinatsteg; en liten slutlucka kan finnas vid klippgränsen.
- Eget reglage i Mer → Himmelsvy, av från start och oberoende av figurer/namn. Lila streckade gränser skiljs från blå figurer. Källor/licens syns i Mer → Om och källor. Valet bevaras mellan vyer och paneler under sessionen, inte efter omladdning.
- Fem nya tester: täckning/unikhet/sammanhängande ändpunkter, oberoende områdesuppslagning på båda sidor om alla 781 segment, polära paralleller/RA-övergång, datum/plats inklusive poler och klippning utan förbindelser genom dolda delar. Totalt 65 tester.
- Webbläsarprov passerade för separat reglage, båda projektioner, bevarat val/mål, EN/SV, källor och ingen sidrullning i 390×844, 1280×800, 844×390 och 320×568. Geometrin har granskats visuellt. Helskärms-/sensorprov med aktivt gränslager passerade i fem skärmstorlekar (även 568×320), plus reducerad höjd för tids-/sökflöden. Kalibrering, panelpaus/återupptagning, bevarad canvas och utebliven kompassåtergång verifierades med simulerade sensorer.
- Reproduktion och metodgränser: `src/generated/README.md`, `scripts/generate_boundaries.py`. Generatorn återskapar data byteidentiskt från låsta indata. Inga nya beroenden eller nätanrop i appen.

## Svep, stjärnbildsurval och mobil läsbarhet — godkänt fempunktssteg

- Svep kan börja på objektpricken eller dess etikett. Först efter 8 px rörelse tas pekaren över för panorering; ett sådant svep öppnar aldrig objektkortet. Små tryckrörelser tolereras. Touchtryck aktiveras vid uppsläpp och eventuellt efterföljande kompatibilitetsklick stoppas, så att snabba tryck efter svep fungerar. Avbrutna tryck och uppsläpp utanför vyn rensar gesten. Enter/Space och Guided Finder-knappar bevaras.
- **Vanliga (24)** är nytt standardläge i Mer → Himmelsvy, med alternativet **Alla (88)**. Ett redaktionellt Noxariurval med både norra och sydliga stjärnbilder; ingen officiell popularitetsklassning. Hela urvalet listas i README. Valet bevaras mellan vyer/paneler under sessionen; omladdning återställer standard. IAU-gränsernas kompletta nät ändras inte.
- Figurer ritas in och tonas fram under 420 ms när synliga linjer kommer in i bild. Framsteg bevaras under svep/telefonrörelse. Korta kantpassager (<180 ms) startar inte om animationen. Reducerad rörelse följs direkt och vid ändrad systeminställning. Inga fortsatta animationsbildrutor begärs när allt är färdigt.
- Beskrivningar 16 px, sekundär paneltext huvudsakligen 14–15 px, objekt-/stjärnetiketter 13 px och stjärnbildsnamn 15 px. Tydligare kontrast, radavstånd, radbrytning, större checkboxar och minst 44 px tryckytor. Landskapspaneler och Guided Finder har kontrollerats. Lång tidsrad klipps inom statusknappen; fullständiga värden läses/ändras i Tid och plats.
- Markörernas rektangulära bakgrund och mobila tryckfyrkant är borttagna i båda vyerna. Tryck-/tangentbordsfokus använder rund kontur på pricken. Täta objektetiketter kan fortfarande överlappa; komplett etikettplacering ingår inte.
- **71 tester passerar** och produktionsbygge lyckas. Sex nya tester täcker urval/geometri, animationstid/stabila framsteg, kantpassager, reducerad rörelse, klippning och växande linjer/etiketter. Webbläsarprov i fem skärmstorlekar täcker svep som börjar på markörer med mus/touch, tryck efter svep, urval mellan vyer, avslutad animationsloop, större text och genomskinliga markörer. Separata prov för avbruten touch, efterföljande tryck, små fingerrörelser, Enter/Space, rund fokuskontur och svenska kontroller. Befintliga helskärms-/sensorprov passerade åter med aktivt gränslager. Sensorer är simulerade; fysisk mobilvalidering återstår.
- Inga nya beroenden, datakällor eller astronomiska beräkningsändringar.

## Nästa utvecklingssteg — inväntar nytt klartecken

Fempunktssteget ska avslutas med verifierad Pages-publicering. Föreslå därefter en avgränsad nästa uppgift och rekommenderad modell innan implementation. De senare planpunkterna nedan är fortsatt planerade, inte automatiskt startgodkända. Övrig UI-förfining och nya funktioner behöver nytt klartecken.

### Senare delar av planen

- Bredare mobilprovning, särskilt iOS, kompassprecision och porträtt/landskap.
- Djupare stjärnkatalog och zoom. Officiella stjärnbildsgränser är genomförda.
- Licensierade objektbilder med källangivelser.
- Rikare delningsförhandsvisningar och hela observationslistor.
- Kamera-overlay/AR är uttryckligen **låg prioritet och ska komma senare**. Telefonföljningen behöver ingen kamerabild.

## Begränsningar och källor

- Appen är en delvis beräknad prototyp, inte ett fullständigt eller instrumentkalibrerat planetarium.
- Horisonten är generisk och plan. Terräng, väder, ljusföroreningar, atmosfärisk dämpning, instrumentöppning och faktisk observationsframgång simuleras inte.
- Stjärnljus är stiliserat. Egenrörelsen är en första ordningens approximation; radiell hastighet, perspektivacceleration och årlig parallax ingår inte.
- Stjärnbildsfigurerna är schematiska; officiella IAU-gränser är ett separat valbart lager med samplad klippning och Astronomy Engines B1875-konvention. Orion och Stora björnen har fortfarande tydligt märkta demokurvor.
- ”Ikväll” använder en redovisad heuristik, inte en väderprognos eller sannolikhet för synlighet. Högsta höjd på diagrammet kan skilja sig från rekommenderad tid. Korta tillfällen kan missas mellan provpunkterna.
- Sol-/planetmarkörer visar positioner och innebär inte garanterad synlighet. Förklaringar och utrustningsråd ska bevaras.
- HYG, Stellariums använda figur- och gränsdata och den anpassade OpenNGC-katalogen är CC BY-SA 4.0. Bevara åtkomlig attribution, licenslänkar och uppgift om bearbetning i Om och källor. Ingen extern astronomisk bild är ännu inbäddad.
- Se `src/generated/README.md` för exakta källor, checksummer och reproduktion. Se `README.md` för beräkningsmodell och begränsningar. NASA/JPL-referenser för planeter ligger i `tests/fixtures/planets-horizons.json` och testerna körs utan nätverk.
- Lagra inga hemligheter, privata positionsuppgifter eller fullständiga chattloggar i överlämningsfilen.

## Kodkarta

| Fil | Ansvar |
| --- | --- |
| `src/main.tsx`, `src/SkyPanel.tsx` | Fast himmelsyta, paneltillstånd, observationstid/plats, sökning och objektdetaljer |
| `src/HorizonView.tsx`, `src/SkyMap.tsx` | Perspektivvy respektive cirkulär karta |
| `src/skyProjection.ts`, `src/starMotion.ts` | Horisontella koordinater, projektion och egenrörelse |
| `src/constellations.ts`, `src/constellationReveal.ts`, `src/useReducedMotion.ts` | Figururval, klippning, inritning och reducerad rörelse |
| `src/constellationBoundaries.ts`, `src/generated/` | B1875-gränser, transformation och licensierade katalogdata |
| `scripts/generate_boundaries.py` | Reproducerbart, licensverifierat IAU-gränsunderlag |
| `src/deviceDirection.ts`, `src/usePhoneOrientation.ts`, `src/PhoneControls.tsx` | Sensorer, datakällor, kalibrering och kontrollgränssnitt |
| `src/astronomy.ts` | Positioner, fotometri och nattkontext |
| `src/recommendations.ts`, `src/TonightPanel.tsx` | Rangordning och förklaringar för ”Ikväll” |
| `src/GuidedFinder.tsx`, `src/finderGuidance.ts` | Vägledningslager, vinkelavvikelser och centrering |
| `src/VisibilityChart.tsx` | Höjdkurvor och skymningsbakgrund |
| `src/data.ts`, `src/catalogSearch.ts` | Objektkatalog, metadata och alias-/ID-sökning |
| `scripts/generate_messier.py`, `src/generated/messier.ts`, `data/messier-distances.json` | Reproducerbar Messierkatalog och källbundna avståndsfakta |
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
