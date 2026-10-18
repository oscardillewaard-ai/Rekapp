// Startscherm: de sjablonen Ochtend en Avond (5 · 10 · 15 min). Latere
// mijlpalen voegen hier "Mijn week" en de kniechecks toe.
import { h, clear } from './dom.js';
import { formatDuration } from '../format.js';

export function createHomeScreen({ lib }) {
  const root = h('section', { class: 'screen', 'aria-labelledby': 'home-title' });
  const extra = h('div'); // ruimte voor kaarten van latere mijlpalen

  function slotCard(slot, title) {
    const templates = [...lib.templates.values()].filter((r) => r.slot === slot).sort((a, b) => a.variant - b.variant);
    return h('section', { class: 'section slot-card' },
      h('h2', null, title),
      h('div', { class: 'variant-buttons' }, templates.map((r) =>
        h('a', { class: 'btn variant', href: `#/routine/${r.id}`, 'aria-label': `${r.name}, ${formatDuration(r.expectedTotalSec)}` },
          h('span', { class: 'variant-min' }, String(r.variant)),
          h('span', { class: 'variant-unit' }, 'min')))));
  }

  function render() {
    clear(root).append(
      h('header', { class: 'topbar' }, h('h1', { id: 'home-title', tabindex: '-1' }, 'Rekapp')),
      extra,
      slotCard('ochtend', 'Ochtend'),
      slotCard('avond', 'Avond'));
  }
  render();
  return { root, extra, render };
}
