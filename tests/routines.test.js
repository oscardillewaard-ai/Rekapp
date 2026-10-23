import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newRoutine, copyTemplate, duplicateRoutine, newStep, clampSec, adjustDose, setPnf, setExtraWeakSide, setTransition,
  moveStep, removeStep, totalSec, validateUserRoutine, capPnf, pnfSec, PNF_MAX_SEC,
} from '../js/routines.js';
import { routineWarnings } from '../js/warnings.js';
import { emptyKneeState } from '../js/knee.js';
import { lib, ex, at } from './helpers.js';

const T = lib.meta.timing;

test('nieuwe routine volgens het datamodel van §6.3', () => {
  const r = newRoutine({ id: 'r1', now: 1 });
  assert.deepEqual(r, { id: 'r1', name: 'Nieuwe routine', slot: 'vrij', preRun: false, timesPerWeek: 7, active: true, steps: [], createdAt: 1, updatedAt: 1 });
  assert.deepEqual(validateUserRoutine(r, lib.exercises), []);
});

test('sjabloon kopiëren: zelfde stappen en tijd, sjabloon blijft ongewijzigd', () => {
  const tpl = lib.templates.get('A10');
  const before = JSON.stringify(tpl);
  const c = copyTemplate(tpl, { id: 'c1', now: 2 });
  assert.equal(c.fromTemplate, 'A10');
  assert.equal(c.name, 'Avond 10 min (kopie)');
  assert.equal(totalSec(c, lib.exercises, T), 615);
  c.steps[0].perSideSec = 60;
  assert.equal(JSON.stringify(tpl), before);
  assert.deepEqual(validateUserRoutine(c, lib.exercises), []);
  const d = duplicateRoutine(c, { id: 'd1', now: 3 });
  assert.equal(d.id, 'd1');
  assert.equal(d.steps[0].perSideSec, 60);
});

test('nieuwe stap krijgt de standaarddosis uit de bibliotheek', () => {
  assert.deepEqual(newStep(ex('gastroc_muur')), { exerciseId: 'gastroc_muur', perSideSec: 45 });
  assert.deepEqual(newStep(ex('spreidzit_muur')), { exerciseId: 'spreidzit_muur', durationSec: 60 });
  assert.deepEqual(newStep(ex('hamstring_pnf')), { exerciseId: 'hamstring_pnf', pnf: { rounds: 2, contractSec: 5, stretchSec: 25 } });
  assert.deepEqual(newStep(ex('enkel_rock')), { exerciseId: 'enkel_rock', perSideSec: 30, reps: 12 });
  assert.deepEqual(newStep(ex('lateraal_shift')), { exerciseId: 'lateraal_shift', durationSec: 60, reps: 16 });
});

test('standaard statische houdtijd uit de instellingen vervangt alleen de standaard 45 s', () => {
  const opts = { defaultStaticHoldSec: 60 };
  assert.equal(newStep(ex('gastroc_muur'), opts).perSideSec, 60); // statisch, 45 → 60
  assert.equal(newStep(ex('borst_hoek'), opts).durationSec, 60); // bilateraal statisch, 45 → 60
  assert.equal(newStep(ex('nek_trapezius'), opts).perSideSec, 30); // eigen standaard 30 blijft
  assert.equal(newStep(ex('enkel_rock'), opts).perSideSec, 30); // dynamisch blijft
});

test('dosis in stappen van 5 s, minimaal 10, maximaal 180 (§6.3)', () => {
  assert.equal(clampSec(47), 45);
  assert.equal(clampSec(48), 50);
  assert.equal(clampSec(5), 10);
  assert.equal(clampSec(400), 180);
  assert.equal(clampSec('abc'), 10);
  assert.equal(adjustDose({ exerciseId: 'gastroc_muur', perSideSec: 45 }, 5).perSideSec, 50);
  assert.equal(adjustDose({ exerciseId: 'gastroc_muur', perSideSec: 10 }, -5).perSideSec, 10);
  assert.equal(adjustDose({ exerciseId: 'gastroc_muur', perSideSec: 180 }, 5).perSideSec, 180);
  assert.equal(adjustDose({ exerciseId: 'spreidzit_muur', durationSec: 60 }, -5).durationSec, 55);
  const pnf = { exerciseId: 'hamstring_pnf', pnf: { rounds: 2, contractSec: 5, stretchSec: 25 } };
  assert.equal(adjustDose(pnf, 5).pnf.stretchSec, 30);
  assert.deepEqual(setPnf(pnf, { rounds: 9 }).pnf, { rounds: 5, contractSec: 5, stretchSec: 25 });
  assert.deepEqual(setPnf(pnf, { contractSec: 1 }).pnf.contractSec, 3);
});

