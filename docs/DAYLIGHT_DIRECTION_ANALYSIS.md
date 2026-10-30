# Dagsljus, nattförhandsvisning och riktningsfel — analys

Status: analys genomförd; **ingen implementation är godkänd**. Appversionen är fortsatt `039d3cb8e07653b6a9f7904c095b2eae44c8d2a6`. Rekommenderad modell för nästa avgränsade rättning: GPT-6.1 Sol med hög resonemangsnivå.

## Användarens observationer och öppna frågor

- Under dagtid döljs stjärnor även i den simulerade nedåtvyn. Rättning föreslagen men inte startgodkänd.
- Användaren föreslår att appen på dagtid visar en säsongsanpassad framtida stjärnhimmel, samtidigt som sol/måne ska kunna ses dagtid och Venus tidigare än svagare stjärnor.
- Vid ett verkligt nattprov stämde månmarkören inte med månen. Upprepade åttarörelser med mobilen försämrade överensstämmelsen. Användaren preciserade senare att avvikelsen var **över 100° i sidled** (uppskattning).
- Tidigare känd telefon/webbläsare: Android med Brave. Inga råa sensorloggar eller uppgifter om exakt modell, provtid eller provplats finns för detta tillfälle.
- Två kompletteringar har efterfrågats: Nu med GPS eller vald tid/annan plats; huvudsakligen sidled/höjdled/båda och ungefärlig avvikelse. Sidled och storleksordning har besvarats: över 100°. Nu/GPS kontra vald tid/annan plats är fortfarande obesvarat. Dokumentera senare svar i HANDOVER utan privata koordinater eller chattloggar.

## 1. Tid och dagsljus

Appen startar nu i **Nu** och uppdaterar tiden var 30:e sekund. Ett manuellt tidsval fryser tiden tills användaren väljer Nu igen. Platsen återställs från webbläsaren eller blir den tydligt visade standarden Stockholm; GPS hämtas endast på begäran.

Solen ritas separat och månen undantas från dagsljusfiltret. De kan redan visas dagtid om de ligger ovan horisonten. Planeterna delar däremot en grov markeringsregel: geometrisk solhöjd under 0°. Varken Venus särställning, magnitud eller solavstånd påverkar just den markeringsregeln. Utrustnings-/skymningskraven i Ikväll är ett annat lager. Markörernas förekomst är ingen verifierad prognos för vad ögat ser.

### Rekommendation

Behåll Nu som tillförlitlig verklig himmel och erbjud dagtid en tydlig snabbknapp **Visa stjärnhimlen i kväll**, med beräknad lokal tid. Nattförhandsvisningen kan beräknas automatiskt utan att klockan ändras omärkligt. Ett användarvalt framtidsläge ska tydligt visa datum/tid och ha en enkel återgång till Nu. Telefonföljning kan fortsatt användas för simulering vid vald tid, men kalibrering mot en verklig himlakropp ska kräva Nu och kontrollerad plats.

En tyst tidsflytt skulle direkt motverka korrekt inriktning mot den verkliga månen. Inför därför inte automatisk framspolning inne i ett pågående verkligt observations-/kalibreringsflöde. Beräkna skymningen för plats och datum, inte ett fast klockslag. Skilj första ljusa stjärnor från mörkare förhållanden för Vintergatan. Vid ljusa sommarnätter/polardag måste appen säga att vald mörkernivå inte nås den natten och erbjuda nattens mörkaste tid eller en uttrycklig annan datumförhandsvisning.

För dagsvyn: behåll sol/måne och förbättra gradvis kontrast/markeringsregler för Venus och andra ljusa planeter med höjd, modellerad magnitud, solhöjd och solavstånd. Detta är illustrativt och ska inte beskrivas som uppmätt synlighet. Nedåtvyns mörka simulerade bakgrund bör bedömas separat från lokal dagsljusdämpning; den tidigare föreslagna rättningen är fortfarande ogjord.

## 2. Vad åttarörelsen kan påverka

En åttarörelse kan påverka telefonens magnetometer-/operativsystemkalibrering. Den sätter inte appens sparade nordreferens. `PhoneDirectionTracker` använder en nordoffset, som etableras av en absolut avläsning eller av **Rikta mot norr**. Den knappen förutsätter att telefonens baksida faktiskt pekar mot geografisk nord; den är inte en generell start/slutknapp för en åttarörelse och rättar endast sidled.

Den befintliga Android/Brave-rättningen prioriterar en relativ orienteringsström och ignorerar senare absoluta kompassjusteringar när en nordreferens finns. Den modellen undviker den tidigare bekräftade långsamma återgången. Den betyder också att bättre OS-kompasskalibrering inte automatiskt rättar appens redan sparade relativa nordreferens.

### Bekräftade kodvägar och syntetisk reproduktion

Den faktiska telefonens förlopp är **inte** reproducerat. Följande visar vad koden gör med tillförda sensorvärden:

