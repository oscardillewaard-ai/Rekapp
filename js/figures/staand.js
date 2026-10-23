// Stokfiguren: staande oefeningen. Zie rig.js voor het skelet en de hoeken;
// de heup-CAR en poort open staan in 3D (rig3d.js).
import { above, legReach, angleOf, pelvisOn, onLeg, joints, staticTimelines, loopTimelines } from './rig.js';
import { floorRect, across, unit } from './rig3d.js';

const FLOOR = 86;
const ANKLE = FLOOR - 2; // enkel net boven de vloer

// Handen tegen de muur: verre hand iets lager, zodat beide te zien zijn.
const wallHands = (hand) => ({ n: { hand, bend: 'down' }, f: { hand: [hand[0] - 1, hand[1] + 1], bend: 'down' } });

export const STAAND = {};

// Kuit tegen de muur: het achterste been (n) stapt naar achteren, gestrekt,
// hiel plat; het lichaam vormt één lijn naar de muur. Voorste knie ≤ 20°.
STAAND.gastroc_muur = (() => {
  const F = [104, ANKLE];
  const B = [66, ANKLE];
  const P = above(B, legReach(0), F, legReach(14));
  const lean = angleOf(B, P);
  return {
    viewBox: [56, 1, 72, 89],
    props: [{ floor: FLOOR }, { wall: 122, y1: 3, y2: FLOOR }],
    active: ['n.shin', 'n.foot'],
    poses: {
      start: { pelvis: [101.5, 45.2], torso: 175, head: 178, legs: { n: { ankle: [99, ANKLE], bend: 'front', foot: 90 }, f: { ankle: F, bend: 'front', foot: 90 } }, arms: wallHands([120.5, 26]) },
      step: { pelvis: [93.4, 46.6], torso: 165, head: 170, legs: { n: { ankle: [82.5, ANKLE], bend: 'front', foot: 90 }, f: { ankle: F, bend: 'front', foot: 90 } }, arms: wallHands([120.5, 28]) },
      stretch: { pelvis: P, torso: lean, head: lean + 4, legs: { n: { ankle: B, bend: 'front', foot: 90 }, f: { ankle: F, bend: 'front', foot: 90 } }, arms: wallHands([120.5, 31]) },
    },
    timelines: {
      prep: { keys: [[0, 'start']] },
      work: { keys: [[0, 'start'], [1100, 'step'], [2300, 'stretch']] },
      demo: { loop: 8000, keys: [[0, 'start'], [1100, 'step'], [2300, 'stretch'], [6000, 'stretch'], [7000, 'step'], [7900, 'start']], still: 'stretch' },
    },
  };
})();

// Enkel-rocks tegen de muur: split-stand, de voorste knie (n) gaat naar de
// muur boven de tenen, hiel plat; rustig ritme van 2,5 s. Knie ~30–45°.
STAAND.enkel_rock = (() => {
  const legs = { n: { ankle: [106, ANKLE], bend: 'front', foot: 90 }, f: { ankle: [89, 80], bend: 'front', foot: 60 } };
  return {
    viewBox: [78, 1, 48, 89],
    props: [{ floor: FLOOR }, { wall: 118, y1: 3, y2: FLOOR }],
    active: ['n.shin'],
    poses: {
      back: { pelvis: [104.6, 45.1], torso: 176, head: 178, legs, arms: wallHands([116.5, 30]) },
      fwd: { pelvis: [111.4, 48.2], torso: 172, head: 176, legs, arms: wallHands([116.5, 30]) },
    },
    timelines: loopTimelines(2500, [[0, 'back'], [0.5, 'fwd'], [1, 'back']], 'fwd'),
  };
})();

// Armen ontspannen langs het lichaam.
const hang = { n: { angle: 6, fore: 14 }, f: { angle: 3, fore: 10 } };

// Grote teen tegen de muur: teen omhoog tegen de muur, bal van de voet op de
// grond; de knie gaat naar de muur tot ~30°. Rek in de voetzool. (Zo dicht
// bij de muur staan de armen ontspannen; met de handen ertegen werd het
// figuur onleesbaar.)
STAAND.voetzool_muur = (() => {
  const N = [104, ANKLE];
  const F = [97, ANKLE];
  const legs = { n: { ankle: N, bend: 'front', foot: 140 }, f: { ankle: F, bend: 'front', foot: 90 } };
  const pose = (nf, ff, torso) => ({ pelvis: pelvisOn([N, nf], [F, ff]), torso, head: torso + 2, legs, arms: hang });
  return {
    viewBox: [74, 1, 42, 89],
    props: [{ floor: FLOOR }, { wall: 110, y1: 3, y2: FLOOR }],
    active: ['n.foot'],
    poses: { start: pose(12, 12, 178), stretch: pose(29, 20, 174) },
    timelines: staticTimelines(),
  };
})();

