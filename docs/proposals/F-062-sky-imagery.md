# F-062 – detaljrik himmel vid inzoomning (förslag 2026-11-13)

Underlag för användarens beslut. Ingen kod är skriven och inga bilder är hämtade. Uppgifterna om bildkällorna är hämtade 2026-11-13 från CDS:s HiPS-register (`alasky.cds.unistra.fr/MocServer`) och källornas egna sidor, där det gick.

## Bakgrund
Stellarium Web visar riktiga himmelsbilder (nebulosor, stoftmoln, galaxer och fotograferade stjärnor) som blir skarpare ju mer man zoomar. De kommer från himmelsundersökningar i formatet **HiPS**: himlen delad i rutor på flera detaljnivåer, så att man bara hämtar de rutor som syns. Noxari har i dag högst 3× zoom (ca 30° synfält) och en egen Vintergata från ett foto.

## Bildkällor (HiPS från CDS)
| Källa | Täcker | Detalj (högsta nivå) | Total storlek | Upphov/licens |
| --- | --- | --- | --- | --- |
| DSS2 färg (`CDS/P/DSS2/color`) | hela himlen | nivå 9 (≈ 1,7″/pixel) | ≈ 280 GB | STScI/NASA, färgad av CDS. Villkor: enligt STScI fri för icke-kommersiellt bruk med källhänvisning – **inte verifierat** (STScI:s sida kunde inte öppnas härifrån) |
| DESI Legacy Surveys DR10 färg | 67 % (utanför Vintergatans plan) | nivå 11 | stor | **CC BY 4.0, verifierat** på legacysurvey.org |
| DECaPS DR2 färg | 7 % (södra Vintergatsplanet) | nivå 11 | stor | CC BY 4.0 (samma sida) |
| unWISE färg | hela himlen | nivå 8 | ≈ 19 GB | CC BY 4.0 (samma sida); infrarött, ser inte ut som ögat ser |
| Pan-STARRS DR1 färg | 78 % (norr om −30°) | nivå 11 | ≈ 1,2 TB | PS1 Science Consortium; licens oklar |
| 2MASS färg | hela himlen | nivå 9 | ≈ 75 GB | UMass & IPAC; infrarött |
| Mellinger färg | hela himlen | nivå 4 | ≈ 37 MB | **”All rights reserved”** – kan inte användas |

## Alternativ
1. **Egen lågupplöst bild (ingen extern hämtning).** DSS2 färg till nivå 3–4 (≈ 70–275 MB) läggs på egen server och ersätter/kompletterar Vintergatan upp till dagens 3×. Ger mer struktur (nebulosor, stoftband) men inte djupzoom. Stort tillskott till repot; DSS-licensen behöver verifieras.
2. **Djupzoom med bildrutor från CDS (rekommendation).** Zoomgränsen höjs (t.ex. till 60×, ca 1,5° synfält). Från ca 3× tonas DSS2-färgrutor in, hämtade direkt från CDS för den del av himlen som syns; där Legacy Surveys finns (CC BY 4.0) kan de användas vid högsta zoom. Liknar Stellarium mest och kräver ingen lagring hos oss. Ungefär 0,3–1 MB per ny vy vid inzoomning.
3. **Bara CC BY-källor.** Som 2 men bara Legacy Surveys/DECaPS: tydligaste licensen men luckor i norra Vintergatan och nära polerna.

## Det som kräver ditt beslut (innan kod)
- **Integritet (projektregel):** alternativ 2–3 hämtar bildrutor från CDS (Strasbourg). Då ser CDS din IP-adress och vilken del av himlen du zoomar in på – inte din plats eller tid. Projektreglerna tillåter i dag bara objektnamn, CelesTrak och avrundad plats efter samtycke. Förslag: tillåt bildrutor från CDS först när man zoomar förbi 3×, med en rad i integritetstexten under Om.
- **Zoomgräns (projektregel):** i dag 1–3×. Förslag: upp till 60× i Se dig omkring, kartan oförändrad.
- **Licens:** DSS2 bedöms vara icke-kommersiell med källhänvisning (overifierat); det stämmer med beslutet att Noxari är icke-kommersiell. Verifieras före bygget.
- **Bildernas stjärnor:** fotona innehåller egna stjärnor. Vid djupzoom tonas Noxaris ritade svaga stjärnor ner när bilden tar över, så stjärnor inte syns dubbelt.

## Det som sedan byggs (egen körning, starkt modell, hög nivå)
HiPS-läsare (rutor efter zoom och riktning, gemensamt för GPU och Canvas via SkyFrames), toning mellan Vintergata/Gaia-stjärnor och bilder, zoomgräns, källhänvisning i hörnet när bilder visas, integritetstext, cachning, mätning av panorering (mjukvarurenderare, inte telefonresultat).
