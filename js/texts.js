// Vaste teksten uit de spec, letterlijk overgenomen. tests/texts.test.js
// controleert dat elke tekst zo in rekapp-spec-v2.md staat.

// §3.1 Vijf deelscores: titel, toelichting en rubriek per waarde (5 → 1).
export const RUBRICS = {
  B: {
    title: 'B — Bewijs.',
    intro: 'Per spiergroep en rektechniek.',
    levels: {
      5: "Meta-analyse van RCT's met blijvende ROM-winst voor deze spiergroep",
      4: 'Minstens twee trainingsstudies (≥3 weken) met ROM-winst voor deze spiergroep',
      3: 'Eén trainingsstudie, of meerdere acute studies',
      2: 'Alleen een losse acute studie, patiëntstudies of indirect bewijs (echografie, kadaver)',
      1: 'Geen onderzoek gevonden, of bewijs dat het veronderstelde mechanisme niet klopt',
    },
    outro: 'Correctie voor de techniek: dynamisch en actief krijgen B −1 (minimaal 1), omdat statisch en PNF meer blijvende winst geven (Konrad 2024). Uitzondering: als er voor die vorm bij die spiergroep een eigen trainingsstudie is.',
  },
  K: {
    title: 'K — Knieveiligheid.',
    intro: 'Voor jouw PFPS. Dit is voorzorg op basis van biomechanica, niet getest op rekposities.',
    levels: {
      5: 'Knie niet betrokken of gestrekt, of een gewone zit- of lighouding; geen druk op de knieschijf',
      4: 'Kniebuiging ≤90° onbelast, of ≤45° onder lichaamsgewicht; hooguit lichte quadricepsspanning',
      3: '45–60° onder lichaamsgewicht, of ≤90° met een draaimoment of matige quadricepsspanning',
      2: 'Meer dan 90° onbelast met quadricepsspanning, knielen op een dik kussen, of een draaimoment op gebogen knieën met deels lichaamsgewicht',
      1: 'Knielen zonder kussen, diepe kniebuiging onder lichaamsgewicht, of draaibelasting op een gebogen, belaste knie',
    },
  },
  D: {
    title: 'D — Doelgerichtheid.',
    intro: 'Rekt de oefening echt de bedoelde spier? Dit is een oordeel op basis van anatomie en de paar beeldvormings- en bewegingsstudies die er zijn.',
    levels: {
      5: 'Rekt aantoonbaar of anatomisch eenduidig de bedoelde spier; weinig compensatie',
      4: 'Rekt de bedoelde spier goed; compensatie is met de cues te voorkomen',
      3: 'Rekt de spier plus andere structuren, of compensatie ligt voor de hand',
      2: 'Rekt de bedoelde spier maar deels; veel compensatie',
      1: 'Rekt de genoemde structuur niet',
    },
  },
  R: {
    title: 'R — Relevantie',
    intro: 'voor jouw doelen: trail en ultra, steile hellingen, klettersteig en klimmen.',
    levels: {
      5: 'Beperkt sleutelbewegingen voor trail én klimmen',
      4: 'Belangrijk voor een van beide, of in verband gebracht met PFP',
      3: 'Nuttig, maar niet bepalend',
      2: 'Kleine rol',
      1: 'Geen rol',
    },
  },
  P: {
    title: 'P — Praktisch.',
    intro: '',
    levels: {
      5: 'Geen materiaal, staand of overal te doen, snel',
      4: 'Iets uit huis nodig (muur, deurpost, trede, stoel, handdoek, bed) of op de vloer',
      3: 'Specifiek materiaal of een omslachtige opstelling',
      2: 'Partner of lange opstelling nodig',
      1: 'Onpraktisch',
    },
  },
};

// §6.2 Ademcue per type.
export const BREATHING = {
  static: '4 tellen in door je neus, 6 tellen uit; zak bij elke uitademing een fractie verder.',
  pnf: 'Span 5 s aan op 20–30% en adem door; adem uit bij het loslaten en zak verder.',
  dynamic: 'Adem rustig door in het ritme van de beweging.',
  active: 'Adem rustig door in het ritme van de beweging.',
};

// §6.2 kaart.
export const CARD = {
  lockedBar: 'Vergrendeld door de knie-poort',
  unlockButton: 'Ontgrendelen via 48-uurstest',
  addButton: 'Toevoegen aan routine',
  tryButton: 'Probeer nu',
};

// §6.1 filters: "alleen K ≥ 4" en "toon vergrendelde".
export const FILTERS = {
  onlyK4: 'alleen K ≥ 4',
  showLocked: 'toon vergrendelde',
  noEquipment: 'geen materiaal',
};