// Scheen staand: de wreef van de achterste voet (n) op de grond, de enkel zacht
// omlaag; standbeen licht gebogen, romp rechtop.
STAAND.scheen_staand = (() => {
  const F = [104, ANKLE];
  const pose = (nAnkle, foot, nf, ff) => ({
    pelvis: pelvisOn([nAnkle, nf], [F, ff]), torso: 179, head: 179,
    legs: { n: { ankle: nAnkle, bend: 'front', foot }, f: { ankle: F, bend: 'front', foot: 90 } },
    arms: wallHands([118.5, 33]),
  });
  return {
    viewBox: [68, 1, 54, 89],
    props: [{ floor: FLOOR }, { wall: 120, y1: 3, y2: FLOOR }],
    active: ['n.shin', 'n.foot'],
    poses: { start: pose([91, 80.5], -100, 24, 8), stretch: pose([89, 82.8], -92, 29, 12) },
    timelines: staticTimelines(),
  };
})();

// Trap met leuning: de voorvoet (n) op de rand van de onderste trede (boven
// op y 76), de andere voet een trede hoger. Zo blijven beide benen gestrekt
// terwijl de hiel zakt.
const STEP = 76;
const UPPER = [120, STEP - 10];
const stepProps = [{ floor: FLOOR }, { rect: [96, STEP, 36, FLOOR - STEP] }, { rect: [112, STEP - 8, 20, 8] }, { line: [98, 33, 132, 26] }, { line: [128, 27, 128, STEP - 8] }];
const railHands = { n: { hand: [110, 31], bend: 'down' }, f: { hand: [109, 31.5], bend: 'down' } };

// Kuit van een trede: de voorvoet (n) op de rand, de hiel zakt onder
// trapniveau; beide knieën gestrekt, andere voet plat op de trede.
STAAND.gastroc_trede = (() => {
  const F = UPPER;
  const pose = (nAnkle, foot) => ({
    pelvis: pelvisOn([nAnkle, 0], [F, 0]), torso: 178, head: 178,
    legs: { n: { ankle: nAnkle, straight: true, foot }, f: { ankle: F, straight: true, foot: 90 } },
    arms: railHands,
  });
  return {
    viewBox: [80, -6, 54, 96],
    props: stepProps,
    active: ['n.shin'],
    // Met een tussenstand, zodat beide benen onderweg gestrekt blijven.
    poses: { start: pose([93.5, STEP - 1.5], 90), mid: pose([93.8, STEP + 0.4], 103), stretch: pose([94, STEP + 2.2], 115) },
    timelines: {
      prep: { keys: [[0, 'start']] },
      work: { keys: [[0, 'start'], [1000, 'mid'], [2000, 'stretch']] },
      demo: { loop: 8000, keys: [[0, 'start'], [900, 'mid'], [1800, 'stretch'], [5600, 'stretch'], [6500, 'mid'], [7400, 'start']], still: 'stretch' },
    },
  };
})();

// Soleus van een trede: als hierboven, maar met de knie ~20–25° gebogen.
STAAND.soleus_trede = (() => {
  const F = UPPER;
  const pose = (nAnkle, foot, nf, ff) => ({
    pelvis: pelvisOn([nAnkle, nf], [F, ff]), torso: 176, head: 178,
    legs: { n: { ankle: nAnkle, bend: 'front', foot }, f: { ankle: F, bend: 'front', foot: 90 } },
    arms: railHands,
  });
  return {
    viewBox: [80, -6, 54, 96],
    props: stepProps,
    active: ['n.shin'],
    poses: { start: pose([93.5, STEP - 1.5], 90, 12, 12), stretch: pose([94, STEP + 2.2], 115, 25, 20) },
    timelines: staticTimelines(),
  };
})();

// Soleus tegen de muur: als de kuit, maar met een kortere stap en de achterste
// knie (n) gebogen, hiel aan de grond.
STAAND.soleus_muur = (() => {
  const F = [104, ANKLE];
  const B = [82, ANKLE];
  const legs = { n: { ankle: B, bend: 'front', foot: 90 }, f: { ankle: F, bend: 'front', foot: 90 } };
  return {
    viewBox: [62, 1, 66, 89],
    props: [{ floor: FLOOR }, { wall: 122, y1: 3, y2: FLOOR }],
    active: ['n.shin'],
    poses: {
      start: { pelvis: pelvisOn([B, 8], [F, 12]), torso: 172, head: 174, legs, arms: wallHands([120.5, 30]) },
      stretch: { pelvis: pelvisOn([B, 36], [F, 26]), torso: 170, head: 172, legs, arms: wallHands([120.5, 34]) },
    },
    timelines: staticTimelines(),
  };
})();

// Beenzwaaien voor-achter: het been (n) zwaait ontspannen, het standbeen (f)
// blijft gestrekt; de arm gaat tegengesteld mee.
STAAND.beenzwaai_va = {
  viewBox: [64, 1, 72, 89],
  props: [{ floor: FLOOR }],
  active: ['n.thigh'],
  poses: {
    back: { pelvis: [96, 45], torso: 178, head: 180, place: { joint: 'f.ankle', at: [96, ANKLE] }, legs: { n: { angle: -32, foot: 58 }, f: { angle: 0, foot: 90 } }, arms: { n: { angle: 25, fore: 45 }, f: { angle: 10, fore: 40 } } },
    front: { pelvis: [96, 45], torso: 182, head: 182, place: { joint: 'f.ankle', at: [96, ANKLE] }, legs: { n: { angle: 48, foot: 138 }, f: { angle: 0, foot: 90 } }, arms: { n: { angle: -20, fore: 0 }, f: { angle: 10, fore: 40 } } },
  },
  timelines: loopTimelines(2083, [[0, 'back'], [0.5, 'front'], [1, 'back']], 'front'),
};

