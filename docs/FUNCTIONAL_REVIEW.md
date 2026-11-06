# F-009 — funktionsgenomgång och mobilprov

## Omfattning och resultat, 2026-11-04

Användaren godkände den avgränsade webbläsargenomgången efter rekommendationen **Luna 6 High**. Denna körning granskar befintliga funktioner och förbereder ett kort mobilprov. Rättningar görs i en separat godkänd körning. **B-001 och B-004 är fortsatt pausade.**

Granskad appkod: `5d0dab70391a4319f6491743265f96d533021c3d`. Arbetskatalogens tidigare ändringar var analys-/plandokumentation; inga filer under `src/`, `labs/`, `data/` eller `public/` har ändrats i genomgången. Lokalt produktionsbygge får därför samma HEAD men dirty-markering. Senare dokumentationscommit kan ändra inbäddat bygg-ID utan en funktionsändring.

**175 offline-tester och komplett huvud-/labb-bygge passerar.** Chromium-flöden kördes i 390×844, 1280×800 och 568×320, med separat svensk mobilkontroll. Huvudflödena använder Canvas-diagnostikläget i molnmiljön; de befintliga följningsproven kör GPU-vägen med simulerad drivrutinsidentifiering. Detta är samma vanliga appgränssnitt, inte verifiering av mobilens GPU. Alla 15 flödes-/viewportfall nedan passerar efter korrigering av testskriptets knappnamn och väntan på asynkron React-publicering. Dessa korrigeringar gäller testverktyget; ingen appfix har gjorts. Två extra simulerade sensorfelsfall passerar. Ett mindre användbarhetsfel har registrerats som B-008. Se [sammanfattat underlag](measurements/functional-review-2026-11-04.json).

| Kontrollerat flöde | Resultat / avgränsning |
| --- | --- |
| Sökning och objektval | M31, Ceres och Pluto hittas; fem dvärgplaneter i egen kategori; kandidatlistan är separat; tom sökning ger inga kort. Detaljer, objektbild och käll-/licenslänkar fungerar. Alla tre skärmstorlekar. |
| Paneler och fokus | En panel åt gången, Escape/Tab och återgång till arbetsytan fungerar i de provade stegen. Himmelsytan behålls genom panelbyten; ingen global horisontell överrullning observerad. Inte en fullständig tillgänglighetsrevision. |
| Sparade objekt | Bokmärke kan läggas till, finns efter omladdning och kan tas bort. Alla tre skärmstorlekar. |
| Objekt-/listdelning | Delningspayload och urklippsreserv provas med lokala stubbar. Objektlänkens genererade förhandsvisning finns och länkar till rätt objekt. Lista öppnas skrivskyddad i en separat ren kontext och importeras först efter knapptryckning; import finns efter omladdning. Alla tre storlekar. Inga meddelanden eller länkar skickas till andra. |
| Guided Finder | Start/avslut, Detaljer, manuell centrering och centrerring fungerar. M7 ligger under Stockholms geometriska horisont och får ingen centrerad status/riktningspil; manuell centrering är då spärrad. Alla tre storlekar. Fysisk riktningsprecision provas inte. |
| Pinch och vybyte | Riktiga Chromium/CDP-touchpunkter ändrar projektionen i både horisontvy och karta utan objektval. Återgång till horisontvy fungerar. Alla tre storlekar. Inte ett fysiskt Android-/iOS-prov. |
| Tid och plats | Nu, fast tid och kvällsförhandsvisning; Londonbyte bevarar samma ögonblick med rätt lokal tid; ogiltiga koordinater/tidszoner avvisas; obefintlig lokal tid vid sommartidsbyte avvisas; egna koordinater sparas efter Apply. |
| GPS | Endast efter knapptryckning. Simulerat nekat svar, timeout, lyckat svar med noggrannhet och sent svar efter val av annan plats hanteras. Webbläsarens riktiga behörighetsdialog/radio är inte provad. |
| Svenska | Språkvalet kvarstår efter omladdning; sökning, detaljer och svensk objektdelningslänk fungerar. |
| Telefonföljning | Befintliga `verify_test_defaults.mjs` passerar för märkt kvällsstart, ingen automatisk behörighet, följning genom tapp/panel/pinch, svepövertagande och köad sensor-/manuell övergång i mobil/desktop, samt avbruten väntande behörighet. Separata nekade/utkastade sensorbehörigheter ger rätt status och manuell reserv. Sensorerna är simulerade. |

Inga ohanterade sidfel observerades. Skärmbilder av svensk mobilvy och kort liggande panel granskades. Bildruteflyt har inte benchmarkats; detta återupptar inte B-004.

## Nytt fynd — B-008

**Egna koordinater kan inte väljas i platslistan.**

1. Öppna **Time & location / Tid och plats** med exempelvis Stockholm vald.
2. Välj **Custom coordinates / Egna koordinater** i platslistan.
3. Valet återgår till Stockholm; ingen övergång till ett eget platsläge sker.

