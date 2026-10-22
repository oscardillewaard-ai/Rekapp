// Export en import (§6.9). Puur: maakt de JSON-dump en de drie CSV-bestanden
// en controleert een dump vóór het importeren. Lezen en schrijven in
// IndexedDB doet store.js.
import { actualWeekDose } from './dose.js';
import { validateUserRoutine } from './routines.js';

export const DUMP_SCHEMA_VERSION = 1;
const DAY = 24 * 3600 * 1000;
const STATES = ['vergrendeld', 'test', 'voorlopig', 'vrij'];
const CONTEXTS = ['dagelijks', 'test', '24u', '48u'];
const RESULTS = [null, 'schoon', 'niet schoon', 'vervallen', 'opvlamming'];

// ---------- JSON ----------

// data: { routines, sessions, kneeChecks, unlocks: {exerciseId: rec}, tests,
// flare, settings }. exportedAt: ISO-tijd met tijdzone.
export function buildDump(data, { exportedAt, librarySchemaVersion }) {
  return {
    schemaVersion: DUMP_SCHEMA_VERSION,
    app: 'Rekapp',
    exportedAt,
    librarySchemaVersion,
    data: {
      routines: data.routines ?? [],
      sessions: data.sessions ?? [],
      kneeChecks: data.kneeChecks ?? [],
      unlocks: data.unlocks ?? {},
      tests: data.tests ?? [],
      flare: data.flare ?? { active: false, since: null, exitProposedAt: null },
      settings: data.settings ?? null,
    },
  };
}

// ---------- CSV ----------
// Puntkomma als scheidingsteken, UTF-8 met BOM (§6.9), regeleinden CRLF.
// Getallen met een decimale komma, zodat Excel met Nederlandse instellingen
// ze als getal leest.

const BOM = '﻿';
function cell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return String(Math.round(v * 10) / 10).replace('.', ',');
  const s = String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csv = (header, rows) => BOM + [header, ...rows.map((r) => r.map(cell).join(';'))].join('\r\n') + '\r\n';

const pad = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Datum en tijd zoals ze in de sessie staan (lokale tijd van dat moment).
function isoParts(iso) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso ?? '');
  return m ? [m[1], m[2]] : ['', ''];
}

export function sessionsCsv(sessions) {
  const rows = [...sessions].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt)).map((s) => {
    const [datum, tijd] = isoParts(s.startedAt);
    return [datum, tijd, s.tz, s.slot, s.routineId, s.routineName, s.status, s.plannedSec, s.activeSec, s.stretchIntensity, s.kneePainDuring, s.notes];
  });
  return csv('datum;tijd;tijdzone;moment;routineId;routineNaam;status;geplandSec;actiefSec;intensiteit;kniepijnTijdens;notities', rows);
}

// Kniechecks hebben een tijdstip in ms; datum en tijd in de tijdzone van het
// toestel bij het exporteren.
export function kneeChecksCsv(checks) {
  const rows = [...checks].sort((a, b) => a.at - b.at).map((c) => {
    const d = new Date(c.at);
    return [localDate(d), localTime(d), c.pain, c.context, c.exerciseId ?? ''];
  });
  return csv('datum;tijd;pijn;context;oefeningId', rows);
}

// Maandag 00:00 lokale tijd van de week waarin ms valt.
export function weekStart(ms) {
  const d = new Date(ms);
  const back = (d.getDay() + 6) % 7; // ma = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime();
}

