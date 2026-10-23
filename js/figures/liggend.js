// Stokfiguren: liggende oefeningen. Zie rig.js voor het skelet en de hoeken.
// Zijaanzicht: hoofd links, de rug langs de vloer (y 78). Waar een beweging
// dwars op het beeld loopt, is het figuur van boven, vanaf de voeten of vanaf
// het hoofd getekend; delen die naar de kijker wijzen zijn dan voorverkort.
import { joints, staticTimelines, loopTimelines } from './rig.js';

const FLOOR = 82;
const BODY = 78; // hoogte van de rug op de vloer
const flat = { angle: 90, foot: 180 }; // been gestrekt op de vloer, tenen omhoog
const alongside = { n: { angle: 88, fore: 90 }, f: { angle: 89, fore: 91 } }; // armen langs het lichaam
const supine = (x, extra) => ({ pelvis: [x, BODY], torso: -90, head: -96, legs: { n: flat, f: flat }, arms: alongside, ...extra });

export const LIGGEND = {};

// Hamstrings met band (contract-relax): ruglig, het gestrekte been (n) omhoog
// in de band, het andere been plat. Aanspannen: duwen in de band (het been
// beweegt nauwelijks); loslaten: het been iets verder trekken. Beide knieën
// gestrekt.
LIGGEND.hamstring_pnf = (() => {
  const pose = (angle, hand, effort = 0) => ({
    pelvis: [80, 78], torso: -90, head: -97, effort,
    legs: { n: { angle, foot: angle + 90 }, f: { angle: 90, foot: 180 } },
    arms: { n: { hand, bend: 'down' }, f: { hand: [hand[0] - 1, hand[1] + 1], bend: 'down' } },
  });
  return {
    viewBox: [34, 27, 92, 59],
    props: [{ floor: 82 }],
    bands: [['n.hand', 'n.sole']],
    effort: 'n',
    active: ['n.thigh'],
    poses: {
      start: pose(155, [69, 57]),
      push: pose(152, [69.5, 56.5], 1),
      deep: pose(165, [67, 58.5]),
      deepPush: pose(162, [68, 57.5], 1),
    },
    timelines: {
      prep: { keys: [[0, 'start']] },
      contract: { keys: [[0, 'start'], [500, 'push']] },
      relax: { keys: [[0, 'push'], [400, 'start'], [3000, 'deep']] },
      // Vanaf de tweede ronde begint het aanspannen in de diepere stand.
      contract2: { keys: [[0, 'deep'], [500, 'deepPush']] },
      relax2: { keys: [[0, 'deepPush'], [400, 'deep']] },
      demo: { loop: 11000, keys: [[0, 'start'], [600, 'push'], [4200, 'push'], [4600, 'start'], [7000, 'deep'], [9500, 'deep'], [10800, 'start']], still: 'deep' },
    },
  };
})();

// Hamstrings in de deuropening: ruglig, één been plat door de opening, het
// andere gestrekt tegen de deurpost; dichterbij schuiven voor meer rek.
LIGGEND.hamstring_deurpost = {
  viewBox: [26, 24, 110, 62],
  props: [{ floor: FLOOR }, { wall: 92, y1: 26, y2: FLOOR }],
  active: ['n.thigh'],
  poses: {
    start: supine(72, { legs: { n: { angle: 151, foot: 241 }, f: flat } }),
    stretch: supine(83, { legs: { n: { angle: 168, foot: 258 }, f: flat } }),
  },
  timelines: staticTimelines(),
};

// Buiklig, gezicht omlaag.
const prone = (x, extra) => ({ pelvis: [x, BODY], torso: -90, head: -80, legs: { n: flat, f: { angle: 90, foot: 90 } }, arms: { n: { angle: -100, fore: -60 }, f: { angle: -100, fore: -62 } }, ...extra });

