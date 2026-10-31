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

**Senaste godkända körning: B-005 + F-014 + F-015.** Implementerat och verifierat; publicerad. F-012 är vägledande designprincip. Nästa steg kräver ett nytt klartecken och modellrekommendation; det tidigare förslaget **F-001 + B-002** kan tas upp igen senare.

**Nästa föreslagna körning: F-004 + F-016.** Tvåfingerszoom och en cirkulär objektlokaliserare med pilhuvud längs ringens kant. Modellförslag: GPT-6.1 Sol med hög resonemangsnivå. Användaren samlar önskemål; implementation inväntar uttryckligt klartecken.

## Buggar

| ID | Bugg | Status | Avgränsning / klart när |
| --- | --- | --- | --- |
| **B-001** | Riktningsdrift efter större mobilrörelser | **Pausad** | Fysisk Android/Brave har visat stor avvikelse mellan relativ riktning och kompass. Uttrycklig kompassåterankring återställer rätt riktning. Automatisk återankring är publicerad men dess fysiska långtidseffekt är inte bekräftad. Återuppta senare med kontrollerade före-/efterprov och rapporter. Se [DIRECTION_STABILITY.md](docs/DIRECTION_STABILITY.md). |
| **B-002** | Dagsljus döljer stjärnor även under den genomskinliga marken | **Planerad** | Den tydligt märkta simulerade nedåtvyn ska kunna visa stjärnhimlen trots dag ovan horisonten. Bevara dagvyn ovan horisonten samt verkliga horisontvillkor för Guided Finder/Ikväll. Se [DAYLIGHT_DIRECTION_ANALYSIS.md](docs/DAYLIGHT_DIRECTION_ANALYSIS.md). |
| **B-003** | Täta objektetiketter kan överlappa | **Senare** | Förbättra placering/urval av etiketter på mobil och dator utan att förlora objektens beräknade riktningar eller tryckbarhet. Hanteras tillsammans med F-008. |
| **B-004** | Himmelsvyn hackar vid panorering | **Planerad — orsaken okänd** | Mät respons med Vintergatan av/på och undersök bakgrundsritning, projektion och bildrutor. Optimera den berörda renderingsvägen om provet visar att den bidrar; bevara utseende och fungerande svep. Orsaken är ännu inte fastställd. |
| **B-005** | Telefonföljningen pausas automatiskt när paneler öppnas | **Klar** | Behåll aktiv följning när användaren söker/bläddrar och stäng panelen. Följningen ska stanna när användaren väljer Stoppa. Granska även manuella styrhandlingar så att de följer denna regel. Dokumentera plattformsbegränsningar, exempelvis när webbläsaren döljs eller sensordata upphör. |

## Funktioner och förbättringar

