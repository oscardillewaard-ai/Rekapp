// Routines: je eigen routines en de sjablonen (alleen-lezen). De sjablonen
// staan als tegels met een icoon en een naam (§6.3); een tik opent het
// tegelscherm met de routines per soort en de uitleg.
import { h, fill } from './dom.js';
import { icon } from './graphics.js';
import { formatDuration } from '../format.js';
import { totalSec, templateTiles, KIND_ORDER } from '../routines.js';
import { playableRoutine } from '../warnings.js';
import { TEMPLATE_KINDS as KIND_TEXT } from '../texts.js';

const SLOT_TEXT = { ochtend: 'Ochtend', avond: 'Avond', vrij: 'Vrij' };

// Eén routine als rij, met de tijd zoals de preview hem toont: met de
// ingestelde kantwisselduur en zonder stappen die de opvlammingsmodus
// blokkeert (W8).
function routineCard(r, { lib, getData, template }) {
  const { settings, knee } = getData();
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

export function createRoutinesScreen({ lib, getData, onNew }) {
  const root = h('section', { class: 'screen', 'aria-labelledby': 'routines-title' });
  const toolbar = h('div', { class: 'toolbar' },
    h('button', { class: 'btn primary', type: 'button', onclick: () => onNew() }, '+ Nieuwe routine'));
  const tiles = templateTiles(lib.templates.values());

  function render() {
    const { routines } = getData();
    const mine = [...routines].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
    fill(root,
      h('header', { class: 'topbar' }, h('h1', { id: 'routines-title', tabindex: '-1' }, 'Routines')),
      toolbar,
      h('h2', { class: 'region-title' }, 'Mijn routines'),
      mine.length
        ? h('ul', { class: 'list' }, mine.map((r) => routineCard(r, { lib, getData, template: false })))
        : h('p', { class: 'note' }, 'Nog geen eigen routines. Maak er een, of kopieer een sjabloon en pas het aan.'),
      h('h2', { class: 'region-title' }, 'Sjablonen'),
      h('ul', { class: 'tiles' }, tiles.map((t) => h('li', null,
        h('a', { class: 'tile', href: `#/sjablonen/${t.key}` },
          h('span', { class: 'tile-icon' }, icon(t.icon)),
          h('span', { class: 'name' }, t.name),
          h('span', { class: 'meta' }, `${t.templates.length} ${t.templates.length === 1 ? 'routine' : 'routines'}`))))));
  }

  return { root, toolbar, render };
}

// Tegelscherm: de sjablonen van één tegel, per soort met de uitleg (§6.3).
export function createTemplatesScreen({ lib, getData, onBack }) {
  const root = h('section', { class: 'screen' });
  const toolbar = h('div', { class: 'toolbar' });
  const tiles = templateTiles(lib.templates.values());

  function render(key) {
    const tile = tiles.find((t) => t.key === key) ?? null;
    fill(toolbar, h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Terug', onclick: onBack }, icon('back')));
    if (!tile) {
      fill(root, h('header', { class: 'topbar' }, h('h1', { tabindex: '-1' }, 'Niet gevonden')));
      return null;
    }
    fill(root,
      h('header', { class: 'card-head tile-head' },
        h('span', { class: 'tile-icon' }, icon(tile.icon)),
        h('h1', { tabindex: '-1' }, tile.name)),
      ...KIND_ORDER.flatMap((kind) => {
        const list = tile.templates.filter((r) => r.kind === kind);
        if (!list.length) return [];
        const [title, note] = KIND_TEXT[kind];
        return [
          h('h2', { class: 'group-title' }, title),
          h('p', { class: 'note group-note' }, note),
          h('ul', { class: 'list' }, list.map((r) => routineCard(r, { lib, getData, template: true }))),
        ];
      }));
    return tile;
  }

  return { root, toolbar, render };
}
