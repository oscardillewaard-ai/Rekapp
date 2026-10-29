// Stokfiguren: trainingsoefeningen (kracht, balans, plyometrie) voor de
// sjablonen Heupkracht en Enkelstabiliteit. Zie rig.js voor het skelet en de
// hoeken, rig3d.js voor de figuren in 3D. Eén lus van de beweging duurt zo
// lang als één herhaling in de standaarddosis (seconden ÷ herhalingen).
import { above, legReach, pelvisOn, onLeg, angleOf, joints, staticTimelines, loopTimelines } from './rig.js';
import { floorRect, across, unit, shoulderOf } from './rig3d.js';

const FLOOR = 86;
const ANKLE = FLOOR - 2; // enkel net boven de vloer

// Koepel van een BOSU als veelhoek: midden cx, straal r, op de vloer.
function dome(cx, r, h) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = Math.PI * (i / 12);
    pts.push([cx - r * Math.cos(t), FLOOR - h * Math.sin(t)]);
  }
  return { poly: pts, solid: true };
}
const DOME_H = 6; // hoogte van de koepel; de enkel staat er 2 boven

export const TRAINING = {};

// Een been dat in een houding met hoeken staat, als vast doel (zelfde beeld),
// zodat het vloeiend mengt met een houding die voor dat been een doel heeft.
function pinLeg(pose, k, bend, view = 'side') {
  const ankle = joints(pose, view)[k].ankle;
  return { ...pose, legs: { ...pose.legs, [k]: { ankle, bend, foot: pose.legs[k].foot } } };
}

// ---------- Heupen ----------

// Zijlig (3D, schuin van voren): hoofd naar +x, de n-kant boven, de borst
// naar de kijker. Het bovenste been (n) gaat gestrekt omhoog tot net boven
// heuphoogte, iets naar achteren (heup licht gestrekt); het onderste been licht
// gebogen; het hoofd op de onderste arm.
const sideLying = (n) => ({
  pelvis: [0, 8, 0], torso: [1, 0, 0], head: [1, 0.05, 0], side: [0, 1, 0],
  legs: { n, f: { thigh: [-0.94, 0, 0.34], shin: [-0.94, 0, -0.34], foot: [0, 0, 1] } },
  arms: { n: { hand: 'n.hip', elbow: [0, 1, 0.5] }, f: { upper: [0.2, 0.02, 1], fore: [0.8, 0.05, 0.5] } },
});
TRAINING.heup_abductie_zij = {
  view: '3d',
  camera: { yaw: -15, pitch: 22 },
  viewBox: [30, 34, 96, 56],
  props: [floorRect(-48, 36, -14, 22)],
  active: ['n.thigh'],
  poses: {
    down: sideLying({ thigh: [-1, -0.02, 0], foot: [0, 0, 1] }),
    up: sideLying({ thigh: unit([-0.9, 0.42, -0.1]), foot: [0, 0, 1] }),
  },
  timelines: loopTimelines(3333, [[0, 'down'], [0.3, 'up'], [0.6, 'up'], [0.9, 'down'], [1, 'down']], 'up'),
};

