// Routines: je eigen routines en de zes sjablonen (alleen-lezen).
import { h, fill } from './dom.js';
import { formatDuration } from '../format.js';
import { totalSec } from '../routines.js';
import { playableRoutine } from '../warnings.js';

const SLOT_TEXT = { ochtend: 'Ochtend', avond: 'Avond', vrij: 'Vrij' };

export function createRoutinesScreen({ lib, getData, onNew }) {
  const root = h('section', { class: 'screen', 'aria-labelledby': 'routines-title' });
  const toolbar = h('div', { class: 'toolbar' },
    h('button', { class: 'btn primary', type: 'button', onclick: () => onNew() }, '+ Nieuwe routine'));

  function card(r, { template }) {
    const { settings, knee } = getData();
    // Zoals de preview: met de ingestelde kantwisselduur en zonder stappen die
    // de knie-poort blokkeert (W1/W8).
    const sec = totalSec(playableRoutine(r, { lib, knee }).routine, lib.exercises, lib.meta.timing, settings.sideSwitchSec);
    const meta = [
      SLOT_TEXT[r.slot],
      formatDuration(sec),
      `${r.steps.length} ${r.steps.length === 1 ? 'oefening' : 'oefeningen'}`,
      template ? 'sjabloon' : `${r.timesPerWeek}× per week${r.active === false ? ' · niet actief' : ''}`,
    ].join(' · ');
    return h('li', null,
      h('a', { class: 'row routine-row', href: `#/routine/${encodeURIComponent(r.id)}` },
        h('div', { class: 'main' }, h('div', { class: 'name' }, r.name), h('div', { class: 'meta' }, meta))));
  }

  function render() {
    const { routines } = getData();
    const mine = [...routines].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
    fill(root, 
      h('header', { class: 'topbar' }, h('h1', { id: 'routines-title', tabindex: '-1' }, 'Routines')),
      toolbar,
      h('h2', { class: 'region-title' }, 'Mijn routines'),
      mine.length
        ? h('ul', { class: 'list' }, mine.map((r) => card(r, { template: false })))
        : h('p', { class: 'note' }, 'Nog geen eigen routines. Maak er een, of kopieer een sjabloon en pas het aan.'),
      h('h2', { class: 'region-title' }, 'Sjablonen (alleen-lezen)'),
      h('ul', { class: 'list' }, [...lib.templates.values()].map((r) => card(r, { template: true }))));
  }

  return { root, toolbar, render };
}
