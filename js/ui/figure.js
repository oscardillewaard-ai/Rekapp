// Stokfiguur tekenen (§6.2, fase 2; proef). De houding komt uit figures.js;
// hier alleen de SVG en de animatie. Tijd altijd uit tijdstempels
// (performance.now), per animatieframe.
import { s, h } from './dom.js';
import { icon } from './graphics.js';
import { FIGURES, hasFigure, joints, poseAt, dir, BONES } from '../figures.js';

export { hasFigure };

const reducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

// Botten in tekenvolgorde: eerst de verre kant (gedimd), dan romp en hoofd,
// dan de nabije kant.
const BONE_LIST = [
  ['f.thigh', 'pelvis', 'f.knee'], ['f.shin', 'f.knee', 'f.ankle'], ['f.foot', 'f.ankle', 'f.toe'],
  ['f.upper', 'shoulder', 'f.elbow'], ['f.fore', 'f.elbow', 'f.hand'],
  ['torso', 'pelvis', 'neck'],
  ['n.thigh', 'pelvis', 'n.knee'], ['n.shin', 'n.knee', 'n.ankle'], ['n.foot', 'n.ankle', 'n.toe'],
  ['n.upper', 'shoulder', 'n.elbow'], ['n.fore', 'n.elbow', 'n.hand'],
];
const at = (pts, key) => (key.includes('.') ? pts[key[0]][key.slice(2)] : pts[key]);
const f2 = (n) => n.toFixed(2);

// Eén SVG met een update(fase, ms, { round }) die de punten verzet.
export function createFigure(id, className = '') {
  const fig = FIGURES[id];
  const [x, y, w, hgt] = fig.viewBox;
  const svg = s('svg', { viewBox: `${x} ${y} ${w} ${hgt}`, class: `figure ${className}`.trim(), 'aria-hidden': 'true', focusable: 'false' });
  for (const p of fig.props) {
    if (p.type === 'floor') svg.append(s('line', { class: 'prop', x1: x, y1: p.y, x2: x + w, y2: p.y }));
    if (p.type === 'wall') svg.append(s('line', { class: 'prop', x1: p.x, y1: p.y1, x2: p.x, y2: p.y2 }));
  }
  const band = fig.band ? s('line', { class: 'band' }) : null;
  const effort = [s('line', { class: 'effort' }), s('line', { class: 'effort' })];
  const lines = BONE_LIST.map(([name, a, b]) => {
    const el = s('line', { class: fig.active.includes(name) ? 'bone active' : 'bone' });
    return { el, a, b };
  });
  const head = s('circle', { class: 'head', r: BONES.head });
  // Volgorde: verre kant (als geheel gedimd, zodat overlappende uiteinden
  // niet lichter worden), romp en hoofd, band, nabije kant, inspanning.
  const far = s('g', { class: 'far' }, ...lines.slice(0, 5).map((l) => l.el));
  svg.append(far, lines[5].el, head);
  if (band) svg.append(band);
  svg.append(...lines.slice(6).map((l) => l.el), ...effort);

  function draw(pose, ms) {
    const pts = joints(pose);
    for (const l of lines) {
      const [p, q] = [at(pts, l.a), at(pts, l.b)];
      l.el.setAttribute('x1', f2(p[0])); l.el.setAttribute('y1', f2(p[1]));
      l.el.setAttribute('x2', f2(q[0])); l.el.setAttribute('y2', f2(q[1]));
    }
    head.setAttribute('cx', f2(pts.head[0]));
    head.setAttribute('cy', f2(pts.head[1]));
    // Band om de voetzool, naar de hand; inspanning als twee streepjes
    // voorbij de zool, die zacht pulseren.
    const { knee, ankle } = pts.n;
    const len = Math.hypot(ankle[0] - knee[0], ankle[1] - knee[1]) || 1;
    const along = [(ankle[0] - knee[0]) / len, (ankle[1] - knee[1]) / len];
    const footDir = dir(pose.legs.n.foot);
    const sole = [ankle[0] + footDir[0] * 3.5 + along[0] * 2, ankle[1] + footDir[1] * 3.5 + along[1] * 2];
    if (band) {
      band.setAttribute('x1', f2(pts.n.hand[0])); band.setAttribute('y1', f2(pts.n.hand[1]));
      band.setAttribute('x2', f2(sole[0])); band.setAttribute('y2', f2(sole[1]));
    }
    const e = pose.effort ?? 0;
    const pulse = reducedMotion.matches ? 1 : 0.65 + 0.35 * Math.sin((ms / 700) * 2 * Math.PI);
    effort.forEach((el, i) => {
      const c = [sole[0] + along[0] * (3 + 2.5 * i), sole[1] + along[1] * (3 + 2.5 * i)];
      const half = 2.5 + i;
      el.setAttribute('x1', f2(c[0] - footDir[0] * half)); el.setAttribute('y1', f2(c[1] - footDir[1] * half));
      el.setAttribute('x2', f2(c[0] + footDir[0] * half)); el.setAttribute('y2', f2(c[1] + footDir[1] * half));
      el.style.opacity = e > 0.01 ? String(e * pulse) : '0';
    });
  }

  function update(phase, ms, { round = 1 } = {}) {
    draw(poseAt(fig, phase, ms, { round, reduced: reducedMotion.matches }), ms);
  }
  update('demo', 0);
  return { el: svg, update };
}

// Kaart (§6.2): de demo herhaalt zich zolang hij in beeld is, met een knop om
// hem stil te zetten (bewegend beeld langer dan 5 s moet te pauzeren zijn).
// Met "minder beweging" staat de eindhouding stil en is er geen knop.
export function figureDemo(id) {
  const figure = createFigure(id);
  const panel = h('div', { class: 'figure-panel' }, figure.el);
  if (reducedMotion.matches) {
    figure.update('demo', 0);
    return panel;
  }
  let raf = 0;
  let paused = false;
  let visible = false;
  let elapsed = 0; // ms in de lus, ook over een pauze heen
  let from = 0;
  const toggle = h('button', { class: 'btn icon figure-toggle', type: 'button', onclick: () => setPaused(!paused) });
  const label = () => {
    toggle.replaceChildren(icon(paused ? 'play' : 'pause'));
    toggle.setAttribute('aria-label', paused ? 'Animatie afspelen' : 'Animatie pauzeren');
  };
  panel.append(toggle);
  label();
  const frame = (now) => {
    if (!figure.el.isConnected) { stop(); return; }
    figure.update('demo', elapsed + (now - from));
    raf = requestAnimationFrame(frame);
  };
  function run() {
    if (raf || paused || !visible) return;
    from = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (!raf) return;
    cancelAnimationFrame(raf);
    raf = 0;
    elapsed += performance.now() - from;
  }
  function setPaused(p) {
    paused = p;
    if (paused) stop(); else run();
    label();
  }
  if (typeof IntersectionObserver === 'function') {
    // Er kunnen meerdere meldingen tegelijk komen (verborgen, dan zichtbaar):
    // de laatste telt.
    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (!figure.el.isConnected) { io.disconnect(); stop(); return; }
      if (visible) run(); else stop();
    });
    io.observe(panel);
  } else {
    visible = true;
    run();
  }
  return panel;
}
