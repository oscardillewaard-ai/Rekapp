# Rekapp — bouwspecificatie v2

**Voor Claude Code.** Versie 2.0 · 17 oktober 2026 · vervangt sectie D uit het rapport *Ochtend- en avondstretchroutines voor trail/ultra, klimmen en PFPS* (v1).

> **Voor Oscar:** geef dit hele bestand aan Claude Code met de opdracht: *"Bouw de app volgens dit document. Begin bij §0 en werk de mijlpalen op volgorde af."* Wil je zelf kijken hoe goed elke stretch is: §5 is het overzicht met sterren, §4 zegt per spiergroep wat het bewijs is.

---

## 0. Opdracht

Bouw een installeerbare, offline werkende web-app (PWA) in het Nederlands voor iPhone (Safari) en Android (Chrome). De gebruiker kan ermee:

1. een bibliotheek van **70 stretches voor 24 spiergroepen** doorzoeken, elk met sterren (1–5), vijf deelscores, voor- en nadelen, knie-informatie en bronnen;
2. **zelf routines samenstellen**, met live totale tijd, een weekdosis per spiergroep en waarschuwingen;
3. routines begeleid afspelen (timer, kantwissels, geluid, spraak);
4. sessies, kniechecks en zelftests vastleggen en exporteren.

**Randvoorwaarden**

- Geen backend, geen accounts, geen externe libraries en geen CDN's. Vanilla HTML/CSS/JS met ES-modules, zonder buildstap.
- Alle gebruikersdata lokaal in IndexedDB, met export en import (JSON en CSV).
- `data/library.json` is het JSON-blok in §10, letterlijk. Haal het eruit met een script (alles tussen de regels `<!-- LIBRARY_JSON_START -->` en `<!-- LIBRARY_JSON_END -->`, zonder de codeblokmarkering). Wijzig scores nooit met de hand: `library.js` rekent ze bij het laden na (§9.2) en weigert afwijkingen.
- Hosting via HTTPS (GitHub Pages, Cloudflare Pages of Netlify), met `sw.js` in de root.
- Illustraties: eigen, originele SVG's (§6.2). Niets overnemen van bestaande sites of apps.

**Mijlpalen, in deze volgorde**

| # | Mijlpaal | Klaar als |
|---|---|---|
| M1 | Data en validatie | `library.json` laadt, de validator (§9.2) slaagt en alle testvectoren in §11.1 kloppen |
| M2 | Bibliotheek en oefeningkaart | Filters, sortering, kaart met sterren, deelscores, voor- en nadelen (§6.1–6.2) |
| M3 | Speler | Timeline, timer, kantwissel, geluid, spraak, wake lock (§6.8, §7) |
| M4 | Routinebouwer, dosismeter, waarschuwingen | §6.3–6.5 |
| M5 | Kniecheck, knieslot, 48-uurstest, opvlammingsmodus | §6.6–6.7 |
| M6 | Logboek, export, zelftests | §6.9–6.10 |
| M7 | PWA: manifest, service worker, installatiehulp, opslag | §7 |
| M8 | Acceptatietests op een echte iPhone en Android-telefoon | §11 |

---

## 1. Wat er verandert ten opzichte van v1

- **Bibliotheek:** van 19 naar 70 oefeningen, van 8 naar 24 spiergroepen. 10 oefeningen zijn vergrendeld door de knie-poort (§3.2).
- **Nieuw:** sterrensysteem met vijf deelscores, voor- en nadelen per oefening, routinebouwer, weekdosis met "keer per week", knieslot met 48-uurstest, opvlammingsmodus en een lichaamskaart.
- **De zes routines uit v1 blijven** als sjablonen: alleen-lezen, wel kopieerbaar. De totale tijden zijn ongewijzigd: 305, 610, 900, 295, 615 en 885 s.
- **Dosis herberekend.** v1 telde een oefening volledig mee voor elke spiergroep die hij raakte. v2 telt een bijbetrokken spiergroep voor 50% mee en splitst "heupbuigers/RF" in twee groepen. Daardoor verschuiven de weektotalen (§6.4.3). Voorbeelden voor het pakket STANDAARD (ochtend 10 + avond 10, dagelijks): hamstrings van 840 naar 630 s per week, soleus van 210 naar 367,5 s per week, en de heupbuigers apart nu 157,5 s per week (statisch).
- **Validatieregel aangepast.** v1 weigerde elke oefening met meer dan 90° kniebuiging. v2 accepteert die alleen als de oefening vergrendeld is.
- **Scores na de literatuurtoets, vergeleken met het voorstel in de chat:** de bewijsscore van de quadricepsgroepen ging van 2 naar 3 (een 4-weekse PNF-studie en een RCT bij PFP-patiënten). Gevolg: "Rectus femoris zijlig met band" van 3,50 naar 3,75 (★★★★), "Hiel naar bil staand" van 2,80 naar 3,05, maar door de knie-poort blijft die op 2 sterren.

---

## 2. Regels uit het bewijs die de app afdwingt

| Regel | Bron | Bewijs | Wat de app doet |
|---|---|---|---|
| Blijvende ROM-winst vraagt minstens ~5 min (300 s) rekken per spiergroep per kant per week | Thomas 2018; Konrad 2024 | matig | Dosismeter oranje onder 300 s, groen vanaf 300 s |
| Boven ~10 min (600 s) per week komt er waarschijnlijk niets meer bij | Bennett 2025 | matig | Info-melding boven 600 s (W5) |
| Statisch en PNF geven meer blijvende winst dan dynamisch | Konrad 2024 | matig | Dosismeter telt alleen statisch en PNF; B −1 voor dynamisch en actief (§3.1) |
| Rekintensiteit maakt gemiddeld weinig uit | Bennett 2025 | matig | Cue "rek 5–6/10" |
| ≥60 s statisch per spiergroep vlak voor inspanning kost ~4–5% prestatie; korter vrijwel niets | Behm 2016 | matig | Waarschuwing in routines met "vóór een run" (W3) |
| Rugbuigen vlak na het opstaan belast de tussenwervelschijven het meest | Adams 1987; Snook 1998 | matig | Waarschuwing in ochtendroutines (W2) |
| Winst loopt terug als je stopt | Konrad 2025 | matig | Onderhoudsadvies na week 12 (§6.4.2) |
| Rekken voorkomt geen blessures; krachttraining wel | Lauersen 2014 | sterk | Geen blessureclaims in de app; uitleg op het scherm "Over" |
| Kniebuiging onder belasting verhoogt de druk achter de knieschijf | Powers 2014 (gemeten bij squats) | matig; toepassing op rekken is extrapolatie | K-score, knie-poort, slot en opvlammingsmodus |
| Pijn ≤2/10 tijdens en na, niet hoger na 24 uur, geen stijgende trend; drie schone 48-uurscontroles voordat je ophoogt | Eigen afspraak (Silbernagel-kader) | n.v.t. | Ontgrendelprotocol (§6.6) |

---

## 3. Sterrensysteem

### 3.1 Vijf deelscores (1–5)

**B — Bewijs.** Per spiergroep en rektechniek.

| B | Betekenis |
|---|---|
| 5 | Meta-analyse van RCT's met blijvende ROM-winst voor deze spiergroep |
| 4 | Minstens twee trainingsstudies (≥3 weken) met ROM-winst voor deze spiergroep |
| 3 | Eén trainingsstudie, of meerdere acute studies |
| 2 | Alleen een losse acute studie, patiëntstudies of indirect bewijs (echografie, kadaver) |
| 1 | Geen onderzoek gevonden, of bewijs dat het veronderstelde mechanisme niet klopt |

Correctie voor de techniek: dynamisch en actief krijgen B −1 (minimaal 1), omdat statisch en PNF meer blijvende winst geven (Konrad 2024). Uitzondering: als er voor die vorm bij die spiergroep een eigen trainingsstudie is. Die uitzonderingen staan in het veld `bNote`.

**K — Knieveiligheid.** Voor jouw PFPS. Dit is voorzorg op basis van biomechanica, niet getest op rekposities.

| K | Betekenis |
|---|---|
| 5 | Knie niet betrokken of gestrekt, of een gewone zit- of lighouding; geen druk op de knieschijf |
| 4 | Kniebuiging ≤90° onbelast, of ≤45° onder lichaamsgewicht; hooguit lichte quadricepsspanning |
| 3 | 45–60° onder lichaamsgewicht, of ≤90° met een draaimoment of matige quadricepsspanning |
| 2 | Meer dan 90° onbelast met quadricepsspanning, knielen op een dik kussen, of een draaimoment op gebogen knieën met deels lichaamsgewicht |
| 1 | Knielen zonder kussen, diepe kniebuiging onder lichaamsgewicht, of draaibelasting op een gebogen, belaste knie |

**D — Doelgerichtheid.** Rekt de oefening echt de bedoelde spier? Dit is een oordeel op basis van anatomie en de paar beeldvormings- en bewegingsstudies die er zijn.

| D | Betekenis |
|---|---|
| 5 | Rekt aantoonbaar of anatomisch eenduidig de bedoelde spier; weinig compensatie |
| 4 | Rekt de bedoelde spier goed; compensatie is met de cues te voorkomen |
| 3 | Rekt de spier plus andere structuren, of compensatie ligt voor de hand |
| 2 | Rekt de bedoelde spier maar deels; veel compensatie |
| 1 | Rekt de genoemde structuur niet |

**R — Relevantie** voor jouw doelen: trail en ultra, steile hellingen, klettersteig en klimmen.

| R | Betekenis |
|---|---|
| 5 | Beperkt sleutelbewegingen voor trail én klimmen |
| 4 | Belangrijk voor een van beide, of in verband gebracht met PFP |
| 3 | Nuttig, maar niet bepalend |
| 2 | Kleine rol |
| 1 | Geen rol |

**P — Praktisch.**

| P | Betekenis |
|---|---|
| 5 | Geen materiaal, staand of overal te doen, snel |
| 4 | Iets uit huis nodig (muur, deurpost, trede, stoel, handdoek, bed) of op de vloer |
| 3 | Specifiek materiaal of een omslachtige opstelling |
| 2 | Partner of lange opstelling nodig |
| 1 | Onpraktisch |

### 3.2 Formule

```
score   = 0,25·B + 0,25·K + 0,20·D + 0,15·R + 0,15·P        (bereik 1–5, twee decimalen)
sterren = score afgerond op 0,5; een halve stap rondt naar boven af
          (sterren = floor(score × 2 + 0,5) / 2)
knie-poort: als K ≤ 2 → sterren = min(sterren, 2) en locked = true
```

Rekenvoorbeelden uit de data:

- **Kuit tegen de muur (gestrekte knie)** (`gastroc_muur`): 0,25·5 + 0,25·5 + 0,20·4 + 0,15·5 + 0,15·5 = 4,80 → ★★★★★
- **Hamstrings met band (contract-relax)** (`hamstring_pnf`): 0,25·5 + 0,25·5 + 0,20·5 + 0,15·5 + 0,15·4 = 4,85 → ★★★★★
- **Rectus femoris zijlig met band** (`rf_zijlig`): 0,25·3 + 0,25·4 + 0,20·4 + 0,15·4 + 0,15·4 = 3,75 → ★★★★
- **Heupbuiger dynamisch (split-stand)** (`heupbuiger_dyn`): 0,25·4 + 0,25·4 + 0,20·4 + 0,15·5 + 0,15·5 = 4,30 → ★★★★½ (Geen −1 voor dynamisch: een RCT met 8 weken dynamisch heupbuigerrekken liet grote winst zien.)
- **Figuur-4 met voet tegen de muur** (`figuur4_muur`): 0,25·2 + 0,25·4 + 0,20·4 + 0,15·4 + 0,15·4 = 3,50 → ★★★½
- **Nek: oor naar schouder** (`nek_trapezius`): 0,25·3 + 0,25·5 + 0,20·4 + 0,15·2 + 0,15·5 = 3,85 → ★★★★
- **Hiel naar bil staand (klassiek)** (`quad_hiel_bil`): 0,25·3 + 0,25·2 + 0,20·3 + 0,15·3 + 0,15·5 = 3,05 → ★★ → knie-poort: maximaal 2 sterren, vergrendeld
- **Heupbuiger halfgeknield (op dik kussen)** (`heupbuiger_halfgeknield`): 0,25·4 + 0,25·2 + 0,20·5 + 0,15·5 + 0,15·4 = 3,85 → ★★ → knie-poort: maximaal 2 sterren, vergrendeld

Verdeling over de hele bibliotheek: ★★★★★ (5,0): 3 · ★★★★½ (4,5): 9 · ★★★★ (4,0): 14 · ★★★½ (3,5): 30 · ★★★ (3,0): 4 · ★★ (2,0): 10. Daarvan 10 vergrendeld (maximaal 2 sterren door de knie-poort).

### 3.3 Wat de sterren wel en niet zeggen

- **Ze zijn persoonlijk.** Ze gelden voor jou: PFPS, trail en klimmen. Voor iemand zonder knieklachten scoort een hiel-naar-bil hoger.
- **B is bijna altijd groepsbewijs.** Studies naar één specifieke variant zijn zeldzaam. Twee stretches voor dezelfde spiergroep verschillen daarom vooral in K, D, R en P.
- **D en R zijn oordelen** en K is voorzorg. De kaart toont daarom altijd het bewijsniveau in woorden (§6.2).
- **Bekend effect van de weging:** oefeningen zonder kniebetrokkenheid (romp, schouders, armen) krijgen K = 5 en scoren daardoor relatief hoog, ook als ze voor jouw doelen weinig opleveren (lage R). Twee oplossingen in de app: sorteren op R, en "Weging aanpassen" in de instellingen (§6.11). De standaardweging blijft 25/25/20/15/15, zoals afgesproken.

---

## 4. Spiergroepen

B-basis = bewijsscore voor statisch of PNF rekken in deze groep. R = relevantie voor jou. "Bewijs" is in eigen woorden samengevat; de bronnen staan in §12.

| Spiergroep | Regio | B | R | Bewijs | Waarom relevant | Bronnen |
|---|---|---|---|---|---|---|
| Voetzool en tenen (`voetzool`) | Voet en onderbeen | 2 | 3 | Een RCT bij chronische hielpijn vond dat een gerichte voetzoolstretch beter werkte op pijn en functie dan een achillespeesstretch. Studies naar meer bewegingsuitslag bij gezonde mensen zijn niet gevonden. | Teenstrekking bij de afzet en bij smeren op rots. | DiGiovanni 2003 |
| Scheen (`scheen`) | Voet en onderbeen | 1 | 2 | Geen studies gevonden naar meer bewegingsuitslag door het rekken van de scheenspier. | Zelden beperkend bij lopen of klimmen. | — |
| Kuit: gastrocnemius (`gastrocnemius`) | Voet en onderbeen | 5 | 5 | Meta-analyse van 5 RCT's: kuitrekken vergroot de dorsiflexie, maar het effect is klein (gemiddeld 2–3°). Past in het bredere beeld dat statisch rekken de bewegingsuitslag vergroot. | Dorsiflexie voor steile hellingen, power hiken en aanlooppaden van een klettersteig. | Radford 2006, Konrad 2024 |
| Kuit: soleus (`soleus`) | Voet en onderbeen | 4 | 5 | Valt onder dezelfde kuit-meta-analyse, maar varianten met gebogen knie zijn apart weinig onderzocht. | Met gebogen knie, zoals bergop, beperkt vooral de soleus je enkel. | Radford 2006 |
| Hamstrings (`hamstrings`) | Heup en bovenbeen | 5 | 5 | Het best onderzochte gebied: statisch en PNF vergroten de bewegingsuitslag betrouwbaar. Bij PFP-patiënten met stijve hamstrings gaf dynamisch rekken plus kracht betere klinische uitkomsten dan statisch rekken plus kracht. | Heupflexie voor hoge stappen en klimbewegingen. | Konrad 2024, Thomas 2018, Lee 2021 (hamstrings) |
| Rectus femoris (`rectus_femoris`) | Heup en bovenbeen | 3 | 4 | Gemengd. In een grote meta-analyse was het langetermijneffect bij de quadriceps niet significant, maar dat rustte op slechts 3 metingen. Een 4-weeks PNF-programma gaf +9,2° kniebuiging. Bij PFP-patiënten met stijve quadriceps verbeterden pijn en functie na statisch én dynamisch quadricepsrekken, maar zonder groep die niet rekte. Acuut gaf een lage rekintensiteit (80%) geen winst. | Heupextensie in de looppas. Verminderde quadricepsflexibiliteit ging in een prospectieve studie vooraf aan het ontstaan van PFP. | Konrad 2024, Warneke 2025, Higgs & Winter 2009, Lee 2021 (quadriceps), Nakamura 2021, Witvrouw 2000 |
| Quadriceps: vasti (`quadriceps_vasti`) | Heup en bovenbeen | 3 | 3 | Zelfde quadricepsbewijs als bij de rectus femoris: gemengd. **Let op:** Elke vasti-stretch vraagt meer dan 90° kniebuiging, dus hier staan alleen vergrendelde opties. Binnen je regels werk je aan deze spieren via kracht over de toegestane range (leg extension 90°→45°) en via de rectus-femorisstretches. | Beperkt; vooral relevant als de quadriceps echt stijf is. | Konrad 2024, Higgs & Winter 2009, Lee 2021 (quadriceps) |
| Heupbuigers (iliopsoas) (`heupbuigers`) | Heup en bovenbeen | 4 | 5 | Meerdere RCT's. Actief en passief heupbuigerrekken vergrootten de heupextensie even goed in 6 weken. Tien weken rekken deed dat ook bij ouderen. Acht weken dynamisch rekken gaf grote winst bij profvoetballers, die na 4 weken stoppen deels verdween. Het bekken achterover kantelen tijdens de rek werkte acuut beter dan alleen naar voren schuiven. | Heupextensie in de looppas en bergop; tegenwicht voor veel zitten. | Winters 2004, Watt 2011, J Sports Sci 2025, González-de-la-Flor 2024 |
| Adductoren (lies) (`adductoren`) | Heup en bovenbeen | 3 | 4 | Vooral acute studies, met kleine effecten per sessie. Langdurig onderzoek is schaars. | Spreiden en zijwaarts stappen op de klettersteig en op rots; zijwaartse bewegingen op technisch terrein. | Fjerstad & Hammer 2018 |
| Heup-buitenkant (TFL, gluteus medius, IT-band) (`heup_buitenkant`) | Heup en bovenbeen | 2 | 3 | De IT-band zelf verlengt nauwelijks: in kadavers minder dan 0,5%, en hij zit stevig vast aan het dijbeen. Wat je rekt is vooral de TFL en de bilspieren. In een labstudie bij 5 lopers gaf de staande variant met armen boven het hoofd de grootste lengteverandering van het complex. | Matig; vooral comfort bij een stijve heupbuitenkant. | Falvey 2010, Fredericson 2002 |
| Gluteus maximus (`gluteus_max`) | Heup en bovenbeen | 2 | 3 | Eén acute crossoverstudie: statisch bilrekken vergrootte het passieve heupbereik direct. Geen trainingsstudies gevonden. | Diepe heupflexie bij hoge stappen. | PeerJ 2024 |
| Diepe heupdraaiers (piriformis) (`heupdraaiers`) | Heup en bovenbeen | 2 | 4 | Echografisch onderzoek liet zien dat de piriformis het meest gerekt wordt bij maximale buitendraai met ~110° heupflexie en ~40° adductie. Trainingsstudies bestaan alleen bij piriformissyndroom; rekken was daar niet beter dan de standaardbehandeling. | Binnen- en buitendraai van de heup voor drop knees en hoge, gedraaide stappen bij klimmen. | J Sport Rehabil 2024, Ergezen & Sahin |
| Onderrug (`onderrug`) | Romp en nek | 2 | 3 | Programma's met rek- en stabiliteitsoefeningen vergrootten de rompflexibiliteit (12 weken, n=72), maar rugbuigend rekken alleen is niet apart onderzocht. Vlak na het opstaan zijn de tussenwervelschijven gevoeliger voor buigbelasting, en ochtendbuigen beperken verminderde rugpijn in een RCT. | Werk met veel bukken en tillen. | SJPH 2025, Adams 1987, Snook 1998 |
| Zijkant romp (`zijkant_romp`) | Romp en nek | 2 | 2 | Bij chronische lage rugpijn verbeterden programma's met onder meer rekken de zijwaartse buiging. Weinig onderzoek bij gezonde mensen. | Zijwaarts reiken. | Ashoury & Yalfani 2024 |
| Buik (extensie) (`buik`) | Romp en nek | 3 | 2 | In een RCT bij 101 gezonde volwassenen vergrootten zowel herhaald achteroverbuigen als statisch extensierekken de lumbale extensie na 4 en 8 weken; herhaald werkte beter. | Tegenbeweging na veel bukken; weinig belang voor lopen of klimmen. | Bybee e.a. |
| Borstwervels (thoracaal) (`borstwervels`) | Romp en nek | 2 | 4 | In een kleine studie verbeterden een staande en een viervoetige rotatieoefening de thoracale rotatie even goed na 2 weken, maar zonder controlegroep. Verder weinig onderzoek. | Reiken boven je hoofd en draaien op de klettersteig; houding bij tillen. | Okayama-studie |
| Nek (`nek`) | Romp en nek | 3 | 2 | RCT's laten direct meer nekbereik zien na rekken van de bovenste trapezius, maar in een ervan was het effect na 24 uur verdwenen. | Beperkt; omhoog kijken bij klimmen. | Hanney 2017, Oliveira-Campelo 2013 |
| Latissimus dorsi (`latissimus`) | Schouder en arm | 2 | 4 | De lengte van de latissimus verschilt tussen sporten, maar trainingsstudies naar latrekken zijn niet gevonden. | Reiken boven je hoofd: de volgende greep of beugel. | Herrington & Horsley 2014 |
| Borst (grote en kleine borstspier) (`borst`) | Schouder en arm | 4 | 3 | Twee RCT's: 7 weken borstrekken (3× per week 15 min) vergrootte de schouderextensie (+6%), en 8 weken dagelijks 15 min gaf +9,8% schouderbereik. De eenarmige stretch in de deuropening verlengde de kleine borstspier het meest van drie methodes. Let op: die trainingsvolumes zijn veel hoger dan in een korte routine. | Schouderbereik en houding; matig voor lopen. | Reiner 2023, JSSM 2023, Borstad & Ludewig 2006 |
| Voorkant schouder en biceps (`schouder_voor`) | Schouder en arm | 2 | 2 | Geen eigen onderzoek gevonden. De borststudies maten wel schouderextensie, waarbij deze spieren meedoen. | Beperkt. | Reiner 2023 |
| Achterkant schouder (`schouder_achter`) | Schouder en arm | 4 | 3 | RCT's bij mensen met een stijve achterkant van de schouder: de cross-body-stretch verbeterde de binnendraai, de sleeper stretch niet significant ten opzichte van niet rekken. Aangepaste versies van beide werkten in een RCT bij honkballers. | Schouderbalans bij veel trek- en tilwerk. | McClure 2007, JSES 2016 |
| Triceps (`triceps`) | Schouder en arm | 1 | 2 | Geen onderzoek gevonden naar meer bewegingsuitslag door tricepsrekken. | Klein; de lange kop kan reiken boven het hoofd beperken. | — |
| Onderarm: pols- en vingerbuigers (`onderarm_buigers`) | Schouder en arm | 2 | 4 | Eén kleine acute studie bij klimsters (n=10): statisch polsrekken van 30 tot 240 s vergrootte het bereik. Kracht daalde in de groepen van 120 en 240 s, maar ook in de controlegroep. | Grijpen bij klimmen en bij tillen. | Kamankesh & Tadibi 2014 |
| Onderarm: polsstrekkers (`onderarm_strekkers`) | Schouder en arm | 1 | 3 | Geen studies gevonden naar meer bewegingsuitslag door het rekken van de polsstrekkers. | Tegenwicht voor veel grijpen. | — |

---

## 5. Overzicht: alle stretches met sterren

Gesorteerd per spiergroep, daarbinnen op score. 🔒 = vergrendeld door de knie-poort. Type: S = statisch, P = PNF, D = dynamisch, A = actief. Moment: O = ochtend, A = avond, O/A = beide.

