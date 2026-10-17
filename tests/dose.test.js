import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plannedWeekDose, actualWeekDose, routineDose, meterValue, meterStatus, neededPerSession, secondsPerSide } from '../js/dose.js';
import { compileRoutine } from '../js/timeline.js';
import { lib, at, HOUR, DAY, T1 } from './helpers.js';

const tpl = (id) => lib.templates.get(id);
const week = (...ids) => plannedWeekDose(ids.map(tpl), lib.exercises);
const label = (id) => lib.groups.get(id).label;

// §6.4.3, volledige tabel. [groep, MINIMAAL, STANDAARD, MAXIMAAL]; per cel
// [statisch per kant, dynamisch] of null voor "–" (niet geraakt).
const TABLE = [
  ['gastrocnemius', [315, 0], [315, 0], [525, 0]],
  ['soleus', [157.5, 210], [367.5, 210], [787.5, 210]],
  ['hamstrings', [262.5, 175], [630, 175], [630, 385]],
  ['rectus_femoris', [315, 0], [315, 0], [315, 0]],
  ['heupbuigers', [157.5, 297.5], [157.5, 297.5], [157.5, 297.5]],
  ['adductoren', [525, 175], [420, 525], [840, 647.5]],
  ['heup_buitenkant', [0, 87.5], [0, 87.5], [0, 87.5]],
  ['gluteus_max', null, [157.5, 0], [157.5, 0]],
  ['heupdraaiers', null, [315, 280], [315, 525]],
  ['zijkant_romp', null, null, [262.5, 0]],
  ['borstwervels', [0, 280], [0, 805], [0, 805]],
  ['latissimus', [0, 140], [0, 140], [525, 140]],
  ['borst', null, [0, 140], [0, 140]],
];
const NOT_IN_TEMPLATES = ['voetzool', 'scheen', 'quadriceps_vasti', 'onderrug', 'buik', 'nek', 'schouder_voor', 'schouder_achter', 'triceps', 'onderarm_buigers', 'onderarm_strekkers'];

function assertColumn(dose, col) {
  for (const row of TABLE) {
    const [group] = row;
    const cell = row[col];
    const d = dose.get(group);
    if (cell === null) {
      assert.equal(d, undefined, `${label(group)}: verwacht "–"`);
    } else {
      assert.deepEqual(d, { L: cell[0], R: cell[0], dyn: cell[1] }, label(group));
    }
  }
  for (const g of NOT_IN_TEMPLATES) assert.equal(dose.get(g), undefined, `${label(g)}: niet in de sjablonen`);
  assert.equal(dose.size, TABLE.filter((r) => r[col] !== null).length);
}

// §11.1 C. Weekdosis STANDAARD: exact de middelste kolom van §6.4.3.
test('C: weekdosis STANDAARD (O10 + A10, 7×) is exact de middelste kolom van §6.4.3', () => {
  assertColumn(week('O10', 'A10'), 2);
});

test('C: steekproef STANDAARD', () => {
  const d = week('O10', 'A10');
  assert.equal(d.get('gastrocnemius').L, 315);
  assert.equal(d.get('soleus').L, 367.5);
  assert.equal(d.get('hamstrings').L, 630);
  assert.equal(d.get('rectus_femoris').L, 315);
  assert.equal(d.get('heupbuigers').L, 157.5);
  assert.equal(d.get('heupbuigers').dyn, 297.5);
  assert.equal(d.get('adductoren').L, 420);
  assert.equal(d.get('heupdraaiers').L, 315);
});

test('MINIMAAL (O5 + A5) en MAXIMAAL (O15 + A15) kloppen ook met §6.4.3', () => {
  assertColumn(week('O5', 'A5'), 1);
  assertColumn(week('O15', 'A15'), 3);
});

test('D: weekdosis T1 (5× per week)', () => {
  const d = plannedWeekDose([T1], lib.exercises);
  assert.deepEqual(d.get('gastrocnemius'), { L: 225, R: 225, dyn: 0 });
  assert.deepEqual(d.get('soleus'), { L: 262.5, R: 262.5, dyn: 0 });
  assert.deepEqual(d.get('hamstrings'), { L: 300, R: 300, dyn: 0 });
  assert.deepEqual(d.get('heupbuigers'), { L: 0, R: 0, dyn: 150 });
  assert.deepEqual(d.get('onderrug'), { L: 150, R: 150, dyn: 0 });
});

