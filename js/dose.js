// Weekdosis per spiergroep, gepland en werkelijk (§6.4). Puur: geen DOM.
// Trainingsoefeningen (kracht, balans, plyometrie) tellen niet mee: dit is de
// rekdosis.
//
// Resultaat: Map groeps-id → { L, R, dyn } in seconden per kant per week.
// Alleen statisch en PNF tellen voor L/R; dynamisch en actief komen in dyn.
// Een groep die niet geraakt wordt staat er niet in ("–" in §6.4.3).

import { isTraining } from './types.js';

const COUNTED = new Set(['static', 'pnf']);

function bucket(dose, group) {
  let d = dose.get(group);
  if (!d) {
    d = { L: 0, R: 0, dyn: 0 };
    dose.set(group, d);
  }
  return d;
}

function add(dose, ex, sec, factor) {
  if (isTraining(ex)) return;
  for (const t of ex.targets) {
    const d = bucket(dose, t.group);
    if (COUNTED.has(ex.type)) {
      d.L += sec.L * t.weight * factor;
      d.R += sec.R * t.weight * factor;
    } else {
      d.dyn += ((sec.L + sec.R) / 2) * t.weight * factor;
    }
  }
}

// §6.4.1 secondenPerKant, maal het aantal sets (de extra set zwakke kant
// telt één keer).
export function secondsPerSide(step, ex) {
  const basis = step.pnf
    ? step.pnf.rounds * (step.pnf.contractSec + step.pnf.stretchSec)
    : (step.perSideSec ?? step.durationSec);
  const all = basis * (step.sets ?? 1);
  if (ex.sided === 'unilateral') {
    const sec = { L: all, R: all };
    if (step.extraWeakSide) sec[step.extraWeakSide] += basis;
    return sec;
  }
  if (ex.sided === 'bilateral') return { L: all, R: all };
  return { L: all / 2, R: all / 2 }; // afwisselend
}

// Dosis van één routine, vermenigvuldigd met factor (1 = één sessie).
export function routineDose(routine, exercises, factor = 1, dose = new Map()) {
  for (const step of routine.steps) {
    const ex = exercises.get(step.exerciseId);
    add(dose, ex, secondsPerSide(step, ex), factor);
  }
  return dose;
}

// §6.4.1 weekdosis: alle actieve routines × keer per week.
export function plannedWeekDose(routines, exercises) {
  const dose = new Map();
  for (const r of routines) if (r.active !== false) routineDose(r, exercises, r.timesPerWeek, dose);
  return dose;
}

// Werkelijke dosis uit gelogde werkblokken van de afgelopen windowHours
// (rollend venster, §6.4.1). segmentsDone: [{ exerciseId, side, kind, sec }].
export function actualWeekDose(sessions, exercises, now, windowHours) {
  const from = now - windowHours * 3600 * 1000;
  const dose = new Map();
  for (const s of sessions) {
    const t = Date.parse(s.startedAt);
    if (!(t > from && t <= now)) continue;
    for (const seg of s.segmentsDone ?? []) {
      if (!['work', 'contract', 'relax'].includes(seg.kind)) continue;
      const ex = exercises.get(seg.exerciseId);
      if (!ex) continue;
      let sec;
      if (ex.sided === 'unilateral') sec = { L: seg.side === 'L' ? seg.sec : 0, R: seg.side === 'R' ? seg.sec : 0 };
      else if (ex.sided === 'bilateral') sec = { L: seg.sec, R: seg.sec };
      else sec = { L: seg.sec / 2, R: seg.sec / 2 };
      add(dose, ex, sec, 1);
    }
  }
  return dose;
}

// De meter toont de laagste kant (§6.4.2).
export function meterValue(d) {
  return d ? Math.min(d.L, d.R) : 0;
}

// Kleur van de meter (§6.4.2): grijs = 0, oranje < 300, groen 300–600, blauw > 600.
export function meterStatus(sec, doseMeta) {
  if (sec === 0) return 'grijs';
  if (sec < doseMeta.thresholdSec) return 'oranje';
  if (sec <= doseMeta.plateauSec) return 'groen';
  return 'blauw';
}

// Suggestie (§6.4.2): X = ⌈(300 − gepland) / f⌉, in stappen van 5 s.
export function neededPerSession(plannedSec, timesPerWeek, doseMeta) {
  const raw = Math.max(0, doseMeta.thresholdSec - plannedSec) / timesPerWeek;
  return Math.ceil(raw / 5) * 5;
}
