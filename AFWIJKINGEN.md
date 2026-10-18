# Afwijkingen van de spec

Elke bewuste afwijking van `rekapp-spec-v2.md`, met reden, plus de keuzes
waar de spec geen of een tegenstrijdig antwoord gaf.

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
  en "Ontgrendelen via 48-uurstest" (M5) staan al op de kaart, maar zijn
  uitgeschakeld tot hun mijlpaal klaar is. Bij een vergrendelde oefening blijven
  toevoegen en afspelen altijd uit (W1).

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
  "Stoppen?" in plaats van de speler stil te verlaten.
- **Afronden:** de schuiven staan op rekintensiteit 5 (de cue "rek 5–6/10")
  en kniepijn 0; je past ze aan voor je opslaat.
- **"Probeer nu"** wordt ook als sessie opgeslagen (routine
  `probeer:<oefening>`, moment "vrij"), zodat de werkelijke dosis klopt.
- **Instellingen:** knop "Test geluid" toegevoegd om piepjes en spraak op het
  toestel te controleren; kantwisselduur te kiezen uit 3, 5, 8 of 10 s.
- **Blijvende opslag:** `navigator.storage.persist()` wordt al na de eerste
  opgeslagen sessie aangevraagd (§7); de status in de instellingen volgt in M7.

## Keuzes bij open of tegenstrijdige punten (akkoord Oscar, 17-10-2026)

### PNF met "extra set zwakke kant"
§6.4.1 telt bij een unilaterale stap met `extraWeakSide` een extra basis mee
voor die kant, ook bij PNF. De pseudocode in §6.8.1 voegt de extra set alleen
toe in de niet-PNF-tak. **Keuze:** de timeline voegt bij PNF ook een extra
blok (kantwissel + rondes aan de zwakke kant) toe, zodat tijd en dosis met
elkaar kloppen.

### Nieuwe blootstelling tijdens een lopende 24/48-uurscyclus
W9 is oranje (informeert alleen). Wat er met de lopende cyclus gebeurt als je
toch binnen 48 uur opnieuw rekt, staat niet in §6.6. **Keuze:** de lopende
cyclus vervalt (telt niet als schoon, teller blijft staan) en de nieuwe cyclus
loopt vanaf de laatste blootstelling.

### Afkoelperiode
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
§6.6 noemt de beginwaarde ("kniepijn nu") alleen bij de begeleide proef.
**Keuze:** start je een routine met een oefening in `test` of `voorlopig`, dan
vraagt de app eerst "Kniepijn nu (0–10)". Die waarde is de beginwaarde van de
nieuwe cyclus. Ligt hij boven 2/10, dan start de proef niet (zelfde grens als
de bevestiging "kniepijn de afgelopen 7 dagen steeds ≤2/10").
