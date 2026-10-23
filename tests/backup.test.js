import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDump, sessionsCsv, kneeChecksCsv, weekDoseCsv, weekStart, parseDump as parse, exportReminderDue, DUMP_SCHEMA_VERSION } from '../js/backup.js';
import { DEFAULT_SETTINGS } from '../js/settings.js';
import { copyTemplate } from '../js/routines.js';
import { emptyKneeState, recordKneeCheck, activateFlare } from '../js/knee.js';
import { isoWithOffset } from '../js/session.js';
import { lib, at, HOUR, DAY } from './helpers.js';

const K = lib.meta.knee;
const parseDump = (d, l, o) => parse(d, l, { defaults: DEFAULT_SETTINGS, ...o });

const session = (startMs, extra = {}) => ({
  id: `s${startMs}`, routineId: 'A5', routineName: 'Avond 5 min', slot: 'avond',
  startedAt: isoWithOffset(startMs), endedAt: isoWithOffset(startMs + 300000), tz: 'Europe/Amsterdam',
  plannedSec: 295, activeSec: 294.6, status: 'voltooid',
  segmentsDone: [{ exerciseId: 'gastroc_muur', side: 'L', kind: 'work', sec: 45 }, { exerciseId: 'gastroc_muur', side: 'R', kind: 'work', sec: 45 }],
  stretchIntensity: 5, kneePainDuring: 1, notes: '', ...extra,
});

// Twee dagelijkse kniechecks; de tweede (3/10) zet de opvlammingsmodus aan.
function kneeState() {
  let s = recordKneeCheck(emptyKneeState(), { id: 'a', at: at(0, 8), pain: 1, context: 'dagelijks' }, K).state;
  s = recordKneeCheck(s, { id: 'b', at: at(1, 8), pain: 3, context: 'dagelijks' }, K).state;
  return s;
}

