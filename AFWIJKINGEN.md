# Afwijkingen van de spec

Elke bewuste afwijking van `rekapp-spec-v2.md`, met reden, plus de keuzes
waar de spec geen of een tegenstrijdig antwoord gaf.

## Besluiten Oscar (26-10-2026)

### Kniefuncties achter een instelling, standaard uit (aanvulling op §6.11)
Oscar: "Haal alles met kniebewust en bescherming enzo uit de app, dat is
alleen voor mijzelf belangrijk." Alles over de knie zit nu achter de
schakelaar **Kniefuncties** (Instellingen → Knie), standaard uit. Uit:
- de sterren rekenen zonder K (B, D, R en P naar verhouding; `rate()` deelt
  door de som van de gewichten, exact in gehele getallen). Bij "Weging
  aanpassen" staat K er niet bij; de verborgen K vangt het verschil op, zodat
  de opgeslagen weging samen 100 % blijft en een export/import ongewijzigd
  werkt;
- geen opvlammingsmodus: de app rekent met `effectiveKnee()` (`knee.js`),
  een lege kniestatus. `access` blijft de ene poort; alleen de status die
  erin gaat, hangt af van de instelling. De opgeslagen status blijft
  bewaard en geldt weer zodra Kniefuncties aan gaan;
- geen kniekaarten, geen knop "Ik heb een opvlamming", geen kniebadges, geen
  filter "alleen K ≥ 4", geen deelscore K en geen kniedeel op de kaart, geen
  knie-informatie in de speler en bij de zelftests, geen vraag "Kniepijn
  tijdens", geen kniechecks in het logboek, geen `kniechecks.csv` in de
  export, en op "Over" de sterren zonder K.

