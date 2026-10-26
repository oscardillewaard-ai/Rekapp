// Sets met rust ertussen (§6.3, §6.8.1). Met 1 set verandert er niets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileRoutine } from '../js/timeline.js';
import { secondsPerSide } from '../js/dose.js';
import { formatDose } from '../js/format.js';
import { speechFor, displayFor, SPOKEN } from '../js/cues.js';
import { createPlayer, start, next, back } from '../js/engine.js';
import { stepDoseErrors } from '../js/library.js';
import { newStep, setSets, setRest, validateUserRoutine } from '../js/routines.js';
import { lib, ex } from './helpers.js';

const timing = lib.meta.timing;
const compile = (steps) => compileRoutine({ steps }, lib.exercises, { timing, sideSwitchSec: 5 });
const shape = (segs) => segs.map((s) => `${s.kind}${s.side ?? ''}${s.setNo ? `:${s.setNo}/${s.setCount}` : ''}`);

test('unilateraal met 3 sets: per set links en rechts, rust ertussen', () => {
  const { segments, totalSec } = compile([{ exerciseId: 'gastroc_muur', perSideSec: 40, sets: 3, restSec: 60 }]);
  assert.deepEqual(shape(segments), [
    'prep',
    'workL:1/3', 'switch', 'workR:1/3', 'rest:2/3',
    'workL:2/3', 'switch', 'workR:2/3', 'rest:3/3',
    'workL:3/3', 'switch', 'workR:3/3',
  ]);
  assert.equal(totalSec, 5 + 3 * (40 + 5 + 40) + 2 * 60);
  assert.equal(segments.find((s) => s.kind === 'rest').durationSec, 60);
});

test('bilateraal met 2 sets, en de extra set zwakke kant pas na de laatste set', () => {
  assert.deepEqual(shape(compile([{ exerciseId: 'hamstring_zittend_vouw', durationSec: 30, sets: 2, restSec: 20 }]).segments),
    ['prep', 'work:1/2', 'rest:2/2', 'work:2/2']);
  const segs = compile([{ exerciseId: 'gastroc_muur', perSideSec: 30, sets: 2, restSec: 30, extraWeakSide: 'L' }]).segments;
  assert.deepEqual(shape(segs), ['prep', 'workL:1/2', 'switch', 'workR:1/2', 'rest:2/2', 'workL:2/2', 'switch', 'workR:2/2', 'switch', 'workL']);
  assert.equal(segs.at(-1).set, 'extra');
});

test('1 set (of geen sets) geeft precies dezelfde tijdlijn als voorheen', () => {
  const plain = compile([{ exerciseId: 'gastroc_muur', perSideSec: 45 }, { exerciseId: 'soleus_muur', perSideSec: 30 }]);
  const one = compile([{ exerciseId: 'gastroc_muur', perSideSec: 45, sets: 1 }, { exerciseId: 'soleus_muur', perSideSec: 30 }]);
  assert.deepEqual(one, plain);
  assert.ok(plain.segments.every((s) => s.setNo === undefined && s.kind !== 'rest'));
});

test('dosis telt elke set; de extra set zwakke kant één keer', () => {
  assert.deepEqual(secondsPerSide({ perSideSec: 40, sets: 3, restSec: 60 }, ex('gastroc_muur')), { L: 120, R: 120 });
  assert.deepEqual(secondsPerSide({ perSideSec: 30, sets: 2, restSec: 30, extraWeakSide: 'R' }, ex('gastroc_muur')), { L: 60, R: 90 });
  assert.deepEqual(secondsPerSide({ durationSec: 30, sets: 2, restSec: 20 }, ex('hamstring_zittend_vouw')), { L: 60, R: 60 });
});

test('dosis in woorden', () => {
  assert.equal(formatDose({ perSideSec: 40, reps: 10, sets: 3, restSec: 60 }, ex('gastroc_muur')), '3 × 40 s per kant · 10 herhalingen · 60 s rust');
  assert.equal(formatDose({ perSideSec: 40, sets: 1 }, ex('gastroc_muur')), '40 s per kant');
});