// Zijsteun (3D, schuin van voren): op de onderste onderarm (f), elleboog onder
// de schouder, voeten op elkaar; het bekken gaat omhoog tot het lichaam één
// lijn is. De bovenste hand in de zij.
// In de beginhouding ligt het bekken op de vloer; de benen wijzen dan naar
// (bijna) dezelfde voeten, zonder dat de enkels precies vastliggen.
TRAINING.zijsteun = (() => {
  const UP = [0, 15, 0];
  const frame = (deg) => {
    const t = (deg * Math.PI) / 180;
    const T = [Math.cos(t), Math.sin(t), 0];
    return { T, L: across([0, 1, 0], T) };
  };
  // Voeten waar de gestrekte benen in de eindhouding uitkomen.
  const FEET = (() => {
    const { T, L } = frame(15);
    const foot = (sign) => UP.map((x, i) => x + L[i] * 4 * sign - T[i] * 39);
    return { n: foot(1), f: foot(-1) };
  })();
  const pose = (pelvis, deg, fixedFeet) => {
    const { T, L } = frame(deg);
    const leg = (k) => {
      if (fixedFeet) return { ankle: FEET[k], straight: true, foot: [0, 0, 1] };
      const hip = pelvis.map((x, i) => x + L[i] * (k === 'n' ? 4 : -4));
      return { thigh: unit(FEET[k].map((x, i) => x - hip[i])), foot: [0, 0, 1] };
    };
    return {
      pelvis, torso: T, head: [T[0], T[1] + 0.05, 0], side: [0, 1, 0],
      legs: { n: leg('n'), f: leg('f') },
      arms: { n: { hand: 'n.hip', elbow: [0, 1, 0.5] }, f: { upper: [0, -1, 0], fore: [0.85, 0, 0.5] } },
    };
  };
  return {
    view: '3d',
    camera: { yaw: -15, pitch: 18 },
    viewBox: [30, 42, 96, 52],
    props: [floorRect(-48, 36, -14, 22)],
    active: ['spine.low', 'n.thigh', 'f.thigh'],
    poses: { down: pose([0, 3.4, 0], 43, false), up: pose(UP, 15, true) },
    timelines: staticTimelines('down', 'up'),
  };
})();

// Eenbenige bridge (zijaanzicht, ruglig, hoofd links): de voet van het
// werkende been (n) plat, knie ~90°; het andere been gestrekt in het
// verlengde van de dij. Het bekken gaat omhoog tot schouder, heup en knie op
// één lijn liggen.
TRAINING.bridge_eenbenig = (() => {
  const FL = 82; // vloer van de liggende figuren
  const S = [44, 78]; // schouder op de vloer
  const A = [93.5, FL - 2]; // knie ~90° onderin, iets minder bovenin
  const pose = (phi) => {
    const t = (phi * Math.PI) / 180;
    const P = [S[0] + 23 * Math.cos(t), S[1] - 23 * Math.sin(t)];
    const base = {
      pelvis: P, torso: -90 + phi, head: -96, legs: { n: { ankle: A, bend: 'up', foot: 90 }, f: { angle: 90, foot: 180 } },
      arms: { n: { angle: 88, fore: 90 }, f: { angle: 89, fore: 91 } },
    };
    const pts = joints(base);
    const thigh = angleOf(pts.n.hip, pts.n.knee);
    return { ...base, legs: { ...base.legs, f: { angle: thigh, foot: thigh + 90 } } };
  };
  return {
    viewBox: [16, 40, 92, 46],
    props: [{ floor: FL }],
    active: ['n.thigh', 'spine.low'],
    poses: { down: pose(12), up: pose(28) },
    timelines: loopTimelines(3333, [[0, 'down'], [0.35, 'up'], [0.6, 'up'], [1, 'down']], 'up'),
  };
})();

// Staande abductie met band (vooraanzicht): band om de enkels, een hand aan
// de muur (links), de andere in de zij. Het been (n) gaat gestrekt opzij.
TRAINING.abductie_band = (() => {
  const pose = (angle) => ({
    pelvis: [80, 45], torso: 180, head: 180, place: { joint: 'f.ankle', at: [76, ANKLE] },
    legs: { n: { angle, foot: angle + 80 }, f: { angle: 0, foot: -80 } },
    arms: { n: { hand: 'n.hip', bend: 'front' }, f: { hand: [61, 44], bend: 'down' } },
  });
  return {
    view: 'front',
    viewBox: [52, -2, 60, 92],
    props: [{ floor: FLOOR }, { wall: 59, y1: 2, y2: FLOOR }],
    bands: [['n.ankle', 'f.ankle']],
    active: ['n.thigh', 'f.thigh'],
    poses: { in: pose(2), out: pose(30) },
    timelines: loopTimelines(2667, [[0, 'in'], [0.4, 'out'], [0.55, 'out'], [1, 'in']], 'out'),
  };
})();

