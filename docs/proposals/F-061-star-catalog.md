# F-061 steg 2 – katalog för svaga stjärnor (förslag 2026-11-13)

Underlag för användarens beslut. Inget är hämtat eller genererat. Antal är räknade direkt i ESA:s Gaia-arkiv (TAP, `gea.esac.esa.int`) 2026-11-13. CDS (VizieR) gick inte att nå från miljön (tunneln stängdes), så Tycho-2 räknades via Gaia-arkivets kopia `public.tycho2`.

## Nuläge
HYG v4.1: 8 922 stjärnor till V 6,5 (alltid) + 52 894 kikarstjärnor V 6,5–8,5 (`public/stars/binocular-v1.bin`, 264 kB, 5 byte/stjärna, laddas vid behov). Ingen katalog-id, inget avstånd för kikarstjärnorna i kortet.

## Räknade antal (hela himlen)
| Katalog | Gräns | Antal |
| --- | --- | --- |
| Tycho-2 | VT < 9 | 120 161 |
| Tycho-2 | VT < 10 | 327 619 |
| Tycho-2 | VT < 10,5 | 535 553 |
| Tycho-2 | VT < 11 | 863 865 |
| Tycho-2 | alla | 2 539 913 |
| Gaia DR3 | G < 10 | 482 106 |
| Gaia DR3 | G < 11 | 1 247 240 (1 234 715 med parallax > 0 och färg) |
| Gaia DR3 | G < 12 | 3 087 821 |

## Alternativ
| | Tycho-2 till V ≈ 10,5 | Gaia DR3 till G 11 (rekommenderas) | Gaia DR3 till G 12 |
| --- | --- | --- | --- |
| Nya stjärnor utöver HYG ≤ 8,5 | ≈ 0,47 milj. | ≈ 1,2 milj. | ≈ 3,0 milj. |
| Uppskattad storlek (rutor, 6–8 byte/stjärna) | ≈ 3–4 MB | ≈ 8–10 MB | ≈ 20–25 MB |
| I kortet vid tryck | Tycho-nummer, magnitud, färg | Gaia DR3-nummer, magnitud, färg, avstånd (från parallax), rörelse | som G 11 |
| Licens | Ingen uttrycklig licens hittad; ESA/CDS begär källhänvisning (Høg m.fl. 2000). **Ej verifierad** | ESA anger Gaia-data som CC BY-SA 3.0 IGO med citering av Gaia Collaboration 2016 och 2023 (DR3). Citeringskravet bekräftat i DR3-dokumentationen; **licenssidan kunde inte öppnas härifrån – verifieras före hämtning** | som G 11 |
| Mobil | Lätt | Rutor laddas bara för synlig del vid inzoomning | Tungt; troligen för mycket för telefon |

Uppskattningarna av storlek är beräknade, inte mätta. Den verkliga storleken mäts när generatorn finns.

## Rekommendation
Gaia DR3, stjärnor 8,5 < G ≤ 11, uppdelade i himmelsrutor som laddas först vid inzoomning (inte förcachade, som kikarstjärnorna i dag). Det ger ungefär 20 gånger fler stjärnor än nu, riktiga avstånd och id i kortet, och licensen är känd (efter verifiering). HYG behålls för ljusa stjärnor, eftersom Gaia mäter dem dåligt (mättnad).

## Vad som krävs innan kod
1. Användarens val av alternativ.
2. Verifiera Gaia-licensen (CC BY-SA 3.0 IGO) på ESA:s sida och lägga in den under Mer → Om och källor och i `public/licenses/`.
3. Fast urval: ADQL-fråga, datum och kontrollsumma i en ny generator (`scripts/generate_gaia_stars.*`), som övriga genererade data.
4. Integritet: inget om platsen skickas; filerna ligger på egen server.

## Det som sedan byggs (egen körning)
Generator och rutformat; lat laddning per ruta och zoom; tryckbara svaga stjärnor (`src/starPick.ts` måste tåla fler stjärnor); kort med Gaia-uppgifter; samma utseende i GPU och Canvas; mätning av laddning och panorering (mjukvarurenderare, inte telefonresultat).