test('spraak en beeld: "Set 2 van 3." bij het begin van de set, "Rust." ertussen', () => {
  const { segments } = compile([{ exerciseId: 'gastroc_muur', perSideSec: 40, sets: 3, restSec: 60 }]);
  const i = (k) => segments.findIndex((s) => shape([s])[0] === k);
  assert.equal(speechFor(segments, i('workL:2/3'), lib.exercises), 'Set 2 van 3. Linkerkant. Kuit tegen de muur. 40 seconden.');
  assert.equal(speechFor(segments, i('workR:2/3'), lib.exercises), 'Rechterkant. Kuit tegen de muur. 40 seconden.');
  assert.equal(speechFor(segments, i('rest:2/3'), lib.exercises), `${SPOKEN.rest} 60 seconden.`);
  const d = displayFor(segments, i('rest:2/3'), lib.exercises);
  assert.equal(d.label, 'Rust · straks set 2 van 3');
  assert.equal(d.sideLabel, 'Links');
  assert.equal(d.upcoming, segments[i('workL:2/3')]);
  assert.equal(displayFor(segments, i('workR:1/3'), lib.exercises).label, 'Rekken · set 1 van 3');
});

test('⏭ tijdens de rust start de volgende set; ⏮ gaat naar set 1', () => {
  const { segments } = compile([
    { exerciseId: 'gastroc_muur', perSideSec: 40, sets: 2, restSec: 60 },
    { exerciseId: 'soleus_muur', perSideSec: 30 },
  ]);
  const rest = segments.findIndex((s) => s.kind === 'rest');
  let s = start(createPlayer(segments), 0).state;
  s = { ...s, segmentIndex: rest, segmentStartedAt: 0 };
  const n = next(s, 1000).state;
  assert.equal(n.segmentIndex, rest + 1);
  assert.equal(segments[n.segmentIndex].setNo, 2);
  const b = back(s, 1000).state;
  assert.equal(b.segmentIndex, 1);
  // Rust telt niet als gedaan werk.
  assert.equal(n.segmentsDone.length, 0);
});

test('validatie: geen sets bij PNF, rust verplicht vanaf 2 sets, 1–5 sets', () => {
  const pnf = [...lib.exercises.values()].find((x) => x.type === 'pnf');
  const codes = (step, x) => stepDoseErrors(step, x).map((e) => e.field);
  assert.deepEqual(codes({ ...pnf.defaultDose, sets: 2, restSec: 30 }, pnf), ['sets']);
  assert.deepEqual(codes({ perSideSec: 40, sets: 2 }, ex('gastroc_muur')), ['restSec']);
  assert.deepEqual(codes({ perSideSec: 40, sets: 1, restSec: 30 }, ex('gastroc_muur')), ['restSec']);
  assert.deepEqual(codes({ perSideSec: 40, sets: 6, restSec: 30 }, ex('gastroc_muur')), ['sets']);
  assert.deepEqual(codes({ perSideSec: 40, sets: 3, restSec: 5 }, ex('gastroc_muur')), ['restSec']);
  assert.deepEqual(codes({ perSideSec: 40, sets: 3, restSec: 60 }, ex('gastroc_muur')), []);
  const r = { id: 'x', name: 'x', slot: 'vrij', preRun: false, timesPerWeek: 3, active: true, steps: [{ exerciseId: 'gastroc_muur', perSideSec: 40, sets: 2 }] };
  assert.equal(validateUserRoutine(r, lib.exercises).length, 1);
});

test('bouwer: sets 1–5 met standaard 60 s rust; terug naar 1 haalt de rust weg', () => {
  let s = newStep(ex('gastroc_muur'));
  assert.equal(s.sets, undefined);
  s = setSets(s, 2);
  assert.deepEqual([s.sets, s.restSec], [2, 60]);
  s = setRest(setSets(s, 9), 300);
  assert.deepEqual([s.sets, s.restSec], [5, 180]);
  s = setRest(s, 3);
  assert.equal(s.restSec, 10);
  s = setSets(s, 1);
  assert.equal('sets' in s || 'restSec' in s, false);
  // Een standaarddosis met sets gaat mee in een nieuwe stap.
  const x = { ...ex('gastroc_muur'), defaultDose: { perSideSec: 40, reps: 10, sets: 3, restSec: 45 } };
  assert.deepEqual(newStep(x), { exerciseId: 'gastroc_muur', perSideSec: 40, reps: 10, sets: 3, restSec: 45 });
});
