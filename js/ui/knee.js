// Kniecheck, 48-uurstest en opvlammingsmodus in beeld (§6.6–6.7): de
// pijnkiezer, de kaarten op het startscherm en het ontgrendelscherm. Elke
// overgang loopt via de pure functies in knee.js; opslaan doet main.js.
import { h, fill } from './dom.js';
import { icon } from './graphics.js';
import { KNEE } from '../texts.js';
import { formatMoment, formatDay } from '../format.js';
import {
  unlockState, canStartTest, currentCycle, cycleSchedule, pendingChecks, dailyCheckDue, flareExitDue, flareStreak,
  flareExitPostponedToday, lastExposureAt,
} from '../knee.js';

const HOUR = 3600 * 1000;
const cap = (t) => t[0].toUpperCase() + t.slice(1);
const pain = (v) => (v === null || v === undefined ? '–' : `${v}/10`);
const RESULT_TEXT = { schoon: 'schoon', 'niet schoon': 'niet schoon', vervallen: 'vervallen', opvlamming: 'gestopt door opvlamming' };
let pickers = 0;

// 0–10 als keuzerondjes. Niets is voorgekozen: een pijnscore is altijd een
// bewuste keuze. Pijltjestoetsen werken zoals bij een gewone radiogroep.
export function painPicker(label, { onChange = () => {} } = {}) {
  const id = `pain-${++pickers}`;
  let value = null;
  const buttons = [];
  const select = (v, focus) => {
    value = v;
    buttons.forEach((b, i) => {
      b.setAttribute('aria-checked', String(i === v));
      b.tabIndex = i === v ? 0 : -1;
    });
    if (focus) buttons[v].focus();
    onChange(v);
  };
  for (let i = 0; i <= 10; i++) {
    const b = h('button', { type: 'button', role: 'radio', 'aria-checked': 'false', tabindex: i === 0 ? '0' : '-1', onclick: () => select(i) }, String(i));
    b.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      select(Math.min(10, Math.max(0, (value ?? i) + d)), true);
    });
    buttons.push(b);
  }
  const el = h('div', { class: 'pain-field' },
    h('p', { id, class: 'pain-label' }, label),
    h('div', { class: 'pain-grid', role: 'radiogroup', 'aria-labelledby': id }, buttons),
    h('p', { class: 'hint' }, '0 = geen pijn. Boven 2 is de grens van de knieregels.'));
  return { el, value: () => value };
}

// Kaart met één pijnvraag en Opslaan.
function checkCard({ title, text, label = KNEE.painNow, onSave }) {
  const save = h('button', { class: 'btn primary', type: 'button', disabled: true }, 'Opslaan');
  const picker = painPicker(label, { onChange: () => { save.disabled = false; } });
  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      await onSave(picker.value());
    } finally {
      save.disabled = false;
    }
  });
  return h('section', { class: 'section knee-card' }, h('h2', null, title), text ? h('p', null, text) : null, picker.el, save);
}

// Wat er nu aan de beurt is voor een oefening in de proefperiode.
function nextStepText(rec, now, K) {
  const c = currentCycle(rec);
  if (!c) {
    if (rec.state === 'test') return 'Begeleide proef nog doen.';
    const free = lastExposureAt(rec) + K.exposureSpacingHours * HOUR;
    return free > now
      ? `Volgende keer gebruiken kan vanaf ${formatMoment(free)}.`
      : 'Gebruik de oefening in een routine; daarna volgen de 24- en 48-uurscheck.';
  }
  if (c.painDuring === null) return 'Kniepijn tijdens is niet ingevuld; deze cyclus telt niet mee.';
  const { h24, h48 } = cycleSchedule(c, K);
  if (c.p24 === null) return now < h24[0] ? `24-uurscheck vanaf ${formatMoment(h24[0])}.` : '24-uurscheck nu invullen.';
  return now < h48[0] ? `48-uurscheck vanaf ${formatMoment(h48[0])}.` : '48-uurscheck nu invullen.';
}

