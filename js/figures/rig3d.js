// Stokfiguren in 3D, voor houdingen die niet in één plat vlak liggen (op
// handen en knieën met de knieën wijd, zijlig, draaien om de lengteas). De
// houding staat in 3D; per figuur kijkt een vaste camera er schuin naar. De
// geprojecteerde punten hebben dezelfde vorm als die van joints() in rig.js,
// zodat tekenen, tijdlijnen en tests hetzelfde werken.
//
// Wereld: x vooruit (de kant waar het figuur standaard heen kijkt), y omhoog
// (vloer y = 0), z naar de kijker: de n-kant. Met camera { yaw: 0, pitch: 0 }
// is het beeld het gewone zijaanzicht. yaw (graden) draait de voorkant van
// het figuur naar de kijker toe, pitch laat de camera van boven kijken.
import { BONES, at } from './rig.js';

const add = (p, q, k = 1) => p.map((x, i) => x + q[i] * k);
const sub = (p, q) => p.map((x, i) => x - q[i]);
const dot = (p, q) => p.reduce((s, x, i) => s + x * q[i], 0);
const unit = (p) => {
  const l = Math.hypot(...p) || 1;
  return p.map((x) => x / l);
};
const half = (p, q) => p.map((x, i) => (x + q[i]) / 2);

// Het deel van p loodrecht op de eenheidsvector u, als eenheidsvector.
export function across(p, u) {
  const q = sub(p, u.map((x) => x * dot(p, u)));
  if (Math.hypot(...q) > 1e-9) return unit(q);
  return across(Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u);
}

// Twee botten van root naar target; het gewricht steekt uit in de richting
// pole (bijv. de knie naar voren: [1, 0, 0]). Te ver weg: gestrekt naar het
// doel.
export function twoBone3(root, target, a, b, pole) {
  const d0 = Math.hypot(...sub(target, root));
  const u = d0 ? unit(sub(target, root)) : [0, -1, 0];
  const d = Math.min(Math.max(d0, Math.abs(a - b) + 1e-6), a + b);
  const cos = Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d)));
  const w = across(pole, u);
  return { joint: add(add(root, u, a * cos), w, a * Math.sqrt(1 - cos * cos)), end: add(root, u, d) };
}

// Punten van een 3D-houding.
// pose = {
//   pelvis: [x, y, z], torso: [richting onderrug], chest?, head? (richtingen,
//   standaard de vorige), side? (van het midden van het bekken naar de n-heup,
//   standaard [0, 0, 1]), chestSide? (idem voor de schouders: de romp draait),
//   legs: { n, f }: { ankle: [x, y, z], knee: [richting], straight?, foot? } of
//                   { thigh: [richting], shin?, foot? },
//   arms: { n, f }: { hand: [x, y, z] | 'punt', elbow: [richting], palm? } of
//                   { upper: [richting], fore?, palm? },
// }
// Een hand kan een punt van het figuur vastpakken ('n.knee', …), zoals in 2D.
export function joints3d(pose) {
  const P = pose.pelvis;
  const T = unit(pose.torso);
  const C = unit(pose.chest ?? pose.torso);
  const H = unit(pose.head ?? pose.chest ?? pose.torso);
  const L = across(pose.side ?? [0, 0, 1], T);
  const Lc = across(pose.chestSide ?? pose.side ?? [0, 0, 1], C);
  const mid = add(P, T, BONES.low);
  const base = add(mid, C, BONES.shoulderAt);
  const neck = add(mid, C, BONES.high);
  const out = { pelvis: P, mid, chest: base, neck, head: add(neck, H, BONES.neck + BONES.head) };
  for (const side of ['n', 'f']) {
    const hip = add(P, L, side === 'n' ? BONES.hipW : -BONES.hipW);
    const leg = pose.legs[side];
    let knee;
    let ankle;
    if (leg.ankle && leg.straight) {
      const u = unit(sub(leg.ankle, hip));
      knee = add(hip, u, BONES.thigh);
      ankle = add(hip, u, BONES.thigh + BONES.shin);
    } else if (leg.ankle) ({ joint: knee, end: ankle } = twoBone3(hip, leg.ankle, BONES.thigh, BONES.shin, leg.knee));
    else {
      knee = add(hip, unit(leg.thigh), BONES.thigh);
      ankle = add(knee, unit(leg.shin ?? leg.thigh), BONES.shin);
    }
    out[side] = { hip, knee, ankle, toe: add(ankle, unit(leg.foot ?? [1, 0, 0]), BONES.foot), thighMid: half(hip, knee), shinMid: half(knee, ankle) };
  }
  for (const side of ['n', 'f']) {
    const shoulder = add(base, Lc, side === 'n' ? BONES.shoulderW : -BONES.shoulderW);
    const arm = pose.arms[side];
    let elbow;
    let hand;
    if (arm.hand) {
      const target = typeof arm.hand === 'string' ? at(out, arm.hand) : arm.hand;
      ({ joint: elbow, end: hand } = twoBone3(shoulder, target, BONES.arm, BONES.fore, arm.elbow));
    } else {
      elbow = add(shoulder, unit(arm.upper), BONES.arm);
      hand = add(elbow, unit(arm.fore ?? arm.upper), BONES.fore);
    }
    Object.assign(out[side], { shoulder, elbow, hand, foreMid: half(elbow, hand) });
    if (arm.palm) out[side].fingers = add(hand, unit(arm.palm), BONES.hand);
  }
  return out;
}

