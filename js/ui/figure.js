// Stokfiguur tekenen (§6.2, fase 2). De houding komt uit figures.js; hier
// alleen de SVG en de animatie. Tijd altijd uit tijdstempels
// (performance.now), per animatieframe.
import { s, h } from './dom.js';
import { icon } from './graphics.js';
import { FIGURES, hasFigure, pointsOf, propsOf, behindOf, poseAt, dir, at, BONES } from '../figures.js';

export { hasFigure };

const reducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

// Botten per kant, en de romp. Vooraanzicht en 3D: ook bekken en schouders.
const LIMBS = (k) => [
  [`${k}.thigh`, `${k}.hip`, `${k}.knee`], [`${k}.shin`, `${k}.knee`, `${k}.ankle`], [`${k}.foot`, `${k}.ankle`, `${k}.toe`],
  [`${k}.arm`, `${k}.shoulder`, `${k}.elbow`], [`${k}.fore`, `${k}.elbow`, `${k}.hand`], [`${k}.palm`, `${k}.hand`, `${k}.fingers`],
];
const SPINE = [['hips', 'f.hip', 'n.hip'], ['spine.low', 'pelvis', 'mid'], ['spine.high', 'mid', 'neck'], ['shoulders', 'f.shoulder', 'n.shoulder'], ['neck', 'neck', 'head']];
// Monnikskapspier (nek naar schouder): alleen getekend als die rekt.
const TRAPS = [['n.trap', 'neck', 'n.shoulder'], ['f.trap', 'neck', 'f.shoulder']];
const f2 = (n) => n.toFixed(2);

// Punt voor een band om de voetzool: midden van de voet, iets voorbij de zool.
function sole(pts, k) {
  const { knee, ankle, toe } = pts[k];
  const len = Math.hypot(ankle[0] - knee[0], ankle[1] - knee[1]) || 1;
  const along = [(ankle[0] - knee[0]) / len, (ankle[1] - knee[1]) / len];
  const mid = [(ankle[0] + toe[0]) / 2, (ankle[1] + toe[1]) / 2];
  return { point: [mid[0] + along[0] * 2, mid[1] + along[1] * 2], along };
}
const point = (pts, key) => (key.endsWith('.sole') ? sole(pts, key[0]).point : at(pts, key));

function prop(p, [x, , w]) {
  if (p.floor !== undefined) return s('line', { class: 'prop', x1: x, y1: p.floor, x2: x + w, y2: p.floor });
  if (p.wall !== undefined) return s('line', { class: 'prop', x1: p.wall, y1: p.y1, x2: p.wall, y2: p.y2 });
  if (p.line) return s('line', { class: 'prop', x1: p.line[0], y1: p.line[1], x2: p.line[2], y2: p.line[3] });
  if (p.rect) return s('rect', { class: `prop${p.solid ? ' solid' : ''}`, x: p.rect[0], y: p.rect[1], width: p.rect[2], height: p.rect[3], rx: 1.5 });
  if (p.circle) return s('circle', { class: `prop${p.solid ? ' solid' : ''}`, cx: p.circle[0], cy: p.circle[1], r: p.circle[2] });
  if (p.poly) return s('polygon', { class: `prop${p.solid ? ' solid' : ''}`, points: p.poly.map(([px, py]) => `${f2(px)},${f2(py)}`).join(' ') });
  return null;
}