// Gestrekte-beenheffing: het gestrekte been (n) actief omhoog tot ~70% van je
// bereik, 1 s vasthouden, rustig zakken.
STAAND.soldier_kick = {
  viewBox: [70, 1, 70, 89],
  props: [{ floor: FLOOR }],
  active: ['n.thigh'],
  poses: {
    down: { pelvis: [96, 45], torso: 180, head: 180, place: { joint: 'f.ankle', at: [96, ANKLE] }, legs: { n: { angle: 3, foot: 92 }, f: { angle: 0, foot: 90 } }, arms: hang },
    up: { pelvis: [96, 45], torso: 178, head: 178, place: { joint: 'f.ankle', at: [96, ANKLE] }, legs: { n: { angle: 66, foot: 150 }, f: { angle: 0, foot: 90 } }, arms: { n: { angle: 40, fore: 60 }, f: { angle: -10, fore: 20 } } },
  },
  timelines: loopTimelines(3750, [[0, 'down'], [0.3, 'up'], [0.57, 'up'], [1, 'down']], 'up'),
};

// Hamstrings staand: de hiel van het gestrekte been (n) op een trede of
// stoelrand, kantelen vanuit de heup met een rechte rug.
STAAND.hamstring_staand_trede = (() => {
  const N = [110, 60];
  const F = [76, ANKLE];
  const legs = { n: { ankle: N, bend: 'front', foot: 172 }, f: { ankle: F, bend: 'front', foot: 90 } };
  const P = pelvisOn([N, 3], [F, 3]);
  return {
    viewBox: [56, 1, 76, 89],
    props: [{ floor: FLOOR }, { rect: [104, 62, 26, 24] }],
    active: ['n.thigh'],
    poses: {
      start: { pelvis: P, torso: 180, head: 180, legs, arms: { n: { angle: 15, fore: 25 }, f: { angle: 8, fore: 20 } } },
      stretch: { pelvis: P, torso: 138, head: 132, legs, arms: { n: { angle: 30, fore: 30 }, f: { angle: 22, fore: 22 } } },
    },
    timelines: staticTimelines(),
  };
})();

// Hiel naar bil: op één been (f), hand aan de muur; de andere hand pakt de
// voet en trekt de hiel naar de bil, knieën naast elkaar, stuitje onder.
STAAND.quad_hiel_bil = {
  viewBox: [70, 1, 52, 89],
  props: [{ floor: FLOOR }, { wall: 116, y1: 3, y2: FLOOR }],
  active: ['n.thigh'],
  poses: {
    start: { pelvis: [96, 45], torso: 180, head: 180, place: { joint: 'f.ankle', at: [96, ANKLE] }, legs: { n: { angle: -5, shin: -138, foot: -168 }, f: { angle: 0, foot: 90 } }, arms: { n: { hand: 'n.toe', bend: 'back' }, f: { hand: [114.5, 30], bend: 'down' } } },
    stretch: { pelvis: [96, 45], torso: 178, head: 180, place: { joint: 'f.ankle', at: [96, ANKLE] }, legs: { n: { angle: -10, shin: -148, foot: -170 }, f: { angle: 0, foot: 90 } }, arms: { n: { hand: 'n.toe', bend: 'back' }, f: { hand: [114.5, 30], bend: 'down' } } },
  },
  timelines: staticTimelines(),
};

// Heupbuiger in split-stand: achterste hiel los (n), voorste knie (f) ≤ 45°;
// naar voren schuiven met het stuitje onder en de arm omhoog.
const hipFlexor = (() => {
  const F = [110, ANKLE];
  const B = [74, 79];
  const legs = { n: { ankle: B, bend: 'front', foot: 45 }, f: { ankle: F, bend: 'front', foot: 90 } };
  return {
    viewBox: [62, -7, 70, 97],
    props: [{ floor: FLOOR }],
    active: ['n.thigh', 'spine.low'],
    back: { pelvis: pelvisOn([B, 26], [F, 18]), torso: 179, head: 180, legs, arms: { n: { angle: 115, fore: 130 }, f: { angle: 8, fore: 20 } } },
    fwd: { pelvis: pelvisOn([B, 10], [F, 42]), torso: 184, head: 182, legs, arms: { n: { angle: 168, fore: 172 }, f: { angle: 8, fore: 20 } } },
  };
})();
STAAND.heupbuiger_dyn = {
  viewBox: hipFlexor.viewBox, props: hipFlexor.props, active: hipFlexor.active,
  poses: { back: hipFlexor.back, fwd: hipFlexor.fwd },
  timelines: loopTimelines(5000, [[0, 'back'], [0.6, 'fwd'], [1, 'back']], 'fwd'),
};
STAAND.heupbuiger_statisch = {
  viewBox: hipFlexor.viewBox, props: hipFlexor.props, active: hipFlexor.active,
  poses: { start: hipFlexor.back, stretch: { ...hipFlexor.fwd, arms: { n: { angle: 160, fore: 162 }, f: { angle: 8, fore: 20 } } } },
  timelines: staticTimelines(),
};

