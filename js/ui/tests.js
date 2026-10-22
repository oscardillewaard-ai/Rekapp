// Zelftests (§6.10): overzicht van de acht tests en per test het invoeren van
// drie pogingen per kant, de grafiek met de band voor je meetfout en wat de
// metingen betekenen.
import { h, s, fill, preserveFocus } from './dom.js';
import { icon } from './graphics.js';
import { SELFTEST } from '../texts.js';
import { analyse, parseTrial, mean, round1, TRIALS, SIDES } from '../selftests.js';
import { lineChart } from '../charts.js';

const SIDE_TEXT = { L: 'Links', R: 'Rechts' };
const num = (v) => new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 }).format(v);
const dayFmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' });
const day = (ms) => dayFmt.format(ms);
const signed = (v) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${num(Math.abs(v))}`;

function baselineText(a) {
  const done = SIDES.filter((x) => a.sides[x].baseline).length;
  if (a.error !== null) return `Nulmeting klaar · meetfout ${num(a.error)} ${a.test.unit}`;
  const any = SIDES.some((x) => a.sides[x].points.length);
  if (!any) return 'Nog geen nulmeting';
  return done ? 'Nulmeting: nog één kant op twee opeenvolgende dagen' : 'Nulmeting: meet ook op een volgende dag';
}

// ---------- Overzicht ----------

export function createTestsScreen({ lib, getData }) {
  const root = h('section', { class: 'screen', 'aria-labelledby': 'tests-title' });

  function render() {
    const { tests } = getData();
    const now = Date.now();
    fill(root,
      h('header', { class: 'topbar' }, h('h1', { id: 'tests-title', tabindex: '-1' }, 'Zelftests')),
      h('section', { class: 'section' },
        h('h2', null, 'Zo meet je'),
        h('p', null, h('strong', null, 'Meetprotocol: '), SELFTEST.protocol),
        h('p', null, h('strong', null, 'Nulmeting op twee opeenvolgende dagen. '), SELFTEST.baseline),
        h('p', null, h('strong', null, 'Hertest '), SELFTEST.retest)),
      h('ul', { class: 'list tests-list' }, [...lib.tests.values()].map((test) => {
        const a = analyse(test, tests, now);
        const latest = SIDES.map((x) => (a.sides[x].latest ? `${x} ${num(a.sides[x].latest.mean)}` : null)).filter(Boolean).join(' · ');
        return h('li', null,
          h('a', { class: 'row test-row', href: `#/zelftest/${test.id}` },
            h('div', { class: 'main' },
              h('div', { class: 'name' }, test.name),
              h('div', { class: 'meta' }, latest ? `${latest} ${test.unit}` : test.unit),
              h('div', { class: 'meta' }, baselineText(a))),
            h('div', { class: 'side' },
              a.retest?.due ? h('span', { class: 'chip warn-chip' }, `hertest week ${a.retest.due.week}`) : null,
              a.attention ? h('span', { class: 'chip attention-chip' }, 'aandacht') : null)));
      })));
  }
  return { root, render };
}

// ---------- Eén test ----------