function dump(extra = {}) {
  const knee = kneeState();
  return buildDump({
    routines: [copyTemplate(lib.templates.get('A5'), { id: 'r1', now: at(0) })],
    sessions: [session(at(0))],
    kneeChecks: knee.checks,
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
  assert.deepEqual(r.data.sessions, d.data.sessions);
  assert.deepEqual(r.data.kneeChecks, d.data.kneeChecks);
  assert.deepEqual(r.data.tests, d.data.tests);
  assert.deepEqual(r.data.flare, { active: true, since: at(1, 8), exitProposedAt: null });
  assert.deepEqual(r.data.settings, { voiceOn: true, lastExportAt: at(5) });
  assert.deepEqual(r.counts, { routines: 1, sessions: 1, kneeChecks: 2, tests: 1 });
  // "unlocks" staat leeg in de export (knieslot verwijderd; een oudere
  // versie van de app kan het bestand zo nog lezen) en gaat niet mee terug.
  assert.deepEqual(d.data.unlocks, {});
  assert.equal('unlocks' in r.data, false);
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
  const noList = dump();
  delete noList.data.sessions;
  assert.equal(parseDump(noList, lib, { now: at(5) }).ok, false);
});

test('import: losse kapotte records worden overgeslagen met een melding, de rest komt mee', () => {
  const d = dump();
  d.data.routines.push({ ...d.data.routines[0], id: 'r2', name: 'Oud', steps: [{ exerciseId: 'bestaat_niet', perSideSec: 30 }] });
  d.data.sessions.push({ ...d.data.sessions[0], id: 's-kapot', endedAt: undefined }, { ...d.data.sessions[0], id: 's-0', startedAt: 0 });
  d.data.tests.push({ id: 't2', date: 0, testId: 'aslr', side: 'L', trials: [1], mean: 1, unit: 'graden' }, { id: 't3', date: isoWithOffset(at(0)), testId: 'onbekend', side: 'L', trials: [1] });
  d.data.kneeChecks.push({ id: 'k', at: 'gisteren', pain: 1, context: 'dagelijks' });
  const r = parseDump(d, lib, { now: at(5) });
  assert.equal(r.ok, true, r.errors.join());
  assert.deepEqual(r.counts, { routines: 1, sessions: 1, kneeChecks: 2, tests: 1 });
  assert.ok(r.warnings.some((w) => /Routine 2 \(Oud\) overgeslagen/.test(w)));
  assert.ok(r.warnings.some((w) => /2 sessies overgeslagen/.test(w)));
  assert.ok(r.warnings.some((w) => /2 metingen overgeslagen/.test(w)));
});

test('import: gemiddelde en eenheid van een meting komen uit de pogingen en de bibliotheek', () => {
  const d = dump();
  d.data.tests[0] = { ...d.data.tests[0], mean: 999, unit: 'mijl' };
  const t = parseDump(d, lib, { now: at(5) }).data.tests[0];
  assert.equal(t.mean, 71);
  assert.equal(t.unit, 'graden');
});

test('import: ongeldige opvlammingsmodus weigert; instellingen alleen bekende waarden met het goede type', () => {
  const d = dump();
  d.data.flare = { active: true, since: '2026-10-20T08:00:00+02:00' };
  assert.equal(parseDump(d, lib, { now: at(5) }).ok, false);
  const e = dump();
  e.data.settings = { voiceOn: 'ja', beepVolume: 0.5, weights: { B: 90 }, onbekend: 1, reminders: { morning: '07:15', evening: 'nu' } };
  const st = parseDump(e, lib, { now: at(5) }).data.settings;
  assert.deepEqual(st, { beepVolume: 0.5, reminders: { morning: '07:15' }, lastExportAt: at(5) });
});

test('import: "laatste export" is minstens het moment van de export zelf', () => {
  const d = dump();
  d.data.settings = { lastExportAt: at(1) };
  assert.equal(parseDump(d, lib, { now: at(6) }).data.settings.lastExportAt, at(5));
});

// Een export uit de tijd van het knieslot: de ontgrendelingen gaan niet mee
// (met een melding), de rest wel; oude kniechecks (24u/48u) blijven.
test('import van een oudere export met ontgrendelingen en 24/48-uurschecks', () => {
  const d = dump();
  d.data.unlocks = { couch_stretch: { state: 'vrij', cleanCount: 3, cooldownUntil: null, cycles: [] } };
  d.data.kneeChecks.push({ id: 'c', at: at(2, 9), pain: 1, context: '24u', exerciseId: 'couch_stretch' }, { id: 'd', at: at(3, 9), pain: 0, context: 'test', exerciseId: 'couch_stretch' });
  const r = parseDump(d, lib, { now: at(5) });
  assert.equal(r.ok, true, r.errors.join());
  assert.equal('unlocks' in r.data, false);
  assert.equal(r.data.kneeChecks.length, 4);
  assert.ok(r.warnings.some((w) => /Ontgrendelingen uit het bestand gaan niet mee/.test(w)), r.warnings.join());
  // Zonder "unlocks" (nieuwe export) is ook goed, zonder melding.
  const n = dump();
  delete n.data.unlocks;
  const rn = parseDump(n, lib, { now: at(5) });
  assert.equal(rn.ok, true);
  assert.deepEqual(rn.warnings, []);
});

test('import: een PNF-stap van meer dan 180 s per kant wordt ingekort, niet overgeslagen', () => {
  const d = dump();
  d.data.routines[0].steps.push({ exerciseId: 'hamstring_pnf', pnf: { rounds: 5, contractSec: 10, stretchSec: 60 } });
  const r = parseDump(d, lib, { now: at(5) });
  assert.equal(r.data.routines.length, 1);
  assert.deepEqual(r.data.routines[0].steps.find((st) => st.pnf).pnf, { rounds: 2, contractSec: 10, stretchSec: 60 });
  assert.ok(r.warnings.some((w) => /PNF ingekort/.test(w)), r.warnings.join());
});

test('import: een opvlamming in het bestand blijft aan (de knieregels zijn hard)', () => {
  const d = dump({ flare: activateFlare(emptyKneeState(), at(4)).state.flare });
  assert.deepEqual(parseDump(d, lib, { now: at(5) }).data.flare, { active: true, since: at(4), exitProposedAt: null });
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

test('dosis_per_week.csv: ook de week van de wissel naar wintertijd (25 okt 2026) telt de zondagavond mee', () => {
  // Week van ma 19 okt; zondag 25 okt 23:30 lokale tijd (na de wissel).
  const sun = new Date(2026, 9, 25, 23, 30).getTime();
  const out = weekDoseCsv([session(sun)], lib);
  assert.ok(out.includes('2026-10-19;Kuit: gastrocnemius;45;45;0'), out);
});

test('opslag: readAll en replaceAll heen en terug (geheugenopslag, zoals zonder IndexedDB)', async () => {
  const { openStore, readAll, replaceAll } = await import('../js/store.js');
  const store = await openStore();
  assert.equal(store.persistent, false);
  await store.put('settings', { x: 1 }, 'builderDraft');
  const d = dump().data;
  await replaceAll(store, d);
  const back = await readAll(store);
  assert.deepEqual(back.routines, d.routines);
  assert.deepEqual(back.sessions, d.sessions);
  assert.deepEqual(back.kneeChecks, d.kneeChecks);
  assert.deepEqual(back.tests, d.tests);
  assert.equal('unlocks' in back, false);
  assert.deepEqual(back.flare, d.flare);
  assert.deepEqual(back.settings, d.settings);
  // Een import vervangt alles, ook het concept uit de bouwer.
  assert.equal(await store.get('settings', 'builderDraft'), undefined);
});