test('E: extra set links, 3× per week: gastrocnemius L 270, R 135; de meter toont 135', () => {
  const r = { timesPerWeek: 3, steps: [{ exerciseId: 'gastroc_muur', perSideSec: 45, extraWeakSide: 'L' }] };
  const d = plannedWeekDose([r], lib.exercises).get('gastrocnemius');
  assert.equal(d.L, 270);
  assert.equal(d.R, 135);
  assert.equal(meterValue(d), 135);
});

test('niet-actieve routines tellen niet mee', () => {
  const r = { ...tpl('A10'), active: false };
  assert.equal(plannedWeekDose([r], lib.exercises).size, 0);
});

test('secondenPerKant: PNF = rondes × (aanspannen + rekken); afwisselend = helft per kant', () => {
  assert.deepEqual(secondsPerSide({ pnf: { rounds: 2, contractSec: 5, stretchSec: 25 } }, lib.exercises.get('hamstring_pnf')), { L: 60, R: 60 });
  assert.deepEqual(secondsPerSide({ durationSec: 60 }, lib.exercises.get('lateraal_shift')), { L: 30, R: 30 });
  assert.deepEqual(secondsPerSide({ durationSec: 60 }, lib.exercises.get('spreidzit_muur')), { L: 60, R: 60 });
});

// Werkelijke dosis: uit segmentsDone, rollend venster van 7 × 24 uur.
function sessionFrom(routine, startedAt) {
  const { segments } = compileRoutine(routine, lib.exercises, { timing: lib.meta.timing });
  return {
    startedAt: new Date(startedAt).toISOString(),
    segmentsDone: segments
      .filter((s) => ['work', 'contract', 'relax'].includes(s.kind))
      .map((s) => ({ exerciseId: s.exerciseId, side: s.side, kind: s.kind, sec: s.durationSec })),
  };
}

test('werkelijk: 7× A10 in de afgelopen week geeft gastrocnemius 315 s, gelijk aan gepland', () => {
  const sessions = Array.from({ length: 7 }, (_, i) => sessionFrom(tpl('A10'), at(i, 21)));
  const actual = actualWeekDose(sessions, lib.exercises, at(6, 22), lib.meta.dose.windowHours);
  const planned = plannedWeekDose([tpl('A10')], lib.exercises);
  assert.equal(actual.get('gastrocnemius').L, 315);
  assert.deepEqual(actual, planned);
});

test('werkelijk: sessies ouder dan 168 uur vallen uit het venster', () => {
  const sessions = [sessionFrom(tpl('A5'), at(0, 21))];
  const dose = (now) => actualWeekDose(sessions, lib.exercises, now, 168).get('gastrocnemius')?.L ?? 0;
  assert.equal(dose(at(0, 21) + 167 * HOUR), 45);
  assert.equal(dose(at(0, 21) + 168 * HOUR), 0);
});

test('werkelijk: een afgebroken sessie telt precies de gelogde seconden', () => {
  const s = { startedAt: new Date(at(0)).toISOString(), segmentsDone: [{ exerciseId: 'gastroc_muur', side: 'L', kind: 'work', sec: 45 }, { exerciseId: 'gastroc_muur', side: 'R', kind: 'work', sec: 12 }] };
  const d = actualWeekDose([s], lib.exercises, at(0) + DAY, 168).get('gastrocnemius');
  assert.equal(d.L, 45);
  assert.equal(d.R, 12);
  assert.equal(meterValue(d), 12);
});

test('meterkleuren: grijs 0, oranje < 300, groen 300–600, blauw > 600', () => {
  const m = lib.meta.dose;
  assert.equal(meterStatus(0, m), 'grijs');
  assert.equal(meterStatus(299.5, m), 'oranje');
  assert.equal(meterStatus(300, m), 'groen');
  assert.equal(meterStatus(600, m), 'groen');
  assert.equal(meterStatus(600.5, m), 'blauw');
});

test('suggestie: X = ⌈(300 − gepland) / f⌉ in stappen van 5 s', () => {
  assert.equal(neededPerSession(157.5, 7, lib.meta.dose), 25); // 20,4 → 25
  assert.equal(neededPerSession(225, 5, lib.meta.dose), 15);
  assert.equal(neededPerSession(300, 5, lib.meta.dose), 0);
});

test('dosis van één sessie', () => {
  assert.deepEqual(routineDose(tpl('A5'), lib.exercises).get('adductoren'), { L: 75, R: 75, dyn: 0 });
});
