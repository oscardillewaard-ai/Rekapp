// Stokfiguren (§6.2, fase 2): eigen, eenvoudige tekeningen per oefening (zie
// AFWIJKINGEN.md). Puur: een houding plus de tijd binnen een fase geeft de
// punten van het figuur; tekenen doet ui/figure.js. Het skelet staat in
// figures/rig.js, de houdingen per positie in figures/<positie>.js.
import { joints, at } from './figures/rig.js';
import { joints3d, projectAll, projectProp, behind, project } from './figures/rig3d.js';
import { handDepths, liftSide, liftFront, liftProps } from './figures/lift.js';
import { STAAND } from './figures/staand.js';
import { STOEL } from './figures/stoel.js';
import { VLOER } from './figures/vloer.js';
import { LIGGEND } from './figures/liggend.js';
import { TRAINING } from './figures/training.js';

import { BONES } from './figures/rig.js';

export { BONES, dir, dist, twoBone, kneeFlexion, at } from './figures/rig.js';

// Figuur = { view?: 'side' | 'front' | '3d', camera? (bij 3d: { yaw, pitch }),
// viewBox: [x, y, w, h], props, active, bands?, effort?, poses, timelines }.
// Een opgetild figuur (3D-modus, as3d) heeft view '3d' en lift: 'side' of
// 'front': de houdingen blijven 2D, de punten gaan via lift.js de ruimte in.
export const FIGURES = { ...STAAND, ...STOEL, ...VLOER, ...LIGGEND, ...TRAINING };

export const hasFigure = (id) => Object.hasOwn(FIGURES, id);

// Punten van een houding van dit figuur in beeld (zij- of vooraanzicht, of in
// 3D geprojecteerd), en bij 3D ook de punten in de ruimte.
export function points3dOf(fig, pose) {
  if (!fig.lift) return joints3d(pose);
  const pts = joints(pose, fig.lift);
  return fig.lift === 'front' ? liftFront(pts) : liftSide(pts, fig.hands);
}
export const pointsOf = (fig, pose) => (fig.view === '3d' ? projectAll(points3dOf(fig, pose), fig.camera) : joints(pose, fig.view));

// 3D: welke ledematen achter de romp liggen ('n.leg', 'f.arm', …); anders null.
const LIMB_OF = { thigh: 'leg', shin: 'leg', foot: 'leg', arm: 'arm', fore: 'arm', palm: 'arm' };
const activeLimbs = (fig) => Object.fromEntries(fig.active.filter((b) => LIMB_OF[b.slice(2)]).map((b) => [`${b[0]}.${LIMB_OF[b.slice(2)]}`, true]));
export const behindOf = (fig, pose) => (fig.view === '3d' ? behind(points3dOf(fig, pose), fig.camera, activeLimbs(fig)) : null);

// Rekwisieten in beeld (in 3D zonder de vlakken die van de camera af kijken).
export const propsOf = (fig) => (fig.view === '3d' ? fig.props.map((p) => projectProp(p, fig.camera)).filter(Boolean) : fig.props);

// ---------- 3D-modus ----------

// Het figuur in 3D: een 3D-figuur zelf, een 2D-figuur opgetild (lift.js) met
// een standaardcamera schuin van voren (laag of liggend: meer van boven).
const lifted = new WeakMap();
export function as3d(fig) {
  if (fig.view === '3d') return fig;
  if (lifted.has(fig)) return lifted.get(fig);
  const lift = fig.view === 'front' ? 'front' : 'side';
  const out = { ...fig, view: '3d', lift, hands: handDepths(fig), props: liftProps(fig) };
  const start = points3dOf(out, Object.values(fig.poses)[0]);
  out.camera = fig.camera3d ?? (lift === 'front' ? { yaw: 115, pitch: 10 } : { yaw: 30, pitch: start.pelvis[1] < 15 ? 30 : 12 });
  out.viewBox = fitViewBox(out, [out.camera]);
  lifted.set(fig, out);
  return out;
}

