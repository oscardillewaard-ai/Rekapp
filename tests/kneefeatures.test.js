// Kniefuncties (§6.11, keuze Oscar): standaard uit. Uit betekent geen K in de
// sterren, geen opvlammingsmodus en geen knie-informatie; aan werkt alles
// zoals voorheen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withDefaults, migrateKneeFeatures, ratingWeights } from '../js/settings.js';
import { rate, weightsToPercent } from '../js/library.js';
import { emptyKneeState, activateFlare, effectiveKnee, access } from '../js/knee.js';
import { playableRoutine, routineWarnings } from '../js/warnings.js';
import { lib, at } from './helpers.js';

test('Kniefuncties staan standaard uit', () => {
  assert.equal(withDefaults(undefined).kneeFeatures, false);
  assert.equal(withDefaults({ kneeFeatures: true }).kneeFeatures, true);
});

test('bestaande gebruikers met kniegegevens houden Kniefuncties aan', () => {
  const none = emptyKneeState();
  const checked = { ...none, checks: [{ id: 'a', at: at(0), pain: 1, context: 'dagelijks' }] };
  const flare = activateFlare(none, at(0)).state;
  const unknown = { ...flare, unknown: true };
  // Nieuwe installatie (nog geen opgeslagen instellingen): uit.
  assert.equal(migrateKneeFeatures(null, checked), null);
  // Opgeslagen instellingen van vóór de schakelaar.
  assert.equal(migrateKneeFeatures({ voiceOn: true }, none), null);
  assert.equal(migrateKneeFeatures({ voiceOn: true }, checked), true);
  assert.equal(migrateKneeFeatures({ voiceOn: true }, flare), true);
  assert.equal(migrateKneeFeatures({ voiceOn: true }, unknown), true);
  // Al een keuze gemaakt: die blijft.
  assert.equal(migrateKneeFeatures({ kneeFeatures: false }, flare), null);
});

test('zonder Kniefuncties tellen B, D, R en P naar verhouding; met Kniefuncties de gewone score', () => {
  const on = withDefaults({ kneeFeatures: true });
  const off = withDefaults();
  assert.deepEqual(ratingWeights(on), { B: 25, K: 25, D: 20, R: 15, P: 15 });
  assert.deepEqual(ratingWeights(off), { B: 25, K: 0, D: 20, R: 15, P: 15 });
  const std = weightsToPercent(lib.meta.scoring.weights);
  for (const ex of lib.exercises.values()) {
    // Met Kniefuncties: precies de score en sterren van §3.2 (zonder kniecap).
    assert.deepEqual(rate(ex, lib.meta, ratingWeights(on)), rate(ex, lib.meta, std), ex.id);
    // Zonder: (25·B + 20·D + 15·R + 15·P) / 75, sterren op 0,5 met een halve
    // stap naar boven. Exact: in 75-sten rekenen.
    const { B, D, R, P } = ex.scores;
    const h = 25 * B + 20 * D + 15 * R + 15 * P;
    const r = rate(ex, lib.meta, ratingWeights(off));
    assert.equal(r.score, Math.round((h * 100) / 75) / 100, ex.id);
    // Sterren s zo dat s − 0,25 ≤ score < s + 0,25 (score = h / 75).
    assert.ok(4 * h >= 75 * (4 * r.stars - 1) && 4 * h < 75 * (4 * r.stars + 1), `${ex.id}: ${h / 75} → ${r.stars}`);
  }
});

test('zonder Kniefuncties: een halve stap rondt exact naar boven af', () => {
  // B = D = R = P = 3 en een score die precies op x,25 of x,75 valt.
  const ex = { scores: { B: 4, K: 1, D: 3, R: 3, P: 3 } };
  // (25·4 + 20·3 + 15·3 + 15·3) / 75 = 250 / 75 = 3,33 → 3,5
  assert.deepEqual(rate(ex, lib.meta, { B: 25, K: 0, D: 20, R: 15, P: 15 }), { score: 3.33, stars: 3.5 });
  // Gelijke gewichten: (5 + 4 + 4 + 4) / 4 = 4,25 → 4,5 (halve stap omhoog).
  const eq = { scores: { B: 5, K: 1, D: 4, R: 4, P: 4 } };
  assert.deepEqual(rate(eq, lib.meta, { B: 20, K: 0, D: 20, R: 20, P: 20 }), { score: 4.25, stars: 4.5 });
  // Alles op 0: dan de standaardweging.
  assert.deepEqual(rate(eq, lib.meta, { B: 0, K: 0, D: 0, R: 0, P: 0 }), rate(eq, lib.meta));
});

test('zonder Kniefuncties geldt geen opvlamming (W8), met Kniefuncties wel', () => {
  const flare = activateFlare(emptyKneeState(), at(0)).state;
  const rf = lib.exercises.get('rf_zijlig');
  assert.equal(access(rf, effectiveKnee(flare, true), lib.meta.knee).allowed, false);
  assert.equal(access(rf, effectiveKnee(flare, false), lib.meta.knee).allowed, true);
  // De opgeslagen status blijft onaangeroerd.
  assert.equal(flare.flare.active, true);
  const a5 = lib.templates.get('A5');
  assert.equal(playableRoutine(a5, { lib, knee: effectiveKnee(flare, false) }).removed.length, 0);
  assert.ok(playableRoutine(a5, { lib, knee: effectiveKnee(flare, true) }).removed.length > 0);
  const codes = (knee) => routineWarnings(a5, { lib, knee, otherRoutines: [], now: at(0), sideSwitchSec: 5 }).map((w) => w.code);
  assert.ok(codes(effectiveKnee(flare, true)).includes('W8'));
  assert.ok(!codes(effectiveKnee(flare, false)).includes('W8'));
  // Zonder Kniefuncties ook geen kniechecks.
  assert.deepEqual(effectiveKnee({ ...flare, checks: [{ id: 'a', at: at(0), pain: 3, context: 'dagelijks' }] }, false).checks, []);
});
