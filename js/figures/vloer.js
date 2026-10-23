// Stokfiguren: oefeningen op de vloer (knielend, zittend). Zie rig.js voor het
// skelet en de hoeken. Zijaanzicht met het gezicht naar rechts; waar de
// benen dwars op het beeld liggen (duif, 90/90, kikker) in 3D (zie rig3d.js).
import { staticTimelines, BONES } from './rig.js';
import { floorRect, shoulderOf } from './rig3d.js';

const FLOOR = 86;
const GROUND = FLOOR - 2; // knie of enkel op de vloer

export const VLOER = {};

// Knielend met de schenen plat naar achteren (wreven op de grond).
const kneelLegs = { n: { ankle: [81, GROUND], bend: 'down', foot: -90 }, f: { ankle: [80, GROUND], bend: 'down', foot: -90 } };

// Hielzit op de wreven: knielen, met de billen naar de hielen zakken.
VLOER.scheen_hielzit = {
  viewBox: [62, 10, 56, 80],
  props: [{ floor: FLOOR }],
  active: ['n.shin', 'f.shin'],
  poses: {
    start: { pelvis: [100, 64], torso: 180, head: 180, legs: kneelLegs, arms: { n: { hand: 'n.hip', bend: 'back' }, f: { hand: 'n.hip', bend: 'back' } } },
    stretch: { pelvis: [82.7, 74], torso: 184, head: 182, legs: kneelLegs, arms: { n: { hand: 'n.hip', bend: 'back' }, f: { hand: 'n.hip', bend: 'back' } } },
  },
  timelines: staticTimelines(),
};

// Kinderhouding: billen naar de hielen, armen ver naar voren, de borst zakt.
VLOER.kinderhouding = {
  viewBox: [62, 10, 80, 80],
  props: [{ floor: FLOOR }],
  active: ['n.arm', 'spine.high'],
  poses: {
    start: { pelvis: [82.7, 74], torso: 180, head: 180, legs: kneelLegs, arms: { n: { angle: 170, fore: 175 }, f: { angle: 168, fore: 173 } } },
    stretch: { pelvis: [82.7, 74], torso: 70, chest: 86, head: 92, legs: kneelLegs, arms: { n: { angle: 92, fore: 92 }, f: { angle: 93, fore: 93 } } },
  },
  timelines: staticTimelines(),
};

// Zittende voorwaartse vouw: gestrekte benen, vanuit de heupen naar voren en
// naar de tenen reiken (armen bijna gestrekt, zodat ze boven de benen zichtbaar
// blijven).
VLOER.hamstring_zittend_vouw = (() => {
  const legs = { n: { angle: 90, foot: 180 }, f: { angle: 90, foot: 180 } };
  return {
    viewBox: [50, 36, 72, 54],
    props: [{ floor: FLOOR }],
    active: ['n.thigh'],
    poses: {
      start: { pelvis: [66, 82], torso: 176, head: 176, legs, arms: { n: { hand: 'n.thighMid', bend: 'down' }, f: { hand: 'n.thighMid', bend: 'down' } } },
      stretch: { pelvis: [66, 82], torso: 146, chest: 134, head: 124, legs, arms: { n: { hand: 'n.toe', bend: 'down' }, f: { hand: 'n.toe', bend: 'down' } } },
    },
    timelines: staticTimelines(),
  };
})();

