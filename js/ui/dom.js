// Kleine DOM-hulpjes. Tekst gaat altijd via textContent, nooit via innerHTML.

const SVG_NS = 'http://www.w3.org/2000/svg';

function apply(el, attrs) {
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

// h('button', { class: 'btn', onclick }, 'Tekst', kind…)
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  apply(el, attrs);
  append(el, children);
  return el;
}

export function s(tag, attrs, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  apply(el, attrs);
  append(el, children);
  return el;
}

export function clear(el) {
  while (el.firstChild) el.firstChild.remove();
  return el;
}

// Inhoud vervangen. Net als bij h() vallen null, undefined en false weg; de
// gewone el.append() zou er de tekst "null" van maken.
export function fill(el, ...children) {
  clear(el);
  append(el, children);
  return el;
}

// Eén vaste live-regio voor korte meldingen aan schermlezers (bv. de nieuwe
// waarde van een stepper). Elementen die opnieuw worden opgebouwd, kunnen dat
// zelf niet: een nieuw aria-live-element wordt niet voorgelezen.
let liveRegion = null;
export function announce(text) {
  if (!liveRegion) {
    liveRegion = h('p', { class: 'sr-only', role: 'status' });
    document.body.append(liveRegion);
  }
  liveRegion.textContent = '';
  // Een nieuwe tekst in een volgende taak, zodat dezelfde tekst twee keer
  // achter elkaar ook twee keer wordt voorgelezen.
  setTimeout(() => { liveRegion.textContent = text; }, 50);
}

// Een stuk scherm opnieuw opbouwen zonder dat toetsenbord en schermlezer hun
// plek kwijtraken: daarna staat de focus weer op het element met hetzelfde
// aria-label (of dezelfde tekst), en een stepper of keuzeknop meldt zijn
// nieuwe stand.
export function preserveFocus(container, rebuild) {
  const active = document.activeElement;
  const keyOf = (el) => el.getAttribute('aria-label') ?? el.textContent.trim();
  const key = active && active !== document.body && container.contains(active) ? keyOf(active) : null;
  rebuild();
  if (key === null) return;
  const match = [...container.querySelectorAll('button, input, select, a[href], textarea')].find((el) => keyOf(el) === key);
  if (!match) return;
  match.focus({ preventScroll: true });
  const group = match.closest('.stepper');
  if (group) announce(`${group.getAttribute('aria-label')}: ${group.querySelector('output')?.textContent ?? ''}`);
  else if (match.getAttribute('aria-pressed') === 'true') announce(`${keyOf(match)} gekozen`);
}