| Spiergroep | Oefening | Sterren | Score | B·K·D·R·P | Type | Moment | Knie | |
|---|---|---|---|---|---|---|---|---|
| Voetzool en tenen | Voetzool zittend (DiGiovanni) (`voetzool_zittend`) | ★★★½ | 3,70 | 2·4·5·3·5 | S | O/A | 90° |  |
| Voetzool en tenen | Grote teen tegen de muur (`voetzool_muur`) | ★★★½ | 3,50 | 2·4·4·3·5 | S | O/A | 30° |  |
| Scheen | Scheen staand (wreef op de grond) (`scheen_staand`) | ★★★ | 2,90 | 1·4·3·2·5 | S | O/A | 30° |  |
| Scheen | Hielzit op de wreven (`scheen_hielzit`) | ★★ | 2,20 | 1·1·4·2·4 | S | A | 150° | 🔒 |
| Kuit: gastrocnemius | Kuit tegen de muur (gestrekte knie) (`gastroc_muur`) | ★★★★★ | 4,80 | 5·5·4·5·5 | S | O/A | 20° |  |
| Kuit: gastrocnemius | Kuit van een trede (gestrekte knie) (`gastroc_trede`) | ★★★★½ | 4,65 | 5·5·4·5·4 | S | O/A | 0° |  |
| Kuit: soleus | Soleus tegen de muur (gebogen knie) (`soleus_muur`) | ★★★★½ | 4,30 | 4·4·4·5·5 | S | O/A | 40° |  |
| Kuit: soleus | Soleus van een trede (gebogen knie) (`soleus_trede`) | ★★★★ | 4,15 | 4·4·4·5·4 | S | O/A | 30° |  |
| Kuit: soleus | Enkel-rocks tegen de muur (`enkel_rock`) | ★★★★ | 4,05 | 3·4·4·5·5 | D | O | 45° |  |
| Hamstrings | Hamstrings met band (contract-relax) (`hamstring_pnf`) | ★★★★★ | 4,85 | 5·5·5·5·4 | P | A | 0° |  |
| Hamstrings | Hamstrings staand (hiel op trede) (`hamstring_staand_trede`) | ★★★★★ | 4,80 | 5·5·4·5·5 | S | O/A | 10° |  |
| Hamstrings | Hamstrings in de deuropening (`hamstring_deurpost`) | ★★★★½ | 4,65 | 5·5·4·5·4 | S | A | 0° |  |
| Hamstrings | Zittende voorwaartse vouw (klassiek) (`hamstring_zittend_vouw`) | ★★★★½ | 4,40 | 5·5·2·5·5 | S | A | 0° |  |
| Hamstrings | Beenzwaaien voor-achter (`beenzwaai_va`) | ★★★★½ | 4,35 | 4·5·3·5·5 | D | O | 10° |  |
| Hamstrings | Gestrekte-beenheffing (actief) (`soldier_kick`) | ★★★★½ | 4,35 | 4·5·3·5·5 | A | O | 0° |  |
| Rectus femoris | Rectus femoris zijlig met band (`rf_zijlig`) | ★★★★ | 3,75 | 3·4·4·4·4 | S | A | 90° |  |
| Rectus femoris | Rectus femoris buiklig (knie 90°) (`rf_buiklig_90`) | ★★★½ | 3,55 | 3·4·3·4·4 | S | A | 90° |  |
| Rectus femoris | Couch stretch (knielend) (`couch_stretch`) | ★★ | 3,20 | 3·1·5·4·4 | S | A | 140° | 🔒 |
| Quadriceps: vasti | Quadriceps buiklig met band (Ely-houding) (`quad_buiklig_band`) | ★★ | 3,10 | 3·2·4·3·4 | S | A | 140° | 🔒 |
| Quadriceps: vasti | Hiel naar bil staand (klassiek) (`quad_hiel_bil`) | ★★ | 3,05 | 3·2·3·3·5 | S | O/A | 140° | 🔒 |
| Heupbuigers (iliopsoas) | Heupbuiger dynamisch (split-stand) (`heupbuiger_dyn`) | ★★★★½ | 4,30 | 4·4·4·5·5 | D | O | 45° |  |
| Heupbuigers (iliopsoas) | Heupbuiger statisch (split-stand) (`heupbuiger_statisch`) | ★★★★½ | 4,30 | 4·4·4·5·5 | S | O/A | 45° |  |
| Heupbuigers (iliopsoas) | Thomas-stretch aan de bedrand (`thomas_bedrand`) | ★★★★ | 4,15 | 4·4·4·5·4 | S | A | 90° |  |
| Heupbuigers (iliopsoas) | Heupbuiger halfgeknield (op dik kussen) (`heupbuiger_halfgeknield`) | ★★ | 3,85 | 4·2·5·5·4 | S | O/A | 90° | 🔒 |
| Adductoren (lies) | Spreidzit tegen de muur (liggend) (`spreidzit_muur`) | ★★★★ | 4,00 | 3·5·4·4·4 | S | A | 0° |  |
| Adductoren (lies) | Brede vlinder liggend (`vlinder_breed`) | ★★★★ | 3,75 | 3·4·4·4·4 | S | A | 80° |  |
| Adductoren (lies) | Beenzwaaien zijwaarts (`beenzwaai_zij`) | ★★★½ | 3,70 | 2·5·3·4·5 | D | O | 10° |  |
| Adductoren (lies) | Zijwaartse gewichtsverplaatsing (`lateraal_shift`) | ★★★½ | 3,40 | 2·3·4·4·5 | D | O | 60° |  |
| Adductoren (lies) | Kikker (frog) (`kikker`) | ★★ | 3,05 | 3·1·5·4·3 | S | A | 90° | 🔒 |
| Heup-buitenkant (TFL, gluteus medius, IT-band) | Been over het lichaam (ruglig) (`heup_buiten_kruis_ruglig`) | ★★★½ | 3,55 | 2·5·3·3·5 | S | A | 0° |  |
| Heup-buitenkant (TFL, gluteus medius, IT-band) | Heup-buitenkant staand, armen omhoog (`heup_buiten_overhead`) | ★★★½ | 3,55 | 2·5·3·3·5 | S | O/A | 10° |  |
| Heup-buitenkant (TFL, gluteus medius, IT-band) | Zijlig aan de bedrand (Ober-houding) (`heup_buiten_bedrand`) | ★★★½ | 3,40 | 2·5·3·3·4 | S | A | 0° |  |
| Gluteus maximus | Knie naar borst, onderbeen omhoog (`knie_naar_borst_90`) | ★★★½ | 3,30 | 2·4·3·3·5 | S | A | 90° |  |
| Gluteus maximus | Knie naar borst (klassiek, handen op scheen) (`knie_naar_borst_klassiek`) | ★★ | 2,80 | 2·2·3·3·5 | S | A | 140° | 🔒 |
| Diepe heupdraaiers (piriformis) | Figuur-4 op een stoel (`figuur4_stoel`) | ★★★½ | 3,65 | 2·4·4·4·5 | S | O/A | 90° |  |
| Diepe heupdraaiers (piriformis) | Piriformis diagonaal (knie naar andere schouder) (`piriformis_diagonaal`) | ★★★½ | 3,60 | 2·3·5·4·5 | S | A | 90° |  |
| Diepe heupdraaiers (piriformis) | Figuur-4 met voet tegen de muur (`figuur4_muur`) | ★★★½ | 3,50 | 2·4·4·4·4 | S | A | 90° |  |
| Diepe heupdraaiers (piriformis) | Heupcirkels staand (CARs) (`heup_car`) | ★★★ | 3,20 | 1·4·3·4·5 | A | O | 90° |  |
| Diepe heupdraaiers (piriformis) | Poort open (gate opener) (`gate_opener`) | ★★★ | 3,20 | 1·4·3·4·5 | A | O | 90° |  |
| Diepe heupdraaiers (piriformis) | 90/90-zit (`negentig_negentig`) | ★★ | 3,00 | 2·2·4·4·4 | S | A | 90° | 🔒 |
| Diepe heupdraaiers (piriformis) | Duif (pigeon) (`duif`) | ★★ | 2,75 | 2·1·4·4·4 | S | A | 90° | 🔒 |
| Onderrug | Rugdraai liggend (knieën opzij) (`rug_rotatie_ruglig`) | ★★★½ | 3,55 | 2·5·3·3·5 | S | A | 90° |  |
| Onderrug | Voorover hangen op een stoel (`voorover_hangen_stoel`) | ★★★½ | 3,55 | 2·5·3·3·5 | S | A | 90° |  |
| Onderrug | Kat-koe staand (`kat_koe_staand`) | ★★★ | 3,05 | 1·4·3·3·5 | D | O/A | 30° |  |
| Zijkant romp | Banaan (liggende zijbuiging) (`banaan_ruglig`) | ★★★½ | 3,40 | 2·5·3·2·5 | S | A | 0° |  |
| Zijkant romp | Zijwaartse rek aan de deurpost (`zijbuiging_deurpost`) | ★★★½ | 3,40 | 2·5·3·2·5 | S | O/A | 0° |  |
| Buik (extensie) | Staande achteroverbuiging (herhaald) (`staande_extensie`) | ★★★½ | 3,65 | 3·5·3·2·5 | D | O/A | 0° |  |
| Buik (extensie) | Sfinx (`sfinx`) | ★★★½ | 3,25 | 3·4·3·2·4 | S | A | 0° |  |
| Borstwervels (thoracaal) | Borstwervels over een handdoekrol (`thoracaal_handdoekrol`) | ★★★½ | 3,55 | 2·5·3·4·4 | S | A | 90° |  |
| Borstwervels (thoracaal) | Borstwervels draaien aan het aanrecht (`thor_rot_staand`) | ★★★½ | 3,45 | 1·5·3·4·5 | D | O | 20° |  |
| Borstwervels (thoracaal) | Muurslides (W naar Y) (`muurslide`) | ★★★½ | 3,45 | 1·5·3·4·5 | D | O | 20° |  |
| Borstwervels (thoracaal) | Open boek (zijlig) (`open_boek`) | ★★★½ | 3,25 | 1·4·4·4·4 | D | A | 90° |  |
| Nek | Nek: neus naar oksel (`nek_levator`) | ★★★★ | 3,85 | 3·5·4·2·5 | S | O/A | 0° |  |
| Nek | Nek: oor naar schouder (`nek_trapezius`) | ★★★★ | 3,85 | 3·5·4·2·5 | S | O/A | 0° |  |
| Latissimus dorsi | Lat aan de deurpost (`lat_deurpost`) | ★★★★ | 3,90 | 2·5·4·4·5 | S | O/A | 20° |  |
| Latissimus dorsi | Lats aan het aanrecht (heupscharnier) (`lat_aanrecht`) | ★★★½ | 3,70 | 2·5·3·4·5 | S | O/A | 20° |  |
| Latissimus dorsi | Kinderhouding met gestrekte armen (`kinderhouding`) | ★★ | 2,55 | 2·1·3·4·4 | S | A | 150° | 🔒 |
| Borst (grote en kleine borstspier) | Borst in de deuropening (één arm) (`borst_deurpost`) | ★★★★½ | 4,45 | 4·5·5·3·5 | S | O/A | 0° |  |
| Borst (grote en kleine borstspier) | Borst in een hoek (beide armen) (`borst_hoek`) | ★★★★ | 4,10 | 4·5·4·3·4 | S | O/A | 0° |  |
| Borst (grote en kleine borstspier) | Borst open op een handdoekrol (`borst_ruglig_handdoek`) | ★★★★ | 3,90 | 4·5·3·3·4 | S | A | 90° |  |
| Voorkant schouder en biceps | Handen achter de rug (`handen_achter_rug`) | ★★★½ | 3,40 | 2·5·3·2·5 | S | O/A | 0° |  |
| Voorkant schouder en biceps | Voorkant schouder tegen de muur (`schouder_voor_muur`) | ★★★½ | 3,40 | 2·5·3·2·5 | S | O/A | 0° |  |
| Achterkant schouder | Arm over de borst (cross-body) (`cross_body`) | ★★★★ | 4,05 | 4·5·3·3·5 | S | O/A | 0° |  |
| Achterkant schouder | Sleeper stretch (aangepast) (`sleeper_aangepast`) | ★★★★ | 3,85 | 3·5·4·3·4 | S | A | 90° |  |
| Triceps | Triceps boven het hoofd (`triceps_overhead`) | ★★★½ | 3,35 | 1·5·4·2·5 | S | O/A | 0° |  |
| Triceps | Triceps tegen de deurpost (`triceps_deurpost`) | ★★★½ | 3,35 | 1·5·4·2·5 | S | O/A | 0° |  |
| Onderarm: pols- en vingerbuigers | Polsbuigers tegen de muur (`polsbuigers_muur`) | ★★★★ | 3,90 | 2·5·4·4·5 | S | O/A | 0° |  |
| Onderarm: pols- en vingerbuigers | Gebedshouding (`gebedshouding`) | ★★★½ | 3,70 | 2·5·3·4·5 | S | O/A | 0° |  |
| Onderarm: polsstrekkers | Polsstrekkers met gestrekte arm (`polsstrekkers`) | ★★★½ | 3,50 | 1·5·4·3·5 | S | O/A | 0° |  |
| Onderarm: polsstrekkers | Omgekeerde gebedshouding (`omgekeerde_gebed`) | ★★★½ | 3,30 | 1·5·3·3·5 | S | O/A | 0° |  |

---

## 6. Functionele specificatie

### 6.1 Bibliotheek

- Lijst gegroepeerd per regio en spiergroep (volgorde zoals §4), te sorteren op score, naam, R of tijd.
- Filters: spiergroep (meerdere), moment (ochtend, avond, beide), positie (staand, stoel, vloer, liggend), materiaal (meerdere, plus "geen materiaal"), minimum aantal sterren, type (statisch, PNF, dynamisch, actief), "alleen K ≥ 4" (standaard uit), "toon vergrendelde" (standaard aan).
- Zoeken op naam.
- Rij: lichaamskaart-miniatuur, naam, sterren met score, spiergroep, kniebadge (max graden) en een slot-icoon als de oefening vergrendeld is.

### 6.2 Oefeningkaart

Van boven naar beneden:

1. Naam, sterren (SVG, halve sterren mogelijk), score met twee decimalen, bewijslabel in woorden (B5 sterk, B4 matig, B3 beperkt, B2 zwak, B1 geen), moment.
2. Vijf horizontale balkjes B, K, D, R, P (1–5). Tik op een balkje toont de rubriek uit §3.1.
3. Voordelen (groen vinkje) en nadelen (oranje kruis), letterlijk uit de data.
4. Knie: maximale kniebuiging, kniebelasting en de PFPS-notitie. Bij een vergrendelde oefening een rode balk "Vergrendeld door de knie-poort" met de knop "Ontgrendelen via 48-uurstest" (§6.6).
5. Uitvoering: cues, ademcue (afgeleid van het type, zie hieronder), standaarddosis, regressie en progressie.
6. Doelspieren op de lichaamskaart: primaire groep vol gekleurd, bijbetrokken groep half.
7. Bronnen (uitklapbaar): de bronnen van de oefening plus het groepsbewijs uit §4.
8. Knoppen: "Toevoegen aan routine" en "Probeer nu" (speelt alleen deze oefening af).

Ademcue per type:
- statisch: "4 tellen in door je neus, 6 tellen uit; zak bij elke uitademing een fractie verder."
- PNF: "Span 5 s aan op 20–30% en adem door; adem uit bij het loslaten en zak verder."
- dynamisch en actief: "Adem rustig door in het ritme van de beweging."

Illustraties, fase 1: één lichaamskaart (`img/body.svg`, voor- en achteraanzicht) met 24 regio's waarvan het `id` gelijk is aan het groeps-id, plus vier positie-iconen (staand, stoel, vloer, liggend). Fase 2, optioneel: eigen eenvoudige stokfiguren per oefening (`img/ex/<id>.svg`); tot die er zijn, valt de app terug op lichaamskaart plus positie-icoon.

### 6.3 Routinebouwer

**Datamodel**

```
Routine = {
  id, name,
  slot: 'ochtend' | 'avond' | 'vrij',
  preRun: boolean,              // "vóór een run"
  timesPerWeek: 1–14,
  active: boolean,              // telt mee in de weekdosis
  steps: Step[],
  fromTemplate?: 'O5'|'O10'|'O15'|'A5'|'A10'|'A15',
  createdAt, updatedAt
}
Step = {
  exerciseId,
  perSideSec?   // unilateraal
  durationSec?  // bilateraal of afwisselend
  pnf?: { rounds, contractSec, stretchSec },
  reps?,
  transitionAfterSec?,          // anders automatisch, zie hieronder
  extraWeakSide?: 'L' | 'R' | null
}
```

**Scherm**

- Kop: naam, moment, schakelaar "Vóór een run", stappenteller "keer per week", en de **totale tijd live** (mm:ss) met een balk tot 15:00. Boven 15:00 kleurt de balk oranje (W4).
- Stappenlijst: sleepgreep, naam, sterren, dosischip (tik om te bewerken), kniebadge, verwijderen.
- "+ Oefening" opent de bibliotheek als sheet; filters blijven bewaard. Een vergrendelde oefening kun je niet toevoegen; een tik opent §6.6.
- Dosis bewerken: unilateraal in seconden per kant, bilateraal en afwisselend in totale seconden, PNF als rondes × (aanspannen + rekken). Stappen van 5 s, minimaal 10 s, maximaal 180 s. Bij een nieuwe stap wordt `defaultDose` uit de bibliotheek gebruikt.
- "Extra set zwakke kant" per unilaterale stap: L, R of uit. Voegt na de normale kanten één extra werkblok toe aan die kant.
- Overgangstijd automatisch: hoog = staand of stoel, laag = vloer of liggend. Hoog→hoog 5 s, laag→laag 10 s, hoog↔laag 15 s. Per stap aan te passen. De laatste stap heeft geen overgang.
- Onderaan: de actieve waarschuwingen (§6.5) en "Dosis van deze routine": seconden per spiergroep per kant, × keer per week.
- Opslaan, Start, Dupliceren, Verwijderen. De sjablonen O5 tot en met A15 zijn alleen-lezen met de knop "Kopiëren en aanpassen".

### 6.4 Dosismeter en weekplanning

#### 6.4.1 Berekening

```
function weekdosis(routines, lib):                   // gepland
  dosis = {}                                         // groep -> { L, R, dyn }
  voor elke routine r met r.active:
    f = r.timesPerWeek
    voor elke stap s in r.steps:
      ex  = lib[s.exerciseId]
      sec = secondenPerKant(s, ex)                   // { L, R }
      voor elk doel t in ex.targets:                 // t.weight is 1 of 0,5
        als ex.type in ('static', 'pnf'):
          dosis[t.group].L += sec.L × t.weight × f
          dosis[t.group].R += sec.R × t.weight × f
        anders:
          dosis[t.group].dyn += (sec.L + sec.R) / 2 × t.weight × f
  return dosis

function secondenPerKant(s, ex):
  basis = s.pnf ? s.pnf.rounds × (s.pnf.contractSec + s.pnf.stretchSec)
                : (s.perSideSec ?? s.durationSec)
  unilateraal:  L = R = basis; met extraWeakSide: + basis voor die kant
  bilateraal:   L = R = basis                        // beide kanten tegelijk
  afwisselend:  L = R = basis / 2
```

De **werkelijke** dosis wordt op dezelfde manier berekend uit de gelogde werkblokken (`segmentsDone`) van de afgelopen 7 × 24 uur (rollend venster).

#### 6.4.2 Weergave ("Mijn week")

- Per spiergroep een balk met de laagste van L en R (tik toont L en R apart), met markeringen bij 300 en 600 s.
- Kleuren: grijs = 0, oranje = onder 300, groen = 300–600, blauw = boven 600 ("plateau").
- Twee lagen: gepland (alle actieve routines × keer per week) en werkelijk (log, laatste 7 dagen).
- Dynamische en actieve seconden staan er klein onder als "dynamisch", zonder kleur.
- Suggestie bij een groep onder 300 s: "Nodig: X s per kant per sessie bij f× per week", met X = ⌈(300 − gepland) / f⌉, in stappen van 5 s.
- Na 12 weken (of zodra een spiergroep 4 weken op rij groen is): tip "Onderhoud: ~5 min per week per spiergroep houdt je winst vast" (Konrad 2025).

#### 6.4.3 Herberekende pakketten (dagelijks, 7× per week)

Seconden per week per kant, alleen statisch en PNF; bijbetrokken groepen voor 50%. ✓ = 300 tot en met 600, ↑ = boven 600, ⚠ = onder 300, – = 0.

| Spiergroep | MINIMAAL (O5 + A5) | STANDAARD (O10 + A10) | MAXIMAAL (O15 + A15) |
|---|---|---|---|
| Kuit: gastrocnemius | 315 ✓ | 315 ✓ | 525 ✓ |
| Kuit: soleus | 157,5 ⚠ (+210 dyn.) | 367,5 ✓ (+210 dyn.) | 787,5 ↑ (+210 dyn.) |
| Hamstrings | 262,5 ⚠ (+175 dyn.) | 630 ↑ (+175 dyn.) | 630 ↑ (+385 dyn.) |
| Rectus femoris | 315 ✓ | 315 ✓ | 315 ✓ |
| Heupbuigers (iliopsoas) | 157,5 ⚠ (+297,5 dyn.) | 157,5 ⚠ (+297,5 dyn.) | 157,5 ⚠ (+297,5 dyn.) |
| Adductoren (lies) | 525 ✓ (+175 dyn.) | 420 ✓ (+525 dyn.) | 840 ↑ (+647,5 dyn.) |
| Heup-buitenkant (TFL, gluteus medius, IT-band) | 0 – (+87,5 dyn.) | 0 – (+87,5 dyn.) | 0 – (+87,5 dyn.) |
| Gluteus maximus | – | 157,5 ⚠ | 157,5 ⚠ |
| Diepe heupdraaiers (piriformis) | – | 315 ✓ (+280 dyn.) | 315 ✓ (+525 dyn.) |
| Zijkant romp | – | – | 262,5 ⚠ |
| Borstwervels (thoracaal) | 0 – (+280 dyn.) | 0 – (+805 dyn.) | 0 – (+805 dyn.) |
| Latissimus dorsi | 0 – (+140 dyn.) | 0 – (+140 dyn.) | 525 ✓ (+140 dyn.) |
| Borst (grote en kleine borstspier) | – | 0 – (+140 dyn.) | 0 – (+140 dyn.) |

Niet in de sjablonen (0 s): Voetzool en tenen, Scheen, Quadriceps: vasti, Onderrug, Buik (extensie), Nek, Voorkant schouder en biceps, Achterkant schouder, Triceps, Onderarm: pols- en vingerbuigers, Onderarm: polsstrekkers. Die voeg je zelf toe via de bouwer.

### 6.5 Waarschuwingen

| Code | Ernst | Wanneer | Tekst in de app |
|---|---|---|---|
| W1 | blokkeert | Oefening vergrendeld (§6.6) | "Vergrendeld door de knie-poort. Ontgrendelen kan via de 48-uurstest." |
| W2 | oranje | Routine `slot = 'ochtend'` en oefening `morningLumbarFlexion = true` | "Bevat rugbuiging. Vlak na het opstaan zijn je tussenwervelschijven het gevoeligst voor buigen. Zet hem in je avondroutine of houd de beweging klein." |
| W3 | oranje | Routine `preRun = true` en per spiergroep (alleen gewicht-1-doelen) ≥60 s statisch of PNF per kant in deze routine | "60 s of meer statisch rekken per spiergroep vlak voor een run kan je prestatie direct daarna met ~4–5% verlagen. Houd het korter of verplaats het naar de avond." |
| W4 | info | Totale tijd > 900 s | "Langer dan je eigen grens van 15 minuten." |
| W5 | info | Geplande weekdosis van een spiergroep > 600 s per kant | "Boven ~10 minuten per week levert waarschijnlijk niets extra op. Verschuif tijd naar een andere spiergroep." |
| W6 | info | Spiergroep is primair doel (gewicht 1) in een actieve routine, met minstens één statische of PNF-oefening, maar haalt < 300 s per kant per week | "Onder de drempel van 5 minuten per week. Zie de suggestie bij 'Mijn week'." |
| W7 | info | Spiergroep is primair doel in een actieve routine, maar alleen via dynamische of actieve oefeningen (vervangt dan W6) | "Dynamisch telt niet mee voor de drempel; voor blijvende winst is statisch of PNF effectiever." |
| W8 | blokkeert | Opvlammingsmodus actief en `kneeFlexionMaxDeg > 45` | "Tijdelijk uit tijdens een opvlamming." |
| W9 | oranje | Oefening in de status `test` of `voorlopig` (§6.6) die minder dan 48 uur na de vorige blootstelling opnieuw in een gestarte routine zit | "Deze oefening is nog in de proefperiode: maximaal één keer per 48 uur." |

W1 en W8 voorkomen toevoegen en afspelen. De andere waarschuwingen informeren alleen; de gebruiker beslist.

### 6.6 Knieslot en 48-uurstest

Vergrendelde oefeningen (`locked: true`, K ≤ 2) zijn zichtbaar maar niet bruikbaar, tot ze via dit protocol vrijkomen. Het protocol volgt je eigen regels: pijn ≤2/10 tijdens en na, niet hoger dan je beginwaarde na 24 en 48 uur, en drie schone 48-uurscontroles op rij voordat de oefening echt vrij is. Je knie reageert pas na 24–48 uur, dus het gevoel tijdens de sessie telt niet als groen licht.

**Statussen per oefening:** `vergrendeld` → `test` → `voorlopig` → `vrij`.

| Overgang | Voorwaarde |
|---|---|
| vergrendeld → test | Geen opvlammingsmodus; geen afkoelperiode actief; geen andere oefening in `test` of `voorlopig`; de gebruiker bevestigt: (1) kniepijn de afgelopen 7 dagen steeds ≤2/10, (2) vandaag geen loop- of beentraining, (3) de komende 48 uur geen afdaalsessie of zware beentraining gepland. |
| test (sessie) | Begeleide proef: 1 × 30 s per kant op intensiteit 3–4/10, op een dik kussen als je knielt. Vooraf: kniepijn nu (beginwaarde). Direct na: kniepijn tijdens. |
| test → voorlopig | Schone cyclus: pijn tijdens ≤2, na 24 u ≤2 én ≤ beginwaarde, na 48 u ≤2 én ≤ beginwaarde. Teller schone cycli = 1. |
| voorlopig → vrij | Na elke blootstelling in een routine volgt weer een cyclus van 24 en 48 uur; maximaal één blootstelling per 48 uur (W9). Bij 3 schone cycli op rij (de test meegeteld): `vrij`. |
| test of voorlopig → vergrendeld | Een cyclus is niet schoon. Afkoelperiode van 7 dagen. Als een waarde boven 2/10 lag: voorstel om de opvlammingsmodus aan te zetten. |
| elke status → vergrendeld | Opvlammingsmodus gaat aan. Na het einde van de opvlamming begint de oefening opnieuw bij `vergrendeld`. |

**Herinneringen:** de 24- en 48-uurschecks verschijnen als kaart op het startscherm vanaf het moment dat ze opeisbaar zijn (venster 20–30 uur en 44–56 uur na de blootstelling). Een niet-ingevulde check telt niet als schoon; de cyclus vervalt en de teller blijft staan.

### 6.7 Opvlammingsmodus

- **Aan:** automatisch bij een kniecheck (dagelijks, 24 of 48 uur) boven 2/10, of handmatig ("Ik heb een opvlamming").
- **Effect:** banner op het startscherm; alle oefeningen met `kneeFlexionMaxDeg > 45` zijn geblokkeerd in bouwer en speler (W8); elke oefening in `test`, `voorlopig` of `vrij` gaat naar `vergrendeld`; voorgestelde routines: O5 en A5 zonder "Rectus femoris zijlig met band" (die blijven automatisch over, omdat de rest van die twee sjablonen ≤45° is).
- **Uit:** na 7 opeenvolgende dagelijkse kniechecks ≤2/10 stelt de app voor de modus te beëindigen; de gebruiker bevestigt. Dagen zonder check tellen niet.

**Dagelijkse kniecheck:** één kaart per dag op het startscherm, bij de eerste keer openen na 04:00: "Kniepijn nu (0–10)". Dit vervangt de vraag "kniepijn 24 uur na gisteren" uit v1.

### 6.8 Speler

#### 6.8.1 Timeline

Compileer een routine vooraf tot een lijst segmenten. De totale tijd in de bouwer is de som van precies deze lijst.

```
segmenten = [ prep 5 s ]
voor stap i in routine.steps:
  ex = lib[stap.exerciseId]
  als stap.pnf:
    kanten = unilateraal ? [L, R] : [–]
    voor elke kant (met 'switch' 5 s ertussen):
      herhaal stap.pnf.rounds keer: contract (contractSec), relax (stretchSec)
  anders als ex.sided == unilateraal:
    work L (perSideSec), switch 5 s, work R (perSideSec)
    als extraWeakSide: switch 5 s, work [zwakke kant] (perSideSec)
  anders:                                   // bilateraal of afwisselend
    work – (durationSec)
  als i niet de laatste is: transition (transitionAfterSec of automatisch, §6.3)
totaal = som van alle segmentduren
```

De kantwisselduur komt uit de instellingen (standaard 5 s). De voorbereiding duurt altijd 5 s.

#### 6.8.2 Timer

De engine bewaart alleen `segmentIndex`, `segmentStartedAt` en `pausedRemainingMs`, en rekent de resterende tijd bij elk animatieframe uit tijdstempels (`performance.now()`). Nooit tellen met `setInterval`.

```
IDLE --start (gebruikersgebaar)--> PREP (5 s) --> RUNNING
RUNNING: work / contract / relax --tijd op--> volgend segment
  switch: "Wissel van kant"   transition: "Volgende: <naam>"
RUNNING --pauze--> PAUSED --hervat--> RUNNING   (segmentStartedAt = nu − verstreken)
RUNNING --volgende--> volgende oefening   --terug--> begin huidige oefening
RUNNING --scherm verborgen en auto-pauze--> PAUSED
RUNNING --laatste segment klaar--> DONE --> LOG (voltooid; intensiteit, kniepijn tijdens)
elke status --stop--> BEVESTIG --> LOG (gedeeltelijk of afgebroken)
```