Källstöd: `selectPreset` söker enbart i de fyra förvalda platserna och återvänder utan åtgärd för värdet `Custom`. Browserprovet visar `Stockholm → Custom → Stockholm`. Detta är en mindre brist i det erbjudna valet, inte förlust av koordinatfunktionen. **Arbetsväg:** skriv koordinater och tidszon direkt i de synliga fälten och tryck **Apply / Använd**; det flödet fungerar och sparas efter omladdning.

Status: **Planerad, ej rättad**. Förslag till separat Luna 6 High-körning: gör valet begripligt/fungerande utan att byta observationsplats innan giltiga värden har tillämpats; bevara förval, GPS, validering och sparande. Denna genomgång godkänner inte rättningen.

## Kort mobilprov för användaren, cirka fem minuter

Använd den publicerade vanliga appen. Ingen prestandarapport behövs i detta prov. Svenska/engelska knappnamn beror på språkval.

1. **Sök och välj:** sök `M31`, välj objektet och öppna Detaljer. Prova också `Ceres` och `Pluto`. Kontrollera att rätt objekt visas och att du enkelt kan återvända till himlen.
2. **Guida och zooma:** välj Guide för ett objekt. Nyp in/ut och svep från en objektmarkör. Kontrollera att zoom/svep fungerar utan oavsiktligt objektval. Under-horisontmeddelande är normalt när objektet är nere.
3. **Spara och dela:** spara ett objekt, ladda om och kontrollera Sparade objekt. Öppna Dela, kopiera länken till en ny flik eller avbryt delningsrutan; appen ska fungera efteråt. Ingen sändning till någon annan krävs.
4. **Tid och plats:** prova en förvald plats och Nu/Kvällshimmel. Prova GPS om du vill; behörighet ska begäras först efter ditt knapptryck. B-008 har arbetsvägen ovan om du vill testa egna koordinater.
5. **Följning och paneler:** starta Follow en gång. När den följer, öppna/stäng sökning och detaljer, nyp och återgå till himlen. Följningen ska fortsätta; ett riktigt enfingerssvep ska stoppa den och styra manuellt. Prova Stoppa. Kontrollera även att viktiga knappar går att nå i liggande läge. Ingen figure-eight eller kontroll av riktprecision ingår.

Svara exempelvis **”1–5 fungerar, Android/Brave”** eller ange steg, vad du tryckte och vad som hände, gärna med skärmbild. Om första Follow-starten åter misslyckas hör det till öppna **B-007**; ange om ett andra försök behövdes och ungefärlig väntetid.

## Återstående F-009

Webbläsardelen och testplanen är klara. F-009 är **inte färdigvaliderad på riktiga telefoner**. Native delningsruta/urklipp, faktisk GPS-behörighet och platsmottagning, första sensorstarten, verklig touch/rotation/bakgrundsåtergång samt iOS/Safari och fler Android-webbläsare återstår. Browseremulering ska inte markeras som fysisk bekräftelse. B-007 förblir öppen. Riktningsdrift/precision kräver ett separat framtida beslut om B-001.

## Reproduktion för utvecklare

`npm test` och `npm run build`. Servera produktionsbygget med `npm run preview`. Optional Playwright/Chromium tillhandahålls av exekveringsmiljön; inga nya appberoenden läggs till.

```sh
APP_URL=http://127.0.0.1:58980/noxari/ \
PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs \
node scripts/verify_functional_flows.mjs
```

`ONLY=bookmark` respektive `ONLY=GPS` avgränsar de två omkörda grupperna. `QA_OUTPUT` väljer JSON-fil; standard är `/tmp/noxari-f009-results.json`. Befintliga syntetiska följningsprov: samma miljövariabler med `node scripts/verify_test_defaults.mjs`. Datum/plats/sensorer/GPS/delning i browserproven är fixtures/stubbar. Skriptet gör inga riktiga delningar.

## Inkommen mobilåterkoppling, 2026-11-05

Punkt 5: användaren såg ett fel på första Follow-starten, uppmanades att försöka igen, och andra försöket fungerade. Feltext/väntetid saknas; klassificera som kvarstående B-007, inte fastställd behörighets- eller no-data-orsak och inte bekräftat fel i panel/pinch/svep/landskap. Övriga moment antas inte godkända. Vid nästa misslyckande: skärmbild och befintlig riktningsrapport före ett nytt Follow-försök (More → Phone direction → Last direction check → Download direction report). Ny start ändrar startdiagnostiken och en lyckad start nollställer sensorloggen; rapport från andra försöket beskriver därför inte säkert det första. Ingen ny appändring eller utvecklingskörning är godkänd av återkopplingen.