// Rectus femoris buiklig: kussen onder de dij net boven de knie, knie tot
// 90°, scheen omhoog met een handdoek om de enkel; bekken in de vloer.
LIGGEND.rf_buiklig_90 = {
  viewBox: [26, 34, 110, 52],
  props: [{ floor: FLOOR }, { rect: [93, 79, 9, 3], solid: true }],
  bands: [['n.hand', 'n.ankle']],
  active: ['n.thigh'],
  poses: {
    start: prone(80, { legs: { n: { angle: 93, shin: 163, foot: 73 }, f: { angle: 90, foot: 90 } }, arms: { n: { angle: 110, fore: 150 }, f: { angle: -100, fore: -62 } } }),
    stretch: prone(80, { legs: { n: { angle: 94, shin: 181, foot: 91 }, f: { angle: 90, foot: 90 } }, arms: { n: { angle: 115, fore: 155 }, f: { angle: -100, fore: -62 } } }),
  },
  timelines: staticTimelines(),
};

// Quadriceps buiklig met band: de hiel langzaam naar de bil, de heup blijft
// op de vloer.
LIGGEND.quad_buiklig_band = {
  viewBox: [26, 30, 110, 56],
  props: [{ floor: FLOOR }],
  bands: [['n.hand', 'n.ankle']],
  active: ['n.thigh'],
  poses: {
    start: prone(80, { legs: { n: { angle: 90, shin: 180, foot: 90 }, f: { angle: 90, foot: 90 } }, arms: { n: { angle: 168, fore: 120 }, f: { angle: -100, fore: -62 } } }),
    stretch: prone(80, { legs: { n: { angle: 90, shin: 224, foot: 134 }, f: { angle: 90, foot: 90 } }, arms: { n: { angle: 168, fore: 110 }, f: { angle: -100, fore: -62 } } }),
  },
  timelines: staticTimelines(),
};

// Thomas-stretch aan de bedrand: ruglig met de billen op de rand; één dij naar
// de borst (handen achter de knie, onderbeen omhoog), het andere been hangt
// ontspannen over de rand.
LIGGEND.thomas_bedrand = (() => {
  const P = [88, 54];
  // Het hangende been (n, dat rekt) vooraan; het vastgehouden been (f) erachter.
  const pose = (f, n) => ({ pelvis: P, torso: -90, head: -96, legs: { f: { angle: f, shin: f - 90, foot: f }, n: { angle: n, shin: 4, foot: 94 } }, arms: { n: { hand: 'f.thighMid', bend: 'down' }, f: { hand: 'f.thighMid', bend: 'down' } } });
  return {
    viewBox: [16, 14, 112, 74],
    props: [{ floor: 86 }, { rect: [14, 58, 76, 28] }],
    active: ['n.thigh'],
    poses: { start: pose(190, 72), stretch: pose(205, 84) },
    timelines: staticTimelines(),
  };
})();

// Knie naar borst (onderbeen omhoog, knie ~90°): handen achter de dij, het
// andere been gestrekt op de vloer.
LIGGEND.knie_naar_borst_90 = {
  viewBox: [26, 30, 110, 56],
  props: [{ floor: FLOOR }],
  active: ['n.thigh'],
  poses: {
    start: supine(80, { legs: { n: { angle: 180, shin: 90, foot: 180 }, f: flat }, arms: { n: { hand: 'n.thighMid', bend: 'down' }, f: { hand: 'n.thighMid', bend: 'down' } } }),
    stretch: supine(80, { legs: { n: { angle: 205, shin: 115, foot: 205 }, f: flat }, arms: { n: { hand: 'n.thighMid', bend: 'down' }, f: { hand: 'n.thighMid', bend: 'down' } } }),
  },
  timelines: staticTimelines(),
};

