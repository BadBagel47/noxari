# Noxari — funktioner och buggar

Senast uppdaterad: **2026-10-31**.

Denna fil är den gemensamma listan för återstående funktioner och kända öppna buggar. `HANDOVER.md` innehåller arbetsläge, verifierad appversion och genomförd historik. Tekniska analyser länkas från respektive post.

## Numrering och arbetssätt

- **F-001, F-002 …** används för funktioner och förbättringar.
- **B-001, B-002 …** används för buggar.
- ID:n är permanenta. Behåll dem när status/prioritet ändras eller arbetet blir klart. Återanvänd eller numrera aldrig om dem.
- Lägg nya poster sist i respektive nummerserie. Använd ID:n i planering, avgränsning av körningar, ändringsbeskrivningar och överlämning.
- Status: **Förslag**, **Planerad**, **Godkänd**, **Pågår**, **Pausad**, **Senare**, **Klar**. En planerad post är inte startgodkänd. Bekräftad funktion och kvarstående fysisk validering ska redovisas separat.
- Enkel användning är ett övergripande designkrav för alla funktioner, inte en egen kodrelease. F-012 håller det synligt i backloggen.
- Föreslå modell och en avgränsad körning med ID:n; invänta användarens klartecken. Användaren kan samla flera poster i samma körning.
- En pausad post återupptas först efter ett uttryckligt beslut. Markera en bugg klar först när relevant verifiering stöder det.

## Aktuellt beslut

Användaren har **pausat B-001** och vill prioritera att färdigställa övrig funktionalitet. B-005 + F-014 + F-015 har godkänts genom ”Kör” och är implementerade; publicerad. Befintlig sensorkod ligger kvar; detta beslut innebär ingen återställning eller avstängning av publicerade funktioner.

**Senaste arbetssteg: F-006 teknisk analys.** GPT-6 Luna High rekommenderades, men aktiv modell kan inte bekräftas från exekveringsmiljön. Analysen rekommenderar statiska, lokaliserade HTML-sidor per objekt byggda till Pages-artifactet, med Open Graph/Twitter-taggar och mänsklig återgång till befintlig objektlänk. Plan, rättighetsbegränsningar och verifieringskrav finns i `docs/SHARE_PREVIEWS.md`. Ingen appkod ändrades och F-006-implementationen är inte godkänd. Senaste implementerade/publicerade funktion är F-002; 116 tester, bygget och Chromiumprov vid dator- och mobilbredd passerade då. B-001 är fortsatt pausad.

## Buggar

| ID | Bugg | Status | Avgränsning / klart när |
| --- | --- | --- | --- |
| **B-001** | Riktningsdrift efter större mobilrörelser | **Pausad** | Fysisk Android/Brave har visat stor avvikelse mellan relativ riktning och kompass. Uttrycklig kompassåterankring återställer rätt riktning. Automatisk återankring är publicerad men dess fysiska långtidseffekt är inte bekräftad. Återuppta senare med kontrollerade före-/efterprov och rapporter. Se [DIRECTION_STABILITY.md](docs/DIRECTION_STABILITY.md). |
| **B-002** | Dagsljus döljer stjärnor även under den genomskinliga marken | **Klar** | I nedåtvyn visar den simulerade himlen stjärnor och mörk bakgrund när marken tonas bort, även dagtid. Över horisonten ligger dagsljusfiltret kvar; objektens fysiska horisontvillkor i Guided Finder/Ikväll ändras inte. Tester, mobil-webbläsarprov och Pages-publicering verifierade. |
| **B-003** | Täta objektetiketter kan överlappa | **Senare** | Förbättra placering/urval av etiketter på mobil och dator utan att förlora objektens beräknade riktningar eller tryckbarhet. Hanteras tillsammans med F-008. |
| **B-004** | Himmelsvyn hackar vid panorering | **Planerad — orsaken okänd** | Mät respons med Vintergatan av/på och undersök bakgrundsritning, projektion och bildrutor. Optimera den berörda renderingsvägen om provet visar att den bidrar; bevara utseende och fungerande svep. Orsaken är ännu inte fastställd. |
| **B-005** | Telefonföljningen pausas automatiskt när paneler öppnas | **Klar** | Behåll aktiv följning när användaren söker/bläddrar och stäng panelen. Följningen ska stanna när användaren väljer Stoppa. Granska även manuella styrhandlingar så att de följer denna regel. Dokumentera plattformsbegränsningar, exempelvis när webbläsaren döljs eller sensordata upphör. |