// Couch stretch: de achterste knie (n) op een kussen bij de muur, de wreef
// ertegen omhoog; het voorste been in een uitvalspas; van voorovergebogen naar
// rechtop met het bekken gekanteld.
VLOER.couch_stretch = (() => {
  const legs = { n: { ankle: [67, 63], bend: 'down', foot: 180 }, f: { ankle: [110, GROUND], bend: 'up', foot: 90 } };
  return {
    viewBox: [56, 4, 66, 86],
    props: [{ floor: FLOOR }, { wall: 64, y1: 40, y2: FLOOR }, { rect: [70, 83, 12, 3], solid: true }],
    active: ['n.thigh'],
    poses: {
      start: { pelvis: [80, 69], torso: 150, head: 150, legs, arms: { n: { hand: 'f.knee', bend: 'down' }, f: { hand: 'f.knee', bend: 'down' } } },
      stretch: { pelvis: [82, 67], torso: 182, head: 180, legs, arms: { n: { hand: 'n.hip', bend: 'back' }, f: { hand: 'n.hip', bend: 'back' } } },
    },
    timelines: staticTimelines(),
  };
})();

// Heupbuiger halfgeknield op een dik kussen: achterste knie (n) op het kussen,
// voorste voet plat met de knie ≤ 90°; bekken achterover, licht naar voren.
VLOER.heupbuiger_halfgeknield = (() => {
  const legs = { n: { ankle: [61, GROUND], bend: 'down', foot: -90 }, f: { ankle: [105, GROUND], bend: 'up', foot: 90 } };
  return {
    viewBox: [52, 4, 66, 86],
    props: [{ floor: FLOOR }, { rect: [73, 83, 14, 3], solid: true }],
    active: ['n.thigh', 'spine.low'],
    poses: {
      start: { pelvis: [82, 64], torso: 178, head: 178, legs, arms: { n: { hand: 'f.thighMid', bend: 'down' }, f: { hand: 'f.thighMid', bend: 'down' } } },
      stretch: { pelvis: [85, 64.5], torso: 185, head: 182, legs, arms: { n: { hand: 'f.thighMid', bend: 'down' }, f: { hand: 'f.thighMid', bend: 'down' } } },
    },
    timelines: staticTimelines(),
  };
})();

// ---------- In 3D (zie rig3d.js) ----------

// Kikker (3D, schuin van achteren): op handen en knieën, knieën wijd op de vloer
// (z ±18), onderbenen evenwijdig naar achteren. De billen schuiven naar
// achteren tot boven de knieën (verder zou de knie voorbij 90° buigen) en je
// zakt op je onderarmen.
VLOER.kikker = (() => {
  // hx: hoe ver het bekken vóór de knieën staat; de hoogte volgt uit de dij.
  const frog = (hx, shoulderY, elbow) => {
    const hy = 1.5 + Math.sqrt(BONES.thigh ** 2 - 14 ** 2 - hx ** 2);
    const reach = BONES.low + BONES.shoulderAt;
    const ty = (shoulderY - hy) / reach;
    const torso = [Math.sqrt(1 - ty * ty), ty, 0];
    const bx = hx + reach * torso[0]; // schouders boven x = bx
    const leg = (s) => ({ thigh: [-hx, 1.5 - hy, 14 * s], shin: [-1, 0, 0], foot: [-0.6, 0, 0.8 * s] });
    const arm = (s) => (elbow
      ? { hand: [bx + BONES.fore, 0.5, BONES.shoulderW * s], elbow: [-0.3, -1, 0] }
      : { hand: [bx + 1, 0.5, BONES.shoulderW * s], elbow: [-1, 0, 0] });
    return { pelvis: [hx, hy, 0], torso, legs: { n: leg(1), f: leg(-1) }, arms: { n: arm(1), f: arm(-1) } };
  };
  return {
    view: '3d',
    camera: { yaw: -40, pitch: 40 },
    viewBox: [40, 38, 90, 74],
    props: [floorRect(-28, 40, -26, 26)],
    active: ['n.thigh', 'f.thigh'],
    poses: {
      start: { ...frog(5, 28, false), head: [1, 0.25, 0] },
      stretch: { ...frog(0, 14.5, true), head: [1, -0.25, 0] },
    },
    timelines: staticTimelines(),
  };
})();