// Knie naar borst (klassiek): handen op de scheen, de knie diep gebogen.
LIGGEND.knie_naar_borst_klassiek = {
  viewBox: [26, 30, 110, 56],
  props: [{ floor: FLOOR }],
  active: ['n.thigh'],
  poses: {
    start: supine(80, { legs: { n: { angle: 195, shin: 75, foot: 165 }, f: flat }, arms: { n: { hand: 'n.knee', bend: 'down' }, f: { hand: 'n.knee', bend: 'down' } } }),
    stretch: supine(80, { legs: { n: { angle: 212, shin: 77, foot: 167 }, f: flat }, arms: { n: { hand: 'n.knee', bend: 'down' }, f: { hand: 'n.knee', bend: 'down' } } }),
  },
  timelines: staticTimelines(),
};

// Figuur-4 tegen de muur: de voet (f) op de muur zet die knie op ≤ 90°, de
// andere enkel (n) ligt op die knie; dichter naar de muur schuiven.
LIGGEND.figuur4_muur = (() => {
  const foot = [104.5, 62];
  const pose = (x) => {
    const base = supine(x, { legs: { n: flat, f: { ankle: foot, bend: 'up', foot: 180 } } });
    const knee = joints(base).f.knee;
    // Het gekruiste been wijst schuin naar de kijker: voorverkort.
    return { ...base, legs: { n: { ankle: [knee[0] + 1.5, knee[1] - 2], bend: 'up', scale: 0.72, foot: 150 }, f: base.legs.f } };
  };
  return {
    viewBox: [26, 24, 88, 62],
    props: [{ floor: FLOOR }, { wall: 106, y1: 26, y2: FLOOR }],
    active: ['n.thigh'],
    poses: { start: pose(78), stretch: pose(81) },
    timelines: staticTimelines(),
  };
})();

// Piriformis diagonaal: de knie naar de andere schouder, het onderbeen dwars
// (naar de kijker: voorverkort); één hand op de knie, de andere bij de enkel.
LIGGEND.piriformis_diagonaal = {
  viewBox: [26, 30, 110, 56],
  props: [{ floor: FLOOR }],
  active: ['n.thigh'],
  poses: {
    start: supine(80, { legs: { n: { angle: 205, shin: 110, shinScale: 0.35, foot: 200 }, f: flat }, arms: { n: { hand: 'n.knee', bend: 'down' }, f: { hand: 'n.shinMid', bend: 'down' } } }),
    stretch: supine(80, { legs: { n: { angle: 215, shin: 100, shinScale: 0.35, foot: 190 }, f: flat }, arms: { n: { hand: 'n.knee', bend: 'down' }, f: { hand: 'n.shinMid', bend: 'down' } } }),
  },
  timelines: staticTimelines(),
};

// Sfinx: buiklig met een handdoek onder de dijen, op de onderarmen met de
// ellebogen onder de schouders; de buik zakt.
LIGGEND.sfinx = {
  viewBox: [18, 40, 118, 46],
  props: [{ floor: FLOOR }, { rect: [96, 79, 16, 3], solid: true }],
  active: ['spine.low'],
  poses: {
    start: prone(80, { torso: -95, head: -88, arms: { n: { angle: -75, fore: -90 }, f: { angle: -76, fore: -91 } } }),
    stretch: prone(80, { torso: -118, chest: -122, head: -102, arms: { n: { angle: 0, fore: -90 }, f: { angle: -1, fore: -91 } } }),
  },
  timelines: staticTimelines(),
};

// Borstwervels over een handdoekrol: knieën gebogen, voeten plat, de rol dwars
// onder de middenrug; de bovenrug zakt eroverheen, armen boven het hoofd.
LIGGEND.thoracaal_handdoekrol = (() => {
  const legs = { n: { ankle: [115, 80], bend: 'up', foot: 90 }, f: { ankle: [115, 80], bend: 'up', foot: 90 } };
  return {
    viewBox: [16, 40, 118, 46],
    props: [{ floor: FLOOR }, { circle: [74, 78.5], solid: true, r: 3.5 }].map((p) => (p.circle ? { circle: [74, 78.5, 3.5], solid: true } : p)),
    active: ['spine.high'],
    poses: {
      start: { pelvis: [86, BODY], torso: -105, chest: -100, head: -100, legs, arms: { n: { angle: -135, fore: -135 }, f: { angle: -137, fore: -137 } } },
      stretch: { pelvis: [86, BODY], torso: -105, chest: -88, head: -85, legs, arms: { n: { angle: -108, fore: -100 }, f: { angle: -110, fore: -102 } } },
    },
    timelines: staticTimelines(),
  };
})();

