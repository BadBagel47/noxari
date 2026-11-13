# UX-genomgång och designförslag ”Obsidian” (2026-11-13)

Underlag för beslut. Ingen appkod är ändrad. Genomgången bygger på skärmbilder av den publicerade appen i mobilformat (390×844, svenska): `nu-1.png` (start, Ikväll, Lager, Tid & plats) och `nu-2.png` (Mer, snabbrad, sök, objektkort, detaljer). Förslaget: `mockup.html`, renderat till `obsidian.png` ovanpå en riktig himmelsbild från appen (`sky.png`). Den tidigare skissen från 2026-11-12 ligger i `../ux-2026-11/`.

## 1. UX – vad som kan effektiviseras

| # | Iakttagelse | Förslag | ID |
| --- | --- | --- | --- |
| 1 | Samma sak väljs på två ställen med olika namn: ”Vad som syns” (Blotta ögat/Kikare/Hela katalogen) i Lager och ”Utrustning” (Ögat/Kikare/Teleskop) i Ikväll. | Ett gemensamt val (”Detaljnivå”), som Ikväll också följer; en reglage-rad i Lager. | F-067 |
| 2 | Lager är en lång panel: vy, nivå, grupper, elva rutor i rutnät (en ser avstängd ut: ”Namn”), stjärnbildsurval och förklaring. Snabbraden visar delvis samma reglage. | Gruppera: Vy · Detaljnivå · Visa (lista med på/av, viktigast först) · Objekt (chips). Snabbraden behålls för de 4–5 vanligaste. | F-067 |
| 3 | Svaga stjärnor (Gaia) och himmelsbilder syns bara på ”Hela katalogen” + zoom, men appen startar på ”Blotta ögat” – det nya är svårt att upptäcka. | Zoom visar alltid mer detalj (svagare stjärnor, bilder); nivån styr vilka *objekt* som markeras och listas. Synlig zoomkontroll (+/−, nivå 1×–200×) på mobil. | F-068 |
| 4 | Objektkortet har knappen ”Mer” – samma ord som fliken ”Mer” i nedre raden. | Byt till ”Detaljer” (eller dra upp kortet). | F-069 |
| 5 | Detaljvyn är textlång: Wikipedia (engelska i svenskt läge), många förbehåll i följd; nyckeltal kommer långt ned. | Nyckeltal först (höjd nu, riktning, bäst, ljusstyrka, utrustning), sedan diagram; förbehåll i hopfällbar ”Om beräkningen”; svensk Wikipedia när artikeln finns. Förbehållen finns kvar (AGENTS.md), men tar mindre plats. | F-069 |
| 6 | Toppen tar två rader: sökfält + Följ, och under det ett plats/tid-kort. | Plats och tid som undertext i sökkapseln (tryck öppnar Tid & plats); frigör en rad himmel. | F-070 |
| 7 | Mer-menyn blandar vardag (Sparade, Logg) med prototyp/felsökning (Telefonriktning, Prestandarapport) högt upp. | Mina objekt · Inställningar · Om; felsökning i en hopfälld ”Avancerat” längst ned. | F-071 |
| 8 | Ikväll börjar med visningsknapp, flikar och molnprognos; listan ”Bäst i natt” kommer först efter en skärm. | Nattsammanfattning (mörkt-tid med tidslinje), sedan listan med liten höjdkurva och bästa tid; visning, moln och kommande som små knappar. | F-072 |

Rekommenderad ordning: F-067 + F-068 (störst vinst), sedan F-069 + F-071, sedan F-070 + F-072 tillsammans med den nya designen.

## 2. Designförslag ”Obsidian”

- **Himlen först.** Kontrollerna flyter som mörkt glas (58 % täckning, 24 px oskärpa, lätt mättnad, 1 px hårlinje) så att himlen syns suddigt igenom; stora ark 74 %. Närbild: `glas-och-knapp.png` (`glass-detail.html`).
- **En accent, en signal.** Isblå (#A9C2FF) för val; bärnsten (#F3C76E) bara för ”bäst/nu”. Övrigt i gråskala.
- **Primärknapp** (”Visa på himlen”), justerad 2026-11-13 efter användarens synpunkt att den var för stark: tonad isblå (16 % isblå yta, text #C8D7FF, tunn kant) i stället för fylld. Jämförda alternativ: fylld isblå, stålblå, tonad bärnsten.
- **Nedre rad** som flytande kapsel med fyra flikar och en liten punkt för aktiv flik; **toppen** en kapsel (sök + plats/tid) och en rund Följ-knapp.
- **Objektkort** med fyra nyckeltal i rutor och en tydlig primärknapp (”Visa på himlen”) + ikonknappar.
- **Ark** (Lager, Ikväll) med större rubriker, segmentkontroller, listor med reglage i stället för rutnät av rutor.
- **Typografi** Inter/systemfont, rubriker 600–650 med tät spärrning, siffror med fast bredd. Rundning: ark 28, kort 22, kontroller 14.
- **Rödfilter** ska fortsatt färga hela temat; en röd variant tas fram vid bygget.

Siffror, tider och objekt i skissen är illustrativa. Bygget (F-073) ändrar bara utseende och struktur; beräkningar, sensorlogik och rendering påverkas inte, men panorering mäts ändå efteråt.
