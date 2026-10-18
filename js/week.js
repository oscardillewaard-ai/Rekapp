// "Mijn week" (§6.4.2): per spiergroep gepland en werkelijk, met kleur,
// suggestie en onderhoudstip. Puur.
import { plannedWeekDose, actualWeekDose, meterValue, meterStatus, neededPerSession } from './dose.js';

const DAY = 24 * 3600 * 1000;

// De frequentie waarmee de suggestie rekent: de actieve routine die het vaakst
// per week gedaan wordt (daar voeg je de extra tijd het makkelijkst toe).
export function suggestionFrequency(activeRoutines) {
  return activeRoutines.reduce((m, r) => Math.max(m, r.timesPerWeek), 0) || 7;
}

// Alle 24 spiergroepen in de volgorde van §4.
export function weekRows(lib, { routines, sessions, now }) {
  const active = routines.filter((r) => r.active !== false);
  const planned = plannedWeekDose(active, lib.exercises);
  const actual = actualWeekDose(sessions, lib.exercises, now, lib.meta.dose.windowHours);
  const f = suggestionFrequency(active);
  return [...lib.groups.values()].map((group) => {
    const p = planned.get(group.id) ?? null;
    const a = actual.get(group.id) ?? null;
    const plannedSec = meterValue(p);
    const actualSec = meterValue(a);
    // Suggestie alleen voor groepen die je al traint (statisch of dynamisch) en
    // die onder de drempel blijven; niet voor de groepen die je niet doet.
    const trained = p && (p.L > 0 || p.R > 0 || p.dyn > 0);
    const suggestion = trained && plannedSec < lib.meta.dose.thresholdSec
      ? { perSession: neededPerSession(plannedSec, f, lib.meta.dose), timesPerWeek: f }
      : null;
    return {
      group,
      planned: p ?? { L: 0, R: 0, dyn: 0 },
      actual: a ?? { L: 0, R: 0, dyn: 0 },
      plannedSec,
      actualSec,
      plannedStatus: meterStatus(plannedSec, lib.meta.dose),
      actualStatus: meterStatus(actualSec, lib.meta.dose),
      suggestion,
    };
  });
}

// Tekst van de suggestie (§6.4.2).
export const suggestionText = (s) => `Nodig: ${s.perSession} s per kant per sessie bij ${s.timesPerWeek}× per week`;

// §6.4.2: na 12 weken (sinds de eerste sessie), of zodra een spiergroep 4 weken
// op rij groen is (werkelijk ≥ 300 s per kant per week), de onderhoudstip.
export function maintenanceTipDue(lib, sessions, now) {
  if (!sessions.length) return false;
  const first = Math.min(...sessions.map((s) => Date.parse(s.startedAt)));
  if (now - first >= 12 * 7 * DAY) return true;
  const weeks = 4;
  const doses = Array.from({ length: weeks }, (_, k) => actualWeekDose(sessions, lib.exercises, now - k * 7 * DAY, lib.meta.dose.windowHours));
  return [...lib.groups.keys()].some((g) => doses.every((d) => meterValue(d.get(g)) >= lib.meta.dose.thresholdSec));
}

export const MAINTENANCE_TIP = 'Onderhoud: ~5 min per week per spiergroep houdt je winst vast';
