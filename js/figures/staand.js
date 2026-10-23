// Stokfiguren: staande oefeningen. Zie rig.js voor het skelet en de hoeken.
import { above, legReach, angleOf, staticTimelines, loopTimelines } from './rig.js';

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

// Ongebruikt houden we niets: staticTimelines staat klaar voor de andere
// statische oefeningen.
void staticTimelines;
