import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDump, sessionsCsv, kneeChecksCsv, weekDoseCsv, weekStart, parseDump, checkUnlock, exportReminderDue, DUMP_SCHEMA_VERSION } from '../js/backup.js';
import { copyTemplate } from '../js/routines.js';
import { emptyKneeState, startTest, recordExposure, recordKneeCheck } from '../js/knee.js';
import { isoWithOffset } from '../js/session.js';
import { lib, at, HOUR, DAY } from './helpers.js';

const K = lib.meta.knee;
const ALL = { pain7d: true, noLegTrainingToday: true, noHeavyNext48h: true };

const session = (startMs, extra = {}) => ({
  id: `s${startMs}`, routineId: 'A5', routineName: 'Avond 5 min', slot: 'avond',
  startedAt: isoWithOffset(startMs), endedAt: isoWithOffset(startMs + 300000), tz: 'Europe/Amsterdam',
  plannedSec: 295, activeSec: 294.6, status: 'voltooid',
  segmentsDone: [{ exerciseId: 'gastroc_muur', side: 'L', kind: 'work', sec: 45 }, { exerciseId: 'gastroc_muur', side: 'R', kind: 'work', sec: 45 }],
  stretchIntensity: 5, kneePainDuring: 1, notes: '', ...extra,
});

// Volledige, geldige ontgrendelgeschiedenis: proef + 1/1/1/1 → voorlopig.
function voorlopig() {
  let s = startTest(lib.exercises.get('couch_stretch'), emptyKneeState(), at(0), ALL);
  s = recordExposure('couch_stretch', s, { at: at(0), painBefore: 1, painDuring: 1 }, K).state;
  s = recordKneeCheck(s, { id: 'a', at: at(0) + 24 * HOUR, pain: 1, context: '24u', exerciseId: 'couch_stretch' }, K).state;
  s = recordKneeCheck(s, { id: 'b', at: at(0) + 48 * HOUR, pain: 1, context: '48u', exerciseId: 'couch_stretch' }, K).state;
  return s;
}

function dump(extra = {}) {
  const knee = voorlopig();
  return buildDump({
    routines: [copyTemplate(lib.templates.get('A5'), { id: 'r1', now: at(0) })],
    sessions: [session(at(0))],
    kneeChecks: knee.checks,
    unlocks: knee.unlocks,
    tests: [{ id: 't1', date: isoWithOffset(at(0)), testId: 'aslr', side: 'L', trials: [70, 72, 71], mean: 71, unit: 'graden' }],
    flare: knee.flare,
    settings: { voiceOn: true },
    ...extra,
  }, { exportedAt: isoWithOffset(at(5)), librarySchemaVersion: '2.0' });
}

test('JSON-dump met schemaVersion; heen en terug zonder verlies', () => {
  const d = dump();
  assert.equal(d.schemaVersion, DUMP_SCHEMA_VERSION);
  const r = parseDump(JSON.stringify(d), lib, { now: at(5) });
  assert.equal(r.ok, true, r.errors.join('\n'));
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.data.routines, d.data.routines);
  assert.deepEqual(r.data.unlocks, d.data.unlocks);
  assert.equal(r.data.unlocks.couch_stretch.state, 'voorlopig');
  assert.deepEqual(r.counts, { routines: 1, sessions: 1, kneeChecks: 2, tests: 1, unlocks: 1 });
});

test('sessies.csv: kolommen uit §6.9, puntkomma, UTF-8 met BOM, decimale komma, aanhalingstekens waar nodig', () => {
  const out = sessionsCsv([session(at(1, 20, 5), { notes: 'knie; "prima"' })]);
  assert.ok(out.startsWith('﻿datum;tijd;tijdzone;moment;routineId;routineNaam;status;geplandSec;actiefSec;intensiteit;kniepijnTijdens;notities\r\n'));
  const row = out.split('\r\n')[1];
  assert.equal(row, '2026-11-03;20:05;Europe/Amsterdam;avond;A5;Avond 5 min;voltooid;295;294,6;5;1;"knie; ""prima"""');
});

test('kniechecks.csv en lege waarden', () => {
  const out = kneeChecksCsv([{ id: 'x', at: at(2, 7, 30), pain: 2, context: 'dagelijks' }, { id: 'y', at: at(2, 9), pain: 1, context: '24u', exerciseId: 'duif' }]);
  assert.deepEqual(out.split('\r\n').slice(0, 3), ['﻿datum;tijd;pijn;context;oefeningId', '2026-11-04;07:30;2;dagelijks;', '2026-11-04;09:00;1;24u;duif']);
});

