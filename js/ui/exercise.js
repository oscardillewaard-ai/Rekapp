// Oefeningkaart (§6.2), van boven naar beneden in de volgorde van de spec.
import { h, clear } from './dom.js';
import { starsWithScore, icon, bodyMap, positionIcon } from './graphics.js';
import { rate } from '../library.js';
import { formatDose, evidenceLabel, SLOT_LABELS, TYPE_LABELS, SIDED_LABELS } from '../format.js';
import { RUBRICS, BREATHING, CARD } from '../texts.js';
import { WARNINGS } from '../warnings.js';

const LETTERS = ['B', 'K', 'D', 'R', 'P'];
const LETTER_NAMES = { B: 'Bewijs', K: 'Knieveiligheid', D: 'Doelgerichtheid', R: 'Relevantie', P: 'Praktisch' };
const cap = (t) => t[0].toUpperCase() + t.slice(1);

function section(title, ...children) {
  return h('section', { class: 'section' }, h('h2', null, title), ...children);
}

function sourceItem(src) {
  if (!src) return null;
  return h('li', null, src.citation, src.url ? [' ', h('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer' }, 'Link')] : null);
}

export function createExerciseScreen({ lib, onBack }) {
  const root = h('section', { class: 'screen' });
  const toolbar = h('div', { class: 'toolbar' });
  const rubricSheet = h('dialog', { class: 'sheet', 'aria-labelledby': 'rubric-title' });
  rubricSheet.addEventListener('click', (e) => { if (e.target === rubricSheet) rubricSheet.close(); });

  function openRubric(letter, ex) {
    const r = RUBRICS[letter];
    const value = ex.scores[letter];
    clear(rubricSheet).append(
      h('div', { class: 'sheet-body' },
        h('div', { class: 'sheet-head' },
          h('h2', { id: 'rubric-title' }, r.title),
          h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Sluiten', onclick: () => rubricSheet.close() }, icon('cross'))),
        r.intro ? h('p', null, cap(r.intro)) : null,
        h('ol', { class: 'rubric', reversed: true },
          [5, 4, 3, 2, 1].map((lvl) => h('li', { class: lvl === value ? 'current' : null, 'aria-current': lvl === value ? 'true' : null },
            h('b', null, String(lvl)), h('span', null, r.levels[lvl])))),
        r.outro ? h('p', { class: 'note' }, r.outro) : null,
        letter === 'B' && ex.bNote ? h('p', null, h('strong', null, 'Bij deze oefening: '), ex.bNote) : null));
    rubricSheet.showModal();
    rubricSheet.querySelector('.current')?.scrollIntoView({ block: 'nearest' });
  }

  function render(id) {
    const ex = lib.exercises.get(id);
    clear(root);
    const back = h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Terug naar de bibliotheek', onclick: onBack }, icon('back'));
    clear(toolbar).append(back);
    if (!ex) {
      root.append(h('header', { class: 'topbar' }, h('h1', null, 'Oefening niet gevonden')),
        h('p', null, `Er is geen oefening met de naam "${id}".`));
      return;
    }

    const rating = rate(ex, lib.meta);
    const primary = ex.targets.filter((t) => t.weight === 1).map((t) => lib.groups.get(t.group));
    const secondary = ex.targets.filter((t) => t.weight !== 1).map((t) => lib.groups.get(t.group));
    const evidence = evidenceLabel(ex.scores.B, lib.meta);

    // 1. Naam, sterren, score, bewijslabel, moment.
    const visual = h('div', { style: 'display:flex;align-items:flex-end;gap:.75rem;float:right;margin-left:.75rem' },
      bodyMap(ex.targets, { crop: 'mini', aspect: 72 / 104, className: 'mini-lg' }),
      positionIcon(ex.position, 'pos-lg'));
    root.append(h('header', { class: 'card-head' },
      visual,
      h('h1', null, ex.name),
      starsWithScore(rating, { large: true }),
      h('p', { class: 'evidence' }, `Bewijs: ${evidence} (B${ex.scores.B}) · Moment: ${SLOT_LABELS[ex.slot]}`),
      h('div', { class: 'chips', style: 'clear:both' },
        h('span', { class: 'chip' }, cap(TYPE_LABELS[ex.type])),
        h('span', { class: 'chip' }, positionIcon(ex.position), cap(ex.position)),
        h('span', { class: 'chip' }, cap(SIDED_LABELS[ex.sided])),
        ...(ex.equipment.length ? ex.equipment.map((e) => h('span', { class: 'chip' }, cap(e))) : [h('span', { class: 'chip' }, 'Geen materiaal')]))));

    // 2. Vijf deelscores; tik toont de rubriek uit §3.1.
    root.append(section('Deelscores',
      h('div', { class: 'scores' }, LETTERS.map((l) =>
        h('button', { class: 'score-bar', type: 'button', 'aria-label': `${LETTER_NAMES[l]}: ${ex.scores[l]} van 5. Tik voor de uitleg.`, onclick: () => openRubric(l, ex) },
          h('span', { class: 'letter', 'aria-hidden': 'true' }, l, h('span', null, LETTER_NAMES[l])),
          h('span', { class: 'track', 'aria-hidden': 'true' }, h('span', { class: 'fill', style: `width:${ex.scores[l] * 20}%` })),
          h('span', { class: 'value', 'aria-hidden': 'true' }, String(ex.scores[l]))))),
      h('p', { class: 'note' }, 'Tik op een balk voor de uitleg van de score.')));

    // 3. Voor- en nadelen, letterlijk uit de data.
    root.append(section('Voor- en nadelen',
      h('ul', { class: 'proscons' },
        ex.pros.map((p) => h('li', { class: 'pro' }, icon('check'), h('span', null, h('span', { class: 'sr-only' }, 'Voordeel: '), p))),
        ex.cons.map((c) => h('li', { class: 'con' }, icon('cross'), h('span', null, h('span', { class: 'sr-only' }, 'Nadeel: '), c))))));

    // 4. Knie, met de rode balk bij een vergrendelde oefening.
    root.append(section('Knie',
      h('dl', null,
        h('dt', null, 'Maximale kniebuiging'), h('dd', null, `${ex.kneeFlexionMaxDeg}°`),
        h('dt', null, 'Kniebelasting'), h('dd', null, ex.kneeLoad)),
      h('p', null, ex.pfpsNote),
      rating.locked ? h('div', { class: 'locked-bar', role: 'note' },
        h('strong', null, icon('lock'), CARD.lockedBar),
        h('button', { class: 'btn danger', type: 'button', disabled: true }, CARD.unlockButton),
        h('p', { class: 'note' }, 'De 48-uurstest komt in een volgende versie.')) : null));

    // 5. Uitvoering.
    root.append(section('Uitvoering',
      h('dl', null, h('dt', null, 'Standaarddosis'), h('dd', null, formatDose(ex.defaultDose, ex))),
      h('ol', { class: 'cues' }, ex.cues.map((c) => h('li', null, c))),
      h('p', null, h('strong', null, 'Ademhaling: '), BREATHING[ex.type]),
      h('p', null, h('strong', null, 'Regressie: '), ex.regression),
      h('p', null, h('strong', null, 'Progressie: '), ex.progression)));

    // 6. Doelspieren op de lichaamskaart.
    root.append(section('Doelspieren',
      bodyMap(ex.targets, { className: 'large' }),
      h('div', { class: 'legend' },
        h('span', null, h('i'), `Primair: ${primary.map((g) => g.label).join(', ')}`),
        secondary.length ? h('span', null, h('i', { class: 'half' }), `Bijbetrokken: ${secondary.map((g) => g.label).join(', ')}`) : null)));

    // 7. Bronnen, uitklapbaar: de oefening plus het groepsbewijs uit §4.
    const group = lib.groups.get(ex.targets[0].group);
    root.append(h('section', { class: 'section' },
      h('details', { class: 'sources' },
        h('summary', null, 'Bronnen'),
        ex.sources.length ? [h('h3', null, 'Bij deze oefening'), h('ul', null, ex.sources.map((k) => sourceItem(lib.sources.get(k))))] : null,
        h('h3', null, `Bewijs voor de spiergroep: ${group.label}`),
        h('p', null, group.evidence),
        group.note ? h('p', null, group.note) : null,
        group.sources.length ? h('ul', null, group.sources.map((k) => sourceItem(lib.sources.get(k)))) : null)));

    // 8. Knoppen, onderaan in de duimzone. Een vergrendelde oefening kan niet
    // worden toegevoegd of afgespeeld (W1).
    const lockIcon = rating.locked ? icon('lock') : null;
    toolbar.append(
      h('button', { class: 'btn wrap', type: 'button', disabled: true }, lockIcon, CARD.addButton),
      h('button', { class: 'btn primary wrap', type: 'button', disabled: true }, rating.locked ? icon('lock') : null, CARD.tryButton));
    root.append(h('p', { class: 'note' }, rating.locked
      ? WARNINGS.W1.text
      : 'Toevoegen aan een routine en afspelen komen in een volgende versie.'));
  }

  return { root, toolbar, sheet: rubricSheet, render };
}
