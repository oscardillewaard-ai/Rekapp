// Routinepreview: oefeningen met dosis en knie, totale tijd, grote Start-knop.
// Wat de knie-poort of de opvlammingsmodus blokkeert (W1, W8) gaat er vóór
// het afspelen uit; dat staat er duidelijk bij.
import { h, clear } from './dom.js';
import { icon, bodyMap, positionIcon, starsWithScore } from './graphics.js';
import { compileRoutine } from '../timeline.js';
import { formatDose, formatDuration } from '../format.js';
import { routineWarnings, playableRoutine, WARNINGS } from '../warnings.js';
import { rate } from '../library.js';

export function createRoutineScreen({ lib, getContext, onStart, onBack }) {
  const root = h('section', { class: 'screen' });
  const toolbar = h('div', { class: 'toolbar' });

  function render(routine) {
    clear(root);
    clear(toolbar).append(h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Terug', onclick: onBack }, icon('back')));
    if (!routine) {
      root.append(h('header', { class: 'topbar' }, h('h1', { tabindex: '-1' }, 'Routine niet gevonden')));
      return;
    }
    const ctx = getContext();
    const { routine: playable, removed } = playableRoutine(routine, { lib, knee: ctx.knee });
    const timing = { timing: lib.meta.timing, sideSwitchSec: ctx.settings.sideSwitchSec };
    const total = playable.steps.length ? compileRoutine(playable, lib.exercises, timing).totalSec : 0;
    const warnings = routineWarnings(routine, { lib, knee: ctx.knee, otherRoutines: [], now: Date.now(), sideSwitchSec: ctx.settings.sideSwitchSec })
      .filter((w) => w.severity === 'oranje');

    root.append(
      h('header', { class: 'card-head' },
        h('h1', { tabindex: '-1' }, routine.name),
        h('p', { class: 'evidence' },
          `${formatDuration(total)} · ${playable.steps.length} ${playable.steps.length === 1 ? 'oefening' : 'oefeningen'}`,
          routine.template ? ' · Sjabloon (alleen-lezen)' : '')));

    if (removed.length) {
      root.append(h('div', { class: 'locked-bar', role: 'note' },
        h('strong', null, icon('lock'), 'Wordt overgeslagen'),
        h('ul', { class: 'plain' }, removed.map((r) => h('li', null,
          h('b', null, lib.exercises.get(r.exerciseId).name), ': ', r.codes.map((c) => WARNINGS[c].text).join(' '))))));
    }
    if (warnings.length) {
      root.append(h('div', { class: 'warn-bar', role: 'note' },
        h('ul', { class: 'plain' }, warnings.map((w) => h('li', null,
          w.exerciseId ? h('b', null, `${lib.exercises.get(w.exerciseId).name}: `) : null, w.text)))));
    }

    root.append(h('ol', { class: 'list steps' }, routine.steps.map((step) => {
      const ex = lib.exercises.get(step.exerciseId);
      const skipped = removed.some((r) => r.exerciseId === ex.id);
      return h('li', null,
        h('a', { class: `row${skipped ? ' locked' : ''}`, href: `#/oefening/${ex.id}` },
          bodyMap(ex.targets, { crop: 'mini', className: 'mini' }) ?? positionIcon(ex.position, 'mini'),
          h('div', { class: 'main' },
            h('div', { class: 'name' }, ex.name),
            h('div', { class: 'meta' }, starsWithScore(rate(ex, lib.meta, ctx.settings.weights)), h('span', null, formatDose(step, ex)))),
          h('div', { class: 'side' },
            h('span', { class: 'knee-badge' }, h('span', { class: 'sr-only' }, 'Knie maximaal '), `${ex.kneeFlexionMaxDeg}°`),
            skipped ? icon('lock', 'lock') : null)));
    })));

    toolbar.append(h('button', {
      class: 'btn primary', type: 'button', disabled: !playable.steps.length,
      onclick: () => onStart(playable, routine),
    }, icon('play'), 'Start'));
  }

  return { root, toolbar, render };
}
