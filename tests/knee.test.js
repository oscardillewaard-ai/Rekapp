import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyKneeState, access, recordKneeCheck, activateFlare, endFlare, flareExitDue, dailyCheckDue, dayKey,
  flareStreak, postponeFlareExit, flareExitPostponedToday, latestKneeTime, canUndoFlare, UNDO_FLARE_HOURS,
} from '../js/knee.js';
import { checkKneeState } from '../js/backup.js';
import { playableRoutine } from '../js/warnings.js';
import { compileRoutine } from '../js/timeline.js';
import { lib, at, ex, HOUR } from './helpers.js';

const K = lib.meta.knee;
const check = (state, { at: t, pain, context }) => recordKneeCheck(state, { id: `c${t}`, at: t, pain, context }, K);

// §11.1 F (ontgrendelprotocol, U1–U4) vervalt: het knieslot met de
// 48-uurstest is op verzoek van Oscar verwijderd (AFWIJKINGEN.md). De
// opvlammingsmodus (G) blijft hard.

test('zonder opvlamming is elke oefening toe te voegen en af te spelen, ook de 10 met K ≤ 2', () => {
  const s = emptyKneeState();
  for (const x of lib.exercises.values()) assert.deepEqual(access(x, s, K), { allowed: true, codes: [] }, x.id);
  assert.equal([...lib.exercises.values()].filter((x) => x.locked).length, 10);
});

// §11.1 G. Opvlammingsmodus.
test('G/F1: modus aan → rf_zijlig geblokkeerd (W8), enkel_rock en heupbuiger_dyn toegestaan; O5 volledig, A5 zonder rf_zijlig (190 s)', () => {
  const s = activateFlare(emptyKneeState(), at(0), 'handmatig').state;
  assert.equal(s.flare.active, true);
  assert.deepEqual(access(ex('rf_zijlig'), s, K), { allowed: false, codes: ['W8'] });
  assert.equal(access(ex('enkel_rock'), s, K).allowed, true);
  assert.equal(access(ex('heupbuiger_dyn'), s, K).allowed, true);

  const ctx = { lib, knee: s };
  const o5 = playableRoutine(lib.templates.get('O5'), ctx);
  assert.equal(o5.removed.length, 0);
  assert.equal(compileRoutine(o5.routine, lib.exercises, { timing: lib.meta.timing }).totalSec, 305);
  const a5 = playableRoutine(lib.templates.get('A5'), ctx);
  assert.deepEqual(a5.removed.map((r) => [r.exerciseId, r.codes]), [['rf_zijlig', ['W8']]]);
  assert.equal(compileRoutine(a5.routine, lib.exercises, { timing: lib.meta.timing }).totalSec, 190);
  // Na de opvlamming is alles weer vrij.
  assert.equal(access(ex('rf_zijlig'), endFlare(s), K).allowed, true);
});

test('tijdens een opvlamming: alles boven 45° uit, dus ook alle 10 oefeningen met K ≤ 2', () => {
  const s = activateFlare(emptyKneeState(), at(0)).state;
  for (const x of lib.exercises.values()) {
    assert.equal(access(x, s, K).allowed, x.kneeFlexionMaxDeg <= K.flareMaxDeg, x.id);
  }
  for (const x of [...lib.exercises.values()].filter((y) => y.locked)) assert.deepEqual(access(x, s, K).codes, ['W8'], x.id);
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
  assert.deepEqual(r.events, [{ type: 'opvlamming_aan', reason: 'kniecheck 3/10' }]);
  assert.equal(check(emptyKneeState(), { at: at(0, 8), pain: 2, context: 'dagelijks' }).state.flare.active, false);
});

test('opvlamming: een check boven 2/10 breekt de reeks', () => {
  assert.equal(flareWithDailyChecks([1, 1, 1, 3, 1, 1, 1]).at(-1), false);
});

test('dagelijkse kniecheck: één per dag, nieuwe dag om 04:00', () => {
  assert.equal(dayKey(at(1, 3, 59)), dayKey(at(0, 12)));
  assert.notEqual(dayKey(at(1, 4, 0)), dayKey(at(0, 12)));
  const s = check(emptyKneeState(), { at: at(0, 22), pain: 1, context: 'dagelijks' }).state;
  assert.equal(dailyCheckDue(s, at(1, 3)), false);
  assert.equal(dailyCheckDue(s, at(1, 4)), true);
});

