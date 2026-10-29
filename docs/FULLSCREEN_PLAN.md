# Förslag: himlen som huvudvy

Analyserat 2026-10-29. **Godkänd av användaren genom ”Kör” och implementerad. Publicerad; verifierad appversion och kontrollresultat dokumenteras i HANDOVER.md.**

## Utgångspunkt

Användaren vill att himlen fyller skärmen på mobil och dator, med få direkt synliga funktioner och övriga funktioner bakom snabbknappar. Guided Finder är redan implementerad och ska ingå ovanpå himlen. Befintliga funktioner finns i dag runt en avgränsad karta, med global observationstyrning, flikar, kort, stora paneler och sidrullning.

## Rekommenderad struktur

- Låt himmelsvyn vara kvar monterad som appens bakgrund och fylla den tillgängliga webbläsarytan. Placera kontroller och paneler ovanpå. Sikta på cirka 80 procent fri himmelsyta i normalläget.
- Visa en liten, tryckbar plats-/tidsindikator överst. Den öppnar observationspanelen. Visningsriktning och manuell/telefonstyrd status ska också gå att läsa utan att öppna inställningar.
- Fyra primära snabbknappar: **Sök**, **Ikväll**, **Följ telefonen**, **Mer**. På mobil ligger de nedtill; på dator i en smal verktygsrad längs sidan. Visa korta etiketter utöver ikoner.
- Under Mer: Sparade, Visning, Inställningar och Om/källor. Figurer, namn och valet mellan perspektiv och cirkulär karta hör till Visning. Licens- och källuppgifter ska förbli tydligt åtkomliga.
- Val av ett objekt öppnar först ett kompakt objektkort med **Guida**, **Detaljer** och stängning. Full beskrivning, kurvor och övriga data finns i detaljpanelen.
- Guided Finder använder den befintliga beräkningslogiken men får kompakt målrad och vägledning. Riktningspilar och målring ska vara lätta att urskilja, och centrum ska hållas fritt från text och knappar. Längre förklaringar och manuell centrering kan nås via målradens kontroller.

## Paneler och mobil/dator

En panel är öppen åt gången. Panelvalen är Sök, Ikväll, Sparade, Observation, Visning, Inställningar och Objektdetaljer. Mer är en kort meny som leder vidare till sin panel.

På mobil öppnas vanliga paneler underifrån och kan rullas inuti. Sökning kan använda nästan hela ytan när tangentbordet visas. På dator öppnas en sidopanel, ungefär 360–420 px bred, med himlen synlig runtomkring. Himlens riktning ska inte återställas när paneler öppnas och stängs. Använd samma funktioner och tillstånd på båda formaten.

Håll isär panelernas gester och himlens: att rulla en lista eller ändra ett värde får inte vrida himlen. Stängningsknapp finns alltid; på dator stänger Escape den översta panelen och återför fokus. En stängd detaljpanel ska inte samtidigt avsluta Guided Finder. Touchmål bör vara minst 44 × 44 px och tangentbord/fokus ska fungera.

## Tid och plats är väsentlig information

Nuvarande tidstillstånd är en vald tidpunkt; knappen Now tar ett nytt ögonblick men startar ingen fortlöpande klocka. En ny etikett **Nu** måste därför kompletteras med ett verkligt levande tidsläge, exempelvis uppdaterat ungefär var 30:e sekund. Manuellt datum/tid byter till **Vald tid** och visar datum. En tydlig åtgärd återgår till Nu.

Platsnamnet ska fortsätta synas, även när latitud, longitud, tidszon och GPS-knapp flyttas till en panel. En vald plats är inte nödvändigtvis telefonens aktuella position. Begär plats- och sensorbehörigheter vid respektive användaråtgärd.

I levande tidsläge kan himmelspositioner uppdateras regelbundet medan nattkontext och rekommendationer beräknas separat med lämplig frekvens. Telefonrörelser ska inte starta om nattberäkningar eller montera om himmelsvyn.

## Sensorer och tillstånd

Dagens flikbyte kan avsluta Guided Finder, och objektdetaljer/inställningar stoppar telefonföljningen. Det passar inte direkt i en panelbaserad vy. Inför ett separat paneltillstånd, ett valt objekt och ett aktivt guidningsmål; låt inte ett panelval räknas som att lämna himlen.

Pausa telefonföljning när panelen tar fokus och visa statusen tydligt. Återupptagning ska vara avsiktlig, via Följ/Återuppta. Bevara mål, senast visad riktning och relevant kalibrering vid panelöppning. Nuvarande hook skapar en ny tracker vid start; hur kalibreringen bevaras behöver hanteras uttryckligen. Sensorernas godkända rörelse-/kompassmodell ska behållas, inklusive rättningen för återgång på Android/Brave. Undvik att introducera nya fortlöpande kompasskorrigeringar under layoutarbetet.

## Helskärm i webbläsaren

Standardläget fyller appens tillgängliga yta med dynamisk viewporthöjd och hänsyn till telefonens säkra kanter, webbläsarlister, tangentbord och liggande läge. Himlen behöver ingen vanlig sidrullning; panelerna har egen rullning.

Erbjud dessutom en frivillig knapp för webbläsarens faktiska helskärmsläge där det stöds. Funktionen måste fungera även utan det läget. Detta kräver ingen installation eller kameraåtkomst.

## Föreslagen arbetsordning inom nästa godkända körning

1. Separera appens himmelsyta, snabbkontroller och panelhantering. Flytta befintliga funktioner till paneler och håll himmelsvyn monterad.
2. Anpassa mobilens nederpaneler och datorns sidopaneler, viewport, säkra kanter, tangentbord och fokus.
3. Integrera kompakt objektkort och Guided Finder, med bevarat mål/riktning, tydlig sensorpaus och återupptagning.
4. Inför tydliga levande/valda tidslägen och en genomgående plats-/tidsindikator.
5. Kontrollera funktioner, sensorlivscykel, djupa länkar, sparade objekt och olika skärmstorlekar. Uppdatera dokumentation och överlämning samt publicera enligt det godkända arbetssättet.

## Godkännandekriterier

- Himlen fyller tillgänglig yta från start på mobil och dator; ingen sidrullning krävs för att se den.
- Cirka 80 procent av normallägets yta är fri från paneler/kontroller. Centreringen och målmarkeringen täcks inte av gränssnittstext.
- De vanligaste funktionerna nås direkt eller genom en tydlig snabbknapp. Alla befintliga funktioner och källangivelser går att hitta.
- Endast en panel är öppen. Panelrullning och tangentbord vrider inte himlen och döljer inte stängningskontrollen.
- Öppna/stäng paneler bevarar valt mål, riktning, plats och vald tid. Paus/återupptagning av sensorer är tydlig och förstör inte kalibreringen.
- Ett tidsläge märkt Nu följer klockan; manuellt datum visas tydligt som Vald tid.
- Android/Brave-flödet med telefonföljning fortsätter fungera utan återgång efter rörelse. Simulatorprov skiljs från användarprov på fysisk mobil.
- Objektlänkar, bokmärken, polar-/skymningsinformation och manuell reserv fortsätter fungera.

## Modell och beslutsläge

Rekommenderad modell: **GPT-6.1 Sol med hög resonemangsnivå**. Användaren har godkänt denna körning. Lösningen är implementerad, publicerad och verifierad med tester och webbläsarprov. Nästa utvecklingssteg kräver ett nytt klartecken. Panelpaus behåller en aktiv sensorsession för att bevara nordkalibrering, medan explicit stopp eller dold sida avslutar den. Den tidigare mobila projektionen har anpassats så att den längre axelns synfält är högst 90°.