// ---------- Vooraanzicht ----------
// "n" staat rechts in beeld. Rechtop: heupen 4 naast het bekken, de enkels
// recht eronder.

// Beenzwaaien zijwaarts: met de handen tegen de muur (achter het figuur) zwaait
// het been (n) voor het standbeen langs, van binnen naar buiten.
STAAND.beenzwaai_zij = (() => {
  const pose = (angle) => ({
    pelvis: [80, 45], torso: 180, head: 180, place: { joint: 'f.ankle', at: [76, ANKLE] },
    legs: { n: { angle, foot: angle + 80 }, f: { angle: 0, foot: -80 } },
    arms: { n: { angle: 100, fore: 160 }, f: { angle: -100, fore: -160 } },
  });
  return {
    view: 'front',
    viewBox: [48, -2, 64, 92],
    props: [{ floor: FLOOR }, { rect: [54, 2, 52, 84] }],
    active: ['n.thigh'],
    poses: { across: pose(-26), out: pose(30) },
    timelines: loopTimelines(2083, [[0, 'across'], [0.5, 'out'], [1, 'across']], 'out'),
  };
})();

// Zijwaartse gewichtsverplaatsing: brede stand, gewicht naar één kant; het
// andere been blijft gestrekt, de gebogen knie hooguit 60°. Om en om.
STAAND.lateraal_shift = (() => {
  const N = [97, ANKLE];
  const F = [63, ANKLE];
  const legs = { n: { ankle: N, bend: 'front', foot: 70 }, f: { ankle: F, bend: 'back', foot: -70 } };
  const arms = { n: { hand: 'n.hip', bend: 'front' }, f: { hand: 'f.hip', bend: 'back' } }; // handen in de zij
  const pose = (nf, ff) => ({ pelvis: pelvisOn([N, nf], [F, ff], { view: 'front' }), torso: 180, head: 180, legs, arms });
  return {
    view: 'front',
    viewBox: [44, 6, 72, 84],
    props: [{ floor: FLOOR }],
    active: ['n.thigh', 'f.thigh'],
    poses: { mid: pose(12, 12), right: pose(50, 1), left: pose(1, 50) },
    timelines: loopTimelines(7500, [[0, 'mid'], [0.25, 'right'], [0.5, 'mid'], [0.75, 'left'], [1, 'mid']], 'right'),
  };
})();

// Heup-buitenkant staand: naast de muur (rechts); het te rekken been (n)
// achter het andere langs, de heup naar de muur, de romp en beide armen
// de andere kant op.
// De heup schuift naar de muur: het bekken kantelt mee (onderrug schuin naar
// de muur), de bovenrug buigt weg; zo ontstaat de C-boog.
STAAND.heup_buiten_overhead = (() => {
  const N = [70, ANKLE];
  const F = [78, ANKLE];
  const legs = { n: { ankle: N, bend: 'front', foot: 80 }, f: { ankle: F, bend: 'back', foot: -80 } };
  return {
    view: 'front',
    viewBox: [38, -14, 70, 104],
    props: [{ floor: FLOOR }, { wall: 104, y1: -10, y2: FLOOR }],
    active: ['n.thigh'],
    poses: {
      // Begin met de armen al boven het hoofd; dan de heup naar de muur en
      // diagonaal mee reiken. (Hoeken van f negatief: die arm blijft links.)
      start: { pelvis: pelvisOn([N, 4], [F, 4], { view: 'front' }), torso: 180, head: 180, legs, arms: { n: { angle: 178, fore: 180 }, f: { angle: -178, fore: -180 } } },
      stretch: { pelvis: pelvisOn([N, 3], [F, 3], { view: 'front', torso: 160 }), torso: 160, chest: 206, head: 210, legs, arms: { n: { angle: 200, fore: 212 }, f: { angle: -146, fore: -138 } } },
    },
    timelines: staticTimelines(),
  };
})();

// Heup-CAR en poort open (3D, schuin van voren): op één been (f), de hand
// aan de muur naast je. De knie (n) gaat naar heuphoogte, draait naar buiten
// en (bij de CAR) met het onderbeen naar binnen-achter terug omlaag.
const onOneLeg = (thigh, shin, foot) => ({
  pelvis: [0, 41, 0], torso: [0, 1, 0], head: [0.15, 1, 0],
  legs: { n: { thigh, shin, foot }, f: { thigh: [0, -1, 0], foot: [1, 0, 0] } },
  arms: { n: { upper: [0.1, -1, 0.25], fore: [0.2, -1, 0.2] }, f: { hand: [2, 60, -30], elbow: [0, -1, 0] } },
});
const hipWall = [floorRect(-16, 24, -30, 22), { poly: [[-16, 0, -30], [24, 0, -30], [24, 74, -30], [-16, 74, -30]] }];
const DOWN = [0, -1, 0];