**Cues:** spraak bij elk werkblok ("Linkerkant. Kuit tegen de muur. 45 seconden."), een zachte piep halverwege, piepjes bij 3-2-1. Bij PNF: "Aanspannen…" en "Loslaten, zak verder". Op Android een korte trilling bij een kantwissel en aan het eind. Bij elke kantwissel ook een visuele flits, zodat alles zonder geluid werkt.

### 6.9 Logboek, kniechecks en export

- **Sessie:** `{ id, routineId, routineName, slot, startedAt, endedAt, tz, plannedSec, activeSec, status: 'voltooid'|'gedeeltelijk'|'afgebroken', segmentsDone: [{ exerciseId, side, kind, sec }], stretchIntensity, kneePainDuring, notes }`. Tijden in ISO-formaat met tijdzone.
- **Kniecheck:** `{ id, at, pain, context: 'dagelijks'|'test'|'24u'|'48u', exerciseId? }`.
- **Export:** volledige JSON-dump met `schemaVersion`, plus drie CSV-bestanden met puntkomma als scheidingsteken en UTF-8 met BOM:
  - `sessies.csv`: `datum;tijd;tijdzone;moment;routineId;routineNaam;status;geplandSec;actiefSec;intensiteit;kniepijnTijdens;notities`
  - `kniechecks.csv`: `datum;tijd;pijn;context;oefeningId`
  - `dosis_per_week.csv`: `weekStart;spiergroep;secL;secR;secDynamisch`
- **Import** van een JSON-dump herstelt alles. Elke 14 dagen een herinnering om te exporteren.
- Zo kun je sessies naast je Zepp-HRV-data leggen.

### 6.10 Zelftests

Ongewijzigd ten opzichte van v1, met de rugkraktest erbij. Per test: drie pogingen per kant, het gemiddelde wordt automatisch berekend, met een SVG-lijngrafiek met een band voor je meetfout.

- **Meetprotocol:** altijd op hetzelfde tijdstip, bij voorkeur 's avonds vóór de routine. Na 5 minuten lopen: één oefenpoging, daarna drie metingen.
- **Nulmeting op twee opeenvolgende dagen.** Het verschil is je persoonlijke meetfout. Een verandering van meer dan 1,5 × die meetfout (of de MDC uit de literatuur als die er is) telt als echt.
- **Hertest** in week 4, 8 en 12, daarna elke 8 weken.
- **Prioriteit:** een verschil tussen links en rechts groter dan de meetfout markeert die spiergroepen in de bibliotheek met "aandacht".

De tests staan in `library.json` onder `tests`.

### 6.11 Instellingen

Geluid in stille modus (aan), mixen met muziek (uit), spraak (aan) met stemkeuze, piepvolume, auto-pauze bij een verborgen scherm (aan), nachtmodus, kantwisselduur (5 s), standaard statische houdtijd (45 s), vergrendelde oefeningen tonen (aan), **weging aanpassen** (B, K, D, R, P; som altijd 100%, met de knop "terug naar standaard 25/25/20/15/15"; herberekent sterren alleen voor de weergave, de knie-poort blijft altijd gelden), herinneringen via `.ics`, opvlammingsmodus handmatig, ontgrendelingen resetten, opslagstatus (`navigator.storage.persisted()`), laatste export, import.

### 6.12 Scherm "Over"

- Geen medisch advies.
- Rekken vergroot je beweeglijkheid. Het voorkomt geen blessures; krachttraining doet dat wel (Lauersen 2014).
- De kniescores zijn voorzorg, geen bewezen schade.
- Bij aanhoudende of terugkerende kniepijn: laat een sportfysiotherapeut de posities beoordelen.
- De uitleg van de sterren (§3) en het bewijs per spiergroep (§4).

---

## 7. Platform: iOS en Android

Geverifieerd in oktober 2026 (uit v1). Controleer dit bij elke grote iOS-update.

| Functie | iPhone (Safari, beginscherm-webapp) | Android (Chrome) | Implementatie |
|---|---|---|---|
| Trillen (`navigator.vibrate`) | Niet ondersteund | Ondersteund | `'vibrate' in navigator` controleren; op iOS alleen geluid, spraak en visuele flits |
| Scherm aan (Screen Wake Lock) | In Safari-tabs vanaf 16.4; in beginscherm-webapps pas vanaf iOS 18.4 | Ondersteund | `navigator.wakeLock.request('screen')` bij de start, in try/catch; opnieuw aanvragen bij `visibilitychange` → zichtbaar; anders een banner "Zet automatisch vergrendelen tijdelijk uit" |
| Geluid ondanks stille modus | Web Audio is standaard "ambient" en de stille schakelaar dempt het; vanaf iOS 17 maakt `navigator.audioSession.type = 'playback'` het hoorbaar, maar pauzeert andere audio | n.v.t. | Instelling "Geluid ook in stille modus" (standaard aan): zet `playback` vóór het aanmaken van de AudioContext, bij de eerste tik. "Mixen met muziek" zet `'ambient'` |
| Audio ontgrendelen | AudioContext start alleen na een gebruikersgebaar | Idem (autoplaybeleid) | AudioContext aanmaken en `resume()` in de click-handler van Start; piepjes met een `OscillatorNode` |
| Nederlandse stem (`speechSynthesis`) | Beschikbaarheid van nl-NL niet geverifieerd per toestel | Idem | Eerste stem met `lang.startsWith('nl')`; luister naar `voiceschanged`; eerste `speak()` binnen een gebruikersgebaar; geen NL-stem → alleen piepjes plus een melding |
| Timer bij vergrendeld scherm | JS en Web Audio worden gepauzeerd of afgeremd | Timers worden afgeremd | Tijd altijd uit tijdstempels; standaard auto-pauze bij `visibilitychange` → verborgen; met "doorlopen op de achtergrond" bij terugkomst naar het juiste segment springen (aanname, testen) |
| Herinneringen | Web Push alleen voor beginscherm-webapps vanaf iOS 16.4, en altijd met een pushserver | Ook met een pushserver | Geen push (er is geen backend). Knop "Herinnering in agenda" maakt een `.ics` met dagelijkse herhaling en `VALARM` |
| Opslag | Safari wist script-opslag na 7 dagen gebruik zonder bezoek aan de site; een beginscherm-webapp heeft een eigen teller op basis van echt gebruik. `navigator.storage.persist()` bestaat sinds Safari 17 en wordt vooral toegekend aan beginscherm-webapps. De opslag van de geïnstalleerde app staat los van die in de Safari-tab | `persist()` beschermt tegen wissen bij opslagdruk | Eerst installeren, dan gebruiken. `persist()` aanvragen na de eerste opgeslagen sessie en de status tonen. Exportherinnering elke 14 dagen plus JSON-import |
| Installeren | Safari → Deel → "Zet op beginscherm". Vanaf iOS 26 opent elke toegevoegde site standaard als webapp; op iOS 16.4–18 moet het manifest `display: standalone` hebben | Chrome-menu → "App installeren", of `beforeinstallprompt` | Installatiescherm per platform; standalone herkennen via `matchMedia('(display-mode: standalone)')` en `navigator.standalone` |
| Hosting | Service worker vraagt HTTPS | Idem | GitHub Pages, Cloudflare Pages of Netlify; `sw.js` in de root |

---

## 8. Architectuur

### 8.1 Bestanden

```
/ (statisch, HTTPS)
├── index.html                 # <html lang="nl">, app shell
├── manifest.webmanifest       # start_url "./", scope "./", display "standalone", lang "nl", donker thema, iconen 192/512 + maskable
├── sw.js                      # precache van shell, data en SVG's; cache-first; versie in de cachenaam; "Update beschikbaar → herladen"
├── icons/                     # 192, 512, maskable-512, apple-touch-icon-180
├── css/app.css                # donker thema, nachtmodus (alleen rood/amber), grote raakvlakken
├── data/library.json          # §10, letterlijk
├── img/body.svg               # lichaamskaart voor/achter, 24 regio's (id = groeps-id)
├── img/pos/*.svg              # staand, stoel, vloer, liggend
└── js/
    ├── main.js                # hash-router, opstarten, persist-aanvraag
    ├── store.js               # IndexedDB-wrapper, export en import
    ├── library.js             # laden, valideren (§9.2), sterren bij eigen weging
    ├── timeline.js            # compileRoutine() en totale tijd (§6.8.1)
    ├── engine.js              # timer-state machine (§6.8.2)
    ├── audio.js               # piepjes, spraak, audioSession
    ├── wakelock.js
    ├── dose.js                # weekdosis gepland en werkelijk (§6.4)
    ├── warnings.js            # W1–W9 (§6.5)
    ├── knee.js                # kniecheck, ontgrendelprotocol, opvlammingsmodus (§6.6–6.7)
    ├── charts.js              # SVG-lijngrafiek en dosisbalken
    ├── ics.js                 # agenda-herinneringen
    └── ui/                    # home, library, exercise, builder, week, player, log, tests, settings, about, install
```

### 8.2 IndexedDB

| Store | Sleutel | Inhoud |
|---|---|---|
| `routines` | id | Eigen routines (§6.3). Sjablonen komen uit `library.json` |
| `sessions` | id | §6.9 |
| `kneeChecks` | id | §6.9 |
| `unlocks` | exerciseId | `{ state, cleanCount, cooldownUntil, cycles: [{ exposureAt, painBefore, painDuring, p24, p48, result }] }` |
| `tests` | id | `{ date, testId, side, trials[], mean, unit }` |
| `flare` | 'state' | `{ active, since, exitProposedAt }` |
| `settings` | 'settings' | §6.11 |

### 8.3 Toegankelijkheid en gebruik in het donker

