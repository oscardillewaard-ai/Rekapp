// Sterren, iconen, lichaamskaart en positie-iconen. Alle tekeningen zijn eigen
// werk (§6.2).
import { s, h } from './dom.js';
import { formatStars, formatScore } from '../format.js';

// ---------- Sterren (halve sterren mogelijk) ----------

// Vijfpuntige ster in een vak van 24 × 24, punt boven. Punten afwisselend
// buiten (R) en binnen (r), te beginnen bovenaan; punt 5 ligt recht onder het
// midden, zodat de punten 5–9 plus 0 precies de linkerhelft vormen.
function starPoints(cx, cy, R, r) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  });
}
const PTS = starPoints(12, 12.6, 11.4, 4.7);
const toAttr = (pts) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
const FULL = toAttr(PTS);
const LEFT_HALF = toAttr([PTS[5], PTS[6], PTS[7], PTS[8], PTS[9], PTS[0]]);

export function starsSvg(stars) {
  const svg = s('svg', { viewBox: '0 0 128 24', 'aria-hidden': 'true', focusable: 'false' });
  for (let i = 0; i < 5; i++) {
    const g = s('g', { transform: `translate(${i * 26} 0)` });
    g.append(s('polygon', { points: FULL, class: 'empty-star' }));
    if (stars >= i + 1) g.append(s('polygon', { points: FULL, class: 'full' }));
    else if (stars >= i + 0.5) g.append(s('polygon', { points: LEFT_HALF, class: 'full' }));
    svg.append(g);
  }
  return svg;
}

export const starsLabel = (stars) => `${formatStars(stars)} van 5 sterren`;

// Sterren plus score: "★★★★½ 4,30".
export function starsWithScore(rating, { large = false } = {}) {
  return h('span', { class: `stars${large ? ' large' : ''}` },
    starsSvg(rating.stars),
    h('span', { class: 'sr-only' }, `${starsLabel(rating.stars)}, score `),
    h('span', { class: 'score' }, formatScore(rating.score)));
}

// ---------- Iconen (24 × 24, lijnen in currentColor) ----------

