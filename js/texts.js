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

// §3.1 Trainingsoefeningen (kracht, balans, plyometrie): eigen B en D; K, R
// en P zijn die van RUBRICS.
export const RUBRICS_TRAINING = {
  B: {
    title: 'B — Bewijs (training).',
    intro: 'Per oefening, voor het doel van het sjabloon: minder pijn en betere functie bij PFP (heupen), of minder vaak zwikken en meer veerkracht (enkels).',
    levels: {
      5: "Onderdeel van meerdere programma's met effect in een meta-analyse, of met name aanbevolen in een consensusstatement",
      4: 'Onderdeel van een programma met effect in minstens één RCT',
      3: 'Verwant aan een programma met effect in een RCT, maar deze oefening zelf is niet onderzocht',
      2: 'Alleen EMG- of biomechanisch onderzoek bij gezonde mensen, of een klein of onzeker effect in meta-analyses',
      1: 'Alleen een video of expertadvies',
    },
  },
  D: {
    title: 'D — Doelgerichtheid (training).',
    intro: 'Traint de oefening echt wat ze moet trainen? Een oordeel op basis van anatomie en EMG-onderzoek.',
    levels: {
      5: 'Traint aantoonbaar of anatomisch eenduidig de bedoelde spieren of reactie; weinig compensatie',
      4: 'Traint het doel goed; compensatie is met de cues te voorkomen',
      3: 'Traint het doel plus veel andere spieren, of compensatie ligt voor de hand',
      2: 'Traint het doel maar deels; veel compensatie',
      1: 'Traint het genoemde doel niet',
    },
  },
};

// §6.2 Ademcue per type.
export const BREATHING = {
  static: '4 tellen in door je neus, 6 tellen uit; zak bij elke uitademing een fractie verder.',
  pnf: 'Span 5 s aan op 20–30% en adem door; adem uit bij het loslaten en zak verder.',
  dynamic: 'Adem rustig door in het ritme van de beweging.',
  active: 'Adem rustig door in het ritme van de beweging.',
  kracht: 'Adem uit bij het zware deel van de beweging en in bij het terugkomen; houd je adem niet vast.',
  balans: 'Adem rustig en regelmatig door, ook als je wiebelt.',
  plyometrie: 'Adem kort en ritmisch mee met de sprongen; houd je adem niet in bij de landing.',
};

// §6.2 kaart.
export const CARD = {
  addButton: 'Toevoegen aan routine',
  tryButton: 'Probeer nu',
};

// §6.7 kniecheck en opvlammingsmodus. Het knieslot met de 48-uurstest (§6.6)
// is verwijderd (AFWIJKINGEN.md).
export const KNEE = {
  painNow: 'Kniepijn nu (0–10)',
  flareButton: 'Ik heb een opvlamming',
  // §6.11 Kniefuncties (standaard uit).
  featuresLabel: 'Kniefuncties',
  featuresHint: 'De kniescore K in de sterren, de dagelijkse kniecheck, de opvlammingsmodus (alles boven 45° uit) en de knie-informatie bij de oefeningen.',
  featuresOffTitle: 'Kniefuncties uitzetten?',
  featuresOffFlare: 'Je opvlammingsmodus staat aan. Zonder Kniefuncties kun je oefeningen boven 45° weer kiezen en afspelen. De opvlamming blijft bewaard en geldt weer zodra je Kniefuncties aanzet.',
};

// §6.10 zelftests.
export const SELFTEST = {
  protocol: "altijd op hetzelfde tijdstip, bij voorkeur 's avonds vóór de routine. Na 5 minuten lopen: één oefenpoging, daarna drie metingen.",
  baseline: 'Het verschil is je persoonlijke meetfout. Een verandering van meer dan 1,5 × die meetfout (of de MDC uit de literatuur als die er is) telt als echt.',
  retest: 'in week 4, 8 en 12, daarna elke 8 weken.',
};

