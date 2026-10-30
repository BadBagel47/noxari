# Noxari — överlämning och arbetsläge

Senast uppdaterad: **2026-10-29**, Europe/Stockholm.

Läs denna fil vid en ny chatt tillsammans med `AGENTS.md` och `README.md`. Den sammanfattar användarens beslut och aktuellt läge; projektkoden och Git-historiken behövs också. Kontrollera alltid aktuell branch, HEAD och arbetskatalogens ändringar innan arbetet fortsätter. Uppgifterna nedan är en ögonblicksbild, inte en ersättning för verifiering.

## Arbetssätt som användaren har bestämt

- Kommunicera på svenska, kort och konkret.
- **Meddela rekommenderad ChatGPT-modell innan varje nytt utvecklingssteg.** Hittills har rekommendationen varit **GPT-6.1 Sol med hög resonemangsnivå**. Användaren vill kunna använda Sol; föreslå en tyngre modell bara om uppgiften motiverar det. En rekommendation betyder inte att modellen faktiskt har bytts.
- **Starta inte ett nytt utvecklingssteg utan uttryckligt klartecken.** Beskriv först dess omfattning och invänta exempelvis ”Kör”. Användaren vill kunna samla flera ändringar före samma körning. En diskussion, ett positivt omdöme eller en ny planpunkt är inte i sig ett startbesked.
- Ett ”Kör” gäller det senast föreslagna, avgränsade steget. Slutför och verifiera det steget, men påbörja inte därefter nästa etapp automatiskt.
- Efter helskärmssteget bad användaren först att UI-förfining skulle vänta. Därefter godkändes uttryckligen ett avgränsat fempunktssteg för svep, stjärnbildsurval, animation, mobil läsbarhet och markörbakgrunder. Därefter godkändes även trepunktssteget med synlig inritning, Vintergatan och nedåtblick. Övrig UI- eller funktionsutveckling behöver fortsatt nytt godkännande.
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

**Senast avslutade utvecklingssteg:** tydligare inritning, Vintergatan och nedåtblick genom en borttonande mark. Godkänt genom ”Kör”, implementerat och publicerat. Inget ytterligare utvecklingssteg är godkänt eller påbörjat.

- Senast verifierade och publicerade **appcommit**: `039d3cb8e07653b6a9f7904c095b2eae44c8d2a6`.
- Actions: https://github.com/BadBagel47/noxari/actions/runs/40963910964 — tester, bygge och publicering lyckades.
- **79 tester passerade**. Publicerade `index-ZU--gez_.js`, `index-BA2sGNdv.css`, `milkyWay-DWEB47Uh.png` och BSD-licenstext matchade lokalt produktionsbygge via SHA-256. Rutnätet återskapades byteidentiskt från låsta källor.
- Inritning sker nu per stjärnpar under 1 000 ms, med senare start inne i perspektivvyn. Nya linjer startar oberoende av redan färdiga delar. Vintergatan är ett eget lager i båda vyerna, på från start. Nedåtblick visar en tydligt märkt simulerad himmel när marken tonas bort. Se trepunktsavsnittet nedan.
- Webbläsarprov passerade i 390×844, 1280×800, 844×390 och 320×568 för Vintergatans bild i båda vyerna, omkoppling, licensleverans, nedåt/nadir/uppåt, simuleringstext och ingen sidrullning. Skärmbilder har granskats visuellt. Simulerad relativ telefonriktning nådde −89°; dagsljus döljer bakgrundslagret.
- Separata prov bekräftar att mål under horisonten inte kan centreras i Guided Finder och att texturladdningsfel lämnar appen användbar med fungerande återförsök. Befintliga helskärms-/sensorflöden passerade åter med gränslager aktivt i fem storlekar plus reducerad höjd. Nordreferens, paus/återupptagning och utebliven kompassåtergång bevaras med simulerade sensorer.
- Användarens tidigare fysiska Android/Brave-bekräftelse gäller grundläggande telefonföljning och återgångsrättningen. Användaren har senare rapporterat fel vid ett verkligt måntest; se analysavsnittet. Riktprecisionen är därmed inte fysiskt verifierad. Vintergatans ljusstyrka är illustrativ; täta etiketter kan fortfarande överlappa.
- README, AGENTS och datasetdokumentation är uppdaterade. Denna slutstatus sparas i en senare dokumentationscommit; appcommit ovan anger verifierad kod.

## Senaste analys — dagsljus och felvisning mot månen