- Donker thema standaard (#000/#111, contrast ≥ 4,5:1); nachtmodus met alleen rood en amber.
- Raakvlakken ≥ 56 × 56 px; primaire knoppen ≥ 64 px in het onderste derde van het scherm.
- Timercijfers ≥ 96 px met `font-variant-numeric: tabular-nums`; tekst schaalt mee (rem).
- `aria-live="polite"` voor oefening en kant; `prefers-reduced-motion` respecteren.
- Geen witte flits bij het laden in nachtmodus.

---

## 9. JSON-schema v2 en validatie

### 9.1 Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "rekapp-library-v2",
  "title": "Rekapp bibliotheek v2",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "meta",
    "groups",
    "exercises",
    "routines",
    "tests",
    "sources"
  ],
  "properties": {
    "schemaVersion": {
      "const": "2.0"
    },
    "meta": {
      "$ref": "#/$defs/meta"
    },
    "groups": {
      "type": "array",
      "minItems": 24,
      "maxItems": 24,
      "items": {
        "$ref": "#/$defs/group"
      }
    },
    "exercises": {
      "type": "array",
      "minItems": 1,
      "items": {
        "$ref": "#/$defs/exercise"
      }
    },
    "routines": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/routine"
      }
    },
    "tests": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/test"
      }
    },
    "sources": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/source"
      }
    }
  },
  "$defs": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9_]+$"
    },
    "score15": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5
    },
    "meta": {
      "type": "object",
      "required": [
        "generated",
        "language",
        "scoring",
        "dose",
        "knee",
        "timing"
      ],
      "properties": {
        "generated": {
          "type": "string"
        },
        "language": {
          "const": "nl"
        },
        "scoring": {
          "type": "object",
          "required": [
            "weights",
            "rounding",
            "kneeGate",
            "techniquePenalty",
            "evidenceLabels"
          ],
          "properties": {
            "weights": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "B",
                "K",
                "D",
                "R",
                "P"
              ],
              "properties": {
                "B": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1
                },
                "K": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1
                },
                "D": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1
                },
                "R": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1
                },
                "P": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1
                }
              }
            },
            "rounding": {
              "const": "half_up_to_0.5"
            },
            "kneeGate": {
              "type": "object",
              "required": [
                "maxK",
                "maxStars"
              ]
            },
            "techniquePenalty": {
              "type": "object",
              "required": [
                "dynamic",
                "active"
              ]
            },
            "evidenceLabels": {
              "type": "object"
            }
          }
        },
        "dose": {
          "type": "object",
          "required": [
            "thresholdSec",
            "plateauSec",
            "secondaryWeight",
            "countedTypes",
            "windowHours"
          ]
        },
        "knee": {
          "type": "object",
          "required": [
            "maxDegUnlocked",
            "flareMaxDeg",
            "painMax",
            "cleanCyclesToUnlock",
            "cooldownDays",
            "flareExitDays",
            "exposureSpacingHours",
            "checkWindowsHours"
          ]
        },
        "timing": {
          "type": "object",
          "required": [
            "prepSec",
            "sideSwitchSec",
            "transitionSec",
            "positionClass"
          ]
        }
      }
    },
    "group": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "label",
        "region",
        "bBase",
        "rBase",
        "evidence",
        "relevance",
        "sources"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/id"
        },
        "label": {
          "type": "string"
        },
        "region": {
          "enum": [
            "Voet en onderbeen",
            "Heup en bovenbeen",
            "Romp en nek",
            "Schouder en arm"
          ]
        },
        "bBase": {
          "$ref": "#/$defs/score15"
        },
        "rBase": {
          "$ref": "#/$defs/score15"
        },
        "evidence": {
          "type": "string"
        },
        "relevance": {
          "type": "string"
        },
        "note": {
          "type": "string"
        },
        "sources": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    },
    "dose": {
      "type": "object",
      "additionalProperties": false,
      "minProperties": 1,
      "properties": {
        "perSideSec": {
          "type": "integer",
          "minimum": 10,
          "maximum": 180
        },
        "durationSec": {
          "type": "integer",
          "minimum": 10,
          "maximum": 180
        },
        "reps": {
          "type": "integer",
          "minimum": 1
        },
        "pnf": {
          "$ref": "#/$defs/pnf"
        }
      }
    },
    "pnf": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "rounds",
        "contractSec",
        "stretchSec"
      ],
      "properties": {
        "rounds": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5
        },
        "contractSec": {
          "type": "integer",
          "minimum": 3,
          "maximum": 10
        },
        "stretchSec": {
          "type": "integer",
          "minimum": 10,
          "maximum": 60
        }
      }
    },
    "exercise": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name",
        "targets",
        "type",
        "sided",
        "slot",
        "position",
        "equipment",
        "kneeFlexionMaxDeg",
        "kneeLoad",
        "morningLumbarFlexion",
        "scores",
        "score",
        "stars",
        "locked",
        "evidenceLevel",
        "cues",
        "pros",
        "cons",
        "pfpsNote",
        "regression",
        "progression",
        "defaultDose",
        "sources",
        "svg"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/id"
        },
        "name": {
          "type": "string",
          "minLength": 3
        },
        "targets": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "group",
              "weight"
            ],
            "properties": {
              "group": {
                "$ref": "#/$defs/id"
              },
              "weight": {
                "enum": [
                  1,
                  0.5
                ]
              }
            }
          }
        },
        "type": {
          "enum": [
            "static",
            "pnf",
            "dynamic",
            "active"
          ]
        },
        "sided": {
          "enum": [
            "unilateral",
            "bilateral",
            "alternating"
          ]
        },
        "slot": {
          "enum": [
            "ochtend",
            "avond",
            "beide"
          ]
        },
        "position": {
          "enum": [
            "staand",
            "stoel",
            "vloer",
            "liggend"
          ]
        },
        "equipment": {
          "type": "array",
          "uniqueItems": true,
          "items": {
            "enum": [
              "muur",
              "deurpost",
              "trede",
              "leuning",
              "stoel",
              "bed",
              "handdoek",
              "band",
              "kussen",
              "mat",
              "aanrecht",
              "hoek",
              "bank"
            ]
          }
        },
        "kneeFlexionMaxDeg": {
          "type": "integer",
          "minimum": 0,
          "maximum": 160
        },
        "kneeLoad": {
          "enum": [
            "geen",
            "laag",
            "matig",
            "hoog"
          ]
        },
        "morningLumbarFlexion": {
          "type": "boolean"
        },
        "scores": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "B",
            "K",
            "D",
            "R",
            "P"
          ],
          "properties": {
            "B": {
              "$ref": "#/$defs/score15"
            },
            "K": {
              "$ref": "#/$defs/score15"
            },
            "D": {
              "$ref": "#/$defs/score15"
            },
            "R": {
              "$ref": "#/$defs/score15"
            },
            "P": {
              "$ref": "#/$defs/score15"
            }
          }
        },
        "bNote": {
          "type": "string"
        },
        "score": {
          "type": "number",
          "minimum": 1,
          "maximum": 5
        },
        "stars": {
          "type": "number",
          "minimum": 1,
          "maximum": 5,
          "multipleOf": 0.5
        },
        "locked": {
          "type": "boolean"
        },
        "evidenceLevel": {
          "enum": [
            "sterk",
            "matig",
            "beperkt",
            "zwak",
            "geen"
          ]
        },
        "cues": {
          "type": "array",
          "minItems": 2,
          "items": {
            "type": "string"
          }
        },
        "pros": {
          "type": "array",
          "minItems": 2,
          "items": {
            "type": "string"
          }
        },
        "cons": {
          "type": "array",
          "minItems": 2,
          "items": {
            "type": "string"
          }
        },
        "pfpsNote": {
          "type": "string"
        },
        "regression": {
          "type": "string"
        },
        "progression": {
          "type": "string"
        },
        "defaultDose": {
          "$ref": "#/$defs/dose"
        },
        "sources": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "svg": {
          "type": "string"
        }
      },
      "allOf": [
        {
          "if": {
            "properties": {
              "locked": {
                "const": false
              }
            },
            "required": [
              "locked"
            ]
          },
          "then": {
            "properties": {
              "kneeFlexionMaxDeg": {
                "maximum": 90
              },
              "scores": {
                "properties": {
                  "K": {
                    "minimum": 3
                  }
                }
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "scores": {
                "properties": {
                  "K": {
                    "maximum": 2
                  }
                }
              }
            },
            "required": [
              "scores"
            ]
          },
          "then": {
            "properties": {
              "locked": {
                "const": true
              },
              "stars": {
                "maximum": 2
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "type": {
                "const": "pnf"
              }
            },
            "required": [
              "type"
            ]
          },
          "then": {
            "properties": {
              "defaultDose": {
                "required": [
                  "pnf"
                ]
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "sided": {
                "const": "unilateral"
              },
              "type": {
                "enum": [
                  "static",
                  "dynamic",
                  "active"
                ]
              }
            },
            "required": [
              "sided",
              "type"
            ]
          },
          "then": {
            "properties": {
              "defaultDose": {
                "required": [
                  "perSideSec"
                ]
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "sided": {
                "enum": [
                  "bilateral",
                  "alternating"
                ]
              }
            },
            "required": [
              "sided"
            ]
          },
          "then": {
            "properties": {
              "defaultDose": {
                "required": [
                  "durationSec"
                ]
              }
            }
          }
        }
      ]
    },
    "step": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "exerciseId"
      ],
      "properties": {
        "exerciseId": {
          "$ref": "#/$defs/id"
        },
        "perSideSec": {
          "type": "integer",
          "minimum": 10,
          "maximum": 180
        },
        "durationSec": {
          "type": "integer",
          "minimum": 10,
          "maximum": 180
        },
        "reps": {
          "type": "integer",
          "minimum": 1
        },
        "pnf": {
          "$ref": "#/$defs/pnf"
        },
        "transitionAfterSec": {
          "type": "integer",
          "minimum": 0,
          "maximum": 30
        },
        "extraWeakSide": {
          "enum": [
            "L",
            "R",
            null
          ]
        }
      },
      "oneOf": [
        {
          "required": [
            "perSideSec"
          ]
        },
        {
          "required": [
            "durationSec"
          ]
        },
        {
          "required": [
            "pnf"
          ]
        }
      ]
    },
    "routine": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name",
        "slot",
        "variant",
        "template",
        "timesPerWeek",
        "preRun",
        "steps",
        "expectedTotalSec"
      ],
      "properties": {
        "id": {
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "slot": {
          "enum": [
            "ochtend",
            "avond",
            "vrij"
          ]
        },
        "variant": {
          "enum": [
            5,
            10,
            15
          ]
        },
        "template": {
          "const": true
        },
        "timesPerWeek": {
          "type": "integer",
          "minimum": 1,
          "maximum": 14
        },
        "preRun": {
          "type": "boolean"
        },
        "steps": {
          "type": "array",
          "minItems": 1,
          "items": {
            "$ref": "#/$defs/step"
          }
        },
        "expectedTotalSec": {
          "type": "integer",
          "minimum": 60,
          "maximum": 900
        }
      }
    },
    "test": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name",
        "unit",
        "sided",
        "groups",
        "instructions",
        "mdc",
        "pfpsNote",
        "sources"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/id"
        },
        "name": {
          "type": "string"
        },
        "unit": {
          "enum": [
            "cm",
            "graden"
          ]
        },
        "sided": {
          "type": "boolean"
        },
        "groups": {
          "type": "array",
          "minItems": 1,
          "items": {
            "$ref": "#/$defs/id"
          }
        },
        "instructions": {
          "type": "array",
          "minItems": 2,
          "items": {
            "type": "string"
          }
        },
        "mdc": {
          "type": [
            "number",
            "null"
          ]
        },
        "pfpsNote": {
          "type": "string"
        },
        "sources": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    },
    "source": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "key",
        "citation"
      ],
      "properties": {
        "key": {
          "type": "string"
        },
        "citation": {
          "type": "string"
        },
        "url": {
          "type": "string"
        }
      }
    }
  }
}
```

### 9.2 Extra validatie in `library.js` (bij elke keer laden)

1. Alle `id`'s uniek; elk `targets[].group` bestaat in `groups`; het eerste doel heeft gewicht 1.
2. `score` opnieuw berekenen uit `scores` met `meta.scoring.weights`; afwijking > 0,005 → fout.
3. `stars` opnieuw berekenen (afronding en knie-poort uit §3.2); afwijking → fout.
4. `scores.K ≤ 2` of `kneeFlexionMaxDeg > 90` ⇒ `locked` moet `true` zijn, en omgekeerd.
5. `scores.B` = groeps-`bBase`, min 1 voor dynamisch en actief (minimaal 1), tenzij `bNote` aanwezig is.
6. Elke spiergroep heeft minstens 2 oefeningen met die groep als primair doel, en minstens 1 niet-vergrendelde. Uitzondering: `quadriceps_vasti` (zie §4).
7. Elke sjabloonroutine bevat alleen niet-vergrendelde oefeningen, en haar gecompileerde totale tijd (§6.8.1) is gelijk aan `expectedTotalSec`.
8. Bij een fout: toon een duidelijke foutmelding met de oefening en het veld, en start de app niet met kapotte data.

---

## 10. Bibliotheekdata

<!-- LIBRARY_JSON_START -->
```json
{
  "schemaVersion": "2.0",
  "meta": {
    "generated": "2026-10-17",
    "language": "nl",
    "scoring": {"weights": {"B": 0.25, "K": 0.25, "D": 0.2, "R": 0.15, "P": 0.15}, "rounding": "half_up_to_0.5", "kneeGate": {"maxK": 2, "maxStars": 2}, "techniquePenalty": {"dynamic": 1, "active": 1}, "evidenceLabels": {"5": "sterk", "4": "matig", "3": "beperkt", "2": "zwak", "1": "geen"}},
    "dose": {"thresholdSec": 300, "plateauSec": 600, "secondaryWeight": 0.5, "countedTypes": ["static", "pnf"], "windowHours": 168},
    "knee": {"maxDegUnlocked": 90, "flareMaxDeg": 45, "painMax": 2, "cleanCyclesToUnlock": 3, "cooldownDays": 7, "flareExitDays": 7, "exposureSpacingHours": 48, "checkWindowsHours": {"h24": [20, 30], "h48": [44, 56]}},
    "timing": {"prepSec": 5, "sideSwitchSec": 5, "transitionSec": {"hoog_hoog": 5, "laag_laag": 10, "hoog_laag": 15}, "positionClass": {"staand": "hoog", "stoel": "hoog", "vloer": "laag", "liggend": "laag"}}
  },
  "groups": [
    {
      "id": "voetzool",
      "label": "Voetzool en tenen",
      "region": "Voet en onderbeen",
      "bBase": 2,
      "rBase": 3,
      "evidence": "Een RCT bij chronische hielpijn vond dat een gerichte voetzoolstretch beter werkte op pijn en functie dan een achillespeesstretch. Studies naar meer bewegingsuitslag bij gezonde mensen zijn niet gevonden.",
      "relevance": "Teenstrekking bij de afzet en bij smeren op rots.",
      "sources": ["digiovanni2003"]
    },
    {
      "id": "scheen",
      "label": "Scheen",
      "region": "Voet en onderbeen",
      "bBase": 1,
      "rBase": 2,
      "evidence": "Geen studies gevonden naar meer bewegingsuitslag door het rekken van de scheenspier.",
      "relevance": "Zelden beperkend bij lopen of klimmen.",
      "sources": []
    },
    {
      "id": "gastrocnemius",
      "label": "Kuit: gastrocnemius",
      "region": "Voet en onderbeen",
      "bBase": 5,
      "rBase": 5,
      "evidence": "Meta-analyse van 5 RCT's: kuitrekken vergroot de dorsiflexie, maar het effect is klein (gemiddeld 2–3°). Past in het bredere beeld dat statisch rekken de bewegingsuitslag vergroot.",
      "relevance": "Dorsiflexie voor steile hellingen, power hiken en aanlooppaden van een klettersteig.",
      "sources": ["radford2006", "konrad2024"]
    },
    {
      "id": "soleus",
      "label": "Kuit: soleus",
      "region": "Voet en onderbeen",
      "bBase": 4,
      "rBase": 5,
      "evidence": "Valt onder dezelfde kuit-meta-analyse, maar varianten met gebogen knie zijn apart weinig onderzocht.",
      "relevance": "Met gebogen knie, zoals bergop, beperkt vooral de soleus je enkel.",
      "sources": ["radford2006"]
    },
    {
      "id": "hamstrings",
      "label": "Hamstrings",
      "region": "Heup en bovenbeen",
      "bBase": 5,
      "rBase": 5,
      "evidence": "Het best onderzochte gebied: statisch en PNF vergroten de bewegingsuitslag betrouwbaar. Bij PFP-patiënten met stijve hamstrings gaf dynamisch rekken plus kracht betere klinische uitkomsten dan statisch rekken plus kracht.",
      "relevance": "Heupflexie voor hoge stappen en klimbewegingen.",
      "sources": ["konrad2024", "thomas2018", "leeham2021"]
    },
    {
      "id": "rectus_femoris",
      "label": "Rectus femoris",
      "region": "Heup en bovenbeen",
      "bBase": 3,
      "rBase": 4,
      "evidence": "Gemengd. In een grote meta-analyse was het langetermijneffect bij de quadriceps niet significant, maar dat rustte op slechts 3 metingen. Een 4-weeks PNF-programma gaf +9,2° kniebuiging. Bij PFP-patiënten met stijve quadriceps verbeterden pijn en functie na statisch én dynamisch quadricepsrekken, maar zonder groep die niet rekte. Acuut gaf een lage rekintensiteit (80%) geen winst.",
      "relevance": "Heupextensie in de looppas. Verminderde quadricepsflexibiliteit ging in een prospectieve studie vooraf aan het ontstaan van PFP.",
      "sources": ["konrad2024", "warneke2025", "higgs2009", "leequad2021", "nakamura2021", "witvrouw2000"]
    },
    {
      "id": "quadriceps_vasti",
      "label": "Quadriceps: vasti",
      "region": "Heup en bovenbeen",
      "bBase": 3,
      "rBase": 3,
      "evidence": "Zelfde quadricepsbewijs als bij de rectus femoris: gemengd.",
      "relevance": "Beperkt; vooral relevant als de quadriceps echt stijf is.",
      "note": "Elke vasti-stretch vraagt meer dan 90° kniebuiging, dus hier staan alleen vergrendelde opties. Binnen je regels werk je aan deze spieren via kracht over de toegestane range (leg extension 90°→45°) en via de rectus-femorisstretches.",
      "sources": ["konrad2024", "higgs2009", "leequad2021"]
    },
    {
      "id": "heupbuigers",
      "label": "Heupbuigers (iliopsoas)",
      "region": "Heup en bovenbeen",
      "bBase": 4,
      "rBase": 5,
      "evidence": "Meerdere RCT's. Actief en passief heupbuigerrekken vergrootten de heupextensie even goed in 6 weken. Tien weken rekken deed dat ook bij ouderen. Acht weken dynamisch rekken gaf grote winst bij profvoetballers, die na 4 weken stoppen deels verdween. Het bekken achterover kantelen tijdens de rek werkte acuut beter dan alleen naar voren schuiven.",
      "relevance": "Heupextensie in de looppas en bergop; tegenwicht voor veel zitten.",
      "sources": ["winters2004", "watt2011", "hipdyn2025", "gonzalez2024"]
    },
    {
      "id": "adductoren",
      "label": "Adductoren (lies)",
      "region": "Heup en bovenbeen",
      "bBase": 3,
      "rBase": 4,
      "evidence": "Vooral acute studies, met kleine effecten per sessie. Langdurig onderzoek is schaars.",
      "relevance": "Spreiden en zijwaarts stappen op de klettersteig en op rots; zijwaartse bewegingen op technisch terrein.",
      "sources": ["fjerstad2018"]
    },
    {
      "id": "heup_buitenkant",
      "label": "Heup-buitenkant (TFL, gluteus medius, IT-band)",
      "region": "Heup en bovenbeen",
      "bBase": 2,
      "rBase": 3,
      "evidence": "De IT-band zelf verlengt nauwelijks: in kadavers minder dan 0,5%, en hij zit stevig vast aan het dijbeen. Wat je rekt is vooral de TFL en de bilspieren. In een labstudie bij 5 lopers gaf de staande variant met armen boven het hoofd de grootste lengteverandering van het complex.",
      "relevance": "Matig; vooral comfort bij een stijve heupbuitenkant.",
      "sources": ["falvey2010", "fredericson2002"]
    },
    {
      "id": "gluteus_max",
      "label": "Gluteus maximus",
      "region": "Heup en bovenbeen",
      "bBase": 2,
      "rBase": 3,
      "evidence": "Eén acute crossoverstudie: statisch bilrekken vergrootte het passieve heupbereik direct. Geen trainingsstudies gevonden.",
      "relevance": "Diepe heupflexie bij hoge stappen.",
      "sources": ["gluteal2024"]
    },
    {
      "id": "heupdraaiers",
      "label": "Diepe heupdraaiers (piriformis)",
      "region": "Heup en bovenbeen",
      "bBase": 2,
      "rBase": 4,
      "evidence": "Echografisch onderzoek liet zien dat de piriformis het meest gerekt wordt bij maximale buitendraai met ~110° heupflexie en ~40° adductie. Trainingsstudies bestaan alleen bij piriformissyndroom; rekken was daar niet beter dan de standaardbehandeling.",
      "relevance": "Binnen- en buitendraai van de heup voor drop knees en hoge, gedraaide stappen bij klimmen.",
      "sources": ["piriswe2024", "ergezen"]
    },
    {
      "id": "onderrug",
      "label": "Onderrug",
      "region": "Romp en nek",
      "bBase": 2,
      "rBase": 3,
      "evidence": "Programma's met rek- en stabiliteitsoefeningen vergrootten de rompflexibiliteit (12 weken, n=72), maar rugbuigend rekken alleen is niet apart onderzocht. Vlak na het opstaan zijn de tussenwervelschijven gevoeliger voor buigbelasting, en ochtendbuigen beperken verminderde rugpijn in een RCT.",
      "relevance": "Werk met veel bukken en tillen.",
      "sources": ["trunk2025", "adams1987", "snook1998"]
    },
    {
      "id": "zijkant_romp",
      "label": "Zijkant romp",
      "region": "Romp en nek",
      "bBase": 2,
      "rBase": 2,
      "evidence": "Bij chronische lage rugpijn verbeterden programma's met onder meer rekken de zijwaartse buiging. Weinig onderzoek bij gezonde mensen.",
      "relevance": "Zijwaarts reiken.",
      "sources": ["ashoury2024"]
    },
    {
      "id": "buik",
      "label": "Buik (extensie)",
      "region": "Romp en nek",
      "bBase": 3,
      "rBase": 2,
      "evidence": "In een RCT bij 101 gezonde volwassenen vergrootten zowel herhaald achteroverbuigen als statisch extensierekken de lumbale extensie na 4 en 8 weken; herhaald werkte beter.",
      "relevance": "Tegenbeweging na veel bukken; weinig belang voor lopen of klimmen.",
      "sources": ["bybee"]
    },
    {
      "id": "borstwervels",
      "label": "Borstwervels (thoracaal)",
      "region": "Romp en nek",
      "bBase": 2,
      "rBase": 4,
      "evidence": "In een kleine studie verbeterden een staande en een viervoetige rotatieoefening de thoracale rotatie even goed na 2 weken, maar zonder controlegroep. Verder weinig onderzoek.",
      "relevance": "Reiken boven je hoofd en draaien op de klettersteig; houding bij tillen.",
      "sources": ["thoraxokayama"]
    },
    {
      "id": "nek",
      "label": "Nek",
      "region": "Romp en nek",
      "bBase": 3,
      "rBase": 2,
      "evidence": "RCT's laten direct meer nekbereik zien na rekken van de bovenste trapezius, maar in een ervan was het effect na 24 uur verdwenen.",
      "relevance": "Beperkt; omhoog kijken bij klimmen.",
      "sources": ["hanney2017", "oliveira2013"]
    },
    {
      "id": "latissimus",
      "label": "Latissimus dorsi",
      "region": "Schouder en arm",
      "bBase": 2,
      "rBase": 4,
      "evidence": "De lengte van de latissimus verschilt tussen sporten, maar trainingsstudies naar latrekken zijn niet gevonden.",
      "relevance": "Reiken boven je hoofd: de volgende greep of beugel.",
      "sources": ["herrington2014"]
    },
    {
      "id": "borst",
      "label": "Borst (grote en kleine borstspier)",
      "region": "Schouder en arm",
      "bBase": 4,
      "rBase": 3,
      "evidence": "Twee RCT's: 7 weken borstrekken (3× per week 15 min) vergrootte de schouderextensie (+6%), en 8 weken dagelijks 15 min gaf +9,8% schouderbereik. De eenarmige stretch in de deuropening verlengde de kleine borstspier het meest van drie methodes. Let op: die trainingsvolumes zijn veel hoger dan in een korte routine.",
      "relevance": "Schouderbereik en houding; matig voor lopen.",
      "sources": ["reiner2023", "jssm2023", "borstad2006"]
    },
    {
      "id": "schouder_voor",
      "label": "Voorkant schouder en biceps",
      "region": "Schouder en arm",
      "bBase": 2,
      "rBase": 2,
      "evidence": "Geen eigen onderzoek gevonden. De borststudies maten wel schouderextensie, waarbij deze spieren meedoen.",
      "relevance": "Beperkt.",
      "sources": ["reiner2023"]
    },
    {
      "id": "schouder_achter",
      "label": "Achterkant schouder",
      "region": "Schouder en arm",
      "bBase": 4,
      "rBase": 3,
      "evidence": "RCT's bij mensen met een stijve achterkant van de schouder: de cross-body-stretch verbeterde de binnendraai, de sleeper stretch niet significant ten opzichte van niet rekken. Aangepaste versies van beide werkten in een RCT bij honkballers.",
      "relevance": "Schouderbalans bij veel trek- en tilwerk.",
      "sources": ["mcclure2007", "jses2016"]
    },
    {
      "id": "triceps",
      "label": "Triceps",
      "region": "Schouder en arm",
      "bBase": 1,
      "rBase": 2,
      "evidence": "Geen onderzoek gevonden naar meer bewegingsuitslag door tricepsrekken.",
      "relevance": "Klein; de lange kop kan reiken boven het hoofd beperken.",
      "sources": []
    },
    {
      "id": "onderarm_buigers",
      "label": "Onderarm: pols- en vingerbuigers",
      "region": "Schouder en arm",
      "bBase": 2,
      "rBase": 4,
      "evidence": "Eén kleine acute studie bij klimsters (n=10): statisch polsrekken van 30 tot 240 s vergrootte het bereik. Kracht daalde in de groepen van 120 en 240 s, maar ook in de controlegroep.",
      "relevance": "Grijpen bij klimmen en bij tillen.",
      "sources": ["kamankesh2014"]
    },
    {
      "id": "onderarm_strekkers",
      "label": "Onderarm: polsstrekkers",
      "region": "Schouder en arm",
      "bBase": 1,
      "rBase": 3,
      "evidence": "Geen studies gevonden naar meer bewegingsuitslag door het rekken van de polsstrekkers.",
      "relevance": "Tegenwicht voor veel grijpen.",
      "sources": []
    }
  ],
  "exercises": [
    {
      "id": "voetzool_muur",
      "name": "Grote teen tegen de muur",
      "targets": [{"group": "voetzool", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 30,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 4, "D": 4, "R": 3, "P": 5},
      "score": 3.5,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Zet je grote teen omhoog tegen de muur, de bal van je voet op de grond.", "Breng je knie langzaam richting de muur tot je rek voelt in je voetzool.", "Hiel blijft laag; stop bij pijn in het teengewricht."],
      "pros": ["Spant de voetzool gericht aan via de grote teen.", "Overal waar een muur is, ook in werkkleding.", "Helpt bij de afzet tijdens het lopen en bij smeren op rots."],
      "cons": ["Geen studies naar meer bewegingsuitslag bij gezonde mensen; het RCT-bewijs gaat over hielpijn.", "Doordrukken kan het grote-teengewricht irriteren."],
      "pfpsNote": "Knie tot ~30° gebogen onder deels lichaamsgewicht: lage belasting.",
      "regression": "Minder ver richting de muur leunen.",
      "progression": "60 s houden of 2× herhalen.",
      "defaultDose": {"perSideSec": 45},
      "sources": ["digiovanni2003"],
      "svg": "img/ex/voetzool_muur.svg"
    },
    {
      "id": "voetzool_zittend",
      "name": "Voetzool zittend (DiGiovanni)",
      "targets": [{"group": "voetzool", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "stoel",
      "equipment": ["stoel"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 4, "D": 5, "R": 3, "P": 5},
      "score": 3.7,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Zit en leg je enkel op je andere knie, of zet je voet op een krukje.", "Trek met één hand je tenen naar je scheen.", "Voel met je andere hand de gespannen band in je voetzool."],
      "pros": ["In een RCT bij chronische hielpijn beter dan een achillespeesstretch.", "Kan op de bedrand, vóór je eerste stappen.", "Je voelt direct of je de goede structuur rekt."],
      "cons": ["Het bewijs gaat over pijn en functie, niet over meer bewegingsuitslag.", "Weinig meerwaarde zonder voetklachten of beperkte teenstrekking."],
      "pfpsNote": "Enkel op de knie geeft ~90° kniebuiging zonder belasting; voet op een krukje is lager.",
      "regression": "Voet op een krukje in plaats van op de knie.",
      "progression": "10 × 10 s houden, zoals in de studie.",
      "defaultDose": {"perSideSec": 45},
      "sources": ["digiovanni2003"],
      "svg": "img/ex/voetzool_zittend.svg"
    },
    {
      "id": "scheen_staand",
      "name": "Scheen staand (wreef op de grond)",
      "targets": [{"group": "scheen", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 30,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 1, "K": 4, "D": 3, "R": 2, "P": 5},
      "score": 2.9,
      "stars": 3.0,
      "locked": false,
      "evidenceLevel": "geen",
      "cues": ["Hand tegen de muur; zet de wreef van je achterste voet op de grond.", "Duw de enkel zacht richting de vloer tot je rek voelt voor op je scheen.", "Standbeen licht gebogen, romp rechtop."],
      "pros": ["Staand en zonder materiaal.", "Rekt de voorkant van enkel en voet zonder te knielen."],
      "cons": ["Geen onderzoek naar meer bewegingsuitslag.", "Een stijve scheenspier beperkt zelden iets bij lopen of klimmen.", "Kan kramp in de voetzool geven."],
      "pfpsNote": "Gerekte knie ~30° zonder belasting; standbeen bijna gestrekt.",
      "regression": "Minder druk richting de vloer.",
      "progression": "Knie van het achterste been iets verder naar voren.",
      "defaultDose": {"perSideSec": 30},
      "sources": [],
      "svg": "img/ex/scheen_staand.svg"
    },
    {
      "id": "scheen_hielzit",
      "name": "Hielzit op de wreven",
      "targets": [{"group": "scheen", "weight": 1}, {"group": "quadriceps_vasti", "weight": 0.5}],
      "type": "static",
      "sided": "bilateral",
      "slot": "avond",
      "position": "vloer",
      "equipment": ["mat"],
      "kneeFlexionMaxDeg": 150,
      "kneeLoad": "hoog",
      "morningLumbarFlexion": false,
      "scores": {"B": 1, "K": 1, "D": 4, "R": 2, "P": 4},
      "score": 2.2,
      "stars": 2.0,
      "locked": true,
      "evidenceLevel": "geen",
      "cues": ["Kniel met je wreven plat op de grond.", "Zak met je billen richting je hielen.", "Leun eventueel achterover op je handen voor meer rek."],
      "pros": ["Sterke rek op scheen en voorkant enkel.", "Tegelijk een quadricepsrek."],
      "cons": ["Maximale kniebuiging met je lichaamsgewicht erop en druk op de knieschijf.", "Geen onderzoek naar meer bewegingsuitslag voor de scheen."],
      "pfpsNote": "Knielen en ~150° kniebuiging onder lichaamsgewicht: knie-poort, vergrendeld.",
      "regression": "Kussen tussen billen en hielen.",
      "progression": "Niet van toepassing zolang de oefening vergrendeld is.",
      "defaultDose": {"durationSec": 45},
      "sources": [],
      "svg": "img/ex/scheen_hielzit.svg"
    },
    {
      "id": "gastroc_muur",
      "name": "Kuit tegen de muur (gestrekte knie)",
      "targets": [{"group": "gastrocnemius", "weight": 1}, {"group": "soleus", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 20,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 5, "K": 5, "D": 4, "R": 5, "P": 5},
      "score": 4.8,
      "stars": 5.0,
      "locked": false,
      "evidenceLevel": "sterk",
      "cues": ["Handen tegen de muur, achterste been gestrekt, hiel plat.", "Tenen recht naar voren, heup richting de muur.", "Rek hoog in de kuit, 5–6/10."],
      "pros": ["Meta-analyse: kuitrekken vergroot je dorsiflexie, gemiddeld 2–3°.", "Overal te doen, geen materiaal.", "Direct nuttig voor steile hellingen en power hiken."],
      "cons": ["Het effect is klein; het gaat om maanden volhouden.", "De hiel komt makkelijk los, dan rek je minder."],
      "pfpsNote": "Gerekte knie gestrekt, voorste knie licht gebogen: geen relevante kniebelasting.",
      "regression": "Kortere stap.",
      "progression": "Voorvoet op een boekje, of 60 s houden.",
      "defaultDose": {"perSideSec": 45},
      "sources": ["radford2006"],
      "svg": "img/ex/gastroc_muur.svg"
    },
    {
      "id": "gastroc_trede",
      "name": "Kuit van een trede (gestrekte knie)",
      "targets": [{"group": "gastrocnemius", "weight": 1}, {"group": "soleus", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["trede", "leuning"],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 5, "K": 5, "D": 4, "R": 5, "P": 4},
      "score": 4.65,
      "stars": 4.5,
      "locked": false,
      "evidenceLevel": "sterk",
      "cues": ["Voorvoet op de rand van een trede, houd de leuning vast.", "Laat de hiel van het gestrekte been langzaam onder trapniveau zakken.", "Verdeel je gewicht met het andere been; niet veren."],
      "pros": ["Sterkere rek dan tegen de muur, doordat je gewicht helpt.", "Zelfde plek als je excentrische kuitheffingen: kracht en rek samen."],
      "cons": ["Wordt snel te intens; doseer met het andere been.", "Trede en leuning nodig."],
      "pfpsNote": "Knieën gestrekt: geen relevante kniebelasting.",
      "regression": "Meer gewicht op het andere been.",
      "progression": "Langzaam meer gewicht op het gerekte been.",
      "defaultDose": {"perSideSec": 45},
      "sources": ["radford2006"],
      "svg": "img/ex/gastroc_trede.svg"
    },
    {
      "id": "soleus_muur",
      "name": "Soleus tegen de muur (gebogen knie)",
      "targets": [{"group": "soleus", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 40,
      "kneeLoad": "matig",
      "morningLumbarFlexion": false,
      "scores": {"B": 4, "K": 4, "D": 4, "R": 5, "P": 5},
      "score": 4.3,
      "stars": 4.5,
      "locked": false,
      "evidenceLevel": "matig",
      "cues": ["Achterste voet plat; buig de achterste knie tot je rek laag in de kuit voelt.", "Hiel blijft aan de grond.", "Knie boven de tweede teen."],
      "pros": ["Rekt de soleus, die bij gebogen knie (zoals bergop) je enkel beperkt.", "Geen materiaal."],
      "cons": ["Varianten met gebogen knie zijn apart weinig onderzocht.", "De achillespees rekt mee; niet doordrukken bij peesklachten."],
      "pfpsNote": "Knie ~20–40° onder deels lichaamsgewicht: binnen je 45°-grens.",
      "regression": "Minder diep door de knie.",
      "progression": "Achterste voet verder naar achteren.",
      "defaultDose": {"perSideSec": 45},
      "sources": ["radford2006"],
      "svg": "img/ex/soleus_muur.svg"
    },
    {
      "id": "enkel_rock",
      "name": "Enkel-rocks tegen de muur",
      "targets": [{"group": "soleus", "weight": 1}],
      "type": "dynamic",
      "sided": "unilateral",
      "slot": "ochtend",
      "position": "staand",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 45,
      "kneeLoad": "matig",
      "morningLumbarFlexion": false,
      "scores": {"B": 3, "K": 4, "D": 4, "R": 5, "P": 5},
      "score": 4.05,
      "stars": 4.0,
      "locked": false,
      "evidenceLevel": "beperkt",
      "cues": ["Split-stand, tenen 8–12 cm van de muur.", "Breng je knie naar de muur boven de tweede teen, hiel plat.", "Rustig ritme, ~2,5 s per herhaling."],
      "pros": ["Maakt je enkels los voor lopen en werk.", "Is meteen je knie-tot-muurtest: je ziet vooruitgang.", "Geen krachtverlies, zoals na lang statisch rekken."],
      "cons": ["Dynamisch geeft minder blijvende winst dan statisch.", "Belaste kniebuiging; houd hem binnen 45°."],
      "pfpsNote": "Knie ~30–45° onder lichaamsgewicht.",
      "regression": "Voet dichter bij de muur.",
      "progression": "2 s pauze in de eindstand.",
      "defaultDose": {"perSideSec": 30, "reps": 12},
      "sources": [],
      "svg": "img/ex/enkel_rock.svg"
    },
    {
      "id": "soleus_trede",
      "name": "Soleus van een trede (gebogen knie)",
      "targets": [{"group": "soleus", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["trede", "leuning"],
      "kneeFlexionMaxDeg": 30,
      "kneeLoad": "matig",
      "morningLumbarFlexion": false,
      "scores": {"B": 4, "K": 4, "D": 4, "R": 5, "P": 4},
      "score": 4.15,
      "stars": 4.0,
      "locked": false,
      "evidenceLevel": "matig",
      "cues": ["Voorvoet op de trederand, knie licht gebogen (~20°).", "Laat de hiel onder trapniveau zakken; de knie blijft gebogen.", "Houd de leuning vast en verdeel je gewicht."],
      "pros": ["Sterkere soleusrek dan tegen de muur.", "Sluit aan op je kuitwerk op de trede."],
      "cons": ["Trede nodig.", "Lichte belaste kniebuiging; niet dieper dan nodig."],
      "pfpsNote": "Knie ~20–30° onder deels lichaamsgewicht.",
      "regression": "Meer gewicht op het andere been.",
      "progression": "Langzaam meer gewicht op het gerekte been.",
      "defaultDose": {"perSideSec": 45},
      "sources": [],
      "svg": "img/ex/soleus_trede.svg"
    },
    {
      "id": "beenzwaai_va",
      "name": "Beenzwaaien voor-achter",
      "targets": [{"group": "hamstrings", "weight": 1}, {"group": "heupbuigers", "weight": 0.5}],
      "type": "dynamic",
      "sided": "unilateral",
      "slot": "ochtend",
      "position": "staand",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 10,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 4, "K": 5, "D": 3, "R": 5, "P": 5},
      "score": 4.35,
      "stars": 4.5,
      "locked": false,
      "evidenceLevel": "matig",
      "cues": ["Hand aan de muur, romp rechtop.", "Zwaai het been ontspannen voor en achter; begin klein.", "Bekken stil; maak de zwaai per keer iets groter."],
      "pros": ["Snelle, staande opwarming van heup en hamstrings.", "Dynamisch hamstringrekken scoorde bij PFP-patiënten (met kracht) beter dan statisch; die studie gebruikte wel een andere oefening.", "Geen krachtverlies vóór lopen of werk."],
      "cons": ["Minder blijvende winst dan statisch of PNF.", "Te hard zwaaien geeft een rukbelasting op de hamstring."],
      "pfpsNote": "Standbeen bijna gestrekt: geen relevante kniebelasting.",
      "regression": "Kleinere boog.",
      "progression": "Grotere boog, zelfde tempo.",
      "defaultDose": {"perSideSec": 25, "reps": 12},
      "sources": ["leeham2021"],
      "svg": "img/ex/beenzwaai_va.svg"
    },
    {
      "id": "soldier_kick",
      "name": "Gestrekte-beenheffing (actief)",
      "targets": [{"group": "hamstrings", "weight": 1}],
      "type": "active",
      "sided": "unilateral",
      "slot": "ochtend",
      "position": "staand",
      "equipment": [],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 4, "K": 5, "D": 3, "R": 5, "P": 5},
      "score": 4.35,
      "stars": 4.5,
      "locked": false,
      "evidenceLevel": "matig",
      "cues": ["Sta rechtop; een hand aan de muur mag.", "Hef het gestrekte been actief tot ~70% van je bereik, zonder te zwaaien.", "Houd 1 s boven en laat rustig zakken."],
      "pros": ["Traint bruikbaar bereik voor hoge stappen: je heupbuigers werken in hun korte stand.", "Geen materiaal."],
      "cons": ["Minder rek op de hamstring dan een passieve stretch.", "Vraagt balans."],
      "pfpsNote": "Benen gestrekt: geen relevante kniebelasting.",
      "regression": "Lager heffen.",
      "progression": "2 s boven houden.",
      "defaultDose": {"perSideSec": 30, "reps": 8},
      "sources": [],
      "svg": "img/ex/soldier_kick.svg"
    },
    {
      "id": "hamstring_pnf",
      "name": "Hamstrings met band (contract-relax)",
      "targets": [{"group": "hamstrings", "weight": 1}],
      "type": "pnf",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": ["band"],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 5, "K": 5, "D": 5, "R": 5, "P": 4},
      "score": 4.85,
      "stars": 5.0,
      "locked": false,
      "evidenceLevel": "sterk",
      "cues": ["Ruglig, band of handdoek om je voet, been gestrekt omhoog tot rek 5/10.", "Duw 5 s met 20–30% kracht in de band en adem door.", "Laat los, adem uit en trek het been 25 s iets verder."],
      "pros": ["PNF en statisch zijn de best onderbouwde vormen voor meer bewegingsuitslag.", "Ruglig ligt je bekken stabiel, dus je rekt echt de hamstring.", "Ook met een handdoek te doen."],
      "cons": ["Op de grond of op bed.", "Kost per kant twee rondes."],
      "pfpsNote": "Gerekte knie gestrekt, andere been plat: geen kniebelasting.",
      "regression": "Statisch 45 s zonder aanspannen.",
      "progression": "3 rondes.",
      "defaultDose": {"pnf": {"rounds": 2, "contractSec": 5, "stretchSec": 25}},
      "sources": ["konrad2024", "thomas2018"],
      "svg": "img/ex/hamstring_pnf.svg"
    },
    {
      "id": "hamstring_deurpost",
      "name": "Hamstrings in de deuropening",
      "targets": [{"group": "hamstrings", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": ["deurpost"],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 5, "K": 5, "D": 4, "R": 5, "P": 4},
      "score": 4.65,
      "stars": 4.5,
      "locked": false,
      "evidenceLevel": "sterk",
      "cues": ["Lig op je rug in een deuropening, één been plat door de opening.", "Leg het andere been gestrekt tegen de deurpost.", "Schuif dichterbij voor meer rek en laat het been ontspannen."],
      "pros": ["Volledig passief: makkelijk 60 s of langer.", "Geen band nodig.", "Rustige afsluiter voor het slapen."],
      "cons": ["Intensiteit regel je alleen door te schuiven.", "Niet te combineren met PNF."],
      "pfpsNote": "Benen gestrekt: geen kniebelasting.",
      "regression": "Verder van de deurpost.",
      "progression": "Tenen naar je toe trekken.",
      "defaultDose": {"perSideSec": 60},
      "sources": [],
      "svg": "img/ex/hamstring_deurpost.svg"
    },
    {
      "id": "hamstring_staand_trede",
      "name": "Hamstrings staand (hiel op trede)",
      "targets": [{"group": "hamstrings", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["trede"],
      "kneeFlexionMaxDeg": 10,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 5, "K": 5, "D": 4, "R": 5, "P": 5},
      "score": 4.8,
      "stars": 5.0,
      "locked": false,
      "evidenceLevel": "sterk",
      "cues": ["Zet de hiel van je gestrekte been op een trede of stoelrand.", "Kantel vanuit je heup naar voren met een rechte rug.", "Stop zodra je rug wil krommen."],
      "pros": ["Staand en zonder band, ook op het werk of na een run.", "Met een rechte rug ook 's ochtends te doen."],
      "cons": ["Je rug buigt makkelijk mee; dan rek je je rug in plaats van je hamstring.", "Balans op één been."],
      "pfpsNote": "Benen (bijna) gestrekt: geen relevante kniebelasting.",
      "regression": "Lagere trede.",
      "progression": "Tenen naar je toe, of een hogere trede.",
      "defaultDose": {"perSideSec": 45},
      "sources": [],
      "svg": "img/ex/hamstring_staand_trede.svg"
    },
    {
      "id": "hamstring_zittend_vouw",
      "name": "Zittende voorwaartse vouw (klassiek)",
      "targets": [{"group": "hamstrings", "weight": 1}, {"group": "onderrug", "weight": 0.5}],
      "type": "static",
      "sided": "bilateral",
      "slot": "avond",
      "position": "vloer",
      "equipment": [],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": true,
      "scores": {"B": 5, "K": 5, "D": 2, "R": 5, "P": 5},
      "score": 4.4,
      "stars": 4.5,
      "locked": false,
      "evidenceLevel": "sterk",
      "cues": ["Zit met gestrekte benen op de vloer.", "Kantel vanuit je heupen naar voren.", "Reik naar je voeten zonder te forceren."],
      "pros": ["Beide benen tegelijk: tijdsefficiënt.", "Geen materiaal; veel gebruikt als test- en rekhouding in onderzoek."],
      "cons": ["Veel rugbuiging: je rekt vooral je onderrug.", "Niet in het eerste uur na opstaan: dan zijn je tussenwervelschijven het gevoeligst voor buigen."],
      "pfpsNote": "Knieën gestrekt: geen kniebelasting.",
      "regression": "Knieën licht gebogen, of op een kussen zitten.",
      "progression": "Langer houden, rug zo recht mogelijk.",
      "defaultDose": {"durationSec": 60},
      "sources": ["adams1987", "snook1998"],
      "svg": "img/ex/hamstring_zittend_vouw.svg"
    },
    {
      "id": "rf_zijlig",
      "name": "Rectus femoris zijlig met band",
      "targets": [{"group": "rectus_femoris", "weight": 1}, {"group": "heupbuigers", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": ["band"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 3, "K": 4, "D": 4, "R": 4, "P": 4},
      "score": 3.75,
      "stars": 4.0,
      "locked": false,
      "evidenceLevel": "beperkt",
      "cues": ["Zijlig, met je onderste heup en knie op 90° om je bekken vast te zetten.", "Band om de enkel van je bovenste been; breng die heup naar achteren.", "Stuitje onder, buik licht aan; knie maximaal 90°."],
      "pros": ["Rekt de rectus femoris via heupextensie, met maximaal 90° kniebuiging.", "Liggend en ontspannen, ook in bed.", "Quadricepsrekken verbeterde bij PFP-patiënten pijn en functie (zonder groep die niet rekte)."],
      "cons": ["Het bewijs voor meer bewegingsuitslag bij de quadriceps is gemengd.", "Een holle rug neemt de rek snel over.", "Band of handdoek nodig."],
      "pfpsNote": "Knie maximaal 90°, onbelast, met lichte quadricepsspanning. Stop bij een knijpend gevoel achter de knieschijf.",
      "regression": "Minder heupextensie.",
      "progression": "Meer heupextensie, niet meer kniebuiging.",
      "defaultDose": {"perSideSec": 45},
      "sources": ["leequad2021", "higgs2009"],
      "svg": "img/ex/rf_zijlig.svg"
    },
    {
      "id": "rf_buiklig_90",
      "name": "Rectus femoris buiklig (knie 90°)",
      "targets": [{"group": "rectus_femoris", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": ["kussen", "handdoek"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 3, "K": 4, "D": 3, "R": 4, "P": 4},
      "score": 3.55,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "beperkt",
      "cues": ["Buiklig met een kussen onder je dij, net boven de knie, zodat je knieschijf vrij ligt.", "Buig de knie tot 90°, scheen loodrecht omhoog; handdoek om de enkel.", "Duw je bekken zacht in de vloer en span je bil aan."],
      "pros": ["Rectus femoris rekken zonder diepe kniebuiging.", "Je bekken ligt stabiel op de vloer."],
      "cons": ["Milde rek; vooral zinvol als je quadriceps echt stijf is.", "Ligt het kussen verkeerd, dan drukt de vloer op je knieschijf."],
      "pfpsNote": "Knie 90° onbelast; knieschijf vrij van de vloer.",
      "regression": "Kleiner kussen.",
      "progression": "Hoger kussen onder de dij, voor meer heupextensie.",
      "defaultDose": {"perSideSec": 45},
      "sources": [],
      "svg": "img/ex/rf_buiklig_90.svg"
    },
    {
      "id": "couch_stretch",
      "name": "Couch stretch (knielend)",
      "targets": [{"group": "rectus_femoris", "weight": 1}, {"group": "heupbuigers", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "vloer",
      "equipment": ["bank", "kussen"],
      "kneeFlexionMaxDeg": 140,
      "kneeLoad": "hoog",
      "morningLumbarFlexion": false,
      "scores": {"B": 3, "K": 1, "D": 5, "R": 4, "P": 4},
      "score": 3.2,
      "stars": 2.0,
      "locked": true,
      "evidenceLevel": "beperkt",
      "cues": ["Kniel met je achterste knie bij de bank of muur, de wreef ertegen omhoog.", "Zet het andere been voor je in een uitvalspas.", "Kom rechtop met je bekken gekanteld."],
      "pros": ["Een van de sterkste rekken voor rectus femoris en heupbuigers.", "Rekt beide tegelijk."],
      "cons": ["Knielen op de knie plus ~140° kniebuiging: alles wat je knie niet wil.", "Moeilijk te doseren; mensen gaan snel te ver."],
      "pfpsNote": "Knielen en diepe kniebuiging met quadricepsspanning: knie-poort, vergrendeld.",
      "regression": "Achterste knie verder van de muur.",
      "progression": "Niet van toepassing zolang de oefening vergrendeld is.",
      "defaultDose": {"perSideSec": 45},
      "sources": [],
      "svg": "img/ex/couch_stretch.svg"
    },
    {
      "id": "quad_hiel_bil",
      "name": "Hiel naar bil staand (klassiek)",
      "targets": [{"group": "quadriceps_vasti", "weight": 1}, {"group": "rectus_femoris", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 140,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 3, "K": 2, "D": 3, "R": 3, "P": 5},
      "score": 3.05,
      "stars": 2.0,
      "locked": true,
      "evidenceLevel": "beperkt",
      "cues": ["Hand aan de muur; pak je enkel en trek je hiel naar je bil.", "Knieën naast elkaar, stuitje onder.", "Rek voor in de dij, niet in de knie."],
      "pros": ["Overal te doen, geen materiaal.", "Bekende, makkelijke houding."],
      "cons": ["Ruim 130° kniebuiging met quadricepsspanning drukt de knieschijf tegen het dijbeen (voorzorg, niet bewezen schadelijk).", "Het bekken kantelt makkelijk, dan mis je de rectus femoris."],
      "pfpsNote": "Diepe kniebuiging (~130–150°) met quadricepsspanning: knie-poort, vergrendeld.",
      "regression": "Band om de enkel, knie minder ver.",
      "progression": "Niet van toepassing zolang de oefening vergrendeld is.",
      "defaultDose": {"perSideSec": 45},
      "sources": [],
      "svg": "img/ex/quad_hiel_bil.svg"
    },
    {
      "id": "quad_buiklig_band",
      "name": "Quadriceps buiklig met band (Ely-houding)",
      "targets": [{"group": "quadriceps_vasti", "weight": 1}, {"group": "rectus_femoris", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": ["band"],
      "kneeFlexionMaxDeg": 140,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 3, "K": 2, "D": 4, "R": 3, "P": 4},
      "score": 3.1,
      "stars": 2.0,
      "locked": true,
      "evidenceLevel": "beperkt",
      "cues": ["Buiklig, band of handdoek om je enkel.", "Trek je hiel langzaam richting je bil.", "Je heup blijft op de vloer."],
      "pros": ["Het bekken ligt stil: gerichter dan staand.", "Het is de Ely-testhouding, dus meetbaar.", "Bij PFP-patiënten met stijve quadriceps verbeterden pijn en functie na quadricepsrekken."],
      "cons": ["Diepe kniebuiging met quadricepsspanning.", "Die PFP-studie had geen groep die niet rekte."],
      "pfpsNote": "~130–150° kniebuiging met quadricepsspanning: knie-poort, vergrendeld.",
      "regression": "Knie minder ver.",
      "progression": "Niet van toepassing zolang de oefening vergrendeld is.",
      "defaultDose": {"perSideSec": 45},
      "sources": ["leequad2021"],
      "svg": "img/ex/quad_buiklig_band.svg"
    },
    {
      "id": "heupbuiger_dyn",
      "name": "Heupbuiger dynamisch (split-stand)",
      "targets": [{"group": "heupbuigers", "weight": 1}],
      "type": "dynamic",
      "sided": "unilateral",
      "slot": "ochtend",
      "position": "staand",
      "equipment": [],
      "kneeFlexionMaxDeg": 45,
      "kneeLoad": "matig",
      "morningLumbarFlexion": false,
      "scores": {"B": 4, "K": 4, "D": 4, "R": 5, "P": 5},
      "bNote": "Geen −1 voor dynamisch: een RCT met 8 weken dynamisch heupbuigerrekken liet grote winst zien.",
      "score": 4.3,
      "stars": 4.5,
      "locked": false,
      "evidenceLevel": "matig",
      "cues": ["Grote stap, achterste hiel los, voorste knie boven de enkel.", "Stuitje onder en bil van het achterste been aan; arm omhoog.", "3 s naar voren schuiven, 2 s terug."],
      "pros": ["8 weken dynamisch heupbuigerrekken gaf in een RCT grote winst.", "Bekken achterover kantelen werkt beter dan alleen naar voren schuiven (acute studie).", "Staand en zonder materiaal: goed vóór werk of lopen."],
      "cons": ["De winst zakte na 4 weken stoppen deels terug.", "Voorste knie belast; houd hem binnen 45°."],
      "pfpsNote": "Voorste knie ≤45° onder lichaamsgewicht, achterste knie 10–30°.",
      "regression": "Kortere stap.",
      "progression": "Arm schuin over je hoofd naar de andere kant.",
      "defaultDose": {"perSideSec": 30, "reps": 6},
      "sources": ["hipdyn2025", "gonzalez2024"],
      "svg": "img/ex/heupbuiger_dyn.svg"
    },
    {
      "id": "heupbuiger_statisch",
      "name": "Heupbuiger statisch (split-stand)",
      "targets": [{"group": "heupbuigers", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": [],
      "kneeFlexionMaxDeg": 45,
      "kneeLoad": "matig",
      "morningLumbarFlexion": false,
      "scores": {"B": 4, "K": 4, "D": 4, "R": 5, "P": 5},
      "score": 4.3,
      "stars": 4.5,
      "locked": false,
      "evidenceLevel": "matig",
      "cues": ["Grote stap, achterste hiel los, voorste knie maximaal 45°.", "Kantel je bekken achterover en span de bil van het achterste been aan.", "Strek de arm aan de kant van het achterste been schuin omhoog."],
      "pros": ["Statisch geeft meer blijvende winst dan dynamisch.", "Zonder knielen: een knievriendelijk alternatief voor de klassieke uitvalspas.", "Meerdere RCT's tonen meer heupextensie na heupbuigerrekken."],
      "cons": ["Je voorste been draagt gewicht: minder ontspannen dan liggend.", "Zonder bekkenkanteling neemt een holle rug de rek over."],
      "pfpsNote": "Voorste knie ≤45° onder lichaamsgewicht.",
      "regression": "Kortere stap.",
      "progression": "Arm schuin over je hoofd, of 60 s houden.",
      "defaultDose": {"perSideSec": 45},
      "sources": ["winters2004", "watt2011", "gonzalez2024"],
      "svg": "img/ex/heupbuiger_statisch.svg"
    },
    {
      "id": "heupbuiger_halfgeknield",
      "name": "Heupbuiger halfgeknield (op dik kussen)",
      "targets": [{"group": "heupbuigers", "weight": 1}, {"group": "rectus_femoris", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "vloer",
      "equipment": ["kussen"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "hoog",
      "morningLumbarFlexion": false,
      "scores": {"B": 4, "K": 2, "D": 5, "R": 5, "P": 4},
      "score": 3.85,
      "stars": 2.0,
      "locked": true,
      "evidenceLevel": "matig",
      "cues": ["Kniel op een dik kussen, voorste voet plat, voorste knie 90°.", "Kantel je bekken achterover en span je bil aan.", "Schuif licht naar voren tot je rek voelt voor in de heup."],
      "pros": ["De meest gebruikte heupbuigerrek, en met bekkenkanteling erg gericht.", "Stabiel, dus makkelijk lang vol te houden."],
      "cons": ["Je knielt: druk op of vlak onder de knieschijf, en je voorste knie staat belast op 90°.", "Voor jou alleen na een schone 48-uurstest."],
      "pfpsNote": "Knielen (ook op een kussen) plus voorste knie 90° belast: knie-poort, vergrendeld.",
      "regression": "Dikker kussen.",
      "progression": "Niet van toepassing zolang de oefening vergrendeld is.",
      "defaultDose": {"perSideSec": 45},
      "sources": ["gonzalez2024"],
      "svg": "img/ex/heupbuiger_halfgeknield.svg"
    },
    {
      "id": "thomas_bedrand",
      "name": "Thomas-stretch aan de bedrand",
      "targets": [{"group": "heupbuigers", "weight": 1}, {"group": "rectus_femoris", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": ["bed"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 4, "K": 4, "D": 4, "R": 5, "P": 4},
      "score": 4.15,
      "stars": 4.0,
      "locked": false,
      "evidenceLevel": "matig",
      "cues": ["Lig op je rug met je billen op de bedrand.", "Trek één dij naar je borst met je handen achter de knieholte; houd dat onderbeen omhoog (knie ~90°).", "Laat het andere been ontspannen over de rand hangen; die knie zakt vanzelf naar ~80°."],
      "pros": ["Rekt heupbuigers én rectus femoris tegelijk.", "De zwaartekracht doet het werk: makkelijk te ontspannen.", "Zelfde houding als de Thomas-test, dus je ziet vooruitgang."],
      "cons": ["Bed of stevige tafel nodig.", "Laat je de andere dij los, dan trekt je onderrug hol."],
      "pfpsNote": "Hangende knie ~80° onbelast; het vastgehouden been ~90° met lichte quadricepsspanning.",
      "regression": "Minder ver over de rand liggen.",
      "progression": "Langer laten hangen (60 s).",
      "defaultDose": {"perSideSec": 45},
      "sources": ["winters2004"],
      "svg": "img/ex/thomas_bedrand.svg"
    },
    {
      "id": "beenzwaai_zij",
      "name": "Beenzwaaien zijwaarts",
      "targets": [{"group": "adductoren", "weight": 1}, {"group": "heup_buitenkant", "weight": 0.5}],
      "type": "dynamic",
      "sided": "unilateral",
      "slot": "ochtend",
      "position": "staand",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 10,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 5, "D": 3, "R": 4, "P": 5},
      "score": 3.7,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Gezicht naar de muur, handen ertegen.", "Zwaai het been voor je standbeen langs, van links naar rechts.", "Tenen naar voren, romp stil."],
      "pros": ["Snelle opwarming voor zijwaartse bewegingen op trail en rots.", "Geen materiaal."],
      "cons": ["Dynamisch: weinig blijvende winst.", "Weinig onderzoek bij de adductoren."],
      "pfpsNote": "Standbeen bijna gestrekt: geen relevante kniebelasting.",
      "regression": "Kleinere boog.",
      "progression": "Grotere boog.",
      "defaultDose": {"perSideSec": 25, "reps": 12},
      "sources": [],
      "svg": "img/ex/beenzwaai_zij.svg"
    },
    {
      "id": "lateraal_shift",
      "name": "Zijwaartse gewichtsverplaatsing",
      "targets": [{"group": "adductoren", "weight": 1}],
      "type": "dynamic",
      "sided": "alternating",
      "slot": "ochtend",
      "position": "staand",
      "equipment": [],
      "kneeFlexionMaxDeg": 60,
      "kneeLoad": "matig",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 3, "D": 4, "R": 4, "P": 5},
      "score": 3.4,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Brede stand, tenen licht naar buiten.", "Verplaats je gewicht naar één kant; het andere been blijft gestrekt.", "Hielen plat; gebogen knie maximaal 60°."],
      "pros": ["Rekt de adductoren van het gestrekte been terwijl je actief blijft.", "Lijkt op zijwaarts stappen op technisch terrein."],
      "cons": ["Belaste kniebuiging tot 60°, boven je voorkeursgrens van 45°.", "Dynamisch: beperkte blijvende winst."],
      "pfpsNote": "Gebogen knie ≤60° onder lichaamsgewicht: matige belasting; houd het ondiep.",
      "regression": "Minder diep, tot 45°.",
      "progression": "2 s pauze aan elke kant.",
      "defaultDose": {"durationSec": 60, "reps": 16},
      "sources": [],
      "svg": "img/ex/lateraal_shift.svg"
    },
    {
      "id": "spreidzit_muur",
      "name": "Spreidzit tegen de muur (liggend)",
      "targets": [{"group": "adductoren", "weight": 1}, {"group": "hamstrings", "weight": 0.5}],
      "type": "static",
      "sided": "bilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 3, "K": 5, "D": 4, "R": 4, "P": 4},
      "score": 4.0,
      "stars": 4.0,
      "locked": false,
      "evidenceLevel": "beperkt",
      "cues": ["Lig met je billen tegen de muur, benen omhoog.", "Laat je benen in een V naar buiten zakken.", "Adem lang uit en laat de zwaartekracht het werk doen."],
      "pros": ["Beide kanten tegelijk: telt per kant volledig mee.", "Passief en ontspannen: een goede afsluiter.", "Knieën gestrekt en onbelast."],
      "cons": ["De intensiteit is lastig te regelen.", "Je benen kunnen na 2 minuten gaan tintelen."],
      "pfpsNote": "Knieën gestrekt en onbelast.",
      "regression": "Billen verder van de muur.",
      "progression": "Handen licht op de binnenkant van je dijen.",
      "defaultDose": {"durationSec": 60},
      "sources": ["fjerstad2018"],
      "svg": "img/ex/spreidzit_muur.svg"
    },
    {
      "id": "vlinder_breed",
      "name": "Brede vlinder liggend",
      "targets": [{"group": "adductoren", "weight": 1}],
      "type": "static",
      "sided": "bilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": ["kussen"],
      "kneeFlexionMaxDeg": 80,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 3, "K": 4, "D": 4, "R": 4, "P": 4},
      "score": 3.75,
      "stars": 4.0,
      "locked": false,
      "evidenceLevel": "beperkt",
      "cues": ["Ruglig, voetzolen tegen elkaar, hielen ver van je billen.", "Laat je knieën naar buiten zakken.", "Kussens onder je knieën als het te sterk is."],
      "pros": ["Beide kanten tegelijk.", "Liggend vermijd je de rugbuiging van de zittende vlinder.", "Draait de heup naar buiten: nuttig voor klimmen."],
      "cons": ["Met de hielen dicht bij je billen komt je knie boven 90°.", "Weinig onderzoek."],
      "pfpsNote": "Knieën ~60–80° onbelast; hielen ver weg houden.",
      "regression": "Kussens onder de knieën.",
      "progression": "Hielen iets dichterbij, maar knie nooit boven 90°.",
      "defaultDose": {"durationSec": 60},
      "sources": [],
      "svg": "img/ex/vlinder_breed.svg"
    },
    {
      "id": "kikker",
      "name": "Kikker (frog)",
      "targets": [{"group": "adductoren", "weight": 1}],
      "type": "static",
      "sided": "bilateral",
      "slot": "avond",
      "position": "vloer",
      "equipment": ["mat", "kussen"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "hoog",
      "morningLumbarFlexion": false,
      "scores": {"B": 3, "K": 1, "D": 5, "R": 4, "P": 3},
      "score": 3.05,
      "stars": 2.0,
      "locked": true,
      "evidenceLevel": "beperkt",
      "cues": ["Op handen en knieën, knieën wijd, onderbenen evenwijdig.", "Schuif je billen naar achteren.", "Zak op je onderarmen als dat lukt."],
      "pros": ["Een van de sterkste adductorrekken.", "Populair bij klimmers voor buitendraai en spreiding."],
      "cons": ["Je knielt met je gewicht op de binnenkant van je knieën.", "Draai- en zijwaartse belasting op de knie."],
      "pfpsNote": "Knielen onder lichaamsgewicht met draaibelasting: knie-poort, vergrendeld.",
      "regression": "Knieën minder wijd.",
      "progression": "Niet van toepassing zolang de oefening vergrendeld is.",
      "defaultDose": {"durationSec": 60},
      "sources": [],
      "svg": "img/ex/kikker.svg"
    },
    {
      "id": "heup_buiten_overhead",
      "name": "Heup-buitenkant staand, armen omhoog",
      "targets": [{"group": "heup_buitenkant", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 10,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 5, "D": 3, "R": 3, "P": 5},
      "score": 3.55,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Sta zijwaarts naast de muur; zet het te rekken been achter het andere langs.", "Duw je heup naar de muur en buig je romp de andere kant op.", "Strek beide armen boven je hoofd en reik diagonaal mee."],
      "pros": ["De variant met armen boven het hoofd gaf de grootste lengteverandering van drie geteste versies.", "Staand, zonder materiaal."],
      "cons": ["De IT-band zelf rekt nauwelijks (<0,5% in kadavers): je rekt vooral de TFL en de bilspieren.", "Het bewijs is een labmeting bij 5 lopers, geen trainingsstudie."],
      "pfpsNote": "Knieën (bijna) gestrekt: geen relevante kniebelasting.",
      "regression": "Armen langs je lichaam.",
      "progression": "Buig je romp verder opzij.",
      "defaultDose": {"perSideSec": 45},
      "sources": ["fredericson2002", "falvey2010"],
      "svg": "img/ex/heup_buiten_overhead.svg"
    },
    {
      "id": "heup_buiten_kruis_ruglig",
      "name": "Been over het lichaam (ruglig)",
      "targets": [{"group": "heup_buitenkant", "weight": 1}, {"group": "zijkant_romp", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": [],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 5, "D": 3, "R": 3, "P": 5},
      "score": 3.55,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Ruglig, armen in een T.", "Breng één gestrekt been over je lichaam naar de andere kant.", "Je schouders blijven op de grond."],
      "pros": ["Liggend en ontspannen, ook in bed.", "Combineert de heup-buitenkant met een draai in de rug."],
      "cons": ["Komen je schouders mee, dan rek je vooral je rug.", "Weinig bewijs."],
      "pfpsNote": "Knie gestrekt: geen kniebelasting.",
      "regression": "Knie licht gebogen.",
      "progression": "Hand op de buitenkant van je knie, zacht omlaag.",
      "defaultDose": {"perSideSec": 45},
      "sources": [],
      "svg": "img/ex/heup_buiten_kruis_ruglig.svg"
    },
    {
      "id": "heup_buiten_bedrand",
      "name": "Zijlig aan de bedrand (Ober-houding)",
      "targets": [{"group": "heup_buitenkant", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": ["bed"],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 5, "D": 3, "R": 3, "P": 4},
      "score": 3.4,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Lig op je zij op de bedrand, onderste knie gebogen.", "Strek je bovenste been licht naar achteren.", "Laat het ontspannen over de rand omlaag zakken."],
      "pros": ["Zelfde houding als de Ober-test: rekken en meten in één.", "De zwaartekracht doet het werk."],
      "cons": ["Bed nodig.", "Rekt vooral de TFL; de IT-band zelf rekt nauwelijks."],
      "pfpsNote": "Bovenste knie gestrekt; onderste knie gebogen en onbelast.",
      "regression": "Been minder ver naar achteren.",
      "progression": "Langer laten hangen (60 s).",
      "defaultDose": {"perSideSec": 45},
      "sources": ["falvey2010"],
      "svg": "img/ex/heup_buiten_bedrand.svg"
    },
    {
      "id": "knie_naar_borst_90",
      "name": "Knie naar borst, onderbeen omhoog",
      "targets": [{"group": "gluteus_max", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": [],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 4, "D": 3, "R": 3, "P": 5},
      "score": 3.3,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Ruglig; pak met beide handen achter je dij, vlak boven de knieholte.", "Trek de dij naar je borst en laat het onderbeen omhoog wijzen (knie ~90°).", "Het andere been ligt gestrekt op de vloer."],
      "pros": ["Rekt de bil zonder de diepe kniebuiging van de klassieke versie.", "Geen materiaal, kan in bed."],
      "cons": ["Vraagt wat spierkracht om je onderbeen omhoog te houden.", "Milde rek; weinig onderzoek."],
      "pfpsNote": "Knie ~90° onbelast; laat je onderbeen niet naar je bil vallen.",
      "regression": "Andere knie gebogen met de voet plat.",
      "progression": "Trek de dij iets richting je andere schouder.",
      "defaultDose": {"perSideSec": 45},
      "sources": ["gluteal2024"],
      "svg": "img/ex/knie_naar_borst_90.svg"
    },
    {
      "id": "knie_naar_borst_klassiek",
      "name": "Knie naar borst (klassiek, handen op scheen)",
      "targets": [{"group": "gluteus_max", "weight": 1}, {"group": "onderrug", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": [],
      "kneeFlexionMaxDeg": 140,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 2, "D": 3, "R": 3, "P": 5},
      "score": 2.8,
      "stars": 2.0,
      "locked": true,
      "evidenceLevel": "zwak",
      "cues": ["Ruglig, pak je scheen vast.", "Trek je knie naar je borst.", "Het andere been ligt gestrekt."],
      "pros": ["Eenvoudig en bekend.", "Ontspannend aan het eind van de dag."],
      "cons": ["Trekken aan je scheen buigt je knie tot ~140°.", "Weinig onderzoek."],
      "pfpsNote": "Diepe kniebuiging (~140°) met lichte quadricepsspanning: knie-poort, vergrendeld.",
      "regression": "Pak achter je dij (zie de versie met het onderbeen omhoog).",
      "progression": "Niet van toepassing zolang de oefening vergrendeld is.",
      "defaultDose": {"perSideSec": 45},
      "sources": [],
      "svg": "img/ex/knie_naar_borst_klassiek.svg"
    },
    {
      "id": "figuur4_muur",
      "name": "Figuur-4 met voet tegen de muur",
      "targets": [{"group": "heupdraaiers", "weight": 1}, {"group": "gluteus_max", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 4, "D": 4, "R": 4, "P": 4},
      "score": 3.5,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Ruglig, billen zo dicht bij de muur dat je voet op de muur je knie op 90° zet.", "Leg je andere enkel op die knie.", "Duw de knie zacht naar buiten; schuif dichter naar de muur voor meer rek, maar nooit voorbij 90°."],
      "pros": ["Knievriendelijk alternatief voor de duif: geen gewicht op de knie.", "De muur bewaakt je kniehoek.", "Rekt piriformis en bil, nuttig voor drop knees bij klimmen."],
      "cons": ["Weinig bewijs voor meer bewegingsuitslag bij gezonde mensen.", "Muur en vloer nodig."],
      "pfpsNote": "Beide knieën ~90° onbelast; de muur voorkomt diepere buiging.",
      "regression": "Verder van de muur.",
      "progression": "Borstbeen richting de knie, knie nooit voorbij 90°.",
      "defaultDose": {"perSideSec": 45},
      "sources": ["piriswe2024"],
      "svg": "img/ex/figuur4_muur.svg"
    },
    {
      "id": "piriformis_diagonaal",
      "name": "Piriformis diagonaal (knie naar andere schouder)",
      "targets": [{"group": "heupdraaiers", "weight": 1}, {"group": "gluteus_max", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": [],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 3, "D": 5, "R": 4, "P": 5},
      "score": 3.6,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Ruglig; buig de knie van het te rekken been en pak met één hand de knie, met de andere de enkel.", "Trek de knie diagonaal naar je andere schouder, met het onderbeen dwars.", "Ondersteun knie én enkel; trek nooit alleen aan de enkel."],
      "pros": ["Komt het dichtst bij de houding die de piriformis in echografisch onderzoek het meest rekte.", "Geen materiaal."],
      "cons": ["Draaimoment door je knie als je aan de enkel trekt.", "Het bewijs is een echografiestudie, geen trainingsstudie."],
      "pfpsNote": "Knie ~90° onbelast, maar met een draaimoment: ondersteun de knie en houd de rek mild.",
      "regression": "Alleen de knie naar de andere schouder, zonder het onderbeen te draaien.",
      "progression": "Langer houden (60 s).",
      "defaultDose": {"perSideSec": 45},
      "sources": ["piriswe2024"],
      "svg": "img/ex/piriformis_diagonaal.svg"
    },
    {
      "id": "figuur4_stoel",
      "name": "Figuur-4 op een stoel",
      "targets": [{"group": "heupdraaiers", "weight": 1}, {"group": "gluteus_max", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "stoel",
      "equipment": ["stoel"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 4, "D": 4, "R": 4, "P": 5},
      "score": 3.65,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Zit rechtop en leg je enkel op je andere knie.", "Kantel met een rechte rug naar voren.", "Druk de bovenste knie zacht omlaag."],
      "pros": ["Kan op elke stoel, ook in een pauze.", "Met een rechte rug blijft de rek in je heup."],
      "cons": ["Voorover kantelen wordt snel rugbuigen; 's ochtends rechtop blijven.", "Weinig bewijs."],
      "pfpsNote": "Gekruiste knie ~90° onbelast, met lichte draaispanning.",
      "regression": "Rechtop blijven zitten.",
      "progression": "Verder kantelen met een rechte rug.",
      "defaultDose": {"perSideSec": 45},
      "sources": [],
      "svg": "img/ex/figuur4_stoel.svg"
    },
    {
      "id": "heup_car",
      "name": "Heupcirkels staand (CARs)",
      "targets": [{"group": "heupdraaiers", "weight": 1}, {"group": "adductoren", "weight": 0.5}],
      "type": "active",
      "sided": "unilateral",
      "slot": "ochtend",
      "position": "staand",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 1, "K": 4, "D": 3, "R": 4, "P": 5},
      "score": 3.2,
      "stars": 3.0,
      "locked": false,
      "evidenceLevel": "geen",
      "cues": ["Hand aan de muur, romp stil.", "Knie naar heuphoogte, draai naar buiten, onderbeen naar binnen-achter en terug omlaag.", "Maak de cirkel zo groot mogelijk zonder dat je bekken meedraait."],
      "pros": ["Traint actief het hele draaibereik van de heup.", "Goede ochtendopwarming zonder krachtverlies."],
      "cons": ["Niet onderzocht als training voor bewegingsuitslag.", "Vraagt balans en controle."],
      "pfpsNote": "Standbeen bijna gestrekt; bewegende knie ~90° onbelast.",
      "regression": "Kleinere cirkel.",
      "progression": "15 s per cirkel.",
      "defaultDose": {"perSideSec": 40, "reps": 3},
      "sources": [],
      "svg": "img/ex/heup_car.svg"
    },
    {
      "id": "gate_opener",
      "name": "Poort open (gate opener)",
      "targets": [{"group": "heupdraaiers", "weight": 1}, {"group": "adductoren", "weight": 0.5}],
      "type": "active",
      "sided": "unilateral",
      "slot": "ochtend",
      "position": "staand",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 1, "K": 4, "D": 3, "R": 4, "P": 5},
      "score": 3.2,
      "stars": 3.0,
      "locked": false,
      "evidenceLevel": "geen",
      "cues": ["Hand aan de muur, knie naar heuphoogte.", "Draai de knie langzaam naar buiten en houd 2 s vast.", "Terug naar voren en neerzetten."],
      "pros": ["Actief naar buiten draaien: de 'turnout' voor klimmen.", "Staand en snel."],
      "cons": ["Niet onderzocht als training voor bewegingsuitslag.", "Minder rek dan statische varianten."],
      "pfpsNote": "Standbeen bijna gestrekt; bewegende knie ~90° onbelast.",
      "regression": "Knie lager.",
      "progression": "3 s vasthouden.",
      "defaultDose": {"perSideSec": 35, "reps": 8},
      "sources": [],
      "svg": "img/ex/gate_opener.svg"
    },
    {
      "id": "duif",
      "name": "Duif (pigeon)",
      "targets": [{"group": "heupdraaiers", "weight": 1}, {"group": "gluteus_max", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "vloer",
      "equipment": ["mat"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "hoog",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 1, "D": 4, "R": 4, "P": 4},
      "score": 2.75,
      "stars": 2.0,
      "locked": true,
      "evidenceLevel": "zwak",
      "cues": ["Voorste been gebogen voor je op de vloer, achterste been gestrekt naar achteren.", "Zak met je heup richting de vloer.", "Kom op je onderarmen voor meer rek."],
      "pros": ["Sterke rek op bil en heupdraaiers.", "Bekend en makkelijk te leren."],
      "cons": ["Je voorste knie krijgt gebogen een draai- en zijwaartse belasting onder je gewicht.", "Weinig bewijs voor meer bewegingsuitslag."],
      "pfpsNote": "Draaimoment op een gebogen, belaste knie: knie-poort, vergrendeld.",
      "regression": "Kussen onder je heup.",
      "progression": "Niet van toepassing zolang de oefening vergrendeld is.",
      "defaultDose": {"perSideSec": 45},
      "sources": [],
      "svg": "img/ex/duif.svg"
    },
    {
      "id": "negentig_negentig",
      "name": "90/90-zit",
      "targets": [{"group": "heupdraaiers", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "vloer",
      "equipment": [],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "matig",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 2, "D": 4, "R": 4, "P": 4},
      "score": 3.0,
      "stars": 2.0,
      "locked": true,
      "evidenceLevel": "zwak",
      "cues": ["Zit met beide knieën 90° gebogen: één been voor je, het andere naast je.", "Zit rechtop en breng je borst richting de voorste knie.", "Wissel van kant door beide knieën om te draaien."],
      "pros": ["Traint binnen- én buitendraai tegelijk, precies wat klimmen vraagt.", "Geen materiaal."],
      "cons": ["Draaimoment op vooral je achterste knie.", "Ook het wisselen van kant belast de knieën."],
      "pfpsNote": "Draaibelasting op gebogen knieën met deels lichaamsgewicht: knie-poort, vergrendeld.",
      "regression": "Steunen met je handen achter je.",
      "progression": "Niet van toepassing zolang de oefening vergrendeld is.",
      "defaultDose": {"perSideSec": 45},
      "sources": [],
      "svg": "img/ex/negentig_negentig.svg"
    },
    {
      "id": "voorover_hangen_stoel",
      "name": "Voorover hangen op een stoel",
      "targets": [{"group": "onderrug", "weight": 1}],
      "type": "static",
      "sided": "bilateral",
      "slot": "avond",
      "position": "stoel",
      "equipment": ["stoel"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "geen",
      "morningLumbarFlexion": true,
      "scores": {"B": 2, "K": 5, "D": 3, "R": 3, "P": 5},
      "score": 3.55,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Zit op de rand van een stoel, voeten breed.", "Laat je romp ontspannen tussen je knieën hangen, armen naar de vloer.", "Adem lang uit en kom langzaam wervel voor wervel omhoog."],
      "pros": ["Rugbuigen zonder de diepe kniebuiging van knie-naar-borst.", "Kan overal waar een stoel staat."],
      "cons": ["Niet in het eerste uur na opstaan: dan zijn je tussenwervelschijven het gevoeligst voor buigen.", "Weinig bewijs voor meer bewegingsuitslag."],
      "pfpsNote": "Gewoon zitten: geen extra kniebelasting.",
      "regression": "Handen op je dijen laten rusten.",
      "progression": "Langer houden (90 s).",
      "defaultDose": {"durationSec": 60},
      "sources": ["adams1987", "snook1998"],
      "svg": "img/ex/voorover_hangen_stoel.svg"
    },
    {
      "id": "kat_koe_staand",
      "name": "Kat-koe staand",
      "targets": [{"group": "onderrug", "weight": 1}, {"group": "borstwervels", "weight": 0.5}],
      "type": "dynamic",
      "sided": "bilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": [],
      "kneeFlexionMaxDeg": 30,
      "kneeLoad": "laag",
      "morningLumbarFlexion": true,
      "scores": {"B": 1, "K": 4, "D": 3, "R": 3, "P": 5},
      "score": 3.05,
      "stars": 3.0,
      "locked": false,
      "evidenceLevel": "geen",
      "cues": ["Sta met je knieën licht gebogen, handen op je dijen.", "Maak je rug bol bij het uitademen en hol bij het inademen.", "Klein en rustig; 's ochtends alleen het middengebied, niet tot de eindstand."],
      "pros": ["Beweegt de hele wervelkolom zonder op handen en knieën te gaan.", "Kort en staand."],
      "cons": ["Niet onderzocht als training voor bewegingsuitslag.", "Bevat rugbuiging: 's ochtends klein houden."],
      "pfpsNote": "Knieën ~20–30° onder lichaamsgewicht: laag.",
      "regression": "Kleiner bewegen.",
      "progression": "Langzamer, met 2 s in elke stand.",
      "defaultDose": {"durationSec": 40, "reps": 8},
      "sources": [],
      "svg": "img/ex/kat_koe_staand.svg"
    },
    {
      "id": "rug_rotatie_ruglig",
      "name": "Rugdraai liggend (knieën opzij)",
      "targets": [{"group": "onderrug", "weight": 1}, {"group": "zijkant_romp", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": [],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 5, "D": 3, "R": 3, "P": 5},
      "score": 3.55,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Ruglig, knieën gebogen, voeten plat, armen in een T.", "Laat beide knieën samen naar één kant zakken.", "Je schouders blijven op de grond; adem lang uit."],
      "pros": ["Ontspannende draai voor rug en heupen.", "Geen materiaal, kan in bed."],
      "cons": ["Weinig bewijs.", "Houd de draai klein bij rugklachten."],
      "pfpsNote": "Knieën 90° onbelast en samen bewegend: geen relevante kniebelasting.",
      "regression": "Kussen onder de knieën.",
      "progression": "Hoofd de andere kant op draaien.",
      "defaultDose": {"perSideSec": 45},
      "sources": [],
      "svg": "img/ex/rug_rotatie_ruglig.svg"
    },
    {
      "id": "zijbuiging_deurpost",
      "name": "Zijwaartse rek aan de deurpost",
      "targets": [{"group": "zijkant_romp", "weight": 1}, {"group": "latissimus", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["deurpost"],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 5, "D": 3, "R": 2, "P": 5},
      "score": 3.4,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Sta naast een deurpost en breng je buitenste arm over je hoofd.", "Pak de deurpost en duw je heup naar buiten.", "Voel de rek langs je flank tot in je oksel."],
      "pros": ["Rekt flank en latissimus in één beweging.", "Staand en snel."],
      "cons": ["Weinig gericht onderzoek.", "Draait je romp mee, dan verlies je de rek."],
      "pfpsNote": "Knieën gestrekt: geen kniebelasting.",
      "regression": "Minder ver opzij.",
      "progression": "Voeten dichter bij elkaar.",
      "defaultDose": {"perSideSec": 45},
      "sources": ["ashoury2024"],
      "svg": "img/ex/zijbuiging_deurpost.svg"
    },
    {
      "id": "banaan_ruglig",
      "name": "Banaan (liggende zijbuiging)",
      "targets": [{"group": "zijkant_romp", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": [],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 5, "D": 3, "R": 2, "P": 5},
      "score": 3.4,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Ruglig, armen boven je hoofd.", "Schuif voeten en handen naar dezelfde kant, zodat je lichaam een banaan vormt.", "Je billen blijven op de grond."],
      "pros": ["Ontspannen zijwaartse rek, ook in bed.", "Geen materiaal."],
      "cons": ["Milde rek.", "Weinig bewijs."],
      "pfpsNote": "Knieën gestrekt: geen kniebelasting.",
      "regression": "Minder ver schuiven.",
      "progression": "Enkels kruisen.",
      "defaultDose": {"perSideSec": 45},
      "sources": [],
      "svg": "img/ex/banaan_ruglig.svg"
    },
    {
      "id": "staande_extensie",
      "name": "Staande achteroverbuiging (herhaald)",
      "targets": [{"group": "buik", "weight": 1}],
      "type": "dynamic",
      "sided": "bilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": [],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 3, "K": 5, "D": 3, "R": 2, "P": 5},
      "bNote": "Geen −1 voor dynamisch: in een RCT gaf herhaald achteroverbuigen meer lumbale extensie dan statisch rekken.",
      "score": 3.65,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "beperkt",
      "cues": ["Sta met je voeten op heupbreedte, handen in je onderrug.", "Buig rustig achterover en kijk mee omhoog.", "10 herhalingen, niet forceren."],
      "pros": ["In een RCT gaf herhaald achteroverbuigen meer lumbale extensie dan statisch rekken.", "Tegenbeweging na veel bukken.", "Ook 's ochtends prima: het is extensie, geen buiging."],
      "cons": ["Gemeten op lumbale extensie, niet op de buikspieren zelf.", "Niet doen bij uitstralende rugpijn."],
      "pfpsNote": "Knieën gestrekt: geen kniebelasting.",
      "regression": "Kleinere beweging.",
      "progression": "2 s in de eindstand.",
      "defaultDose": {"durationSec": 30, "reps": 10},
      "sources": ["bybee"],
      "svg": "img/ex/staande_extensie.svg"
    },
    {
      "id": "sfinx",
      "name": "Sfinx",
      "targets": [{"group": "buik", "weight": 1}],
      "type": "static",
      "sided": "bilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": ["handdoek"],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 3, "K": 4, "D": 3, "R": 2, "P": 4},
      "score": 3.25,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "beperkt",
      "cues": ["Buiklig met een handdoek onder je dijen, zodat je knieschijven vrij liggen.", "Kom op je onderarmen, ellebogen onder je schouders.", "Laat je buik zakken en adem rustig."],
      "pros": ["Statisch extensierekken vergrootte in een RCT ook de lumbale extensie.", "Rustig vol te houden."],
      "cons": ["Zonder handdoek kan buiklig druk op je knieschijven geven.", "Weinig zin zonder een beperking in extensie."],
      "pfpsNote": "Knieën gestrekt; handdoek onder je dijen zodat de knieschijven vrij liggen.",
      "regression": "Kussen onder je borst.",
      "progression": "Op je handen in plaats van je onderarmen (cobra).",
      "defaultDose": {"durationSec": 60},
      "sources": ["bybee"],
      "svg": "img/ex/sfinx.svg"
    },
    {
      "id": "open_boek",
      "name": "Open boek (zijlig)",
      "targets": [{"group": "borstwervels", "weight": 1}, {"group": "borst", "weight": 0.5}],
      "type": "dynamic",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": ["kussen"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 1, "K": 4, "D": 4, "R": 4, "P": 4},
      "score": 3.25,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "geen",
      "cues": ["Zijlig, knieën op 90° op elkaar met een kussen ertussen.", "Draai je bovenste arm in een boog naar achteren; je blik volgt.", "5 s in de eindstand en uitademen."],
      "pros": ["Knieën op elkaar zetten je onderrug vast: de draai komt echt uit je borstwervels.", "Opent ook je borst."],
      "cons": ["Weinig onderzoek.", "Dynamisch: beperkte blijvende winst."],
      "pfpsNote": "Knieën 90° onbelast.",
      "regression": "Kleinere boog.",
      "progression": "Langer houden in de eindstand.",
      "defaultDose": {"perSideSec": 40, "reps": 6},
      "sources": [],
      "svg": "img/ex/open_boek.svg"
    },
    {
      "id": "thor_rot_staand",
      "name": "Borstwervels draaien aan het aanrecht",
      "targets": [{"group": "borstwervels", "weight": 1}],
      "type": "dynamic",
      "sided": "unilateral",
      "slot": "ochtend",
      "position": "staand",
      "equipment": ["aanrecht"],
      "kneeFlexionMaxDeg": 20,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 1, "K": 5, "D": 3, "R": 4, "P": 5},
      "score": 3.45,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "geen",
      "cues": ["Handen op het aanrecht op heuphoogte, heupen naar achteren, rug recht.", "Draai één arm open naar het plafond; je blik volgt.", "Terug en wisselen; adem uit bij het openen."],
      "pros": ["Thoracale rotatie zonder op handen en knieën.", "Staand werkte in een kleine studie even goed als op handen en knieën."],
      "cons": ["Die studie had geen controlegroep.", "Je heupen draaien snel mee."],
      "pfpsNote": "Knieën licht gebogen onder lichaamsgewicht: geen relevante kniebelasting.",
      "regression": "Kleinere boog.",
      "progression": "3 s in de eindstand.",
      "defaultDose": {"perSideSec": 35, "reps": 8},
      "sources": ["thoraxokayama"],
      "svg": "img/ex/thor_rot_staand.svg"
    },
    {
      "id": "muurslide",
      "name": "Muurslides (W naar Y)",
      "targets": [{"group": "borstwervels", "weight": 1}, {"group": "latissimus", "weight": 0.5}],
      "type": "dynamic",
      "sided": "bilateral",
      "slot": "ochtend",
      "position": "staand",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 20,
      "kneeLoad": "laag",
      "morningLumbarFlexion": false,
      "scores": {"B": 1, "K": 5, "D": 3, "R": 4, "P": 5},
      "score": 3.45,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "geen",
      "cues": ["Rug, onderrug en achterhoofd tegen de muur.", "Armen in een W tegen de muur; schuif omhoog naar een Y.", "Ribben laag; stop zodra je onderrug loskomt."],
      "pros": ["Bereik boven je hoofd zonder holle rug.", "Koppelt schouderheffing aan thoracale extensie, zoals bij reiken op de klettersteig."],
      "cons": ["Geen studies naar meer bewegingsuitslag.", "Lastig als je al stijf bent: beweeg dan kleiner."],
      "pfpsNote": "Knieën licht gebogen: geen relevante kniebelasting.",
      "regression": "Minder hoog schuiven.",
      "progression": "Armen langer tegen de muur houden.",
      "defaultDose": {"durationSec": 40, "reps": 10},
      "sources": [],
      "svg": "img/ex/muurslide.svg"
    },
    {
      "id": "thoracaal_handdoekrol",
      "name": "Borstwervels over een handdoekrol",
      "targets": [{"group": "borstwervels", "weight": 1}, {"group": "borst", "weight": 0.5}],
      "type": "static",
      "sided": "bilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": ["handdoek"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 5, "D": 3, "R": 4, "P": 4},
      "score": 3.55,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Leg een stevig opgerolde handdoek dwars onder je middenrug.", "Knieën gebogen; handen achter je hoofd of armen boven je hoofd.", "Laat je bovenrug over de rol zakken en adem lang uit."],
      "pros": ["Passieve extensie van de borstwervels: rustig voor het slapen.", "Een handdoek volstaat."],
      "cons": ["Weinig bewijs.", "Een rol te hoog (nek) of te laag (onderrug) werkt averechts."],
      "pfpsNote": "Knieën gebogen, voeten plat: gewone lighouding.",
      "regression": "Dunnere rol.",
      "progression": "Armen boven je hoofd.",
      "defaultDose": {"durationSec": 60},
      "sources": [],
      "svg": "img/ex/thoracaal_handdoekrol.svg"
    },
    {
      "id": "nek_trapezius",
      "name": "Nek: oor naar schouder",
      "targets": [{"group": "nek", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": [],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 3, "K": 5, "D": 4, "R": 2, "P": 5},
      "score": 3.85,
      "stars": 4.0,
      "locked": false,
      "evidenceLevel": "beperkt",
      "cues": ["Zit of sta rechtop en laat je schouder zakken (of houd de stoelzitting vast).", "Breng je oor naar de andere schouder.", "Leg je andere hand licht op je hoofd; niet trekken."],
      "pros": ["Meerdere RCT's tonen direct meer zijwaartse nekbeweging.", "Overal te doen."],
      "cons": ["In een RCT was het effect na 24 uur weer weg.", "Hard trekken irriteert zenuwen in de nek."],
      "pfpsNote": "Geen kniebetrokkenheid.",
      "regression": "Zonder hand.",
      "progression": "Kin iets naar je borst.",
      "defaultDose": {"perSideSec": 30},
      "sources": ["hanney2017", "oliveira2013"],
      "svg": "img/ex/nek_trapezius.svg"
    },
    {
      "id": "nek_levator",
      "name": "Nek: neus naar oksel",
      "targets": [{"group": "nek", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": [],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 3, "K": 5, "D": 4, "R": 2, "P": 5},
      "score": 3.85,
      "stars": 4.0,
      "locked": false,
      "evidenceLevel": "beperkt",
      "cues": ["Draai je hoofd 45° en kijk naar je oksel.", "Leg je hand op je achterhoofd en laat het gewicht van je arm het werk doen.", "Houd de andere schouder laag."],
      "pros": ["Rekt de spier die bij veel tillen en dragen vaak stijf voelt.", "Overal te doen."],
      "cons": ["Weinig bewijs voor blijvende winst.", "Stop bij tintelingen in je arm."],
      "pfpsNote": "Geen kniebetrokkenheid.",
      "regression": "Zonder hand.",
      "progression": "Langer houden (45 s).",
      "defaultDose": {"perSideSec": 30},
      "sources": [],
      "svg": "img/ex/nek_levator.svg"
    },
    {
      "id": "lat_deurpost",
      "name": "Lat aan de deurpost",
      "targets": [{"group": "latissimus", "weight": 1}, {"group": "zijkant_romp", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["deurpost"],
      "kneeFlexionMaxDeg": 20,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 5, "D": 4, "R": 4, "P": 5},
      "score": 3.9,
      "stars": 4.0,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Pak de deurpost op hoofdhoogte.", "Duw je heupen naar achteren en opzij.", "Houd je ribben laag; voel de rek langs de zijkant van je rug."],
      "pros": ["Meer bereik boven je hoofd: de volgende greep of beugel.", "Staand en snel."],
      "cons": ["Weinig bewijs voor blijvende winst.", "Een holle rug neemt de rek over."],
      "pfpsNote": "Knieën licht gebogen en onbelast: geen relevante kniebelasting.",
      "regression": "Hand lager.",
      "progression": "Hand hoger en heupen verder naar achteren.",
      "defaultDose": {"perSideSec": 45},
      "sources": ["herrington2014"],
      "svg": "img/ex/lat_deurpost.svg"
    },
    {
      "id": "lat_aanrecht",
      "name": "Lats aan het aanrecht (heupscharnier)",
      "targets": [{"group": "latissimus", "weight": 1}, {"group": "borstwervels", "weight": 0.5}],
      "type": "static",
      "sided": "bilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["aanrecht"],
      "kneeFlexionMaxDeg": 20,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 5, "D": 3, "R": 4, "P": 5},
      "score": 3.7,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Handen op het aanrecht en stap naar achteren.", "Duw je heupen naar achteren tot je armen gestrekt boven je hoofd liggen.", "Laat je borst zakken met een rechte rug, knieën licht gebogen."],
      "pros": ["Beide kanten tegelijk.", "Knievriendelijk alternatief voor de kinderhouding."],
      "cons": ["Rekt ook schouderkapsel en borstwervels: minder gericht.", "Weinig bewijs."],
      "pfpsNote": "Knieën licht gebogen: geen relevante kniebelasting.",
      "regression": "Minder ver naar achteren.",
      "progression": "Handpalmen naar boven draaien.",
      "defaultDose": {"durationSec": 45},
      "sources": [],
      "svg": "img/ex/lat_aanrecht.svg"
    },
    {
      "id": "kinderhouding",
      "name": "Kinderhouding met gestrekte armen",
      "targets": [{"group": "latissimus", "weight": 1}, {"group": "onderrug", "weight": 0.5}],
      "type": "static",
      "sided": "bilateral",
      "slot": "avond",
      "position": "vloer",
      "equipment": ["mat"],
      "kneeFlexionMaxDeg": 150,
      "kneeLoad": "hoog",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 1, "D": 3, "R": 4, "P": 4},
      "score": 2.55,
      "stars": 2.0,
      "locked": true,
      "evidenceLevel": "zwak",
      "cues": ["Kniel en zak met je billen naar je hielen.", "Strek je armen ver voor je uit.", "Laat je borst zakken."],
      "pros": ["Rekt lats en rug tegelijk; ontspannend.", "Geen materiaal."],
      "cons": ["Maximale kniebuiging met je gewicht erop.", "Minder gericht dan de variant aan de deurpost."],
      "pfpsNote": "Knielen en maximale kniebuiging onder lichaamsgewicht: knie-poort, vergrendeld.",
      "regression": "Kussen tussen billen en hielen.",
      "progression": "Niet van toepassing zolang de oefening vergrendeld is.",
      "defaultDose": {"durationSec": 45},
      "sources": [],
      "svg": "img/ex/kinderhouding.svg"
    },
    {
      "id": "borst_deurpost",
      "name": "Borst in de deuropening (één arm)",
      "targets": [{"group": "borst", "weight": 1}, {"group": "schouder_voor", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["deurpost"],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 4, "K": 5, "D": 5, "R": 3, "P": 5},
      "score": 4.45,
      "stars": 4.5,
      "locked": false,
      "evidenceLevel": "matig",
      "cues": ["Onderarm verticaal tegen de deurpost, elleboog op schouderhoogte.", "Stap met hetzelfde been door de opening.", "Draai je borst weg tot je rek voelt voor in de schouder."],
      "pros": ["Rekte in vergelijkend onderzoek de kleine borstspier het meest van drie methodes.", "Twee RCT's met 7–8 weken borstrekken lieten meer schouderbereik zien.", "Alleen een deurpost nodig."],
      "cons": ["Die trainingsstudies gebruikten 15 minuten per sessie, veel meer dan een korte routine.", "Elleboog te hoog of doorduwen belast de voorkant van je schouderkapsel."],
      "pfpsNote": "Geen kniebetrokkenheid.",
      "regression": "Kleinere stap.",
      "progression": "Elleboog iets hoger, niet boven je schouder.",
      "defaultDose": {"perSideSec": 45},
      "sources": ["borstad2006", "reiner2023", "jssm2023"],
      "svg": "img/ex/borst_deurpost.svg"
    },
    {
      "id": "borst_hoek",
      "name": "Borst in een hoek (beide armen)",
      "targets": [{"group": "borst", "weight": 1}, {"group": "schouder_voor", "weight": 0.5}],
      "type": "static",
      "sided": "bilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["hoek"],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 4, "K": 5, "D": 4, "R": 3, "P": 4},
      "score": 4.1,
      "stars": 4.0,
      "locked": false,
      "evidenceLevel": "matig",
      "cues": ["Sta voor een hoek met je onderarmen tegen beide muren.", "Ellebogen net onder schouderhoogte.", "Leun met een rechte romp naar voren."],
      "pros": ["Beide kanten tegelijk: tijdsefficiënt.", "Makkelijk te doseren met je lichaamsgewicht."],
      "cons": ["Een hoek nodig.", "Minder gericht op de kleine borstspier dan de eenarmige versie."],
      "pfpsNote": "Geen kniebetrokkenheid.",
      "regression": "Minder ver leunen.",
      "progression": "Langer houden (60 s).",
      "defaultDose": {"durationSec": 45},
      "sources": ["reiner2023"],
      "svg": "img/ex/borst_hoek.svg"
    },
    {
      "id": "borst_ruglig_handdoek",
      "name": "Borst open op een handdoekrol",
      "targets": [{"group": "borst", "weight": 1}, {"group": "borstwervels", "weight": 0.5}],
      "type": "static",
      "sided": "bilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": ["handdoek"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 4, "K": 5, "D": 3, "R": 3, "P": 4},
      "score": 3.9,
      "stars": 4.0,
      "locked": false,
      "evidenceLevel": "matig",
      "cues": ["Leg een opgerolde handdoek in de lengte onder je ruggengraat.", "Knieën gebogen; armen in een T of W met de handpalmen omhoog.", "Laat je schouders naar de vloer zakken."],
      "pros": ["Volledig passief: rustig voor het slapen.", "Opent borst en borstwervels samen."],
      "cons": ["Mildere rek dan in de deuropening.", "Handdoekrol nodig."],
      "pfpsNote": "Gewone lighouding: geen kniebelasting.",
      "regression": "Dunnere rol.",
      "progression": "Armen hoger, in een V.",
      "defaultDose": {"durationSec": 60},
      "sources": [],
      "svg": "img/ex/borst_ruglig_handdoek.svg"
    },
    {
      "id": "schouder_voor_muur",
      "name": "Voorkant schouder tegen de muur",
      "targets": [{"group": "schouder_voor", "weight": 1}, {"group": "borst", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 5, "D": 3, "R": 2, "P": 5},
      "score": 3.4,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Sta zijwaarts naast de muur, arm gestrekt naar achteren op schouderhoogte, handpalm tegen de muur.", "Draai je romp langzaam van de muur weg.", "Schouder laag en naar achteren."],
      "pros": ["Rekt de voorste deltaspier en de biceps.", "Staand en snel."],
      "cons": ["Geen eigen onderzoek; alleen indirect via de borststudies.", "Kan de voorkant van het schouderkapsel belasten."],
      "pfpsNote": "Geen kniebetrokkenheid.",
      "regression": "Hand lager.",
      "progression": "Iets verder wegdraaien.",
      "defaultDose": {"perSideSec": 45},
      "sources": [],
      "svg": "img/ex/schouder_voor_muur.svg"
    },
    {
      "id": "handen_achter_rug",
      "name": "Handen achter de rug",
      "targets": [{"group": "schouder_voor", "weight": 1}, {"group": "borst", "weight": 0.5}],
      "type": "static",
      "sided": "bilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": [],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 5, "D": 3, "R": 2, "P": 5},
      "score": 3.4,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Vouw je handen achter je rug.", "Strek je armen en til ze iets op.", "Borst open, kin licht in."],
      "pros": ["Beide kanten tegelijk, overal te doen.", "Prettig na lang voorovergebogen werk."],
      "cons": ["Geen eigen onderzoek.", "Je schouders schieten snel naar voren."],
      "pfpsNote": "Geen kniebetrokkenheid.",
      "regression": "Handdoek tussen je handen.",
      "progression": "Armen hoger optillen.",
      "defaultDose": {"durationSec": 30},
      "sources": [],
      "svg": "img/ex/handen_achter_rug.svg"
    },
    {
      "id": "cross_body",
      "name": "Arm over de borst (cross-body)",
      "targets": [{"group": "schouder_achter", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": [],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 4, "K": 5, "D": 3, "R": 3, "P": 5},
      "score": 4.05,
      "stars": 4.0,
      "locked": false,
      "evidenceLevel": "matig",
      "cues": ["Breng je arm op schouderhoogte over je borst.", "Trek met je andere hand bij de elleboog zacht naar je toe.", "Houd je schouderblad laag en naar achteren; op je zij liggend zet je het het best vast."],
      "pros": ["In een RCT effectiever dan de sleeper stretch voor binnendraai.", "Staand, zonder materiaal."],
      "cons": ["Zonder je schouderblad vast te zetten rek je vooral de schouderbladspieren.", "Onderzocht vooral bij werpers met een beperking."],
      "pfpsNote": "Geen kniebetrokkenheid.",
      "regression": "Minder ver trekken.",
      "progression": "Op je zij liggend, schouderblad vast.",
      "defaultDose": {"perSideSec": 30},
      "sources": ["mcclure2007", "jses2016"],
      "svg": "img/ex/cross_body.svg"
    },
    {
      "id": "sleeper_aangepast",
      "name": "Sleeper stretch (aangepast)",
      "targets": [{"group": "schouder_achter", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "avond",
      "position": "liggend",
      "equipment": ["kussen"],
      "kneeFlexionMaxDeg": 90,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 3, "K": 5, "D": 4, "R": 3, "P": 4},
      "bNote": "B −1 ten opzichte van de groep: in één RCT niet beter dan niet rekken; alleen de aangepaste versie werkte in een tweede RCT.",
      "score": 3.85,
      "stars": 4.0,
      "locked": false,
      "evidenceLevel": "beperkt",
      "cues": ["Lig op je zij op de te rekken schouder en rol 20–30° naar achteren.", "Bovenarm voor je op 90°, elleboog 90°.", "Duw je onderarm met je andere hand zacht richting de grond; stop bij een knijpend gevoel voor in de schouder."],
      "pros": ["Gericht op het achterste schouderkapsel.", "De aangepaste versie vergrootte in een RCT de binnendraai."],
      "cons": ["In een andere RCT niet beter dan niet rekken.", "Kan voor in de schouder knellen als je doordrukt."],
      "pfpsNote": "Zijlig met gebogen knieën: gewone lighouding.",
      "regression": "Minder ver duwen.",
      "progression": "Langer houden (45 s).",
      "defaultDose": {"perSideSec": 30},
      "sources": ["mcclure2007", "jses2016"],
      "svg": "img/ex/sleeper_aangepast.svg"
    },
    {
      "id": "triceps_overhead",
      "name": "Triceps boven het hoofd",
      "targets": [{"group": "triceps", "weight": 1}, {"group": "latissimus", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": [],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 1, "K": 5, "D": 4, "R": 2, "P": 5},
      "score": 3.35,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "geen",
      "cues": ["Breng je arm omhoog en buig de elleboog, hand tussen je schouderbladen.", "Duw met je andere hand zacht tegen de elleboog.", "Ribben laag, geen holle rug."],
      "pros": ["Rekt ook de lange kop die over de schouder loopt: helpt bij reiken boven je hoofd.", "Overal te doen."],
      "cons": ["Geen onderzoek gevonden naar meer bewegingsuitslag.", "Een holle rug compenseert snel."],
      "pfpsNote": "Geen kniebetrokkenheid.",
      "regression": "Handdoek in je hand; trek met je andere hand van onderen.",
      "progression": "Langer houden (45 s).",
      "defaultDose": {"perSideSec": 30},
      "sources": [],
      "svg": "img/ex/triceps_overhead.svg"
    },
    {
      "id": "triceps_deurpost",
      "name": "Triceps tegen de deurpost",
      "targets": [{"group": "triceps", "weight": 1}, {"group": "latissimus", "weight": 0.5}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["deurpost"],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 1, "K": 5, "D": 4, "R": 2, "P": 5},
      "score": 3.35,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "geen",
      "cues": ["Zet je gebogen elleboog hoog tegen de deurpost.", "Leun met je lichaam naar voren en omlaag.", "Laat je hand ontspannen achter je hoofd hangen."],
      "pros": ["Je arm hoeft niets te doen: makkelijker ontspannen.", "Combineert triceps en lat."],
      "cons": ["Geen onderzoek gevonden naar meer bewegingsuitslag.", "Je schouder kan knellen als je te ver leunt."],
      "pfpsNote": "Geen kniebetrokkenheid.",
      "regression": "Minder ver leunen.",
      "progression": "Langer houden (45 s).",
      "defaultDose": {"perSideSec": 30},
      "sources": [],
      "svg": "img/ex/triceps_deurpost.svg"
    },
    {
      "id": "polsbuigers_muur",
      "name": "Polsbuigers tegen de muur",
      "targets": [{"group": "onderarm_buigers", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": ["muur"],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 5, "D": 4, "R": 4, "P": 5},
      "score": 3.9,
      "stars": 4.0,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Hand plat tegen de muur, vingers naar beneden, arm gestrekt.", "Draai je lichaam zacht van de muur weg.", "Houd je vingers plat; rek in de onderarm, niet in de pols."],
      "pros": ["Rekt de grijpspieren die bij klimmen en tillen het meest werken.", "Kort statisch polsrekken (30–60 s) gaf bij klimsters meer bereik zonder krachtverlies (acute studie)."],
      "cons": ["Het bewijs is één kleine acute studie (n=10).", "Bij polspijn eerst laten beoordelen; spierrekken is dan niet de eerste keus."],
      "pfpsNote": "Geen kniebetrokkenheid.",
      "regression": "Minder ver wegdraaien.",
      "progression": "Langer houden (45 s).",
      "defaultDose": {"perSideSec": 30},
      "sources": ["kamankesh2014"],
      "svg": "img/ex/polsbuigers_muur.svg"
    },
    {
      "id": "gebedshouding",
      "name": "Gebedshouding",
      "targets": [{"group": "onderarm_buigers", "weight": 1}],
      "type": "static",
      "sided": "bilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": [],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 2, "K": 5, "D": 3, "R": 4, "P": 5},
      "score": 3.7,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "zwak",
      "cues": ["Handpalmen tegen elkaar voor je borst.", "Laat je handen zakken richting je navel; de handpalmen blijven tegen elkaar.", "Ellebogen naar buiten."],
      "pros": ["Beide polsen tegelijk, overal.", "Geen materiaal."],
      "cons": ["Minder rek op de vingerbuigers dan met een gestrekte arm.", "Weinig bewijs."],
      "pfpsNote": "Geen kniebetrokkenheid.",
      "regression": "Handen minder laag.",
      "progression": "Vingers spreiden.",
      "defaultDose": {"durationSec": 30},
      "sources": [],
      "svg": "img/ex/gebedshouding.svg"
    },
    {
      "id": "polsstrekkers",
      "name": "Polsstrekkers met gestrekte arm",
      "targets": [{"group": "onderarm_strekkers", "weight": 1}],
      "type": "static",
      "sided": "unilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": [],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 1, "K": 5, "D": 4, "R": 3, "P": 5},
      "score": 3.5,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "geen",
      "cues": ["Strek je arm naar voren, handpalm naar beneden.", "Buig je pols en trek je hand met je andere hand zacht naar je toe.", "Draai je onderarm iets naar binnen voor meer rek."],
      "pros": ["Tegenwicht voor al het grijpen bij klimmen en tillen.", "Overal te doen."],
      "cons": ["Geen onderzoek gevonden naar meer bewegingsuitslag.", "Hard trekken irriteert de elleboogpees."],
      "pfpsNote": "Geen kniebetrokkenheid.",
      "regression": "Elleboog licht gebogen.",
      "progression": "Maak een vuist voor extra rek.",
      "defaultDose": {"perSideSec": 30},
      "sources": [],
      "svg": "img/ex/polsstrekkers.svg"
    },
    {
      "id": "omgekeerde_gebed",
      "name": "Omgekeerde gebedshouding",
      "targets": [{"group": "onderarm_strekkers", "weight": 1}],
      "type": "static",
      "sided": "bilateral",
      "slot": "beide",
      "position": "staand",
      "equipment": [],
      "kneeFlexionMaxDeg": 0,
      "kneeLoad": "geen",
      "morningLumbarFlexion": false,
      "scores": {"B": 1, "K": 5, "D": 3, "R": 3, "P": 5},
      "score": 3.3,
      "stars": 3.5,
      "locked": false,
      "evidenceLevel": "geen",
      "cues": ["Ruggen van je handen tegen elkaar, vingers naar beneden voor je buik.", "Til je ellebogen langzaam op.", "Schouders ontspannen."],
      "pros": ["Beide polsen tegelijk.", "Geen materiaal."],
      "cons": ["Geen onderzoek gevonden naar meer bewegingsuitslag.", "Lastig te doseren."],
      "pfpsNote": "Geen kniebetrokkenheid.",
      "regression": "Ellebogen lager.",
      "progression": "Langer houden (45 s).",
      "defaultDose": {"durationSec": 30},
      "sources": [],
      "svg": "img/ex/omgekeerde_gebed.svg"
    }
  ],
  "routines": [
    {
      "id": "O5",
      "name": "Ochtend 5 min",
      "slot": "ochtend",
      "variant": 5,
      "template": true,
      "timesPerWeek": 7,
      "preRun": false,
      "steps": [{"exerciseId": "enkel_rock", "perSideSec": 30, "reps": 12}, {"exerciseId": "beenzwaai_va", "perSideSec": 25, "reps": 12}, {"exerciseId": "beenzwaai_zij", "perSideSec": 25, "reps": 12}, {"exerciseId": "heupbuiger_dyn", "perSideSec": 30, "reps": 6}, {"exerciseId": "muurslide", "durationSec": 40, "reps": 10}],
      "expectedTotalSec": 305
    },
    {
      "id": "O10",
      "name": "Ochtend 10 min",
      "slot": "ochtend",
      "variant": 10,
      "template": true,
      "timesPerWeek": 7,
      "preRun": false,
      "steps": [{"exerciseId": "enkel_rock", "perSideSec": 30, "reps": 12}, {"exerciseId": "soleus_muur", "perSideSec": 30}, {"exerciseId": "beenzwaai_va", "perSideSec": 25, "reps": 12}, {"exerciseId": "beenzwaai_zij", "perSideSec": 25, "reps": 12}, {"exerciseId": "heup_car", "perSideSec": 40, "reps": 3}, {"exerciseId": "heupbuiger_dyn", "perSideSec": 30, "reps": 6}, {"exerciseId": "lateraal_shift", "durationSec": 60, "reps": 16}, {"exerciseId": "thor_rot_staand", "perSideSec": 35, "reps": 8}, {"exerciseId": "muurslide", "durationSec": 40, "reps": 10}],
      "expectedTotalSec": 610
    },
    {
      "id": "O15",
      "name": "Ochtend 15 min",
      "slot": "ochtend",
      "variant": 15,
      "template": true,
      "timesPerWeek": 7,
      "preRun": false,
      "steps": [{"exerciseId": "enkel_rock", "perSideSec": 30, "reps": 12}, {"exerciseId": "soleus_muur", "perSideSec": 30}, {"exerciseId": "gastroc_muur", "perSideSec": 30}, {"exerciseId": "beenzwaai_va", "perSideSec": 25, "reps": 12}, {"exerciseId": "beenzwaai_zij", "perSideSec": 25, "reps": 12}, {"exerciseId": "heup_car", "perSideSec": 40, "reps": 3}, {"exerciseId": "gate_opener", "perSideSec": 35, "reps": 8}, {"exerciseId": "soldier_kick", "perSideSec": 30, "reps": 8}, {"exerciseId": "heupbuiger_dyn", "perSideSec": 30, "reps": 6}, {"exerciseId": "lateraal_shift", "durationSec": 60, "reps": 16}, {"exerciseId": "thor_rot_staand", "perSideSec": 35, "reps": 8}, {"exerciseId": "muurslide", "durationSec": 40, "reps": 10}, {"exerciseId": "lat_deurpost", "perSideSec": 30}],
      "expectedTotalSec": 900
    },
    {
      "id": "A5",
      "name": "Avond 5 min",
      "slot": "avond",
      "variant": 5,
      "template": true,
      "timesPerWeek": 7,
      "preRun": false,
      "steps": [{"exerciseId": "gastroc_muur", "perSideSec": 45}, {"exerciseId": "rf_zijlig", "perSideSec": 45}, {"exerciseId": "spreidzit_muur", "durationSec": 75}],
      "expectedTotalSec": 295
    },
    {
      "id": "A10",
      "name": "Avond 10 min",
      "slot": "avond",
      "variant": 10,
      "template": true,
      "timesPerWeek": 7,
      "preRun": false,
      "steps": [{"exerciseId": "gastroc_muur", "perSideSec": 45}, {"exerciseId": "rf_zijlig", "perSideSec": 45}, {"exerciseId": "open_boek", "perSideSec": 40, "reps": 6}, {"exerciseId": "hamstring_pnf", "pnf": {"rounds": 2, "contractSec": 5, "stretchSec": 25}}, {"exerciseId": "figuur4_muur", "perSideSec": 45}, {"exerciseId": "spreidzit_muur", "durationSec": 60}],
      "expectedTotalSec": 615
    },
    {
      "id": "A15",
      "name": "Avond 15 min",
      "slot": "avond",
      "variant": 15,
      "template": true,
      "timesPerWeek": 7,
      "preRun": false,
      "steps": [{"exerciseId": "gastroc_muur", "perSideSec": 45}, {"exerciseId": "soleus_muur", "perSideSec": 45}, {"exerciseId": "lat_deurpost", "perSideSec": 45}, {"exerciseId": "rf_zijlig", "perSideSec": 45}, {"exerciseId": "open_boek", "perSideSec": 40, "reps": 6}, {"exerciseId": "hamstring_pnf", "pnf": {"rounds": 2, "contractSec": 5, "stretchSec": 25}}, {"exerciseId": "figuur4_muur", "perSideSec": 45}, {"exerciseId": "vlinder_breed", "durationSec": 60}, {"exerciseId": "spreidzit_muur", "durationSec": 60}],
      "expectedTotalSec": 885
    }
  ],
  "tests": [
    {
      "id": "knie_tot_muur",
      "name": "Knie-tot-muur",
      "unit": "cm",
      "sided": true,
      "groups": ["gastrocnemius", "soleus"],
      "instructions": ["Blote voet, split-stand voor de muur.", "De knie raakt de muur met de hiel plat; schuif de voet naar achteren tot het net niet meer lukt.", "Meet de afstand van je grote teen tot de muur."],
      "mdc": 1.9,
      "pfpsNote": "Knie ~30–45° belast: oké.",
      "sources": ["powden2015"]
    },
    {
      "id": "aslr",
      "name": "Actieve gestrekte-beenheffing",
      "unit": "graden",
      "sided": true,
      "groups": ["hamstrings"],
      "instructions": ["Ruglig, beide benen gestrekt.", "Telefoon met een hellingmeter-app op je scheenbeen.", "Hef één gestrekt been actief zo hoog mogelijk en lees de hoek af."],
      "mdc": null,
      "pfpsNote": "Knie gestrekt: oké.",
      "sources": []
    },
    {
      "id": "thomas",
      "name": "Aangepaste Thomas-test",
      "unit": "graden",
      "sided": true,
      "groups": ["heupbuigers", "rectus_femoris"],
      "instructions": ["Lig op je rug op de bedrand, billen op de rand.", "Trek één dij naar je borst met je handen achter de knieholte, onderbeen omhoog.", "Laat het andere been hangen; meet met je telefoon de hoek van die dij ten opzichte van horizontaal en maak een foto van opzij."],
      "mdc": null,
      "pfpsNote": "Vastgehouden knie ~90°; hangende knie ~80°, onbelast.",
      "sources": []
    },
    {
      "id": "heup_binnendraai",
      "name": "Heup binnendraai zittend",
      "unit": "graden",
      "sided": true,
      "groups": ["heupdraaiers"],
      "instructions": ["Zit op een tafelrand, knieën 90°.", "Draai je onderbeen naar buiten (dat is binnendraai van de heup) zonder je bekken te kantelen.", "Telefoon op je scheenbeen; lees de hoek af."],
      "mdc": null,
      "pfpsNote": "Knie 90° onbelast: oké.",
      "sources": []
    },
    {
      "id": "heup_buitendraai",
      "name": "Heup buitendraai zittend",
      "unit": "graden",
      "sided": true,
      "groups": ["heupdraaiers", "adductoren"],
      "instructions": ["Zit op een tafelrand, knieën 90°.", "Draai je onderbeen naar binnen (dat is buitendraai van de heup) zonder je bekken te kantelen.", "Telefoon op je scheenbeen; lees de hoek af."],
      "mdc": null,
      "pfpsNote": "Knie 90° onbelast: oké.",
      "sources": []
    },
    {
      "id": "overhead_reach",
      "name": "Reiken boven het hoofd",
      "unit": "cm",
      "sided": true,
      "groups": ["latissimus", "borstwervels"],
      "instructions": ["Sta met rug, onderrug en achterhoofd tegen de muur.", "Breng je gestrekte arm omhoog zonder dat je onderrug loskomt.", "Meet de afstand van je duim tot de muur."],
      "mdc": null,
      "pfpsNote": "Geen kniebetrokkenheid.",
      "sources": []
    },
    {
      "id": "foot_raise",
      "name": "Foot raise (aangepaste Grant-test)",
      "unit": "cm",
      "sided": true,
      "groups": ["hamstrings", "adductoren", "heupdraaiers"],
      "instructions": ["Sta met je gezicht naar de muur, tenen op een vaste afstand.", "Breng één voet zo hoog mogelijk langs de muur, zonder gewicht erop.", "Meet de hoogte van je teen (eventueel gedeeld door je lichaamslengte)."],
      "mdc": null,
      "pfpsNote": "Onbelast: oké. De foot-loading-variant (met gewichtsoverdracht) niet doen.",
      "sources": []
    },
    {
      "id": "rugkrab",
      "name": "Rugkraktest (achter de rug reiken)",
      "unit": "cm",
      "sided": true,
      "groups": ["schouder_achter", "borst", "triceps"],
      "instructions": ["Breng één hand over je schouder naar beneden en de andere van onderen omhoog op je rug.", "Schuif je vingers naar elkaar toe.", "Meet de afstand tussen je middelvingers; overlap telt negatief. 'Links' = linkerhand boven."],
      "mdc": null,
      "pfpsNote": "Geen kniebetrokkenheid.",
      "sources": []
    }
  ],
  "sources": [
    {
      "key": "adams1987",
      "citation": "Adams MA, Dolan P, Hutton WC (1987). Diurnal variations in the stresses on the lumbar spine. Spine 12(2):130–137."
    },
    {
      "key": "afonso2021",
      "citation": "Afonso J, e.a. (2021). Strength training is as effective as stretching for improving range of motion: a systematic review and meta-analysis. Healthcare 9(4):427.",
      "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8067745/"
    },
    {
      "key": "ashoury2024",
      "citation": "Ashoury H, Yalfani A (2024). The effectiveness of exercise programs on the quadratus lumborum muscle in patients with chronic non-specific low back pain: a systematic review. Feyz Med Sci J.",
      "url": "https://doaj.org/article/cd0f24cce7b1410b981244a8ad48dd51"
    },
    {
      "key": "behm2016",
      "citation": "Behm DG, Blazevich AJ, Kay AD, McHugh M (2016). Acute effects of muscle stretching on physical performance, range of motion, and injury incidence in healthy active individuals: a systematic review. Appl Physiol Nutr Metab 41(1):1–11."
    },
    {
      "key": "bennett2025",
      "citation": "Bennett e.a. (2025). Multilevel-meta-analyse van rekken en flexibiliteit (189 studies, 6.654 volwassenen). Sports Med 55(3).",
      "url": "https://link.springer.com/article/10.1007/s40279-024-02143-9"
    },
    {
      "key": "borstad2006",
      "citation": "Borstad JD, Ludewig PM (2006). Comparison of three stretches for the pectoralis minor muscle. J Shoulder Elbow Surg 15(3):324–330.",
      "url": "https://pubmed.ncbi.nlm.nih.gov/16679233/"
    },
    {
      "key": "bybee",
      "citation": "Bybee RF, Mamantov J, Meekins W, Witt J, Byars A, Greenwood M. Repeated extension versus static stretching of the lumbar spine in healthy adults (RCT, n=101). J Back Musculoskelet Rehabil.",
      "url": "https://content.iospress.com/articles/journal-of-back-and-musculoskeletal-rehabilitation/bmr00189"
    },
    {
      "key": "digiovanni2003",
      "citation": "DiGiovanni BF, e.a. (2003). Tissue-specific plantar fascia-stretching exercise enhances outcomes in patients with chronic heel pain: a prospective, randomized study. J Bone Joint Surg Am 85(7):1270–1277.",
      "url": "https://www.aafp.org/afp/2004/0215/p961.html"
    },
    {
      "key": "ergezen",
      "citation": "Ergezen G, Sahin M. Comparison of self-myofascial release and stretching exercises in individuals with piriformis syndrome: a randomised controlled trial (n=63).",
      "url": "https://citedrive.com/en/discovery/comparison-of-self-myofascial-release-and-stretching-exercises-in-individuals-with-piriformis-syndrome-a-randomised-controlled-trial"
    },
    {
      "key": "falvey2010",
      "citation": "Falvey EC, Clark RA, Franklyn-Miller A, Bryant AL, Briggs C, McCrory PR (2010). Iliotibial band syndrome: an examination of the evidence behind a number of treatment options. Scand J Med Sci Sports 20(4):580–587.",
      "url": "https://pubmed.ncbi.nlm.nih.gov/19706004/"
    },
    {
      "key": "fjerstad2018",
      "citation": "Fjerstad B, Hammer RL (2018). Comparison of two static stretching procedures on hip adductor flexibility and strength. Int J Exerc Sci 11(6):1074–1085.",
      "url": "https://pubmed.ncbi.nlm.nih.gov/30338021/"
    },
    {
      "key": "fredericson2002",
      "citation": "Fredericson M, White JJ, Macmahon JM, Andriacchi TP (2002). Quantitative analysis of the relative effectiveness of 3 iliotibial band stretches. Arch Phys Med Rehabil 83(5):589–592."
    },
    {
      "key": "gluteal2024",
      "citation": "Gluteal stretching vs. Lightback® on hip rotation range of motion and posterior chain flexibility in healthy subjects: a cross-over clinical trial (2024). PeerJ, doi 10.7717/peerj.18523.",
      "url": "https://peerj.com/articles/18523"
    },
    {
      "key": "gonzalez2024",
      "citation": "González-de-la-Flor Á, e.a. (2024). Comparison of two different stretching strategies to improve hip extension mobility in healthy and active adults: a crossover clinical trial. BMC Musculoskelet Disord.",
      "url": "https://doaj.org/article/51e5a0775e7e4cd1a9f6829b306d56c3"
    },
    {
      "key": "hanney2017",
      "citation": "Hanney WJ, Puentedura EJ, Kolber MJ, e.a. (2017). The immediate effects of manual stretching and cervicothoracic junction manipulation on cervical range of motion and upper trapezius pressure pain thresholds.",
      "url": "https://stars.library.ucf.edu/scopus2015/5086"
    },
    {
      "key": "herrington2014",
      "citation": "Herrington L, Horsley I (2014). Effects of latissimus dorsi length on shoulder flexion in canoeists, swimmers, rugby players, and controls. J Sport Health Sci.",
      "url": "https://doi.org/10.1016/j.jshs.2013.01.004"
    },
    {
      "key": "higgs2009",
      "citation": "Higgs F, Winter SL (2009). The effect of a four-week proprioceptive neuromuscular facilitation stretching program on isokinetic torque production. J Strength Cond Res 23(5):1442–1447.",
      "url": "https://kar.kent.ac.uk/47688"
    },
    {
      "key": "hipdyn2025",
      "citation": "RCT: training- en detrainingseffecten van 8 weken dynamisch heupbuigerrekken bij profvoetballers met lage rugpijn (n=40). J Sports Sci (2025).",
      "url": "https://lida.sport-iat.de/ta/Record/4094529?lng=en"
    },
    {
      "key": "jses2016",
      "citation": "Effects of two stretching methods on shoulder range of motion and muscle stiffness in baseball players with posterior shoulder tightness: a randomized controlled trial. J Shoulder Elbow Surg (2016) 25(9):1395–1403.",
      "url": "https://search.pedro.org.au/search-results/record-detail/47639"
    },
    {
      "key": "jssm2023",
      "citation": "Borstrekken 15 min per dag gedurende 8 weken (n=31): schouderbereik +9,8% en bankdrukken 1RM +7,4%. J Sports Sci Med (2023) 22:597–604.",
      "url": "https://www.jssm.org/jssm-22-597.xml-abst"
    },
    {
      "key": "kamankesh2014",
      "citation": "Kamankesh S, Tadibi V (2014). Effect of static stretching with different duration on strength and range of motion of wrist in female rock climbers. J Res Sport Rehabil 1(2):59–64.",
      "url": "https://rsr.basu.ac.ir/article_631_en.html"
    },
    {
      "key": "konrad2024",
      "citation": "Konrad A, e.a. (2024). Chronic effects of stretching on range of motion with consideration of potential moderating variables: a systematic review with meta-analysis. J Sport Health Sci 13(2):186–194.",
      "url": "https://www.sciencedirect.com/science/article/pii/S2095254623000571"
    },
    {
      "key": "konrad2025",
      "citation": "Konrad A, e.a. (2025). Detraining na rektraining: systematische review en meta-analyse (13 studies, n=556). Sports Med Open."
    },
    {
      "key": "lauersen2014",
      "citation": "Lauersen JB, Bertelsen DM, Andersen LB (2014). The effectiveness of exercise interventions to prevent sports injuries: a systematic review and meta-analysis of randomised controlled trials. Br J Sports Med 48(11):871–877."
    },
    {
      "key": "leeham2021",
      "citation": "Lee JH, Jang KM, Kim E, Rhim HC, Kim HD (2021). Effects of static and dynamic stretching with strengthening exercises in patients with patellofemoral pain who have inflexible hamstrings: a randomized controlled trial. Sports Health 13(1):49–56.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC7734366"
    },
    {
      "key": "leequad2021",
      "citation": "Lee JH, Jang KM, Kim E, Rhim HC, Kim HD (2021). Static and dynamic quadriceps stretching exercises in patients with patellofemoral pain: a randomized controlled trial (44 patiënten, geen controlegroep zonder rekken).",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC8404765"
    },
    {
      "key": "mcclure2007",
      "citation": "McClure P, Balaicuis J, Heiland D, Broersma ME, Thorndike CK, Wood A (2007). A randomized controlled comparison of stretching procedures for posterior shoulder tightness. J Orthop Sports Phys Ther 37(3):108–114.",
      "url": "https://search.pedro.org.au/search-results/record-detail/18480"
    },
    {
      "key": "nakamura2021",
      "citation": "Nakamura M, e.a. (2021). The comparison of different stretching intensities on the range of motion and muscle stiffness of the quadriceps muscles. Front Physiol 11:628870.",
      "url": "https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2020.628870"
    },
    {
      "key": "oliveira2013",
      "citation": "Oliveira-Campelo NM, de Melo CA, Alburquerque-Sendín F, Machado JP (2013). Short- and medium-term effects of manual therapy on cervical active range of motion and pressure pain sensitivity in latent myofascial pain of the upper trapezius muscle: a randomized controlled trial. J Manipulative Physiol Ther 36(5):300–309."
    },
    {
      "key": "piriswe2024",
      "citation": "Effective stretching positions of the piriformis muscle evaluated using shear wave elastography (21 gezonde mannen). J Sport Rehabil (2024).",
      "url": "https://pubmed.ncbi.nlm.nih.gov/38593993/"
    },
    {
      "key": "powden2015",
      "citation": "Powden CJ, Hoch JM, Hoch MC (2015). Reliability and minimal detectable change of the weight-bearing lunge test: a systematic review. Man Ther 20(4):524–532."
    },
    {
      "key": "powers2014",
      "citation": "Powers CM, Ho KY, Chen YJ, Souza RB, Farrokhi S (2014). Patellofemoral joint stress during weight-bearing and non-weight-bearing quadriceps exercises. J Orthop Sports Phys Ther 44(5):320–327."
    },
    {
      "key": "radford2006",
      "citation": "Radford JA, Burns J, Buchbinder R, Landorf KB, Cook C (2006). Does stretching increase ankle dorsiflexion range of motion? A systematic review. Br J Sports Med 40(10):870–875.",
      "url": "https://bjsm.bmj.com/content/40/10/870"
    },
    {
      "key": "reiner2023",
      "citation": "Reiner M, Gabriel A, Sommer D, Bernsteiner D, Tilp M, Konrad A (2023). Effects of a high-volume 7-week pectoralis muscle stretching training on muscle function and muscle stiffness. Sports Med Open 9:40.",
      "url": "https://pubmed.ncbi.nlm.nih.gov/37261567/"
    },
    {
      "key": "snook1998",
      "citation": "Snook SH, Webster BS, McGorry RW, Fogleman MT, McCann KB (1998). The reduction of chronic nonspecific low back pain through the control of early morning lumbar flexion. Spine 23(23):2601–2607."
    },
    {
      "key": "thomas2018",
      "citation": "Thomas E, Bianco A, Paoli A, Palma A (2018). The relation between stretching typology and stretching duration: the effects on range of motion. Int J Sports Med 39(4):243–254."
    },
    {
      "key": "thoraxokayama",
      "citation": "Quadruped versus staande thoracale rotatie, 2 weken, 39 gezonde deelnemers, zonder controlegroep (Okayama).",
      "url": "https://ousar.lib.okayama-u.ac.jp/en/search/p/16/item/67200?all=KIM"
    },
    {
      "key": "trunk2025",
      "citation": "Hatha-yoga met segmentale stabilisatie, 12 weken, 72 gezonde volwassenen: rompflexibiliteit. Slovenian J Public Health (2025).",
      "url": "https://reference-global.com/article/10.2478/sjph-2025-0019"
    },
    {
      "key": "warneke2025",
      "citation": "Warneke K, e.a. (2025). Delphi-consensus van 20 onderzoekers over rekken. J Sport Health Sci.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12305623/"
    },
    {
      "key": "watt2011",
      "citation": "Watt JR, e.a. (2011). Effect of a supervised hip flexor stretching program on gait in elderly individuals. PM R 3(4):324–329.",
      "url": "https://pubmed.ncbi.nlm.nih.gov/21497318/"
    },
    {
      "key": "willy2019",
      "citation": "Willy RW, e.a. (2019). Patellofemoral pain: clinical practice guidelines. J Orthop Sports Phys Ther 49(9):CPG1–CPG95.",
      "url": "https://www.jospt.org/doi/10.2519/jospt.2019.0302"
    },
    {
      "key": "winters2004",
      "citation": "Winters MV, Blake CG, Trost JS, e.a. (2004). Passive versus active stretching of hip flexor muscles in subjects with limited hip extension: a randomized clinical trial. Phys Ther 84(9):800–807.",
      "url": "https://search.pedro.org.au/search-results/record-detail/11191"
    },
    {
      "key": "witvrouw2000",
      "citation": "Witvrouw E, Lysens R, Bellemans J, Cambier D, Vanderstraeten G (2000). Intrinsic risk factors for the development of anterior knee pain in an athletic population: a two-year prospective study. Am J Sports Med 28(4):480–489."
    }
  ]
}
```
<!-- LIBRARY_JSON_END -->

---

## 11. Acceptatiecriteria en testvectoren

### 11.1 Testvectoren (gebruik als unit tests)

**A. Scores en sterren** (moeten exact zo uit `library.js` komen)

| Oefening | B·K·D·R·P | score | sterren | locked |
|---|---|---|---|---|
| `gastroc_muur` | 5·5·4·5·5 | 4.80 | 5.0 | false |
| `hamstring_pnf` | 5·5·5·5·4 | 4.85 | 5.0 | false |
| `rf_zijlig` | 3·4·4·4·4 | 3.75 | 4.0 | false |
| `heupbuiger_dyn` | 4·4·4·5·5 | 4.30 | 4.5 | false |
| `figuur4_muur` | 2·4·4·4·4 | 3.50 | 3.5 | false |
| `nek_trapezius` | 3·5·4·2·5 | 3.85 | 4.0 | false |
| `quad_hiel_bil` | 3·2·3·3·5 | 3.05 | 2.0 | true |
| `heupbuiger_halfgeknield` | 4·2·5·5·4 | 3.85 | 2.0 | true |
| `kikker` | 3·1·5·4·3 | 3.05 | 2.0 | true |
| `triceps_overhead` | 1·5·4·2·5 | 3.35 | 3.5 | false |

**B. Totale tijd van de sjablonen** (§6.8.1)

| Sjabloon | verwacht | berekend |
|---|---|---|
| O5 | 305 s | 305 s |
| O10 | 610 s | 610 s |
| O15 | 900 s | 900 s |
| A5 | 295 s | 295 s |
| A10 | 615 s | 615 s |
| A15 | 885 s | 885 s |

**C. Weekdosis STANDAARD** (O10 + A10, elk 7× per week): exact de middelste kolom van de tabel in §6.4.3. Steekproef: gastrocnemius 315 s, soleus 367,5 s, hamstrings 630 s, rectus femoris 315 s, heupbuigers 157,5 s (+297,5 s dynamisch), adductoren 420 s, heupdraaiers 315 s.

**D. Testroutine T1** — moment ochtend, vóór een run aan, 5× per week. Stappen: `gastroc_muur` 45 s/kant, `soleus_muur` 30 s/kant, `hamstring_zittend_vouw` 60 s, `heupbuiger_dyn` 30 s/kant.

- Totale tijd: 5 + 45 + 5 + 45 + 5 + 30 + 5 + 30 + 15 + 60 + 15 + 30 + 5 + 30 = **325 s** (automatische overgangen 5, 15 en 15 s).
- Waarschuwingen: W2 (hamstring_zittend_vouw); W3 (hamstrings); geen W4; geen W5; W6 (gastrocnemius, soleus); W7 (heupbuigers).
- Weekdosis per kant: Kuit: gastrocnemius 225 s; Kuit: soleus 262,5 s; Hamstrings 300 s; Heupbuigers (iliopsoas) 0 s (+150 s dyn.); Onderrug 150 s.

**E. Extra set zwakke kant** — `gastroc_muur` 45 s/kant met `extraWeakSide: 'L'`, 3× per week: totale tijd 5 + 45 + 5 + 45 + 5 + 45 = **150 s**; gastrocnemius L 270 s, R 135 s; de meter toont de laagste (135 s).

**F. Ontgrendelprotocol** (§6.6)

- **U1:** `couch_stretch` starten met alle voorwaarden bevestigd → status `test`. Beginwaarde 1, tijdens 1, na 24 u 1, na 48 u 1 → `voorlopig`, teller 1.
- **U2:** vervolg op U1, twee blootstellingen in een routine met ≥48 u ertussen, elke cyclus 1/1/1 → na de tweede: teller 3 → `vrij`. Een derde gebruik binnen 48 u ná een blootstelling in `voorlopig` geeft W9.
- **U3:** test met beginwaarde 0 en na 24 u 1 → niet schoon (hoger dan de beginwaarde) → `vergrendeld`, afkoelperiode 7 dagen, geen opvlammingsvoorstel (alles ≤2).
- **U4:** `voorlopig` met na 48 u 3/10 → `vergrendeld` met afkoelperiode, en de opvlammingsmodus gaat automatisch aan.

**G. Opvlammingsmodus** (§6.7)

- **F1:** modus aan → `rf_zijlig` (90°) geblokkeerd met W8, `enkel_rock` (45°) en `heupbuiger_dyn` (45°) toegestaan; een oefening in `vrij` gaat naar `vergrendeld`. O5 speelt volledig af; A5 alleen zonder `rf_zijlig` (totaal dan 5 + 95 + 15 + 75 = 190 s).
- **F2:** dagelijkse kniechecks 2, 1, 0, 2, 1, 1, 2 op zeven opeenvolgende dagen → op dag 7 het voorstel om de modus te beëindigen. Met één dag zonder check ertussen → geen voorstel.

### 11.2 Functioneel

- [ ] De bibliotheek laadt 70 oefeningen en 24 spiergroepen; de validator (§9.2) slaagt; een met de hand verhoogde `score` wordt geweigerd.
- [ ] Sterren en balkjes op de kaart komen exact overeen met `stars` en `scores`.
- [ ] Filters en sortering werken samen; "toon vergrendelde" uit verbergt alle 10 vergrendelde oefeningen.
- [ ] De bouwer toont de totale tijd live en die is gelijk aan de som van de gecompileerde timeline (0 s verschil); slepen, toevoegen en verwijderen werken die direct bij.
- [ ] Een vergrendelde oefening kan niet worden toegevoegd of afgespeeld (W1); in de opvlammingsmodus geldt dat ook voor alles met `kneeFlexionMaxDeg > 45` (W8).
- [ ] W2 tot en met W7 en W9 verschijnen precies bij de condities uit §6.5 (zie testroutine T1 in §11.1).
- [ ] "Mijn week" toont gepland en werkelijk; de waarden voor STANDAARD zijn gelijk aan de tabel in §6.4.3.
- [ ] Ontgrendelprotocol: scenario's U1 tot en met U4 in §11.1 geven de verwachte status.
- [ ] Opvlammingsmodus: scenario's F1 en F2 in §11.1 geven het verwachte gedrag.
- [ ] Alle zes sjablonen spelen af; de gemeten duur wijkt hooguit 2 s af van `expectedTotalSec`.
- [ ] Een kantwissel wordt aangekondigd met spraak, piep en flits; pauze en hervatten behouden de resterende tijd tot op 0,2 s.
- [ ] PNF loopt per kant 2 × (5 s aanspannen + 25 s rekken) met de juiste cues.
- [ ] Een sessie wordt gelogd met tijdzone, status en `segmentsDone`; de werkelijke dosis neemt toe met precies die seconden.
- [ ] De CSV-export opent correct in Excel (puntkomma, UTF-8 met BOM); de JSON-import herstelt alles.
- [ ] Weging aanpassen verandert de getoonde sterren, niet de knie-poort, en "terug naar standaard" herstelt 25/25/20/15/15.

### 11.3 Platform (echte iPhone met iOS ≥ 18.4 en een Android-telefoon met Chrome)

- [ ] Offline (vliegtuigmodus): de app opent en speelt een routine af.
- [ ] iOS-beginschermapp: het scherm blijft 15 minuten aan; na wisselen van app wordt de wake lock opnieuw aangevraagd.
- [ ] iOS met de stille schakelaar aan en "Geluid ook in stille modus": piepjes en spraak zijn hoorbaar. Met "Mixen met muziek": muziek speelt door en de schakelaar dempt de app.
- [ ] Android trilt bij een kantwissel en aan het eind; iOS geeft geen fouten zonder trillen.
- [ ] Geen Nederlandse stem → alleen piepjes plus een melding, geen crash.
- [ ] Scherm vergrendeld met auto-pauze → na ontgrendelen PAUSED met de juiste resterende tijd.
- [ ] `persist()` is aangevraagd en de status staat in de instellingen; de exportherinnering verschijnt na 14 dagen.
- [ ] De `.ics` importeert in Apple Agenda en Google Agenda met dagelijkse herhaling en alarm.
- [ ] Lighthouse: installeerbaar. Een nieuwe service worker activeert pas na "Update beschikbaar → herladen".

---

## 12. Bronnen

- Adams MA, Dolan P, Hutton WC (1987). Diurnal variations in the stresses on the lumbar spine. Spine 12(2):130–137.
- Afonso J, e.a. (2021). Strength training is as effective as stretching for improving range of motion: a systematic review and meta-analysis. Healthcare 9(4):427. <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8067745/>
- Ashoury H, Yalfani A (2024). The effectiveness of exercise programs on the quadratus lumborum muscle in patients with chronic non-specific low back pain: a systematic review. Feyz Med Sci J. <https://doaj.org/article/cd0f24cce7b1410b981244a8ad48dd51>
- Behm DG, Blazevich AJ, Kay AD, McHugh M (2016). Acute effects of muscle stretching on physical performance, range of motion, and injury incidence in healthy active individuals: a systematic review. Appl Physiol Nutr Metab 41(1):1–11.
- Bennett e.a. (2025). Multilevel-meta-analyse van rekken en flexibiliteit (189 studies, 6.654 volwassenen). Sports Med 55(3). <https://link.springer.com/article/10.1007/s40279-024-02143-9>
- Borstad JD, Ludewig PM (2006). Comparison of three stretches for the pectoralis minor muscle. J Shoulder Elbow Surg 15(3):324–330. <https://pubmed.ncbi.nlm.nih.gov/16679233/>
- Borstrekken 15 min per dag gedurende 8 weken (n=31): schouderbereik +9,8% en bankdrukken 1RM +7,4%. J Sports Sci Med (2023) 22:597–604. <https://www.jssm.org/jssm-22-597.xml-abst>
- Bybee RF, Mamantov J, Meekins W, Witt J, Byars A, Greenwood M. Repeated extension versus static stretching of the lumbar spine in healthy adults (RCT, n=101). J Back Musculoskelet Rehabil. <https://content.iospress.com/articles/journal-of-back-and-musculoskeletal-rehabilitation/bmr00189>
- DiGiovanni BF, e.a. (2003). Tissue-specific plantar fascia-stretching exercise enhances outcomes in patients with chronic heel pain: a prospective, randomized study. J Bone Joint Surg Am 85(7):1270–1277. <https://www.aafp.org/afp/2004/0215/p961.html>
- Effective stretching positions of the piriformis muscle evaluated using shear wave elastography (21 gezonde mannen). J Sport Rehabil (2024). <https://pubmed.ncbi.nlm.nih.gov/38593993/>
- Effects of two stretching methods on shoulder range of motion and muscle stiffness in baseball players with posterior shoulder tightness: a randomized controlled trial. J Shoulder Elbow Surg (2016) 25(9):1395–1403. <https://search.pedro.org.au/search-results/record-detail/47639>
- Ergezen G, Sahin M. Comparison of self-myofascial release and stretching exercises in individuals with piriformis syndrome: a randomised controlled trial (n=63). <https://citedrive.com/en/discovery/comparison-of-self-myofascial-release-and-stretching-exercises-in-individuals-with-piriformis-syndrome-a-randomised-controlled-trial>
- Falvey EC, Clark RA, Franklyn-Miller A, Bryant AL, Briggs C, McCrory PR (2010). Iliotibial band syndrome: an examination of the evidence behind a number of treatment options. Scand J Med Sci Sports 20(4):580–587. <https://pubmed.ncbi.nlm.nih.gov/19706004/>
- Fjerstad B, Hammer RL (2018). Comparison of two static stretching procedures on hip adductor flexibility and strength. Int J Exerc Sci 11(6):1074–1085. <https://pubmed.ncbi.nlm.nih.gov/30338021/>
- Fredericson M, White JJ, Macmahon JM, Andriacchi TP (2002). Quantitative analysis of the relative effectiveness of 3 iliotibial band stretches. Arch Phys Med Rehabil 83(5):589–592.
- Gluteal stretching vs. Lightback® on hip rotation range of motion and posterior chain flexibility in healthy subjects: a cross-over clinical trial (2024). PeerJ, doi 10.7717/peerj.18523. <https://peerj.com/articles/18523>
- González-de-la-Flor Á, e.a. (2024). Comparison of two different stretching strategies to improve hip extension mobility in healthy and active adults: a crossover clinical trial. BMC Musculoskelet Disord. <https://doaj.org/article/51e5a0775e7e4cd1a9f6829b306d56c3>
- Hanney WJ, Puentedura EJ, Kolber MJ, e.a. (2017). The immediate effects of manual stretching and cervicothoracic junction manipulation on cervical range of motion and upper trapezius pressure pain thresholds. <https://stars.library.ucf.edu/scopus2015/5086>
- Hatha-yoga met segmentale stabilisatie, 12 weken, 72 gezonde volwassenen: rompflexibiliteit. Slovenian J Public Health (2025). <https://reference-global.com/article/10.2478/sjph-2025-0019>
- Herrington L, Horsley I (2014). Effects of latissimus dorsi length on shoulder flexion in canoeists, swimmers, rugby players, and controls. J Sport Health Sci. <https://doi.org/10.1016/j.jshs.2013.01.004>
- Higgs F, Winter SL (2009). The effect of a four-week proprioceptive neuromuscular facilitation stretching program on isokinetic torque production. J Strength Cond Res 23(5):1442–1447. <https://kar.kent.ac.uk/47688>
- Kamankesh S, Tadibi V (2014). Effect of static stretching with different duration on strength and range of motion of wrist in female rock climbers. J Res Sport Rehabil 1(2):59–64. <https://rsr.basu.ac.ir/article_631_en.html>
- Konrad A, e.a. (2024). Chronic effects of stretching on range of motion with consideration of potential moderating variables: a systematic review with meta-analysis. J Sport Health Sci 13(2):186–194. <https://www.sciencedirect.com/science/article/pii/S2095254623000571>
- Konrad A, e.a. (2025). Detraining na rektraining: systematische review en meta-analyse (13 studies, n=556). Sports Med Open.
- Lauersen JB, Bertelsen DM, Andersen LB (2014). The effectiveness of exercise interventions to prevent sports injuries: a systematic review and meta-analysis of randomised controlled trials. Br J Sports Med 48(11):871–877.
- Lee JH, Jang KM, Kim E, Rhim HC, Kim HD (2021). Effects of static and dynamic stretching with strengthening exercises in patients with patellofemoral pain who have inflexible hamstrings: a randomized controlled trial. Sports Health 13(1):49–56. <https://pmc.ncbi.nlm.nih.gov/articles/PMC7734366>
- Lee JH, Jang KM, Kim E, Rhim HC, Kim HD (2021). Static and dynamic quadriceps stretching exercises in patients with patellofemoral pain: a randomized controlled trial (44 patiënten, geen controlegroep zonder rekken). <https://pmc.ncbi.nlm.nih.gov/articles/PMC8404765>
- McClure P, Balaicuis J, Heiland D, Broersma ME, Thorndike CK, Wood A (2007). A randomized controlled comparison of stretching procedures for posterior shoulder tightness. J Orthop Sports Phys Ther 37(3):108–114. <https://search.pedro.org.au/search-results/record-detail/18480>
- Nakamura M, e.a. (2021). The comparison of different stretching intensities on the range of motion and muscle stiffness of the quadriceps muscles. Front Physiol 11:628870. <https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2020.628870>
- Oliveira-Campelo NM, de Melo CA, Alburquerque-Sendín F, Machado JP (2013). Short- and medium-term effects of manual therapy on cervical active range of motion and pressure pain sensitivity in latent myofascial pain of the upper trapezius muscle: a randomized controlled trial. J Manipulative Physiol Ther 36(5):300–309.
- Powden CJ, Hoch JM, Hoch MC (2015). Reliability and minimal detectable change of the weight-bearing lunge test: a systematic review. Man Ther 20(4):524–532.
- Powers CM, Ho KY, Chen YJ, Souza RB, Farrokhi S (2014). Patellofemoral joint stress during weight-bearing and non-weight-bearing quadriceps exercises. J Orthop Sports Phys Ther 44(5):320–327.
- Quadruped versus staande thoracale rotatie, 2 weken, 39 gezonde deelnemers, zonder controlegroep (Okayama). <https://ousar.lib.okayama-u.ac.jp/en/search/p/16/item/67200?all=KIM>
- Radford JA, Burns J, Buchbinder R, Landorf KB, Cook C (2006). Does stretching increase ankle dorsiflexion range of motion? A systematic review. Br J Sports Med 40(10):870–875. <https://bjsm.bmj.com/content/40/10/870>
- RCT: training- en detrainingseffecten van 8 weken dynamisch heupbuigerrekken bij profvoetballers met lage rugpijn (n=40). J Sports Sci (2025). <https://lida.sport-iat.de/ta/Record/4094529?lng=en>
- Reiner M, Gabriel A, Sommer D, Bernsteiner D, Tilp M, Konrad A (2023). Effects of a high-volume 7-week pectoralis muscle stretching training on muscle function and muscle stiffness. Sports Med Open 9:40. <https://pubmed.ncbi.nlm.nih.gov/37261567/>
- Snook SH, Webster BS, McGorry RW, Fogleman MT, McCann KB (1998). The reduction of chronic nonspecific low back pain through the control of early morning lumbar flexion. Spine 23(23):2601–2607.
- Thomas E, Bianco A, Paoli A, Palma A (2018). The relation between stretching typology and stretching duration: the effects on range of motion. Int J Sports Med 39(4):243–254.
- Warneke K, e.a. (2025). Delphi-consensus van 20 onderzoekers over rekken. J Sport Health Sci. <https://pmc.ncbi.nlm.nih.gov/articles/PMC12305623/>
- Watt JR, e.a. (2011). Effect of a supervised hip flexor stretching program on gait in elderly individuals. PM R 3(4):324–329. <https://pubmed.ncbi.nlm.nih.gov/21497318/>
- Willy RW, e.a. (2019). Patellofemoral pain: clinical practice guidelines. J Orthop Sports Phys Ther 49(9):CPG1–CPG95. <https://www.jospt.org/doi/10.2519/jospt.2019.0302>
- Winters MV, Blake CG, Trost JS, e.a. (2004). Passive versus active stretching of hip flexor muscles in subjects with limited hip extension: a randomized clinical trial. Phys Ther 84(9):800–807. <https://search.pedro.org.au/search-results/record-detail/11191>
- Witvrouw E, Lysens R, Bellemans J, Cambier D, Vanderstraeten G (2000). Intrinsic risk factors for the development of anterior knee pain in an athletic population: a two-year prospective study. Am J Sports Med 28(4):480–489.