## Funktioner och förbättringar

| ID | Funktion | Status | Omfattning / klart när |
| --- | --- | --- | --- |
| **F-001** | Dags-/kvällsval med säsongsanpassad stjärnhimmel | **Klar** | **Visa stjärnhimlen ikväll** i Tid och plats väljer den beräknade tiden då solen står lägst i lokal natt, samplad med appens cirka 10-minuters nattdata. Tidsstatus märker **Kvällshimmel**; **Nu** återgår till realtid och manuell tid blir **Vald tid**. Ljusa sommarkvällar och polardag förklaras. Förhandsvisningen stängs av under telefonföljning och ändrar aldrig tiden automatiskt. Tester, mobil-webbläsarprov och Pages-publicering verifierade. |
| **F-002** | Förbättrad dagsvy för objekt som kan synas i dagsljus | **Klar** | Sol och måne visas fortsatt dagtid. Planetmarkörer visas även när solen är över horisonten om beräknad solseparation är minst 15° och uppskattad magnitud är ≤ −2,0 för Venus eller ≤ −2,5 för övriga planeter. Under skymning/natt behålls befintliga regler. Dagsmarkörer och objektdetaljer anger att positionen är beräknad och inte garanterar faktisk synlighet; väder, dis, himmelskontrast och optik modelleras inte. Tester och bygge passerade. |
| **F-003** | Djupare stjärnkatalog | **Klar** | Testad och publicerad. Samma pinnade HYG v4.1/CC BY-SA 4.0-källa utökas till 8 920 stjärnor till V=6,5 plus två svagare HIP-ändpunkter för figurlinjer (8 922 totalt). Svagare magnituder ritas dimmare. Mobilprestanda verifierades mot föregående version. |
| **F-004** | Zoom med tvåfingerspinch | **Klar** | Pinch zoomar perspektivvyn (1×–3×) och kartan (1×–2,5×). Stjärnor, objekt, figurer, gränser, Vintergata och Guided Finder följer samma zoom. Enfingerssvep, markörval och telefonföljning bevaras; en pinch väljer inte ett objekt. Bygge, tester, mobil-webbläsarprov och Pages-publicering verifierade. |
| **F-005** | Källbundna objektbilder | **Klar** | Publicerad och SHA-256-verifierad. Första urvalet: M31, M42, M45, M13, M57, M51, M81 och M104. Lokala 960 px bilder har verifierad Commons-licens, skaparkredit och källa i varje objektdetalj. De är inte en del av den beräknade himmelsvyn. Alla åtta matchar manifestets SHA-256. Se `data/object-images.json`. |
| **F-006** | Rikare förhandsvisningar av delade objektlänkar | **Planerad — implementation inväntar godkännande** | Teknisk analys klar. Rekommenderade statiska, språkvarierade preview-sidor genereras vid byggtid för varje delbart objekt i `dist`, med Open Graph/Twitter-metadata och en JS-länk/redirect till befintlig `?object=`-appväg. Behåll gamla djup- och listdelningslänkar. Starta inte implementationen förrän användaren godkänt den. Inledningsvis används bara de sju verifierade Public Domain-bilderna; M31 CC BY-SA behöver synlig attribution i förhandsvisningsflödet. Plan och testkriterier: `docs/SHARE_PREVIEWS.md`. |
| **F-007** | Delning av observationslistor | **Klar** | Sparade objekt delas som en `?list=`-länk via Web Share eller urklipp. Länken öppnar en separat skrivskyddad lista; okända ID:n filtreras och dubbletter tas bort. Importera uttryckligen alla till lokala bokmärken, utan att ersätta befintliga. Enskilda `?object=`-länkar bevaras. Tester och Chromiumflöde verifierade. |
| **F-008** | Slutlig genomgång av gränssnittet | **Senare** | Samlad förfining när funktionaliteten är klar: himmelsfokus, läsbarhet, informationsmängd och snabbknappar. Helskärmslayout och tidigare avgränsade läsbarhetsrättningar är redan genomförda. Inkludera B-003. |
| **F-009** | Bredare fysisk mobilvalidering | **Senare** | iOS, Android, porträtt/landskap, behörigheter och återupptagning. Riktningsprecision hör till pausade B-001 och återupptas inte automatiskt genom denna post. |
| **F-010** | Kalibrering mot verkliga månen | **Senare** | Tidigare föreslagen manuell referens med kontrollerad Nu/plats och tydlig bekräftelse. Inte implementerad eller startgodkänd; bedöms när riktningsarbetet återupptas. |
| **F-011** | Kameraöverlägg / AR | **Senare — låg prioritet** | Separat framtida steg efter övrig funktionalitet. Användarens prioritering är fortsatt himmelsvy och telefonföljning utan kamera. |
| **F-012** | Enkel att använda som princip för alla funktioner | **Antagen designprincip** | Prioritera tydliga huvudhandlingar, förståeliga statusar och få samtidiga val genom hela appen. Väg in enkel användning i varje godkänt funktionssteg; principen godkänner inte egen UI-kod utan avgränsning. |
| **F-013** | Samlad utvecklardiagnostik | **Klar** | `docs/DEVELOPMENT_DIAGNOSTICS.md` samlar test-, bygg-, data-generator-, browser/device-checkingångar och beskriver vad respektive prov kan styrka. Detta är utvecklardokumentation, inte diagnostikfunktioner i appen. |
| **F-014** | Markera valt himmelsobjekt tydligt | **Klar** | Efter tryck ska det valda objektet få en beständig, synlig markering så användaren ser vilket objekt kortet/detaljerna gäller. Bevara tydlig skillnad mellan tryck och svep. |
| **F-015** | Ikoner för spara och dela | **Klar** | Använd ikoner för spara och dela objekt. Övriga handlingar ska ha tydliga textetiketter i linje med önskemålet om färre symbolknappar. |
| **F-016** | Cirkulär objektlokaliserare | **Klar** | Guided Finder visar en stilren cirkel centralt i himmelsvyn. Ett pilhuvud löper längs cirkelns kant och pekar mot målobjektets beräknade riktning. Grön ring bekräftar centrering inom 3°. Underhorisontsvillkor, telefonföljning, zoomsamstämmighet och stöd för reducerad rörelse är bevarade. B-001 är fortsatt pausad. Bygge, tester, mobil-webbläsarprov och Pages-publicering verifierade. |
| **F-017** | Separat samling för småkroppskandidater | **Klar** | Implementerad, testad och publicerad. Egen bläddringsbar samling utanför huvudkatalogen samt fristående av/på-lager i båda himmelsvyerna. Första objektet är 2026 ED138, korrekt märkt som dvärgplanetkandidat, med preliminär JPL-bana, beräknad position för vald tid/plats, källor och tydliga osäkerheter. Katalogen uppdateras manuellt efter granskning; appen ska inte hämta externa data vid körning. |
| **F-018** | Säker granskning av kataloguppdateringar | **Klar** | `npm run catalogs:check` jämför OpenNGC-poster, HYG-stjärnor med HIP-ID/koordinatfallback, Stellarium-stjärnbilds-/gränsdata och JPL-banor för befintliga Kepleriska småkroppar i både huvud- och kandidatsamlingen. Skrivskyddad rapport visar tillagda, saknade och ändrade poster; inget genereras eller tas bort automatiskt. Saknade källposter kräver mänsklig granskning. Livekontroll 2026-10-31 fann inga skillnader. HYG v4.1 är nu låst till en immutabel upstream-commit; omgenerering gav identiska data. NASA/Hubble-faktasnapshot, bildlicenser och kandidaters status/upptäcktsurval är fortsatt manuella redaktionella kontroller. Ingen appdata ändrades. |
| **F-019** | Erkända dvärgplaneter och Vesta | **Klar** | Ceres, Pluto, Eris, Haumea och Makemake ligger i huvudkatalogen med eget Dwarf planet-filter; Vesta har ett Asteroid-filter. Pluto använder Astronomy Engines integrerade ephemerid. Ceres, Eris, Haumea, Makemake och Vesta använder JPL SBDB-banor; Ceres/Vesta har H–G-magnitudmodell och de avlägsna kropparnas H-magnituder saknar fasjustering. Objekt, ID/alias, källor och begränsningar finns i `src/majorSmallBodies.ts`. JPL/Horizons-fixturer, fyra objekt-/positionssviter, mobilfilterprov samt 114 tester och produktionsbygge passerade. |

## Genomförda delar

360°-vy, telefonföljning, egenrörelse, stjärnbildsfigurer, planetpositioner, Ikväll, Guided Finder, helskärmslayout, Messierkatalog, IAU-gränser, interaktions-/läsbarhetsrättningar, Vintergatan och nedåtblick finns redan. Se `HANDOVER.md` för funktioner, begränsningar och testunderlag. Numreringen ovan används för det återstående arbetet från och med detta beslut.