// De schouder van een kant in een houding (de armen doen er niet toe): om een
// hand op een bereikbare plek te zetten.
export const shoulderOf = (pose, side) => joints3d({ ...pose, arms: { n: { upper: [0, -1, 0] }, f: { upper: [0, -1, 0] } } })[side].shoulder;

// Een wereldpunt in beeld: x naar rechts, y omlaag. Bij camera 0, 0 staat de
// oorsprong op (80, 86), net als de vloer in de 2D-figuren.
export function project(p, { yaw = 0, pitch = 0 } = {}) {
  const [y0, p0] = [(yaw * Math.PI) / 180, (pitch * Math.PI) / 180];
  const x1 = p[0] * Math.cos(y0) - p[2] * Math.sin(y0);
  const z1 = p[0] * Math.sin(y0) + p[2] * Math.cos(y0);
  return [80 + x1, 86 - (p[1] * Math.cos(p0) - z1 * Math.sin(p0))];
}

// Welk been en welke arm liggen (gezien vanaf de camera) duidelijk verder weg
// dan hun tegenhanger? Die worden gedimd en eerst getekend, zoals de verre
// kant in het zijaanzicht. Liggen ze ongeveer even ver (benen in een V tegen
// de muur), dan geen van beide. Een lid dat rekt (active: { 'n.leg': true, … })
// blijft vol zichtbaar, tenzij zijn tegenhanger ook rekt.
export function behind(pts, { yaw = 0, pitch = 0 } = {}, active = {}, margin = 4) {
  const [y0, p0] = [(yaw * Math.PI) / 180, (pitch * Math.PI) / 180];
  const toCamera = [Math.sin(y0) * Math.cos(p0), Math.sin(p0), Math.cos(y0) * Math.cos(p0)];
  const depth = (a, b) => dot(half(a, b), toCamera);
  const out = {};
  for (const [part, a, b] of [['leg', 'knee', 'ankle'], ['arm', 'elbow', 'hand']]) {
    const dn = depth(pts.n[a], pts.n[b]);
    const df = depth(pts.f[a], pts.f[b]);
    const both = active[`n.${part}`] && active[`f.${part}`];
    out[`n.${part}`] = dn < df - margin && (both || !active[`n.${part}`]);
    out[`f.${part}`] = df < dn - margin && (both || !active[`f.${part}`]);
  }
  return out;
}

// Alle punten van joints3d() in beeld.
export function projectAll(pts, camera) {
  const out = {};
  for (const [k, val] of Object.entries(pts)) {
    out[k] = Array.isArray(val) ? project(val, camera) : projectAll(val, camera);
  }
  return out;
}

// Rekwisieten in 3D: een vlak (mat, bed, muur) als veelhoek, of een lijn.
// { poly: [[x, y, z], …], solid? } en { seg: [[x, y, z], [x, y, z]] }.
export function projectProp(prop, camera) {
  if (prop.poly) return { ...prop, poly: prop.poly.map((p) => project(p, camera)) };
  if (prop.seg) {
    const [a, b] = prop.seg.map((p) => project(p, camera));
    return { line: [...a, ...b] };
  }
  return prop;
}

export { unit };

// Een rechthoek op de vloer (mat) van x0 tot x1 en z0 tot z1.
export const floorRect = (x0, x1, z0, z1, y = 0) => ({ poly: [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]] });
