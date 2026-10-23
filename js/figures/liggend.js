// Stokfiguren: liggende oefeningen. Zie rig.js voor het skelet en de hoeken.
// Zijaanzicht: hoofd links, de rug langs de vloer (y 78). Waar een beweging
// dwars op het beeld loopt, staat het figuur in 3D op een mat en kijkt een
// camera er schuin naar (zie rig3d.js).
import { joints, staticTimelines, loopTimelines } from './rig.js';
import { floorRect } from './rig3d.js';

// In 3D (zie rig3d.js). Ruglig: hoofd naar -x, de n-kant naar de kijker (z+),
// de borst omhoog. Zijlig: hoofd naar +x, de n-kant boven, de borst naar de
// kijker.
const supine3 = (extra) => ({ pelvis: [0, 4, 0], torso: [-1, 0, 0], head: [-1, 0.12, 0], side: [0, 0, 1], ...extra });
const flat3 = { thigh: [1, -0.05, 0], foot: [0, 1, 0] }; // gestrekt op de vloer, tenen omhoog
const sideLying = (extra) => ({ pelvis: [0, 8, 0], torso: [1, 0, 0], head: [1, 0.05, 0], side: [0, 1, 0], ...extra });

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

// Piriformis diagonaal (3D, schuin vanaf de voeten): de knie van het te
// rekken been (n) diagonaal naar de andere schouder, het onderbeen dwars
// (knie ≤ 90°); de ene hand op de knie, de andere bij de enkel. Het andere
// been ligt gestrekt.
LIGGEND.piriformis_diagonaal = {
  view: '3d',
  camera: { yaw: 25, pitch: 40 },
  viewBox: [38, 46, 86, 56],
  props: [floorRect(-34, 34, -26, 16)],
  active: ['n.thigh'],
  poses: {
    start: supine3({ legs: { n: { thigh: [-0.45, 0.9, 0], shin: [0.9, 0.6, 0], foot: [-0.55, 0.85, 0] }, f: flat3 }, arms: { n: { hand: 'n.knee', elbow: [0, 0.5, 1] }, f: { hand: 'n.knee', elbow: [0, 0.5, -1] } } }),
    stretch: supine3({ legs: { n: { thigh: [-0.6, 0.7, -0.4], shin: [0.3, -0.1, -1], foot: [0, 1, -0.1] }, f: flat3 }, arms: { n: { hand: 'n.knee', elbow: [0, 0.5, 1] }, f: { hand: 'n.ankle', elbow: [0, 0.5, -1] } } }),
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

// Rectus femoris zijlig (3D, schuin van boven): onderste heup en knie op 90°
// (f) zetten het bekken vast; de band om de enkel van het bovenste been (n),
// die heup gaat naar achteren met de knie op 90°.
LIGGEND.rf_zijlig = (() => {
  const bottom = { thigh: [0, -0.05, 1], shin: [-1, 0, 0], foot: [0, 0, 1] };
  const arm = { upper: [0.2, 0.02, 1], fore: [0.8, 0.05, 0.5] }; // onderste arm onder het hoofd
  return {
    view: '3d',
    camera: { yaw: -20, pitch: 50 },
    viewBox: [44, 50, 86, 66],
    props: [floorRect(-32, 36, -30, 24)],
    bands: [['n.hand', 'n.ankle']],
    active: ['n.thigh'],
    poses: {
      start: sideLying({ legs: { n: { thigh: [-1, 0, 0], shin: [0, 0, -1], foot: [0, 0, -1] }, f: bottom }, arms: { n: { hand: [2, 13, -8], elbow: [0, 1, -0.3] }, f: arm } }),
      stretch: sideLying({ legs: { n: { thigh: [-0.94, 0, -0.34], shin: [0.34, 0, -0.94], foot: [0.34, 0, -0.94] }, f: bottom }, arms: { n: { hand: [0, 13, -10], elbow: [0, 1, -0.3] }, f: arm } }),
    },
    timelines: staticTimelines(),
  };
})();

// Been over het lichaam (3D, schuin vanaf de voeten): armen in een T, het
// gestrekte been (n) over het lichaam naar de andere kant; het bekken draait
// mee, de schouders blijven liggen.
const tArms = { n: { upper: [0.05, -0.1, 1] }, f: { upper: [0.05, -0.1, -1] } };
LIGGEND.heup_buiten_kruis_ruglig = {
  view: '3d',
  camera: { yaw: 30, pitch: 55 },
  viewBox: [38, 46, 86, 64],
  props: [floorRect(-30, 38, -28, 26)],
  active: ['n.thigh'],
  poses: {
    start: supine3({ legs: { n: flat3, f: flat3 }, arms: tArms }),
    stretch: supine3({ side: [0, 0.45, 0.9], chestSide: [0, 0, 1], legs: { n: { thigh: [0.7, -0.12, -0.7], foot: [0.3, 0.6, 0.3] }, f: flat3 }, arms: tArms }),
  },
  timelines: staticTimelines(),
};

// Banaan (3D, van schuin boven): armen boven het hoofd; voeten en handen naar
// dezelfde kant (f), zodat het lichaam een boog vormt. De billen blijven
// liggen.
LIGGEND.banaan_ruglig = (() => {
  const up = (z) => ({ upper: [-1, -0.04, z] });
  return {
    view: '3d',
    camera: { yaw: 20, pitch: 65 },
    viewBox: [24, 41, 102, 66],
    props: [floorRect(-58, 40, -26, 20)],
    active: ['spine.low', 'spine.high'],
    poses: {
      start: supine3({ legs: { n: flat3, f: flat3 }, arms: { n: up(0.12), f: up(-0.12) } }),
      stretch: supine3({ torso: [-1, 0, -0.18], chest: [-0.9, 0, -0.45], head: [-0.8, 0.1, -0.55], legs: { n: { thigh: [0.9, -0.05, -0.45], foot: [0, 1, 0] }, f: { thigh: [0.86, -0.05, -0.52], foot: [0, 1, 0] } }, arms: { n: up(-0.5), f: up(-0.75) } }),
    },
    timelines: staticTimelines(),
  };
})();

// Rugdraai (3D, schuin vanaf de voeten): armen in een T, knieën gebogen met de
// voeten plat; beide knieën zakken samen naar één kant (f), het bekken draait
// mee en de schouders blijven liggen. Knie ≤ 90°.
LIGGEND.rug_rotatie_ruglig = (() => {
  const X = 28.5; // enkels zo ver dat de knie niet voorbij 90° buigt
  return {
    view: '3d',
    camera: { yaw: -40, pitch: 40 },
    viewBox: [35, 56, 80, 61],
    props: [floorRect(-30, 36, -28, 24)],
    active: ['spine.low'],
    poses: {
      start: supine3({ legs: { n: { ankle: [X, 2, 4], knee: [0, 1, 0.1], foot: [1, -0.2, 0] }, f: { ankle: [X, 2, -4], knee: [0, 1, -0.1], foot: [1, -0.2, 0] } }, arms: tArms }),
      stretch: supine3({ side: [0, 0.7, 0.7], chestSide: [0, 0, 1], legs: { n: { ankle: [X, 5, -4], knee: [0, 0.02, -1], foot: [1, -0.2, -0.3] }, f: { ankle: [X, 2, -10], knee: [0, -0.1, -1], foot: [1, -0.2, -0.3] } }, arms: tArms }),
    },
    timelines: staticTimelines(),
  };
})();

// Spreidzit tegen de muur (3D, schuin vanuit de kamer): ruglig met de billen
// tegen de muur, de gestrekte benen omhoog en dan in een V naar buiten.
LIGGEND.spreidzit_muur = (() => {
  const WALL = 3.5;
  const legs = (deg) => {
    const [c, s] = [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
    return { n: { thigh: [0.05, c, s], foot: [-1, 0.3, 0] }, f: { thigh: [0.05, c, -s], foot: [-1, 0.3, 0] } };
  };
  const arms = { n: { upper: [-0.6, -0.11, 0.8] }, f: { upper: [-0.6, -0.11, -0.8] } };
  return {
    view: '3d',
    camera: { yaw: -80, pitch: 30 },
    viewBox: [36, 38, 82, 76],
    props: [floorRect(-36, WALL, -24, 24), { poly: [[WALL, 0, -32], [WALL, 0, 32], [WALL, 42, 32], [WALL, 42, -32]] }],
    active: ['n.thigh', 'f.thigh'],
    poses: {
      start: supine3({ legs: legs(6), arms }),
      stretch: supine3({ legs: legs(40), arms }),
    },
    timelines: staticTimelines(),
  };
})();

// Brede vlinder (3D, schuin vanaf de voeten): ruglig, voetzolen tegen elkaar
// met de hielen ver weg (knie ≤ 80°); de knieën wijzen eerst omhoog en zakken
// naar buiten.
LIGGEND.vlinder_breed = (() => {
  const X = 30.5; // enkels zo ver dat de knie niet voorbij 80° buigt
  const legs = (out) => ({
    n: { ankle: [X, 3, 1.5], knee: [0, 1 - out, out], foot: [0.6, 0.3, -0.8] },
    f: { ankle: [X, 3, -1.5], knee: [0, 1 - out, -out], foot: [0.6, 0.3, 0.8] },
  });
  const arms = { n: { upper: [0.7, -0.1, 0.7] }, f: { upper: [0.7, -0.1, -0.7] } };
  return {
    view: '3d',
    camera: { yaw: 75, pitch: 35 },
    viewBox: [46, 52, 66, 56],
    props: [floorRect(-30, 36, -24, 24)],
    active: ['n.thigh', 'f.thigh'],
    poses: {
      start: supine3({ legs: legs(0.15), arms }),
      stretch: supine3({ legs: legs(0.7), arms }),
    },
    timelines: staticTimelines(),
  };
})();

// Borst open op een handdoekrol (3D, schuin vanaf de voeten): de rol in de
// lengte onder de rug, knieën gebogen; de armen in een T met de handpalmen
// omhoog zakken met de schouders naar de vloer.
LIGGEND.borst_ruglig_handdoek = (() => {
  const roll = { poly: [[-34, 3, -2], [2, 3, -2], [2, 3, 2], [-34, 3, 2]], solid: true };
  const legs = { n: { ankle: [27, 2, 7], knee: [0, 1, 0.2], foot: [1, -0.2, 0] }, f: { ankle: [27, 2, -7], knee: [0, 1, -0.2], foot: [1, -0.2, 0] } };
  const arms = (y) => ({ n: { upper: [0.05, y, 1] }, f: { upper: [0.05, y, -1] } });
  const base = { pelvis: [0, 6.5, 0], torso: [-1, 0, 0], head: [-1, 0.05, 0], side: [0, 0, 1], legs };
  return {
    view: '3d',
    camera: { yaw: 80, pitch: 30 },
    viewBox: [36, 51, 80, 58],
    props: [floorRect(-34, 34, -32, 32), roll],
    active: ['shoulders', 'n.arm', 'f.arm'],
    poses: {
      start: { ...base, arms: arms(0.45) },
      stretch: { ...base, arms: arms(-0.2) },
    },
    timelines: staticTimelines(),
  };
})();

// Open boek (3D): zijlig, knieën op 90° op elkaar met een kussen ertussen; de
// bovenste arm (n) draait in een boog van voor naar achter en de borst draait
// mee open, 5 s in de eindstand.
LIGGEND.open_boek = (() => {
  const legs = { n: { thigh: [0, -0.25, 1], shin: [-1, 0, 0], foot: [0, 0, 1] }, f: { thigh: [0, -0.1, 1], shin: [-1, 0, 0], foot: [0, 0, 1] } };
  const pose = (chestSide, top, bottom, head) => sideLying({ chestSide, head, legs, arms: { n: { upper: top }, f: { upper: bottom } } });
  return {
    view: '3d',
    camera: { yaw: 70, pitch: 35 },
    viewBox: [43, 57, 82, 54],
    props: [floorRect(-26, 32, -38, 30)],
    active: ['n.arm', 'spine.high'],
    poses: {
      closed: pose([0, 1, 0], [0, -0.5, 0.87], [0, -0.02, 1], [1, 0.05, 0]),
      mid: pose([0, 0.85, -0.5], [0, 1, 0.05], [0, -0.05, 1], [1, 0.2, -0.15]),
      open: pose([0, 0.35, -0.94], [0, -0.3, -0.95], [0, -0.18, 1], [1, 0.2, -0.35]),
    },
    timelines: loopTimelines(6667, [[0, 'closed'], [0.08, 'mid'], [0.16, 'open'], [0.9, 'open'], [0.95, 'mid'], [1, 'closed']], 'open'),
  };
})();

// Sleeper stretch aangepast (3D): zijlig op de te rekken schouder (n onder),
// 25° naar achteren gerold; de bovenarm (n) op de vloer recht voor je, de
// elleboog 90° met de onderarm omhoog; de andere hand duwt die onderarm zacht
// richting de vloer aan de kant van de voeten.
LIGGEND.sleeper_aangepast = (() => {
  const roll = (25 * Math.PI) / 180;
  const legs = { n: { thigh: [0.7, 0, 0.7], shin: [0.7, 0, -0.7], foot: [0.7, 0, 0.7] }, f: { thigh: [0.7, -0.25, 0.7], shin: [0.7, 0, -0.7], foot: [0.7, 0, 0.7] } };
  const pose = (fore) => ({
    pelvis: [0, 7.6, 0], torso: [-1, 0, 0], head: [-1, 0.05, 0.1], side: [0, -Math.cos(roll), Math.sin(roll)], legs,
    arms: { n: { upper: [0, 0.03, 1], fore }, f: { hand: 'n.foreMid', elbow: [0, 1, -0.3] } },
  });
  return {
    view: '3d',
    camera: { yaw: -30, pitch: 18 },
    viewBox: [38, 58, 84, 46],
    props: [floorRect(-32, 36, -20, 26)],
    active: ['n.arm'],
    poses: {
      start: pose([0, 1, 0]),
      stretch: pose([0.75, 0.66, 0]),
    },
    timelines: staticTimelines(),
  };
})();

// Zijlig aan de bedrand (Ober-houding, 3D): met de rug bij de rand van het
// bed, onderste knie gebogen (f); het bovenste been (n) gestrekt iets naar
// achteren en ontspannen omlaag over de rand. Alleen dat been moet gestrekt
// blijven (kneeFlexionMaxDeg 0).
LIGGEND.heup_buiten_bedrand = (() => {
  const BED = 20; // hoogte van het matras; de rugkant van het bed op z = -10
  // Gezien van achter het bed: bovenkant, achterkant (z = -10) en hoofdeinde.
  const bed = [
    { poly: [[-52, BED, -10], [34, BED, -10], [34, BED, 26], [-52, BED, 26]] },
    { poly: [[-52, 0, -10], [34, 0, -10], [34, BED, -10], [-52, BED, -10]] },
    { poly: [[34, 0, -10], [34, 0, 26], [34, BED, 26], [34, BED, -10]] },
  ];
  const base = { pelvis: [0, BED + 8, -4], torso: [1, 0, 0], head: [1, 0.05, 0], side: [0, 1, 0] };
  const bottom = { thigh: [-0.7, 0, 0.7], shin: [-0.7, 0, -0.7], foot: [-0.7, 0, 0.7] };
  const arms = { n: { hand: [12, BED + 1, 8], elbow: [0, 1, 0.5] }, f: { upper: [0.2, 0.05, 1], fore: [0.85, 0.1, 0.5] } };
  return {
    view: '3d',
    camera: { yaw: 160, pitch: 20 },
    viewBox: [34, 42, 94, 56],
    kneeCheck: ['n'],
    props: bed,
    active: ['n.thigh'],
    poses: {
      start: { ...base, legs: { n: { thigh: [-0.98, 0, -0.2], foot: [0, 0, 1] }, f: bottom }, arms },
      stretch: { ...base, legs: { n: { thigh: [-0.85, -0.38, -0.36], foot: [0, -0.3, 1] }, f: bottom }, arms },
    },
    timelines: staticTimelines(),
  };
})();
