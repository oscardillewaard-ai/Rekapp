# Rekapp

Rekapp is een web-app voor je telefoon om stretchroutines samen te stellen en
begeleid af te spelen: met een timer, kantwissels, piepjes en een
Nederlandse stem. De app werkt offline, heeft geen account nodig en bewaart
alles alleen op je eigen toestel.

**Adres:** <https://oscardillewaard-ai.github.io/rekapp/>

De volledige specificatie staat in [`rekapp-spec-v2.md`](rekapp-spec-v2.md).
Bewuste keuzes waar de spec ruimte liet, staan in
[`AFWIJKINGEN.md`](AFWIJKINGEN.md).

## Installeren

Installeer Rekapp vóór je hem gaat gebruiken. Een geïnstalleerde app werkt
offline en houdt je gegevens beter vast; in een gewone browsertab kan de
browser ze na een tijd wissen.

### iPhone (Safari, iOS 18.4 of nieuwer)

1. Open het adres hierboven in **Safari**, niet in een andere browser of in
   een app.
2. Tik onderin op **Deel** (het vierkantje met de pijl omhoog).
3. Kies **Zet op beginscherm** en tik op **Voeg toe**.
4. Open Rekapp voortaan via het icoon op je beginscherm.

Let op: de geïnstalleerde app heeft eigen opslag, los van Safari. Wat je in de
Safari-tab deed, staat niet in de app. Zet het zo nodig over met export en
import (zie hieronder).

### Android (Chrome)

1. Open het adres hierboven in **Chrome**.
2. Tik op het menu (drie puntjes rechtsboven) en kies **App installeren**
   (of **Toevoegen aan startscherm**). Soms biedt Chrome dit zelf aan; in de
   app staat dan onder Meer → Installeren een knop **App installeren**.
3. Open Rekapp voortaan via het icoon.

### Daarna

- **Instellingen → Knie → Kniefuncties** zet de knieregels aan: de kniescore
  in de sterren, de dagelijkse kniecheck en de opvlammingsmodus. Standaard
  staan ze uit.
- **Instellingen → Opslag** laat zien of je gegevens blijvend zijn opgeslagen.
  Staat er "niet blijvend", tik dan op **Blijvend opslaan aanvragen**.
- **Instellingen → Herinneringen:** kies een tijd en tik op **Herinnering in
  agenda**. Open het bestand: je agenda maakt er een dagelijkse herinnering
  met een melding van. De app zelf kan zonder server geen meldingen sturen.
- **Instellingen → Geluid en spraak → Test geluid** controleert piepjes en
  spraak. Op de iPhone klinkt de app met "Geluid ook in stille modus" ook als
  de stille schakelaar aan staat.
- **Updates:** als er een nieuwe versie is, verschijnt bovenin **Update
  beschikbaar** met de knop **Herladen**. Tik je daarop tijdens een routine,
  dan vraagt de app je eerst de routine af te ronden.

## Exporteren en importeren

Je gegevens staan alleen op je telefoon. Maak daarom regelmatig een export;
de app herinnert je er elke 14 dagen aan.

### Exporteren

1. Ga naar **Meer → Instellingen → Gegevens** en tik op **Exporteren**.
2. Kies **Alles delen of bewaren**. Op de iPhone kies je daarna bijvoorbeeld
   **Bewaar in Bestanden**. Of download de bestanden één voor één.

Je krijgt vier bestanden (drie met Kniefuncties uit):

| Bestand | Inhoud |
|---|---|
| `rekapp-JJJJ-MM-DD.json` | Alles: routines, sessies, kniechecks, zelftests, opvlammingsmodus en instellingen. Dit is je back-up. |
| `sessies.csv` | Eén regel per sessie: datum, tijd, tijdzone, moment, routine, status, geplande en actieve tijd, intensiteit, kniepijn, notities. |
| `kniechecks.csv` | Eén regel per kniecheck: datum, tijd, pijn, soort check, oefening. Alleen met Kniefuncties aan. |
| `dosis_per_week.csv` | Per week (vanaf maandag) en spiergroep de gedane seconden links, rechts en dynamisch. |

De CSV-bestanden gebruiken een puntkomma als scheidingsteken en UTF-8 met BOM,
zodat ze in Excel met Nederlandse instellingen direct goed openen. Zo kun je
je sessies naast bijvoorbeeld je HRV-gegevens leggen.