Uitzetten tijdens een opvlamming vraagt eerst een bevestiging. Wie al
kniechecks of een opvlamming had (of een kniestatus die niet te lezen is),
houdt Kniefuncties aan bij de update (`migrateKneeFeatures`): anders zou een
lopende opvlamming ongemerkt vervallen. Teksten en gedrag staan in §6.11 van
de spec. Wat blijft: knieverwijzingen in de teksten van de oefeningen zelf
(voor- en nadelen, cues) en in de rubrieken (R: "of in verband gebracht met
PFP"), omdat `data/library.json` niet met de hand verandert.

**Reden:** keuze van Oscar; de knieregels zijn persoonlijk en horen niet in
de standaardapp. De punten hieronder over de opvlammingsmodus ("blijft
hard") gelden zolang Kniefuncties aan staan.

### Trainingsoefeningen voor heupen en enkels (aanvulling op §3.1, §4, §5, §6.1–6.5)
Op basis van twee documenten van Oscar (heupgerichte oefentherapie bij PFP;
de RunLab-video over enkelstabiliteit) staan er 14 trainingsoefeningen in de
bibliotheek: 6 voor de heupen, 8 voor de enkels. Keuzes:
- **Selectie heupen:** de kern van het concrete programma uit het document,
  over beide vlakken: zijliggende abductie, zijsteun en staande abductie met
  band (frontaal), eenbenige bridge en eenbenige RDL (sagittaal), en de
  eenbenige squat voor de spiegel (geïntegreerd, met feedback). Niet
  opgenomen: hip hitch, hip thrust, isometrische abductie, clamshell,
  monster walks en lateral step-up (overlappen met deze zes, of vragen een
  bank en zwaar gewicht), en gait retraining en afdaaltraining (horen bij
  het lopen, niet in de app). Op verzoek van Oscar zonder filter op
  kniebelasting.
- **Enkels:** alle acht uit de video, in de volgorde van de video. De
  aannames uit het document zijn overgenomen en als "Onzeker" op de kaart
  gezet (veld `uncertain`): de standknie aantikken, de draairichting bij de
  RDL, landen zonder terugveren, de band alleen bij de in-uit sprongen.
- **Sterren:** dezelfde vijf deelscores; B en D met een eigen rubriek voor
  training (§3.1), de reden voor elke B in `bNote`. B is per oefening voor
  het doel van het sjabloon, niet het rekbewijs van de groep. Het document
  geeft eigen sterren ("geen gevalideerde score"); die zijn niet overgenomen.
  B5 komt nu niet voor: ik heb niet kunnen nagaan welke oefeningen precies in
  de RCT's van de meta-analyse zaten (alleen Fukuda 2012 via het document),
  dus hoogstens B4.
- **Nieuwe spiergroep `enkel`** (stabilisatoren: kuitbeenspieren, tibialis
  posterior) met een eigen regio op de lichaamskaart (enkels, voor en
  achter). Er zijn geen rekoefeningen voor; "Mijn week" toont de groep
  daarom niet.
- **Rekdosis:** training telt niet mee in de dosis (§6.4.1), niet voor W4
  (de 15 minuten gaan over rekken) en niet voor W5–W7. W2 en W8 gelden wel.
- **Doseringen:** uit de documenten (heupen 3 sets; runner's touch 10 per
  kant; step-up en Bulgarian 2 × 8, een aanvulling). De tijd per set is een
  schatting van ~3–5 s per herhaling; de timer geeft dat venster, de speler
  noemt het aantal herhalingen.
- **Knie:** drie oefeningen zijn vergrendeld volgens §9.2 (step-up K2,
  Bulgarian split squat K1 en >90°, drop landing K2). Dat blokkeert niets
  meer (knieslot verwijderd); met Kniefuncties aan houdt een opvlamming ze
  tegen (W8).
- **Stokfiguren:** 14 nieuwe, in `js/figures/training.js`; zijlig, zijsteun,
  eenbenige squat en RDL met rotatie in 3D. Nieuw in de tekening: een
  gewicht of bal in de hand (`weights`) en een koepel voor de BOSU.
- Bronnen: Fukuda 2012, Nascimento 2018, Collins 2018, Boren 2011,
  Distefano 2009, Selkowitz 2013, Moore 2020, Willy 2011, Nunes 2023,
  Hupperets 2009, Eihara 2022, Llanos-Lagos 2024 en de RunLab-video. Ik heb
  ze niet zelf nagelezen; de citaten komen uit de documenten van Oscar,
  aangevuld met de titels zoals ik ze ken. Bij twijfel over auteurs staat er
  "e.a.".

### Sets met rusttimer (aanvulling op §6.3, §6.4.1, §6.8)
Voor de trainingssjablonen ("Sets met rusttimer", keuze Oscar). Een stap
kan 1–5 sets hebben met 10–180 s rust ertussen (standaard 60 s), voor elke
oefening behalve PNF (die heeft rondes). Een unilaterale stap speelt per set
links en rechts en dan de rust, zodat de ene kant herstelt terwijl de andere
werkt; de extra set zwakke kant komt na de laatste set. De rust is een eigen
segment ("Rust. 60 seconden.", oranje ring, de volgende houding in beeld, de
3-2-1 aan het eind) en telt niet als gedaan werk. ⏭ tijdens de rust slaat de
rust over en start de volgende set: de spec zegt "⏭ = volgende oefening",
maar midden in een oefening met sets is "klaar met rusten" de vraag die je
hebt. De weekdosis telt elke set. Met 1 set (alle bestaande routines en
sjablonen) is de tijdlijn precies als voorheen; de testvectoren zijn
ongewijzigd.

## Besluiten Oscar (23-10-2026)

Deze besluiten gaan vóór de spec en vóór oudere punten in dit bestand. Waar
een ouder punt hieronder over het knieslot gaat, staat het als vervallen
gemarkeerd.

### Knieslot met 48-uurstest verwijderd (wijkt af van §3.2, §6.6, §6.5, §6.11)
Oscar vroeg het knieslot eruit te halen. De 10 oefeningen met K ≤ 2 (of meer
dan 90° kniebuiging) zijn gewoon toe te voegen en af te spelen.
- Weg: W1 en W9, het ontgrendelscherm (`#/ontgrendelen/…`), de proefperiode,
  de 24- en 48-uurschecks, de afkoelperiode, "Ontgrendelingen resetten" en
  de instelling "Vergrendelde oefeningen tonen" met het filter "toon
  vergrendelde" (§6.1). Ook "Kniepijn nu" vóór een routine (dat was de
  beginwaarde van de cyclus) en de verplichte pijnkiezer op het
  afrondscherm vervallen; daar staat weer gewoon de schuif "Kniepijn
  tijdens".
- Blijft hard: de **opvlammingsmodus** (§6.7). Tijdens een opvlamming staat
  alles boven 45° uit (W8), dus ook alle tien oefeningen met K ≤ 2, via
  dezelfde ene poort (`access` in `knee.js`) voor bibliotheek, kiezer,
  bouwer, kaart, "Probeer nu" en speler. Aan bij een dagelijkse kniecheck
  boven 2/10 of handmatig; uit na 7 dagen op rij ≤ 2/10.
- Blijft: de **dagelijkse kniecheck**.
- Op de kaart van een oefening met K ≤ 2 staat een gewone notitie (geen
  blokkade): "Lage kniescore (K…). Let zelf op je knie: pijn tijdens en na
  hooguit 2/10."
- `data/library.json` is niet veranderd: het veld `locked` en de kniecap
  in de sterren staan er nog in, en de validator (§9.2) controleert ze nog.
  De app gebruikt `locked` alleen niet meer om te blokkeren.
- Opslag en import: de store `unlocks` blijft bestaan (geen nieuwe
  databaseversie) maar wordt bij elke opslag van de kniestatus leeggemaakt.
  Een export bevat `unlocks: {}`, zodat een oudere versie van de app het
  bestand nog kan lezen. Een oudere export met ontgrendelingen is gewoon te
  importeren; de ontgrendelingen gaan niet mee (met een melding). Oude
  kniechecks (context test, 24u, 48u) blijven in het logboek.
- Tests: de vectoren U1–U4 (§11.1 F) en de protocoltests zijn vervallen. G
  (F1, F2) staat er nog, zonder het deel "vrij → vergrendeld" van F1, dat
  over het knieslot ging. De verwachte uitkomsten van F1 (rf_zijlig W8, O5
  volledig, A5 190 s) zijn ongewijzigd.

**Reden:** keuze van Oscar. De afweging (de K-scores zijn voorzorg, geen
bewezen schade, §6.12) ligt bij hem; de opvlammingsmodus vangt een
opspelende knie nog steeds af.

### Sterren zonder kniecap in beeld (wijkt af van §3.2)
De app toont de sterren zoals de score ze geeft, ook bij K ≤ 2 (bv. kikker
3,05 → 3 sterren in plaats van 2). Alleen de weergave verandert: `rate()` in
`library.js`. De bibliotheek houdt de gecapte sterren en de validator
controleert die nog volgens §3.2; de testvectoren A staan letterlijk in de
tests, nu tegen de validatorberekening. Het scherm "Over" noemt de regel
"knie-poort: als K ≤ 2 …" niet meer en legt uit dat de app zonder knie-poort
toont. **Reden:** keuze van Oscar; met het knieslot weg zou een cap van 2
sterren een slot suggereren dat er niet meer is.

### PNF hoogstens 180 s per kant (beslist open punt uit M4)
Rondes × (aanspannen + rekken) is per kant hoogstens 180 s, net als de 180 s
van de andere oefeningen (§6.3). De grenzen per veld uit §9.1 blijven (rondes
1–5, aanspannen 3–10 s, rekken 10–60 s). In de bouwer doet "+" niets meer als
de som anders boven 180 s komt; de notitie toont de huidige som. De validator
weigert meer dan 180 s. Een opgeslagen of geïmporteerde routine van daarvoor
wordt bij het laden ingekort (eerst rondes, dan rekken, dan aanspannen) en
niet weggegooid, met een melding. **Reden:** keuze van Oscar, op basis van
het onderzoek: ACSM (Garber 2011, gelezen via een secundaire bron) noemt 3–6 s aanspannen gevolgd door 10–30 s rekken, 2–4
herhalingen en ~60 s per spiergroep per sessie; de grootste winst zit in de
eerste herhaling (Sharman 2006).

### Opvlammingsmodus terugdraaien binnen 24 uur (aanvulling op §6.7)
Per ongeluk aangezet (een verkeerde tik op "Aanzetten", of een kniecheck van
3/10 die 1/10 had moeten zijn): tot 24 uur na het aanzetten staat er een
knop "Terugdraaien" in de opvlammingsbanner en in Instellingen → Knie. Eerst
een bevestiging ("Doe dit alleen als je hem per ongeluk hebt aangezet"),
daarna is de modus uit. De kniechecks blijven in het logboek. Na 24 uur geldt
weer alleen de weg van §6.7 (7 dagen op rij ≤ 2/10). De klok-terug-controle
geldt ook hier: ligt "nu" vóór het aanzetten, dan kan het niet. **Reden:**
keuze van Oscar; zonder deze knop zat je na een vergissing 7 dagen vast.

## Geanimeerde stokfiguren (§6.2 fase 2, afgesproken met Oscar)

Fase 2 van §6.2 ("eigen eenvoudige stokfiguren per oefening"): eerst als proef
voor drie oefeningen, daarna op verzoek van Oscar voor alle oefeningen uit de
bibliotheek. Een test controleert dat elke oefening een figuur heeft; de
lichaamskaart blijft, het positie-icoon vervalt waar een figuur staat.

- **Vorm (wijkt af van `img/ex/<id>.svg`):** geen los SVG-bestand per
  oefening, maar één gedeeld skelet (`js/figures/rig.js`) met houdingen per
  oefening, gegroepeerd naar positie (`staand.js`, `stoel.js`, `vloer.js`,
  `liggend.js`), puur en getest; tekenen in `js/ui/figure.js`.
  **Reden:** zo beweegt het figuur mee met de timer van de speler (staat stil
  bij pauze, aanspannen en loslaten vallen samen met de PNF-fasen, het ritme
  van dynamische oefeningen volgt de dosering), werkt het in Safari en Chrome
  hetzelfde (geen CSS-animaties in SVG) en blijven alle figuren in dezelfde
  stijl. Handen en voeten staan vast waar de houding dat zegt (muur, vloer,
  stoel, band); knieën en ellebogen rekent de module uit.
- **Aanzichten:** standaard zijaanzicht met het gezicht naar rechts; de verre
  arm en het verre been zijn gedimd. Waar een plat zijaanzicht de oefening
  niet laat zien, een vooraanzicht (o.a. zijwaarts buigen, nek, triceps boven
  het hoofd, gebedshouding) of een schuin aanzicht in 3D op een mat (kikker,
  duif, 90/90, piriformis diagonaal, rectus femoris zijlig, zijlig aan de
  bedrand, open boek, sleeper, spreidzit tegen de muur, vlinder, rugdraai,
  banaan, been over het lichaam, borst op de handdoekrol, heup-CAR en poort
  open). Die 3D-houdingen rekent `js/figures/rig3d.js` uit en projecteert een
  vaste camera per figuur naar het beeld: eigen code, geen bibliotheek. In 3D
  wordt het been of de arm gedimd die in de rekstand duidelijk verder weg ligt
  dan zijn tegenhanger, behalve als alleen dat lid rekt. Aanleiding: Oscar
  vond de kikker van boven gezien niet te lezen; bij een controle tegen
  beschrijvingen van de standaarduitvoering bleek dat ook voor de andere
  figuren van boven en voor de draaiende oefeningen te gelden. Draaien van het
  hoofd (nek: neus naar oksel) blijft lastig te tonen: het hoofd is een cirkel.
- **Knie:** een test controleert in elke houding en in tussenstanden dat de
  tekening de knie nooit verder buigt dan `kneeFlexionMaxDeg` uit de
  bibliotheek (+0,5° in de houdingen, +4° in tussenstanden door afronding).
  Bij 3D-figuren meet de test de echte hoek in de ruimte. Een voorverkort been
  in 2D (alleen nog bij figuur-4 tegen de muur) kan de test niet meten en slaat
  hij over; waar het niet rekkende been bewust verder buigt (bijv. het
  onderste been bij zijlig aan de bedrand), noemt de figuur expliciet welk
  been telt (`kneeCheck`). Waar de bibliotheek de knie op 90° begrenst (kikker,
  duif, 90/90), volgt de houding die grens: bij de kikker schuiven de billen
  dus terug tot boven de knieën, niet verder.
- **Kaart:** een paneel met de demo direct onder de kop. De demo loopt alleen
  als hij in beeld is, en heeft een knop "Animatie pauzeren" / "Animatie
  afspelen" (bewegend beeld langer dan 5 s moet te pauzeren zijn). Die twee
  teksten zijn eigen teksten; de spec geeft ze niet.
- **Speler:** het figuur staat waar het positie-icoon stond, naast de
  lichaamskaart, en volgt het segment: voorbereiding en wissels in de
  beginhouding, statisch rekken gaat in ruim 2 s naar de rekstand, PNF toont
  aanspannen (streepjes bij de voet) en loslaten (been verder), dynamisch
  herhaalt de beweging in het tempo van de standaarddosering.
- **Instelling "Groot stokfiguur"** (Instellingen → Speler, standaard uit,
  keuze Oscar): het figuur in de speler wordt groter en de timerring kleiner;
  de cijfers blijven even groot. Eigen tekst; de spec kent deze instelling
  niet.
- **Instelling "3D-figuren"** (Instellingen → Weergave, standaard uit, keuze
  Oscar): alle stokfiguren schuin in 3D. Figuren uit zijaanzicht worden
  automatisch opgetild (`js/figures/lift.js`): de nabije kant komt naar
  voren, de verre naar achteren, en een hand die een punt aan de andere kant
  vastpakt gaat mee naar die diepte. Vloer, muren, bedden en treden worden
  vlakken en blokken. Figuren uit vooraanzicht kennen geen diepte en blijven
  in 3D plat; van opzij gezien is dat te zien. Het beeldkader rekent de app
  per figuur uit.
- **Ronddraaien** (oefeningkaart, alleen bij een 3D-figuur): opzij vegen over
  het figuur draait de camera rond; omhoog en omlaag vegen blijft scrollen. Een
  klein draai-icoon rechtsonder wijst erop. Het beeldkader is dan ruim genoeg
  voor elke draaiing, zodat het figuur niet verspringt. In de speler draait
  niets. De teksten bij de instelling zijn eigen teksten; de spec geeft ze
  niet.
- **Minder beweging** (instelling van het toestel): geen animatie, alleen de
  eindhouding, en geen pauzeknop.
- **Kleuren:** themakleuren, dus ook in de nachtmodus alleen rood en amber; de
  spier die rekt in de accentkleur.
- **Bekend, niet door de figuren veroorzaakt:** op een heel klein scherm
  (320 × 568) scrolt de speler al een klein stuk (ongeveer 57 px), ook zonder
  figuur. Op 390 px breed past alles.

## Aanvullingen (geen gedragsverschil)

### `data/library.schema.json`
Het schema uit §9.1 staat als los bestand naast `library.json`, letterlijk uit
de spec gehaald door `tools/extract-library.mjs`. `library.js` valideert de
bibliotheek bij elke start eerst tegen dit schema en daarna tegen §9.2.
**Reden:** §9.2 noemt alleen de inhoudsregels; zonder schemacontrole zou een
ontbrekend of verkeerd getypt veld pas in de UI opvallen.

### Extra controles in de validator
Naast §9.2 regel 1–7 controleert `library.js` ook:
- elke bronverwijzing (`sources`) bestaat in de bronnenlijst;
- `evidenceLevel` past bij `scores.B` volgens `meta.scoring.evidenceLabels`
  (B5 sterk … B1 geen, §6.2);
- de dosis van een sjabloonstap past bij de oefening (PNF ↔ `pnf`,
  unilateraal ↔ `perSideSec`, bilateraal/afwisselend ↔ `durationSec`).

**Reden:** de kaart (§6.2) toont het bewijslabel en de timeline (§6.8.1) leest
deze velden; een mismatch zou een verkeerde weergave of tijd geven. De huidige
bibliotheek voldoet aan alle drie.

### Ontgrendeling: veld `resetAt` (M6)
> **Vervallen (23-10-2026):** het knieslot is verwijderd, zie "Besluiten Oscar (23-10-2026)" bovenaan.

Naast de velden uit §8.2 bewaart een ontgrendeling `resetAt`: het moment
waarop de teller op 0 ging (een niet-schone cyclus of een opvlamming).
**Reden:** bij een import moet de app kunnen nagaan of status en teller
kloppen met de cycli sinds die reset; na een opvlamming vanuit "vrij" is er
anders geen spoor van die reset.

### Bibliotheek: schakelaar "Groeperen per spiergroep" (M2)
§6.1 vraagt een lijst gegroepeerd per regio en spiergroep, te sorteren op
score, naam, R of tijd. Gegroepeerd sorteert de app binnen elke spiergroep
(zoals §5). Met de extra schakelaar "Groeperen per spiergroep" uit wordt het
één lijst over alle groepen. **Reden:** §3.3 noemt "sorteren op R" als
oplossing voor het K-effect van de weging; binnen één spiergroep is R bijna
overal gelijk, dus dat werkt alleen over alle groepen heen. Standaard staat
groeperen aan.

## Invulling van open punten in §6.1–6.2 (M2)

Deze punten laat de spec open. De keuze is klein en makkelijk om te zetten.

- **Moment-filter:** "ochtend" toont oefeningen voor de ochtend én voor beide
  momenten, "avond" idem, "beide" alleen oefeningen voor beide momenten.
- **Materiaal-filter (meerdere):** een oefening telt mee als ze minstens één
  gekozen materiaal gebruikt; "geen materiaal" toont oefeningen zonder
  materiaal.
- **Spiergroep-filter (meerdere):** kijkt naar de primaire doelen (gewicht 1).
  Een oefening staat in de lijst onder haar eerste doelgroep, of bij een
  spiergroepfilter onder de gekozen primaire groep (couch stretch staat bij
  "Heupbuigers" dan ook onder Heupbuigers).
- **Positie, type en minimum aantal sterren:** één keuze tegelijk (de spec
  zegt alleen bij spiergroep en materiaal "meerdere").
- **Sorteren op tijd:** de duur van de oefening met de standaarddosis, inclusief
  kantwissels en zonder de 5 s voorbereiding (bv. 45 s per kant = 1:35).
- **Illustratie bovenaan de kaart:** zolang er geen eigen stokfiguren per
  oefening zijn (fase 2), toont de kaart een uitsnede van de lichaamskaart plus
  het positie-icoon, zoals §6.2 voorschrijft.
- **Knoppen die later komen:** "Toevoegen aan routine" (M4), "Probeer nu" (M3)
  en "Ontgrendelen via 48-uurstest" (M5) staan al op de kaart en werken vanaf
  hun mijlpaal. Bij een vergrendelde oefening blijven
  toevoegen en afspelen altijd uit (W1). *(Vervallen 23-10-2026: geen
  knieslot meer; alleen W8 tijdens een opvlamming blokkeert.)*

## Invulling van open punten in §6.8 (M3, speler)

- **Schermen:** v2 beschrijft de schermen van de speler niet meer (sectie D uit
  v1 is vervangen). Startscherm, routinepreview en speler volgen daarom de
  wireframes uit v1 (D6): kaarten Ochtend/Avond met 5 · 10 · 15 min, preview
  met totale tijd en grote Start-knop, speler met naam, kant, ringtimer
  (cijfers ≥ 96 px), kerncue plus ademcue, "Volgende: …" en ⏮ ⏸/▶ ⏭ plus ✕.
- **Gesproken naam:** zonder de toelichting tussen haakjes, zoals in het
  voorbeeld van §6.8.2 ("Kuit tegen de muur", niet "… (gestrekte knie)").
- **⏭ Volgende:** eerst naar de aangekondigde overgang ("Volgende: …"), vanuit
  de overgang of de voorbereiding naar het begin van de volgende oefening.
  **⏮ Terug:** naar het begin van de huidige oefening; tijdens een overgang is
  dat de oefening die net klaar is.
- **Piepjes:** de zachte piep halverwege alleen bij werkblokken van ≥ 10 s;
  3-2-1 bij elk segment van ≥ 4 s, ook de voorbereiding, kantwissel en
  overgang (aftellen naar de volgende houding).
- **Status in het logboek:** tot het einde gespeeld = voltooid (ook als je
  oefeningen hebt overgeslagen); na ✕ en bevestigen = gedeeltelijk als er
  werk gedaan is, anders afgebroken.
- **Terugknop van de browser of telefoon** tijdens een routine: vraagt eerst
  "Stoppen?" in plaats van de speler stil te verlaten. Op het afrondscherm mag
  je wel weg: de sessie is dan al opgeslagen.
- **Afronden:** de sessie staat meteen bij "Klaar!" of "Gestopt" in het
  logboek (DONE → LOG, §6.8.2), ook als de app daarna wordt afgesloten.
  "Opslaan" vult rekintensiteit, kniepijn en notitie aan. De schuiven staan
  op rekintensiteit 5 (de cue "rek 5–6/10") en kniepijn 0. Ga je weg zonder
  Opslaan, dan blijven die twee leeg.
- **Timercijfers:** altijd hele seconden (een segment duurt hoogstens 180 s),
  zodat ze ook op een klein scherm bij ≥ 96 px in de ring passen.
- **Terug van de achtergrond** (auto-pauze uit): de speler springt naar het
  juiste segment en noemt dan alleen kant en naam, niet de volle duur; piepjes
  die al voorbij zijn, klinken niet meer.
- **⏭/⏮ in pauze:** de aankondiging (spraak, piep) komt pas bij hervatten.
- **"Probeer nu"** wordt ook als sessie opgeslagen (routine
  `probeer:<oefening>`, moment "vrij"), zodat de werkelijke dosis klopt.
- **Instellingen:** knop "Test geluid" toegevoegd om piepjes en spraak op het
  toestel te controleren; kantwisselduur te kiezen uit 3, 5, 8 of 10 s.
- **Blijvende opslag:** `navigator.storage.persist()` wordt al na de eerste
  opgeslagen sessie aangevraagd (§7); de status in de instellingen volgt in M7.
- **Als IndexedDB niet werkt** (bv. sommige privévensters): de app draait
  verder in het geheugen en zegt bovenaan dat er niets bewaard wordt.
- **Kniestatus niet te lezen** (opslag werkt niet of leesfout): de knieregels
  zijn hard, dus dan geldt de opvlammingsmodus (alles boven 45° uit, W8) met
  een melding bovenaan, tot de opslag weer werkt. *Ter bevestiging aan Oscar
  voorgelegd.*

## Invulling van open punten in §6.3–6.4 en §6.11 (M4)

- **Navigatie:** een tabbalk met Start · Routines · Bibliotheek · Week · Meer.
  "Meer" bevat Instellingen en krijgt in M6/M7 logboek, metingen en "Over".
  De spec noemt geen hoofdnavigatie; dit houdt alles met één duim bereikbaar.
- **Routines:** je eigen routines en daaronder de zes sjablonen. Een sjabloon
  opent als preview met "Kopiëren en aanpassen"; een eigen routine met
  "Bewerken". De kopie heet "<naam> (kopie)" en krijgt `fromTemplate`.
- **Stappenlijst in de bouwer:** precies de onderdelen uit §6.3 (sleepgreep,
  naam, sterren, dosischip, kniebadge, verwijderen), zonder minikaart, zodat
  de naam op 390 px past. Een tik op de rij opent het dosisblad; daar staan
  ook Omhoog/Omlaag (alternatief voor slepen, ook met het toetsenbord).
- **"+ Oefening":** opent de bibliotheek schermvullend. Bibliotheek en
  kiezer delen zoeken, filters en sortering ("filters blijven bewaard",
  §6.3): wat je in de een instelt, staat ook in de ander. Een vergrendelde
  oefening (W1), of tijdens een opvlamming één boven 45° (W8), kun je niet
  kiezen; de reden verschijnt bovenaan, bij W1 met de knop "Naar de
  48-uurstest" (§6.6, M5).
- **"Toevoegen aan routine"** op de oefenkaart: kies een eigen routine of
  "+ Nieuwe routine". De oefening komt achteraan, met de standaarddosis, en
  de bouwer opent. Bij een bestaande routine is de toevoeging meteen
  opgeslagen. De knie-poort wordt daarbij opnieuw gecontroleerd.
- **Kopiëren en dupliceren** maken een nieuwe routine. Wat de knie-poort op
  dat moment blokkeert (W1, of W8 tijdens een opvlamming), komt er niet in;
  de app meldt welke oefeningen zijn weggelaten (§6.5: W1 en W8 "voorkomen
  toevoegen"). Hetzelfde geldt voor een concept dat je terugzet: wat er
  nieuw in staat en nu geblokkeerd is, valt weg. Een bestaande routine houdt
  een oefening die later weer vergrendeld raakt; die wordt bij het afspelen
  overgeslagen.
- **Tijd, dosis en waarschuwingen** (totale tijd in de lijsten en de bouwer,
  "Dosis van deze routine", W3–W7, de geplande laag van "Mijn week") rekenen
  met wat echt wordt afgespeeld: zonder stappen die de knie-poort blokkeert.
  De bouwer toont die stappen met een slot en zegt dat ze worden
  overgeslagen.
- **Niet-opgeslagen wijzigingen:** bij terug (knop of telefoon) vraagt de
  bouwer "Wijzigingen opslaan?" met Verder bewerken, Niet opslaan of
  Opslaan. Een nieuwe, nog lege routine verdwijnt zonder vragen. "Start" en
  "Dupliceren" slaan eerst op. Lukt opslaan niet (bv. opslag vol), dan blijft
  alles staan met een melding. Een wijziging die niets verandert (dezelfde
  keuze nog eens, +5 en −5) telt niet als wijziging.
- **Concept bij afsluiten:** gaat de app met niet-opgeslagen wijzigingen in
  de bouwer naar de achtergrond, dan bewaart hij die als concept (in de
  store `settings`, sleutel `builderDraft`). iOS sluit webapps op de
  achtergrond vaak af; bij de volgende start vraagt de app "Verder bewerken"
  of "Weggooien". Het concept vervalt zodra die routine wordt opgeslagen,
  gestart, gedupliceerd of verwijderd, of bij "Niet opslaan". "Verder
  bewerken" overschrijft geen wijzigingen die nu open staan.
- **Totale tijd in beeld:** de balk met de totale tijd blijft bovenaan staan
  tijdens het bewerken (§6.3 zet hem in de kop), zodat je ziet wanneer je
  over 15:00 gaat.
- **PNF-dosis (beslist 23-10-2026: hoogstens 180 s per kant, zie bovenaan):** §6.3 zegt "stappen van
  5 s, minimaal 10 s, maximaal 180 s"; het schema in §9.1 geeft voor PNF
  rondes 1–5, aanspannen 3–10 s en rekken 10–60 s. De bouwer volgt nu het
  schema: rekken in stappen van 5 s (10–60 s), aanspannen per seconde (3–10
  s), 1–5 rondes. Daarmee kan één kant tot 5 × (10 + 60) = 350 s duren. Open
  vraag: moet het totaal per kant ook ≤ 180 s blijven?
- **Standaard statische houdtijd (§6.11):** geldt voor nieuwe statische
  stappen waarvan de standaarddosis in de bibliotheek 45 s is (de
  standaardwaarde). Een oefening met een eigen, afwijkende standaarddosis
  (bv. 60 s) houdt die. Keuze uit 30, 45, 60, 75 of 90 s.
- **Weging aanpassen:** stappen van 5 %. Zolang de som niet 100 % is, zegt de
  app dat en blijft de vorige geldige weging gelden ("som altijd 100 %").
  Alleen de getoonde sterren veranderen; de knie-poort (K ≤ 2 → slot en
  hoogstens 2 sterren) staat los van de weging.
- **Suggestie in "Mijn week" (§6.4.2):** f is het hoogste "keer per week" van
  je actieve routines (daar voeg je de tijd het makkelijkst toe); zonder
  actieve routines 7. De suggestie staat alleen bij groepen die je al traint
  en die gepland onder 300 s blijven, niet bij groepen die je niet doet.
- **Onderhoudstip:** 12 weken na je eerste sessie, of zodra een spiergroep in
  vier opeenvolgende weken (telkens 7 × 24 uur terug) werkelijk ≥ 300 s per
  kant haalde.
- **Status in woorden:** naast de kleur staat "geen statisch of PNF" (grijs),
  "onder de drempel", "op dosis" of "plateau", zodat het ook in nachtmodus en
  bij kleurenblindheid leesbaar is. Bij de groepsnaam staat de geplande
  stand ("gepland: …"); de werkelijke stand staat in de voorleestekst.
- **Duur van sjablonen** in de lijsten rekent met jouw kantwisselduur, net
  als de preview (de `expectedTotalSec` uit de bibliotheek geldt voor 5 s).
- **W5** alleen bij een actieve routine: een inactieve routine telt niet mee
  in de weekdosis en voegt er dus niets aan toe.
- **Startscherm:** boven de sjablonen staan je actieve routines en een korte
  weekkaart (tik → "Mijn week").

## Invulling van open punten in §6.6–6.7 (M5, knie)

> **Grotendeels vervallen (23-10-2026):** alles over het knieslot, de
> proefperiode, de 24/48-uurschecks en het ontgrendelscherm geldt niet meer.
> Wat over de opvlammingsmodus, de dagelijkse kniecheck, twee vensters en de
> klok gaat, geldt nog. Zie "Besluiten Oscar (23-10-2026)" bovenaan.

- **Kaarten op het startscherm:** bovenaan, in deze volgorde: de
  opvlammingsbanner, het voorstel om de opvlamming te beëindigen, de
  dagelijkse kniecheck, de 24- en 48-uurschecks die nu open staan, en de
  oefeningen in de proefperiode met hun volgende stap. Onderaan de knop
  "Ik heb een opvlamming".
- **Pijn kiezen:** 0–10 als elf knoppen zonder voorgekozen waarde, zodat elke
  pijnscore een bewuste keuze is (een schuif op 0 zou een vergeten keuze als
  "geen pijn" opslaan). Op het gewone afrondscherm blijft de schuif van M3.
- **Ontgrendelscherm** (`#/ontgrendelen/<id>`), te openen via de kaart
  ("Ontgrendelen via 48-uurstest"), de kiezer en de proefperiodekaart: status
  en teller, de uitleg uit §6.6, de drie bevestigingen, de begeleide proef,
  de lopende cyclus met zijn vensters en de eerdere cycli.
- **Begeleide proef:** één stap van 30 s per kant (bilateraal 30 s), in de
  gewone speler, met in beeld "intensiteit 3–4/10, op een dik kussen als je
  knielt" en de rekintensiteit op 3. De beginwaarde ("Kniepijn nu") wordt
  vooraf gevraagd; boven 2/10 start de proef niet. Vindt de proef op een
  andere dag plaats dan de bevestiging, dan vraagt de app de drie
  bevestigingen opnieuw (ze gaan over vandaag en de komende 48 uur).
- **Status test:** de begeleide proef is de enige blootstelling (§6.6 "test
  (sessie)"). In een routine, de kiezer, "Toevoegen aan routine" en "Probeer
  nu" telt de oefening dan nog als vergrendeld (W1); "Probeer nu" en de
  kiezer leiden naar de proef. Pas in de status voorlopig mag de oefening in
  routines (W9 bij minder dan 48 uur).
- **Niet afgemaakt:** een proef of oefening uit de proefperiode die je stopt
  of overslaat vóór de geplande tijd, telt als blootstelling, maar de cyclus
  vervalt meteen (niet schoon, teller blijft staan). Kniepijn tijdens wordt
  wel gevraagd; boven 2/10 volgt het opvlammingsvoorstel.
- **Blootstelling vastleggen:** op het moment dat het eerste werkblok van
  die oefening begint, dus ook als de app daarna wordt afgesloten.
  "Kniepijn tijdens" vraagt het afrondscherm daarna verplicht (geen
  voorgekozen waarde, Opslaan pas na een keuze). Ga je weg zonder Opslaan,
  of vul je hem pas na het begin van het 24-uursvenster in, dan telt de
  cyclus niet als schoon en vervalt hij (de teller blijft staan), net als een
  niet-ingevulde check (§6.6).
- **Open check bij een nieuwe blootstelling:** staat er voor die oefening een
  24- of 48-uurscheck open, dan geldt het antwoord op "Kniepijn nu" ook als
  die check (dezelfde vraag op hetzelfde moment). Zo vervalt een cyclus niet
  alleen omdat je de kaart nog niet had ingevuld; binnen 48 uur geldt de
  keuze "Nieuwe blootstelling tijdens een lopende cyclus" hieronder.
- **"Kniepijn nu" boven 2/10** vóór een routine: die waarde komt als kniecheck
  (context test) in het logboek, de oefening wordt overgeslagen en de app
  stelt de opvlammingsmodus voor.
- **Meerdere vensters:** de kniestatus heeft een versienummer. Een venster
  dat een verouderde stand heeft, slaat zijn wijziging niet op maar laadt de
  nieuwste stand (met een melding); andere vensters krijgen een seintje en
  laden opnieuw, en bij terugkeer naar de app wordt altijd opnieuw geladen.
  Zo kan een oud tabblad nooit een opvlamming of een vergrendeling
  terugdraaien.
- **Klok teruggezet:** staat de klok vóór de laatste kniecheck of
  blootstelling, dan legt de app niets vast (geen checks, geen proef, geen
  blootstelling; zo'n oefening wordt overgeslagen) en vraagt hij de klok goed
  te zetten.
- **Bij het starten nalopen:** de opgeslagen kniestatus gaat langs dezelfde
  controles als een import; een ontgrendeling die haar eigen geschiedenis
  niet draagt, gaat terug naar vergrendeld (met een melding). Niet te lezen:
  opvlammingsmodus (fail-closed).
- **Terug in beeld:** komt de app terug uit de achtergrond, dan worden
  verlopen checks afgehandeld en de kaarten bijgewerkt (dagelijkse check na
  04:00, 24/48-uursvensters).
- **Kniechecks in het logboek:** de beginwaarde vóór een blootstelling staat
  als kniecheck met context `test` (met oefening); de pijn tijdens staat in de
  sessie (`kneePainDuring`). Dagelijkse, 24u- en 48u-checks hebben hun eigen
  context.
- **Opvlammingsvoorstel** na een niet-schone cyclus met een waarde boven 2/10
  (§6.6): een blad met "Niet nu" en "Aanzetten". Een 24u- of 48u-check boven
  2/10 zet de modus direct aan (§6.7), zonder voorstel.
- **Opvlamming beëindigen:** alleen via het voorstel na 7 dagen (§6.7 "de
  gebruiker bevestigt"), en alleen als de reeks op dat moment nog klopt; er
  is geen knop om de modus zelf uit te zetten.
  "Nog niet" vraagt het de volgende dag opnieuw. *Ter beslissing aan Oscar:
  wil je een manier om een per ongeluk aangezette modus direct terug te
  draaien?*
- **Banner:** de stand van de reeks ("Nu: 3 van 7") en de voorgestelde
  routines O5 en A5 als knoppen.
- **Meldingen** over de kniestatus ("schone cyclus", "afkoelperiode tot …",
  "cyclus vervallen") verschijnen kort bovenin en verdwijnen na 10 s of met
  OK; de stand zelf staat ook op het startscherm en het ontgrendelscherm.
  Staat er een blad open (bv. het opvlammingsvoorstel), dan wacht de melding
  tot dat dicht is.
- **Knoppen in kaarten** (Opslaan bij een kniecheck, Beëindigen,
  Exporteren, Hoe?) zijn gewone knoppen van 56 px met een gekleurde rand, geen
  primaire knoppen: de kaarten staan bovenaan en §8.3 wil primaire knoppen
  (64 px) in het onderste derde.
- **Ontgrendelingen resetten** (Instellingen): alle vergrendelde oefeningen
  terug naar vergrendeld, teller 0, zonder geschiedenis. Een lopende
  afkoelperiode blijft staan: die is een voorwaarde voor een nieuwe test
  (§6.6). Kniechecks en logboek blijven.
- **Laatste poort:** vlak voor de speler start, past de app de knie-poort nog
  één keer toe op elke stap, ongeacht de route.

## Invulling van open punten in §6.9–6.10 (M6)

- **Logboek** (Meer → Logboek): sessies, kniechecks en zelftestmetingen per
  dag, nieuwste eerst, met het filter Alles · Sessies · Kniechecks ·
  Zelftests. Eerst de 30 meest recente kalenderdagen (vanaf de dag van het
  nieuwste item), met "Oudere tonen" voor de 30 daarvoor. Een tik op een
  sessie toont per oefening en kant de gedane werktijd. Sessies en metingen
  tonen datum en tijd zoals ze zijn vastgelegd (in de tijdzone van dat
  moment); kniechecks hebben alleen een tijdstempel en staan in de tijdzone
  van het toestel.
- **Export:** één blad met "Alles delen of bewaren" (deelmenu van het toestel;
  op de iPhone o.a. "Bewaar in Bestanden") en per bestand een
  downloadknop. Het JSON-bestand heet `rekapp-JJJJ-MM-DD.json`; de CSV's
  heten zoals in §6.9. "Laatste export" (§6.11) is het moment van delen of
  van het downloaden van het JSON-bestand.
- **Formaat van de dump:** `{ schemaVersion: 1, app: "Rekapp", exportedAt,
  librarySchemaVersion, data: { routines, sessions, kneeChecks, unlocks,
  tests, flare, settings } }` (`unlocks` sinds 23-10-2026 altijd leeg). `schemaVersion` is de versie van de dump, niet
  van de bibliotheek (die staat in `librarySchemaVersion`). Het concept uit
  de bouwer zit er niet in.
- **CSV:** puntkomma, UTF-8 met BOM, regeleinden CRLF, getallen met een
  decimale komma (zodat Excel met Nederlandse instellingen ze als getal
  leest). Kniechecks hebben een tijdstempel zonder tijdzone; datum en tijd
  staan in de tijdzone van het toestel bij het exporteren.
  `dosis_per_week.csv`: de werkelijke dosis per kalenderweek (maandag tot en
  met zondag) uit het logboek, alleen spiergroepen die die week iets kregen.
- **Import:** eerst controleren en tonen wat er komt; daarna vervangt de
  import alles in één keer (alles of niets) en start de app opnieuw. Ook het
  concept uit de bouwer verdwijnt dan.
  - Een losse routine, sessie, kniecheck of meting die niet klopt (onbekende
    oefening of test, ontbrekende of verkeerd getypte velden), wordt
    overgeslagen met een melding; de rest komt mee. Dubbele id's worden
    samengevoegd. Gemiddelde en eenheid van een meting rekent de app opnieuw
    uit de pogingen en de bibliotheek.
  - Instellingen: alleen bekende waarden met het goede type (de rest wordt
    de standaard); een weging die niet samen 100 % is, valt weg. Zit er geen
    instellingen in het bestand, dan blijven de huidige staan. "Laatste
    export" is minstens het moment van die export.
  - *(Vervallen 23-10-2026, knieslot weg: ontgrendelingen gaan niet meer
    mee.)* De knieregels zijn hard. Een ontgrendeling gaat terug naar vergrendeld
    (met een melding, met behoud van een lopende afkoelperiode) als:
    status en teller niet kloppen met de schone cycli sinds de laatste reset
    (test 0, voorlopig 1–2, vrij precies 3; vergrendeld 0 zonder lopende
    cyclus); een cyclus als schoon staat terwijl de waarden dat niet zijn of
    de 24/48-uurscheck nog niet kon (vóór het venster, of vóór de volgende
    blootstelling); er meer dan één oefening in de proefperiode zit; er een
    proefperiode loopt tijdens een afkoelperiode; of er tijdens een
    opvlamming iets ontgrendeld is. Een ongeldige opvlammingsmodus weigert
    het hele bestand.
- **Exportherinnering:** een kaart op het startscherm 14 dagen na de laatste
  export (of, zonder export, na de eerste sessie). "Later" vraagt het de
  volgende dag opnieuw.
- **Zelftests** (Meer → Zelftests): per test de uitvoering uit de
  bibliotheek, het meetprotocol, per kant drie invoervelden met het
  gemiddelde erbij, een grafiek (links rondjes en een doorgetrokken lijn,
  rechts vierkantjes en een stippellijn, zodat het ook zonder kleur te lezen
  is) en de metingen, die je kunt verwijderen. Je mag één kant invullen.
  Bij de rugkraktest (overlap telt negatief) staat een ±-knop, omdat het
  cijfertoetsenbord van de iPhone geen minteken heeft.
- **Nulmeting:** de eerste twee opeenvolgende meetdagen per kant; per dag
  telt de laatste meting. De meetfout van de test is de grootste van beide
  kanten, en minimaal 1 (cm of graad, de kleinste afleesstap): twee gelijke
  nulmetingen zouden anders een meetfout van 0 geven, waardoor elk verschil
  "echt" zou zijn.
- **Band in de grafiek:** nulmeting ± de grens voor een echte verandering
  (1,5 × de meetfout, of de MDC).
- **Hertest:** week 4, 8 en 12 na de eerste nulmetingsdag, daarna elke 8
  weken; een meting tot 3 dagen ervoor telt mee. Een open hertest staat op
  het startscherm en in het overzicht.
- **"Aandacht":** als het laatste verschil tussen links en rechts groter is
  dan de meetfout, krijgen de spiergroepen van die test in de bibliotheek
  het label "aandacht" (bij de groep en bij de oefeningen met die groep als
  primair doel). Pas zodra de meetfout bekend is (nulmeting aan beide
  kanten).

## Invulling van open punten in §7 en §8.1 (M7)

- **Service worker:** de lijst met bestanden en de versie in `sw.js` maakt
  `node tools/update-sw.mjs`; de versie is een hash over de inhoud van alle
  bestanden, zodat elke wijziging een update geeft. `tests/sw.test.js` (ook in
  de Pages-workflow) faalt als dat vergeten is. Geen buildstap: de app draait
  zonder deze stap, alleen de update-melding zou dan uitblijven.
- **Cache:** alles vooraf (app, bibliotheek met schema, lichaamskaart,
  positie-iconen, app-iconen); cache-first; pagina-aanvragen krijgen altijd
  `index.html`. Oude caches worden opgeruimd zodra de nieuwe versie actief is.
- **Update:** een nieuwe versie wacht; bovenin verschijnt "Update
  beschikbaar." met "Herladen". Tijdens een routine herlaadt de app niet (eerst
  afronden). De app kijkt bij elke terugkeer naar het scherm of er een update
  is.
- **Installatiehulp:** een kaart op het startscherm zolang de app niet als
  beginscherm-app draait ("Eerst installeren, dan gebruiken", §7), met "Niet
  nu" (tot de volgende start) en "Hoe?" naar Meer → Installeren: stappen per
  platform; op Android de knop "App installeren" als Chrome die aanbiedt.
- **Opslagstatus:** in Instellingen → Opslag, met "Blijvend opslaan aanvragen"
  als de browser dat ondersteunt en het nog niet zo is.
- **Herinneringen (.ics):** per moment (ochtend 07:30, avond 20:30, aan te
  passen) een agenda-item van 15 minuten met `RRULE:FREQ=DAILY` en een alarm
  op het tijdstip zelf. De tijd staat zonder tijdzone in het bestand
  ("floating"), zodat de herinnering na de wissel van zomer- naar wintertijd
  op dezelfde klokuren blijft.
- **Iconen:** eigen ontwerp (een figuur in de kuitrek tegen de muur, met een
  boog voor de rek); `icons/icon.svg` is de bron van de PNG's.
- **Over:** de vier punten uit §6.12 letterlijk, de formule en de rubrieken uit
  §3, "Wat de sterren wel en niet zeggen" (§3.3) en per spiergroep het bewijs,
  de relevantie en de bronnen uit de bibliotheek (§4).

## Keuzes bij open of tegenstrijdige punten (akkoord Oscar, 17-10-2026)

### PNF met "extra set zwakke kant"
§6.4.1 telt bij een unilaterale stap met `extraWeakSide` een extra basis mee
voor die kant, ook bij PNF. De pseudocode in §6.8.1 voegt de extra set alleen
toe in de niet-PNF-tak. **Keuze:** de timeline voegt bij PNF ook een extra
blok (kantwissel + rondes aan de zwakke kant) toe, zodat tijd en dosis met
elkaar kloppen.

### Nieuwe blootstelling tijdens een lopende 24/48-uurscyclus
> **Vervallen (23-10-2026):** het knieslot is verwijderd, zie "Besluiten Oscar (23-10-2026)" bovenaan.

W9 is oranje (informeert alleen). Wat er met de lopende cyclus gebeurt als je
toch binnen 48 uur opnieuw rekt, staat niet in §6.6. **Keuze:** de lopende
cyclus vervalt (telt niet als schoon, teller blijft staan) en de nieuwe cyclus
loopt vanaf de laatste blootstelling.

### Afkoelperiode
> **Vervallen (23-10-2026):** het knieslot is verwijderd, zie "Besluiten Oscar (23-10-2026)" bovenaan.

"Geen afkoelperiode actief" (§6.6) kan per oefening of voor alle oefeningen
gelden. **Keuze:** voor alle oefeningen (strengste lezing).

### W6 of W7 bij alleen een bijbetrokken statische oefening
**Keuze:** W7 alleen als géén statische of PNF-oefening de groep raakt, ook
niet als bijbetrokken doel; anders W6. Voor STANDAARD krijgen de heupbuigers
daardoor W6 (157,5 s via rectus femoris zijlig) en geen W7.

### Reikwijdte en "per kant" bij W3, W5 en W6
**Keuze:**
- W3 als één van beide kanten ≥ 60 s haalt; W5 en W6 kijken net als de
  dosismeter naar de laagste kant.
- W5–W7 rekenen met de geplande weekdosis van alle actieve routines samen, maar
  verschijnen alleen bij de routine die eraan bijdraagt: W5 bij een routine die
  statische of PNF-tijd aan die groep toevoegt, W6/W7 bij een routine waarin de
  groep primair doel is.

### Beginwaarde bij een blootstelling in een routine
> **Vervallen (23-10-2026):** het knieslot is verwijderd, zie "Besluiten Oscar (23-10-2026)" bovenaan.

§6.6 noemt de beginwaarde ("kniepijn nu") alleen bij de begeleide proef.
**Keuze:** start je een routine met een oefening in `test` of `voorlopig`, dan
vraagt de app eerst "Kniepijn nu (0–10)". Die waarde is de beginwaarde van de
nieuwe cyclus. Ligt hij boven 2/10, dan start de proef niet (zelfde grens als
de bevestiging "kniepijn de afgelopen 7 dagen steeds ≤2/10").
