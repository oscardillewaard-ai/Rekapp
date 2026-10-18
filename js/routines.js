// Eigen routines (§6.3): aanmaken, kopiëren, stappen bewerken en controleren.
// Puur: id's en tijdstippen komen van de aanroeper.
import { compileRoutine } from './timeline.js';
import { stepDoseErrors } from './library.js';

export const DOSE_STEP = 5;
export const DOSE_MIN = 10;
export const DOSE_MAX = 180;
export const MAX_TOTAL_SEC = 900;
const SLOTS = ['ochtend', 'avond', 'vrij'];

const clone = (x) => structuredClone(x);

export function newRoutine({ id, now, name = 'Nieuwe routine', slot = 'vrij' }) {
  return { id, name, slot, preRun: false, timesPerWeek: 7, active: true, steps: [], createdAt: now, updatedAt: now };
}

// "Kopiëren en aanpassen" (§6.3): de sjablonen zelf blijven alleen-lezen.
export function copyTemplate(tpl, { id, now }) {
  return {
    id,
    name: `${tpl.name} (kopie)`,
    slot: tpl.slot,
    preRun: tpl.preRun,
    timesPerWeek: tpl.timesPerWeek,
    active: true,
    steps: tpl.steps.map((s) => clone(s)),
    fromTemplate: tpl.id,
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateRoutine(r, { id, now }) {
  return { ...clone(r), id, name: `${r.name} (kopie)`, createdAt: now, updatedAt: now };
}

// Nieuwe stap met de standaarddosis uit de bibliotheek (§6.3). Een statische
// oefening met de standaardhoudtijd van 45 s krijgt de houdtijd uit de
// instellingen (§6.11 "standaard statische houdtijd"); zie AFWIJKINGEN.md.
export function newStep(ex, { defaultStaticHoldSec = 45 } = {}) {
  const d = clone(ex.defaultDose);
  const step = { exerciseId: ex.id };
  if (d.pnf) step.pnf = d.pnf;
  else if (ex.sided === 'unilateral') step.perSideSec = d.perSideSec;
  else step.durationSec = d.durationSec;
  if (d.reps) step.reps = d.reps;
  if (ex.type === 'static') {
    if (step.perSideSec === 45) step.perSideSec = clampSec(defaultStaticHoldSec);
    if (step.durationSec === 45) step.durationSec = clampSec(defaultStaticHoldSec);
  }
  return step;
}

// Stappen van 5 s, minimaal 10 s, maximaal 180 s (§6.3).
export function clampSec(v) {
  const n = Math.round(Number(v) / DOSE_STEP) * DOSE_STEP;
  return Math.min(DOSE_MAX, Math.max(DOSE_MIN, Number.isFinite(n) ? n : DOSE_MIN));
}

// Dosis aanpassen met + en − (in stappen van 5 s). Bij PNF verandert de
// rektijd; rondes en aanspantijd hebben een eigen knop.
export function adjustDose(step, delta) {
  const s = clone(step);
  if (s.pnf) s.pnf.stretchSec = Math.min(60, Math.max(10, s.pnf.stretchSec + delta));
  else if (s.perSideSec !== undefined) s.perSideSec = clampSec(s.perSideSec + delta);
  else s.durationSec = clampSec(s.durationSec + delta);
  return s;
}

export function setPnf(step, patch) {
  const s = clone(step);
  const p = { ...s.pnf, ...patch };
  p.rounds = Math.min(5, Math.max(1, Math.round(p.rounds)));
  p.contractSec = Math.min(10, Math.max(3, Math.round(p.contractSec)));
  p.stretchSec = Math.min(60, Math.max(10, Math.round(p.stretchSec)));
  s.pnf = p;
  return s;
}

// Extra set zwakke kant (§6.3): L, R of uit; alleen bij unilaterale stappen.
export function setExtraWeakSide(step, side) {
  const s = clone(step);
  if (side === 'L' || side === 'R') s.extraWeakSide = side;
  else delete s.extraWeakSide;
  return s;
}

// Overgangstijd: null = automatisch (§6.3), anders 0–30 s.
export function setTransition(step, sec) {
  const s = clone(step);
  if (sec === null || sec === undefined) delete s.transitionAfterSec;
  else s.transitionAfterSec = Math.min(30, Math.max(0, Math.round(sec)));
  return s;
}

export function moveStep(r, from, to) {
  const steps = [...r.steps];
  if (from < 0 || from >= steps.length || to < 0 || to >= steps.length) return r;
  const [s] = steps.splice(from, 1);
  steps.splice(to, 0, s);
  return { ...r, steps };
}

export function removeStep(r, index) {
  return { ...r, steps: r.steps.filter((_, i) => i !== index) };
}

export function totalSec(r, exercises, timing, sideSwitchSec) {
  return r.steps.length ? compileRoutine(r, exercises, { timing, sideSwitchSec }).totalSec : 0;
}

// Controle van een eigen routine (bij laden en importeren). Geeft een lijst
// fouten terug; leeg = geldig.
export function validateUserRoutine(r, exercises) {
  const errors = [];
  const err = (field, message) => errors.push({ field, message });
  if (typeof r?.id !== 'string' || !r.id) err('id', 'ontbreekt');
  if (typeof r?.name !== 'string' || !r.name.trim()) err('name', 'naam ontbreekt');
  if (!SLOTS.includes(r?.slot)) err('slot', `moet ochtend, avond of vrij zijn`);
  if (typeof r?.preRun !== 'boolean') err('preRun', 'moet waar of onwaar zijn');
  if (!Number.isInteger(r?.timesPerWeek) || r.timesPerWeek < 1 || r.timesPerWeek > 14) err('timesPerWeek', 'moet 1–14 zijn');
  if (typeof r?.active !== 'boolean') err('active', 'moet waar of onwaar zijn');
  if (!Array.isArray(r?.steps)) { err('steps', 'ontbreekt'); return errors; }
  r.steps.forEach((s, i) => {
    const ex = exercises.get(s?.exerciseId);
    if (!ex) { err(`steps[${i}]`, `onbekende oefening "${s?.exerciseId}"`); return; }
    for (const e of stepDoseErrors(s, ex)) err(`steps[${i}].${e.field}`, e.message);
    for (const k of ['perSideSec', 'durationSec']) {
      if (s[k] !== undefined && (!Number.isInteger(s[k]) || s[k] < DOSE_MIN || s[k] > DOSE_MAX)) err(`steps[${i}].${k}`, `moet ${DOSE_MIN}–${DOSE_MAX} s zijn`);
    }
    if (s.pnf) {
      const { rounds, contractSec, stretchSec } = s.pnf;
      if (!(rounds >= 1 && rounds <= 5) || !(contractSec >= 3 && contractSec <= 10) || !(stretchSec >= 10 && stretchSec <= 60)) {
        err(`steps[${i}].pnf`, 'rondes 1–5, aanspannen 3–10 s, rekken 10–60 s');
      }
    }
    if (s.transitionAfterSec !== undefined && !(Number.isInteger(s.transitionAfterSec) && s.transitionAfterSec >= 0 && s.transitionAfterSec <= 30)) {
      err(`steps[${i}].transitionAfterSec`, 'moet 0–30 s zijn');
    }
  });
  return errors;
}
