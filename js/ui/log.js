// Logboek (§6.9): sessies, kniechecks en zelftestmetingen per dag, nieuwste
// eerst, met een filter. Een tik op een sessie toont wat er gedaan is.
import { h, fill, preserveFocus } from './dom.js';
import { icon } from './graphics.js';
import { formatDuration } from '../format.js';

const STATUS = { voltooid: 'voltooid', gedeeltelijk: 'gedeeltelijk', afgebroken: 'afgebroken' };
const CONTEXT = { dagelijks: 'dagelijks', test: 'beginwaarde', '24u': '24-uurscheck', '48u': '48-uurscheck' };
const FILTERS = [['alles', 'Alles'], ['sessies', 'Sessies'], ['kniechecks', 'Kniechecks'], ['metingen', 'Zelftests']];
const PAGE_DAYS = 30;
const DAY = 24 * 3600 * 1000;

const pad = (n) => String(n).padStart(2, '0');
const dayFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const num = (v) => new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 }).format(v);

export function createLogScreen({ lib, getData }) {
  const root = h('section', { class: 'screen', 'aria-labelledby': 'log-title' });
  const detail = h('dialog', { class: 'sheet', 'aria-labelledby': 'log-detail-title' });
  detail.addEventListener('click', (e) => { if (e.target === detail) detail.close(); });
  let filter = 'alles';
  let days = PAGE_DAYS;

  // Alles als { at, day, kind, el } met de lokale dag van het item.
  function items() {
    const { sessions, knee, tests } = getData();
    const out = [];
    const localDay = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
    const time = (ms) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    if (filter === 'alles' || filter === 'sessies') {
      for (const s of sessions) {
        const at = Date.parse(s.startedAt);
        // Datum en tijd zoals vastgelegd (in de tijdzone van dat moment).
        const day = s.startedAt.slice(0, 10);
        const extra = [
          s.stretchIntensity !== null && s.stretchIntensity !== undefined ? `rek ${s.stretchIntensity}/10` : null,
          s.kneePainDuring !== null && s.kneePainDuring !== undefined ? `knie ${s.kneePainDuring}/10` : null,
        ].filter(Boolean).join(' · ');
        out.push({
          at, day, kind: 'sessie',
          el: h('button', { class: 'row log-row', type: 'button', onclick: () => openSession(s) },
            h('div', { class: 'main' },
              h('div', { class: 'name' }, `${s.startedAt.slice(11, 16)} · ${s.routineName}`),
              h('div', { class: 'meta' }, `${STATUS[s.status] ?? s.status} · ${formatDuration(Math.round(s.activeSec))} van ${formatDuration(s.plannedSec)}${extra ? ` · ${extra}` : ''}`))),
        });
      }
    }
    if (filter === 'alles' || filter === 'kniechecks') {
      for (const c of knee.checks) {
        const ex = c.exerciseId ? lib.exercises.get(c.exerciseId)?.name ?? c.exerciseId : null;
        out.push({
          at: c.at, day: localDay(c.at), kind: 'kniecheck',
          el: h('div', { class: 'row log-row' },
            h('div', { class: 'main' },
              h('div', { class: 'name' }, `${time(c.at)} · Kniepijn ${c.pain}/10`),
              h('div', { class: 'meta' }, `Kniecheck (${CONTEXT[c.context] ?? c.context})${ex ? ` · ${ex}` : ''}`))),
        });
      }
    }
    if (filter === 'alles' || filter === 'metingen') {
      for (const m of tests) {
        const test = lib.tests.get(m.testId);
        out.push({
          at: Date.parse(m.date), day: m.date.slice(0, 10), kind: 'meting',
          el: h('a', { class: 'row log-row', href: `#/zelftest/${m.testId}` },
            h('div', { class: 'main' },
              h('div', { class: 'name' }, `${m.date.slice(11, 16)} · ${test?.name ?? m.testId}`),
              h('div', { class: 'meta' }, `${m.side === 'L' ? 'Links' : 'Rechts'}: ${num(m.mean)} ${m.unit} (${m.trials.map(num).join(' · ')})`))),
        });
      }
    }
    return out.sort((a, b) => b.at - a.at);
  }

  function openSession(s) {
    // Per oefening en kant de gedane werktijd.
    const per = new Map();
    for (const seg of s.segmentsDone ?? []) {
      if (!['work', 'contract', 'relax'].includes(seg.kind)) continue;
      const key = seg.exerciseId;
      const e = per.get(key) ?? { L: 0, R: 0, both: 0 };
      if (seg.side === 'L') e.L += seg.sec; else if (seg.side === 'R') e.R += seg.sec; else e.both += seg.sec;
      per.set(key, e);
    }
    fill(detail,
      h('div', { class: 'sheet-body' },
        h('div', { class: 'sheet-head' },
          h('h2', { id: 'log-detail-title' }, s.routineName),
          h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Sluiten', onclick: () => detail.close() }, icon('cross'))),
        h('p', { class: 'note' }, `${dayFmt.format(Date.parse(s.startedAt))}, ${s.startedAt.slice(11, 16)}–${s.endedAt.slice(11, 16)} (${s.tz}) · ${STATUS[s.status] ?? s.status}`),
        h('dl', null,
          h('dt', null, 'Actief'), h('dd', null, `${formatDuration(Math.round(s.activeSec))} van ${formatDuration(s.plannedSec)}`),
          h('dt', null, 'Rekintensiteit'), h('dd', null, s.stretchIntensity ?? '–'),
          h('dt', null, 'Kniepijn tijdens'), h('dd', null, s.kneePainDuring ?? '–')),
        per.size ? h('ul', { class: 'plain log-segments' }, [...per.entries()].map(([id, e]) => h('li', null,
          h('strong', null, lib.exercises.get(id)?.name ?? id), ': ',
          [e.L ? `links ${num(e.L)} s` : null, e.R ? `rechts ${num(e.R)} s` : null, e.both ? `${num(e.both)} s` : null].filter(Boolean).join(', ')))) : h('p', null, 'Geen werktijd.'),
        s.notes ? h('p', null, h('strong', null, 'Notitie: '), s.notes) : null),
      h('div', { class: 'sheet-foot' }, h('button', { class: 'btn primary', type: 'button', onclick: () => detail.close() }, 'Sluiten')));
    detail.showModal();
  }

  function render() {
    preserveFocus(root, renderScreen);
  }

  function renderScreen() {
    const all = items();
    const newest = all[0]?.at ?? Date.now();
    const shown = all.filter((x) => x.at > newest - days * DAY);
    const byDay = new Map();
    for (const x of shown) byDay.set(x.day, [...(byDay.get(x.day) ?? []), x]);
    fill(root,
      h('header', { class: 'topbar' }, h('h1', { id: 'log-title', tabindex: '-1' }, 'Logboek')),
      h('div', { class: 'chipset log-filter', role: 'group', 'aria-label': 'Toon' }, FILTERS.map(([v, text]) =>
        h('button', { type: 'button', 'aria-pressed': String(filter === v), onclick: () => { filter = v; days = PAGE_DAYS; render(); } }, text))),
      all.length ? null : h('p', { class: 'empty' }, 'Nog niets vastgelegd.'),
      ...[...byDay.entries()].flatMap(([day, list]) => {
        const [y, m, d] = day.split('-').map(Number);
        return [h('h2', { class: 'region-title' }, dayFmt.format(new Date(y, m - 1, d))), h('ul', { class: 'list' }, list.map((x) => h('li', null, x.el)))];
      }),
      shown.length < all.length
        ? h('button', { class: 'btn log-more', type: 'button', onclick: () => { days += PAGE_DAYS; render(); } }, 'Oudere tonen')
        : null,
      detail);
  }

  return { root, render };
}