// ---------- Andere aanzichten ----------

// Rectus femoris zijlig, van boven gezien (voorkant van het lichaam onder in
// beeld): onderste heup en knie op 90° (f), de band om de enkel van het
// bovenste been (n); die heup naar achteren, knie ≤ 90°.
LIGGEND.rf_zijlig = {
  viewBox: [24, 26, 112, 62],
  props: [{ rect: [26, 28, 108, 58] }],
  bands: [['n.hand', 'n.ankle']],
  active: ['n.thigh'],
  poses: {
    start: { pelvis: [80, 58], torso: -90, head: -90, legs: { n: { angle: 90, shin: 180, foot: 270 }, f: { angle: 0, shin: 90, foot: 90 } }, arms: { n: { angle: 140, fore: 110 }, f: { angle: -40, fore: -100 } } },
    stretch: { pelvis: [80, 58], torso: -90, head: -90, legs: { n: { angle: 112, shin: 200, foot: 290 }, f: { angle: 0, shin: 90, foot: 90 } }, arms: { n: { angle: 150, fore: 118 }, f: { angle: -40, fore: -100 } } },
  },
  timelines: staticTimelines(),
};

// Van boven, ruglig (vooraanzicht-rig: heupen en schouders naast elkaar).
const fromAbove = (extra) => ({ pelvis: [80, 56], torso: -90, head: -90, ...extra });
const mat = { rect: [22, 22, 116, 68] };

// Been over het lichaam (van boven): armen in een T, het gestrekte been (n)
// over het lichaam naar de andere kant; schouders blijven liggen.
LIGGEND.heup_buiten_kruis_ruglig = {
  view: 'front',
  viewBox: [20, 20, 120, 72],
  props: [mat],
  active: ['n.thigh'],
  poses: {
    start: fromAbove({ legs: { n: { angle: 92, foot: 92 }, f: { angle: 88, foot: 88 } }, arms: { n: { angle: 180, fore: 180 }, f: { angle: 0, fore: 0 } } }),
    stretch: fromAbove({ legs: { n: { angle: 38, foot: 38 }, f: { angle: 88, foot: 88 } }, arms: { n: { angle: 180, fore: 180 }, f: { angle: 0, fore: 0 } } }),
  },
  timelines: staticTimelines(),
};

// Banaan (van boven): armen boven het hoofd; voeten en handen naar dezelfde
// kant, zodat het lichaam een boog vormt. Billen blijven liggen.
LIGGEND.banaan_ruglig = {
  view: 'front',
  viewBox: [8, 20, 136, 72],
  props: [{ rect: [10, 22, 132, 68] }],
  active: ['spine.low', 'spine.high'],
  poses: {
    start: fromAbove({ legs: { n: { angle: 92, foot: 92 }, f: { angle: 88, foot: 88 } }, arms: { n: { angle: -92, fore: -92 }, f: { angle: -88, fore: -88 } } }),
    stretch: fromAbove({ torso: -100, chest: -116, head: -122, legs: { n: { angle: 74, foot: 74 }, f: { angle: 70, foot: 70 } }, arms: { n: { angle: -126, fore: -130 }, f: { angle: -122, fore: -126 } } }),
  },
  timelines: staticTimelines(),
};