// Eén SVG met een update(fase, ms, { round }) die de punten verzet.
export function createFigure(id, className = '') {
  const fig = FIGURES[id];
  const [x, y, w, hgt] = fig.viewBox;
  const front = fig.view === 'front';
  const wide = front || fig.view === '3d'; // bekken en schouders hebben breedte
  const svg = s('svg', { viewBox: `${x} ${y} ${w} ${hgt}`, class: `figure ${className}`.trim(), 'aria-hidden': 'true', focusable: 'false' });
  svg.append(...propsOf(fig).map((p) => prop(p, fig.viewBox)).filter(Boolean));
  const line = ([name, a, b]) => ({ el: s('line', { class: fig.active.includes(name) ? 'bone active' : 'bone' }), a, b });
  const far = LIMBS('f').map(line);
  const near = LIMBS('n').map(line);
  const spine = [...SPINE.filter(([name]) => wide || (name !== 'hips' && name !== 'shoulders')), ...TRAPS.filter(([name]) => fig.active.includes(name))].map(line);
  const head = s('circle', { class: fig.active.includes('head') ? 'head active' : 'head', r: BONES.head });
  const bands = (fig.bands ?? []).map(([a, b]) => ({ el: s('line', { class: 'band' }), a, b }));
  const effort = fig.effort ? [s('line', { class: 'effort' }), s('line', { class: 'effort' })] : [];
  // Volgorde: verre kant (in zijaanzicht als geheel gedimd, zodat overlappende
  // uiteinden niet lichter worden), romp en hoofd, banden, nabije kant,
  // inspanning. In 3D bepaalt de rekstand welk been of welke arm duidelijk
  // verder weg ligt; die gaat (de hele beweging door) in de gedimde laag.
  const behindLayer = s('g', { class: 'far' });
  const frontLayer = s('g');
  const limbs = fig.view === '3d'
    ? Object.fromEntries(['n', 'f'].flatMap((k) => {
      const ls = k === 'n' ? near : far;
      return [[`${k}.leg`, s('g', null, ...ls.slice(0, 3).map((l) => l.el))], [`${k}.arm`, s('g', null, ...ls.slice(3).map((l) => l.el))]];
    }))
    : null;
  if (limbs) {
    const back = behindOf(fig, poseAt(fig, 'demo', 0, { reduced: true }));
    for (const [k, g] of Object.entries(limbs)) (back[k] ? behindLayer : frontLayer).append(g);
    svg.append(behindLayer);
  }
  else svg.append(front ? s('g', null, ...far.map((l) => l.el)) : s('g', { class: 'far' }, ...far.map((l) => l.el)));
  svg.append(...spine.map((l) => l.el), head, ...bands.map((b) => b.el));
  svg.append(...(limbs ? [frontLayer] : near.map((l) => l.el)), ...effort);

  function place(l, p, q) {
    if (!p || !q) { l.el.style.display = 'none'; return; }
    l.el.style.display = '';
    l.el.setAttribute('x1', f2(p[0])); l.el.setAttribute('y1', f2(p[1]));
    l.el.setAttribute('x2', f2(q[0])); l.el.setAttribute('y2', f2(q[1]));
  }

  function draw(pose, ms) {
    const pts = pointsOf(fig, pose);
    for (const l of [...far, ...spine, ...near]) place(l, at(pts, l.a), at(pts, l.b));
    head.setAttribute('cx', f2(pts.head[0]));
    head.setAttribute('cy', f2(pts.head[1]));
    for (const b of bands) place(b, point(pts, b.a), point(pts, b.b));
    // Inspanning (PNF): twee streepjes voorbij de zool die zacht pulseren.
    if (!effort.length) return;
    const k = fig.effort;
    const { point: p, along } = sole(pts, k);
    const across = dir(pose.legs[k].foot ?? 90);
    const e = pose.effort ?? 0;
    const pulse = reducedMotion.matches ? 1 : 0.65 + 0.35 * Math.sin((ms / 700) * 2 * Math.PI);
    effort.forEach((el, i) => {
      const c = [p[0] + along[0] * (3 + 2.5 * i), p[1] + along[1] * (3 + 2.5 * i)];
      const half = 2.5 + i;
      el.setAttribute('x1', f2(c[0] - across[0] * half)); el.setAttribute('y1', f2(c[1] - across[1] * half));
      el.setAttribute('x2', f2(c[0] + across[0] * half)); el.setAttribute('y2', f2(c[1] + across[1] * half));
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
