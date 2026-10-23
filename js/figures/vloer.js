// Stokfiguren: oefeningen op de vloer (knielend, zittend). Zie rig.js voor het
// skelet en de hoeken. Zijaanzicht met het gezicht naar rechts; waar de
// benen dwars op het beeld liggen (duif, 90/90, kikker) van boven gezien.
import { staticTimelines } from './rig.js';

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

// ---------- Van boven (gezicht naar rechts) ----------

// Rig in vooraanzicht met de rug horizontaal: de heupen en schouders liggen
// dan boven en onder elkaar in beeld.
const mat = { rect: [22, 14, 116, 84] };

// Kikker (van boven): op handen en knieën, knieën wijd, onderbenen evenwijdig;
// de billen schuiven iets naar achteren en je zakt op je onderarmen.
VLOER.kikker = (() => {
  const legs = { n: { ankle: [56, 84], bend: 'down', foot: -90 }, f: { ankle: [56, 28], bend: 'up', foot: -90 } };
  return {
    view: 'front',
    viewBox: [20, 12, 120, 88],
    props: [mat],
    active: ['n.thigh', 'f.thigh'],
    poses: {
      start: { pelvis: [80, 56], torso: 90, head: 90, legs, arms: { n: { angle: 70, fore: 90 }, f: { angle: 110, fore: 90 } } },
      stretch: { pelvis: [78, 56], torso: 90, head: 90, legs, arms: { n: { angle: 80, fore: 90, scale: 0.75 }, f: { angle: 100, fore: 90, scale: 0.75 } } },
    },
    timelines: staticTimelines(),
  };
})();

// Duif (van boven): het voorste been (n) gebogen voor je met het onderbeen
// dwars, het achterste been gestrekt naar achteren; van rechtop (romp
// voorverkort) naar voorover op de onderarmen.
VLOER.duif = {
  view: 'front',
  viewBox: [20, 12, 120, 88],
  props: [mat],
  active: ['n.thigh'],
  poses: {
    start: { pelvis: [72, 56], torso: 90, head: 90, spineScale: 0.3, legs: { n: { angle: 90, shin: 180, foot: 270 }, f: { angle: -90, foot: -90 } }, arms: { n: { angle: 20, fore: 20, scale: 0.5 }, f: { angle: 160, fore: 160, scale: 0.5 } } },
    stretch: { pelvis: [72, 56], torso: 90, head: 90, spineScale: 0.95, legs: { n: { angle: 90, shin: 180, foot: 270 }, f: { angle: -90, foot: -90 } }, arms: { n: { angle: 80, fore: 90 }, f: { angle: 100, fore: 90 } } },
  },
  timelines: staticTimelines(),
};

// 90/90-zit (van boven): het voorste been (n) voor je, het andere (f) naast je,
// beide knieën 90°; vanuit rechtop (romp voorverkort) met de borst richting de
// voorste knie.
VLOER.negentig_negentig = {
  view: 'front',
  viewBox: [20, 12, 120, 88],
  props: [mat],
  active: ['n.thigh'],
  poses: {
    start: { pelvis: [70, 60], torso: 90, head: 90, spineScale: 0.25, legs: { n: { angle: 90, shin: 180, foot: 270 }, f: { angle: 180, shin: -90, foot: -180 } }, arms: { n: { angle: 30, fore: 30, scale: 0.5 }, f: { angle: 150, fore: 150, scale: 0.5 } } },
    stretch: { pelvis: [70, 60], torso: 98, head: 98, spineScale: 0.8, legs: { n: { angle: 90, shin: 180, foot: 270 }, f: { angle: 180, shin: -90, foot: -180 } }, arms: { n: { angle: 70, fore: 80 }, f: { angle: 110, fore: 100 } } },
  },
  timelines: staticTimelines(),
};
