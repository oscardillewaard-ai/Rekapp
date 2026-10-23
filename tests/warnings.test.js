import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routineWarnings, playableRoutine, WARNINGS } from '../js/warnings.js';
import { emptyKneeState, activateFlare } from '../js/knee.js';
import { lib, at, T1 } from './helpers.js';

const ctx = (extra = {}) => ({ lib, knee: emptyKneeState(), otherRoutines: [], now: at(0), ...extra });
const codes = (ws) => ws.map((w) => `${w.code}${w.group ? `:${w.group}` : ''}${w.exerciseId && !w.group ? `:${w.exerciseId}` : ''}`).sort();

// §11.1 D. Waarschuwingen T1.
test('D: T1 geeft W2 (hamstring_zittend_vouw), W3 (hamstrings), W6 (gastrocnemius, soleus), W7 (heupbuigers), geen W4 en geen W5', () => {
  const ws = routineWarnings(T1, ctx());
  assert.deepEqual(codes(ws), [
    'W2:hamstring_zittend_vouw',
    'W3:hamstrings',
    'W6:gastrocnemius',
    'W6:soleus',
    'W7:heupbuigers',
  ]);
});

test('teksten en ernst komen letterlijk uit §6.5', () => {
  const ws = routineWarnings(T1, ctx());
  const w2 = ws.find((w) => w.code === 'W2');
  assert.equal(w2.severity, 'oranje');
  assert.equal(w2.text, 'Bevat rugbuiging. Vlak na het opstaan zijn je tussenwervelschijven het gevoeligst voor buigen. Zet hem in je avondroutine of houd de beweging klein.');
  // W1 (knieslot) en W9 (proefperiode) vervallen met het knieslot (AFWIJKINGEN.md).
  assert.equal('W1' in WARNINGS, false);
  assert.equal('W9' in WARNINGS, false);
  assert.equal(WARNINGS.W8.severity, 'blokkeert');
  assert.equal(WARNINGS.W8.text, 'Tijdelijk uit tijdens een opvlamming.');
});

test('W2 alleen in een ochtendroutine', () => {
  assert.ok(!codes(routineWarnings({ ...T1, slot: 'avond' }, ctx())).some((c) => c.startsWith('W2')));
  assert.ok(!codes(routineWarnings({ ...T1, slot: 'vrij' }, ctx())).some((c) => c.startsWith('W2')));
});

test('W3 alleen vóór een run, telt alleen doelen met gewicht 1 en telt stappen per groep op', () => {
  assert.ok(!codes(routineWarnings({ ...T1, preRun: false }, ctx())).some((c) => c.startsWith('W3')));
  // gastroc_muur 45 s raakt soleus voor 50%: telt niet voor W3; twee kuitstretches van 30 s samen wel.
  const r = { id: 'x', slot: 'avond', preRun: true, timesPerWeek: 1, steps: [
    { exerciseId: 'gastroc_muur', perSideSec: 30 },
    { exerciseId: 'gastroc_trede', perSideSec: 30 },
    { exerciseId: 'soleus_muur', perSideSec: 55 },
  ] };
  const c = codes(routineWarnings(r, ctx()));
  assert.ok(c.includes('W3:gastrocnemius'));
  assert.ok(!c.includes('W3:soleus'));
});

test('W4 boven 900 s, niet op 900 s', () => {
  const o15 = lib.templates.get('O15');
  assert.ok(!codes(routineWarnings(o15, ctx())).includes('W4'));
  const longer = { ...o15, steps: [...o15.steps.slice(0, -1), { ...o15.steps.at(-1), perSideSec: 35 }] };
  assert.ok(routineWarnings(longer, ctx()).some((w) => w.code === 'W4'));
});

test('W5 boven 600 s per week; telt alle actieve routines samen', () => {
  // STANDAARD: hamstrings 630 s → W5 in A10 als O10 ook actief is.
  const a10 = lib.templates.get('A10');
  const o10 = lib.templates.get('O10');
  assert.ok(codes(routineWarnings(a10, ctx({ otherRoutines: [o10] }))).includes('W5:hamstrings'));
  // Alleen A10 (7×): hamstrings 90 × 7 = 630 → ook W5.
  assert.ok(codes(routineWarnings(a10, ctx())).includes('W5:hamstrings'));
  // O10 raakt de hamstrings alleen dynamisch: daar geen W5.
  assert.ok(!codes(routineWarnings(o10, ctx({ otherRoutines: [a10] }))).includes('W5:hamstrings'));
  // A10 3×: 270 → geen W5, wel W6.
  const c = codes(routineWarnings({ ...a10, timesPerWeek: 3 }, ctx()));
  assert.ok(!c.includes('W5:hamstrings'));
  assert.ok(c.includes('W6:hamstrings'));
});

