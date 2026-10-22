// Bibliotheek (§6.1): lijst per regio en spiergroep, zoeken, filters en
// sortering. Filters blijven bewaard zolang de app open is.
import { h, clear } from './dom.js';
import { starsWithScore, icon, bodyMap, positionIcon } from './graphics.js';
import {
  defaultFilters, matches, catalogItems, sortItems, groupItems, activeFilterCount, equipmentOptions, primaryGroups,
  NO_EQUIPMENT, REGIONS,
} from '../catalog.js';
import { TYPE_LABELS } from '../format.js';
import { FILTERS } from '../texts.js';

const SORT_LABELS = { score: 'Score', naam: 'Naam', R: 'Relevantie (R)', tijd: 'Tijd' };
const SLOT_OPTIONS = [[null, 'Alle'], ['ochtend', 'Ochtend'], ['avond', 'Avond'], ['beide', 'Beide']];
const POSITION_OPTIONS = [[null, 'Alle'], ['staand', 'Staand'], ['stoel', 'Stoel'], ['vloer', 'Vloer'], ['liggend', 'Liggend']];
const STAR_OPTIONS = [[0, 'Alle'], [2, '2'], [3, '3'], [3.5, '3½'], [4, '4'], [4.5, '4½'], [5, '5']];
const TYPE_OPTIONS = [[null, 'Alle'], ...Object.entries(TYPE_LABELS).map(([k, v]) => [k, v[0].toUpperCase() + v.slice(1)])];
const cap = (t) => t[0].toUpperCase() + t.slice(1);
const plural = (n) => `${n} ${n === 1 ? 'oefening' : 'oefeningen'}`;

// Twee standen: de gewone bibliotheek (rij = link naar de kaart) en de kiezer
// van de routinebouwer (rij = knop; onPick krijgt de oefening). blockedCodes(ex)
// geeft bij de kiezer de blokkerende waarschuwingen (W1/W8), of [].
let instances = 0;

// Zoeken, filters en sortering. De bibliotheek en de kiezer van de bouwer
// delen één toestand: "+ Oefening" opent de bibliotheek met de filters die
// daar staan (§6.3), en andersom.
export const libraryState = (showLocked) => ({ filters: { ...defaultFilters(), showLocked }, sort: 'score', grouped: true });