1. **Endast absolut källa:** alpha 0° → 330° → 310° ger visad azimut 0° → 30° → 50°. Om OS ändrar denna referens trots samma återställda fysiska pose följer felet med in i appen. Detta är ett villkorat scenario; tillförda sensorändringar bevisar inte att en åttarörelse orsakade dem på användarens telefon.
2. **Relativ källa med manuell norr:** alpha 45° kalibreras till 0°. En efterföljande absolut läsning ignoreras enligt design. Om den relativa strömmens referens därefter ändras till alpha 15° visar appen 30° med den gamla offseten. En uttrycklig ny nordkalibrering återställer 0° i den syntetiska sekvensen.
3. **Statusens betydelse:** `direction.absolute` betyder här att någon nordoffset finns, även en manuellt angiven. `usePhoneOrientation.publish` visar då tracking/Följer. Ingen precision eller överensstämmelse med sann nord är verifierad. En existerande offset kan därför vara fel utan att statusen ändras.

En kontrollsekvens med stora ändringar i alpha/beta/gamma och återgång till exakt samma råvärden återkom korrekt till 0° efter tre upprepningar. Appen summerar alltså inte åttarörelser till ett växande yaw-fel i denna kodväg. Försämring efter en verklig rörelse kräver att vi undersöker vilka sensorvärden/referenser som faktiskt ändrades, samt tid/plats och eventuell användarkalibrering.

Relativ drift, en möjlig ombasering i sensorerna, endast absolut källa och magnetisk kontra geografisk nord är relevanta hypoteser. Inga loggar avgör vilken som gällde här. Magnetisk missvisning kan ge ett relativt konstant sidofel; den förklarar inte ensam varje successiv försämring. Appen kan inte säkert skilja en referensändring från en verklig snabb vridning med bara dessa vinkeldata. Misstänkta hopp kan varnas för, men får inte automatiskt korrigeras som om orsaken vore känd.

### Ny konkret felväg: första nordankring med avläsningar från olika telefonlägen

Efter uppgiften om över 100° undersöktes den första kopplingen mellan relativ och absolut källa när den relativa avläsningen kommer först. Koden räknar då ut `northOffset = referenced.heading - this.rotation.heading`. Den kontrollerar inte avläsningarnas tidsstämplar, ålder, samtidighet eller om telefonen rörde sig mellan dem.

Reproduktion mot oförändrad `PhoneDirectionTracker`, upprätt telefon (beta 90°, gamma 0°):

| Händelse | Inmatning | Resultat |
| --- | --- | --- |
| Första relativa värde vid fysisk riktning 0° | relativ alpha 0° | riktning 0°, ingen nordreferens |
| Telefonen vrids till 120°; absolut värde anländer före uppdaterat relativt värde | absolut alpha 240° | gammalt relativt 0° paras med absolut 120°; offset blir 120° |
| Färskt relativt värde från samma nya fysiska riktning | relativ alpha 240° | appen visar **240°**, medan referensen är 120°: **120° fel** |
| Senare absolut värde medan telefonen står still | absolut alpha 240° | ignoreras enligt den låsta relativa modellen |
| Senare relativt värde medan telefonen står still | relativ alpha 240° | felet kvarstår; en nordreferens finns fortfarande |

En kontroll med ett färskt relativt värde från den nya posen före den absoluta ankningen gav korrekt 120°. Ett annat kontrollfall med godtycklig men konstant 120° skillnad mellan sensorramarna vid samma pose gav också korrekt riktning: skillnaden mellan ramarnas nollpunkter är inte i sig felet.

Detta är en **konkret brist i den automatiska första ankningens krav på samtidighet**, inte ett bekräftat händelseförlopp på användarens telefon. Ett fel på över 100° i just denna sekvens förutsätter motsvarande stor skillnad mellan telefonlägena som paras. Stora rörelser med fördröjda/olika snabbt startande strömmar kan därför vara relevanta; vanliga små tidsskillnader vid lugn rörelse räcker inte för att anta samma felstorlek.

Felvägen gäller när nordreferensen ännu inte är etablerad, till exempel vid start/omstart. Den förklarar inte ensam att en redan etablerad referens successivt blir sämre av flera åttarörelser i samma session. För det förloppet kvarstår hypoteserna om ändrad sensorreferens, absolut reservkälla, manuell omkalibrering eller tid/plats, tills faktisk diagnostik finns.

Prioritera därför en granskad parning av färska relativa/absoluta värden och ankning först vid samstämmig/stillastående pose, med tydlig manuell referens som reserv. Bevara den efterföljande relativa följningen som stoppade kompassens långsamma återgång. Försök inte reparera den nya bristen genom att återinföra kontinuerlig magnetometerkorrigering. Lägg till regressionsfall för båda ankomstordningar, fördröjda värden under rörelse, olika ramnollpunkter och manuellt fastställd nord.

## 3. Månen, tid/plats och centreringsprecision

Positionen beräknas topocentriskt med `Equator(Body.Moon, time, observer, true, true)` och geometrisk `Horizon`, alltså med observatörens plats och utan atmosfärisk refraktion. Den använder inte enbart månens geocentriska RA/Dec.

