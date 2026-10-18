// Sessierecord voor het logboek (§6.9). Puur: tijdstippen en tijdzone komen
// van de aanroeper.

// ISO-tijd met de lokale tijdzone-afwijking, bv. 2026-11-02T08:15:00+01:00.
export function isoWithOffset(ms) {
  const d = new Date(ms);
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(off / 60)}:${pad(off % 60)}`;
}

export function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'onbekend';
  } catch {
    return 'onbekend';
  }
}

// routine: { id, name, slot }; run: { startedAtMs, endedAtMs, plannedSec,
// activeSec, status, segmentsDone }; finish: { stretchIntensity,
// kneePainDuring, notes }.
export function buildSession({ id, routine, run, finish, tz }) {
  return {
    id,
    routineId: routine.id,
    routineName: routine.name,
    slot: routine.slot,
    startedAt: isoWithOffset(run.startedAtMs),
    endedAt: isoWithOffset(run.endedAtMs),
    tz,
    plannedSec: run.plannedSec,
    activeSec: run.activeSec,
    status: run.status,
    segmentsDone: run.segmentsDone,
    stretchIntensity: finish.stretchIntensity ?? null,
    kneePainDuring: finish.kneePainDuring ?? null,
    notes: finish.notes ?? '',
  };
}
