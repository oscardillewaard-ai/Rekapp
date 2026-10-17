import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileRoutine } from '../js/timeline.js';
import { lib, T1 } from './helpers.js';

const compile = (routine, opts = {}) => compileRoutine(routine, lib.exercises, { timing: lib.meta.timing, ...opts });

// §11.1 B. Totale tijd van de sjablonen.
for (const [id, expected] of [['O5', 305], ['O10', 610], ['O15', 900], ['A5', 295], ['A10', 615], ['A15', 885]]) {
  test(`B: sjabloon ${id} duurt ${expected} s`, () => {
    const r = lib.templates.get(id);
    assert.equal(r.expectedTotalSec, expected);
    assert.equal(compile(r).totalSec, expected);
  });
}


test('D: T1 duurt 325 s met automatische overgangen 5, 15 en 15 s', () => {
  const { segments, totalSec } = compile(T1);
  assert.equal(totalSec, 325);
  assert.deepEqual(segments.map((s) => s.durationSec), [5, 45, 5, 45, 5, 30, 5, 30, 15, 60, 15, 30, 5, 30]);
  assert.deepEqual(segments.filter((s) => s.kind === 'transition').map((s) => s.durationSec), [5, 15, 15]);
});

// §11.1 E. Extra set zwakke kant.
test('E: gastroc_muur 45 s/kant met extra set links duurt 150 s', () => {
  const r = { steps: [{ exerciseId: 'gastroc_muur', perSideSec: 45, extraWeakSide: 'L' }] };
  const { segments, totalSec } = compile(r);
  assert.equal(totalSec, 150);
  assert.deepEqual(segments.map((s) => [s.kind, s.side, s.durationSec]), [
    ['prep', null, 5], ['work', 'L', 45], ['switch', null, 5], ['work', 'R', 45], ['switch', null, 5], ['work', 'L', 45],
  ]);
});

test('A5 zonder rf_zijlig duurt 190 s', () => {
  const a5 = lib.templates.get('A5');
  const r = { ...a5, steps: a5.steps.filter((s) => s.exerciseId !== 'rf_zijlig') };
  assert.equal(compile(r).totalSec, 190);
});

test('PNF loopt per kant 2 × (5 s aanspannen + 25 s rekken), met een kantwissel ertussen', () => {
  const r = { steps: [{ exerciseId: 'hamstring_pnf', pnf: { rounds: 2, contractSec: 5, stretchSec: 25 } }] };
  const { segments, totalSec } = compile(r);
  assert.deepEqual(segments.map((s) => [s.kind, s.side, s.durationSec]), [
    ['prep', null, 5],
    ['contract', 'L', 5], ['relax', 'L', 25], ['contract', 'L', 5], ['relax', 'L', 25],
    ['switch', null, 5],
    ['contract', 'R', 5], ['relax', 'R', 25], ['contract', 'R', 5], ['relax', 'R', 25],
  ]);
  assert.equal(totalSec, 130);
});

test('de laatste stap heeft geen overgang; transitionAfterSec gaat voor automatisch', () => {
  const r = { steps: [
    { exerciseId: 'muurslide', durationSec: 40, transitionAfterSec: 0 },
    { exerciseId: 'gastroc_muur', perSideSec: 30, transitionAfterSec: 20 },
  ] };
  const { segments, totalSec } = compile(r);
  assert.deepEqual(segments.filter((s) => s.kind === 'transition').map((s) => s.durationSec), [0]);
  assert.equal(segments[segments.length - 1].kind, 'work');
  assert.equal(totalSec, 5 + 40 + 0 + 30 + 5 + 30);
});

test('automatische overgangen: hoog→hoog 5, laag→laag 10, hoog↔laag 15 (stoel = hoog, vloer = laag)', () => {
  const pair = (a, b) => compile({ steps: [
    { exerciseId: a, ...(lib.exercises.get(a).sided === 'unilateral' ? { perSideSec: 30 } : { durationSec: 30 }) },
    { exerciseId: b, ...(lib.exercises.get(b).sided === 'unilateral' ? { perSideSec: 30 } : { durationSec: 30 }) },
  ] }).segments.find((s) => s.kind === 'transition').durationSec;
  assert.equal(pair('gastroc_muur', 'figuur4_stoel'), 5); // staand → stoel
  assert.equal(pair('spreidzit_muur', 'hamstring_zittend_vouw'), 10); // liggend → vloer
  assert.equal(pair('figuur4_stoel', 'spreidzit_muur'), 15); // stoel → liggend
  assert.equal(pair('hamstring_zittend_vouw', 'gastroc_muur'), 15); // vloer → staand
});

test('de kantwisselduur komt uit de instellingen', () => {
  const r = { steps: [{ exerciseId: 'gastroc_muur', perSideSec: 45 }] };
  assert.equal(compile(r, { sideSwitchSec: 10 }).totalSec, 5 + 45 + 10 + 45);
});

test('afwisselend en bilateraal: één werkblok van durationSec', () => {
  const { segments } = compile({ steps: [{ exerciseId: 'lateraal_shift', durationSec: 60 }] });
  assert.deepEqual(segments.map((s) => [s.kind, s.side, s.durationSec]), [['prep', null, 5], ['work', null, 60]]);
});
