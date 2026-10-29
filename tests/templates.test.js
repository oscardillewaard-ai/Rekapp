// Ontwerpregels voor de sjablonen opwarmen, cooling-down, lenigheid en
// training (§6.3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routineWarnings } from '../js/warnings.js';
import { emptyKneeState } from '../js/knee.js';
import { validateLibrary } from '../js/library.js';
import { compileRoutine } from '../js/timeline.js';
import { isTraining } from '../js/types.js';
import { lib, rawLibrary, schema } from './helpers.js';

const ofKind = (kind) => [...lib.templates.values()].filter((r) => r.kind === kind);
const ctx = { lib, knee: emptyKneeState(), otherRoutines: [], now: 0 };
const codes = (r) => routineWarnings({ ...r, active: true }, ctx).map((w) => w.code);

test('opwarmen en cooling-down: alleen staand of op een stoel, dus zonder mat te doen', () => {
  for (const r of [...ofKind('opwarmen'), ...ofKind('cooldown')]) {
    for (const s of r.steps) assert.ok(['staand', 'stoel'].includes(lib.exercises.get(s.exerciseId).position), `${r.id}: ${s.exerciseId}`);
  }
});

test('opwarmen: vooral dynamisch, statisch hooguit 30 s per kant, en geen W3 vóór een run', () => {
  for (const r of ofKind('opwarmen')) {
    for (const s of r.steps) {
      const ex = lib.exercises.get(s.exerciseId);
      if (ex.type === 'static') assert.ok((s.perSideSec ?? s.durationSec) <= 30, `${r.id}: ${ex.id}`);
      assert.notEqual(ex.type, 'pnf', `${r.id}: ${ex.id}`);
    }
    assert.ok(!codes(r).includes('W3'), r.id);
  }
  assert.equal(lib.templates.get('OW-LOOP').preRun, true);
});

test('lenigheid: elke hoofdgroep 300–600 s per kant per week (geen W5 of W6), binnen 15 minuten', () => {
  for (const r of ofKind('lenigheid')) {
    const c = codes(r);
    assert.ok(!c.includes('W5') && !c.includes('W6') && !c.includes('W4'), `${r.id}: ${c.join(',')}`);
    assert.ok(r.timesPerWeek >= 5, r.id);
  }
});

test('elk sjabloon: geen blokkade zonder opvlamming en hooguit 15 minuten rekken (W4)', () => {
  for (const r of lib.templates.values()) {
    const c = codes(r);
    assert.ok(!c.includes('W1') && !c.includes('W8') && !c.includes('W4'), `${r.id}: ${c.join(',')}`);
  }
});

test('tegels: elk sjabloon staat in precies één tegel; sporten hebben opwarmen en cooling-down', async () => {
  const { templateTiles } = await import('../js/routines.js');
  const tiles = templateTiles(lib.templates.values());
  assert.deepEqual(tiles.map((t) => t.key), ['ochtend', 'avond', 'hardlopen', 'klimmen', 'kracht', 'wandelen', 'lenigheid', 'heupen', 'enkels']);
  assert.deepEqual(tiles.slice(-2).map((t) => [t.name, t.icon, t.templates.map((r) => r.id)]), [['Heupkracht', 'sideplank', ['TR-HEUP']], ['Enkelstabiliteit', 'balance', ['TR-ENKEL']]]);
  const ids = tiles.flatMap((t) => t.templates.map((r) => r.id));
  assert.deepEqual([...ids].sort(), [...lib.templates.keys()].sort());
  assert.deepEqual(tiles.find((t) => t.key === 'ochtend').templates.map((r) => r.id), ['O5', 'O10', 'O15']);
  for (const key of ['hardlopen', 'klimmen', 'kracht', 'wandelen']) {
    assert.deepEqual(tiles.find((t) => t.key === key).templates.map((r) => r.kind), ['opwarmen', 'cooldown'], key);
  }
});

test('training: Heupkracht met de zes heupoefeningen in 3 sets, 3× per week', () => {
  const r = lib.templates.get('TR-HEUP');
  assert.deepEqual([r.kind, r.focus, r.timesPerWeek, r.slot], ['training', 'heupen', 3, 'vrij']);
  assert.deepEqual(r.steps.map((s) => s.exerciseId), ['heup_abductie_zij', 'zijsteun', 'bridge_eenbenig', 'abductie_band', 'rdl_eenbenig', 'squat_eenbenig']);
  assert.ok(r.steps.every((s) => s.sets === 3 && s.restSec >= 30));
  assert.equal(r.expectedTotalSec, 1970); // 32:50
});

