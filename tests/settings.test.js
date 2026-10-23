import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, withDefaults, audioSessionType } from '../js/settings.js';

test('standaardinstellingen uit §6.11', () => {
  const s = withDefaults(undefined);
  assert.equal(s.soundInSilentMode, true);
  assert.equal(s.mixWithMusic, false);
  assert.equal(s.voiceOn, true);
  assert.equal(s.autoPauseOnHide, true);
  assert.equal(s.sideSwitchSec, 5);
  assert.equal(s.defaultStaticHoldSec, 45);
  assert.equal(s.largeFigure, false); // groot stokfiguur: standaard uit
  assert.equal(s.figure3d, false); // 3D-figuren: standaard uit
  assert.equal('showLocked' in s, false); // knieslot verwijderd
  assert.deepEqual(s.weights, { B: 25, K: 25, D: 20, R: 15, P: 15 });
  assert.equal(Object.values(s.weights).reduce((a, b) => a + b, 0), 100);
});

test('opgeslagen instellingen worden aangevuld, niet overschreven', () => {
  const s = withDefaults({ voiceOn: false, weights: { B: 30 } });
  assert.equal(s.voiceOn, false);
  assert.equal(s.soundInSilentMode, true);
  assert.deepEqual(s.weights, { ...DEFAULT_SETTINGS.weights, B: 30 });
  // Het origineel blijft onaangeroerd.
  assert.equal(DEFAULT_SETTINGS.weights.B, 25);
});

test('audiosessie (§7): mixen → ambient, stille modus → playback, anders auto', () => {
  assert.equal(audioSessionType(withDefaults()), 'playback');
  assert.equal(audioSessionType(withDefaults({ mixWithMusic: true })), 'ambient');
  assert.equal(audioSessionType(withDefaults({ soundInSilentMode: false })), 'auto');
});