// Rugdraai (van boven): armen in een T; de gebogen knieën wijzen eerst naar
// het plafond (voorverkort) en zakken samen naar één kant.
LIGGEND.rug_rotatie_ruglig = {
  view: 'front',
  viewBox: [20, 20, 120, 72],
  props: [mat],
  active: ['spine.low'],
  poses: {
    start: fromAbove({ legs: { n: { angle: 90, shin: 90, scale: 0.35, foot: 90 }, f: { angle: 90, shin: 90, scale: 0.35, foot: 90 } }, arms: { n: { angle: 180, fore: 180 }, f: { angle: 0, fore: 0 } } }),
    stretch: fromAbove({ torso: -88, legs: { n: { angle: 32, shin: 122, foot: 122 }, f: { angle: 40, shin: 130, foot: 130 } }, arms: { n: { angle: 180, fore: 180 }, f: { angle: 0, fore: 0 } } }),
  },
  timelines: staticTimelines(),
};

// Vanaf de voeten gezien: de rug wijst van de kijker af (voorverkort).
const fromFeet = (extra) => ({ pelvis: [80, 72], torso: 180, head: 180, spineScale: 0.35, ...extra });
const feetFloor = { floor: 86 };

// Spreidzit tegen de muur (vanaf de muur gezien): billen tegen de muur, de
// gestrekte benen omhoog en dan in een V naar buiten.
LIGGEND.spreidzit_muur = {
  view: 'front',
  viewBox: [36, 14, 88, 76],
  props: [feetFloor, { rect: [40, 16, 80, 70] }],
  active: ['n.thigh', 'f.thigh'],
  poses: {
    start: fromFeet({ pelvis: [80, 68], torso: 0, head: 0, spineScale: 0.3, legs: { n: { angle: 176, foot: 176 }, f: { angle: -176, foot: -176 } }, arms: { n: { angle: 60, fore: 60 }, f: { angle: -60, fore: -60 } } }),
    stretch: fromFeet({ pelvis: [80, 68], torso: 0, head: 0, spineScale: 0.3, legs: { n: { angle: 140, foot: 140 }, f: { angle: -140, foot: -140 } }, arms: { n: { angle: 62, fore: 62 }, f: { angle: -62, fore: -62 } } }),
  },
  timelines: staticTimelines(),
};

// Brede vlinder (van boven): voetzolen tegen elkaar, hielen ver weg; de knieën
// wijzen eerst naar het plafond (voorverkort) en zakken naar buiten.
LIGGEND.vlinder_breed = (() => {
  const legs = (scale) => ({ n: { ankle: [106, 55], bend: 'up', scale, foot: 60 }, f: { ankle: [106, 57], bend: 'down', scale, foot: 120 } });
  const arms = { n: { angle: 150, fore: 120 }, f: { angle: 30, fore: 60 } };
  return {
    view: 'front',
    viewBox: [20, 20, 120, 72],
    props: [mat],
    active: ['n.thigh', 'f.thigh'],
    poses: {
      start: fromAbove({ legs: legs(0.7), arms }),
      stretch: fromAbove({ legs: legs(0.9), arms }),
    },
    timelines: staticTimelines(),
  };
})();

// Borst open op een handdoekrol (van boven): de rol in de lengte onder de rug,
// knieën gebogen (voorverkort); de armen zakken in een T naar de vloer en
// worden in beeld dus langer.
LIGGEND.borst_ruglig_handdoek = {
  view: 'front',
  viewBox: [20, 14, 120, 84],
  props: [{ rect: [22, 16, 116, 80] }, { rect: [52, 54, 30, 4], solid: true }],
  active: ['shoulders', 'n.arm', 'f.arm'],
  poses: {
    start: fromAbove({ legs: { n: { angle: 90, foot: 90, scale: 0.45 }, f: { angle: 90, foot: 90, scale: 0.45 } }, arms: { n: { angle: 165, fore: 165, scale: 0.45 }, f: { angle: 15, fore: 15, scale: 0.45 } } }),
    stretch: fromAbove({ legs: { n: { angle: 90, foot: 90, scale: 0.45 }, f: { angle: 90, foot: 90, scale: 0.45 } }, arms: { n: { angle: 168, fore: 168 }, f: { angle: 12, fore: 12 } } }),
  },
  timelines: staticTimelines(),
};