STAAND.heup_car = (() => {
  const backThigh = unit([-0.35, -0.6, 0.7]);
  return {
    view: '3d',
    camera: { yaw: 40, pitch: 12 },
    viewBox: [38, 0, 76, 94],
    props: hipWall,
    active: ['n.thigh'],
    poses: {
      down: onOneLeg(DOWN, DOWN, [1, 0, 0]),
      front: onOneLeg([1, 0, 0], DOWN, [1, 0, 0]),
      side: onOneLeg([0, 0, 1], DOWN, [0, 0, 1]),
      back: onOneLeg(backThigh, across([-1, 0.3, 0], backThigh), [0, -0.3, 1]),
    },
    timelines: loopTimelines(13333, [[0, 'down'], [0.25, 'front'], [0.5, 'side'], [0.75, 'back'], [1, 'down']], 'side'),
  };
})();

STAAND.gate_opener = {
  view: '3d',
  camera: { yaw: 40, pitch: 12 },
  viewBox: [38, 0, 76, 94],
  props: hipWall,
  active: ['n.thigh'],
  poses: {
    down: onOneLeg(DOWN, DOWN, [1, 0, 0]),
    up: onOneLeg([1, 0, 0], DOWN, [1, 0, 0]),
    open: onOneLeg([0, 0, 1], DOWN, [0, 0, 1]),
  },
  timelines: loopTimelines(4375, [[0, 'down'], [0.2, 'up'], [0.45, 'open'], [0.7, 'open'], [0.85, 'up'], [1, 'down']], 'open'),
};

// Borst in een hoek / muurslides gebruiken een muur achter het figuur.

// Muurslides: rug tegen de muur, armen van een W naar een Y.
STAAND.muurslide = (() => {
  const N = [85, ANKLE];
  const F = [75, ANKLE];
  const legs = { n: { ankle: N, bend: 'front', foot: 80 }, f: { ankle: F, bend: 'back', foot: -80 } };
  const P = pelvisOn([N, 14], [F, 14], { view: 'front' });
  const pose = (arm, fore) => ({ pelvis: P, torso: 180, head: 180, legs, arms: { n: { angle: arm, fore }, f: { angle: -arm, fore: -fore } } });
  return {
    view: 'front',
    viewBox: [40, -8, 80, 98],
    props: [{ floor: FLOOR }, { rect: [46, -4, 68, 90] }],
    active: ['shoulders', 'n.arm', 'f.arm'],
    poses: { w: pose(66, 176), y: pose(142, 150) },
    timelines: loopTimelines(4000, [[0, 'w'], [0.5, 'y'], [1, 'w']], 'y'),
  };
})();

// Zijwaartse rek aan de deurpost (vooraanzicht, de post rechts): de binnenste
// hand (n) houdt de post laag vast; de buitenste arm (f) gaat in een boog over
// het hoofd en pakt de post, de heup duwt naar buiten: het lichaam vormt een C.
STAAND.zijbuiging_deurpost = (() => {
  const pose = (legAngle, torso, chest, head, nHand, fHand) => ({
    pelvis: [80, 45], torso, chest, head, place: { joint: 'n.ankle', y: ANKLE },
    legs: { n: { angle: legAngle, foot: 80 }, f: { angle: legAngle, foot: -80 } },
    arms: { n: { hand: nHand, bend: 'down' }, f: { hand: fHand, bend: 'up' } },
  });
  return {
    view: 'front',
    viewBox: [46, -10, 66, 100],
    props: [{ floor: FLOOR }, { wall: 104, y1: -6, y2: FLOOR }],
    active: ['f.arm', 'spine.low', 'spine.high'],
    poses: {
      start: pose(0, 180, 180, 180, [102.5, 40], [66, 47]),
      up: pose(4, 182, 176, 176, [102.5, 41], [70, -5]),
      stretch: pose(12, 188, 128, 145, [102.5, 44], [103, 9]),
    },
    timelines: {
      prep: { keys: [[0, 'start']] },
      work: { keys: [[0, 'start'], [1000, 'up'], [2000, 'stretch']] },
      demo: { loop: 8000, keys: [[0, 'start'], [900, 'up'], [1800, 'stretch'], [5600, 'stretch'], [6500, 'up'], [7400, 'start']], still: 'stretch' },
    },
  };
})();

// ---------- Zijaanzicht: rug ----------

// Kat-koe staand: knieën licht gebogen, handen op de dijen; de rug bol bij het
// uitademen (kat) en hol bij het inademen (koe).
STAAND.kat_koe_staand = (() => {
  const N = [93, ANKLE];
  const F = [92, ANKLE];
  const legs = { n: { ankle: N, bend: 'front', foot: 90 }, f: { ankle: F, bend: 'front', foot: 90 } };
  const P = pelvisOn([N, 29], [F, 29]);
  const arms = { n: { hand: 'n.thighMid', bend: 'back' }, f: { hand: 'n.thighMid', bend: 'back' } }; // in zijaanzicht vallen beide dijen samen
  return {
    viewBox: [66, 1, 70, 89],
    props: [{ floor: FLOOR }],
    active: ['spine.low', 'spine.high'],
    poses: {
      cow: { pelvis: P, torso: 118, chest: 136, head: 158, legs, arms },
      cat: { pelvis: P, torso: 130, chest: 100, head: 50, legs, arms },
    },
    timelines: loopTimelines(5000, [[0, 'cow'], [0.5, 'cat'], [1, 'cow']], 'cat'),
  };
})();

