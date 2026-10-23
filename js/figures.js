// Stokfiguren (§6.2, fase 2): eigen, eenvoudige tekeningen per oefening, als
// proef voor drie oefeningen (zie AFWIJKINGEN.md). Puur: een houding plus de
// tijd binnen een fase geeft de punten van het figuur; tekenen doet
// ui/figure.js.
//
// Eén skelet voor alle figuren, in zijaanzicht: x naar rechts, y naar beneden.
// Een hoek a (graden) wijst in richting (sin a, cos a): 0 = omlaag,
// 90 = rechts, 180 = omhoog, -90 = links. Benen en armen hebben een "n"-kant
// (dichtbij, vol getekend) en een "f"-kant (ver weg, gedimd).

export const BONES = { torso: 26, shoulder: 23, neck: 3, head: 5, upper: 13, fore: 12, thigh: 20, shin: 19, foot: 7 };

const rad = (d) => (d * Math.PI) / 180;
export const dir = (a) => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
export const dist = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);

// Twee botten (dij en scheen, of boven- en onderarm) van root naar target.
// bend kiest aan welke kant het gewricht uitsteekt: 'front' (meest rechts),
// 'back', 'up' of 'down'. Te ver weg: het lid wijst gestrekt naar het doel.
export function twoBone(root, target, a, b, bend) {
  const d0 = dist(root, target);
  const u = d0 ? [(target[0] - root[0]) / d0, (target[1] - root[1]) / d0] : [0, 1];
  const d = Math.min(Math.max(d0, Math.abs(a - b) + 1e-6), a + b);
  const angle = Math.acos(Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d))));
  const [p, q] = [angle, -angle].map((t) => [
    root[0] + a * (u[0] * Math.cos(t) - u[1] * Math.sin(t)),
    root[1] + a * (u[0] * Math.sin(t) + u[1] * Math.cos(t)),
  ]);
  const first = { front: p[0] >= q[0], back: p[0] <= q[0], up: p[1] <= q[1], down: p[1] >= q[1] }[bend];
  return { joint: first ? p : q, end: add(root, u, d) };
}