Användaren har därefter rapporterat att stjärnor saknas dagtid även under horisonten, föreslagit automatisk nattförhandsvisning med säsongsanpassad tid samt frågat om dagssol/måne och tidigare synlig Venus. En föreslagen rättning för den simulerade nedåtvyns dagsljusfilter är **inte startgodkänd eller implementerad**.

Vid ett nytt verkligt nattprov stämde appens måne inte med den verkliga månen. Upprepade åttarörelser med telefonen försämrade läget. Användaren preciserade därefter **över 100° avvikelse i sidled**, och att riktningen fungerade ganska bra före åttarörelsen. Detta är ny fysisk felåterkoppling, inte en godkänd riktprecision. Tidigare telefonuppgift är Android/Brave; aktuell modell, råa sensordata och exakt tid/plats saknas. Storleksordningen är nu angiven.

Analysen finns i [`docs/DAYLIGHT_DIRECTION_ANALYSIS.md`](docs/DAYLIGHT_DIRECTION_ANALYSIS.md). Den visar två syntetiska felvägar där ändrad absolut sensorvinkel eller ändrad relativ referens ger 30–50° fel utan förlorad Följer-status. Detta är ett bekräftat kodbeteende, inte bevis för OS-förloppet på användarens mobil. En åttarörelse kan kalibrera OS-kompassen men sätter inte appens sparade nordreferens. Statusen visar att en referens finns, inte mätt noggrannhet. Den tidigare relativa följningsrättningen som stoppade långsam återgång ska bevaras.

**Ny konkret brist efter 100°-uppgiften:** vid första automatiska nordankringen kan en gammal relativ avläsning paras med en ny absolut avläsning från ett annat telefonläge. Tids-/posekontroll saknas. En syntetisk startsekvens med fysisk vridning 0°→120° och fördröjt relativt värde gav appvisning 240° i stället för 120°, bestående medan sena absoluta värden ignoreras. Färsk parning och konstant godtycklig skillnad mellan ramnollpunkter gav korrekta kontrollfall. Detta är en brist i start/omstart, inte bevis för användarens sensorförlopp eller ensam förklaring till successiv försämring efter en redan etablerad kalibrering. Se analysfilen för hela reproduktionen. Nästa föreslagna rättning ska prioritera färsk/samstämmig första parning och regressionsfall samt bevara den relativa följningen. Ingen appkod är ändrad och rättningen behöver nytt klartecken.

**Senaste prioritering efter ”fungerade ganska bra innan”:** undersök ett referensbyte under pågående följning. Första ankningens tidsparningsbrist är fortsatt verklig men mindre sannolik som ensam förklaring till försämring i samma session. En ny syntetisk sekvens med korrekt manuell norr följd av ändrad råreferens inom samma `deviceorientation`-eventnamn (relativ alpha 120°/absolute false → jordrelaterad alpha 0°/absolute true, hypotetiskt samma fysiska pose) gav bestående appvisning 120° i stället för 0°. Koden behåller relativ behandling och gammal offset när eventnamnet är oförändrat. Verkligt rambyte på Android/Brave vid åttarörelse är **inte bekräftat**; flaggbyte utan råreferensbyte är ett separat tidigare fungerande fall som måste bevaras. Nästa föreslagna rättning ska även diagnostisera referensen under sessionen och erbjuda tydlig omkalibrering efter osäkerhet. Ingen appkod är ändrad.

Månens befintliga topocentriska beräkningsväg jämfördes med NASA/JPL i ett separat exempel och skilde cirka 0,0011°. I samma exempel gav 10 minuters tidsfel cirka 2,13° riktfel. Guided Finders centreringsgräns är 3°, alltså betydligt grövre än månens cirka 0,5° diameter. 22 befintliga riktnings-, finder- och astronomitester passerade. Ingen appkod ändrades.

Komplettering om Nu/GPS kontra vald tid/annan plats inväntas fortfarande. Sidled och storleksordning har besvarats: över 100°. Nästa rekommenderade avgränsning är riktningens diagnostik, tydligare referensstatus och eventuell manuell kalibrering mot verkliga månen under kontrollerad Nu/plats. Dagsljusförslaget bör ge ett tydligt **Visa stjärnhimlen i kväll**-val; undvik tyst tidsflytt vid verklig inriktning. Alla dessa implementationer behöver nytt klartecken och rekommenderad modell först.

## Det som fungerar