// §6.12 scherm "Over" en §3.3 "Wat de sterren wel en niet zeggen".
export const ABOUT = [
  'Geen medisch advies.',
  'Rekken vergroot je beweeglijkheid. Het voorkomt geen blessures; krachttraining doet dat wel (Lauersen 2014).',
  'De kniescores zijn voorzorg, geen bewezen schade.',
  'Bij aanhoudende of terugkerende kniepijn: laat een sportfysiotherapeut de posities beoordelen.',
];
export const STARS_FORMULA = [
  'score   = 0,25·B + 0,25·K + 0,20·D + 0,15·R + 0,15·P        (bereik 1–5, twee decimalen)',
  'sterren = score afgerond op 0,5; een halve stap rondt naar boven af',
];
export const STARS_MEANING = [
  ['Ze zijn persoonlijk.', 'Ze gelden voor jou: PFPS, trail en klimmen. Voor iemand zonder knieklachten scoort een hiel-naar-bil hoger.'],
  ['B is bijna altijd groepsbewijs.', 'Studies naar één specifieke variant zijn zeldzaam. Twee stretches voor dezelfde spiergroep verschillen daarom vooral in K, D, R en P.'],
  ['D en R zijn oordelen', 'en K is voorzorg. De kaart toont daarom altijd het bewijsniveau in woorden (§6.2).'],
  ['Bekend effect van de weging:', 'oefeningen zonder kniebetrokkenheid (romp, schouders, armen) krijgen K = 5 en scoren daardoor relatief hoog, ook als ze voor jouw doelen weinig opleveren (lage R). Twee oplossingen in de app: sorteren op R, en "Weging aanpassen" in de instellingen (§6.11). De standaardweging blijft 25/25/20/15/15, zoals afgesproken.'],
];

// §6.3 Sjablonen: kop en uitleg per soort op het tegelscherm.
export const TEMPLATE_KINDS = {
  dagelijks: ['Dagelijks', 'Elke dag; kies 5, 10 of 15 minuten.'],
  opwarmen: ['Opwarmen', 'Het beweeglijke deel van je warming-up. Begin met een paar minuten rustig inlopen, inklimmen of een lichte eerste set.'],
  cooldown: ['Cooling-down', 'Om te ontspannen en je bewegingsuitslag te onderhouden. Minder spierpijn of sneller herstel mag je er niet van verwachten.'],
  lenigheid: ['Lenigheid', "Langere programma's voor blijvend meer bewegingsuitslag: 5× per week, zo'n 5 minuten per spiergroep per week."],
  training: ['Training', "Kracht, balans en sprongen in plaats van rekken. Onderzocht zijn heupprogramma's van 3× per week gedurende minstens 6 weken en balansprogramma's van 3× per week gedurende 8 weken; reken pas daarna op effect."],
};

// §6.11 Zonder Kniefuncties: de sterren op het scherm "Over".
export const STARS_NO_KNEE = {
  intro: 'Elke oefening krijgt deelscores van 1 tot 5. Zonder Kniefuncties telt de kniescore K niet mee: de score is het gewogen gemiddelde van B, D, R en P, naar verhouding van hun gewicht.',
  formula: [
    'score   = (0,25·B + 0,20·D + 0,15·R + 0,15·P) / 0,75     (bereik 1–5, twee decimalen)',
    'sterren = score afgerond op 0,5; een halve stap rondt naar boven af',
  ],
  meaning: [
    ['Ze zijn persoonlijk.', 'Ze gelden voor jouw doelen: trail en klimmen.'],
    ['B is bijna altijd groepsbewijs.', 'Studies naar één specifieke variant zijn zeldzaam. Twee stretches voor dezelfde spiergroep verschillen daarom vooral in D, R en P.'],
    ['D en R zijn oordelen.', 'De kaart toont daarom altijd het bewijsniveau in woorden (§6.2).'],
  ],
};

// §7 installeren.
export const INSTALL = {
  ios: 'Safari → Deel → "Zet op beginscherm"',
  android: 'Chrome-menu → "App installeren"',
  first: 'Eerst installeren, dan gebruiken.',
};

// §6.1 filters: "alleen K ≥ 4". "Toon vergrendelde" vervalt met het knieslot.
export const FILTERS = {
  onlyK4: 'alleen K ≥ 4',
  noEquipment: 'geen materiaal',
};
