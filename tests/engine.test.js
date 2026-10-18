import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileRoutine } from '../js/timeline.js';
import { createPlayer, start, tick, pause, resume, next, back, requestStop, cancelStop, confirmStop, view, sessionStatus, activeSec } from '../js/engine.js';
import { speechFor, displayFor, spokenName, nextExerciseAfter, SPOKEN } from '../js/cues.js';
import { buildSession, isoWithOffset } from '../js/session.js';
import { actualWeekDose, plannedWeekDose } from '../js/dose.js';
import { lib, at, ex } from './helpers.js';

const compile = (routine) => compileRoutine(routine, lib.exercises, { timing: lib.meta.timing }).segments;
const tpl = (id) => lib.templates.get(id);

// Laat de speler lopen met ticks om de stepMs; verzamelt alle gebeurtenissen.
function run(state, from, to, stepMs = 50) {
  const events = [];
  let s = state;
  for (let t = from; t <= to; t += stepMs) {
    const r = tick(s, t);
    s = r.state;
    events.push(...r.events.map((e) => ({ ...e, t })));
    if (s.status !== 'running') break;
  }
  return { state: s, events };
}

for (const id of ['O5', 'O10', 'O15', 'A5', 'A10', 'A15']) {
  test(`sjabloon ${id} speelt helemaal af in precies ${tpl(id).expectedTotalSec} s (§11.2: ≤ 2 s afwijking)`, () => {
    const t0 = 1_000;
    let s = start(createPlayer(compile(tpl(id))), t0).state;
    s = run(s, t0, t0 + tpl(id).expectedTotalSec * 1000 + 1000, 37).state;
    assert.equal(s.status, 'done');
    assert.equal(s.endedAt - s.startedAt, tpl(id).expectedTotalSec * 1000);
    assert.equal(sessionStatus(s), 'voltooid');
    assert.equal(activeSec(s), tpl(id).expectedTotalSec);
  });
}

test('grove ticks (bv. 1,7 s) geven dezelfde exacte eindtijd: tijd komt uit tijdstempels', () => {
  let s = start(createPlayer(compile(tpl('A5'))), 0).state;
  s = run(s, 0, 400_000, 1700).state;
  assert.equal(s.status, 'done');
  assert.equal(s.endedAt, 295_000);
});

test('pauze en hervatten behouden de resterende tijd (tot op 0,2 s)', () => {
  let s = start(createPlayer(compile(tpl('A5'))), 0).state;
  s = run(s, 0, 20_000).state; // midden in het eerste werkblok
  const before = view(s, 20_000).remainingMs;
  s = pause(s, 20_000).state;
  assert.equal(s.status, 'paused');
  assert.equal(view(s, 80_000).remainingMs, before); // pauze van een minuut
  s = resume(s, 80_000).state;
  assert.ok(Math.abs(view(s, 80_000).remainingMs - before) <= 200);
  s = run(s, 80_000, 500_000).state;
  assert.equal(s.endedAt - s.startedAt, 295_000 + 60_000);
  assert.equal(activeSec(s), 295); // pauze telt niet als actieve tijd
});

test('PNF: per kant 2 × (5 s aanspannen + 25 s rekken), met de cues uit §6.8.2', () => {
  const segs = compile({ steps: [{ exerciseId: 'hamstring_pnf', pnf: { rounds: 2, contractSec: 5, stretchSec: 25 } }] });
  const kinds = segs.map((x) => `${x.kind}${x.side ? `:${x.side}` : ''}:${x.durationSec}`);
  assert.deepEqual(kinds, ['prep:5', 'contract:L:5', 'relax:L:25', 'contract:L:5', 'relax:L:25', 'switch:5', 'contract:R:5', 'relax:R:25', 'contract:R:5', 'relax:R:25']);
  const speech = segs.map((_, i) => speechFor(segs, i, lib.exercises));
  assert.deepEqual(speech, [
    'Volgende: Hamstrings met band.',
    'Linkerkant. Hamstrings met band. Aanspannen…',
    'Loslaten, zak verder',
    'Aanspannen…',
    'Loslaten, zak verder',
    'Wissel van kant',
    'Rechterkant. Hamstrings met band. Aanspannen…',
    'Loslaten, zak verder',
    'Aanspannen…',
    'Loslaten, zak verder',
  ]);
  // De engine loopt ze in die volgorde af.
  let s = start(createPlayer(segs), 0).state;
  const r = run(s, 0, 200_000);
  assert.deepEqual(r.events.filter((e) => e.type === 'segment').map((e) => segs[e.index].kind), kinds.slice(1).map((k) => k.split(':')[0]));
  assert.equal(r.state.endedAt, 130_000);
});

