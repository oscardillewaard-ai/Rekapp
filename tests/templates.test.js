// Ontwerpregels voor de sjablonen opwarmen, cooling-down en lenigheid (§6.3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routineWarnings } from '../js/warnings.js';
import { emptyKneeState } from '../js/knee.js';
import { lib } from './helpers.js';

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

test('elk sjabloon: geen blokkade zonder opvlamming en hooguit 15 minuten', () => {
  for (const r of lib.templates.values()) {
    const c = codes(r);
    assert.ok(!c.includes('W1') && !c.includes('W8') && !c.includes('W4'), `${r.id}: ${c.join(',')}`);
  }
});

test('tegels: elk sjabloon staat in precies één tegel; sporten hebben opwarmen en cooling-down', async () => {
  const { templateTiles } = await import('../js/routines.js');
  const tiles = templateTiles(lib.templates.values());
  assert.deepEqual(tiles.map((t) => t.key), ['ochtend', 'avond', 'hardlopen', 'klimmen', 'kracht', 'wandelen', 'lenigheid']);
  const ids = tiles.flatMap((t) => t.templates.map((r) => r.id));
  assert.deepEqual([...ids].sort(), [...lib.templates.keys()].sort());
  assert.deepEqual(tiles.find((t) => t.key === 'ochtend').templates.map((r) => r.id), ['O5', 'O10', 'O15']);
  for (const key of ['hardlopen', 'klimmen', 'kracht', 'wandelen']) {
    assert.deepEqual(tiles.find((t) => t.key === key).templates.map((r) => r.kind), ['opwarmen', 'cooldown'], key);
  }
});
