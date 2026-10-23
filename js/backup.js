// Export en import (§6.9). Puur: maakt de JSON-dump en de drie CSV-bestanden
// en controleert een dump vóór het importeren. Lezen en schrijven in
// IndexedDB doet store.js.
import { actualWeekDose } from './dose.js';
import { validateUserRoutine, capPnf } from './routines.js';

export const DUMP_SCHEMA_VERSION = 1;
const DAY = 24 * 3600 * 1000;
// test/24u/48u: kniechecks uit de tijd van het knieslot; die blijven geldig
// in het logboek.
const CONTEXTS = ['dagelijks', 'test', '24u', '48u'];

// ---------- JSON ----------

// data: { routines, sessions, kneeChecks, tests, flare, settings }.
// exportedAt: ISO-tijd met tijdzone. "unlocks" (knieslot, vervallen) staat er
// leeg in, zodat een oudere versie van de app het bestand nog kan lezen.
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
      unlocks: {},
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

const isPain = (v) => Number.isInteger(v) && v >= 0 && v <= 10;
const isPainOrNull = (v) => v === null || isPain(v);
const isTime = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
// ISO-tijd met tijdzone zoals session.js die maakt (2026-11-02T08:15:00+01:00).
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const isIso = (v) => typeof v === 'string' && ISO.test(v) && !Number.isNaN(Date.parse(v));
const SESSION_STATUS = ['voltooid', 'gedeeltelijk', 'afgebroken'];
const SEGMENT_KINDS = ['prep', 'work', 'contract', 'relax', 'switch', 'transition'];

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
// overgeslagen (met een melding). Ontgrendelingen uit een oudere export
// (knieslot, vervallen) gaan niet mee.
export function parseDump(json, lib, { defaults } = {}) {
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
  // PNF van vóór de grens van 180 s per kant: inkorten, niet overslaan.
  const routines = byId(d.routines.map((r) => {
    const c = capPnf(r);
    if (c.changed) warn(`${typeof r?.name === 'string' ? r.name : 'Routine'}: PNF ingekort tot hoogstens 180 s per kant.`);
    return c.routine;
  }).filter((r, i) => {
    const errs = validateUserRoutine(r, lib.exercises);
    if (errs.length) warn(`Routine ${i + 1} (${typeof r?.name === 'string' ? r.name : '?'}) overgeslagen: ${errs[0].field} ${errs[0].message}.`);
    return errs.length === 0;
  }), warn, 'routines');
  const sessions = byId(keep(d.sessions, cleanSession, 'sessies'), warn, 'sessies');
  const kneeChecks = byId(keep(d.kneeChecks, (c) => cleanCheck(c, lib), 'kniechecks'), warn, 'kniechecks');
  const tests = byId(keep(d.tests, (t) => cleanTest(t, lib), 'metingen'), warn, 'metingen');

  // Het knieslot bestaat niet meer: ontgrendelingen gaan niet mee.
  if (d.unlocks && typeof d.unlocks === 'object' && Object.keys(d.unlocks).length) {
    warn('Ontgrendelingen uit het bestand gaan niet mee: het knieslot is uit de app gehaald.');
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
    data: { routines, sessions, kneeChecks, tests, flare, settings },
    counts: { routines: routines.length, sessions: sessions.length, kneeChecks: kneeChecks.length, tests: tests.length },
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

// De opgeslagen kniestatus bij het starten nalopen. null = niet te lezen
// (dan geldt de opvlammingsmodus, zie main.js). Kniechecks die niet kloppen,
// vallen weg.
export function checkKneeState(raw, lib) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.checks)) return null;
  const flare = cleanFlare(raw.flare);
  if (!flare) return null;
  const checks = raw.checks.filter((c) => cleanCheck(c, lib));
  return { knee: { flare: { ...raw.flare, ...flare }, checks, rev: Number.isFinite(raw.rev) ? raw.rev : 0 }, warnings: [], changed: checks.length !== raw.checks.length };
}
