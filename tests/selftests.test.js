import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newMeasurement, parseTrial, series, baseline, analyse, retestDates, retestStatus, attentionGroups, MIN_ERROR } from '../js/selftests.js';
import { lineChart, niceTicks } from '../js/charts.js';
import { isoWithOffset } from '../js/session.js';
import { lib, at, DAY } from './helpers.js';

const T = (id) => lib.tests.get(id);
let n = 0;
const m = (testId, side, day, trials, hour = 20) => newMeasurement({ id: `m${++n}`, date: isoWithOffset(at(day, hour)), test: T(testId), side, trials });

test('de bibliotheek heeft acht zelftests, met de rugkraktest erbij', () => {
  assert.equal(lib.tests.size, 8);
  assert.ok(lib.tests.has('rugkrab'));
});

test('drie pogingen per kant, gemiddelde automatisch; invoer met komma en negatief', () => {
  const x = m('aslr', 'L', 0, [70, 72, 73]);
  assert.equal(x.mean, 71.7);
  assert.equal(x.unit, 'graden');
  assert.equal(parseTrial('3,5'), 3.5);
  assert.equal(parseTrial('-2'), -2);
  assert.equal(parseTrial('−2'), -2);
  assert.equal(parseTrial('abc'), null);
  assert.equal(parseTrial(''), null);
});

test('nulmeting op twee opeenvolgende dagen: het verschil is de meetfout', () => {
  const ms = [m('aslr', 'L', 0, [70, 70, 70]), m('aslr', 'L', 1, [72, 72, 72])];
  const b = baseline(series(ms, 'aslr', 'L'));
  assert.deepEqual(b.days, ['2026-11-02', '2026-11-03']);
  assert.equal(b.mean, 71);
  assert.equal(b.error, 2);
  // Niet opeenvolgend: geen nulmeting; dag 3 en 4 wel.
  const gap = [m('aslr', 'L', 0, [70, 70, 70]), m('aslr', 'L', 2, [71, 71, 71]), m('aslr', 'L', 3, [73, 73, 73])];
  assert.deepEqual(baseline(series(gap, 'aslr', 'L')).days, ['2026-11-04', '2026-11-05']);
});

test('echte verandering: meer dan 1,5 × de meetfout; meetfout van de test = grootste kant, minimaal 1', () => {
  const ms = [
    m('aslr', 'L', 0, [70, 70, 70]), m('aslr', 'L', 1, [72, 72, 72]),
    m('aslr', 'R', 0, [70, 70, 70]), m('aslr', 'R', 1, [70, 70, 70]),
    m('aslr', 'L', 28, [74, 74, 74]), m('aslr', 'R', 28, [74, 74, 74]),
  ];
  const a = analyse(T('aslr'), ms, at(28, 21));
  assert.equal(a.error, 2);
  assert.equal(a.threshold, 3);
  assert.deepEqual(a.sides.L.change, { diff: 3, real: false }); // 74 − 71 = 3, niet > 3
  assert.deepEqual(a.sides.R.change, { diff: 4, real: true }); // 74 − 70 = 4
  // Twee gelijke nulmetingen: ondergrens 1.
  const same = [m('aslr', 'L', 0, [70, 70, 70]), m('aslr', 'L', 1, [70, 70, 70]), m('aslr', 'R', 0, [70, 70, 70]), m('aslr', 'R', 1, [70, 70, 70])];
  assert.equal(analyse(T('aslr'), same, at(2)).error, MIN_ERROR);
});

test('met een MDC uit de literatuur telt die als grens (knie-tot-muur: 1,9 cm)', () => {
  const ms = [
    m('knie_tot_muur', 'L', 0, [10, 10, 10]), m('knie_tot_muur', 'L', 1, [10, 10, 10]),
    m('knie_tot_muur', 'R', 0, [10, 10, 10]), m('knie_tot_muur', 'R', 1, [10, 10, 10]),
    m('knie_tot_muur', 'L', 30, [12, 12, 12]),
  ];
  const a = analyse(T('knie_tot_muur'), ms, at(30, 21));
  assert.equal(a.threshold, 1.9);
  assert.equal(a.sides.L.change.real, true);
});

test('aandacht: verschil links–rechts groter dan de meetfout markeert de spiergroepen van die test', () => {
  const ms = [
    m('aslr', 'L', 0, [70, 70, 70]), m('aslr', 'L', 1, [71, 71, 71]),
    m('aslr', 'R', 0, [60, 60, 60]), m('aslr', 'R', 1, [61, 61, 61]),
  ];
  const groups = attentionGroups([...lib.tests.values()], ms, at(2));
  assert.deepEqual([...groups.keys()], ['hamstrings']);
  // Zonder nulmeting (meetfout onbekend) nog geen markering.
  assert.equal(attentionGroups([...lib.tests.values()], ms.filter((x) => x.date.startsWith('2026-11-02')), at(2)).size, 0);
});

test('hertest in week 4, 8 en 12, daarna elke 8 weken', () => {
  const start = at(0);
  assert.deepEqual(retestDates(start, start + 30 * 7 * DAY).map((d) => d.week), [4, 8, 12, 20, 28, 36]);
  // In week 5 zonder meting na week 4: hertest open.
  const s = retestStatus(start, start + DAY, start + 5 * 7 * DAY);
  assert.equal(s.due.week, 4);
  assert.equal(s.next.week, 8);
  // Gemeten 2 dagen vóór week 4: telt mee.
  assert.equal(retestStatus(start, start + 4 * 7 * DAY - 2 * DAY, start + 5 * 7 * DAY).due, null);
});

test('lijngrafiek: punten binnen het vlak, band rond de nulmeting, ronde asverdeling', () => {
  const c = lineChart({
    series: [{ key: 'L', points: [{ x: at(0), y: 70 }, { x: at(28), y: 74 }] }],
    bands: [{ key: 'L', lo: 68, hi: 73 }],
  });
  for (const d of c.lines[0].dots) {
    assert.ok(d.cx >= c.pad.left && d.cx <= c.width - c.pad.right);
    assert.ok(d.cy >= c.pad.top && d.cy <= c.height - c.pad.bottom);
  }
  assert.ok(c.bands[0].h > 0);
  assert.deepEqual(niceTicks(0, 10, 4), [0, 5, 10]);
  assert.equal(lineChart({ series: [{ key: 'L', points: [] }] }), null);
});