test('flareStreak telt de dagen van de reeks (voor de banner)', () => {
  let s = activateFlare(emptyKneeState(), at(0), 'handmatig').state;
  assert.equal(flareStreak(s, at(0), K), 0);
  for (let d = 0; d < 3; d++) s = check(s, { at: at(d, 11), pain: 1, context: 'dagelijks' }).state;
  assert.equal(flareStreak(s, at(2, 12), K), 3);
  assert.equal(flareExitDue(s, at(2, 12), K), false);
});

test('"Nog niet" op het voorstel: vandaag niet meer vragen', () => {
  const s = postponeFlareExit(activateFlare(emptyKneeState(), at(0)).state, at(0, 11));
  assert.equal(flareExitPostponedToday(s, at(0, 12)), true);
  assert.equal(flareExitPostponedToday(s, at(1, 11)), false);
});

// Per ongeluk aangezet (keuze Oscar): binnen 24 uur direct terugdraaien.
test('terugdraaien kan tot 24 uur na het aanzetten, daarna niet meer', () => {
  assert.equal(UNDO_FLARE_HOURS, 24);
  const since = at(0, 10);
  const s = activateFlare(emptyKneeState(), since).state;
  assert.equal(canUndoFlare(s, since), true);
  assert.equal(canUndoFlare(s, since + 24 * HOUR - 1), true);
  assert.equal(canUndoFlare(s, since + 24 * HOUR), false);
  // Klok teruggezet tot vóór het aanzetten: niet.
  assert.equal(canUndoFlare(s, since - 1), false);
  // Niet aan: niets terug te draaien.
  assert.equal(canUndoFlare(emptyKneeState(), since), false);
  // Ook na een automatische opvlamming (een kniecheck van 3/10 kan een
  // vergissing zijn); de check zelf blijft in het logboek.
  const auto = check(emptyKneeState(), { at: since, pain: 3, context: 'dagelijks' }).state;
  assert.equal(canUndoFlare(auto, since + HOUR), true);
  const undone = endFlare(auto);
  assert.equal(undone.flare.active, false);
  assert.equal(undone.checks.length, 1);
  assert.equal(access(ex('rf_zijlig'), undone, K).allowed, true);
});

test('latestKneeTime: laatste check of opvlamming (klok teruggezet herkennen)', () => {
  let s = check(emptyKneeState(), { at: at(0, 8), pain: 1, context: 'dagelijks' }).state;
  assert.equal(latestKneeTime(s), at(0, 8));
  s = activateFlare(s, at(0, 12)).state;
  assert.equal(latestKneeTime(s), at(0, 12));
});

test('de kniestatus bij het starten nalopen: geldige stand blijft staan, oude ontgrendelingen vallen weg', () => {
  const s = { ...check(emptyKneeState(), { at: at(0, 8), pain: 1, context: 'dagelijks' }).state, rev: 4 };
  const r = checkKneeState(s, lib);
  assert.deepEqual(r, { knee: s, warnings: [], changed: false });
  // Een stand uit de tijd van het knieslot: unlocks gaan niet mee, oude
  // checks (context 24u) blijven geldig.
  const old = { ...s, unlocks: { couch_stretch: { state: 'vrij', cleanCount: 3, cooldownUntil: null, cycles: [] } }, checks: [...s.checks, { id: 'x', at: at(1, 9), pain: 1, context: '24u', exerciseId: 'couch_stretch' }] };
  const o = checkKneeState(old, lib);
  assert.equal('unlocks' in o.knee, false);
  assert.equal(o.knee.checks.length, 2);
  // Een kapotte check valt weg (en moet dan worden weggeschreven).
  const bad = checkKneeState({ ...s, checks: [...s.checks, { id: 'y', at: at(1), pain: 11, context: 'dagelijks' }] }, lib);
  assert.equal(bad.knee.checks.length, 1);
  assert.equal(bad.changed, true);
  // Niet te lezen: null (dan geldt de opvlammingsmodus).
  assert.equal(checkKneeState({ flare: { active: false }, checks: 'x' }, lib), null);
  assert.equal(checkKneeState({ flare: { active: true }, checks: [] }, lib), null); // aan zonder tijdstip
  assert.equal(checkKneeState(null, lib), null);
});