// Eenbenige RDL (zijaanzicht): op het nabije been (n), knie licht gebogen.
// Kantelen vanuit de heup: romp bijna horizontaal, het vrije been (f) gestrekt
// naar achteren in het verlengde; armen hangen loodrecht.
TRAINING.rdl_eenbenig = (() => {
  const N = [86, ANKLE];
  return {
    viewBox: [34, 1, 88, 89],
    props: [{ floor: FLOOR }],
    active: ['n.thigh', 'spine.low'],
    poses: {
      up: { pelvis: onLeg(N, 181, 8), torso: 180, head: 180, legs: { n: { ankle: N, bend: 'front', foot: 90 }, f: { angle: -6, shin: -14, foot: 70 } }, arms: { n: { angle: 4, fore: 8 }, f: { angle: 2, fore: 6 } } },
      down: { pelvis: onLeg(N, 192, 20), torso: 100, head: 96, legs: { n: { ankle: N, bend: 'front', foot: 90 }, f: { angle: -80, shin: -80, foot: 10 } }, arms: { n: { angle: 0, fore: 0 }, f: { angle: 2, fore: 2 } } },
    },
    timelines: loopTimelines(4000, [[0, 'up'], [0.45, 'down'], [0.6, 'down'], [1, 'up']], 'down'),
  };
})();

// Eenbenige squat voor de spiegel (3D, schuin van voren): op het nabije been
// (n), het andere been licht naar voren. Zakken tot ~45° kniebuiging, bekken
// waterpas, knie boven de tweede teen; handen in de zij.
TRAINING.squat_eenbenig = (() => {
  const free = { thigh: unit([0.45, -0.9, 0]), shin: unit([0.25, -1, 0]), foot: [1, 0, 0] };
  const pose = (pelvis, lean) => ({
    pelvis, torso: unit([lean, 1, 0]), head: unit([lean * 0.6, 1, 0]),
    legs: { n: { ankle: [0, 2, 4], knee: [1, 0, 0], foot: [1, 0, 0] }, f: free },
    arms: { n: { hand: 'n.hip', elbow: [-0.2, 0, 1] }, f: { hand: 'f.hip', elbow: [-0.2, 0, -1] } },
  });
  return {
    view: '3d',
    camera: { yaw: 40, pitch: 12 },
    viewBox: [44, 0, 70, 92],
    props: [floorRect(-20, 30, -18, 22)],
    active: ['n.thigh'],
    poses: { up: pose([-1, 41, 0], 0.03), down: pose([-6, 37.6, 0], 0.3) },
    timelines: loopTimelines(4375, [[0, 'up'], [0.45, 'down'], [0.6, 'down'], [1, 'up']], 'down'),
  };
})();

// ---------- Enkels ----------

// Runner's touch (zijaanzicht): op het verre been (f); de nabije knie (n)
// omhoog en de arm aan dezelfde kant boven het hoofd. Dan voorover reiken en
// met die hand de knie van het standbeen aantikken; het vrije been gaat mee
// naar achteren. Terug naar de start.
TRAINING.runners_touch = (() => {
  const F = [84, ANKLE];
  return {
    viewBox: [48, -14, 72, 104],
    props: [{ floor: FLOOR }],
    kneeCheck: ['f'], // de opgetrokken knie is onbelast
    active: ['f.shin', 'f.foot'],
    poses: {
      top: { pelvis: onLeg(F, 180, 4), torso: 180, head: 180, legs: { n: { angle: 95, shin: 5, foot: 100 }, f: { ankle: F, bend: 'front', foot: 90 } }, arms: { n: { hand: [92, -3], bend: 'down' }, f: { angle: -25, fore: -10 } } },
      touch: { pelvis: onLeg(F, 188, 40), torso: 105, head: 100, legs: { n: { angle: -45, shin: -15, foot: 40 }, f: { ankle: F, bend: 'front', foot: 90 } }, arms: { n: { hand: 'f.knee', bend: 'down' }, f: { angle: -55, fore: -40 } } },
    },
    timelines: loopTimelines(4000, [[0, 'top'], [0.4, 'touch'], [0.55, 'touch'], [1, 'top']], 'touch'),
  };
})();

