# Rekapp

Offline web-app (PWA) voor iPhone en Android om stretchroutines samen te
stellen en begeleid af te spelen. De volledige specificatie staat in
`rekapp-spec-v2.md`; **die spec is leidend**.

## Vaste regels

- Vanilla HTML/CSS/JS met ES-modules. Geen frameworks, buildstap, CDN's,
  backend of accounts. Wil je toch iets toevoegen: eerst vragen.
- `data/library.json` is de bron van alle oefeningen, scores, teksten en
  sjablonen. Verander er niets aan. De validator in `library.js` (§9.2) rekent
  scores en sterren na en weigert afwijkingen.
- Alle teksten in de app in het Nederlands, letterlijk uit de spec en de
  bibliotheek waar die ze geven.
- Mobiel eerst: ontwerp voor 390 px breed, met één hand te bedienen, donker
  thema standaard (§8.3).
- Gebruikersdata in IndexedDB (§8.2), niet in localStorage.
- Tijd altijd uit tijdstempels, nooit tellen met `setInterval` (§6.8.2).
- De knieregels zijn hard: knie-poort, knieslot met 48-uurstest en
  opvlammingsmodus (§3.2, §6.6, §6.7). Een vergrendelde oefening mag via geen
  enkele omweg toe te voegen of af te spelen zijn.
- Illustraties: eigen, originele SVG's (lichaamskaart en positie-iconen,
  §6.2). Niets overnemen.
- Bij twijfel of tegenstrijdigheid in de spec: vraag het, gok niet. Leg elke
  bewuste afwijking met reden vast in `AFWIJKINGEN.md`.

## Werkwijze

- Mijlpalen M1 t/m M7 uit §0 op volgorde. Na elke mijlpaal: tests draaien,
  committen met een duidelijke boodschap, kort melden wat klaar is, wat getest
  is en wat Oscar op de telefoon moet controleren.
- Wachten op akkoord na M1, M3 en M7. M8 (echte telefoons, checklist §11.3)
  doet Oscar zelf; daarna worden zijn bevindingen verwerkt.
- Na M2 draait de app op GitHub Pages (HTTPS).

## Bibliotheek bijwerken

`data/library.json` wordt nooit met de hand bewerkt. Na een nieuwe spec:

```bash
node tools/extract-library.mjs   # haalt §10 uit rekapp-spec-v2.md en controleert de JSON
```

## Tests

Unit tests met `node:test`, zonder dependencies:

```bash
node --test tests/
```

Alle tests moeten groen zijn vóór een commit. De testvectoren uit §11.1 (A t/m
G) staan er letterlijk in; pas ze niet aan om een test groen te krijgen.

## Opbouw

Zoals §8.1. De rekenmodules in `js/` (`library.js`, `timeline.js`, `dose.js`,
`warnings.js`, `knee.js`) zijn puur: geen DOM, geen opslag, tijd (`now`) wordt
meegegeven. Zo draaien ze zowel in de browser als in Node-tests. UI, IndexedDB
en audio zitten in aparte modules.