| ID | Funktion | Status | Omfattning / klart när |
| --- | --- | --- | --- |
| **F-001** | Dags-/kvällsval med säsongsanpassad stjärnhimmel | **Planerad** | Tydligt val **Visa stjärnhimlen i kväll** med beräknad lokal tid, synligt datum/tidsläge och enkel återgång till Nu. Hantera ljusa sommarnätter och polardag. Bevara verklig tid vid verklig inriktning; ingen tyst tidsflytt. Den exakta utformningen fastställs i den godkända körningen. |
| **F-002** | Förbättrad dagsvy och synlighet för Venus i skymning | **Planerad** | Solen och månen har redan dagmarkörer. Förbättra dagsvyn och Venus regler/kontrast med hänsyn till höjd, solhöjd, modellerad ljusstyrka och solavstånd; skilj beräknad position från faktisk synlighet. |
| **F-003** | Djupare stjärnkatalog | **Förslag** | Fler och svagare stjärnor med verifierad öppen källa/licens, angivna gränser och fungerande mobilprestanda. Befintliga 4 105 HYG-stjärnor och figurändpunkter är redan implementerade. |
| **F-004** | Zoom med tvåfingerspinch | **Planerad** | Användaren vill kunna zooma in och ut med pinch i himmelsvyn. Föreslagen körning omfattar pinch i perspektivvy och karta, rimliga zoomgränser och bibehållen objektriktning/Guided Finder. Enfingerssvep och telefonföljning ska fungera tillsammans med zoom; en pinch får inte välja ett objekt av misstag. Fler stjärnor (F-003) är ett separat tillägg. Implementation inväntar klartecken. |
| **F-005** | Källbundna objektbilder | **Förslag** | Utvalda astronomiska foton med verifierad licens och individuell attribution i objektdetaljer. Skilj bilder från den beräknade himmelsvyn. |
| **F-006** | Rikare förhandsvisningar av delade objektlänkar | **Förslag** | Meningsfull titel, beskrivning och eventuell licensierad bild när en objektlänk delas. Lös leveransen utifrån den befintliga statiska Pages-publiceringen; tekniskt upplägg behöver beslutas. |
| **F-007** | Delning av observationslistor | **Förslag** | Dela och öppna en hel lista med bevarade objekt. Befintliga lokala bokmärken och länkar till enskilda objekt fungerar redan. Exakt list-/delningsformat behöver avgränsas. |
| **F-008** | Slutlig genomgång av gränssnittet | **Senare** | Samlad förfining när funktionaliteten är klar: himmelsfokus, läsbarhet, informationsmängd och snabbknappar. Helskärmslayout och tidigare avgränsade läsbarhetsrättningar är redan genomförda. Inkludera B-003. |
| **F-009** | Bredare fysisk mobilvalidering | **Senare** | iOS, Android, porträtt/landskap, behörigheter och återupptagning. Riktningsprecision hör till pausade B-001 och återupptas inte automatiskt genom denna post. |
| **F-010** | Kalibrering mot verkliga månen | **Senare** | Tidigare föreslagen manuell referens med kontrollerad Nu/plats och tydlig bekräftelse. Inte implementerad eller startgodkänd; bedöms när riktningsarbetet återupptas. |
| **F-011** | Kameraöverlägg / AR | **Senare — låg prioritet** | Separat framtida steg efter övrig funktionalitet. Användarens prioritering är fortsatt himmelsvy och telefonföljning utan kamera. |
| **F-012** | Enkel att använda som princip för alla funktioner | **Antagen designprincip** | Prioritera tydliga huvudhandlingar, förståeliga statusar och få samtidiga val genom hela appen. Väg in enkel användning i varje godkänt funktionssteg; principen godkänner inte egen UI-kod utan avgränsning. |
| **F-013** | Samlad utvecklardiagnostik | **Planerad** | Inventera lokala analys-, test- och felsökningsverktyg och samla ingångar, instruktioner och begränsningar på ett ställe. Gäller verktyg för utvecklingen, inte nya diagnostikfunktioner inne i appen. |
| **F-014** | Markera valt himmelsobjekt tydligt | **Klar** | Efter tryck ska det valda objektet få en beständig, synlig markering så användaren ser vilket objekt kortet/detaljerna gäller. Bevara tydlig skillnad mellan tryck och svep. |
| **F-015** | Ikoner för spara och dela | **Klar** | Använd ikoner för spara och dela objekt. Övriga handlingar ska ha tydliga textetiketter i linje med önskemålet om färre symbolknappar. |
| **F-016** | Cirkulär objektlokaliserare | **Planerad** | Ersätt den befintliga riktningspilen med en stilren cirkel centralt i himmelsvyn. Ett pilhuvud löper längs cirkelns kant och pekar mot den vridning/lutning som behövs för att hitta objektet. Ge tydlig bekräftelse när objektet är centrerat och håll kompletterande information sparsam enligt F-012. Bevara beräknad riktning, underhorisontsvillkor och telefonföljning. Samordna med F-004 så att vägledningen stämmer även vid zoom. Lätt rendering och stöd för reducerad rörelse; B-001 är fortsatt pausad. |

## Genomförda delar

360°-vy, telefonföljning, egenrörelse, stjärnbildsfigurer, planetpositioner, Ikväll, Guided Finder, helskärmslayout, Messierkatalog, IAU-gränser, interaktions-/läsbarhetsrättningar, Vintergatan och nedåtblick finns redan. Se `HANDOVER.md` för funktioner, begränsningar och testunderlag. Numreringen ovan används för det återstående arbetet från och med detta beslut.