// Werkelijke dosis per kalenderweek (ma–zo) en spiergroep, uit het logboek;
// alleen groepen die die week iets kregen.
export function weekDoseCsv(sessions, lib) {
  const weeks = [...new Set(sessions.map((s) => weekStart(Date.parse(s.startedAt))))].sort((a, b) => a - b);
  const rows = [];
  for (const start of weeks) {
    const end = new Date(start);
    end.setDate(end.getDate() + 7); // ook goed rond de zomertijdwissel
    const dose = actualWeekDose(sessions, lib.exercises, end.getTime() - 1, (end.getTime() - 1 - (start - 1)) / 3600000);
    for (const g of lib.groups.values()) {
      const d = dose.get(g.id);
      if (!d || (!d.L && !d.R && !d.dyn)) continue;
      rows.push([localDate(new Date(start)), g.label, d.L, d.R, d.dyn]);
    }
  }
  return csv('weekStart;spiergroep;secL;secR;secDynamisch', rows);
}

// ---------- Import ----------

const HOUR = 3600 * 1000;
const isPain = (v) => Number.isInteger(v) && v >= 0 && v <= 10;
const isPainOrNull = (v) => v === null || isPain(v);
const isTime = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isTimeOrNull = (v) => v === null || v === undefined || isTime(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
// ISO-tijd met tijdzone zoals session.js die maakt (2026-11-02T08:15:00+01:00).
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const isIso = (v) => typeof v === 'string' && ISO.test(v) && !Number.isNaN(Date.parse(v));
const SESSION_STATUS = ['voltooid', 'gedeeltelijk', 'afgebroken'];
const SEGMENT_KINDS = ['prep', 'work', 'contract', 'relax', 'switch', 'transition'];

// Schone cyclus volgens §6.6, nagerekend uit de waarden.
function reallyClean(c, kneeMeta) {
  const max = kneeMeta.painMax;
  return [c.painBefore, c.painDuring, c.p24, c.p48].every(isPain)
    && c.painDuring <= max && c.p24 <= max && c.p24 <= c.painBefore && c.p48 <= max && c.p48 <= c.painBefore;
}

// Klopt één ontgrendeling met haar eigen geschiedenis? De knieregels zijn
// hard: een import mag een oefening niet verder brengen dan de cycli dragen.
// - Een schone cyclus heeft alle waarden binnen de grenzen, en de 24- en
//   48-uurscheck konden toen al (blootstelling ≥ 44 uur vóór nu en vóór de
//   volgende blootstelling).
// - De teller is precies het aantal schone cycli sinds de laatste keer dat
//   hij op 0 ging (een niet-schone cyclus of een opvlamming, `resetAt`).
// - De status past bij die teller: test 0, voorlopig 1–2, vrij 3;
//   vergrendeld 0 en geen lopende cyclus.
export function checkUnlock(rec, { kneeMeta, now }) {
  const problems = [];
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return ['geen geldige gegevens'];
  if (!STATES.includes(rec.state)) problems.push(`onbekende status "${rec.state}"`);
  if (!Number.isInteger(rec.cleanCount) || rec.cleanCount < 0) problems.push('teller ongeldig');
  if (!isTimeOrNull(rec.cooldownUntil)) problems.push('afkoelperiode ongeldig');
  if (!isTimeOrNull(rec.resetAt) || rec.resetAt > now) problems.push('resetmoment ongeldig');
  if (!Array.isArray(rec.cycles)) return [...problems, 'cycli ontbreken'];
  const w = kneeMeta.checkWindowsHours;
  const cycles = rec.cycles;
  cycles.forEach((c, i) => {
    const where = `cyclus ${i + 1}`;
    if (!c || typeof c !== 'object' || !isTime(c.exposureAt) || c.exposureAt > now) { problems.push(`${where}: tijdstip ongeldig`); return; }
    const next = cycles[i + 1];
    if (next && isTime(next.exposureAt) && next.exposureAt < c.exposureAt) problems.push(`${where}: niet op volgorde`);
    if (!RESULTS.includes(c.result)) problems.push(`${where}: onbekende uitslag`);
    if (![c.painBefore, c.painDuring, c.p24, c.p48].every(isPainOrNull)) problems.push(`${where}: pijnwaarde ongeldig`);
    if (c.p24 !== null && c.p24 !== undefined && now < c.exposureAt + w.h24[0] * HOUR) problems.push(`${where}: 24-uurscheck vóór het venster`);
    if (c.p48 !== null && c.p48 !== undefined && now < c.exposureAt + w.h48[0] * HOUR) problems.push(`${where}: 48-uurscheck vóór het venster`);
    if (c.result === null) {
      if (i !== cycles.length - 1) problems.push(`${where}: loopt nog maar is niet de laatste`);
      if (c.p48 !== null && c.p48 !== undefined) problems.push(`${where}: loopt nog maar heeft een 48-uurscheck`);
    }
    if (c.result === 'schoon') {
      if (!reallyClean(c, kneeMeta)) problems.push(`${where}: staat als schoon maar de waarden zijn dat niet`);
      if (next && isTime(next.exposureAt) && next.exposureAt < c.exposureAt + w.h48[0] * HOUR) problems.push(`${where}: schoon, maar de volgende blootstelling kwam vóór de 48-uurscheck`);
    }
  });
  if (problems.length) return problems;

  // Tellen vanaf de laatste reset.
  const lastBreak = [...cycles].reverse().find((c) => c.result === 'niet schoon' || c.result === 'opvlamming');
  const from = Math.max(rec.resetAt ?? 0, lastBreak?.exposureAt ?? 0);
  const tail = cycles.filter((c) => c.exposureAt > from);
  const clean = tail.filter((c) => c.result === 'schoon').length;
  const open = cycles.length && cycles[cycles.length - 1].result === null;
  const need = kneeMeta.cleanCyclesToUnlock;
  if (rec.cleanCount !== (rec.state === 'vergrendeld' ? 0 : clean)) problems.push(`teller ${rec.cleanCount} past niet bij ${clean} schone cycli`);
  if (rec.state === 'vergrendeld' && open) problems.push('vergrendeld met een lopende cyclus');
  if (rec.state === 'test' && clean !== 0) problems.push('test na een schone cyclus');
  if (rec.state === 'voorlopig' && (clean < 1 || clean >= need)) problems.push(`voorlopig met ${clean} schone cycli`);
  if (rec.state === 'vrij' && (clean !== need || open)) problems.push(`vrij zonder ${need} schone cycli op rij`);
  return problems;
}

// Regels over alle oefeningen samen (§6.6): hooguit één in de proefperiode,
// geen proefperiode tijdens een afkoelperiode of een opvlamming.
function globalProblems(unlocks, { now, flareActive }) {
  const trial = Object.entries(unlocks).filter(([, r]) => r.state === 'test' || r.state === 'voorlopig');
  const freed = Object.entries(unlocks).filter(([, r]) => r.state !== 'vergrendeld');
  const cooling = Object.values(unlocks).some((r) => r.cooldownUntil && r.cooldownUntil > now);
  const out = new Map();
  if (flareActive) for (const [id] of freed) out.set(id, 'niet vergrendeld tijdens een opvlamming');
  if (cooling) for (const [id] of trial) if (!out.has(id)) out.set(id, 'proefperiode tijdens een afkoelperiode');
  if (trial.length > 1) for (const [id] of trial) if (!out.has(id)) out.set(id, 'meer dan één oefening in de proefperiode');
  return out;
}

// Terug naar vergrendeld, met de geschiedenis (een lopende cyclus vervalt)
// en de strengste geldige afkoelperiode.
function relock(rec, now) {
  const cycles = (Array.isArray(rec?.cycles) ? rec.cycles : [])
    .filter((c) => c && typeof c === 'object' && isTime(c.exposureAt) && c.exposureAt <= now && RESULTS.includes(c.result))
    .map((c) => ({
      exposureAt: c.exposureAt,
      painBefore: isPainOrNull(c.painBefore) ? c.painBefore : null,
      painDuring: isPainOrNull(c.painDuring) ? c.painDuring : null,
      p24: isPainOrNull(c.p24) ? c.p24 : null,
      p48: isPainOrNull(c.p48) ? c.p48 : null,
      result: c.result === null ? 'vervallen' : c.result,
    }))
    .sort((a, b) => a.exposureAt - b.exposureAt);
  return { state: 'vergrendeld', cleanCount: 0, cooldownUntil: isTime(rec?.cooldownUntil) ? rec.cooldownUntil : null, cycles, resetAt: now };
}

// Een record controleren en opschonen; null = overslaan.
function cleanSession(s) {
  if (!s || typeof s !== 'object' || typeof s.id !== 'string' || !s.id) return null;
  if (!isIso(s.startedAt) || !isIso(s.endedAt) || typeof s.tz !== 'string') return null;
  if (!SESSION_STATUS.includes(s.status) || !isNum(s.plannedSec) || !isNum(s.activeSec)) return null;
  if (!Array.isArray(s.segmentsDone)) return null;
  const segs = s.segmentsDone.filter((x) => x && typeof x.exerciseId === 'string' && [null, 'L', 'R'].includes(x.side ?? null)
    && SEGMENT_KINDS.includes(x.kind) && isNum(x.sec) && x.sec >= 0);
  if (segs.length !== s.segmentsDone.length) return null;
  if (!isPainOrNull(s.kneePainDuring ?? null) || !isPainOrNull(s.stretchIntensity ?? null)) return null;
  return {
    id: s.id, routineId: String(s.routineId ?? ''), routineName: String(s.routineName ?? ''), slot: ['ochtend', 'avond', 'vrij'].includes(s.slot) ? s.slot : 'vrij',
    startedAt: s.startedAt, endedAt: s.endedAt, tz: s.tz, plannedSec: s.plannedSec, activeSec: s.activeSec, status: s.status,
    segmentsDone: segs, stretchIntensity: s.stretchIntensity ?? null, kneePainDuring: s.kneePainDuring ?? null,
    notes: typeof s.notes === 'string' ? s.notes : '',
  };
}
function cleanCheck(c, lib) {
  if (!c || typeof c.id !== 'string' || !c.id || !isTime(c.at) || !isPain(c.pain) || !CONTEXTS.includes(c.context)) return null;
  if (c.exerciseId !== undefined && !lib.exercises.has(c.exerciseId)) return null;
  return { id: c.id, at: c.at, pain: c.pain, context: c.context, ...(c.exerciseId ? { exerciseId: c.exerciseId } : {}) };
}
function cleanTest(t, lib) {
  const test = lib.tests.get(t?.testId);
  if (!test || typeof t.id !== 'string' || !t.id || !isIso(t.date) || !['L', 'R'].includes(t.side)) return null;
  if (!Array.isArray(t.trials) || t.trials.length < 1 || t.trials.length > 3 || !t.trials.every(isNum)) return null;
  // Gemiddelde en eenheid opnieuw: uit de pogingen en de bibliotheek.
  const mean = Math.round((t.trials.reduce((a, b) => a + b, 0) / t.trials.length) * 10) / 10;
  return { id: t.id, date: t.date, testId: t.testId, side: t.side, trials: [...t.trials], mean, unit: test.unit };
}
function cleanFlare(f) {
  if (!f || typeof f !== 'object' || typeof f.active !== 'boolean') return null;
  if (f.active && !isTime(f.since)) return null;
  return { active: f.active, since: f.active ? f.since : null, exitProposedAt: isTime(f.exitProposedAt) ? f.exitProposedAt : null };
}

// Alleen bekende instellingen met het goede type; de rest valt terug op de
// standaard (withDefaults in de app).
function cleanSettings(st, defaults) {
  if (!st || typeof st !== 'object' || Array.isArray(st)) return null;
  const out = {};
  for (const [k, def] of Object.entries(defaults)) {
    const v = st[k];
    if (v === undefined) continue;
    if (def === null) { if (v === null || isNum(v) || typeof v === 'string') out[k] = v; continue; }
    if (typeof def === 'object') {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const sub = {};
        for (const [sk, sd] of Object.entries(def)) {
          const sv = v[sk];
          if (sd === null ? (sv === null || /^\d{2}:\d{2}$/.test(sv ?? '')) : typeof sv === typeof sd && (typeof sv !== 'number' || Number.isFinite(sv))) sub[sk] = sv;
        }
        out[k] = sub;
      }
      continue;
    }
    if (typeof v === typeof def && (typeof v !== 'number' || Number.isFinite(v))) out[k] = v;
  }
  // Weging alleen als die samen 100 % is.
  if (out.weights && Object.values({ ...defaults.weights, ...out.weights }).reduce((a, b) => a + b, 0) !== 100) delete out.weights;
  return out;
}

