# Afwijkingen van de spec

Elke bewuste afwijking van `rekapp-spec-v2.md`, met reden. Keuzes die nog op
een antwoord van Oscar wachten staan apart onderaan.

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

## Voorlopige keuzes (wachten op antwoord)

### PNF met "extra set zwakke kant"
§6.4.1 telt bij een unilaterale stap met `extraWeakSide` een extra basis mee
voor die kant, ook bij PNF. De pseudocode in §6.8.1 voegt de extra set alleen
toe in de niet-PNF-tak. **Voorlopig:** de timeline voegt bij PNF ook een extra
blok (kantwissel + rondes aan de zwakke kant) toe, zodat tijd en dosis met
elkaar kloppen.

### Nieuwe blootstelling tijdens een lopende 24/48-uurscyclus
W9 is oranje (informeert alleen). Wat er met de lopende cyclus gebeurt als je
toch binnen 48 uur opnieuw rekt, staat niet in §6.6. **Voorlopig:** de lopende
cyclus vervalt (telt niet als schoon, teller blijft staan) en de nieuwe cyclus
loopt vanaf de laatste blootstelling.

### Afkoelperiode
"Geen afkoelperiode actief" (§6.6) kan per oefening of voor alle oefeningen
gelden. **Voorlopig:** voor alle oefeningen (strengste lezing).

### W6 of W7 bij alleen een bijbetrokken statische oefening
**Voorlopig:** W7 alleen als géén statische of PNF-oefening de groep raakt, ook
niet als bijbetrokken doel; anders W6. Voor STANDAARD krijgen de heupbuigers
daardoor W6 (157,5 s via rectus femoris zijlig) en geen W7.

### Reikwijdte en "per kant" bij W3, W5 en W6
**Voorlopig:**
- W3 als één van beide kanten ≥ 60 s haalt; W5 en W6 kijken net als de
  dosismeter naar de laagste kant.
- W5–W7 rekenen met de geplande weekdosis van alle actieve routines samen, maar
  verschijnen alleen bij de routine die eraan bijdraagt: W5 bij een routine die
  statische of PNF-tijd aan die groep toevoegt, W6/W7 bij een routine waarin de
  groep primair doel is.
