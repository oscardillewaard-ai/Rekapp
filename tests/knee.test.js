import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyKneeState, access, unlockState, canStartTest, startTest, cancelTest, recordExposure, recordKneeCheck,
  pendingChecks, expireChecks, activateFlare, endFlare, flareExitDue, dailyCheckDue, dayKey,
} from '../js/knee.js';
import { routineWarnings, playableRoutine } from '../js/warnings.js';
import { compileRoutine } from '../js/timeline.js';
import { lib, at, ex, HOUR, DAY } from './helpers.js';

const K = lib.meta.knee;
const ALL = { pain7d: true, noLegTrainingToday: true, noHeavyNext48h: true };
const couch = ex('couch_stretch');

const check = (state, { at: t, pain, context, exerciseId }) => recordKneeCheck(state, { id: `c${t}`, at: t, pain, context, exerciseId }, K);

// Eén volledige cyclus: blootstelling + 24u + 48u.
function cycle(state, exerciseId, t0, [before, during, p24, p48]) {
  let s = recordExposure(exerciseId, state, { at: t0, painBefore: before, painDuring: during }, K).state;
  const events = [];
  let r = check(s, { at: t0 + 24 * HOUR, pain: p24, context: '24u', exerciseId });
  s = r.state;
  events.push(...r.events);
  if (s.unlocks[exerciseId].state === 'vergrendeld') return { state: s, events };
  r = check(s, { at: t0 + 48 * HOUR, pain: p48, context: '48u', exerciseId });
  events.push(...r.events);
  return { state: r.state, events };
}

const routineWith = (id) => ({ id: 'r', slot: 'avond', preRun: false, timesPerWeek: 1, steps: [{ exerciseId: id, perSideSec: 30 }] });

// §11.1 F. Ontgrendelprotocol.
function u1() {
  let s = emptyKneeState();
  assert.equal(unlockState(couch, s), 'vergrendeld');
  assert.equal(access(couch, s, K).allowed, false);
  s = startTest(couch, s, at(0), ALL);
  assert.equal(unlockState(couch, s), 'test');
  return cycle(s, 'couch_stretch', at(0), [1, 1, 1, 1]).state;
}

test('F/U1: couch_stretch met alle voorwaarden → test; 1/1/1/1 → voorlopig, teller 1', () => {
  const s = u1();
  assert.equal(s.unlocks.couch_stretch.state, 'voorlopig');
  assert.equal(s.unlocks.couch_stretch.cleanCount, 1);
});

test('F/U2: twee blootstellingen ≥48 u uit elkaar, elk 1/1/1 → teller 3 → vrij; derde gebruik binnen 48 u geeft W9', () => {
  let s = u1();
  const t1 = at(0) + 49 * HOUR;
  const t2 = t1 + 49 * HOUR;
  // Vóór de eerste routineblootstelling (49 u na de proef): geen W9.
  assert.ok(!routineWarnings(routineWith('couch_stretch'), { lib, knee: s, now: t1 }).some((w) => w.code === 'W9'));
  s = cycle(s, 'couch_stretch', t1, [1, 1, 1, 1]).state;
  assert.equal(s.unlocks.couch_stretch.state, 'voorlopig');
  assert.equal(s.unlocks.couch_stretch.cleanCount, 2);

  s = recordExposure('couch_stretch', s, { at: t2, painBefore: 1, painDuring: 1 }, K).state;
  s = check(s, { at: t2 + 24 * HOUR, pain: 1, context: '24u', exerciseId: 'couch_stretch' }).state;
  // Derde gebruik binnen 48 u na een blootstelling in voorlopig → W9 (oranje, blokkeert niet).
  const ws = routineWarnings(routineWith('couch_stretch'), { lib, knee: s, now: t2 + 30 * HOUR });
  assert.deepEqual(ws.filter((w) => w.exerciseId === 'couch_stretch').map((w) => [w.code, w.severity]), [['W9', 'oranje']]);
  assert.equal(access(couch, s, K).allowed, true);

  s = check(s, { at: t2 + 48 * HOUR, pain: 1, context: '48u', exerciseId: 'couch_stretch' }).state;
  assert.equal(s.unlocks.couch_stretch.cleanCount, 3);
  assert.equal(s.unlocks.couch_stretch.state, 'vrij');
  assert.ok(!routineWarnings(routineWith('couch_stretch'), { lib, knee: s, now: t2 + 50 * HOUR }).some((w) => w.code === 'W9' || w.code === 'W1'));
});

