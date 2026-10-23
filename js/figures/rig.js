// Skelet en houdingen voor de stokfiguren (§6.2, fase 2). Puur: een houding
// geeft de punten van het figuur; tekenen doet ui/figure.js.
//
// x naar rechts, y naar beneden. Een hoek a (graden) wijst in richting
// (sin a, cos a): 0 = omlaag, 90 = rechts, 180 = omhoog, -90 = links.
// Zijaanzicht: de "n"-kant is dichtbij (vol getekend), de "f"-kant ver weg
// (gedimd). Vooraanzicht: "n" staat rechts in beeld, "f" links, beide vol.

export const BONES = {
  low: 13, high: 13, shoulderAt: 10, neck: 3, head: 5, // rug in twee delen
  arm: 14, fore: 13.5, hand: 4.5,
  thigh: 20, shin: 19, foot: 7,
  hipW: 4, shoulderW: 7.5, // halve breedte in vooraanzicht
};

const rad = (d) => (d * Math.PI) / 180;
export const dir = (a) => [Math.sin(rad(a)), Math.cos(rad(a))];
export const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
export const dist = (p, q) => Math.hypot(...q.map((x, i) => x - p[i])); // ook in 3D
export const angleOf = (from, to) => (Math.atan2(to[0] - from[0], to[1] - from[1]) * 180) / Math.PI;

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
export function above(a, ra, b, rb) {
  const d = dist(a, b);
  if (d < 1e-9) return [a[0], a[1] - ra]; // zelfde middelpunt: recht erboven
  const x = (ra * ra - rb * rb + d * d) / (2 * d);
  const y = Math.sqrt(Math.max(0, ra * ra - x * x));
  const u = [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
  const p = [a[0] + u[0] * x - u[1] * y, a[1] + u[1] * x + u[0] * y];
  const q = [a[0] + u[0] * x + u[1] * y, a[1] + u[1] * x - u[0] * y];
  return p[1] <= q[1] ? p : q;
}

// Afstand heup–enkel bij een kniebuiging van f graden.
export const legReach = (f) => Math.sqrt(BONES.thigh ** 2 + BONES.shin ** 2 + 2 * BONES.thigh * BONES.shin * Math.cos(rad(f)));

// Bekken boven twee vaste enkels met de gewenste kniebuiging per been. In
// vooraanzicht liggen de heupen hipW naast het bekken (rug onder hoek torso).
export function pelvisOn([nAnkle, nFlex], [fAnkle, fFlex], { view = 'side', torso = 180 } = {}) {
  if (view !== 'front') return above(nAnkle, legReach(nFlex), fAnkle, legReach(fFlex));
  const nOff = dir(torso - 90);
  const fOff = dir(torso + 90);
  return above(add(nAnkle, nOff, -BONES.hipW), legReach(nFlex), add(fAnkle, fOff, -BONES.hipW), legReach(fFlex));
}

// Bekken op een been vanaf een vaste enkel: het been onder hoek angle (van
// enkel naar heup) met kniebuiging flex.
export const onLeg = (ankle, angle, flex = 0) => add(ankle, dir(angle), legReach(flex));

// Punten van een houding.
// pose = {
//   pelvis: [x, y], torso (onderrug), chest? (bovenrug, standaard torso),
//   head? (standaard chest), effort?, place?: { joint, at | x | y },
//   twist? (zijaanzicht: verre schouder zoveel naar voren),
//   spineScale? (rug korter getekend: voorverkorting), en per been of arm
//   scale? (idem; shinScale en foreScale alleen het onderbeen of de onderarm),
//   legs: { n, f }: { ankle: [x, y], bend | straight: true, foot } (vast punt) of
//                   { angle, shin?, foot } (hoeken; shin standaard = angle),
//   arms: { n, f }: { hand: [x, y] | 'punt', bend, palm? } of
//                   { angle, fore?, palm? },
// }
// Een hand kan ook een punt van het figuur zelf vastpakken ('n.ankle',
// 'n.thighMid', 'n.elbow', 'chest', 'head', …): eerst de benen en de rug, dan
// de arm n, dan f.
// place schuift het hele figuur zo dat dat punt op die plek staat (vaste
// punten van andere ledematen blijven staan).
export function joints(pose, view = 'side') {
  const pts = solve(pose, pose.pelvis, view);
  if (!pose.place) return pts;
  const p = at(pts, pose.place.joint);
  const target = pose.place.at ?? [pose.place.x ?? p[0], pose.place.y ?? p[1]];
  const d = [target[0] - p[0], target[1] - p[1]];
  if (!d[0] && !d[1]) return pts;
  return solve(pose, add(pose.pelvis, d), view);
}

function solve(pose, P, view) {
  const front = view === 'front';
  const chest = pose.chest ?? pose.torso;
  // Voorverkorting: een rug die van de kijker af wijst (bijv. gezien vanaf de
  // voeten) wordt korter getekend; zo ook ledematen met scale.
  const k = pose.spineScale ?? 1;
  const mid = add(P, dir(pose.torso), BONES.low * k);
  const neck = add(mid, dir(chest), BONES.high * k);
  const base = add(mid, dir(chest), BONES.shoulderAt * k);
  const out = { pelvis: P, mid, chest: base, neck, head: add(neck, dir(pose.head ?? chest), BONES.neck + BONES.head) };
  for (const side of ['n', 'f']) {
    const sign = side === 'n' ? -1 : 1;
    const hip = front ? add(P, dir(pose.torso + sign * 90), BONES.hipW) : P;
    const leg = pose.legs[side];
    const thigh = BONES.thigh * (leg.scale ?? 1);
    const shin = BONES.shin * (leg.scale ?? 1) * (leg.shinScale ?? 1);
    let knee;
    let ankle;
    if (leg.ankle && leg.straight) {
      // Gestrekt naar het doel: de knie buigt nooit, de enkel staat op een
      // haar na (onderweg tussen twee houdingen) op haar plek.
      const u = dir(angleOf(hip, leg.ankle));
      knee = add(hip, u, thigh);
      ankle = add(hip, u, thigh + shin);
    } else if (leg.ankle) ({ joint: knee, end: ankle } = twoBone(hip, leg.ankle, thigh, shin, leg.bend));
    else { knee = add(hip, dir(leg.angle), thigh); ankle = add(knee, dir(leg.shin ?? leg.angle), shin); }
    const half = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    out[side] = { hip, knee, ankle, toe: add(ankle, dir(leg.foot ?? 90), BONES.foot), thighMid: half(hip, knee), shinMid: half(knee, ankle) };
  }
  for (const side of ['n', 'f']) {
    const sign = side === 'n' ? -1 : 1;
    // Zijaanzicht: met twist staat de verre schouder iets naar voren (de romp
    // draait mee, zodat die hand verder reikt).
    const shoulder = front ? add(base, dir(chest + sign * 90), BONES.shoulderW)
      : side === 'f' && pose.twist ? add(base, dir(chest - 90), pose.twist) : base;
    const arm = pose.arms[side];
    const upper = BONES.arm * (arm.scale ?? 1);
    const fore = BONES.fore * (arm.scale ?? 1) * (arm.foreScale ?? 1);
    let elbow;
    let hand;
    if (arm.hand) {
      const target = typeof arm.hand === 'string' ? at(out, arm.hand) : arm.hand;
      ({ joint: elbow, end: hand } = twoBone(shoulder, target, upper, fore, arm.bend));
    } else { elbow = add(shoulder, dir(arm.angle), upper); hand = add(elbow, dir(arm.fore ?? arm.angle), fore); }
    Object.assign(out[side], { shoulder, elbow, hand, foreMid: [(elbow[0] + hand[0]) / 2, (elbow[1] + hand[1]) / 2] });
    if (arm.palm !== undefined) out[side].fingers = add(hand, dir(arm.palm), BONES.hand);
  }
  return out;
}

// Een punt uit joints(): 'pelvis', 'neck', 'n.knee', 'f.hand', …
export const at = (pts, key) => (key[1] === '.' ? pts[key[0]][key.slice(2)] : pts[key]);

// Kniebuiging in graden (0 = gestrekt), in 2D of 3D.
export function kneeFlexion(pts, side) {
  const { hip, knee, ankle } = pts[side];
  const t = knee.map((x, i) => x - hip[i]);
  const s = ankle.map((x, i) => x - knee[i]);
  const cos = t.reduce((sum, x, i) => sum + x * s[i], 0) / (Math.hypot(...t) * Math.hypot(...s));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

// ---------- Tijdlijnen ----------

// Statisch: voorbereiding in de beginhouding, dan in ruim 2 s naar de
// rekstand en vasthouden. De demo op de kaart gaat heen en weer.
export const staticTimelines = (start = 'start', stretch = 'stretch') => ({
  prep: { keys: [[0, start]] },
  work: { keys: [[0, start], [2000, stretch]] },
  demo: { loop: 8000, keys: [[0, start], [1800, stretch], [5600, stretch], [7400, start]], still: stretch },
});

// Herhaald (dynamisch of actief): één beweging per herhaling, zoals de dosis
// in de bibliotheek die geeft (seconden ÷ herhalingen). keys in fracties van
// de herhaling.
// Wisselend (alternating): één lus is twee herhalingen, één per kant.
export function loopTimelines(ms, keys, still) {
  const k = keys.map(([f, pose]) => [Math.round(f * ms), pose]);
  return {
    prep: { keys: [[0, keys[0][1]]] },
    work: { loop: ms, keys: k, still },
    demo: { loop: ms, keys: k, still },
  };
}