test('dosis_per_week.csv: per kalenderweek (ma) en spiergroep, werkelijk uit het logboek', () => {
  // at(0) = ma 2 nov 2026; twee sessies in die week, één in de volgende.
  const out = weekDoseCsv([session(at(0)), session(at(3)), session(at(7))], lib);
  const rows = out.trimEnd().split('\r\n');
  assert.equal(rows[0], '﻿weekStart;spiergroep;secL;secR;secDynamisch');
  assert.ok(rows.includes('2026-11-02;Kuit: gastrocnemius;90;90;0'), rows.join('\n'));
  assert.ok(rows.includes('2026-11-09;Kuit: gastrocnemius;45;45;0'), rows.join('\n'));
  assert.equal(weekStart(at(6, 23)), new Date(2026, 10, 2).getTime()); // zondagavond hoort bij ma 2 nov
});

test('import weigert wat geen Rekapp-export is', () => {
  assert.equal(parseDump('{niet json', lib, { now: at(5) }).ok, false);
  assert.equal(parseDump({ foo: 1 }, lib, { now: at(5) }).ok, false);
  assert.equal(parseDump({ ...dump(), schemaVersion: 99 }, lib, { now: at(5) }).ok, false);
  const d = dump();
  d.data.routines[0].timesPerWeek = 40;
  const r = parseDump(d, lib, { now: at(5) });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /timesPerWeek/.test(e)));
});

// De knieregels zijn hard: een import kan geen oefening vrijgeven zonder de
// cycli die daarbij horen.
test('import: "vrij" zonder drie schone cycli → terug naar vergrendeld', () => {
  const d = dump();
  d.data.unlocks.couch_stretch = { ...d.data.unlocks.couch_stretch, state: 'vrij', cleanCount: 3 };
  const r = parseDump(d, lib, { now: at(5) });
  assert.equal(r.ok, true);
  assert.equal(r.data.unlocks.couch_stretch.state, 'vergrendeld');
  assert.equal(r.data.unlocks.couch_stretch.cleanCount, 0);
  assert.ok(r.warnings.some((w) => /Couch stretch/.test(w)));
});

test('import: cycli als "schoon" gemarkeerd terwijl de waarden dat niet zijn → vergrendeld', () => {
  const d = dump();
  d.data.unlocks.couch_stretch.cycles[0].p48 = 3;
  assert.equal(parseDump(d, lib, { now: at(5) }).data.unlocks.couch_stretch.state, 'vergrendeld');
});

test('import: tijdens een opvlamming mag niets ontgrendeld zijn; niet-vergrendelde oefeningen tellen niet', () => {
  const d = dump();
  d.data.flare = { active: true, since: at(4), exitProposedAt: null };
  d.data.unlocks.gastroc_muur = { state: 'vrij', cleanCount: 3, cooldownUntil: null, cycles: [] };
  const r = parseDump(d, lib, { now: at(5) });
  assert.equal(r.data.unlocks.couch_stretch.state, 'vergrendeld');
  assert.equal(r.data.unlocks.gastroc_muur, undefined);
});

test('checkUnlock: geldige geschiedenis vrij; blootstelling in de toekomst ongeldig', () => {
  const rec = voorlopig().unlocks.couch_stretch;
  assert.deepEqual(checkUnlock(rec, { kneeMeta: K, now: at(5), flareActive: false }), []);
  assert.ok(checkUnlock(rec, { kneeMeta: K, now: at(-1), flareActive: false }).length > 0);
});

test('exportherinnering elke 14 dagen; "Later" wacht een dag', () => {
  const sessions = [session(at(0))];
  assert.equal(exportReminderDue({ lastExportAt: null, sessions: [], now: at(30) }), false);
  assert.equal(exportReminderDue({ lastExportAt: null, sessions, now: at(13) }), false);
  assert.equal(exportReminderDue({ lastExportAt: null, sessions, now: at(14) }), true);
  assert.equal(exportReminderDue({ lastExportAt: at(10), sessions, now: at(23) }), false);
  assert.equal(exportReminderDue({ lastExportAt: at(10), sessions, now: at(24) }), true);
  assert.equal(exportReminderDue({ lastExportAt: at(10), snoozedAt: at(24) - HOUR, sessions, now: at(24) }), false);
  assert.equal(exportReminderDue({ lastExportAt: at(10), snoozedAt: at(24) - DAY, sessions, now: at(24) }), true);
});