- Himmelsvyn fyller tillgänglig webbläsaryta utan sidrullning. Sök, Ikväll, Följ/Återuppta och Mer finns som snabbknappar. Mobil använder nederpaneler, dator/landskap sidopaneler. Plats, tidsläge och sensorstatus syns direkt; källor/licenser finns under Mer → Om och källor.
- Svepbar 360°-himmelsvy med uppåt- och nedåtlutning, borttonande mark vid nedåtblick, mus/touch, knappar och tangentbord. Cirkulär himmelskarta finns som alternativ.
- Valbar Vintergata med källbundna konturer visas i båda vyerna, anpassad till tid/plats och dämpad i dagsljus.
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

## Synlig inritning, Vintergatan och nedåtblick — godkänt trepunktssteg

- Inritningen flyttas från hela figuren till varje linje mellan två stjärnor. Varje ny linje får 1 000 ms och startar först en bit in i perspektivvyn (12% marginal, högst 56 px vågrätt/80 px lodrätt). Nya delar ritas fram oberoende av redan färdiga delar. Himmelskartan använder synliga linjer direkt. Kanttolerans 180 ms, reducerad rörelse och stoppad animationsloop efter avslut bevaras.
- Vintergatan är ett eget lager, på från start, i båda vyerna. Fem J2000-konturer från José R. Vieiras katalog via d3-celestial/Olaf Frohn, BSD 3-Clause. Källor och full licenstext nås i Om och källor. Reproducerbar PNG med 0,5° rutnät, 23 kB, endast lokala resurser. Färger/ljusstyrka/utjämning är illustrativa. Solhöjd −18° till −8° tonar bort lagret. Ingen bildtjänst, ny appdependency eller kalibrerad synlighetsprognos.
- Skärmriktningar omvandlas baklänges till J2000 och läser rutnätet med kontinuerlig RA-söm. Ett mellanlager på högst 320 px längs längre axeln cachas; figurernas egna animationsbildrutor räknar inte om Vintergatan. Laddningsfel ger omkopplingsbar återhämtning.
- Delad gräns ±89,9° för svep, tangenter, manuella knappar och publicerad telefonsensorvinkel. Relativa kompassmodellen ändras inte. Riktningen exakt i zenit/nadir är fortsatt odefinierad i sensorerna; nästan lodrät nedåtblick testad med simulerade data.
- Marken är solid vid/över horisonten och tonas mjukt till helt transparent vid −25°. Stjärnor, figurer, gränser och bakgrund under horisonten blir utforskbara; vyn märks ”Under horisonten · simulerad vy”. Horisontlinjen behålls när den ligger inom bild. Objektmarkörer bakom nästan helt solid mark visas inte som osynliga tryckytor.
- Guided Finder, höjdkurvor och Ikväll behåller sina verkliga horisontvillkor: ett objekt under horisonten kan aldrig markeras centrerat eller manuellcentreras via Finder. Den cirkulära kartan förblir ovan horisonten.
- 79 tester totalt. Nya/utökade tester täcker start inne i bild, nya linjer i samma figur, ensekundsförlopp, nedåtprojektion/nadir, mjuk mark, oförändrade horisontvillkor, Vintergatans kända ljusa/mörka områden, RA-söm och cachning/klippning. Webbläsarprov för båda vyer, lageromkoppling, licenslänk, nedåt/nadir/uppåt, simulerad telefon −89°, dagsljus, underhorisontsmål och texturladdningsfel/återförsök. Helskärms-/sensorregressioner passerade åter i fem storlekar. Verklig mobilvalidering återstår.
- Källa/metod/reproduktion: `src/generated/README.md`, `scripts/generate_milky_way.py`. Tidigare fempunktsbeskrivnings siffror gäller den förra versionen; detta avsnitt anger den nya inritningsmodellen.

## Nästa utvecklingssteg — inväntar nytt klartecken

Trepunktssteget är avslutat med verifierad Pages-publicering. Föreslå en avgränsad nästa uppgift och rekommenderad modell innan implementation. De senare planpunkterna nedan är fortsatt planerade, inte automatiskt startgodkända. Övrig UI-förfining och nya funktioner behöver nytt klartecken.

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
| `src/milkyWay.ts`, `src/useMilkyWay.ts`, `src/groundView.ts` | Vintergatans projektion/laddning och nedåtvyns mark/vinkel |
| `scripts/generate_milky_way.py` | Källverifierad rasterisering och licensbevarande |
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