test('F/U3: beginwaarde 0 en na 24 u 1 → niet schoon → vergrendeld, afkoelperiode 7 dagen, geen opvlammingsvoorstel', () => {
  let s = startTest(couch, emptyKneeState(), at(0), ALL);
  s = recordExposure('couch_stretch', s, { at: at(0), painBefore: 0, painDuring: 0 }, K).state;
  const r = check(s, { at: at(0) + 24 * HOUR, pain: 1, context: '24u', exerciseId: 'couch_stretch' });
  const rec = r.state.unlocks.couch_stretch;
  assert.equal(rec.state, 'vergrendeld');
  assert.equal(rec.cleanCount, 0);
  assert.equal(rec.cooldownUntil, at(0) + 24 * HOUR + 7 * DAY);
  assert.equal(rec.cycles.at(-1).result, 'niet schoon');
  assert.ok(!r.events.some((e) => e.type === 'opvlamming_voorstel' || e.type === 'opvlamming_aan'));
  assert.equal(r.state.flare.active, false);
  // Tijdens de afkoelperiode kan de test niet opnieuw beginnen; daarna wel.
  assert.equal(canStartTest(couch, r.state, at(7), ALL).ok, false);
  assert.equal(canStartTest(couch, r.state, at(0) + 24 * HOUR + 7 * DAY + 1, ALL).ok, true);
});

test('F/U4: voorlopig met na 48 u 3/10 → vergrendeld met afkoelperiode, opvlammingsmodus gaat automatisch aan', () => {
  let s = u1();
  const t1 = at(0) + 49 * HOUR;
  s = recordExposure('couch_stretch', s, { at: t1, painBefore: 1, painDuring: 1 }, K).state;
  s = check(s, { at: t1 + 24 * HOUR, pain: 1, context: '24u', exerciseId: 'couch_stretch' }).state;
  const r = check(s, { at: t1 + 48 * HOUR, pain: 3, context: '48u', exerciseId: 'couch_stretch' });
  const rec = r.state.unlocks.couch_stretch;
  assert.equal(rec.state, 'vergrendeld');
  assert.equal(rec.cooldownUntil, t1 + 48 * HOUR + 7 * DAY);
  assert.equal(r.state.flare.active, true);
  assert.ok(r.events.some((e) => e.type === 'opvlamming_aan'));
});

// §11.1 G. Opvlammingsmodus.
test('G/F1: modus aan → rf_zijlig geblokkeerd (W8), enkel_rock en heupbuiger_dyn toegestaan; vrij → vergrendeld; O5 volledig, A5 zonder rf_zijlig (190 s)', () => {
  // Eerst een oefening volledig vrijspelen.
  let s = u1();
  s = cycle(s, 'couch_stretch', at(0) + 49 * HOUR, [1, 1, 1, 1]).state;
  s = cycle(s, 'couch_stretch', at(0) + 98 * HOUR, [1, 1, 1, 1]).state;
  assert.equal(s.unlocks.couch_stretch.state, 'vrij');

  s = activateFlare(s, at(6), 'handmatig').state;
  assert.equal(s.flare.active, true);
  assert.deepEqual(access(ex('rf_zijlig'), s, K), { allowed: false, codes: ['W8'] });
  assert.equal(access(ex('enkel_rock'), s, K).allowed, true);
  assert.equal(access(ex('heupbuiger_dyn'), s, K).allowed, true);
  assert.equal(s.unlocks.couch_stretch.state, 'vergrendeld');
  assert.equal(access(couch, s, K).allowed, false);

  const ctx = { lib, knee: s };
  const o5 = playableRoutine(lib.templates.get('O5'), ctx);
  assert.equal(o5.removed.length, 0);
  assert.equal(compileRoutine(o5.routine, lib.exercises, { timing: lib.meta.timing }).totalSec, 305);
  const a5 = playableRoutine(lib.templates.get('A5'), ctx);
  assert.deepEqual(a5.removed.map((r) => [r.exerciseId, r.codes]), [['rf_zijlig', ['W8']]]);
  assert.equal(compileRoutine(a5.routine, lib.exercises, { timing: lib.meta.timing }).totalSec, 190);
  // Na de opvlamming begint de oefening opnieuw bij vergrendeld.
  s = endFlare(s);
  assert.equal(s.unlocks.couch_stretch.state, 'vergrendeld');
  assert.equal(s.unlocks.couch_stretch.cleanCount, 0);
});