Fortsatt återkoppling 2026-11-05: följningen verkar fungera en stund när den väl kommit igång. Användaren vill observera mer och arbeta med något annat under tiden. B-007 är fortsatt öppen; ingen säker långtids-/precision-/förstastartsbekräftelse. B-008 rättades i den godkända körningen 2026-11-05; välj Egna koordinater, redigera och tryck Använd för att tillämpa giltiga värden. Se senaste B-008/B-009-resultatet i HANDOVER.md.

## Språkåterkoppling 2026-11-05 — B-009

Användaren såg blandad svenska/engelska på datorn; mobilens engelska läge ser korrekt ut. Kodgranskning bekräftar ofullständig översättning av de flesta objekttyperna, Guided Finder-knapptext och vissa hårdkodade tillgänglighetsnamn. Befintligt F-009-svenskprov verifierar språkval/persistens och ett lokaliserat delningsflöde, inte att varje text är översatt. B-009 registreras separat; SV/EN i både mobil och desktop behöver ingå i rättningens verifiering. B-009 rättades i den godkända körningen 2026-11-05. Riktade Chromium-kontroller för språk/kategorier och B-008 passerar i 390×844 och 1280×800; se HANDOVER.md. Ingen fysisk telefonkontroll ingick.


Publiceringsuppföljning för B-008/B-009: appcommit `3ec70a11df55610a4222f78da756cfa30789f898`; GitHub Actions [41938378784](https://github.com/BadBagel47/noxari/actions/runs/41938378784) passerade tester, bygge och Pages. Publicerade huvud-/labb-assets matchade rent lokalt bygge över verifierad TLS. Se `HANDOVER.md` för sammanfattning och länk.


## F-008 + B-003 visual label review, 2026-11-05

Visual review on the default night scene found edge clipping and labels obscured by the status/quick-action overlays. `layoutObjectLabels` now tries nearby positions that fit the sky viewport and avoid other label rectangles, other object markers, and measured UI overlay rectangles. Selection, Sun/Moon/planet labels receive higher priority; if all positions conflict, only the text is hidden. Each marker remains at its exact projected coordinate with its 44 px button hit target and accessible name.

Chromium geometry check in both Look around and Sky map at 390×844, 1280×800 and 568×320 found zero overlapping, clipped or overlay-obscured visible labels. A shifted visible label remains clickable. `npm test` reports 179 passing tests; build and the 15 existing functional browser flows pass. These checks use simulated time/viewport and do not establish physical-device behavior.


## Senaste godkända körning — B-003, stabila etiketter under rörelse

Användaren godkände rättningen med ”Kör” efter rekommendationen **Sol High**. Genomfört: stabil prioritet/ID-ordning, företräde för redan synliga etiketter inom samma prioritetsklass och en bestående plats per objektnamn. Etiketten byter inte sida under svep/zoom eller tillfällig utpassage. Den döljs om dess plats blir blockerad; återvisning kräver ytterligare 8 px marginal. Omplacering mellan kontexter sker vid storleks-/språkbyte. Minnet publiceras först i Reacts layout-effekt efter commit och behåller högst 256 ID:n; inga extra JS-timers eller RAF tillkommer. Synlighetsbyten tonas med CSS i 120 ms, avstängt vid reducerad rörelse. Etiketttext anges uttryckligen som 13 px. Markörernas beräknade positioner, tryckyta, namn/val och direkt kameraföljning bevaras.

**Verifiering:** 184 tester passerar, inklusive regressionen där 0,4 px tidigare gav 64 px hopp, kontinuerligt svep/vändning/återinträde, gränsoscillation, nykomlingars prioritet och begränsat minne. Komplett TypeScript-/huvud-/labbbygge passerar. `scripts/verify_label_stability.mjs` passerar sex Chromium-fall (390×844, 1280×800, 568×320 × EN/SV) med verkliga drag-/CDP-pinchgester: inga platsbyten för redan placerade namn, ingen upprepad synlighetsväxling vid subpixeloscillation (uppmätt 0 i alla sex), inga aktiva etikettöverlapp/klipp under de provade banorna, oförskjutna markörcentrum och fungerande etikettval. CSS-toning/reduced-motion verifierade separat. Befintligt funktionstest passerar 15/15 flöden. Rapport: `docs/measurements/label-stability.json`. Detta är browser-/fixturebevis; användarens fysiska svepupplevelse återstår.

B-003 är implementerad och inväntar mobilåterkoppling; F-008:s dynamiska browseruppföljning är genomförd. B-001/B-004 fortsatt pausade och B-007 observeras. Ingen följande utvecklingskörning är godkänd.

Appkod `54f97dc8ed281204caba602cfbf9440c07d169cb` är publicerad; [Actions 42295572029](https://github.com/BadBagel47/noxari/actions/runs/42295572029) passerade 184 tester, huvud-/labbbygge och Pages. Publicerad huvud-/labb-HTML/JS/CSS matchade rent lokalt bygge över verifierad TLS. App: https://badbagel47.github.io/noxari/?v=54f97dc. Senare dokumentationscommit ändrar byggreferensen men inte etikettkoden.
