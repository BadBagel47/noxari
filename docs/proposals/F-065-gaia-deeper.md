# F-065 – fler svaga stjärnor vid djupzoom (förslag 2026-11-13)

Underlag för användarens beslut. Inget är hämtat. Antal räknade i ESA:s Gaia-arkiv 2026-11-13.

## Antal (Gaia DR3, hela himlen)
| Gräns | Stjärnor totalt | Nya utöver dagens G ≤ 11 |
| --- | --- | --- |
| G ≤ 11 (i dag) | 1 247 240 | – |
| G ≤ 12 | 3 087 828 | ≈ 1,8 milj. |
| G ≤ 13 | 7 369 632 | ≈ 6,1 milj. |
| G ≤ 14 | 16 844 164 | ≈ 15,6 milj. |
| G ≤ 15 | 36 909 365 | ≈ 35,7 milj. |

## Storlek (med dagens format: 6 byte för himlen + 10 byte detaljer per stjärna)
| Gräns | Rutor (det som ritas) | Detaljer (vid tryck) | Totalt |
| --- | --- | --- | --- |
| G ≤ 12 | ≈ 11 MB | ≈ 18 MB | ≈ 29 MB |
| G ≤ 13 | ≈ 37 MB | ≈ 61 MB | ≈ 98 MB |
| G ≤ 14 | ≈ 94 MB | ≈ 156 MB | ≈ 250 MB |

Beräknat, inte mätt. Telefonen hämtar bara rutorna för den del av himlen som syns vid djupzoom (en ruta ≈ 10°×10° på dagens rutnät; djupare nivåer skulle behöva mindre rutor, t.ex. 2,5°).

## Avvägning
- Sedan F-062/F-063 visar DSS-bilderna redan stjärnor ner mot magnitud 20 vid djupzoom. Det fler Gaia-stjärnor tillför är framför allt att de **går att trycka på** (kort med id, ljusstyrka, avstånd) och ritas skarpa i stället för som foto.
- Repot och GitHub Pages: G ≤ 13 (≈ 100 MB) går, men gör repot tungt för alltid (git-historiken). G ≤ 14 (≈ 250 MB) bör inte ligga i repot.

## Alternativ
1. **G ≤ 12 i repot** (≈ 29 MB, 1,8 miljoner nya). Liten risk, märkbart tätare vid 3–10×.
2. **G ≤ 13 i repot** (≈ 100 MB). Tätast utan extern lagring, men tungt repo.
3. **G ≤ 14 utanför repot** (t.ex. separat lagring som GitHub Releases eller molnlagring). Kräver ett nytt lagringsställe och ett beslut om var.
4. **Detaljer på begäran från Gaia-arkivet**: rutorna bara 6 byte per stjärna; id och avstånd hämtas från ESA när man trycker (skickar bara stjärnans id/position). Halverar storleken i alla alternativ men är ett nytt externt anrop.

## Rekommendation
Alternativ 1 nu (G ≤ 12 i repot, finare rutor för det nya lagret), och 3 + 4 senare om tätheten vid djupzoom inte räcker.
