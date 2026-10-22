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

const isPain = (v) => Number.isInteger(v) && v >= 0 && v <= 10;
const isPainOrNull = (v) => v === null || isPain(v);
const isTime = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

// Schone cyclus volgens §6.6, nagerekend uit de waarden.
function reallyClean(c, kneeMeta) {
  const max = kneeMeta.painMax;
  return [c.painBefore, c.painDuring, c.p24, c.p48].every(isPain)
    && c.painDuring <= max && c.p24 <= max && c.p24 <= c.painBefore && c.p48 <= max && c.p48 <= c.painBefore;
}

// Kloppen status en teller met de geschiedenis? De knieregels zijn hard: een
// dump mag een oefening niet vrijgeven zonder de cycli die daarbij horen.
// Klopt het niet, dan gaat die oefening terug naar vergrendeld.
export function checkUnlock(rec, { kneeMeta, now, flareActive }) {
  const problems = [];
  if (!rec || typeof rec !== 'object') return ['geen geldige gegevens'];
  if (!STATES.includes(rec.state)) problems.push(`onbekende status "${rec.state}"`);
  if (!Number.isInteger(rec.cleanCount) || rec.cleanCount < 0) problems.push('teller ongeldig');
  if (rec.cooldownUntil !== null && rec.cooldownUntil !== undefined && !isTime(rec.cooldownUntil)) problems.push('afkoelperiode ongeldig');
  if (!Array.isArray(rec.cycles)) return [...problems, 'cycli ontbreken'];
  let prev = 0;
  let trailing = 0; // schone cycli sinds de laatste onderbreking
  rec.cycles.forEach((c, i) => {
    if (!c || !isTime(c.exposureAt) || c.exposureAt > now || c.exposureAt < prev) problems.push(`cyclus ${i + 1}: tijdstip ongeldig`);
    prev = c?.exposureAt ?? prev;
    if (!RESULTS.includes(c?.result)) problems.push(`cyclus ${i + 1}: onbekende uitslag`);
    if (![c?.painBefore, c?.painDuring, c?.p24, c?.p48].every(isPainOrNull)) problems.push(`cyclus ${i + 1}: pijnwaarde ongeldig`);
    if (c?.result === null && i !== rec.cycles.length - 1) problems.push(`cyclus ${i + 1}: loopt nog maar is niet de laatste`);
    if (c?.result === 'schoon') {
      if (!reallyClean(c, kneeMeta)) problems.push(`cyclus ${i + 1}: staat als schoon maar de waarden zijn dat niet`);
      trailing += 1;
    } else if (c?.result === 'niet schoon' || c?.result === 'opvlamming') {
      trailing = 0;
    }
  });
  const need = kneeMeta.cleanCyclesToUnlock;
  if (rec.state === 'vrij' && (trailing < need || rec.cleanCount < need)) problems.push(`vrij zonder ${need} schone cycli op rij`);
  if (rec.state === 'voorlopig' && (rec.cleanCount < 1 || rec.cleanCount >= need || rec.cleanCount > trailing)) problems.push('voorlopig klopt niet met de schone cycli');
  if (rec.state === 'test' && rec.cleanCount !== 0) problems.push('test met een teller boven 0');
  if (flareActive && rec.state !== 'vergrendeld') problems.push('niet vergrendeld tijdens een opvlamming');
  return problems;
}

function fresh() {
  return { state: 'vergrendeld', cleanCount: 0, cooldownUntil: null, cycles: [] };
}