test('W5 niet bij een inactieve routine: die voegt niets toe aan de weekdosis', () => {
  const a10 = { ...lib.templates.get('A10'), active: true };
  const off = { ...lib.templates.get('A10'), id: 'uit', active: false };
  assert.ok(!codes(routineWarnings(off, ctx({ otherRoutines: [a10] }))).some((c) => c.startsWith('W5')));
});

test('W6/W7 alleen in een actieve routine', () => {
  const c = codes(routineWarnings({ ...T1, active: false }, ctx()));
  assert.ok(!c.some((x) => x.startsWith('W6') || x.startsWith('W7') || x.startsWith('W5')));
});

test('knieslot verwijderd: de 10 oefeningen met K ≤ 2 spelen af, behalve tijdens een opvlamming (W8)', () => {
  const low = [...lib.exercises.values()].filter((x) => x.locked);
  assert.equal(low.length, 10);
  const flare = activateFlare(emptyKneeState(), at(0)).state;
  for (const x of low) {
    const dose = x.sided === 'unilateral' ? { perSideSec: 30 } : { durationSec: 30 };
    const r = { id: 'x', slot: 'avond', preRun: false, timesPerWeek: 1, steps: [{ exerciseId: 'gastroc_muur', perSideSec: 30 }, { exerciseId: x.id, ...dose }] };
    assert.ok(!routineWarnings(r, ctx()).some((w) => w.severity === 'blokkeert'), x.id);
    assert.equal(playableRoutine(r, ctx()).routine.steps.length, 2, x.id);
    // Opvlamming: alle tien gaan boven 45°.
    assert.ok(routineWarnings(r, ctx({ knee: flare })).some((w) => w.code === 'W8' && w.exerciseId === x.id), x.id);
    const play = playableRoutine(r, ctx({ knee: flare }));
    assert.deepEqual(play.routine.steps.map((s) => s.exerciseId), ['gastroc_muur'], x.id);
    assert.deepEqual(play.removed.map((s) => s.exerciseId), [x.id]);
  }
});

test('W8: tijdens een opvlamming blokkeert alles boven 45°', () => {
  const knee = activateFlare(emptyKneeState(), at(0)).state;
  const ws = routineWarnings(lib.templates.get('A5'), ctx({ knee }));
  assert.deepEqual(ws.filter((w) => w.severity === 'blokkeert').map((w) => `${w.code}:${w.exerciseId}`), ['W8:rf_zijlig']);
});

test('sjablonen zonder opvlamming geven geen blokkerende waarschuwing', () => {
  for (const r of lib.templates.values()) {
    assert.ok(!routineWarnings(r, ctx()).some((w) => w.severity === 'blokkeert'), r.id);
    assert.equal(playableRoutine(r, ctx()).removed.length, 0, r.id);
  }
});

test('W3–W7 en de tijd rekenen alleen met stappen die echt worden afgespeeld (zonder W8)', () => {
  // Opvlamming: rf_zijlig (90°) wordt overgeslagen, dus telt niet voor W3.
  const flare = activateFlare(emptyKneeState(), at(0)).state;
  const r = { id: 'x', name: 'x', slot: 'avond', preRun: true, timesPerWeek: 7, active: true, steps: [{ exerciseId: 'rf_zijlig', perSideSec: 90 }] };
  assert.ok(codes(routineWarnings(r, ctx())).some((c) => c.startsWith('W3')));
  const c = codes(routineWarnings(r, ctx({ knee: flare })));
  assert.ok(c.includes('W8:rf_zijlig'));
  assert.ok(!c.some((x) => x.startsWith('W3') || x.startsWith('W5') || x.startsWith('W6')), c.join(','));
  // Een geblokkeerde oefening (W8) telt ook niet mee voor W4.
  const long = { ...r, preRun: false, steps: [{ exerciseId: 'couch_stretch', perSideSec: 180 }, { exerciseId: 'couch_stretch', perSideSec: 180 }, { exerciseId: 'couch_stretch', perSideSec: 180 }] };
  assert.ok(codes(routineWarnings(long, ctx())).includes('W4'));
  const cl = codes(routineWarnings(long, ctx({ knee: flare })));
  assert.ok(cl.includes('W8:couch_stretch'));
  assert.ok(!cl.includes('W4'));
});