test('training: Enkelstabiliteit met de acht oefeningen uit de video, in die volgorde, ±18 minuten', () => {
  const r = lib.templates.get('TR-ENKEL');
  assert.deepEqual([r.kind, r.focus, r.timesPerWeek], ['training', 'enkels', 1]);
  assert.deepEqual(r.steps.map((s) => s.exerciseId), ['runners_touch', 'bosu_reach', 'stepup_balans', 'bulgarian_bosu', 'rdl_rotatie', 'band_inuit', 'drop_landing', 'pogo_eenbenig']);
  assert.equal(r.expectedTotalSec, 1060); // 17:40
  assert.ok(Math.abs(r.expectedTotalSec / 60 - 18) < 1);
  // Elke stap gebruikt de standaarddosis uit de bibliotheek.
  for (const s of r.steps) {
    const { exerciseId, transitionAfterSec, ...dose } = s;
    assert.deepEqual(dose, lib.exercises.get(exerciseId).defaultDose, exerciseId);
  }
});

test('training: alleen trainingsoefeningen van die focus, geen rekdosis en geen W4–W7', () => {
  for (const r of ofKind('training')) {
    assert.ok(r.steps.every((s) => isTraining(lib.exercises.get(s.exerciseId)) && lib.exercises.get(s.exerciseId).focus === r.focus), r.id);
    assert.deepEqual(codes(r).filter((c) => ['W4', 'W5', 'W6', 'W7'].includes(c)), [], r.id);
    assert.ok(r.expectedTotalSec > 900, r.id); // langer dan een rekroutine mag hier
  }
});

test('validator: een rekssjabloon blijft binnen 15 minuten en zonder vergrendelde oefening; training niet', () => {
  const errorsFor = (mutate) => { const d = rawLibrary(); mutate(d); return validateLibrary(d, schema); };
  const tpl = (d, id) => d.routines.find((r) => r.id === id);
  // Lenigheid langer dan 900 s.
  const long = errorsFor((d) => {
    const r = tpl(d, 'LN-HEUP');
    r.steps = [...r.steps, ...r.steps];
    r.expectedTotalSec = compileRoutine(r, lib.exercises, { timing: lib.meta.timing }).totalSec;
  });
  assert.ok(long.some((e) => e.where === 'sjabloon LN-HEUP' && e.field === 'expectedTotalSec'), JSON.stringify(long));
  // Focus hoort alleen bij training, en een trainingssjabloon heeft er een.
  assert.ok(errorsFor((d) => { tpl(d, 'LN-HEUP').focus = 'heupen'; }).some((e) => e.field === 'focus'));
  assert.ok(errorsFor((d) => { delete tpl(d, 'TR-HEUP').focus; }).some((e) => e.field === 'focus'));
  // Een rekoefening in een trainingssjabloon, of een enkeloefening bij de heupen.
  const mixed = errorsFor((d) => {
    const r = tpl(d, 'TR-HEUP');
    r.steps = [...r.steps, { exerciseId: 'pogo_eenbenig', perSideSec: 30 }];
    r.expectedTotalSec = compileRoutine(r, lib.exercises, { timing: lib.meta.timing }).totalSec;
  });
  assert.ok(mixed.some((e) => e.where === 'sjabloon TR-HEUP' && /pogo_eenbenig/.test(e.message)), JSON.stringify(mixed));
  // Vergrendeld mag in training (step-up, Bulgarian, drop landing), niet elders.
  assert.ok(lib.templates.get('TR-ENKEL').steps.some((s) => lib.exercises.get(s.exerciseId).locked));
  const locked = errorsFor((d) => {
    const r = tpl(d, 'A15');
    r.steps[0] = { exerciseId: 'kikker', durationSec: 30 };
    r.expectedTotalSec = compileRoutine(r, lib.exercises, { timing: lib.meta.timing }).totalSec;
  });
  assert.ok(locked.some((e) => e.where === 'sjabloon A15' && /vergrendelde/.test(e.message)), JSON.stringify(locked));
});
