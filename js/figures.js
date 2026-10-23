// Stokfiguren (§6.2, fase 2): eigen, eenvoudige tekeningen per oefening (zie
// AFWIJKINGEN.md). Puur: een houding plus de tijd binnen een fase geeft de
// punten van het figuur; tekenen doet ui/figure.js. Het skelet staat in
// figures/rig.js, de houdingen per positie in figures/<positie>.js.
import { joints, at } from './figures/rig.js';
import { STAAND } from './figures/staand.js';
import { LIGGEND } from './figures/liggend.js';

export { BONES, dir, dist, twoBone, kneeFlexion, at } from './figures/rig.js';

// Figuur = { view?: 'side' | 'front', viewBox: [x, y, w, h], props, active,
// bands?, effort?, poses, timelines }.
export const FIGURES = { ...STAAND, ...LIGGEND };

export const hasFigure = (id) => Object.hasOwn(FIGURES, id);

// Punten van een houding van dit figuur (zij- of vooraanzicht).
export const pointsOf = (fig, pose) => joints(pose, fig.view);

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

// Een hand die een punt van het figuur vastpakt ('n.ankle'): voor het
// mengen van twee houdingen eerst omzetten naar een vaste plek, zodat de hand
// vloeiend meebeweegt.
const fixedCache = new WeakMap();
function fixed(fig, name) {
  const pose = fig.poses[name];
  if (fixedCache.has(pose)) return fixedCache.get(pose);
  let out = pose;
  if (['n', 'f'].some((k) => typeof pose.arms[k].hand === 'string')) {
    const pts = pointsOf(fig, pose);
    const arms = {};
    for (const k of ['n', 'f']) {
      const arm = pose.arms[k];
      arms[k] = typeof arm.hand === 'string' ? { ...arm, hand: at(pts, arm.hand) } : arm;
    }
    out = { ...pose, arms };
  }
  fixedCache.set(pose, out);
  return out;
}