test('extra set zwakke kant en overgangstijd', () => {
  const s = { exerciseId: 'gastroc_muur', perSideSec: 45 };
  assert.equal(setExtraWeakSide(s, 'L').extraWeakSide, 'L');
  assert.equal('extraWeakSide' in setExtraWeakSide(setExtraWeakSide(s, 'L'), null), false);
  assert.equal(setTransition(s, 12).transitionAfterSec, 12);
  assert.equal(setTransition(s, 99).transitionAfterSec, 30);
  assert.equal('transitionAfterSec' in setTransition(setTransition(s, 12), null), false);
});

test('totale tijd live = som van de gecompileerde timeline (0 s verschil); verplaatsen en verwijderen werken die bij', () => {
  let r = { ...newRoutine({ id: 'r', now: 0 }), steps: [newStep(ex('gastroc_muur')), newStep(ex('spreidzit_muur'))] };
  assert.equal(totalSec(r, lib.exercises, T), 5 + 95 + 15 + 60);
  r = moveStep(r, 1, 0);
  assert.deepEqual(r.steps.map((s) => s.exerciseId), ['spreidzit_muur', 'gastroc_muur']);
  assert.equal(totalSec(r, lib.exercises, T), 5 + 60 + 15 + 95);
  r = removeStep(r, 0);
  assert.equal(totalSec(r, lib.exercises, T), 5 + 95);
  assert.equal(totalSec(removeStep(r, 0), lib.exercises, T), 0);
  assert.equal(moveStep(r, 0, 5), r); // buiten bereik: ongewijzigd
});

test('E: extra set links, 3× per week geeft in de bouwer 150 s', () => {
  const r = { ...newRoutine({ id: 'r', now: 0 }), timesPerWeek: 3, steps: [setExtraWeakSide(newStep(ex('gastroc_muur')), 'L')] };
  assert.equal(totalSec(r, lib.exercises, T), 150);
});

test('W4 boven 15:00 in een eigen routine', () => {
  const r = { ...newRoutine({ id: 'r', now: 0 }), steps: Array.from({ length: 6 }, () => ({ exerciseId: 'gastroc_muur', perSideSec: 75 })) };
  assert.ok(totalSec(r, lib.exercises, T) > 900);
  assert.ok(routineWarnings(r, { lib, knee: emptyKneeState(), otherRoutines: [], now: at(0) }).some((w) => w.code === 'W4'));
});

test('validatie weigert kapotte routines', () => {
  const ok = copyTemplate(lib.templates.get('O5'), { id: 'x', now: 0 });
  const bad = (patch) => validateUserRoutine({ ...ok, ...patch }, lib.exercises);
  assert.ok(bad({ timesPerWeek: 15 }).some((e) => e.field === 'timesPerWeek'));
  assert.ok(bad({ slot: 'middag' }).some((e) => e.field === 'slot'));
  assert.ok(bad({ name: ' ' }).some((e) => e.field === 'name'));
  assert.ok(bad({ steps: [{ exerciseId: 'bestaat_niet', perSideSec: 30 }] }).some((e) => /onbekende oefening/.test(e.message)));
  assert.ok(bad({ steps: [{ exerciseId: 'gastroc_muur', perSideSec: 200 }] }).some((e) => e.field === 'steps[0].perSideSec'));
  assert.ok(bad({ steps: [{ exerciseId: 'gastroc_muur', durationSec: 45 }] }).length > 0); // unilateraal heeft perSideSec nodig
  assert.ok(bad({ steps: [{ exerciseId: 'spreidzit_muur', durationSec: 60, extraWeakSide: 'L' }] }).length > 0);
  assert.ok(bad({ steps: [{ exerciseId: 'hamstring_pnf', pnf: { rounds: 0, contractSec: 5, stretchSec: 25 } }] }).length > 0);
  // M4-review: wat de tijdlijn en de dosis verschillend zouden lezen.
  assert.ok(bad({ steps: [{ exerciseId: 'gastroc_muur', perSideSec: 45, extraWeakSide: 'X' }] }).some((e) => e.field === 'steps[0].extraWeakSide'));
  assert.ok(bad({ steps: [{ exerciseId: 'hamstring_pnf', pnf: { rounds: 2.5, contractSec: 5, stretchSec: 25 } }] }).some((e) => e.field === 'steps[0].pnf'));
  assert.ok(bad({ name: 'x'.repeat(61) }).some((e) => e.field === 'name'));
  assert.deepEqual(bad({ name: 'x'.repeat(60) }), []);
  for (const t of [-1, 31, 2.5]) {
    assert.ok(bad({ steps: [{ exerciseId: 'gastroc_muur', perSideSec: 45, transitionAfterSec: t }] }).some((e) => e.field === 'steps[0].transitionAfterSec'), `overgang ${t}`);
  }
  assert.ok(bad({ preRun: 'ja' }).some((e) => e.field === 'preRun'));
  assert.ok(bad({ active: 1 }).some((e) => e.field === 'active'));
  assert.ok(bad({ id: '' }).some((e) => e.field === 'id'));
});

