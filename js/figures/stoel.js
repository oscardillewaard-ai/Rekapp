// Stokfiguren: oefeningen op een stoel. Zie rig.js voor het skelet en de
// hoeken. Zijaanzicht, gezicht naar rechts; zitting op y 66.
import { staticTimelines } from './rig.js';

const FLOOR = 85;
const chair = [{ floor: FLOOR }, { rect: [68, 66, 22, 3] }, { line: [70, 69, 70, FLOOR] }, { line: [88, 69, 88, FLOOR] }, { line: [69, 66, 67, 40] }];
const SEAT = [80, 64]; // bekken op de zitting
const sitting = { angle: 90, shin: 0, foot: 90 }; // dij vooruit, scheen omlaag (knie 90°)

export const STOEL = {};

// Enkel (n) op de andere knie: het been wijst schuin naar de kijker.
const crossed = (foot) => ({ ankle: [107, 57.5], bend: 'up', foot });

// Voetzool zittend: enkel op de andere knie; met één hand de tenen naar de
// scheen trekken, met de andere de gespannen band in de voetzool voelen.
STOEL.voetzool_zittend = {
  viewBox: [56, 10, 64, 80],
  props: chair,
  active: ['n.foot'],
  poses: {
    start: { pelvis: SEAT, torso: 156, head: 146, legs: { n: crossed(100), f: sitting }, arms: { n: { hand: 'n.toe', bend: 'down' }, f: { hand: 'n.ankle', bend: 'down' } } },
    stretch: { pelvis: SEAT, torso: 160, head: 148, legs: { n: crossed(150), f: sitting }, arms: { n: { hand: 'n.toe', bend: 'down' }, f: { hand: 'n.ankle', bend: 'down' } } },
  },
  timelines: staticTimelines(),
};

// Figuur-4 op een stoel: rechtop met de enkel op de andere knie, dan met een
// rechte rug naar voren kantelen en de knie zacht omlaag drukken. De handen
// liggen op het gekruiste onderbeen; zo blijft de hand vóór de schouder en
// klapt de elleboog bij het kantelen niet om.
STOEL.figuur4_stoel = {
  viewBox: [56, 10, 64, 80],
  props: chair,
  active: ['n.thigh'],
  poses: {
    start: { pelvis: SEAT, torso: 180, head: 180, legs: { n: crossed(100), f: sitting }, arms: { n: { hand: 'n.shinMid', bend: 'down' }, f: { hand: 'n.shinMid', bend: 'down' } } },
    stretch: { pelvis: SEAT, torso: 150, head: 145, legs: { n: crossed(100), f: sitting }, arms: { n: { hand: 'n.shinMid', bend: 'down' }, f: { hand: 'n.shinMid', bend: 'down' } } },
  },
  timelines: staticTimelines(),
};

// Voorover hangen op een stoel: op de rand, voeten breed; de romp hangt
// ontspannen tussen de knieën, de armen naar de vloer.
STOEL.voorover_hangen_stoel = {
  viewBox: [56, 10, 64, 80],
  props: chair,
  active: ['spine.low', 'spine.high'],
  poses: {
    start: { pelvis: SEAT, torso: 180, head: 180, legs: { n: sitting, f: sitting }, arms: { n: { hand: 'n.thighMid', bend: 'back' }, f: { hand: 'n.thighMid', bend: 'back' } } },
    stretch: { pelvis: SEAT, torso: 80, chest: 60, head: 40, legs: { n: sitting, f: sitting }, arms: { n: { hand: 'n.ankle', bend: 'back' }, f: { hand: 'n.ankle', bend: 'back' } } },
  },
  timelines: staticTimelines(),
};