En oberoende kontroll mot **NASA/JPL Horizons**, kropp 301, WGS84-plats 18,0686° Ö / 59,3293° N / 0 km, 2026-10-29 20:00 UTC (21:00 Europe/Stockholm), airless apparent az/el:

| Källa | Azimut | Höjd |
| --- | ---: | ---: |
| Appens befintliga beräkningsväg | 75,275927267° | 22,920482666° |
| NASA/JPL Horizons | 75,276826149° | 22,921189473° |

Vinkelskillnaden är cirka **0,0011°**, ungefär 4 bågsekunder. Det bekräftar ett referensfall, inte användarens provtid/plats eller alla månepositioner. Ett stort generellt månpositionsfel stöds inte av detta fall. Refraktionens skillnad i samma exempel är cirka 0,0395° och kan vara större nära horisonten.

Reproducera Horizons-frågan med:

```text
https://ssd.jpl.nasa.gov/api/horizons.api
COMMAND='301'
EPHEM_TYPE='OBSERVER'
CENTER='coord@399'
COORD_TYPE='GEODETIC'
SITE_COORD='18.0686,59.3293,0'
START_TIME='2026-10-29 20:00'
STOP_TIME='2026-10-29 20:01'
STEP_SIZE='1 m'
QUANTITIES='4'
APPARENT='AIRLESS'
EXTRA_PREC='YES'
CSV_FORMAT='YES'
```

Samma exempel med fel observationstid ger cirka 2,13° efter 10 minuter, 6,40° efter 30 minuter och 12,79° efter en timme. Detta illustrerar varför Nu/Vald tid måste kontrolleras. Fel plats eller sparad standardplats är en separat möjlig orsak.

Guided Finder visar centrerat inom **3°**. Månens skenbara diameter är ungefär 0,5°, så grön centrering kan fortfarande ligga flera måndiametrar från den visuella skivan. Markören och sensorerna är inte instrumentkalibrerade. Skärmroll återges inte; roll påverkar främst geometri runt centrum och är inte i sig en förklaring till att telefonens optiska mittaxel pekar fel på månen.

## 4. Föreslaget nästa rättningssteg — behöver nytt klartecken

Prioritera den första nordankringens samtidighetsbrist och riktningsdiagnostik innan automatisk nattstart:

1. Rätta parningen av relativ och absolut referens vid start/omstart med granskad färskhet/samtidighet och stabilitetskontroll. Testa det reproducerade 120°-fallet och korrekta kontrollfall utan att ändra den bekräftade relativa följningsmodellen. Visa källtyp, nordreferensens ursprung/ålder och att noggrannhet är okänd när webbläsaren inte ger sådan information. Erbjud lokal, frivillig diagnostik för råvinklar, källbyten och riktning före/efter en kalibreringsrörelse.
2. Förtydliga skillnaden mellan OS-kompasskalibrering, **Rikta mot norr** och **Centrera manuell vy**. Visa inte enbart Följer som om det bekräftade precision.
3. Inför föreslagen **Kalibrera mot månen**: användaren riktar telefonens baksida mot den verkliga månen och bekräftar. Kontrollera Nu och plats, och redovisa om rättningen avser sidled, höjd eller båda. Detta är en manuell referens, inte automatisk optisk måndetektering. Testa hållbarhet efter stora 3D-rörelser och ny kalibrering utan att återinföra den gamla återgången.
4. Lägg till kontroll mot fel vald tid/plats vid verklig riktning. Bevara möjligheten att utforska vald tid med telefonföljning, med tydlig simuleringsstatus.
5. Lägg senare eller i samma uttryckligen godkända paket till dags-/kvällsvalet och förbättrad Venus-skymning samt den tidigare föreslagna nedåt-dagsljusrättningen.

Verifiering ska omfatta Android/Brave på fysisk telefon: samma pose före/efter åttarörelse, källa före/efter, frisk relativ och absolut reservkälla, magnetisk störning, nord- respektive månkalibrering, skillnad i sidled/höjd, samt Nu kontra vald tid. En syntetisk test kan visa kodens beteende men avgör inte hur OS ändrar sensorerna.

## Genomförd verifiering

- Kodgranskning av `src/deviceDirection.ts`, `src/usePhoneOrientation.ts`, `src/astronomy.ts`, tids-/platsflödet i `src/main.tsx`, `src/PhoneControls.tsx` och `src/finderGuidance.ts`.
- Syntetiska sekvenser körda direkt mot den befintliga TypeScript-koden utan ändring av appkoden.
- 22 befintliga tester passerade: deviceDirection (9), finderGuidance (7), astronomy (6). Dessa innehåller ännu inte regressionskrav för alla nya felhypoteser.
- En oberoende NASA/JPL-kontroll av månen enligt parametrarna ovan. Inga råa uppgifter från användarens telefon analyserades.

Inga ändringar i appens funktion, kalibrering, rendering eller tidsval har genomförts i detta analyssteg.