// Staande achteroverbuiging: handen in de onderrug, rustig achterover en mee
// omhoog kijken; de benen gestrekt.
STAAND.staande_extensie = (() => {
  const legs = { n: { ankle: [96, ANKLE], straight: true, foot: 90 }, f: { ankle: [95, ANKLE], straight: true, foot: 90 } };
  const arms = { n: { hand: 'mid', bend: 'back' }, f: { hand: 'mid', bend: 'back' } };
  return {
    viewBox: [66, -2, 60, 92],
    props: [{ floor: FLOOR }],
    active: ['spine.low', 'spine.high'],
    poses: {
      up: { pelvis: [95.5, 45], torso: 180, head: 180, legs, arms },
      back: { pelvis: [99, 45.2], torso: 195, chest: 208, head: 222, legs, arms },
    },
    timelines: loopTimelines(3000, [[0, 'up'], [0.5, 'back'], [1, 'up']], 'back'),
  };
})();

// Borstwervels draaien aan het aanrecht: handen op het aanrecht, heupen naar
// achteren, rug recht; één arm (n) open naar het plafond, de blik volgt.
STAAND.thor_rot_staand = (() => {
  const N = [86, ANKLE];
  const F = [84, ANKLE];
  const legs = { n: { ankle: N, bend: 'front', foot: 90 }, f: { ankle: F, bend: 'front', foot: 90 } };
  const P = pelvisOn([N, 16], [F, 16]);
  const pose = (arm, fore, head) => ({ pelvis: P, torso: 98, chest: 100, head, legs, arms: { n: { angle: arm, fore }, f: { hand: [125, 48.5], bend: 'up' } } });
  return {
    viewBox: [66, -2, 76, 92],
    props: [{ floor: FLOOR }, { rect: [122, 50, 18, 36] }],
    active: ['spine.high', 'n.arm'],
    poses: { closed: pose(72, 78, 100), open: pose(180, 182, 150) },
    timelines: loopTimelines(4375, [[0, 'closed'], [0.5, 'open'], [1, 'closed']], 'open'),
  };
})();

// ---------- Bovenlichaam ----------

// Rechtop staan op twee gestrekte benen (vooraanzicht: heupen naast elkaar).
const upright = (x, extra) => ({
  pelvis: [x, 45], torso: 180, head: 180, place: { joint: 'n.ankle', y: ANKLE },
  legs: { n: { angle: 0, foot: extra?.front ? 80 : 90 }, f: { angle: 0, foot: extra?.front ? -80 : 90 } },
  ...extra?.pose,
});
const frontPose = (pose) => upright(80, { front: true, pose });
const sidePose = (pose) => upright(94, { pose });

// Nek: oor naar schouder (vooraanzicht). De andere hand ligt licht op het
// hoofd; de schouder (n) blijft laag.
STAAND.nek_trapezius = {
  view: 'front',
  viewBox: [52, -2, 56, 92],
  props: [{ floor: FLOOR }],
  active: ['n.trap', 'neck'],
  poses: {
    start: frontPose({ head: 180, arms: { n: { angle: 3, fore: 0 }, f: { hand: 'head', bend: 'up' } } }),
    stretch: frontPose({ head: 224, arms: { n: { angle: 2, fore: -2 }, f: { hand: 'head', bend: 'up' } } }),
  },
  timelines: staticTimelines(),
};

// Nek: neus naar oksel (zijaanzicht): het hoofd naar voren en omlaag, de hand
// op het achterhoofd laat het gewicht van de arm het werk doen.
STAAND.nek_levator = {
  viewBox: [70, -4, 50, 94],
  props: [{ floor: FLOOR }],
  active: ['n.trap', 'neck'],
  poses: {
    start: sidePose({ head: 176, arms: { n: { hand: 'head', bend: 'up' }, f: { angle: 4, fore: 10 } } }),
    stretch: sidePose({ head: 128, arms: { n: { hand: 'head', bend: 'up' }, f: { angle: 4, fore: 10 } } }),
  },
  timelines: staticTimelines(),
};

// Lat aan de deurpost: de post op hoofdhoogte vastpakken, de heupen naar
// achteren; rek langs de zijkant van de rug.
STAAND.lat_deurpost = (() => {
  const A = [80, ANKLE];
  const legs = { n: { ankle: A, bend: 'front', foot: 90 }, f: { ankle: [80.5, ANKLE], bend: 'front', foot: 90 } };
  const arms = { n: { hand: [116.5, 30], bend: 'down' }, f: { hand: [116.5, 32], bend: 'down' } };
  return {
    viewBox: [56, 1, 66, 89],
    props: [{ floor: FLOOR }, { wall: 118, y1: 3, y2: FLOOR }],
    active: ['n.arm', 'spine.high'],
    poses: {
      start: { pelvis: onLeg(A, 176, 10), torso: 140, head: 140, legs, arms },
      stretch: { pelvis: onLeg(A, 192, 15), torso: 114, chest: 110, head: 108, legs, arms },
    },
    timelines: staticTimelines(),
  };
})();

