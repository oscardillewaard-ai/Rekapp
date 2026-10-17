// Bibliotheek (§6.1): lijst per regio en spiergroep, zoeken, filters en
// sortering. Filters blijven bewaard zolang de app open is.
import { h, clear } from './dom.js';
import { starsWithScore, icon, bodyMap, positionIcon } from './graphics.js';
import {
  defaultFilters, matches, catalogItems, sortItems, groupItems, activeFilterCount, equipmentOptions, NO_EQUIPMENT, REGIONS,
} from '../catalog.js';
import { TYPE_LABELS } from '../format.js';
import { FILTERS } from '../texts.js';

const SORT_LABELS = { score: 'Score', naam: 'Naam', R: 'Relevantie (R)', tijd: 'Tijd' };
const SLOT_OPTIONS = [[null, 'Alle'], ['ochtend', 'Ochtend'], ['avond', 'Avond'], ['beide', 'Beide']];
const POSITION_OPTIONS = [[null, 'Alle'], ['staand', 'Staand'], ['stoel', 'Stoel'], ['vloer', 'Vloer'], ['liggend', 'Liggend']];
const STAR_OPTIONS = [[0, 'Alle'], [2, '2'], [3, '3'], [3.5, '3½'], [4, '4'], [4.5, '4½'], [5, '5']];
const TYPE_OPTIONS = [[null, 'Alle'], ...Object.entries(TYPE_LABELS).map(([k, v]) => [k, v[0].toUpperCase() + v.slice(1)])];
const cap = (t) => t[0].toUpperCase() + t.slice(1);

