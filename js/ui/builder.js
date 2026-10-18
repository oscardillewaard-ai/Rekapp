// Routinebouwer (§6.3). Werkt op een kopie; Opslaan schrijft naar de opslag.
import { h, clear } from './dom.js';
import { icon, starsWithScore, bodyMap, positionIcon } from './graphics.js';
import { rate } from '../library.js';
import { formatDose, formatDuration } from '../format.js';
import { autoTransitionSec } from '../timeline.js';
import { routineDose } from '../dose.js';
import { routineWarnings } from '../warnings.js';
import { access } from '../knee.js';
import {
  newStep, adjustDose, setPnf, setExtraWeakSide, setTransition, moveStep, removeStep, totalSec, MAX_TOTAL_SEC,
} from '../routines.js';

const SLOTS = [['ochtend', 'Ochtend'], ['avond', 'Avond'], ['vrij', 'Vrij']];
const SEVERITY_CLASS = { blokkeert: 'locked-bar', oranje: 'warn-bar', info: 'info-bar' };
const fmt = (n) => new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 }).format(n);

export function createBuilderScreen({ lib, getData, pickExercise, onSave, onDelete, onDuplicate, onStart, onBack }) {
  const root = h('section', { class: 'screen builder' });
  const toolbar = h('div', { class: 'toolbar' });
  const stepSheet = h('dialog', { class: 'sheet', 'aria-labelledby': 'step-title' });
  stepSheet.addEventListener('click', (e) => { if (e.target === stepSheet) stepSheet.close(); });
  const leaveSheet = h('dialog', { class: 'sheet', 'aria-labelledby': 'leave-title' });

  let r = null; // werkkopie
  let saved = ''; // JSON van de opgeslagen versie
  let isNew = false;

  const dirty = () => isNew || JSON.stringify(r) !== saved;
  const ctx = () => getData();

  function change(next, { rerender = true } = {}) {
    r = { ...next, updatedAt: Date.now() };
    if (rerender) render();
  }

  // ---------- Bouwstenen ----------

  function stepper(label, value, onMinus, onPlus, unit = '') {
    return h('div', { class: 'stepper', role: 'group', 'aria-label': label },
      h('span', { class: 'stepper-label' }, label),
      h('button', { class: 'btn icon', type: 'button', 'aria-label': `${label} lager`, onclick: onMinus }, '−'),
      h('output', { 'aria-live': 'polite' }, `${value}${unit}`),
      h('button', { class: 'btn icon', type: 'button', 'aria-label': `${label} hoger`, onclick: onPlus }, '+'));
  }

  function switchEl(label, checked, onChange, hint) {
    const input = h('input', { type: 'checkbox', role: 'switch' });
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));
    return h('label', { class: 'switch' }, h('span', null, label, hint ? h('small', { class: 'hint' }, hint) : null), input);
  }

  function segmented(label, options, value, onChange) {
    return h('fieldset', { class: 'segmented' }, h('legend', null, label),
      h('div', { class: 'chipset' }, options.map(([v, text]) =>
        h('button', { type: 'button', 'aria-pressed': String(v === value), onclick: () => onChange(v) }, text))));
  }

  // ---------- Stap bewerken ----------

  function openStep(index) {
    const step = r.steps[index];
    const ex = lib.exercises.get(step.exerciseId);
    const next = r.steps[index + 1];
    const nextEx = next ? lib.exercises.get(next.exerciseId) : null;
    const update = (s) => { const steps = [...r.steps]; steps[index] = s; change({ ...r, steps }); openStep(index); };

    const dose = [];
    if (step.pnf) {
      dose.push(
        stepper('Rondes per kant', step.pnf.rounds, () => update(setPnf(step, { rounds: step.pnf.rounds - 1 })), () => update(setPnf(step, { rounds: step.pnf.rounds + 1 }))),
        stepper('Aanspannen', step.pnf.contractSec, () => update(setPnf(step, { contractSec: step.pnf.contractSec - 1 })), () => update(setPnf(step, { contractSec: step.pnf.contractSec + 1 })), ' s'),
        stepper('Rekken', step.pnf.stretchSec, () => update(adjustDose(step, -5)), () => update(adjustDose(step, 5)), ' s'));
    } else if (step.perSideSec !== undefined) {
      dose.push(stepper('Seconden per kant', step.perSideSec, () => update(adjustDose(step, -5)), () => update(adjustDose(step, 5)), ' s'));
    } else {
      dose.push(stepper(ex.sided === 'alternating' ? 'Seconden totaal (afwisselend)' : 'Seconden totaal', step.durationSec, () => update(adjustDose(step, -5)), () => update(adjustDose(step, 5)), ' s'));
    }

    const extra = ex.sided === 'unilateral'
      ? segmented('Extra set zwakke kant', [['L', 'Links'], ['R', 'Rechts'], [null, 'Uit']], step.extraWeakSide ?? null, (v) => update(setExtraWeakSide(step, v)))
      : null;

    let transition = null;
    if (nextEx) {
      const auto = autoTransitionSec(ex, nextEx, lib.meta.timing);
      const custom = step.transitionAfterSec !== undefined;
      transition = h('fieldset', { class: 'segmented' },
        h('legend', null, `Overgang naar ${nextEx.name}`),
        h('div', { class: 'chipset' },
          h('button', { type: 'button', 'aria-pressed': String(!custom), onclick: () => update(setTransition(step, null)) }, `Automatisch (${auto} s)`),
          h('button', { type: 'button', 'aria-pressed': String(custom), onclick: () => update(setTransition(step, step.transitionAfterSec ?? auto)) }, 'Eigen tijd')),
        custom ? stepper('Overgang', step.transitionAfterSec, () => update(setTransition(step, step.transitionAfterSec - 5)), () => update(setTransition(step, step.transitionAfterSec + 5)), ' s') : null);
    }

    clear(stepSheet).append(
      h('div', { class: 'sheet-body' },
        h('div', { class: 'sheet-head' },
          h('h2', { id: 'step-title' }, ex.name),
          h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Sluiten', onclick: () => stepSheet.close() }, icon('cross'))),
        h('p', { class: 'note' }, `Standaard: ${formatDose(ex.defaultDose, ex)}. Stappen van 5 s, minimaal 10 s, maximaal 180 s.`),
        ...dose, extra, transition,
        h('div', { class: 'actions' },
          h('button', { class: 'btn', type: 'button', disabled: index === 0, onclick: () => { change(moveStep(r, index, index - 1)); openStep(index - 1); } }, 'Omhoog'),
          h('button', { class: 'btn', type: 'button', disabled: index === r.steps.length - 1, onclick: () => { change(moveStep(r, index, index + 1)); openStep(index + 1); } }, 'Omlaag'),
          h('button', { class: 'btn danger', type: 'button', onclick: () => { stepSheet.close(); change(removeStep(r, index)); } }, 'Verwijderen'))),
      h('div', { class: 'sheet-foot' }, h('button', { class: 'btn primary', type: 'button', onclick: () => stepSheet.close() }, 'Klaar')));
    if (!stepSheet.open) stepSheet.showModal();
  }

  // ---------- Slepen (sleepgreep; met pijltjes ook met het toetsenbord) ----------

  function dragHandle(index, li, name) {
    const handle = h('button', {
      class: 'btn icon drag', type: 'button',
      'aria-label': `Verplaats ${name}. Pijltje omhoog of omlaag.`,
    }, h('span', { class: 'grip', 'aria-hidden': 'true' }, '⋮⋮'));
    handle.addEventListener('keydown', (e) => {
      const to = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : null;
      if (to === null || to < 0 || to >= r.steps.length) return;
      e.preventDefault();
      change(moveStep(r, index, to));
      root.querySelectorAll('.drag')[to]?.focus();
    });
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const items = [...li.parentElement.children];
      const startY = e.clientY;
      let target = index;
      li.classList.add('dragging');
      const onMove = (ev) => {
        li.style.transform = `translateY(${ev.clientY - startY}px)`;
        target = 0;
        items.forEach((other, i) => {
          if (i === index) return;
          const rect = other.getBoundingClientRect();
          if (ev.clientY > rect.top + rect.height / 2) target = i >= index ? i : i + 1;
        });
        target = Math.min(Math.max(target, 0), items.length - 1);
        items.forEach((other, i) => other.classList.toggle('drop-target', i === target && i !== index));
      };
      const onUp = () => {
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        handle.removeEventListener('pointercancel', onUp);
        li.classList.remove('dragging');
        li.style.transform = '';
        items.forEach((other) => other.classList.remove('drop-target'));
        if (target !== index) change(moveStep(r, index, target));
      };
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onUp);
    });
    return handle;
  }

  // ---------- Scherm ----------

  function render() {
    const { settings, knee, routines } = ctx();
    const total = totalSec(r, lib.exercises, lib.meta.timing, settings.sideSwitchSec);
    const over = total > MAX_TOTAL_SEC;
    const others = routines.filter((x) => x.id !== r.id);
    const warnings = routineWarnings(r, { lib, knee, otherRoutines: others, now: Date.now(), sideSwitchSec: settings.sideSwitchSec });
    const nameInput = h('input', { type: 'text', value: r.name, 'aria-label': 'Naam', maxlength: 60, autocomplete: 'off' });
    nameInput.addEventListener('input', () => { change({ ...r, name: nameInput.value }, { rerender: false }); renderToolbar(); });
    nameInput.addEventListener('change', () => { if (!nameInput.value.trim()) change({ ...r, name: 'Nieuwe routine' }); });

    const steps = h('ol', { class: 'list steps' });
    r.steps.forEach((step, i) => {
      const ex = lib.exercises.get(step.exerciseId);
      const gate = access(ex, knee, lib.meta.knee);
      const li = h('li', { class: 'step-row' });
      li.append(
        dragHandle(i, li, ex.name),
        h('button', { class: `row step-main${gate.allowed ? '' : ' locked'}`, type: 'button', onclick: () => openStep(i), 'aria-label': `${ex.name}, ${formatDose(step, ex)}. Tik om te bewerken.` },
          bodyMap(ex.targets, { crop: 'mini', className: 'mini' }) ?? positionIcon(ex.position, 'mini'),
          h('div', { class: 'main' },
            h('div', { class: 'name' }, ex.name),
            h('div', { class: 'meta' }, starsWithScore(rate(ex, lib.meta, settings.weights)),
              h('span', { class: 'chip dose-chip' }, formatDose(step, ex), step.extraWeakSide ? ` + extra ${step.extraWeakSide}` : '')),
          ),
          h('div', { class: 'side' },
            h('span', { class: 'knee-badge' }, h('span', { class: 'sr-only' }, 'Knie maximaal '), `${ex.kneeFlexionMaxDeg}°`),
            gate.allowed ? null : icon('lock', 'lock'))),
        h('button', { class: 'btn icon', type: 'button', 'aria-label': `${ex.name} verwijderen`, onclick: () => change(removeStep(r, i)) }, icon('cross')));
      steps.append(li);
    });

    const dose = routineDose(r, lib.exercises, r.timesPerWeek);
    const doseRows = [...lib.groups.values()].filter((g) => dose.has(g.id)).map((g) => {
      const d = dose.get(g.id);
      const per = (v) => fmt(v / r.timesPerWeek);
      const statik = d.L || d.R ? (d.L === d.R ? `${per(d.L)} s per kant` : `L ${per(d.L)} s, R ${per(d.R)} s`) : null;
      const week = d.L || d.R ? (d.L === d.R ? `${fmt(d.L)} s per week` : `L ${fmt(d.L)} s, R ${fmt(d.R)} s per week`) : null;
      return h('tr', null,
        h('th', { scope: 'row' }, g.label),
        h('td', null, statik ?? '–', d.dyn ? h('small', { class: 'hint' }, `dynamisch ${per(d.dyn)} s`) : null),
        h('td', null, week ?? '–'));
    });

    clear(root).append(
      h('header', { class: 'card-head' }, h('h1', { tabindex: '-1' }, isNew ? 'Nieuwe routine' : 'Routine bewerken')),
      h('section', { class: 'section' },
        h('label', { class: 'field stack' }, h('span', null, 'Naam'), nameInput),
        segmented('Moment', SLOTS, r.slot, (v) => change({ ...r, slot: v })),
        switchEl('Vóór een run', r.preRun, (on) => change({ ...r, preRun: on })),
        stepper('Keer per week', r.timesPerWeek,
          () => change({ ...r, timesPerWeek: Math.max(1, r.timesPerWeek - 1) }),
          () => change({ ...r, timesPerWeek: Math.min(14, r.timesPerWeek + 1) }), '×'),
        switchEl('Actief', r.active, (on) => change({ ...r, active: on }), 'Telt mee in de weekdosis.')),
      h('div', { class: `time-bar${over ? ' over' : ''}`, role: 'group', 'aria-label': `Totale tijd ${formatDuration(total)}${over ? ', langer dan 15 minuten' : ''}` },
        h('span', { class: 'time-label', 'aria-hidden': 'true' }, 'Totale tijd'),
        h('span', { class: 'time-value', 'aria-hidden': 'true' }, formatDuration(total)),
        h('span', { class: 'time-track', 'aria-hidden': 'true' }, h('span', { class: 'time-fill', style: `width:${Math.min(100, (total / MAX_TOTAL_SEC) * 100)}%` })),
        h('span', { class: 'time-max', 'aria-hidden': 'true' }, '15:00')),
      r.steps.length ? steps : h('p', { class: 'note' }, 'Nog geen oefeningen. Voeg er een toe.'),
      h('button', { class: 'btn add-step', type: 'button', onclick: addExercise }, '+ Oefening'),
      warnings.length ? h('section', { class: 'section' }, h('h2', null, 'Waarschuwingen'),
        h('ul', { class: 'plain warnings' }, warnings.map((w) => h('li', { class: SEVERITY_CLASS[w.severity] },
          w.exerciseId ? h('b', null, `${lib.exercises.get(w.exerciseId).name}: `) : null,
          w.group ? h('b', null, `${lib.groups.get(w.group).label}: `) : null,
          w.text)))) : null,
      dose.size ? h('section', { class: 'section' }, h('h2', null, 'Dosis van deze routine'),
        h('p', { class: 'note' }, `Statisch en PNF per sessie, × ${r.timesPerWeek} per week. Bijbetrokken spiergroepen tellen voor 50 %.`),
        h('table', { class: 'dose-table' },
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Spiergroep'), h('th', { scope: 'col' }, 'Per sessie'), h('th', { scope: 'col' }, 'Per week'))),
          h('tbody', null, doseRows))) : null,
      isNew ? null : h('section', { class: 'section actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => onDuplicate(r) }, 'Dupliceren'),
        h('button', { class: 'btn danger', type: 'button', onclick: () => confirmDelete() }, 'Verwijderen')));
    renderToolbar();
  }

  function renderToolbar() {
    clear(toolbar).append(
      h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Terug', onclick: () => leave() }, icon('back')),
      h('button', { class: 'btn', type: 'button', disabled: !dirty(), onclick: () => save() }, 'Opslaan'),
      h('button', { class: 'btn primary', type: 'button', disabled: !r.steps.length, onclick: () => start() }, icon('play'), 'Start'));
  }

  async function addExercise() {
    const ex = await pickExercise();
    if (!ex) return;
    // Een vergrendelde oefening (W1) of tijdens een opvlamming alles boven 45°
    // (W8) kan niet worden toegevoegd; de kiezer laat ze ook niet kiezen.
    if (!access(ex, ctx().knee, lib.meta.knee).allowed) return;
    change({ ...r, steps: [...r.steps, newStep(ex, ctx().settings)] });
    root.querySelector('.steps li:last-child')?.scrollIntoView({ block: 'nearest' });
  }

  async function save() {
    if (!r.name.trim()) r = { ...r, name: 'Nieuwe routine' };
    await onSave(r);
    saved = JSON.stringify(r);
    isNew = false;
    render();
  }

  async function start() {
    if (dirty()) await save();
    onStart(r);
  }

  function confirmDelete() {
    clear(leaveSheet).append(
      h('div', { class: 'sheet-body' }, h('h2', { id: 'leave-title' }, `"${r.name}" verwijderen?`), h('p', null, 'Je logboek blijft bewaard.')),
      h('div', { class: 'sheet-foot' },
        h('button', { class: 'btn', type: 'button', onclick: () => leaveSheet.close() }, 'Annuleren'),
        h('button', { class: 'btn danger', type: 'button', onclick: async () => { leaveSheet.close(); await onDelete(r); } }, 'Verwijderen')));
    leaveSheet.showModal();
  }

  function leave() {
    if (!dirty() || !r.steps.length && isNew) { onBack(); return; }
    clear(leaveSheet).append(
      h('div', { class: 'sheet-body' }, h('h2', { id: 'leave-title' }, 'Wijzigingen opslaan?')),
      h('div', { class: 'sheet-foot' },
        h('button', { class: 'btn', type: 'button', onclick: () => { leaveSheet.close(); onBack(); } }, 'Niet opslaan'),
        h('button', { class: 'btn primary', type: 'button', onclick: async () => { leaveSheet.close(); await save(); onBack(); } }, 'Opslaan')));
    leaveSheet.showModal();
  }

  return {
    root, toolbar, sheets: [stepSheet, leaveSheet],
    open(routine, { fresh = false } = {}) {
      r = structuredClone(routine);
      saved = JSON.stringify(routine);
      isNew = fresh;
      render();
    },
    isDirty: () => r !== null && dirty(),
    leave,
  };
}