### Importeren

1. Ga naar **Meer → Instellingen → Gegevens** en tik op **Importeren**.
2. Kies het JSON-bestand van een export.
3. De app controleert het bestand en laat zien wat erin zit. Tik op **Alles
   vervangen** om het over te nemen. Wat nu in de app staat, wordt dan
   vervangen.

Een opvlamming in het bestand blijft aan. Een oudere export met
ontgrendelingen (uit de tijd van het knieslot) is gewoon te importeren; de
ontgrendelingen gaan niet mee, de rest wel. PNF-stappen van meer dan 180 s
per kant worden ingekort. De app meldt beide.

## Acceptatie op een echte telefoon (checklist §11.3)

Test op een echte iPhone met iOS 18.4 of nieuwer en een Android-telefoon met
Chrome, met de geïnstalleerde app.

- [ ] Offline (vliegtuigmodus): de app opent en speelt een routine af.
- [ ] iOS-beginschermapp: het scherm blijft 15 minuten aan; na wisselen van
      app wordt de wake lock opnieuw aangevraagd.
- [ ] iOS met de stille schakelaar aan en "Geluid ook in stille modus":
      piepjes en spraak zijn hoorbaar. Met "Mixen met muziek": muziek speelt
      door en de schakelaar dempt de app.
- [ ] Android trilt bij een kantwissel en aan het eind; iOS geeft geen fouten
      zonder trillen.
- [ ] Geen Nederlandse stem → alleen piepjes plus een melding, geen crash.
- [ ] Scherm vergrendeld met auto-pauze → na ontgrendelen PAUSED met de juiste
      resterende tijd.
- [ ] `persist()` is aangevraagd en de status staat in de instellingen; de
      exportherinnering verschijnt na 14 dagen.
- [ ] De `.ics` importeert in Apple Agenda en Google Agenda met dagelijkse
      herhaling en alarm.
- [ ] Lighthouse: installeerbaar. Een nieuwe service worker activeert pas na
      "Update beschikbaar → herladen".

Handig om ook even te proberen:

- [ ] De CSV-export opent correct in Excel; de JSON-import herstelt alles.
- [ ] Een kantwissel wordt aangekondigd met spraak, piep en flits.
- [ ] Met **Kniefuncties** uit (standaard) staat er nergens iets over de
      knie: geen K in de sterren, geen kniekaarten, -badges of kniepijn.
- [ ] Met Kniefuncties aan: tijdens een opvlamming is een oefening boven 45°
      nergens toe te voegen of af te spelen; "Terugdraaien" werkt binnen 24
      uur na het aanzetten.
- [ ] Stokfiguren: op een paar kaarten loopt de demo vloeiend en stopt hij met
      de pauzeknop; in de speler volgt het figuur de fasen, ook met "Groot
      stokfiguur" aan en in de nachtmodus.
- [ ] Trainingsoefeningen (bibliotheek → Training): de kaart toont de
      trainingsrubriek bij B en D en "Onzeker" waar de bron twijfelt; in de
      speler hoor je "Set 1 van 3", het aantal herhalingen en "Rust".
- [ ] Met "3D-figuren" aan: op een oefeningkaart draait het figuur rond als
      je er opzij over veegt, en omhoog of omlaag vegen scrolt de pagina nog
      gewoon.

## Ontwikkelen

Vanilla HTML, CSS en JavaScript met ES-modules: geen frameworks, geen
buildstap en geen dependencies. Draai de app lokaal met een eenvoudige
webserver:

```bash
python3 -m http.server 8000   # daarna http://localhost:8000
```

Tests (Node 22, zonder dependencies):

```bash
node --test
```

Na elke wijziging aan de app-bestanden de lijst en versie van de service
worker bijwerken (de tests controleren dat):

```bash
node tools/update-sw.mjs
```

De bibliotheek (`data/library.json`) komt uit de spec en wordt nooit met de
hand bewerkt:

```bash
node tools/extract-library.mjs
```

Een push naar `main` draait de tests en zet de app op GitHub Pages
(`.github/workflows/pages.yml`).

De iconen in `icons/` zijn eigen ontwerp. `icons/icon.svg` is de bron; de
PNG's zijn daaruit gerenderd (192, 512, maskable 512, Apple 180 en een
favicon van 32).