function flareWithDailyChecks(values, skipDay = null) {
  let s = activateFlare(emptyKneeState(), at(0, 9), 'handmatig').state;
  const results = [];
  let day = 1;
  for (const pain of values) {
    if (day === skipDay) day++;
    const t = at(day, 8);
    s = check(s, { at: t, pain, context: 'dagelijks' }).state;
    results.push(flareExitDue(s, t, K));
    day++;
  }
  return results;
}

test('G/F2: kniechecks 2, 1, 0, 2, 1, 1, 2 op zeven opeenvolgende dagen → op dag 7 het voorstel', () => {
  assert.deepEqual(flareWithDailyChecks([2, 1, 0, 2, 1, 1, 2]), [false, false, false, false, false, false, true]);
});

test('G/F2: met één dag zonder check ertussen → geen voorstel', () => {
  assert.deepEqual(flareWithDailyChecks([2, 1, 0, 2, 1, 1, 2], 4), [false, false, false, false, false, false, false]);
});

test('een dagelijkse kniecheck boven 2/10 zet de opvlammingsmodus automatisch aan', () => {
  const r = check(emptyKneeState(), { at: at(0, 8), pain: 3, context: 'dagelijks' });
  assert.equal(r.state.flare.active, true);
  assert.equal(r.state.flare.since, at(0, 8));
  assert.equal(check(emptyKneeState(), { at: at(0, 8), pain: 2, context: 'dagelijks' }).state.flare.active, false);
});

test('opvlamming: een check boven 2/10 breekt de reeks', () => {
  assert.equal(flareWithDailyChecks([1, 1, 1, 3, 1, 1, 1]).at(-1), false);
});

// Voorwaarden vergrendeld → test.
test('vergrendeld → test vraagt alle drie de bevestigingen', () => {
  assert.equal(canStartTest(couch, emptyKneeState(), at(0), ALL).ok, true);
  for (const k of Object.keys(ALL)) {
    const r = canStartTest(couch, emptyKneeState(), at(0), { ...ALL, [k]: false });
    assert.equal(r.ok, false, k);
  }
  assert.throws(() => startTest(couch, emptyKneeState(), at(0), {}));
});

test('vergrendeld → test kan niet tijdens een opvlamming of als er al een oefening in de proefperiode zit', () => {
  const flare = activateFlare(emptyKneeState(), at(0)).state;
  assert.equal(canStartTest(couch, flare, at(0), ALL).ok, false);
  const busy = startTest(ex('kikker'), emptyKneeState(), at(0), ALL);
  assert.equal(canStartTest(couch, busy, at(0), ALL).ok, false);
});

test('niet-vergrendelde oefeningen doen niet mee aan het protocol', () => {
  assert.equal(canStartTest(ex('gastroc_muur'), emptyKneeState(), at(0), ALL).ok, false);
  assert.throws(() => recordExposure('couch_stretch', emptyKneeState(), { at: at(0), painBefore: 0, painDuring: 0 }, K));
});

test('pijn tijdens de proef boven 2/10 → direct niet schoon, met opvlammingsvoorstel (niet automatisch)', () => {
  const s = startTest(couch, emptyKneeState(), at(0), ALL);
  const r = recordExposure('couch_stretch', s, { at: at(0), painBefore: 1, painDuring: 3 }, K);
  assert.equal(r.state.unlocks.couch_stretch.state, 'vergrendeld');
  assert.ok(r.events.some((e) => e.type === 'opvlamming_voorstel'));
  assert.equal(r.state.flare.active, false);
});

