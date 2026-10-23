// Kniecheck en opvlammingsmodus in beeld (§6.7): de pijnkiezer en de kaarten
// op het startscherm. Elke overgang loopt via de pure functies in knee.js;
// opslaan doet main.js. Het knieslot met de 48-uurstest is verwijderd
// (AFWIJKINGEN.md).
import { h } from './dom.js';
import { icon } from './graphics.js';
import { KNEE } from '../texts.js';
import { formatDay, formatMoment } from '../format.js';
import { dailyCheckDue, flareExitDue, flareStreak, flareExitPostponedToday, canUndoFlare, UNDO_FLARE_HOURS } from '../knee.js';

const HOUR = 3600 * 1000;
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
  // Geen primaire knop: een kaart staat bovenaan, en primaire knoppen horen
  // in het onderste derde (§8.3).
  const save = h('button', { class: 'btn card-save', type: 'button', disabled: true }, 'Opslaan');
  const picker = painPicker(label, { onChange: () => { save.disabled = false; } });
  // Tijdens het opslaan niet uitschakelen (dan verliest de knop de focus en
  // weet de app niet meer waar je was), maar een tweede tik negeren.
  let busy = false;
  save.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    save.setAttribute('aria-busy', 'true');
    try {
      await onSave(picker.value());
    } finally {
      busy = false;
      save.removeAttribute('aria-busy');
    }
  });
  return h('section', { class: 'section knee-card' }, h('h2', null, title), text ? h('p', null, text) : null, picker.el, save);
}

// Kaarten bovenaan het startscherm: opvlamming (met terugdraaien als hij net
// aan staat), het voorstel om die te beëindigen en de dagelijkse kniecheck.
// actions: { check(context, pain), endFlare(), postponeFlareExit(),
// undoFlare() }.
export function kneeCards({ lib, knee, now, actions }) {
  const K = lib.meta.knee;
  const out = [];
  if (knee.unknown) return out; // de melding staat al bovenaan de app

  if (knee.flare.active) {
    const streak = Math.min(flareStreak(knee, now, K), K.flareExitDays);
    const undo = canUndoFlare(knee, now);
    out.push(h('section', { class: 'section flare-banner', 'aria-labelledby': 'flare-title' },
      h('h2', { id: 'flare-title' }, icon('knee'), 'Opvlammingsmodus'),
      h('p', null, `Aan sinds ${formatDay(knee.flare.since)}. Alles boven ${K.flareMaxDeg}° kniebuiging staat uit.`),
      h('p', null, `Uit na ${K.flareExitDays} dagen op rij een dagelijkse kniecheck van ≤${K.painMax}/10. Nu: ${streak} van ${K.flareExitDays}. Dagen zonder check tellen niet.`),
      h('p', { class: 'note' }, 'Voorgesteld:'),
      h('div', { class: 'actions' }, ['O5', 'A5'].map((id) => h('a', { class: 'btn', href: `#/routine/${id}` }, lib.templates.get(id).name))),
      undo ? h('p', { class: 'note' }, `Per ongeluk aangezet? Terugdraaien kan tot ${formatMoment(knee.flare.since + UNDO_FLARE_HOURS * HOUR)}.`) : null,
      undo ? h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onclick: () => actions.undoFlare() }, 'Terugdraaien')) : null));
    if (flareExitDue(knee, now, K) && !flareExitPostponedToday(knee, now)) {
      out.push(h('section', { class: 'section knee-card', 'aria-labelledby': 'flare-exit-title' },
        h('h2', { id: 'flare-exit-title' }, 'Opvlamming voorbij?'),
        h('p', null, `Je dagelijkse kniecheck was ${K.flareExitDays} dagen op rij ≤${K.painMax}/10. Wil je de opvlammingsmodus beëindigen?`),
        h('div', { class: 'actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => actions.postponeFlareExit() }, 'Nog niet'),
          h('button', { class: 'btn card-save', type: 'button', onclick: () => actions.endFlare() }, 'Beëindigen'))));
    }
  }

  if (dailyCheckDue(knee, now)) {
    out.push(checkCard({ title: 'Kniecheck van vandaag', onSave: (p) => actions.check('dagelijks', p) }));
  }
  return out;
}
