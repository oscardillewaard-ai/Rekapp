import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLibrary, checkedLibrary, rate, computeScore, computeStars, mustBeLocked, weightsToPercent, LibraryError } from '../js/library.js';
import { isTraining } from '../js/types.js';
import { rawLibrary, schema, lib } from './helpers.js';

const errorsFor = (mutate) => {
  const data = rawLibrary();
  mutate(data);
  return validateLibrary(data, schema);
};
const exIn = (data, id) => data.exercises.find((x) => x.id === id);

test('de bibliotheek laadt 70 rekoefeningen, 14 trainingsoefeningen en 25 spiergroepen en de validator slaagt', () => {
  const data = rawLibrary();
  assert.deepEqual(validateLibrary(data, schema), []);
  const stretches = data.exercises.filter((x) => !isTraining(x));
  assert.equal(stretches.length, 70);
  assert.equal(data.exercises.length, 84);
  assert.deepEqual(Object.fromEntries(['heupen', 'enkels'].map((f) => [f, data.exercises.filter((x) => x.focus === f).length])), { heupen: 6, enkels: 8 });
  assert.equal(data.groups.length, 25);
  assert.equal(stretches.filter((x) => x.locked).length, 10);
  assert.equal(data.exercises.filter((x) => x.locked).length, 13);
  assert.equal(data.routines.length, 19);
  const kinds = {};
  for (const r of data.routines) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
  assert.deepEqual(kinds, { dagelijks: 6, opwarmen: 4, cooldown: 4, lenigheid: 3, training: 2 });
});

test('verdeling van de sterren is zoals in §3.2', () => {
  const count = (list) => {
    const c = {};
    for (const x of list) c[x.stars] = (c[x.stars] ?? 0) + 1;
    return c;
  };
  const all = [...lib.exercises.values()];
  assert.deepEqual(count(all.filter((x) => !isTraining(x))), { 5: 3, 4.5: 9, 4: 14, 3.5: 30, 3: 4, 2: 10 });
  assert.deepEqual(count(all.filter(isTraining)), { 4.5: 1, 4: 5, 3.5: 3, 3: 2, 2: 3 });
});

test('trainingsoefeningen: bNote en focus verplicht, focus alleen bij training, B los van de groep', () => {
  const noNote = errorsFor((d) => { delete exIn(d, 'zijsteun').bNote; });
  assert.ok(noNote.some((e) => e.where === 'oefening zijsteun' && e.field === 'bNote'), JSON.stringify(noNote));
  const noFocus = errorsFor((d) => { delete exIn(d, 'zijsteun').focus; });
  assert.ok(noFocus.some((e) => e.where === 'oefening zijsteun' && e.field === 'focus'), JSON.stringify(noFocus));
  const stretchFocus = errorsFor((d) => { exIn(d, 'gastroc_muur').focus = 'enkels'; });
  assert.ok(stretchFocus.some((e) => e.where === 'oefening gastroc_muur' && e.field === 'focus'), JSON.stringify(stretchFocus));
  // B4 bij een groep met bBase 2 is in orde: training volgt de eigen rubriek.
  assert.equal(lib.exercises.get('heup_abductie_zij').scores.B, 4);
  assert.equal(lib.groups.get('heup_buitenkant').bBase, 2);
});

// §11.1 A. Scores en sterren (moeten exact zo uit library.js komen). De
// validator rekent ze zo na, met de knie-poort; de weergave (rate) toont de
// sterren sinds het besluit van Oscar zonder kniecap (AFWIJKINGEN.md).
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
    const pct = weightsToPercent(lib.meta.scoring.weights);
    assert.equal(computeScore(x.scores, pct), score);
    assert.equal(computeStars(x.scores, pct, lib.meta.scoring.kneeGate), stars);
    assert.equal(mustBeLocked(x, lib.meta), locked);
    // Weergave: dezelfde score, sterren zonder kniecap.
    const r = rate(x, lib.meta);
    assert.equal(r.score, score);
    assert.equal(r.stars, locked ? Math.floor(score * 2 + 0.5) / 2 : stars);
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
  // Soort en sport horen bij elkaar; een dagelijks sjabloon is ochtend of avond.
  const errors3 = errorsFor((d) => { delete d.routines.find((r) => r.id === 'OW-LOOP').sport; d.routines.find((r) => r.id === 'LN-HEUP').sport = 'klimmen'; d.routines.find((r) => r.id === 'A5').slot = 'vrij'; });
  assert.ok(errors3.some((e) => e.where === 'sjabloon OW-LOOP' && e.field === 'sport'), JSON.stringify(errors3));
  assert.ok(errors3.some((e) => e.where === 'sjabloon LN-HEUP' && e.field === 'sport'), JSON.stringify(errors3));
  assert.ok(errors3.some((e) => e.where === 'sjabloon A5' && e.field === 'slot'), JSON.stringify(errors3));
  const errors4 = errorsFor((d) => { d.routines.find((r) => r.id === 'CD-WANDEL').sport = 'klimmen'; });
  assert.ok(errors4.some((e) => e.where === 'sport klimmen'), JSON.stringify(errors4));
  assert.ok(errors4.some((e) => e.where === 'sport wandelen'), JSON.stringify(errors4));
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

test('een eigen weging verandert de getoonde sterren; geen kniecap meer in de weergave', () => {
  const kikker = lib.exercises.get('kikker');
  const triceps = lib.exercises.get('triceps_overhead');
  const custom = { B: 0, K: 0, D: 100, R: 0, P: 0 };
  assert.equal(rate(triceps, lib.meta, custom).stars, 4); // D = 4
  const r = rate(kikker, lib.meta, custom); // D = 5, K = 1
  assert.equal(r.score, 5);
  assert.equal(r.stars, 5);
  assert.equal('locked' in r, false);
  // Standaardweging: kikker 3,05 → 3 sterren getoond; in de bibliotheek 2.
  assert.equal(rate(kikker, lib.meta).stars, 3);
  assert.equal(kikker.stars, 2);
});