// Kleinste beeldkader rond alle frames van alle tijdlijnen, voor deze camera's
// (bij ronddraaien: rondom). Met een marge, het hoofd als cirkel. De punten
// in de ruimte worden één keer per figuur bemonsterd (hooguit ~40 frames per
// tijdlijn); per camera hoeft alleen nog geprojecteerd te worden.
const samples = new WeakMap();
function sampled(fig) {
  if (!samples.has(fig)) {
    const out = [];
    for (const [phase, tl] of Object.entries(fig.timelines)) {
      const end = tl.loop ?? tl.keys[tl.keys.length - 1][0] + 500;
      const step = Math.max(100, Math.ceil(end / 40));
      const times = new Set([...tl.keys.map(([t]) => t), ...Array.from({ length: Math.floor(end / step) + 1 }, (_, i) => i * step)]);
      for (const t of times) {
        const p = points3dOf(fig, poseAt(fig, phase, t));
        out.push({ head: p.head, rest: [p.pelvis, p.mid, p.neck, ...['n', 'f'].flatMap((s) => Object.values(p[s]))] });
      }
    }
    samples.set(fig, out);
  }
  return samples.get(fig);
}

export function fitViewBox(fig, cameras, margin = 4) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  const grow = ([x, y], r = 0) => { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); };
  const frames = sampled(fig);
  for (const camera of cameras) {
    for (const { head, rest } of frames) {
      for (const q of rest) grow(project(q, camera));
      grow(project(head, camera), BONES.head);
    }
  }
  return [x0 - margin, y0 - margin, x1 - x0 + 2 * margin, y1 - y0 + 2 * margin].map((v) => Math.round(v * 10) / 10);
}

// Beeldkader voor een figuur dat je rond kunt draaien (de kaart): ruim genoeg
// voor elke draaiing, zodat het figuur tijdens het draaien niet verspringt.
const turning = new WeakMap();
export function turnViewBox(fig3) {
  if (!turning.has(fig3)) {
    const cams = Array.from({ length: 8 }, (_, i) => ({ ...fig3.camera, yaw: fig3.camera.yaw + i * 45 }));
    turning.set(fig3, fitViewBox(fig3, cams));
  }
  return turning.get(fig3);
}

// ---------- Tijd → houding ----------

// Segmentsoort van de speler → tijdlijn van het figuur.
const PHASES = { prep: 'prep', switch: 'prep', rest: 'prep', transition: 'prep', work: 'work', contract: 'contract', relax: 'relax', demo: 'demo' };

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
    if (t < t1) return mix(fixed(fig, a), fixed(fig, b), ease((t - t0) / (t1 - t0)));
  }
  return fig.poses[keys[keys.length - 1][1]];
}

// Voor het mengen van twee houdingen: een hand die een punt van het figuur
// vastpakt ('n.ankle') wordt een vaste plek, zodat de hand vloeiend
// meebeweegt, en wat een houding weglaat krijgt de standaardwaarde uit rig.js.
// Anders springt een waarde die maar één van beide noemt (chest, scale) al
// aan het begin van de overgang naar het eind.
const fixedCache = new WeakMap();
function fixed(fig, name) {
  const pose = fig.poses[name];
  if (fixedCache.has(pose)) return fixedCache.get(pose);
  // Doelen worden opgelost waar de houding zelf in staat: 2D (ook bij een
  // opgetild figuur) of 3D.
  const pts = fig.view === '3d' && !fig.lift ? joints3d(pose) : joints(pose, fig.lift ?? fig.view);
  const chest = pose.chest ?? pose.torso;
  const arms = {};
  const legs = {};
  for (const k of ['n', 'f']) {
    const arm = { scale: 1, foreScale: 1, ...pose.arms[k] };
    arms[k] = typeof arm.hand === 'string' ? { ...arm, hand: at(pts, arm.hand) } : arm;
    legs[k] = { scale: 1, shinScale: 1, ...pose.legs[k] };
  }
  const out = { spineScale: 1, ...pose, chest, head: pose.head ?? chest, arms, legs };
  fixedCache.set(pose, out);
  return out;
}