const byId = (list, warn, what) => {
  const seen = new Map();
  for (const x of list) seen.set(x.id, x);
  if (seen.size < list.length) warn(`${list.length - seen.size} dubbele ${what} samengevoegd.`);
  return [...seen.values()];
};

// Controleert een dump. Geeft { ok, errors[], warnings[], data, counts }
// terug; data is wat er geïmporteerd wordt: ongeldige records zijn
// overgeslagen (met een melding) en ontgrendelingen die hun eigen
// geschiedenis niet dragen, staan weer op vergrendeld.
export function parseDump(json, lib, { now, defaults }) {
  const errors = [];
  const warnings = [];
  const warn = (t) => warnings.push(t);
  let dump = json;
  if (typeof json === 'string') {
    try {
      dump = JSON.parse(json);
    } catch {
      return { ok: false, errors: ['Dit is geen geldig JSON-bestand.'], warnings, data: null };
    }
  }
  if (!dump || typeof dump !== 'object' || dump.app !== 'Rekapp' || !dump.data || typeof dump.data !== 'object') {
    return { ok: false, errors: ['Dit is geen export van Rekapp.'], warnings, data: null };
  }
  if (dump.schemaVersion !== DUMP_SCHEMA_VERSION) {
    return { ok: false, errors: [`Onbekende exportversie ${dump.schemaVersion}; deze app leest versie ${DUMP_SCHEMA_VERSION}.`], warnings, data: null };
  }
  const d = dump.data;
  for (const name of ['routines', 'sessions', 'kneeChecks', 'tests']) if (!Array.isArray(d[name])) errors.push(`${name} ontbreekt of is geen lijst.`);
  if (!d.unlocks || typeof d.unlocks !== 'object' || Array.isArray(d.unlocks)) errors.push('unlocks ontbreekt.');
  const flare = cleanFlare(d.flare ?? { active: false });
  if (!flare) errors.push('De opvlammingsmodus in het bestand is ongeldig.');
  if (errors.length) return { ok: false, errors, warnings, data: null };

  // Losse records: wat niet klopt, gaat niet mee (de rest wel).
  const keep = (list, clean, what) => {
    const out = [];
    let skipped = 0;
    for (const x of list) { const c = clean(x); if (c) out.push(c); else skipped += 1; }
    if (skipped) warn(`${skipped} ${what} overgeslagen: onvolledig of ongeldig.`);
    return out;
  };
  const routines = byId(d.routines.filter((r, i) => {
    const errs = validateUserRoutine(r, lib.exercises);
    if (errs.length) warn(`Routine ${i + 1} (${typeof r?.name === 'string' ? r.name : '?'}) overgeslagen: ${errs[0].field} ${errs[0].message}.`);
    return errs.length === 0;
  }), warn, 'routines');
  const sessions = byId(keep(d.sessions, cleanSession, 'sessies'), warn, 'sessies');
  const kneeChecks = byId(keep(d.kneeChecks, (c) => cleanCheck(c, lib), 'kniechecks'), warn, 'kniechecks');
  const tests = byId(keep(d.tests, (t) => cleanTest(t, lib), 'metingen'), warn, 'metingen');

  // Ontgrendelingen: eerst elk record op zichzelf, dan de regels samen.
  const unlocks = {};
  for (const [id, rec] of Object.entries(d.unlocks)) {
    const ex = lib.exercises.get(id);
    if (!ex || !ex.locked) { warn(`Ontgrendeling voor "${id}" overgeslagen: geen vergrendelde oefening.`); continue; }
    const problems = checkUnlock(rec, { kneeMeta: lib.meta.knee, now });
    if (problems.length) {
      warn(`${ex.name}: terug naar vergrendeld (${problems.join('; ')}).`);
      unlocks[id] = relock(rec, now);
    } else {
      unlocks[id] = structuredClone(rec);
    }
  }
  for (const [id, why] of globalProblems(unlocks, { now, flareActive: flare.active })) {
    warn(`${lib.exercises.get(id).name}: terug naar vergrendeld (${why}).`);
    unlocks[id] = relock(unlocks[id], now);
  }

  // Instellingen: alleen bekende waarden; "laatste export" is minstens het
  // moment van deze export.
  const settings = defaults ? cleanSettings(d.settings, defaults) : null;
  const exportedAt = isIso(dump.exportedAt) ? Date.parse(dump.exportedAt) : null;
  if (settings && exportedAt && !(settings.lastExportAt >= exportedAt)) settings.lastExportAt = exportedAt;

  return {
    ok: true,
    errors,
    warnings,
    data: { routines, sessions, kneeChecks, unlocks, tests, flare, settings },
    counts: { routines: routines.length, sessions: sessions.length, kneeChecks: kneeChecks.length, tests: tests.length, unlocks: Object.keys(unlocks).length },
  };
}