export function createTestScreen({ lib, getData, onSave, onDelete, onBack }) {
  const root = h('section', { class: 'screen test-screen' });
  const toolbar = h('div', { class: 'toolbar' });
  const confirm = h('dialog', { class: 'sheet', 'aria-labelledby': 'test-del-title' });
  confirm.addEventListener('click', (e) => { if (e.target === confirm) confirm.close(); });
  let test = null;
  let inputs = null; // { L: [input×3], R: [...] }
  let message = null;

  function trialInput(side, i, allowNegative) {
    const input = h('input', {
      type: 'text', inputmode: 'decimal', autocomplete: 'off', enterkeyhint: 'next',
      'aria-label': `${SIDE_TEXT[side]}, poging ${i + 1} (${test.unit})`,
    });
    input.addEventListener('input', () => updateMeans());
    if (!allowNegative) return { input, el: input };
    // De numerieke toetsen van iOS hebben geen minteken.
    const sign = h('button', {
      class: 'btn icon sign', type: 'button', 'aria-label': `${SIDE_TEXT[side]}, poging ${i + 1}: plus of min`,
      onclick: () => {
        const v = input.value.trim();
        input.value = v.startsWith('-') || v.startsWith('−') ? v.slice(1) : `-${v}`;
        updateMeans();
        input.focus();
      },
    }, '±');
    return { input, el: h('span', { class: 'trial-with-sign' }, input, sign) };
  }

  const values = (side) => inputs[side].map((x) => parseTrial(x.input.value));
  function sideState(side) {
    const v = values(side);
    const filled = inputs[side].filter((x) => x.input.value.trim() !== '').length;
    const valid = v.every((x) => x !== null);
    return { v, filled, valid };
  }
  const outs = {};
  // Opslaan kan als minstens één kant drie geldige pogingen heeft en geen
  // kant half is ingevuld (die zou anders stil verdwijnen).
  function updateMeans() {
    let ready = false;
    const notNumber = [];
    const incomplete = [];
    for (const side of SIDES) {
      const st = sideState(side);
      const typed = inputs[side].filter((x) => x.input.value.trim() !== '');
      if (typed.some((x) => parseTrial(x.input.value) === null)) notNumber.push(SIDE_TEXT[side]);
      else if (st.filled > 0 && st.filled < TRIALS) incomplete.push(SIDE_TEXT[side]);
      outs[side].textContent = st.valid ? `gemiddeld ${num(round1(mean(st.v)))} ${test.unit}` : '';
      if (st.valid) ready = true;
    }
    save.disabled = !ready || notNumber.length > 0 || incomplete.length > 0;
    hint.textContent = notNumber.length
      ? `Vul getallen in bij ${notNumber.join(' en ').toLowerCase()}, bv. 12 of 12,5.`
      : incomplete.length ? `Vul drie pogingen in bij ${incomplete.join(' en ').toLowerCase()}, of maak die kant leeg.` : '';
  }

  const save = h('button', { class: 'btn primary', type: 'button', disabled: true, onclick: () => doSave() }, 'Opslaan');
  const hint = h('p', { class: 'note', role: 'status' });

  async function doSave() {
    const sides = SIDES.filter((x) => sideState(x).valid);
    if (!sides.length) return;
    save.disabled = true;
    try {
      await onSave(test, sides.map((side) => ({ side, trials: values(side) })));
      message = `Opgeslagen: ${sides.map((x) => SIDE_TEXT[x].toLowerCase()).join(' en ')}.`;
      render(test.id);
    } catch (e) {
      message = `Opslaan is niet gelukt: ${e?.message ?? e}`;
      render(test.id, { keepInput: true });
    }
  }

  function chart(a) {
    const series = SIDES.map((x) => ({ key: x, points: a.sides[x].points.map((p) => ({ x: p.at, y: p.mean })) }));
    const bands = a.threshold === null ? [] : SIDES.filter((x) => a.sides[x].baseline).map((x) => ({
      key: x, lo: a.sides[x].baseline.mean - a.threshold, hi: a.sides[x].baseline.mean + a.threshold,
    }));
    const c = lineChart({ series, bands, width: 340, height: 200 });
    if (!c) return h('p', { class: 'note' }, 'Nog geen metingen.');
    const desc = SIDES.map((x) => {
      const pts = a.sides[x].points;
      return pts.length ? `${SIDE_TEXT[x]}: ${pts.map((p) => `${day(p.at)} ${num(p.mean)}`).join(', ')}` : null;
    }).filter(Boolean).join('. ');
    return h('figure', { class: 'test-chart' },
      s('svg', { viewBox: `0 0 ${c.width} ${c.height}`, role: 'img', 'aria-label': `Grafiek in ${test.unit}. ${desc}` },
        c.bands.map((b) => s('rect', { class: `band band-${b.key}`, x: b.x, y: b.y, width: b.w, height: b.h })),
        c.yTicks.map((t) => [
          s('line', { class: 'grid', x1: c.pad.left, x2: c.width - c.pad.right, y1: t.y, y2: t.y }),
          s('text', { class: 'tick', x: c.pad.left - 6, y: t.y + 4, 'text-anchor': 'end' }, num(t.v)),
        ]),
        s('text', { class: 'tick', x: c.pad.left, y: c.height - 8 }, day(c.xRange[0])),
        s('text', { class: 'tick', x: c.width - c.pad.right, y: c.height - 8, 'text-anchor': 'end' }, day(c.xRange[1])),
        c.lines.map((l) => [
          s('path', { class: `line line-${l.key}`, d: l.path }),
          l.dots.map((d) => s(l.key === 'L' ? 'circle' : 'rect', l.key === 'L'
            ? { class: `dot dot-${l.key}`, cx: d.cx, cy: d.cy, r: 4 }
            : { class: `dot dot-${l.key}`, x: d.cx - 4, y: d.cy - 4, width: 8, height: 8 })),
        ])),
      h('figcaption', { class: 'legend' },
        h('span', null, h('i', { class: 'key key-L', 'aria-hidden': 'true' }), 'Links (rondje)'),
        h('span', null, h('i', { class: 'key key-R', 'aria-hidden': 'true' }), 'Rechts (vierkantje)'),
        bands.length ? h('span', null, h('i', { class: 'key key-band', 'aria-hidden': 'true' }), 'band: nulmeting ± grens') : null));
  }

  function analysis(a) {
    const rows = [];
    if (a.error === null) rows.push(h('p', null, baselineText(a), '.'));
    else {
      rows.push(h('p', null, `Meetfout: ${num(a.error)} ${test.unit}. Een verandering telt als echt boven ${num(a.threshold)} ${test.unit}${test.mdc !== null ? ' (MDC uit de literatuur)' : ' (1,5 × de meetfout)'}.`));
      for (const side of SIDES) {
        const ch = a.sides[side].change;
        if (ch) rows.push(h('p', null, `${SIDE_TEXT[side]}: ${signed(ch.diff)} ${test.unit} sinds de nulmeting, ${ch.real ? 'een echte verandering' : 'binnen de meetfout'}.`));
      }
    }
    if (a.lrDiff !== null) {
      rows.push(h('p', { class: a.attention ? 'warn-bar' : null }, `Verschil links–rechts: ${num(a.lrDiff)} ${test.unit}${a.attention ? '. Groter dan je meetfout: de spiergroepen van deze test staan in de bibliotheek op "aandacht".' : '.'}`));
    }
    if (a.retest) {
      if (a.retest.due) rows.push(h('p', { class: 'warn-bar' }, `Hertest week ${a.retest.due.week} staat open (sinds ${day(a.retest.due.at)}).`));
      if (a.retest.next) rows.push(h('p', { class: 'note' }, `Volgende hertest: week ${a.retest.next.week}, vanaf ${day(a.retest.next.at)}.`));
    }
    return rows;
  }

  function history(measurements) {
    const list = measurements.filter((m) => m.testId === test.id).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    if (!list.length) return null;
    return h('section', { class: 'section' },
      h('h2', null, 'Metingen'),
      h('ul', { class: 'plain test-history' }, list.map((m) => h('li', null,
        h('span', null, `${day(Date.parse(m.date))} ${m.date.slice(11, 16)} · ${SIDE_TEXT[m.side]}: `, h('strong', null, `${num(m.mean)} ${m.unit}`), ` (${m.trials.map(num).join(' · ')})`),
        h('button', { class: 'btn icon', type: 'button', 'aria-label': `Meting ${SIDE_TEXT[m.side].toLowerCase()} van ${day(Date.parse(m.date))} verwijderen`, onclick: () => askDelete(m) }, icon('cross'))))));
  }

  function askDelete(m) {
    fill(confirm,
      h('div', { class: 'sheet-body' }, h('h2', { id: 'test-del-title' }, 'Meting verwijderen?'),
        h('p', null, `${test.name}, ${SIDE_TEXT[m.side].toLowerCase()}, ${day(Date.parse(m.date))}: ${num(m.mean)} ${m.unit}.`)),
      h('div', { class: 'sheet-foot' },
        h('button', { class: 'btn', type: 'button', onclick: () => confirm.close() }, 'Annuleren'),
        h('button', {
          class: 'btn danger', type: 'button',
          onclick: async () => {
            confirm.close();
            try {
              await onDelete(m);
              message = 'Meting verwijderd.';
            } catch (e) {
              message = `Verwijderen is niet gelukt: ${e?.message ?? e}`;
            }
            render(test.id, { keepInput: true });
          },
        }, 'Verwijderen')));
    confirm.showModal();
  }

  function render(id, { keepInput = false } = {}) {
    const kept = keepInput && inputs && test?.id === id ? Object.fromEntries(SIDES.map((x) => [x, inputs[x].map((i) => i.input.value)])) : null;
    test = lib.tests.get(id) ?? null;
    fill(toolbar, h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Terug', onclick: onBack }, icon('back')));
    if (!test) {
      fill(root, h('header', { class: 'topbar' }, h('h1', { tabindex: '-1' }, 'Test niet gevonden')));
      return;
    }
    const { tests } = getData();
    const a = analyse(test, tests, Date.now());
    const allowNegative = test.instructions.some((t) => /negatief/i.test(t));
    inputs = Object.fromEntries(SIDES.map((x) => [x, Array.from({ length: TRIALS }, (_, i) => trialInput(x, i, allowNegative))]));
    if (kept) SIDES.forEach((x) => inputs[x].forEach((i, k) => { i.input.value = kept[x][k]; }));
    for (const x of SIDES) outs[x] = h('output', { class: 'trial-mean' });
    preserveFocus(root, () => fill(root,
      h('header', { class: 'card-head' },
        h('h1', { tabindex: '-1' }, test.name),
        h('p', { class: 'evidence' }, `Eenheid: ${test.unit}${test.mdc !== null ? ` · MDC ${num(test.mdc)} ${test.unit}` : ''}`)),
      message ? h('p', { class: 'info-bar', role: 'status' }, message) : null,
      h('section', { class: 'section' },
        h('h2', null, 'Uitvoering'),
        h('ol', { class: 'cues' }, test.instructions.map((t) => h('li', null, t))),
        h('p', null, h('strong', null, 'Knie: '), test.pfpsNote),
        h('p', { class: 'note' }, h('strong', null, 'Meetprotocol: '), SELFTEST.protocol)),
      h('section', { class: 'section' },
        h('h2', null, 'Nieuwe meting'),
        h('p', { class: 'note' }, `Drie pogingen per kant; het gemiddelde rekent de app uit. Je mag ook één kant invullen.${allowNegative ? ' Gebruik ± voor een negatieve waarde.' : ''}`),
        SIDES.map((x) => h('fieldset', { class: 'trials' },
          h('legend', null, SIDE_TEXT[x]),
          h('div', { class: 'trial-inputs' }, inputs[x].map((i) => i.el)),
          outs[x])),
        hint),
      h('section', { class: 'section' }, h('h2', null, 'Verloop'), chart(a), ...analysis(a)),
      history(tests),
      confirm));
    message = null;
    toolbar.append(save);
    updateMeans();
  }

  return { root, toolbar, render };
}
