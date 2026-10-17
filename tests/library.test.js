import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLibrary, checkedLibrary, rate, computeStars, weightsToPercent, LibraryError } from '../js/library.js';
import { rawLibrary, schema, lib } from './helpers.js';

const errorsFor = (mutate) => {
  const data = rawLibrary();
  mutate(data);
  return validateLibrary(data, schema);
};
const exIn = (data, id) => data.exercises.find((x) => x.id === id);

test('de bibliotheek laadt 70 oefeningen en 24 spiergroepen en de validator slaagt', () => {
  const data = rawLibrary();
  assert.deepEqual(validateLibrary(data, schema), []);
  assert.equal(data.exercises.length, 70);
  assert.equal(data.groups.length, 24);
  assert.equal(data.exercises.filter((x) => x.locked).length, 10);
  assert.equal(data.routines.length, 6);
});

test('verdeling van de sterren is zoals in §3.2', () => {
  const count = {};
  for (const x of lib.exercises.values()) count[x.stars] = (count[x.stars] ?? 0) + 1;
  assert.deepEqual(count, { 5: 3, 4.5: 9, 4: 14, 3.5: 30, 3: 4, 2: 10 });
});

// §11.1 A. Scores en sterren (moeten exact zo uit library.js komen).
const VECTORS_A = [
  ['gastroc_muur', '5·5·4·5·5', 4.80, 5.0, false],
  ['hamstring_pnf', '5·5·5·5·4', 4.85, 5.0, false],
  ['rf_zijlig', '3·4·4·4·4', 3.75, 4.0, false],
  ['heupbuiger_dyn', '4·4·4·5·5', 4.30, 4.5, false],
  ['figuur4_muur', '2·4·4·4·4', 3.50, 3.5, false],
  ['nek_trapezius', '3·5·4·2·5', 3.85, 4.0, false],
  ['quad_hiel_bil', '3·2·3·3·5', 3.05, 2.0, true],
  ['heupbuiger_halfgeknield', '4·2·5·5·4', 3.85, 2.0, true],
  ['kikker', '3·1·5·4·3', 3.05, 2.0, true],
  ['triceps_overhead', '1·5·4·2·5', 3.35, 3.5, false],
];

for (const [id, bkdrp, score, stars, locked] of VECTORS_A) {
  test(`A: ${id} ${bkdrp} → ${score.toFixed(2)}, ${stars.toFixed(1)} sterren, locked ${locked}`, () => {
    const x = lib.exercises.get(id);
    const [B, K, D, R, P] = bkdrp.split('·').map(Number);
    assert.deepEqual(x.scores, { B, K, D, R, P });
    const r = rate(x, lib.meta);
    assert.equal(r.score, score);
    assert.equal(r.stars, stars);
    assert.equal(r.locked, locked);
    // De bibliotheek zelf staat ook zo.
    assert.equal(x.score, score);
    assert.equal(x.stars, stars);
    assert.equal(x.locked, locked);
  });
}

test('halve stap rondt naar boven af, ook waar zwevende komma 3,2499… zou geven', () => {
  const pct = weightsToPercent(lib.meta.scoring.weights);
  // sfinx: 3·4·3·2·4 = 3,25 → 3,5 sterren.
  assert.equal(computeStars({ B: 3, K: 4, D: 3, R: 2, P: 4 }, pct, lib.meta.scoring.kneeGate), 3.5);
  // 3,24 → 3,0 sterren.
  assert.equal(computeStars({ B: 3, K: 4, D: 3, R: 2, P: 4 }, { B: 25, K: 24, D: 21, R: 15, P: 15 }, lib.meta.scoring.kneeGate), 3.0);
  assert.equal(computeStars({ B: 3, K: 3, D: 3, R: 4, P: 3 }, pct, lib.meta.scoring.kneeGate), 3.0);
});

test('negatief: een met de hand verhoogde score wordt geweigerd', () => {
  const errors = errorsFor((d) => { exIn(d, 'rf_zijlig').score = 4.0; });
  assert.ok(errors.some((e) => e.where === 'oefening rf_zijlig' && e.field === 'score'), JSON.stringify(errors));
  assert.throws(() => {
    const d = rawLibrary();
    exIn(d, 'rf_zijlig').score = 4.0;
    checkedLibrary(d, schema);
  }, (e) => e instanceof LibraryError && /rf_zijlig/.test(e.message) && /score/.test(e.message));
});

test('negatief: een afwijking tot 0,005 mag, daarboven niet', () => {
  assert.deepEqual(errorsFor((d) => { exIn(d, 'gastroc_muur').score = 4.805; }), []);
  assert.ok(errorsFor((d) => { exIn(d, 'gastroc_muur').score = 4.81; }).length > 0);
});

test('negatief: met de hand verhoogde sterren worden geweigerd', () => {
  const errors = errorsFor((d) => { exIn(d, 'figuur4_muur').stars = 4; });
  assert.ok(errors.some((e) => e.where === 'oefening figuur4_muur' && e.field === 'stars'), JSON.stringify(errors));
});