// Lats aan het aanrecht: handen op het aanrecht, stap naar achteren en duw de
// heupen weg tot de armen gestrekt in het verlengde van de romp liggen; de
// borst zakt, knieën licht gebogen.
STAAND.lat_aanrecht = (() => {
  const A = [78, ANKLE];
  const legs = { n: { ankle: A, bend: 'front', foot: 90 }, f: { ankle: [79, ANKLE], bend: 'front', foot: 90 } };
  const arms = { n: { hand: [113, 49], bend: 'up' }, f: { hand: [112, 49.5], bend: 'up' } };
  return {
    viewBox: [52, 1, 84, 89],
    props: [{ floor: FLOOR }, { rect: [112, 51, 22, 35] }],
    active: ['n.arm', 'spine.high'],
    poses: {
      start: { pelvis: onLeg(A, 184, 10), torso: 122, head: 122, legs, arms },
      stretch: { pelvis: onLeg(A, 200, 18), torso: 94, chest: 86, head: 80, legs, arms },
    },
    timelines: staticTimelines(),
  };
})();

// Borst in de deuropening: de onderarm (n) verticaal tegen de post, elleboog
// op schouderhoogte; met hetzelfde been door de opening stappen.
STAAND.borst_deurpost = (() => {
  const F = [92, ANKLE];
  const legs = (nx) => ({ n: { ankle: [nx, ANKLE], straight: true, foot: 90 }, f: { ankle: F, straight: true, foot: 90 } });
  const start = { pelvis: pelvisOn([[94, ANKLE], 0], [F, 0]), torso: 180, head: 180, legs: legs(94), arms: { n: { angle: -82, fore: 178 }, f: { angle: 4, fore: 10 } } };
  const stretch = { pelvis: pelvisOn([[104, ANKLE], 0], [F, 0]), torso: 174, head: 176, legs: legs(104), arms: { n: { angle: -96, fore: 180 }, f: { angle: 6, fore: 12 } } };
  const post = joints(stretch).n.hand[0] - 1.5; // de post waar de onderarm ligt
  return {
    viewBox: [62, -4, 62, 94],
    props: [{ floor: FLOOR }, { wall: post, y1: 0, y2: FLOOR }],
    active: ['n.arm'],
    poses: { start, stretch },
    timelines: staticTimelines(),
  };
})();

// Borst in een hoek: beide onderarmen tegen de muren, ellebogen net onder
// schouderhoogte; met een rechte romp naar voren leunen.
STAAND.borst_hoek = (() => {
  const A = [92, ANKLE];
  const legs = { n: { ankle: A, straight: true, foot: 90 }, f: { ankle: [91, ANKLE], straight: true, foot: 90 } };
  const pose = (lean) => ({ pelvis: onLeg(A, 180 - lean), torso: 180 - lean, head: 180 - lean, legs, arms: { n: { angle: 84, fore: 178 }, f: { angle: 82, fore: 177 } } });
  const stretch = pose(13);
  const wall = joints(stretch).n.hand[0] + 1.5;
  return {
    viewBox: [72, -6, 52, 96],
    props: [{ floor: FLOOR }, { wall, y1: -2, y2: FLOOR }],
    active: ['n.arm'],
    poses: { start: pose(0), stretch },
    timelines: staticTimelines(),
  };
})();

// Voorkant schouder: zijwaarts naast de muur (achter het figuur), de arm (n)
// gestrekt naar achteren op schouderhoogte; de romp draait weg.
STAAND.schouder_voor_muur = {
  viewBox: [56, -2, 60, 92],
  props: [{ floor: FLOOR }, { rect: [60, 4, 52, 82] }],
  active: ['n.arm'],
  poses: {
    start: sidePose({ arms: { n: { angle: -50, fore: -50 }, f: { angle: 4, fore: 10 } } }),
    stretch: sidePose({ torso: 176, head: 176, arms: { n: { angle: -94, fore: -94 }, f: { angle: 6, fore: 12 } } }),
  },
  timelines: staticTimelines(),
};

// Handen achter de rug: handen gevouwen, armen gestrekt en iets optillen;
// borst open, kin licht in.
STAAND.handen_achter_rug = {
  viewBox: [60, -2, 56, 92],
  props: [{ floor: FLOOR }],
  active: ['n.arm'],
  poses: {
    start: sidePose({ arms: { n: { angle: -14, fore: -14 }, f: { angle: -13, fore: -13 } } }),
    stretch: sidePose({ chest: 184, head: 176, arms: { n: { angle: -46, fore: -46 }, f: { angle: -45, fore: -45 } } }),
  },
  timelines: staticTimelines(),
};

// Arm over de borst (vooraanzicht): de arm (n) op schouderhoogte over de borst,
// de andere hand trekt zacht bij de elleboog.
STAAND.cross_body = {
  view: 'front',
  viewBox: [50, -2, 60, 92],
  props: [{ floor: FLOOR }],
  active: ['n.arm'],
  poses: {
    start: frontPose({ arms: { n: { angle: -40, fore: -40 }, f: { hand: 'n.elbow', bend: 'down' } } }),
    stretch: frontPose({ arms: { n: { angle: -86, fore: -86 }, f: { hand: 'n.elbow', bend: 'down' } } }),
  },
  timelines: staticTimelines(),
};