test('na 48 u hoger dan de beginwaarde (maar ≤ 2) → niet schoon, zonder voorstel', () => {
  let s = startTest(couch, emptyKneeState(), at(0), ALL);
  const r = cycle(s, 'couch_stretch', at(0), [1, 1, 1, 2]);
  assert.equal(r.state.unlocks.couch_stretch.state, 'vergrendeld');
  assert.ok(!r.events.some((e) => e.type === 'opvlamming_voorstel'));
});

test('checkvensters: 24u-check 20–30 u, 48u-check 44–56 u na de blootstelling', () => {
  let s = startTest(couch, emptyKneeState(), at(0), ALL);
  s = recordExposure('couch_stretch', s, { at: at(0), painBefore: 1, painDuring: 1 }, K).state;
  assert.deepEqual(pendingChecks(s, at(0) + 19 * HOUR, K), []);
  assert.deepEqual(pendingChecks(s, at(0) + 20 * HOUR, K).map((c) => c.context), ['24u']);
  assert.throws(() => check(s, { at: at(0) + 19 * HOUR, pain: 1, context: '24u', exerciseId: 'couch_stretch' }));
  assert.throws(() => check(s, { at: at(0) + 25 * HOUR, pain: 1, context: '48u', exerciseId: 'couch_stretch' }));
  s = check(s, { at: at(0) + 25 * HOUR, pain: 1, context: '24u', exerciseId: 'couch_stretch' }).state;
  assert.deepEqual(pendingChecks(s, at(0) + 43 * HOUR, K), []);
  assert.deepEqual(pendingChecks(s, at(0) + 44 * HOUR, K).map((c) => c.context), ['48u']);
  assert.throws(() => check(s, { at: at(0) + 57 * HOUR, pain: 1, context: '48u', exerciseId: 'couch_stretch' }));
});

test('een niet-ingevulde check: de cyclus vervalt en de teller blijft staan', () => {
  let s = u1(); // voorlopig, teller 1
  const t1 = at(0) + 49 * HOUR;
  s = recordExposure('couch_stretch', s, { at: t1, painBefore: 1, painDuring: 1 }, K).state;
  const r = expireChecks(s, t1 + 31 * HOUR, K);
  const rec = r.state.unlocks.couch_stretch;
  assert.equal(rec.cycles.at(-1).result, 'vervallen');
  assert.equal(rec.state, 'voorlopig');
  assert.equal(rec.cleanCount, 1);
  assert.deepEqual(pendingChecks(r.state, t1 + 31 * HOUR, K), []);
  // Binnen het venster vervalt er niets.
  assert.equal(expireChecks(s, t1 + 29 * HOUR, K).state.unlocks.couch_stretch.cycles.at(-1).result, null);
});

test('een nieuwe blootstelling tijdens een lopende cyclus laat die vervallen; de teller blijft staan', () => {
  let s = u1();
  const t1 = at(0) + 49 * HOUR;
  s = recordExposure('couch_stretch', s, { at: t1, painBefore: 1, painDuring: 1 }, K).state;
  const r = recordExposure('couch_stretch', s, { at: t1 + 30 * HOUR, painBefore: 1, painDuring: 1 }, K);
  const rec = r.state.unlocks.couch_stretch;
  assert.deepEqual(rec.cycles.slice(-2).map((c) => c.result), ['vervallen', null]);
  assert.equal(rec.cleanCount, 1);
});

test('proef afbreken vóór de blootstelling: terug naar vergrendeld zonder afkoelperiode', () => {
  const s = cancelTest('couch_stretch', startTest(couch, emptyKneeState(), at(0), ALL));
  assert.equal(s.unlocks.couch_stretch.state, 'vergrendeld');
  assert.equal(s.unlocks.couch_stretch.cooldownUntil, null);
});

test('dagelijkse kniecheck: één per dag, nieuwe dag om 04:00', () => {
  assert.equal(dayKey(at(1, 3, 59)), dayKey(at(0, 12)));
  assert.notEqual(dayKey(at(1, 4, 0)), dayKey(at(0, 12)));
  let s = check(emptyKneeState(), { at: at(0, 22), pain: 1, context: 'dagelijks' }).state;
  assert.equal(dailyCheckDue(s, at(1, 3)), false);
  assert.equal(dailyCheckDue(s, at(1, 4)), true);
});
