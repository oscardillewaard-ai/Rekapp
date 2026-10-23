// Stokfiguren (§6.2, fase 2): eigen, eenvoudige tekeningen per oefening (zie
// AFWIJKINGEN.md). Puur: een houding plus de tijd binnen een fase geeft de
// punten van het figuur; tekenen doet ui/figure.js. Het skelet staat in
// figures/rig.js, de houdingen per positie in figures/<positie>.js.
import { joints, at } from './figures/rig.js';
import { joints3d, projectAll, projectProp, behind } from './figures/rig3d.js';
import { STAAND } from './figures/staand.js';
import { STOEL } from './figures/stoel.js';
import { VLOER } from './figures/vloer.js';
import { LIGGEND } from './figures/liggend.js';

export { BONES, dir, dist, twoBone, kneeFlexion, at } from './figures/rig.js';

// Figuur = { view?: 'side' | 'front' | '3d', camera? (bij 3d: { yaw, pitch }),
// viewBox: [x, y, w, h], props, active, bands?, effort?, poses, timelines }.
export const FIGURES = { ...STAAND, ...STOEL, ...VLOER, ...LIGGEND };

export const hasFigure = (id) => Object.hasOwn(FIGURES, id);

// Punten van een houding van dit figuur in beeld (zij- of vooraanzicht, of in
// 3D geprojecteerd), en bij 3D ook de punten in de ruimte.
export const pointsOf = (fig, pose) => (fig.view === '3d' ? projectAll(joints3d(pose), fig.camera) : joints(pose, fig.view));
export const points3dOf = (fig, pose) => joints3d(pose);

// 3D: welke ledematen achter de romp liggen ('n.leg', 'f.arm', …); anders null.
const LIMB_OF = { thigh: 'leg', shin: 'leg', foot: 'leg', arm: 'arm', fore: 'arm', palm: 'arm' };
const activeLimbs = (fig) => Object.fromEntries(fig.active.filter((b) => LIMB_OF[b.slice(2)]).map((b) => [`${b[0]}.${LIMB_OF[b.slice(2)]}`, true]));
export const behindOf = (fig, pose) => (fig.view === '3d' ? behind(joints3d(pose), fig.camera, activeLimbs(fig)) : null);

// Rekwisieten in beeld.
export const propsOf = (fig) => (fig.view === '3d' ? fig.props.map((p) => projectProp(p, fig.camera)) : fig.props);

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
  const pts = fig.view === '3d' ? joints3d(pose) : pointsOf(fig, pose);
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