test('negatief: een met de hand verhoogde deelscore wordt geweigerd (score klopt dan niet meer)', () => {
  const errors = errorsFor((d) => { exIn(d, 'rf_zijlig').scores.D = 5; });
  assert.ok(errors.some((e) => e.where === 'oefening rf_zijlig' && e.field === 'score'), JSON.stringify(errors));
});

test('negatief: een niet-vergrendelde oefening met K ≤ 2 wordt geweigerd', () => {
  // Alleen locked omzetten: schema (if K ≤ 2 then locked) en §9.2 regel 4 weigeren.
  const errors = errorsFor((d) => { exIn(d, 'kikker').locked = false; });
  assert.ok(errors.length > 0);
  assert.ok(errors.every((e) => e.where === 'oefening kikker'), JSON.stringify(errors));
  // Ook als iemand de sterren netjes meeverhoogt.
  const errors2 = errorsFor((d) => {
    const k = exIn(d, 'kikker');
    k.locked = false;
    k.stars = 3;
  });
  assert.ok(errors2.some((e) => e.where === 'oefening kikker'), JSON.stringify(errors2));
});

test('negatief: §9.2 regel 4 los van het schema: K ≤ 2 ⇒ locked, en omgekeerd', () => {
  // Zonder schemacontrole (leeg schema) moet de inhoudsregel het zelf vangen.
  const d = rawLibrary();
  exIn(d, 'kikker').locked = false;
  const errors = validateLibrary(d, {});
  assert.ok(errors.some((e) => e.where === 'oefening kikker' && e.field === 'locked'), JSON.stringify(errors));

  const d2 = rawLibrary();
  exIn(d2, 'gastroc_muur').locked = true;
  const errors2 = validateLibrary(d2, {});
  assert.ok(errors2.some((e) => e.where === 'oefening gastroc_muur' && e.field === 'locked'), JSON.stringify(errors2));
});

test('negatief: niet-vergrendeld met kneeFlexionMaxDeg 100 wordt geweigerd; vergrendeld mag', () => {
  const errors = errorsFor((d) => { exIn(d, 'gastroc_muur').kneeFlexionMaxDeg = 100; });
  assert.ok(errors.some((e) => e.where === 'oefening gastroc_muur'), JSON.stringify(errors));
  assert.deepEqual(errorsFor((d) => { exIn(d, 'kikker').kneeFlexionMaxDeg = 100; }), []);
});

test('negatief: B wijkt af van de groep (−1 voor dynamisch, tenzij bNote)', () => {
  const errors = errorsFor((d) => {
    const x = exIn(d, 'enkel_rock'); // dynamisch, soleus bBase 4 → B 3
    x.scores.B = 4;
    x.score = 4.3;
    x.stars = 4.5;
    x.evidenceLevel = 'matig';
  });
  assert.ok(errors.some((e) => e.where === 'oefening enkel_rock' && e.field === 'scores.B'), JSON.stringify(errors));
});

test('negatief: een sjabloon met een vergrendelde oefening of een verkeerde tijd wordt geweigerd', () => {
  const errors = errorsFor((d) => {
    d.routines.find((r) => r.id === 'A5').steps[1].exerciseId = 'couch_stretch';
  });
  assert.ok(errors.some((e) => e.where === 'sjabloon A5' && /vergrendelde oefening couch_stretch/.test(e.message)), JSON.stringify(errors));
  const errors2 = errorsFor((d) => { d.routines.find((r) => r.id === 'O5').expectedTotalSec = 300; });
  assert.ok(errors2.some((e) => e.where === 'sjabloon O5' && e.field === 'expectedTotalSec'), JSON.stringify(errors2));
});

test('negatief: onbekende spiergroep, eerste doel met gewicht 0,5, dubbele id', () => {
  assert.ok(errorsFor((d) => { exIn(d, 'gastroc_muur').targets[1].group = 'kuit'; })
    .some((e) => e.field === 'targets[1].group'));
  assert.ok(errorsFor((d) => { exIn(d, 'gastroc_muur').targets[0].weight = 0.5; })
    .some((e) => e.field === 'targets[0].weight'));
  assert.ok(errorsFor((d) => { exIn(d, 'gastroc_trede').id = 'gastroc_muur'; })
    .some((e) => /dubbele id/.test(e.message)));
});

test('negatief: spiergroep met maar één oefening als primair doel', () => {
  const errors = errorsFor((d) => { d.exercises = d.exercises.filter((x) => x.id !== 'nek_levator'); });
  assert.ok(errors.some((e) => e.where === 'spiergroep nek'), JSON.stringify(errors));
});

test('een eigen weging verandert de sterren, niet de knie-poort', () => {
  const kikker = lib.exercises.get('kikker');
  const triceps = lib.exercises.get('triceps_overhead');
  const custom = { B: 0, K: 0, D: 100, R: 0, P: 0 };
  assert.equal(rate(triceps, lib.meta, custom).stars, 4); // D = 4
  const r = rate(kikker, lib.meta, custom); // D = 5, maar K = 1
  assert.equal(r.score, 5);
  assert.equal(r.stars, 2);
  assert.equal(r.locked, true);
});