// Triceps boven het hoofd (vooraanzicht): de arm (n) omhoog, elleboog
// gebogen, hand achter het hoofd tussen de schouderbladen; de andere hand duwt
// zacht tegen de elleboog. (De onderarm zakt achter het hoofd: 230° → 338°.)
STAAND.triceps_overhead = {
  view: 'front',
  viewBox: [50, -14, 60, 104],
  props: [{ floor: FLOOR }],
  active: ['n.arm'],
  poses: {
    start: frontPose({ arms: { n: { angle: 160, fore: 230 }, f: { hand: 'n.elbow', bend: 'up' } } }),
    stretch: frontPose({ arms: { n: { angle: 172, fore: 338 }, f: { hand: 'n.elbow', bend: 'up' } } }),
  },
  timelines: staticTimelines(),
};

// Triceps tegen de deurpost: de gebogen elleboog (n) hoog tegen de post; met
// het lichaam naar voren en omlaag leunen, de hand hangt achter het hoofd.
STAAND.triceps_deurpost = (() => {
  const A = [92, ANKLE];
  const legs = { n: { ankle: A, straight: true, foot: 90 }, f: { ankle: [91, ANKLE], straight: true, foot: 90 } };
  const start = { pelvis: onLeg(A, 178), torso: 178, head: 178, legs, arms: { n: { angle: 168, fore: 328 }, f: { angle: 4, fore: 10 } } };
  const stretch = { pelvis: onLeg(A, 172), torso: 152, chest: 144, head: 126, legs, arms: { n: { angle: 138, fore: 330 }, f: { angle: 12, fore: 18 } } };
  const post = joints(stretch).n.elbow[0] + 2;
  return {
    viewBox: [62, -14, 64, 104],
    props: [{ floor: FLOOR }, { wall: post, y1: -10, y2: FLOOR }],
    active: ['n.arm'],
    poses: { start, stretch },
    timelines: staticTimelines(),
  };
})();

// Polsbuigers tegen de muur: hand plat tegen de muur, vingers naar beneden,
// arm gestrekt; het lichaam zacht van de muur weg.
STAAND.polsbuigers_muur = (() => {
  const A = [92, ANKLE];
  const legs = { n: { ankle: A, straight: true, foot: 90 }, f: { ankle: [91, ANKLE], straight: true, foot: 90 } };
  const hand = [116, 30];
  return {
    viewBox: [64, -2, 60, 92],
    props: [{ floor: FLOOR }, { wall: 117.5, y1: 0, y2: FLOOR }],
    active: ['n.fore', 'n.palm'],
    poses: {
      start: { pelvis: onLeg(A, 176), torso: 176, head: 178, legs, arms: { n: { hand, bend: 'down', palm: 30 }, f: { angle: 4, fore: 10 } } },
      stretch: { pelvis: onLeg(A, 182), torso: 182, head: 180, legs, arms: { n: { hand, bend: 'down', palm: 0 }, f: { angle: 2, fore: 8 } } },
    },
    timelines: staticTimelines(),
  };
})();

// Gebedshouding (vooraanzicht): handpalmen tegen elkaar voor de borst, dan de
// handen laten zakken richting de navel; ellebogen naar buiten.
STAAND.gebedshouding = {
  view: 'front',
  viewBox: [50, -2, 60, 92],
  props: [{ floor: FLOOR }],
  active: ['n.fore', 'f.fore', 'n.palm', 'f.palm'],
  poses: {
    start: frontPose({ arms: { n: { hand: [80.6, 28], bend: 'front', palm: 180 }, f: { hand: [79.4, 28], bend: 'back', palm: 180 } } }),
    stretch: frontPose({ arms: { n: { hand: [80.6, 36], bend: 'front', palm: 180 }, f: { hand: [79.4, 36], bend: 'back', palm: 180 } } }),
  },
  timelines: staticTimelines(),
};

// Polsstrekkers: arm (n) gestrekt naar voren, handpalm omlaag; de pols buigen
// en met de andere hand zacht naar je toe trekken.
STAAND.polsstrekkers = {
  viewBox: [70, -2, 62, 92],
  props: [{ floor: FLOOR }],
  active: ['n.fore', 'n.palm'],
  poses: {
    start: sidePose({ twist: 7, arms: { n: { angle: 92, fore: 92, palm: 92 }, f: { hand: 'n.fingers', bend: 'down' } } }),
    stretch: sidePose({ twist: 7, arms: { n: { angle: 92, fore: 92, palm: 12 }, f: { hand: 'n.fingers', bend: 'down' } } }),
  },
  timelines: staticTimelines(),
};

// Omgekeerde gebedshouding (vooraanzicht): ruggen van de handen tegen elkaar,
// vingers omlaag voor de buik; de ellebogen langzaam optillen.
STAAND.omgekeerde_gebed = {
  view: 'front',
  viewBox: [50, -2, 60, 92],
  props: [{ floor: FLOOR }],
  active: ['n.fore', 'f.fore', 'n.palm', 'f.palm'],
  poses: {
    start: frontPose({ arms: { n: { hand: [80.6, 44], bend: 'front', palm: 0 }, f: { hand: [79.4, 44], bend: 'back', palm: 0 } } }),
    stretch: frontPose({ arms: { n: { hand: [80.6, 37], bend: 'front', palm: 0 }, f: { hand: [79.4, 37], bend: 'back', palm: 0 } } }),
  },
  timelines: staticTimelines(),
};