// BOSU-reach (zijaanzicht): op één been (n) op de koepel, de bal met twee
// handen voor de borst; langzaam naar voren uitstrekken en terug.
TRAINING.bosu_reach = (() => {
  const N = [84, FLOOR - DOME_H - 2];
  const legs = { n: { ankle: N, bend: 'front', foot: 90 }, f: { angle: -12, shin: -60, foot: 20 } };
  return {
    viewBox: [52, -6, 64, 96],
    props: [{ floor: FLOOR }, dome(85, 13, DOME_H)],
    kneeCheck: ['n'], // het vrije been hangt gebogen achter je
    weights: [['n.hand', 3.2]],
    active: ['n.shin', 'n.foot'],
    poses: {
      close: { pelvis: onLeg(N, 181, 14), torso: 178, head: 180, legs, arms: { n: { hand: [92, 27], bend: 'down' }, f: { hand: [92, 27.5], bend: 'down' } } },
      reach: { pelvis: onLeg(N, 184, 18), torso: 170, head: 172, legs, arms: { n: { hand: [108.5, 30], bend: 'down' }, f: { hand: [108.5, 30.5], bend: 'down' } } },
    },
    timelines: loopTimelines(4000, [[0, 'close'], [0.45, 'reach'], [0.6, 'reach'], [1, 'close']], 'reach'),
  };
})();

// Step-up met balans (zijaanzicht): een voet (n) op de trede, omhoog drukken en
// bovenaan de andere knie optrekken; een arm als tegenwicht. Langzaam terug.
TRAINING.stepup_balans = (() => {
  const STEP = 12;
  const N = [100, FLOOR - STEP - 2];
  const F = [82, ANKLE];
  return {
    viewBox: [56, -6, 72, 96],
    props: [{ floor: FLOOR }, { rect: [92, FLOOR - STEP, 30, STEP], solid: true }],
    kneeCheck: ['n'], // de opgetrokken knie is onbelast
    active: ['n.thigh', 'n.shin'],
    poses: {
      start: { pelvis: pelvisOn([N, 70], [F, 8]), torso: 172, head: 176, legs: { n: { ankle: N, bend: 'front', foot: 90 }, f: { ankle: F, bend: 'front', foot: 90 } }, arms: { n: { angle: -20, fore: -10 }, f: { angle: 20, fore: 40 } } },
      top: pinLeg({ pelvis: onLeg(N, 180, 4), torso: 178, head: 180, legs: { n: { ankle: N, bend: 'front', foot: 90 }, f: { angle: 92, shin: 2, foot: 95 } }, arms: { n: { angle: 40, fore: 70 }, f: { angle: -30, fore: -15 } } }, 'f', 'front'),
    },
    timelines: loopTimelines(4375, [[0, 'start'], [0.4, 'top'], [0.6, 'top'], [1, 'start']], 'top'),
  };
})();