// Snijpunt van twee cirkels (rond a met straal ra, rond b met straal rb), het
// hoogste van de twee. Voor houdingen waarin beide voeten vast staan.
function above(a, ra, b, rb) {
  const d = dist(a, b);
  const x = (ra * ra - rb * rb + d * d) / (2 * d);
  const y = Math.sqrt(Math.max(0, ra * ra - x * x));
  const u = [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
  const p = [a[0] + u[0] * x - u[1] * y, a[1] + u[1] * x + u[0] * y];
  const q = [a[0] + u[0] * x + u[1] * y, a[1] + u[1] * x - u[0] * y];
  return p[1] <= q[1] ? p : q;
}

// Lengte van een been met kniebuiging f (graden): heup tot enkel.
const legReach = (f) => Math.sqrt(BONES.thigh ** 2 + BONES.shin ** 2 + 2 * BONES.thigh * BONES.shin * Math.cos(rad(f)));

// Punten van een houding.
// pose = { pelvis: [x, y], torso, head?, effort?,
//   legs: { n, f }: { ankle: [x, y], bend, foot } of { angle, foot },
//   arms: { n, f }: { hand: [x, y], bend } of { angle, fore } }
export function joints(pose) {
  const P = pose.pelvis;
  const neck = add(P, dir(pose.torso), BONES.torso);
  const out = {
    pelvis: P,
    neck,
    head: add(neck, dir(pose.head ?? pose.torso), BONES.neck + BONES.head),
    shoulder: add(P, dir(pose.torso), BONES.shoulder),
  };
  for (const side of ['n', 'f']) {
    const leg = pose.legs[side];
    let knee;
    let ankle;
    if (leg.ankle) ({ joint: knee, end: ankle } = twoBone(P, leg.ankle, BONES.thigh, BONES.shin, leg.bend));
    else { knee = add(P, dir(leg.angle), BONES.thigh); ankle = add(knee, dir(leg.angle), BONES.shin); }
    const arm = pose.arms[side];
    let elbow;
    let hand;
    if (arm.hand) ({ joint: elbow, end: hand } = twoBone(out.shoulder, arm.hand, BONES.upper, BONES.fore, arm.bend));
    else { elbow = add(out.shoulder, dir(arm.angle), BONES.upper); hand = add(elbow, dir(arm.fore ?? arm.angle), BONES.fore); }
    out[side] = { knee, ankle, toe: add(ankle, dir(leg.foot), BONES.foot), elbow, hand };
  }
  return out;
}

// Kniebuiging in graden (0 = gestrekt).
export function kneeFlexion(pts, side) {
  const { knee, ankle } = pts[side];
  const t = [knee[0] - pts.pelvis[0], knee[1] - pts.pelvis[1]];
  const s = [ankle[0] - knee[0], ankle[1] - knee[1]];
  const cos = (t[0] * s[0] + t[1] * s[1]) / (Math.hypot(...t) * Math.hypot(...s));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

// ---------- De figuren ----------

// Kuit tegen de muur: het achterste been (n) stapt naar achteren, gestrekt,
// hiel plat; het lichaam vormt één lijn naar de muur. Voorste knie ≤ 20°.
const gastroc = (() => {
  const F = [104, 84];
  const B = [66, 84];
  const P = above(B, legReach(0), F, legReach(14));
  const lean = (Math.atan2(P[0] - B[0], P[1] - B[1]) * 180) / Math.PI; // richting hiel → heup
  const arms = (hand) => ({ n: { hand, bend: 'down' }, f: { hand: [hand[0] - 1, hand[1] + 1], bend: 'down' } });
  return {
    viewBox: [56, 1, 72, 89],
    props: [{ type: 'floor', y: 86 }, { type: 'wall', x: 122, y1: 3, y2: 86 }],
    active: ['n.shin', 'n.foot'],
    poses: {
      start: { pelvis: [101.5, 45.2], torso: 175, head: 178, legs: { n: { ankle: [99, 84], bend: 'front', foot: 90 }, f: { ankle: F, bend: 'front', foot: 90 } }, arms: arms([120.5, 26]) },
      step: { pelvis: [93.4, 46.6], torso: 165, head: 170, legs: { n: { ankle: [82.5, 84], bend: 'front', foot: 90 }, f: { ankle: F, bend: 'front', foot: 90 } }, arms: arms([120.5, 28]) },
      stretch: { pelvis: P, torso: lean, head: lean + 4, legs: { n: { ankle: B, bend: 'front', foot: 90 }, f: { ankle: F, bend: 'front', foot: 90 } }, arms: arms([120.5, 31]) },
    },
    timelines: {
      prep: { keys: [[0, 'start']], still: 'start' },
      work: { keys: [[0, 'start'], [1100, 'step'], [2300, 'stretch']] },
      demo: { loop: 8000, keys: [[0, 'start'], [1100, 'step'], [2300, 'stretch'], [6000, 'stretch'], [7000, 'step'], [7900, 'start']], still: 'stretch' },
    },
  };
})();

// Hamstrings met band (contract-relax): ruglig, het gestrekte been (n) omhoog
// in de band, het andere been plat. Aanspannen: duwen in de band (het been
// beweegt nauwelijks); loslaten: het been iets verder trekken. Beide knieën
// gestrekt.
const hamstringPnf = (() => {
  const pose = (angle, hand, effort = 0) => ({
    pelvis: [80, 78], torso: -90, head: -97, effort,
    legs: { n: { angle, foot: angle + 90 }, f: { angle: 90, foot: 180 } },
    arms: { n: { hand, bend: 'down' }, f: { hand: [hand[0] - 1, hand[1] + 1], bend: 'down' } },
  });
  return {
    viewBox: [34, 27, 92, 59],
    props: [{ type: 'floor', y: 82 }],
    band: true,
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

// Enkel-rocks tegen de muur: split-stand, de voorste knie (n) gaat naar de
// muur boven de tenen, hiel plat; rustig ritme van 2,5 s. Knie ~30–45°.
const ankleRock = (() => {
  const F = [106, 84];
  const B = [89, 80];
  const arms = (hand) => ({ n: { hand, bend: 'down' }, f: { hand: [hand[0] - 1, hand[1] + 1], bend: 'down' } });
  const legs = { n: { ankle: F, bend: 'front', foot: 90 }, f: { ankle: B, bend: 'front', foot: 60 } };
  return {
    viewBox: [78, 1, 48, 89],
    props: [{ type: 'floor', y: 86 }, { type: 'wall', x: 118, y1: 3, y2: 86 }],
    active: ['n.shin'],
    poses: {
      back: { pelvis: [104.6, 45.1], torso: 176, head: 178, legs, arms: arms([116.5, 30]) },
      fwd: { pelvis: [111.4, 48.2], torso: 172, head: 176, legs, arms: arms([116.5, 30]) },
    },
    timelines: {
      prep: { keys: [[0, 'back']] },
      work: { loop: 2500, keys: [[0, 'back'], [1250, 'fwd'], [2500, 'back']], still: 'fwd' },
      demo: { loop: 2500, keys: [[0, 'back'], [1250, 'fwd'], [2500, 'back']], still: 'fwd' },
    },
  };
})();

export const FIGURES = {
  gastroc_muur: gastroc,
  hamstring_pnf: hamstringPnf,
  enkel_rock: ankleRock,
};

export const hasFigure = (id) => Object.hasOwn(FIGURES, id);

// ---------- Tijd → houding ----------

// Segmentsoort van de speler → tijdlijn van het figuur.
const PHASES = { prep: 'prep', switch: 'prep', transition: 'prep', work: 'work', contract: 'contract', relax: 'relax', demo: 'demo' };

export function timeline(fig, phase, round = 1) {
  const p = PHASES[phase] ?? 'prep';
  return (round >= 2 && fig.timelines[`${p}2`]) || fig.timelines[p] || fig.timelines.prep;
}

const ease = (t) => t * t * (3 - 2 * t);

function mix(a, b, t) {
  if (typeof a === 'number') return a + (b - a) * t;
  if (Array.isArray(a)) return a.map((x, i) => mix(x, b[i], t));
  if (a && typeof a === 'object') {
    const out = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      out[k] = k in a && k in b ? mix(a[k], b[k], t) : (a[k] ?? b[k]);
    }
    return out;
  }
  return t < 0.5 ? a : b;
}

// Houding op tijdstip ms (vanaf het begin van de fase). Een lus herhaalt zich;
// anders blijft de laatste houding staan. reduced (minder beweging): de
// eindhouding, of bij een lus de houding "still".
export function poseAt(fig, phase, ms, { round = 1, reduced = false } = {}) {
  const tl = timeline(fig, phase, round);
  const keys = tl.keys;
  if (reduced) return fig.poses[tl.still ?? keys[keys.length - 1][1]];
  let t = Math.max(0, ms);
  if (tl.loop) t %= tl.loop;
  if (t <= keys[0][0]) return fig.poses[keys[0][1]];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i];
    const [t1, b] = keys[i + 1];
    if (t < t1) return mix(fig.poses[a], fig.poses[b], ease((t - t0) / (t1 - t0)));
  }
  return fig.poses[keys[keys.length - 1][1]];
}