// Herinnering om te exporteren (§6.9: elke 14 dagen). Vanaf de laatste
// export, of zonder export vanaf de eerste sessie; "Later" wacht een dag.
export function exportReminderDue({ lastExportAt, snoozedAt, sessions, now }) {
  if (!sessions.length) return false;
  if (snoozedAt && now - snoozedAt < DAY) return false;
  const since = lastExportAt ?? Math.min(...sessions.map((s) => Date.parse(s.startedAt)));
  return now - since >= 14 * DAY;
}

// De opgeslagen kniestatus bij het starten nalopen (dezelfde regels als bij
// een import). null = niet te lezen (dan geldt de opvlammingsmodus, zie
// main.js). Een ontgrendeling die haar eigen geschiedenis niet draagt, gaat
// terug naar vergrendeld.
export function checkKneeState(raw, lib, now) {
  if (!raw || typeof raw !== 'object' || !raw.unlocks || typeof raw.unlocks !== 'object' || Array.isArray(raw.unlocks) || !Array.isArray(raw.checks)) return null;
  const flare = cleanFlare(raw.flare);
  if (!flare) return null;
  const warnings = [];
  const unlocks = {};
  for (const [id, rec] of Object.entries(raw.unlocks)) {
    const ex = lib.exercises.get(id);
    if (!ex || !ex.locked) continue;
    const problems = checkUnlock(rec, { kneeMeta: lib.meta.knee, now });
    if (problems.length) {
      warnings.push(`${ex.name}: terug naar vergrendeld (${problems.join('; ')}).`);
      unlocks[id] = relock(rec, now);
    } else {
      unlocks[id] = rec;
    }
  }
  for (const [id, why] of globalProblems(unlocks, { now, flareActive: flare.active })) {
    warnings.push(`${lib.exercises.get(id).name}: terug naar vergrendeld (${why}).`);
    unlocks[id] = relock(unlocks[id], now);
  }
  const checks = raw.checks.filter((c) => cleanCheck(c, lib));
  return { knee: { unlocks, flare: { ...raw.flare, ...flare }, checks, rev: Number.isFinite(raw.rev) ? raw.rev : 0 }, warnings, changed: warnings.length > 0 || checks.length !== raw.checks.length };
}