export function createLibraryScreen({
  lib, equipmentOrder, showLocked = true, weights, title = 'Bibliotheek', onPick = null,
  blockedCodes = (ex) => (ex.locked ? ['W1'] : []), scrollTop = () => window.scrollTo(0, 0), headerExtra = null,
  state = libraryState(showLocked),
}) {
  const uid = ++instances;
  // "Vergrendelde oefeningen tonen" (§6.11) is de standaard van het filter.
  let lockedDefault = showLocked;
  const baseFilters = () => ({ ...defaultFilters(), showLocked: lockedDefault });
  let items = catalogItems(lib, weights);
  const equipment = equipmentOptions(lib, equipmentOrder);
  const rows = new Map(); // oefening-id → <li>, eenmalig gebouwd

  const count = h('span', { class: 'count', 'aria-live': 'polite' });
  const listHost = h('div', { class: 'lib-list' });
  const filterBadge = h('span', { class: 'badge', hidden: true });
  const search = h('input', {
    type: 'search', placeholder: 'Zoek op naam', 'aria-label': 'Zoek op naam', autocomplete: 'off', enterkeyhint: 'search',
    oninput: () => { state.filters.query = search.value; renderList(); scrollTop(); },
  });
  const filterButton = h('button', { class: 'btn fit', type: 'button', 'aria-haspopup': 'dialog', onclick: () => openSheet() },
    icon('sliders'), 'Filters', filterBadge);

  // De werkbalk staat in de DOM vóór de lijst (eerst zoeken, dan de 70 rijen),
  // maar blijft met position: fixed onderin de duimzone.
  const toolbar = h('div', { class: 'toolbar' },
    h('label', { class: 'search grow' }, icon('search'), search),
    filterButton);
  const root = h('section', { class: 'screen', 'aria-labelledby': `lib-title-${uid}` },
    h('header', { class: 'topbar' }, h('h1', { id: `lib-title-${uid}`, tabindex: '-1' }, title), count, headerExtra),
    toolbar,
    listHost);

  function row(it) {
    let li = rows.get(it.ex.id);
    if (li) return li;
    const { ex, rating } = it;
    const groupLabels = primaryGroups(ex).map((g) => lib.groups.get(g).label).join(', ');
    const mini = bodyMap(ex.targets, { crop: 'mini', className: 'mini' }) ?? positionIcon(ex.position, 'mini') ?? h('span', { class: 'mini' });
    // Slot = de knie-poort blokkeert nu (W1, of W8 tijdens een opvlamming).
    const blocked = blockedCodes(ex);
    const locked = blocked.length > 0;
    const cls = `row${locked ? ' locked' : ''}`;
    const el = onPick
      ? h('button', { class: cls, type: 'button', onclick: () => onPick(ex, blocked), 'aria-label': blocked.length ? `${ex.name}: kan niet worden toegevoegd` : `${ex.name} toevoegen` })
      : h('a', { class: cls, href: `#/oefening/${ex.id}` });
    li = h('li', null, el);
    el.append(
        mini,
        h('div', { class: 'main' },
          h('div', { class: 'name' }, ex.name),
          h('div', { class: 'meta' }, starsWithScore(rating), h('span', null, groupLabels))),
        h('div', { class: 'side' },
          h('span', { class: 'knee-badge', title: 'Maximale kniebuiging' }, h('span', { class: 'sr-only' }, 'Knie maximaal '), `${ex.kneeFlexionMaxDeg}°`),
          locked ? h('span', { title: 'Vergrendeld' }, icon('lock', 'lock'), h('span', { class: 'sr-only' }, 'Vergrendeld')) : null));
    rows.set(ex.id, li);
    return li;
  }

  function visible() {
    return items.filter((it) => matches(it.ex, it.rating, state.filters));
  }

  function renderList() {
    const shown = visible();
    count.textContent = plural(shown.length);
    const n = activeFilterCount(state.filters, baseFilters());
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
  // Eenmalig opgebouwd; een tik werkt alleen de toestand van de knoppen bij,
  // zodat de focus (en VoiceOver/TalkBack) op dezelfde plek blijft.

  const updaters = [];
  let changed = false;
  const sheet = h('dialog', { class: 'sheet', 'aria-labelledby': 'filter-title' });
  const showButton = h('button', { class: 'btn primary', type: 'button', onclick: () => sheet.close() });
  const status = h('p', { class: 'sr-only', role: 'status' });

  function chipset(legend, options, isOn, toggle) {
    const buttons = options.map(([value, label, extra]) => {
      const b = h('button', { type: 'button', onclick: () => { toggle(value); update(); } }, extra ?? null, label);
      updaters.push(() => b.setAttribute('aria-pressed', String(isOn(value))));
      return b;
    });
    return h('fieldset', null, h('legend', null, legend), h('div', { class: 'chipset' }, buttons));
  }

  function switchRow(label, get, set) {
    const input = h('input', { type: 'checkbox', role: 'switch', onchange: () => { set(input.checked); update(); } });
    updaters.push(() => { input.checked = get(); });
    return h('label', { class: 'switch' }, h('span', null, label), input);
  }

  const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const f = () => state.filters;
  const groupsByRegion = REGIONS.map((region) => [region, [...lib.groups.values()].filter((g) => g.region === region)]);

  sheet.append(
    h('div', { class: 'sheet-body' },
      h('div', { class: 'sheet-head' },
        h('h2', { id: 'filter-title' }, 'Filters en sorteren'),
        h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Sluiten', onclick: () => sheet.close() }, icon('cross'))),
      chipset('Sorteren', Object.entries(SORT_LABELS), (v) => state.sort === v, (v) => { state.sort = v; }),
      switchRow('Groeperen per spiergroep', () => state.grouped, (on) => { state.grouped = on; }),
      ...groupsByRegion.map(([region, groups]) => chipset(`Spiergroep · ${region}`, groups.map((g) => [g.id, g.label]),
        (v) => f().groups.includes(v), (v) => { f().groups = toggleIn(f().groups, v); })),
      chipset('Moment', SLOT_OPTIONS, (v) => f().slot === v, (v) => { f().slot = v; }),
      chipset('Positie', POSITION_OPTIONS.map(([v, l]) => [v, l, v ? positionIcon(v) : null]), (v) => f().position === v, (v) => { f().position = v; }),
      chipset('Materiaal', [[NO_EQUIPMENT, cap(FILTERS.noEquipment)], ...equipment.map((e) => [e, cap(e)])],
        (v) => f().equipment.includes(v), (v) => { f().equipment = toggleIn(f().equipment, v); }),
      chipset('Minimum aantal sterren', STAR_OPTIONS, (v) => f().minStars === v, (v) => { f().minStars = v; }),
      chipset('Type', TYPE_OPTIONS, (v) => f().type === v, (v) => { f().type = v; }),
      h('fieldset', null, h('legend', null, 'Knie'),
        switchRow(cap(FILTERS.onlyK4), () => f().onlyK4, (on) => { f().onlyK4 = on; }),
        switchRow(cap(FILTERS.showLocked), () => f().showLocked, (on) => { f().showLocked = on; }))),
    h('div', { class: 'sheet-foot' },
      h('button', { class: 'btn', type: 'button', onclick: () => { state.filters = { ...baseFilters(), query: state.filters.query }; update(); } }, 'Wis filters'),
      showButton,
      status));

  // Na een wijziging: knoppen bijwerken, lijst opnieuw tonen, telling melden.
  function update({ silent = false } = {}) {
    if (search.value !== (state.filters.query ?? '')) search.value = state.filters.query ?? '';
    for (const u of updaters) u();
    renderList();
    const text = `Toon ${plural(visible().length)}`;
    showButton.textContent = text;
    if (!silent) {
      changed = true;
      status.textContent = plural(visible().length);
    }
  }

  function openSheet() {
    changed = false;
    update({ silent: true });
    sheet.showModal();
    sheet.querySelector('.sheet-body').scrollTop = 0;
  }
  // Tik op de achtergrond sluit het blad; na een wijziging begint de lijst
  // weer bovenaan, bij de best scorende oefeningen.
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });
  sheet.addEventListener('close', () => {
    status.textContent = '';
    if (changed) scrollTop();
  });

  function setShowLocked(on) {
    lockedDefault = on;
    state.filters.showLocked = on;
    update({ silent: true });
  }

  // Eigen weging (§6.11): sterren opnieuw voor de weergave; de knie-poort
  // blijft gelden (rate() zet locked los van de weging).
  function setWeights(pct) {
    items = catalogItems(lib, pct);
    rows.clear();
    renderList();
  }

  // Rijen opnieuw opbouwen (bv. als de kniestatus veranderde).
  function refresh() {
    rows.clear();
    update({ silent: true });
  }

  renderList();
  return { root, toolbar, sheet, setShowLocked, setWeights, refresh, sync: () => update({ silent: true }), focusSearch: () => search.focus() };
}