// Zijlig van boven gezien (voorkant onder in beeld): knieën 90° naar voren.
const sideAbove = (extra) => ({ pelvis: [84, 52], torso: -90, head: -90, legs: { n: { angle: 0, shin: 90, foot: 180 }, f: { angle: 2, shin: 92, foot: 182 } }, ...extra });

// Open boek (van boven): knieën op elkaar; de bovenste arm (n) draait in een
// boog van voor naar achter (halverwege wijst hij naar het plafond en is hij
// in beeld kort), 5 s in de eindstand.
LIGGEND.open_boek = {
  viewBox: [24, 14, 112, 78],
  props: [{ rect: [26, 16, 108, 74] }],
  active: ['n.arm', 'spine.high'],
  poses: {
    closed: sideAbove({ arms: { n: { angle: 4, fore: 4 }, f: { angle: 0, fore: 0 } } }),
    mid: sideAbove({ head: -110, arms: { n: { angle: 90, fore: 90, scale: 0.15 }, f: { angle: 0, fore: 0 } } }),
    open: sideAbove({ head: -125, arms: { n: { angle: 176, fore: 176 }, f: { angle: 0, fore: 0 } } }),
  },
  timelines: loopTimelines(6667, [[0, 'closed'], [0.08, 'mid'], [0.16, 'open'], [0.9, 'open'], [0.95, 'mid'], [1, 'closed']], 'open'),
};

// Sleeper stretch aangepast (van boven): op de te rekken schouder (n); de
// bovenarm voor je op 90°, elleboog 90° met de onderarm naar het plafond
// (voorverkort); de andere hand duwt de onderarm zacht naar de grond, in beeld
// richting de voeten.
LIGGEND.sleeper_aangepast = {
  viewBox: [24, 14, 112, 78],
  props: [{ rect: [26, 16, 108, 74] }],
  active: ['n.arm'],
  poses: {
    start: sideAbove({ arms: { n: { angle: 0, fore: 90, foreScale: 0.2 }, f: { hand: 'n.foreMid', bend: 'up' } } }),
    stretch: sideAbove({ arms: { n: { angle: 0, fore: 90, foreScale: 0.85 }, f: { hand: 'n.foreMid', bend: 'up' } } }),
  },
  timelines: staticTimelines(),
};

// Zijlig aan de bedrand (Ober-houding), van voren gezien: onderste knie
// gebogen (naar de kijker, voorverkort), het bovenste been (n) gestrekt iets
// naar achteren en ontspannen omlaag over de rand. Alleen dat been moet
// gestrekt blijven (kneeFlexionMaxDeg 0).
LIGGEND.heup_buiten_bedrand = {
  viewBox: [16, 20, 112, 70],
  kneeCheck: ['n'],
  props: [{ floor: 86 }, { rect: [14, 58, 70, 28] }],
  active: ['n.thigh'],
  poses: {
    start: { pelvis: [72, 54], torso: -90, head: -92, legs: { n: { angle: 90, foot: 90 }, f: { angle: 90, shin: 90, scale: 0.6, foot: 90 } }, arms: { n: { angle: 92, fore: 92 }, f: { angle: -100, fore: -170 } } },
    stretch: { pelvis: [72, 54], torso: -90, head: -92, legs: { n: { angle: 70, foot: 70 }, f: { angle: 90, shin: 90, scale: 0.6, foot: 90 } }, arms: { n: { angle: 92, fore: 92 }, f: { angle: -100, fore: -170 } } },
  },
  timelines: staticTimelines(),
};