// Controleert een dump. Geeft { ok, errors[], warnings[], data } terug; data
// is wat er geïmporteerd wordt (met teruggezette ontgrendelingen).
export function parseDump(json, lib, { now }) {
  const errors = [];
  const warnings = [];
  let dump = json;
  if (typeof json === 'string') {
    try {
      dump = JSON.parse(json);
    } catch {
      return { ok: false, errors: ['Dit is geen geldig JSON-bestand.'], warnings, data: null };
    }
  }
  if (!dump || typeof dump !== 'object' || dump.app !== 'Rekapp' || !dump.data) {
    return { ok: false, errors: ['Dit is geen export van Rekapp.'], warnings, data: null };
  }
  if (dump.schemaVersion !== DUMP_SCHEMA_VERSION) {
    return { ok: false, errors: [`Onbekende exportversie ${dump.schemaVersion}; deze app leest versie ${DUMP_SCHEMA_VERSION}.`], warnings, data: null };
  }
  const d = dump.data;
  const list = (name) => {
    if (!Array.isArray(d[name])) { errors.push(`${name} ontbreekt of is geen lijst.`); return []; }
    return d[name];
  };
  const routines = list('routines');
  const sessions = list('sessions');
  const kneeChecks = list('kneeChecks');
  const tests = list('tests');
  if (!d.unlocks || typeof d.unlocks !== 'object' || Array.isArray(d.unlocks)) errors.push('unlocks ontbreekt.');

  routines.forEach((r, i) => {
    for (const e of validateUserRoutine(r, lib.exercises)) errors.push(`Routine ${i + 1} (${r?.name ?? '?'}): ${e.field} ${e.message}.`);
  });
  sessions.forEach((s, i) => {
    if (typeof s?.id !== 'string' || Number.isNaN(Date.parse(s?.startedAt)) || !Array.isArray(s?.segmentsDone)) errors.push(`Sessie ${i + 1} is onvolledig.`);
  });
  kneeChecks.forEach((c, i) => {
    if (typeof c?.id !== 'string' || !isTime(c?.at) || !isPain(c?.pain) || !CONTEXTS.includes(c?.context)) errors.push(`Kniecheck ${i + 1} is ongeldig.`);
  });
  tests.forEach((t, i) => {
    const okTrials = Array.isArray(t?.trials) && t.trials.length >= 1 && t.trials.length <= 3 && t.trials.every((v) => typeof v === 'number' && Number.isFinite(v));
    if (typeof t?.id !== 'string' || !lib.tests.has(t?.testId) || !['L', 'R'].includes(t?.side) || !okTrials || Number.isNaN(Date.parse(t?.date))) {
      errors.push(`Meting ${i + 1} is ongeldig.`);
    }
  });

  const flare = d.flare && typeof d.flare === 'object' ? d.flare : { active: false, since: null, exitProposedAt: null };
  if (typeof flare.active !== 'boolean') errors.push('flare is ongeldig.');

  // Ontgrendelingen: alleen voor vergrendelde oefeningen, en alleen als de
  // geschiedenis de status draagt. Anders terug naar vergrendeld.
  const unlocks = {};
  for (const [id, rec] of Object.entries(d.unlocks ?? {})) {
    const ex = lib.exercises.get(id);
    if (!ex || !ex.locked) { warnings.push(`Ontgrendeling voor "${id}" overgeslagen: geen vergrendelde oefening.`); continue; }
    const problems = checkUnlock(rec, { kneeMeta: lib.meta.knee, now, flareActive: flare.active });
    if (problems.length) {
      warnings.push(`${ex.name}: terug naar vergrendeld (${problems.join('; ')}).`);
      unlocks[id] = { ...fresh(), cycles: Array.isArray(rec?.cycles) ? rec.cycles.filter((c) => c && isTime(c.exposureAt) && c.exposureAt <= now) : [] };
      // Een lopende cyclus hoort bij een status die we niet overnemen.
      const last = unlocks[id].cycles[unlocks[id].cycles.length - 1];
      if (last && last.result === null) last.result = 'vervallen';
    } else {
      unlocks[id] = rec;
    }
  }

  if (errors.length) return { ok: false, errors, warnings, data: null };
  return {
    ok: true,
    errors,
    warnings,
    data: { routines, sessions, kneeChecks, unlocks, tests, flare, settings: d.settings ?? null },
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