test('spraak bij een werkblok: "Linkerkant. Kuit tegen de muur. 45 seconden." (§6.8.2)', () => {
  const segs = compile({ steps: [{ exerciseId: 'gastroc_muur', perSideSec: 45 }, { exerciseId: 'spreidzit_muur', durationSec: 60 }] });
  assert.equal(speechFor(segs, 1, lib.exercises), 'Linkerkant. Kuit tegen de muur. 45 seconden.');
  assert.equal(speechFor(segs, 2, lib.exercises), SPOKEN.switch);
  assert.equal(speechFor(segs, 3, lib.exercises), 'Rechterkant. Kuit tegen de muur. 45 seconden.');
  assert.equal(speechFor(segs, 4, lib.exercises), 'Volgende: Spreidzit tegen de muur.');
  assert.equal(speechFor(segs, 5, lib.exercises), 'Spreidzit tegen de muur. 60 seconden.');
  assert.equal(spokenName(ex('voetzool_zittend')), 'Voetzool zittend');
});

test('extra set zwakke kant wordt aangekondigd', () => {
  const segs = compile({ steps: [{ exerciseId: 'gastroc_muur', perSideSec: 45, extraWeakSide: 'L' }] });
  assert.equal(speechFor(segs, 5, lib.exercises), 'Extra set. Linkerkant. Kuit tegen de muur. 45 seconden.');
});

test('scherm: naam en kant groot, labels per segment, "Volgende: …"', () => {
  const segs = compile(tpl('A5'));
  assert.deepEqual(pick(displayFor(segs, 0, lib.exercises)), { exercise: 'gastroc_muur', sideLabel: 'Links', label: 'Voorbereiden' });
  assert.deepEqual(pick(displayFor(segs, 1, lib.exercises)), { exercise: 'gastroc_muur', sideLabel: 'Links', label: 'Rekken' });
  assert.deepEqual(pick(displayFor(segs, 2, lib.exercises)), { exercise: 'gastroc_muur', sideLabel: 'Rechts', label: 'Wissel van kant' });
  assert.deepEqual(pick(displayFor(segs, 4, lib.exercises)), { exercise: 'rf_zijlig', sideLabel: '', label: 'Volgende: Rectus femoris zijlig met band' });
  const last = segs.length - 1;
  assert.deepEqual(pick(displayFor(segs, last, lib.exercises)), { exercise: 'spreidzit_muur', sideLabel: 'Beide kanten', label: 'Rekken' });
  assert.equal(nextExerciseAfter(segs, 1, lib.exercises).id, 'rf_zijlig');
  assert.equal(nextExerciseAfter(segs, last, lib.exercises), null);
});
const pick = (d) => ({ exercise: d.exercise?.id, sideLabel: d.sideLabel, label: d.label });

test('zachte piep halverwege en 3-2-1, elk één keer', () => {
  const segs = compile({ steps: [{ exerciseId: 'spreidzit_muur', durationSec: 60 }] });
  let s = start(createPlayer(segs), 0).state;
  const ev = run(s, 0, 70_000, 20).events;
  const work = ev.filter((e) => e.index === 1);
  assert.deepEqual(work.filter((e) => e.type === 'halfway').map((e) => e.t), [35_000]); // 5 s prep + 30 s
  assert.deepEqual(work.filter((e) => e.type === 'countdown').map((e) => [e.n, e.t]), [[3, 62_000], [2, 63_000], [1, 64_000]]);
  // Ook de voorbereiding telt af naar de start.
  assert.deepEqual(ev.filter((e) => e.index === 0 && e.type === 'countdown').map((e) => e.n), [3, 2, 1]);
});

test('achtergrond zonder auto-pauze: bij terugkomst naar het juiste segment, zonder een salvo piepjes', () => {
  let s = start(createPlayer(compile(tpl('A5'))), 0).state;
  s = run(s, 0, 10_000).state;
  const r = tick(s, 150_000); // 140 s niets (scherm uit)
  const segs = r.state.segments;
  // 150 s: prep 5 + gastroc 95 + 15 overgang = 115 → in rf_zijlig links (115–160).
  assert.equal(segs[r.state.segmentIndex].exerciseId, 'rf_zijlig');
  assert.equal(segs[r.state.segmentIndex].side, 'L');
  assert.equal(view(r.state, 150_000).remainingMs, 10_000);
  assert.ok(r.events.filter((e) => e.type === 'countdown' || e.type === 'halfway').length <= 1);
  assert.deepEqual(r.state.segmentsDone.map((d) => [d.exerciseId, d.side, d.sec]), [['gastroc_muur', 'L', 45], ['gastroc_muur', 'R', 45]]);
});

test('⏭ volgende: eerst naar de overgang, dan naar de volgende oefening; na de laatste is het klaar', () => {
  const segs = compile(tpl('A5'));
  let s = start(createPlayer(segs), 0).state;
  s = run(s, 0, 10_000).state; // in gastroc L
  s = next(s, 10_000).state;
  assert.equal(segs[s.segmentIndex].kind, 'transition');
  assert.deepEqual(s.segmentsDone.map((d) => [d.side, d.sec]), [['L', 5]]); // 5 s gedaan
  s = next(s, 11_000).state;
  assert.equal(segs[s.segmentIndex].exerciseId, 'rf_zijlig');
  assert.equal(segs[s.segmentIndex].kind, 'work');
  s = next(s, 12_000).state; // naar overgang rf → spreidzit
  s = next(s, 12_500).state; // spreidzit
  assert.equal(segs[s.segmentIndex].exerciseId, 'spreidzit_muur');
  const r = next(s, 13_000);
  assert.equal(r.state.status, 'done');
  assert.deepEqual(r.events.map((e) => e.type), ['done']);
});

