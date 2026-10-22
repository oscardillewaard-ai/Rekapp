import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekRows, suggestionText, suggestionFrequency, maintenanceTipDue, MAINTENANCE_TIP } from '../js/week.js';
import { compileRoutine } from '../js/timeline.js';
import { lib, at, DAY } from './helpers.js';

const tpl = (id) => ({ ...lib.templates.get(id), active: true });
const row = (rows, g) => rows.find((r) => r.group.id === g);

test('"Mijn week" STANDAARD (O10 + A10): waarden gelijk aan §6.4.3, met kleuren', () => {
  const rows = weekRows(lib, { routines: [tpl('O10'), tpl('A10')], sessions: [], now: at(0) });
  assert.equal(rows.length, 24);
  assert.deepEqual(rows.map((r) => r.group.id), [...lib.groups.keys()]);
  assert.equal(row(rows, 'gastrocnemius').plannedSec, 315);
  assert.equal(row(rows, 'gastrocnemius').plannedStatus, 'groen');
  assert.equal(row(rows, 'soleus').plannedSec, 367.5);
  assert.equal(row(rows, 'hamstrings').plannedSec, 630);
  assert.equal(row(rows, 'hamstrings').plannedStatus, 'blauw');
  assert.equal(row(rows, 'heupbuigers').plannedSec, 157.5);
  assert.equal(row(rows, 'heupbuigers').planned.dyn, 297.5);
  assert.equal(row(rows, 'heupbuigers').plannedStatus, 'oranje');
  assert.equal(row(rows, 'heup_buitenkant').plannedStatus, 'grijs'); // alleen dynamisch
  assert.equal(row(rows, 'nek').plannedStatus, 'grijs');
  // Zonder sessies is de werkelijke laag leeg.
  assert.ok(rows.every((r) => r.actualSec === 0 && r.actualStatus === 'grijs'));
});

test('suggestie bij een groep onder 300 s: X = ⌈(300 − gepland) / f⌉ in stappen van 5 s', () => {
  const rows = weekRows(lib, { routines: [tpl('O10'), tpl('A10')], sessions: [], now: at(0) });
  const hb = row(rows, 'heupbuigers');
  assert.deepEqual(hb.suggestion, { perSession: 25, timesPerWeek: 7 }); // (300 − 157,5) / 7 = 20,4 → 25
  assert.equal(suggestionText(hb.suggestion), 'Nodig: 25 s per kant per sessie bij 7× per week');
  assert.equal(row(rows, 'gastrocnemius').suggestion, null); // al ≥ 300
  assert.equal(row(rows, 'nek').suggestion, null); // niet getraind: geen suggestie
  // Alleen dynamisch getraind (0 statisch): wel een suggestie.
  assert.deepEqual(row(rows, 'borstwervels').suggestion, { perSession: 45, timesPerWeek: 7 }); // 300 / 7 = 42,9 → 45
});

test('frequentie voor de suggestie: de vaakst gedane actieve routine', () => {
  assert.equal(suggestionFrequency([{ timesPerWeek: 3 }, { timesPerWeek: 5 }]), 5);
  assert.equal(suggestionFrequency([]), 7);
});

test('inactieve routines tellen niet mee: niet in de geplande dosis en niet in f', () => {
  const a10 = tpl('A10');
  const off = { ...tpl('O10'), id: 'uit', active: false, timesPerWeek: 14 };
  const rows = weekRows(lib, { routines: [a10, off], sessions: [], now: at(0) });
  const only = weekRows(lib, { routines: [a10], sessions: [], now: at(0) });
  assert.deepEqual(rows.map((r) => r.plannedSec), only.map((r) => r.plannedSec));
  const sug = rows.find((r) => r.suggestion);
  assert.equal(sug.suggestion.timesPerWeek, 7); // niet 14 van de inactieve routine
});

test('werkelijke laag: uit de log van de laatste 7 × 24 uur', () => {
  const segs = compileRoutine(lib.templates.get('A10'), lib.exercises, { timing: lib.meta.timing }).segments;
  const segmentsDone = segs.filter((s) => ['work', 'contract', 'relax'].includes(s.kind)).map((s) => ({ exerciseId: s.exerciseId, side: s.side, kind: s.kind, sec: s.durationSec }));
  const sessions = Array.from({ length: 7 }, (_, i) => ({ startedAt: new Date(at(i, 21)).toISOString(), segmentsDone }));
  const rows = weekRows(lib, { routines: [], sessions, now: at(6, 22) });
  assert.equal(row(rows, 'gastrocnemius').actualSec, 315);
  assert.equal(row(rows, 'gastrocnemius').actualStatus, 'groen');
  assert.equal(row(rows, 'gastrocnemius').plannedStatus, 'grijs'); // geen actieve routines
});

test('onderhoudstip: na 12 weken, of als een groep 4 weken op rij ≥ 300 s haalt', () => {
  assert.equal(MAINTENANCE_TIP, 'Onderhoud: ~5 min per week per spiergroep houdt je winst vast');
  assert.equal(maintenanceTipDue(lib, [], at(0)), false);
  const oneOld = [{ startedAt: new Date(at(0)).toISOString(), segmentsDone: [] }];
  assert.equal(maintenanceTipDue(lib, oneOld, at(0) + 83 * DAY), false);
  assert.equal(maintenanceTipDue(lib, oneOld, at(0) + 84 * DAY), true);
  // Vier weken elke dag 45 s gastrocnemius per kant (= 315 s per week).
  const daily = (d) => ({ startedAt: new Date(at(d, 21)).toISOString(), segmentsDone: [
    { exerciseId: 'gastroc_muur', side: 'L', kind: 'work', sec: 45 }, { exerciseId: 'gastroc_muur', side: 'R', kind: 'work', sec: 45 }] });
  const four = Array.from({ length: 28 }, (_, d) => daily(d));
  assert.equal(maintenanceTipDue(lib, four, at(27, 22)), true);
  assert.equal(maintenanceTipDue(lib, four.slice(7), at(27, 22)), false); // pas 3 weken
});