test('dupliceren: diepe kopie met "(kopie)" en nieuwe tijden; het origineel blijft ongewijzigd', () => {
  const r = copyTemplate(lib.templates.get('A10'), { id: 'a', now: 1 });
  const d = duplicateRoutine(r, { id: 'b', now: 2 });
  assert.equal(d.id, 'b');
  assert.equal(d.name, `${r.name} (kopie)`);
  assert.equal(d.createdAt, 2);
  assert.equal(d.updatedAt, 2);
  assert.deepEqual(validateUserRoutine(d, lib.exercises), []);
  d.steps[0].perSideSec = 999;
  assert.notEqual(r.steps[0].perSideSec, 999);
});

test('PNF-grenzen: rekken 10–60 s in stappen van 5, aanspannen 3–10 s, rondes 1–5', () => {
  const s = newStep(ex('hamstring_pnf'));
  let x = s;
  for (let i = 0; i < 20; i++) x = adjustDose(x, 5);
  assert.equal(x.pnf.stretchSec, 60);
  for (let i = 0; i < 20; i++) x = adjustDose(x, -5);
  assert.equal(x.pnf.stretchSec, 10);
  assert.equal(setPnf(s, { contractSec: 20 }).pnf.contractSec, 10);
  assert.equal(setPnf(s, { contractSec: 1 }).pnf.contractSec, 3);
  assert.equal(setPnf(s, { rounds: 9 }).pnf.rounds, 5);
  assert.equal(setPnf(s, { rounds: 0 }).pnf.rounds, 1);
});

// Keuze Oscar (AFWIJKINGEN.md): PNF hoogstens 180 s per kant.
test('PNF: rondes × (aanspannen + rekken) hoogstens 180 s per kant', () => {
  assert.equal(PNF_MAX_SEC, 180);
  const s = { exerciseId: 'hamstring_pnf', pnf: { rounds: 3, contractSec: 5, stretchSec: 55 } }; // 180 s
  assert.equal(pnfSec(s.pnf), 180);
  // Op de grens: + doet niets meer, − wel.
  assert.deepEqual(adjustDose(s, 5).pnf, s.pnf);
  assert.deepEqual(setPnf(s, { rounds: 4 }).pnf, s.pnf);
  assert.deepEqual(setPnf(s, { contractSec: 6 }).pnf, s.pnf);
  assert.equal(adjustDose(s, -5).pnf.stretchSec, 50);
  // Wat er nog past, komt erbij: 2 × (5 + 60) = 130; 3 × (5 + 60) = 195 → 2 rondes.
  const two = { exerciseId: 'hamstring_pnf', pnf: { rounds: 2, contractSec: 5, stretchSec: 60 } };
  assert.deepEqual(setPnf(two, { rounds: 3 }).pnf, { rounds: 2, contractSec: 5, stretchSec: 60 });
  // Elke combinatie via de knoppen blijft binnen de grens.
  let x = { exerciseId: 'hamstring_pnf', pnf: { rounds: 1, contractSec: 3, stretchSec: 10 } };
  for (let i = 0; i < 30; i++) {
    x = setPnf(adjustDose(setPnf(x, { rounds: x.pnf.rounds + 1 }), 5), { contractSec: x.pnf.contractSec + 1 });
    assert.ok(pnfSec(x.pnf) <= 180, JSON.stringify(x.pnf));
  }
  // De validator weigert meer dan 180 s.
  const r = { id: 'r', name: 'r', slot: 'avond', preRun: false, timesPerWeek: 1, active: true, steps: [{ exerciseId: 'hamstring_pnf', pnf: { rounds: 5, contractSec: 10, stretchSec: 60 } }] };
  assert.ok(validateUserRoutine(r, lib.exercises).some((e) => e.field === 'steps[0].pnf' && /180/.test(e.message)));
  // Een oude routine wordt ingekort (rondes eerst) in plaats van geweigerd.
  const c = capPnf(r);
  assert.equal(c.changed, true);
  assert.deepEqual(c.routine.steps[0].pnf, { rounds: 2, contractSec: 10, stretchSec: 60 });
  assert.deepEqual(validateUserRoutine(c.routine, lib.exercises), []);
  assert.equal(r.steps[0].pnf.rounds, 5); // origineel onaangeroerd
  // Past al, of geen geldige getallen: niets veranderd (de validator meldt dat laatste).
  assert.equal(capPnf(c.routine).changed, false);
  assert.equal(capPnf({ steps: [{ exerciseId: 'hamstring_pnf', pnf: { rounds: 'x', contractSec: 5, stretchSec: 25 } }] }).changed, false);
  assert.equal(capPnf(null).changed, false);
});

test('nieuwe stap blijft binnen 10–180 s, ook met een vreemde standaardhoudtijd', () => {
  assert.equal(newStep(ex('gastroc_muur'), { defaultStaticHoldSec: 500 }).perSideSec, 180);
  assert.equal(newStep(ex('gastroc_muur'), { defaultStaticHoldSec: 1 }).perSideSec, 10);
});