test('⏮ terug: naar het begin van de huidige oefening', () => {
  const segs = compile(tpl('A5'));
  let s = start(createPlayer(segs), 0).state;
  s = run(s, 0, 60_000).state; // gastroc R (55–100)
  assert.equal(segs[s.segmentIndex].side, 'R');
  s = back(s, 60_000).state;
  assert.equal(s.segmentIndex, 1);
  assert.equal(view(s, 60_000).remainingMs, 45_000);
  // Tijdens de voorbereiding: opnieuw voorbereiden.
  let p = start(createPlayer(segs), 0).state;
  p = back(p, 3000).state;
  assert.equal(p.segmentIndex, 0);
  assert.equal(view(p, 3000).remainingMs, 5000);
});

test('gepauzeerd blijft gepauzeerd na volgende/terug', () => {
  const segs = compile(tpl('A5'));
  let s = start(createPlayer(segs), 0).state;
  s = pause(run(s, 0, 10_000).state, 10_000).state;
  s = next(s, 20_000).state;
  assert.equal(s.status, 'paused');
  assert.equal(view(s, 99_000).remainingMs, 15_000); // overgang van 15 s, bevroren
});

test('✕ stoppen: eerst bevestigen (timer staat stil), annuleren loopt verder, bevestigen logt gedeeltelijk', () => {
  const segs = compile(tpl('A5'));
  let s = start(createPlayer(segs), 0).state;
  s = run(s, 0, 20_000).state;
  s = requestStop(s, 20_000).state;
  assert.equal(s.status, 'confirm');
  assert.equal(view(s, 50_000).remainingMs, 30_000);
  s = cancelStop(s, 50_000).state;
  assert.equal(s.status, 'running');
  assert.equal(view(s, 50_000).remainingMs, 30_000);
  s = requestStop(s, 55_000).state;
  s = confirmStop(s, 56_000).state;
  assert.equal(s.status, 'stopped');
  assert.equal(sessionStatus(s), 'gedeeltelijk');
  assert.deepEqual(s.segmentsDone, [{ exerciseId: 'gastroc_muur', side: 'L', kind: 'work', sec: 20 }]);
  assert.equal(activeSec(s), 25);
});

test('stoppen tijdens de voorbereiding: afgebroken', () => {
  let s = start(createPlayer(compile(tpl('O5'))), 0).state;
  s = confirmStop(requestStop(s, 2000).state, 3000).state;
  assert.equal(sessionStatus(s), 'afgebroken');
  assert.deepEqual(s.segmentsDone, []);
});

test('werkelijke dosis neemt toe met precies de gedane seconden (§11.2)', () => {
  // Volledig afgespeeld: gelijk aan gepland × 1.
  let s = start(createPlayer(compile(tpl('A10'))), 0).state;
  s = run(s, 0, 700_000, 100).state;
  const session = { startedAt: new Date(at(0)).toISOString(), segmentsDone: s.segmentsDone };
  const actual = actualWeekDose([session], lib.exercises, at(0) + 1000, 168);
  const planned = plannedWeekDose([{ ...tpl('A10'), timesPerWeek: 1 }], lib.exercises);
  assert.deepEqual(actual, planned);
  // Gedeeltelijk: precies de gelogde seconden.
  let p = start(createPlayer(compile(tpl('A10'))), 0).state;
  p = confirmStop(requestStop(run(p, 0, 23_400).state, 23_400).state, 23_400).state;
  const partial = actualWeekDose([{ startedAt: new Date(at(0)).toISOString(), segmentsDone: p.segmentsDone }], lib.exercises, at(0) + 1000, 168);
  assert.deepEqual(partial.get('gastrocnemius'), { L: 18.4, R: 0, dyn: 0 });
});

test('sessierecord met ISO-tijd plus tijdzone (§6.9)', () => {
  const t0 = at(0, 8, 15);
  const rec = buildSession({
    id: 's1', tz: 'Europe/Amsterdam',
    routine: { id: 'A5', name: 'Avond 5 min', slot: 'avond' },
    run: { startedAtMs: t0, endedAtMs: t0 + 295_000, plannedSec: 295, activeSec: 295, status: 'voltooid', segmentsDone: [] },
    finish: { stretchIntensity: 5, kneePainDuring: 1, notes: '' },
  });
  assert.match(rec.startedAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
  assert.equal(new Date(rec.startedAt).getTime(), t0);
  assert.equal(new Date(rec.endedAt).getTime() - t0, 295_000);
  assert.deepEqual(Object.keys(rec), ['id', 'routineId', 'routineName', 'slot', 'startedAt', 'endedAt', 'tz', 'plannedSec', 'activeSec', 'status', 'segmentsDone', 'stretchIntensity', 'kneePainDuring', 'notes']);
  assert.equal(isoWithOffset(t0).slice(0, 16), `2026-11-02T08:15`);
});