// Kaarten bovenaan het startscherm: opvlamming, het voorstel om die te
// beëindigen, de dagelijkse kniecheck, de 24/48-uurschecks en de oefeningen
// in de proefperiode. actions: { check(context, pain, exerciseId), endFlare(),
// postponeFlareExit() }.
export function kneeCards({ lib, knee, now, actions }) {
  const K = lib.meta.knee;
  const name = (id) => lib.exercises.get(id)?.name ?? id;
  const out = [];
  if (knee.unknown) return out; // de melding staat al bovenaan de app

  if (knee.flare.active) {
    const streak = Math.min(flareStreak(knee, now, K), K.flareExitDays);
    out.push(h('section', { class: 'section flare-banner', 'aria-labelledby': 'flare-title' },
      h('h2', { id: 'flare-title' }, icon('knee'), 'Opvlammingsmodus'),
      h('p', null, `Aan sinds ${formatDay(knee.flare.since)}. Alles boven ${K.flareMaxDeg}° kniebuiging staat uit; oefeningen in de proefperiode of vrijgegeven zijn weer vergrendeld.`),
      h('p', null, `Uit na ${K.flareExitDays} dagen op rij een dagelijkse kniecheck van ≤${K.painMax}/10. Nu: ${streak} van ${K.flareExitDays}. Dagen zonder check tellen niet.`),
      h('p', { class: 'note' }, 'Voorgesteld:'),
      h('div', { class: 'actions' }, ['O5', 'A5'].map((id) => h('a', { class: 'btn', href: `#/routine/${id}` }, lib.templates.get(id).name)))));
    if (flareExitDue(knee, now, K) && !flareExitPostponedToday(knee, now)) {
      out.push(h('section', { class: 'section knee-card', 'aria-labelledby': 'flare-exit-title' },
        h('h2', { id: 'flare-exit-title' }, 'Opvlamming voorbij?'),
        h('p', null, `Je dagelijkse kniecheck was ${K.flareExitDays} dagen op rij ≤${K.painMax}/10. Wil je de opvlammingsmodus beëindigen? Vergrendelde oefeningen blijven vergrendeld tot je ze opnieuw test.`),
        h('div', { class: 'actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => actions.postponeFlareExit() }, 'Nog niet'),
          h('button', { class: 'btn primary', type: 'button', onclick: () => actions.endFlare() }, 'Beëindigen'))));
    }
  }

  if (dailyCheckDue(knee, now)) {
    out.push(checkCard({ title: 'Kniecheck van vandaag', onSave: (p) => actions.check('dagelijks', p) }));
  }

  for (const c of pendingChecks(knee, now, K)) {
    const w = cycleSchedule({ exposureAt: c.exposureAt }, K)[c.context === '24u' ? 'h24' : 'h48'];
    out.push(checkCard({
      title: `${c.context === '24u' ? '24' : '48'}-uurscheck: ${name(c.exerciseId)}`,
      text: `Na je blootstelling van ${formatMoment(c.exposureAt)}. In te vullen tot ${formatMoment(w[1])}; daarna vervalt de cyclus.`,
      onSave: (p) => actions.check(c.context, p, c.exerciseId),
    }));
  }

  const trials = Object.entries(knee.unlocks).filter(([, r]) => r.state === 'test' || r.state === 'voorlopig');
  if (trials.length) {
    out.push(h('section', { class: 'section' },
      h('h2', null, 'Proefperiode'),
      h('ul', { class: 'list' }, trials.map(([id, rec]) => h('li', null,
        h('a', { class: 'row routine-row', href: `#/ontgrendelen/${id}` },
          h('div', { class: 'main' },
            h('div', { class: 'name' }, name(id)),
            h('div', { class: 'meta' }, `${cap(rec.state)} · ${rec.cleanCount} van ${K.cleanCyclesToUnlock} schone cycli`),
            h('div', { class: 'meta' }, nextStepText(rec, now, K)))))))));
  }
  return out;
}

// Ontgrendelscherm (§6.6) voor één vergrendelde oefening. actions:
// { startTest(ex, confirmations), cancelTest(ex), startTrial(ex, painBefore),
// check(context, pain, exerciseId) }.
export function createUnlockScreen({ lib, getKnee, actions, onBack }) {
  const root = h('section', { class: 'screen unlock' });
  const toolbar = h('div', { class: 'toolbar' });
  const K = lib.meta.knee;
  let currentId = null;

  function dl(rows) {
    return h('dl', null, rows.filter(Boolean).flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)]));
  }

  function windowText(value, [from, to], now) {
    if (value !== null) return pain(value);
    if (now < from) return `vanaf ${formatMoment(from)}`;
    if (now <= to) return `nu, tot ${formatMoment(to)}`;
    return 'niet ingevuld';
  }

  function render(id) {
    currentId = id;
    const now = Date.now();
    const knee = getKnee();
    const ex = lib.exercises.get(id);
    const back = h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Terug', onclick: onBack }, icon('back'));
    fill(toolbar, back);
    if (!ex || !ex.locked) {
      fill(root,
        h('header', { class: 'topbar' }, h('h1', { tabindex: '-1' }, 'Geen vergrendelde oefening')),
        h('p', null, 'Het ontgrendelprotocol geldt alleen voor de vergrendelde oefeningen (K ≤ 2).'));
      return;
    }
    const rec = knee.unlocks[id] ?? { state: 'vergrendeld', cleanCount: 0, cooldownUntil: null, cycles: [] };
    const st = unlockState(ex, knee);
    const cycle = currentCycle(rec);
    const parts = [];

    parts.push(h('header', { class: 'card-head' },
      h('h1', { tabindex: '-1' }, ex.name),
      h('p', { class: 'evidence' }, `Status: ${st} · ${rec.cleanCount} van ${K.cleanCyclesToUnlock} schone cycli`),
      h('ol', { class: 'status-steps', 'aria-label': 'Stappen' }, ['vergrendeld', 'test', 'voorlopig', 'vrij'].map((s) =>
        h('li', { class: s === st ? 'current' : null, 'aria-current': s === st ? 'step' : null }, s)))));
    parts.push(h('section', { class: 'section' }, h('h2', null, '48-uurstest'), h('p', null, KNEE.intro)));

    if (knee.unknown) {
      parts.push(h('p', { class: 'warn-bar' }, 'Je kniestatus kon niet worden gelezen. Het protocol staat stil tot de opslag weer werkt.'));
      fill(root, ...parts);
      return;
    }

    if (st === 'vergrendeld') {
      const blockers = canStartTest(ex, knee, now, { pain7d: true, noLegTrainingToday: true, noHeavyNext48h: true }).reasons;
      if (blockers.length) {
        parts.push(h('div', { class: 'locked-bar', role: 'note' },
          h('strong', null, icon('lock'), 'Nu niet mogelijk'),
          h('ul', { class: 'plain' }, blockers.map((r) => h('li', null, r)))));
      } else {
        const confirm = { pain7d: false, noLegTrainingToday: false, noHeavyNext48h: false };
        const start = h('button', { class: 'btn primary', type: 'button', disabled: true, onclick: () => actions.startTest(ex, { ...confirm }) }, 'Start de 48-uurstest');
        const sw = (key) => {
          const input = h('input', { type: 'checkbox', role: 'switch' });
          input.addEventListener('change', () => {
            confirm[key] = input.checked;
            start.disabled = !Object.values(confirm).every(Boolean);
          });
          return h('label', { class: 'switch' }, h('span', null, cap(KNEE[key])), input);
        };
        parts.push(h('section', { class: 'section' },
          h('h2', null, 'Bevestig'),
          sw('pain7d'), sw('noLegTrainingToday'), sw('noHeavyNext48h')));
        toolbar.append(start);
      }
    }

    if (st === 'test' && !cycle) {
      const startTrial = h('button', { class: 'btn primary', type: 'button', disabled: true }, icon('play'), 'Start de proef');
      const tooHigh = h('p', { class: 'warn-bar', role: 'alert', hidden: true }, `Boven ${K.painMax}/10: de proef start niet. Probeer het op een andere dag.`);
      const picker = painPicker(`${KNEE.painNow}: je beginwaarde`, {
        onChange: (v) => {
          tooHigh.hidden = v <= K.painMax;
          startTrial.disabled = v > K.painMax;
        },
      });
      startTrial.addEventListener('click', () => actions.startTrial(ex, picker.value()));
      parts.push(h('section', { class: 'section' },
        h('h2', null, 'Begeleide proef'),
        h('p', null, KNEE.trial),
        h('p', { class: 'note' }, 'Direct na de proef vraagt de app je kniepijn tijdens. Daarna volgen de 24- en 48-uurscheck op het startscherm.'),
        picker.el, tooHigh,
        h('button', { class: 'btn', type: 'button', onclick: () => actions.cancelTest(ex) }, 'Proef annuleren')));
      toolbar.append(startTrial);
    }

    if (cycle) {
      const { h24, h48 } = cycleSchedule(cycle, K);
      parts.push(h('section', { class: 'section' },
        h('h2', null, 'Lopende cyclus'),
        dl([
          ['Blootstelling', formatMoment(cycle.exposureAt)],
          ['Beginwaarde', pain(cycle.painBefore)],
          ['Kniepijn tijdens', cycle.painDuring === null ? 'niet ingevuld: deze cyclus telt niet mee' : pain(cycle.painDuring)],
          ['24-uurscheck', windowText(cycle.p24, h24, now)],
          ['48-uurscheck', windowText(cycle.p48, h48, now)],
        ])));
      for (const c of pendingChecks(knee, now, K).filter((x) => x.exerciseId === id)) {
        parts.push(checkCard({ title: `${c.context === '24u' ? '24' : '48'}-uurscheck`, onSave: (p) => actions.check(c.context, p, id) }));
      }
    } else if (st === 'voorlopig') {
      parts.push(h('section', { class: 'section' }, h('h2', null, 'Volgende stap'), h('p', null, nextStepText(rec, now, K))));
    }

    if (st === 'vrij') {
      parts.push(h('section', { class: 'section' }, h('h2', null, 'Vrijgegeven'),
        h('p', null, `Na ${K.cleanCyclesToUnlock} schone cycli op rij. Je kunt de oefening in routines gebruiken. Bij een opvlamming wordt hij weer vergrendeld.`)));
    }

    const done = rec.cycles.filter((c) => c.result !== null);
    if (done.length) {
      parts.push(h('section', { class: 'section' },
        h('h2', null, 'Eerdere cycli'),
        h('ul', { class: 'plain history' }, done.slice().reverse().map((c) => h('li', null,
          h('strong', null, `${formatMoment(c.exposureAt)}: ${RESULT_TEXT[c.result] ?? c.result}`),
          h('span', null, ` · voor ${pain(c.painBefore)}, tijdens ${pain(c.painDuring)}, 24 u ${pain(c.p24)}, 48 u ${pain(c.p48)}`))))));
    }
    fill(root, ...parts);
  }

  return { root, toolbar, render, currentId: () => currentId };
}