// Duif (3D, schuin van voren): het voorste been (n) gebogen voor je, de dij
// recht vooruit en het onderbeen dwars (knie 90°, de grens uit de
// bibliotheek), het achterste been (f) gestrekt naar achteren. Het bekken
// zakt richting de vloer; van rechtop op de handen naar voorover op de
// onderarmen.
VLOER.duif = (() => {
  const KNEE = [20, 1.5]; // voorste knie, vast op de vloer
  const pigeon = (hy, torso, head) => {
    const px = KNEE[0] - Math.sqrt(BONES.thigh ** 2 - (hy - KNEE[1]) ** 2);
    const back = Math.sqrt((BONES.thigh + BONES.shin) ** 2 - (hy - 1) ** 2);
    return {
      pelvis: [px, hy, 0], torso, head,
      legs: {
        n: { thigh: [KNEE[0] - px, KNEE[1] - hy, 0], shin: [0, 0, -1], foot: [0.3, 0, -1] },
        f: { ankle: [px - back, 1, -BONES.hipW], straight: true, foot: [-1, -0.3, 0] },
      },
    };
  };
  const start = pigeon(7, [0.35, 1, 0], [0.4, 1, 0]);
  const stretch = pigeon(4, [0.9, 0.43, 0], [1, 0.15, 0]);
  // Rechtop: handen naast de voorste knie op de vloer; voorover: onderarmen
  // op de vloer, ellebogen onder de schouders.
  const hands = (pose, dx, elbow) => Object.fromEntries(['n', 'f'].map((s) => {
    const sh = shoulderOf(pose, s);
    return [s, { hand: [sh[0] + dx, 1, sh[2] * 1.2], elbow }];
  }));
  return {
    view: '3d',
    camera: { yaw: 25, pitch: 30 },
    viewBox: [33, 42, 90, 62],
    props: [floorRect(-36, 34, -20, 16)],
    active: ['n.thigh'],
    poses: {
      start: { ...start, arms: hands(start, 1.5, [-1, 0, 0]) },
      stretch: { ...stretch, arms: hands(stretch, BONES.fore, [-0.2, -1, 0]) },
    },
    timelines: staticTimelines(),
  };
})();

// 90/90-zit (3D, schuin van voren): het voorste been (n) met de dij recht
// vooruit en het onderbeen dwars ervoor, het achterste been (f) met de dij
// opzij en het onderbeen naar achteren; beide knieën 90°. Vanuit rechtop met
// de borst richting de voorste knie, de handen voor je op de vloer.
VLOER.negentig_negentig = (() => {
  const HY = 5; // zitten: bekken net boven de vloer
  const k = Math.sqrt(BONES.thigh ** 2 - (HY - 1.5) ** 2);
  const legs = {
    n: { thigh: [k, 1.5 - HY, 0], shin: [0, 0, -1], foot: [0.3, 0, -1] },
    f: { thigh: [0, 1.5 - HY, -k], shin: [-1, 0, 0], foot: [-1, 0, -0.3] },
  };
  const start = { pelvis: [0, HY, 0], torso: [0, 1, 0], legs };
  const stretch = { pelvis: [0, HY, 0], torso: [0.6, 0.8, 0], chest: [0.75, 0.66, 0], head: [0.8, 0.5, 0], legs };
  const hands = (pose, dx, dz, elbow) => Object.fromEntries(['n', 'f'].map((s) => {
    const sh = shoulderOf(pose, s);
    return [s, { hand: [sh[0] + dx, 1, sh[2] + Math.sign(sh[2]) * dz], elbow }];
  }));
  return {
    view: '3d',
    camera: { yaw: 20, pitch: 45 },
    viewBox: [50, 44, 74, 62],
    props: [floorRect(-22, 30, -30, 14)],
    active: ['n.thigh'],
    poses: {
      start: { ...start, arms: hands(start, 2, 2, [-1, 0, 0]) },
      stretch: { ...stretch, arms: hands(stretch, 12, 0, [-0.3, 0, 1]) },
    },
    timelines: staticTimelines(),
  };
})();
