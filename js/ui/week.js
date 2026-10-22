// "Mijn week" (§6.4.2): per spiergroep een balk met de laagste kant,
// markeringen bij 300 en 600 s, gepland en werkelijk, dynamisch klein eronder.
import { h, fill } from './dom.js';
import { weekRows, suggestionText, maintenanceTipDue, MAINTENANCE_TIP } from '../week.js';
import { REGIONS } from '../catalog.js';

// Status ook in woorden: kleur alleen is niet genoeg (nachtmodus, kleurenblind).
const STATUS_TEXT = { grijs: 'geen statisch of PNF', oranje: 'onder de drempel', groen: 'op dosis', blauw: 'plateau' };
const fmt = (n) => new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 }).format(n);

export function createWeekScreen({ lib, getData }) {
  const root = h('section', { class: 'screen', 'aria-labelledby': 'week-title' });
  const scaleMax = 750; // as tot 750 s: 300 bij 40 %, 600 bij 80 %

  function bar(sec, status, label) {
    const pct = Math.min(100, (sec / scaleMax) * 100);
    return h('div', { class: 'dose-bar', 'aria-hidden': 'true' },
      h('span', { class: 'dose-bar-label' }, label),
      h('span', { class: 'dose-track' },
        h('span', { class: `dose-fill ${status}`, style: `width:${pct}%` }),
        h('span', { class: 'dose-mark', style: `left:${(300 / scaleMax) * 100}%` }),
        h('span', { class: 'dose-mark', style: `left:${(600 / scaleMax) * 100}%` })),
      h('span', { class: 'dose-num' }, `${fmt(sec)} s`));
  }

  function rowEl(r) {
    const details = h('div', { class: 'dose-details', hidden: true },
      h('p', null, `Gepland per kant: links ${fmt(r.planned.L)} s, rechts ${fmt(r.planned.R)} s.`),
      h('p', null, `Werkelijk (laatste 7 dagen): links ${fmt(r.actual.L)} s, rechts ${fmt(r.actual.R)} s.`));
    const summary = `${r.group.label}: gepland ${fmt(r.plannedSec)} s per kant per week, ${STATUS_TEXT[r.plannedStatus]}; werkelijk ${fmt(r.actualSec)} s, ${STATUS_TEXT[r.actualStatus]}.`;
    const button = h('button', {
      class: 'dose-row', type: 'button', 'aria-expanded': 'false', 'aria-label': `${summary} Tik voor links en rechts apart.`,
      onclick: () => {
        details.hidden = !details.hidden;
        button.setAttribute('aria-expanded', String(!details.hidden));
      },
    },
    h('span', { class: 'dose-name' }, r.group.label, h('small', null, `gepland: ${STATUS_TEXT[r.plannedStatus]}`)),
    bar(r.plannedSec, r.plannedStatus, 'Gepland'),
    bar(r.actualSec, r.actualStatus, 'Werkelijk'),
    r.planned.dyn || r.actual.dyn
      ? h('span', { class: 'dose-dyn', 'aria-hidden': 'true' }, `dynamisch: gepland ${fmt(r.planned.dyn)} s, werkelijk ${fmt(r.actual.dyn)} s`)
      : null);
    return h('li', null, button, details,
      r.suggestion ? h('p', { class: 'dose-suggestion' }, suggestionText(r.suggestion)) : null);
  }

  function render() {
    const { routines, sessions, knee } = getData();
    const now = Date.now();
    const rows = weekRows(lib, { routines, sessions, now, knee });
    const active = routines.filter((r) => r.active !== false);
    fill(root, 
      h('header', { class: 'topbar' }, h('h1', { id: 'week-title', tabindex: '-1' }, 'Mijn week')),
      h('p', { class: 'note' },
        `Seconden statisch of PNF rekken per kant per week. Gepland: ${active.length} actieve ${active.length === 1 ? 'routine' : 'routines'} × keer per week. Werkelijk: je logboek van de laatste 7 dagen. Streepjes bij 300 en 600 s.`),
      maintenanceTipDue(lib, sessions, now) ? h('p', { class: 'warn-bar tip' }, MAINTENANCE_TIP) : null,
      h('div', { class: 'legend dose-legend' },
        ...['oranje', 'groen', 'blauw'].map((st) => h('span', null, h('i', { class: `dose-fill ${st}` }), STATUS_TEXT[st]))),
      ...REGIONS.map((region) => {
        const list = rows.filter((r) => r.group.region === region);
        return [h('h2', { class: 'region-title' }, region), h('ul', { class: 'list dose-list' }, list.map(rowEl))];
      }).flat());
  }

  return { root, render };
}