// Bulgarian split squat op BOSU (zijaanzicht): achterste voet (f) op een
// trede, voorste voet (n) op de koepel. Recht omlaag zakken en weer omhoog.
TRAINING.bulgarian_bosu = (() => {
  const STEP = 14;
  const N = [100, FLOOR - DOME_H - 2];
  const F = [66, FLOOR - STEP - 3];
  const legs = { n: { ankle: N, bend: 'front', foot: 90 }, f: { ankle: F, bend: 'front', foot: -40 } };
  const arms = { n: { angle: 8, fore: 14 }, f: { angle: 4, fore: 10 } };
  return {
    viewBox: [40, -6, 82, 96],
    props: [{ floor: FLOOR }, dome(101, 13, DOME_H), { rect: [44, FLOOR - STEP, 24, STEP], solid: true }],
    active: ['n.thigh', 'n.shin'],
    poses: {
      up: { pelvis: pelvisOn([N, 18], [F, 40]), torso: 178, head: 180, legs, arms },
      down: { pelvis: pelvisOn([N, 92], [F, 100]), torso: 172, head: 176, legs, arms },
    },
    timelines: loopTimelines(5000, [[0, 'up'], [0.45, 'down'], [0.6, 'down'], [1, 'up']], 'down'),
  };
})();

// Eenbenige RDL met rotatie (3D, schuin van voren): op het nabije been (n),
// het gewicht in de hand aan de kant van het vrije been (f). Voorover kantelen
// en het gewicht schuin over het lichaam naar de standvoet brengen.
TRAINING.rdl_rotatie = (() => {
  const stand = { ankle: [0, 2, 4], knee: [1, 0, 0], foot: [1, 0, 0] };
  const upBase = { pelvis: [-1, 40.5, 0], torso: [0, 1, 0], head: [0.1, 1, 0] };
  const fShoulder = shoulderOf({ ...upBase, legs: { n: stand, f: stand } }, 'f');
  const hang = [fShoulder[0] + 1.5, fShoulder[1] - 27, fShoulder[2] - 1.5]; // hand hangt langs het been
  const downBase = { pelvis: [-5, 40.3, 0.5], torso: unit([1, 0.3, 0]), head: unit([1, 0.35, 0]), chestSide: [0, 0.65, 0.75] };
  // Onderin reikt de hand schuin over het lichaam naar de standvoet.
  const reach = (() => {
    const sh = shoulderOf({ ...downBase, legs: { n: stand, f: stand } }, 'f');
    const toFoot = [8, 5, 5].map((x, i) => x - sh[i]);
    const len = Math.hypot(...toFoot);
    return sh.map((x, i) => x + (toFoot[i] / len) * Math.min(26.5, len));
  })();
  return {
    view: '3d',
    camera: { yaw: 40, pitch: 14 },
    viewBox: [30, 0, 92, 92],
    props: [floorRect(-40, 34, -18, 22)],
    weights: [['f.hand', 3]],
    active: ['n.thigh', 'n.shin'],
    poses: {
      up: {
        ...upBase,
        legs: { n: stand, f: { thigh: unit([-0.1, -1, 0]), shin: unit([-0.35, -0.95, 0]), foot: [0.6, -0.8, 0] } },
        arms: { n: { upper: [0.05, -1, 0.15], fore: [0.1, -1, 0.1] }, f: { hand: hang, elbow: [-1, 0, -0.3] } },
      },
      down: {
        ...downBase,
        legs: { n: stand, f: { thigh: unit([-0.95, 0.25, -0.1]), shin: unit([-0.95, 0.2, -0.1]), foot: [0, -1, 0] } },
        arms: { n: { upper: [0.1, -0.3, 1], fore: [0.3, -0.6, 0.6] }, f: { hand: reach, elbow: [-1, 0, -0.3] } },
      },
    },
    timelines: loopTimelines(4500, [[0, 'up'], [0.45, 'down'], [0.6, 'down'], [1, 'up']], 'down'),
  };
})();