export function createLibraryScreen({ lib, equipmentOrder }) {
  const state = { filters: defaultFilters(), sort: 'score', grouped: true };
  const items = catalogItems(lib);
  const equipment = equipmentOptions(lib, equipmentOrder);
  const rows = new Map(); // oefening-id → <li>, eenmalig gebouwd

  const count = h('span', { class: 'count', 'aria-live': 'polite' });
  const listHost = h('div');
  const filterBadge = h('span', { class: 'badge', hidden: true });
  const search = h('input', {
    type: 'search', placeholder: 'Zoek op naam', 'aria-label': 'Zoek op naam', autocomplete: 'off', enterkeyhint: 'search',
    oninput: () => { state.filters.query = search.value; renderList(); },
  });
  const filterButton = h('button', { class: 'btn fit', type: 'button', 'aria-haspopup': 'dialog', onclick: () => openSheet() },
    icon('sliders'), 'Filters', filterBadge);

  const root = h('section', { class: 'screen', 'aria-labelledby': 'lib-title' },
    h('header', { class: 'topbar' }, h('h1', { id: 'lib-title' }, 'Bibliotheek'), count),
    listHost);
  const toolbar = h('div', { class: 'toolbar' },
    h('label', { class: 'search grow' }, icon('search'), search),
    filterButton);

  function row(it) {
    let li = rows.get(it.ex.id);
    if (li) return li;
    const { ex, rating } = it;
    const group = lib.groups.get(ex.targets[0].group);
    const mini = bodyMap(ex.targets, { crop: 'mini', className: 'mini' }) ?? positionIcon(ex.position, 'mini') ?? h('span', { class: 'mini' });
    li = h('li', null,
      h('a', { class: `row${rating.locked ? ' locked' : ''}`, href: `#/oefening/${ex.id}` },
        mini,
        h('div', null,
          h('div', { class: 'name' }, ex.name),
          h('div', { class: 'meta' }, starsWithScore(rating), h('span', null, group.label))),
        h('div', { class: 'side' },
          h('span', { class: 'knee-badge', title: 'Maximale kniebuiging' }, h('span', { class: 'sr-only' }, 'Knie maximaal '), `${ex.kneeFlexionMaxDeg}°`),
          rating.locked ? h('span', { title: 'Vergrendeld' }, icon('lock', 'lock'), h('span', { class: 'sr-only' }, 'Vergrendeld')) : null)));
    rows.set(ex.id, li);
    return li;
  }

  function visible() {
    return items.filter((it) => matches(it.ex, it.rating, state.filters));
  }

  function renderList() {
    const shown = visible();
    count.textContent = `${shown.length} ${shown.length === 1 ? 'oefening' : 'oefeningen'}`;
    const n = activeFilterCount(state.filters);
    filterBadge.hidden = n === 0;
    filterBadge.textContent = String(n);
    filterButton.setAttribute('aria-label', n ? `Filters, ${n} actief` : 'Filters');
    clear(listHost);
    if (!shown.length) {
      listHost.append(h('p', { class: 'empty' }, 'Geen oefeningen gevonden met deze filters.'));
      return;
    }
    if (state.grouped) {
      for (const { region, groups } of groupItems(shown, lib, state.sort, state.filters)) {
        listHost.append(h('h2', { class: 'region-title' }, region));
        for (const { group, items: list } of groups) {
          listHost.append(
            h('h3', { class: 'group-title' }, group.label, h('small', null, String(list.length))),
            h('ul', { class: 'list' }, list.map(row)));
        }
      }
    } else {
      listHost.append(h('ul', { class: 'list', style: 'margin-top:.75rem' }, sortItems(shown, state.sort).map(row)));
    }
  }

  // ---------- Filterblad ----------

  const sheet = h('dialog', { class: 'sheet', 'aria-labelledby': 'filter-title' });
  const showButton = h('button', { class: 'btn primary', type: 'button', onclick: () => sheet.close() });

  function chipset(legend, options, isOn, toggle) {
    return h('fieldset', null, h('legend', null, legend),
      h('div', { class: 'chipset' }, options.map(([value, label, extra]) =>
        h('button', {
          type: 'button', 'aria-pressed': String(isOn(value)),
          onclick: (e) => { toggle(value); refreshSheet(); e.currentTarget.blur(); },
        }, extra ?? null, label))));
  }

  function switchRow(label, key) {
    const input = h('input', { type: 'checkbox', role: 'switch', onchange: () => { state.filters[key] = input.checked; refreshSheet(); } });
    input.checked = state.filters[key];
    return h('label', { class: 'switch' }, h('span', null, label), input);
  }

  const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  function sheetContent() {
    const f = state.filters;
    const groupsByRegion = REGIONS.map((region) => [region, [...lib.groups.values()].filter((g) => g.region === region)]);
    const groupedSwitch = h('input', { type: 'checkbox', role: 'switch', onchange: () => { state.grouped = groupedSwitch.checked; refreshSheet(); } });
    groupedSwitch.checked = state.grouped;
    return [
      chipset('Sorteren', Object.entries(SORT_LABELS), (v) => state.sort === v, (v) => { state.sort = v; }),
      h('label', { class: 'switch' }, h('span', null, 'Groeperen per spiergroep'), groupedSwitch),
      ...groupsByRegion.map(([region, groups]) => chipset(`Spiergroep · ${region}`, groups.map((g) => [g.id, g.label]),
        (v) => f.groups.includes(v), (v) => { f.groups = toggleIn(f.groups, v); })),
      chipset('Moment', SLOT_OPTIONS, (v) => f.slot === v, (v) => { f.slot = v; }),
      chipset('Positie', POSITION_OPTIONS.map(([v, l]) => [v, l, v ? positionIcon(v, 'chip-icon') : null]), (v) => f.position === v, (v) => { f.position = v; }),
      chipset('Materiaal', [[NO_EQUIPMENT, cap(FILTERS.noEquipment)], ...equipment.map((e) => [e, cap(e)])],
        (v) => f.equipment.includes(v), (v) => { f.equipment = toggleIn(f.equipment, v); }),
      chipset('Minimum aantal sterren', STAR_OPTIONS, (v) => f.minStars === v, (v) => { f.minStars = v; }),
      chipset('Type', TYPE_OPTIONS, (v) => f.type === v, (v) => { f.type = v; }),
      h('fieldset', null, h('legend', null, 'Knie'),
        switchRow(cap(FILTERS.onlyK4), 'onlyK4'),
        switchRow(cap(FILTERS.showLocked), 'showLocked')),
    ];
  }

  const sheetBody = h('div', { class: 'sheet-body' });
  sheet.append(
    sheetBody,
    h('div', { class: 'sheet-foot' },
      h('button', { class: 'btn', type: 'button', onclick: () => { state.filters = { ...defaultFilters(), query: state.filters.query }; refreshSheet(); } }, 'Wis filters'),
      showButton));

  function refreshSheet() {
    const scroll = sheetBody.scrollTop;
    clear(sheetBody).append(
      h('div', { class: 'sheet-head' },
        h('h2', { id: 'filter-title' }, 'Filters en sorteren'),
        h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Sluiten', onclick: () => sheet.close() }, icon('cross'))),
      ...sheetContent());
    sheetBody.scrollTop = scroll;
    renderList();
    const n = visible().length;
    showButton.textContent = `Toon ${n} ${n === 1 ? 'oefening' : 'oefeningen'}`;
  }

  function openSheet() {
    refreshSheet();
    sheet.showModal();
    sheetBody.scrollTop = 0;
  }
  // Tik op de achtergrond sluit het blad.
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

  renderList();
  return { root, toolbar, sheet };
}