const ICONS = {
  lock: [['rect', { x: 5, y: 10.5, width: 14, height: 10, rx: 2 }], ['path', { d: 'M8 10.5V8a4 4 0 0 1 8 0v2.5' }]],
  check: [['path', { d: 'M4.5 12.5l4.5 4.5L19.5 6.5' }]],
  cross: [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
  search: [['circle', { cx: 10.5, cy: 10.5, r: 6 }], ['path', { d: 'M15 15l5 5' }]],
  sliders: [['path', { d: 'M4 7h9M17 7h3M4 17h3M11 17h9' }], ['circle', { cx: 15, cy: 7, r: 2 }], ['circle', { cx: 9, cy: 17, r: 2 }]],
  back: [['path', { d: 'M15 5l-7 7 7 7' }]],
  knee: [['path', { d: 'M7 3.5l5 8.5-3 8.5' }], ['circle', { cx: 12, cy: 12, r: 1.6 }]],
  info: [['circle', { cx: 12, cy: 12, r: 8.5 }], ['path', { d: 'M12 11v5.5M12 7.6v.2' }]],
  home: [['path', { d: 'M4 11l8-6.5 8 6.5M6.5 9.5V19h11V9.5' }]],
  list: [['path', { d: 'M9 6.5h11M9 12h11M9 17.5h11' }], ['circle', { cx: 4.5, cy: 6.5, r: 1 }], ['circle', { cx: 4.5, cy: 12, r: 1 }], ['circle', { cx: 4.5, cy: 17.5, r: 1 }]],
  gear: [['circle', { cx: 12, cy: 12, r: 3 }], ['path', { d: 'M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2L18 18M6 18l1.8-1.8M16.2 7.8L18 6' }]],
  play: [['path', { d: 'M8 5.5v13l10.5-6.5z' }]],
  pause: [['path', { d: 'M8.5 5.5v13M15.5 5.5v13' }]],
  prev: [['path', { d: 'M6.5 5.5v13M18 6l-8.5 6 8.5 6z' }]],
  next: [['path', { d: 'M17.5 5.5v13M6 6l8.5 6L6 18z' }]],
  speaker: [['path', { d: 'M4.5 9.5h3.5l4.5-4v13l-4.5-4H4.5zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11' }]],
  // Tegels met sjablonen (§6.3).
  sun: [['circle', { cx: 12, cy: 12, r: 4 }], ['path', { d: 'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4' }]],
  moon: [['path', { d: 'M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z' }]],
  run: [['circle', { cx: 15, cy: 4.5, r: 2 }], ['path', { d: 'M13.5 7.5L11 13M7 12l2.5-2.5 3.5-1 3 2.5 3-.5M11 13l3.5 3-1.5 5M11 13l-2.5 4H4.5' }]],
  climb: [['circle', { cx: 10.5, cy: 7, r: 2 }], ['circle', { cx: 16.5, cy: 3.5, r: 1.2 }], ['path', { d: 'M20.5 2.5v19M12 9.5l3.8-4.8M11 9.5v6M11 11l-3.5 2.5M11 15.5l4 1.5.5 4M11 15.5l-3 5.5' }]],
  dumbbell: [['path', { d: 'M7 7v10M17 7v10M4 9.5v5M20 9.5v5M7 12h10' }]],
  mountain: [['path', { d: 'M2.5 19.5L9 8.5l4 6.5 2.5-3.5 6 8z' }]],
  stretch: [['circle', { cx: 14, cy: 6.8, r: 1.9 }], ['path', { d: 'M6.5 21.5l3-6.5 3 6.5M9.5 15l2.6-6M11.2 9.8l-.6-7.3M11.6 10.6l3.4 2.6' }]],
};

export function icon(name, cls = '') {
  const svg = s('svg', {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: cls || undefined,
  });
  for (const [tag, attrs] of ICONS[name]) svg.append(s(tag, attrs));
  return svg;
}

// ---------- Lichaamskaart en positie-iconen ----------

let bodyTemplate = null; // <svg> uit img/body.svg
const regionBoxes = new Map(); // groeps-id → { voor: {x,y,width,height} | null, achter: … }
const positionTemplates = new Map(); // 'staand' → <svg>

async function fetchSvg(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const doc = new DOMParser().parseFromString(await res.text(), 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.nodeName !== 'svg') throw new Error(`${url}: geen SVG`);
  return document.importNode(svg, true);
}

// Laadt de tekeningen eenmalig. Ontbreekt er een, dan draait de app zonder.
export async function loadGraphics(positions) {
  const results = await Promise.allSettled([
    fetchSvg('img/body.svg').then((svg) => { bodyTemplate = svg; measureRegions(); }),
    ...positions.map((p) => fetchSvg(`img/pos/${p}.svg`).then((svg) => positionTemplates.set(p, svg))),
  ]);
  for (const r of results) if (r.status === 'rejected') console.warn('Tekening niet geladen:', r.reason);
}

// Meet per regio de omtrek in elk aanzicht (voor x < 100, achter x ≥ 100), om
// miniaturen in te zoomen op de spiergroep.
function measureRegions() {
  const probe = bodyTemplate.cloneNode(true);
  probe.removeAttribute('id');
  Object.assign(probe.style, { position: 'absolute', left: '-9999px', top: '0', width: '200px', height: '240px', visibility: 'hidden' });
  document.body.append(probe);
  try {
    // Schermrechthoeken in plaats van getBBox, zodat transforms meetellen. Het
    // meetexemplaar is 200 × 240 px groot, dus 1 px = 1 eenheid.
    const origin = probe.getBoundingClientRect();
    for (const g of probe.querySelectorAll('g.regio')) {
      const boxes = { voor: null, achter: null };
      for (const shape of g.children) {
        const r = shape.getBoundingClientRect();
        const b = { x: r.left - origin.left, y: r.top - origin.top, width: r.width, height: r.height };
        if (!b.width && !b.height) continue;
        const view = b.x + b.width / 2 < 100 ? 'voor' : 'achter';
        const cur = boxes[view];
        boxes[view] = cur
          ? { x: Math.min(cur.x, b.x), y: Math.min(cur.y, b.y), width: Math.max(cur.x + cur.width, b.x + b.width) - Math.min(cur.x, b.x), height: Math.max(cur.y + cur.height, b.y + b.height) - Math.min(cur.y, b.y) }
          : { x: b.x, y: b.y, width: b.width, height: b.height };
      }
      regionBoxes.set(g.id, boxes);
    }
  } finally {
    probe.remove();
  }
}

// Uitsnede rond een regio met verhouding breedte/hoogte = aspect, binnen het
// aanzicht waarin de regio staat.
function cropFor(group, aspect) {
  const boxes = regionBoxes.get(group);
  const view = boxes?.voor ? 'voor' : boxes?.achter ? 'achter' : null;
  if (!view) return null;
  const b = boxes[view];
  const vx = view === 'voor' ? 0 : 100;
  let height = Math.max(b.height * 1.9, (b.width * 1.9) / aspect, 70);
  let width = height * aspect;
  if (width > 100) { width = 100; height = width / aspect; }
  if (height > 240) { height = 240; width = height * aspect; }
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const x = Math.min(Math.max(cx - width / 2, vx), vx + 100 - width);
  const y = Math.min(Math.max(cy - height / 2, 0), 240 - height);
  return [x, y, width, height].map((n) => n.toFixed(1)).join(' ');
}

// Lichaamskaart met primaire doelen vol en bijbetrokken doelen half (§6.2).
// crop: 'mini' zoomt in op de eerste primaire groep; anders beide aanzichten.
export function bodyMap(targets, { crop = null, aspect = 44 / 64, className = '' } = {}) {
  if (!bodyTemplate) return null;
  const svg = bodyTemplate.cloneNode(true);
  // Id's alleen in het bronbestand; in de pagina staan er tientallen kopieën.
  for (const el of svg.querySelectorAll('[id]')) {
    if (el.classList.contains('regio')) el.dataset.region = el.id;
    else if (el.id === 'silhouet') el.setAttribute('data-silhouet', '');
    el.removeAttribute('id');
  }
  svg.removeAttribute('id');
  svg.setAttribute('class', `bodymap ${className}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.removeAttribute('role');
  for (const t of targets) {
    const g = svg.querySelector(`[data-region="${t.group}"]`);
    if (g) g.classList.add(t.weight === 1 ? 'primair' : 'bij');
  }
  if (crop === 'mini') {
    const box = cropFor(targets[0].group, aspect);
    if (box) svg.setAttribute('viewBox', box);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }
  return svg;
}

export function positionIcon(position, cls = '') {
  const tpl = positionTemplates.get(position);
  if (!tpl) return null;
  const svg = tpl.cloneNode(true);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (cls) svg.setAttribute('class', cls);
  return svg;
}