// Band in-uit sprongen (vooraanzicht): band om de enkels, op de tenen; de
// voeten springen uit elkaar en weer naar elkaar.
TRAINING.band_inuit = (() => {
  const T = ANKLE - 3; // op de tenen
  const pose = (half, y, flex) => {
    const N = [80 + half, y];
    const F = [80 - half, y];
    return {
      pelvis: pelvisOn([N, flex], [F, flex], { view: 'front' }), torso: 180, head: 180,
      legs: { n: { ankle: N, bend: 'front', foot: 60 }, f: { ankle: F, bend: 'back', foot: -60 } },
      arms: { n: { angle: 25, fore: 60 }, f: { angle: -25, fore: -60 } },
    };
  };
  return {
    view: 'front',
    viewBox: [52, -4, 56, 94],
    props: [{ floor: FLOOR }],
    bands: [['n.ankle', 'f.ankle']],
    active: ['n.shin', 'f.shin'],
    poses: { in: pose(3, T, 14), up: pose(6, T - 4, 6), out: pose(10, T, 14) },
    timelines: loopTimelines(1000, [[0, 'in'], [0.25, 'up'], [0.5, 'out'], [0.75, 'up'], [1, 'in']], 'out'),
  };
})();

// Eenbenige drop landing (zijaanzicht): van een trede stappen, op één been
// (n) landen met de knie boven de tenen en de landing vasthouden; terug omhoog.
TRAINING.drop_landing = (() => {
  const STEP = 12;
  const top = [62, FLOOR - STEP - 2];
  const L = [92, ANKLE];
  return {
    viewBox: [38, -6, 86, 96],
    props: [{ floor: FLOOR }, { rect: [44, FLOOR - STEP, 26, STEP], solid: true }],
    kneeCheck: ['n'], // het vrije been hangt gebogen achter je
    active: ['n.thigh', 'n.shin'],
    poses: {
      top: { pelvis: onLeg(top, 180, 4), torso: 180, head: 180, legs: { n: { ankle: [top[0] + 2, top[1]], bend: 'front', foot: 90 }, f: { angle: -1, shin: 1, foot: 90 } }, arms: { n: { angle: 6, fore: 12 }, f: { angle: 3, fore: 8 } } },
      air: pinLeg({ pelvis: [78, 34], torso: 176, head: 178, legs: { n: { angle: 20, shin: 5, foot: 100 }, f: { angle: -10, shin: -35, foot: 50 } }, arms: { n: { angle: 50, fore: 70 }, f: { angle: 40, fore: 60 } } }, 'n', 'front'),
      land: { pelvis: onLeg(L, 196, 60), torso: 150, head: 162, legs: { n: { ankle: L, bend: 'front', foot: 90 }, f: { angle: -25, shin: -115, foot: -30 } }, arms: { n: { angle: 70, fore: 85 }, f: { angle: 60, fore: 80 } } },
    },
    timelines: loopTimelines(5000, [[0, 'top'], [0.22, 'air'], [0.34, 'land'], [0.7, 'land'], [1, 'top']], 'land'),
  };
})();

// Eenbenige pogo's (vooraanzicht): op één been (n), het andere licht
// opgetrokken; kleine sprongetjes zijwaarts heen en weer.
TRAINING.pogo_eenbenig = (() => {
  const pose = (x, lift) => ({
    pelvis: [80, 45], torso: 180, head: 180, place: { joint: 'n.ankle', at: [x, ANKLE - 1 - lift] },
    legs: { n: { angle: 1, shin: 1, foot: 70 }, f: { angle: -6, shin: 10, shinScale: 0.55, foot: -60 } },
    arms: { n: { angle: 30, fore: 70 }, f: { angle: -30, fore: -70 } },
  });
  return {
    view: 'front',
    viewBox: [44, 0, 74, 90],
    props: [{ floor: FLOOR }],
    active: ['n.shin', 'n.foot'],
    poses: { left: pose(80, 0), airL: pose(83, 4), right: pose(86, 0), airR: pose(83, 4) },
    timelines: loopTimelines(1000, [[0, 'left'], [0.25, 'airL'], [0.5, 'right'], [0.75, 'airR'], [1, 'left']], 'right'),
  };
})();
