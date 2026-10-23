// Startscherm: kniekaarten (opvlamming, dagelijkse kniecheck), je actieve
// routines, een samenvatting van "Mijn week" en de sjablonen Ochtend en Avond
// (5 · 10 · 15 min).
import { h, fill } from './dom.js';
import { formatDuration } from '../format.js';
import { totalSec } from '../routines.js';
import { weekRows } from '../week.js';
import { playableRoutine } from '../warnings.js';

const SLOT_ORDER = { ochtend: 0, avond: 1, vrij: 2 };
const SLOT_TEXT = { ochtend: 'Ochtend', avond: 'Avond', vrij: 'Vrij' };

export function createHomeScreen({ lib, getData, topCards = () => [], bottom = () => null }) {
  const root = h('section', { class: 'screen', 'aria-labelledby': 'home-title' });

  // Tijden zoals ze echt worden afgespeeld: zonder stappen die de
  // opvlammingsmodus blokkeert (W8).
  const seconds = (r, { settings, knee }) => totalSec(playableRoutine(r, { lib, knee }).routine, lib.exercises, lib.meta.timing, settings.sideSwitchSec);

  function slotCard(slot, title, data) {
    const templates = [...lib.templates.values()].filter((r) => r.slot === slot).sort((a, b) => a.variant - b.variant);
    return h('section', { class: 'section slot-card' },
      h('h2', null, title),
      h('div', { class: 'variant-buttons' }, templates.map((r) =>
        h('a', { class: 'btn variant', href: `#/routine/${r.id}`, 'aria-label': `${r.name}, ${formatDuration(seconds(r, data))}` },
          h('span', { class: 'variant-min' }, String(r.variant)),
          h('span', { class: 'variant-unit' }, 'min')))));
  }

  function myRoutines(routines, data) {
    const active = routines.filter((r) => r.active !== false)
      .sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot] || a.name.localeCompare(b.name, 'nl'));
    if (!active.length) return null;
    return h('section', { class: 'section' },
      h('h2', null, 'Mijn routines'),
      h('ul', { class: 'list' }, active.map((r) => h('li', null,
        h('a', { class: 'row routine-row', href: `#/routine/${encodeURIComponent(r.id)}` },
          h('div', { class: 'main' },
            h('div', { class: 'name' }, r.name),
            h('div', { class: 'meta' }, `${SLOT_TEXT[r.slot]} · ${formatDuration(seconds(r, data))} · ${r.timesPerWeek}× per week`)))))));
  }

  function weekCard(routines, sessions, knee) {
    const rows = weekRows(lib, { routines, sessions, now: Date.now(), knee });
    const trained = rows.filter((r) => r.plannedSec > 0 || r.actualSec > 0);
    if (!trained.length) return null;
    const ok = rows.filter((r) => r.actualSec >= lib.meta.dose.thresholdSec).length;
    const planned = rows.filter((r) => r.plannedSec >= lib.meta.dose.thresholdSec).length;
    return h('a', { class: 'section week-card', href: '#/week' },
      h('h2', null, 'Mijn week'),
      h('p', null, `Gepland op dosis: ${planned} ${planned === 1 ? 'spiergroep' : 'spiergroepen'}. Deze week gehaald: ${ok}.`),
      h('p', { class: 'note' }, 'Tik voor alle spiergroepen.'));
  }

  function render() {
    const data = getData();
    const { routines, sessions, knee } = data;
    fill(root, 
      h('header', { class: 'topbar' }, h('h1', { id: 'home-title', tabindex: '-1' }, 'Rekapp')),
      topCards(),
      myRoutines(routines, data),
      weekCard(routines, sessions, knee),
      slotCard('ochtend', 'Ochtend', data),
      slotCard('avond', 'Avond', data),
      bottom());
  }
  return { root, render };
}
