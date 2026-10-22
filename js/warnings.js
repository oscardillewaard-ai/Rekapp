// Waarschuwingen W1–W9 (§6.5). Puur: geen DOM, geen opslag.
import { compileRoutine } from './timeline.js';
import { plannedWeekDose, routineDose, secondsPerSide, meterValue } from './dose.js';
import { access, unlockState, lastExposureAt } from './knee.js';

// Teksten letterlijk uit §6.5.
export const WARNINGS = {
  W1: { severity: 'blokkeert', text: 'Vergrendeld door de knie-poort. Ontgrendelen kan via de 48-uurstest.' },
  W2: { severity: 'oranje', text: 'Bevat rugbuiging. Vlak na het opstaan zijn je tussenwervelschijven het gevoeligst voor buigen. Zet hem in je avondroutine of houd de beweging klein.' },
  W3: { severity: 'oranje', text: '60 s of meer statisch rekken per spiergroep vlak voor een run kan je prestatie direct daarna met ~4–5% verlagen. Houd het korter of verplaats het naar de avond.' },
  W4: { severity: 'info', text: 'Langer dan je eigen grens van 15 minuten.' },
  W5: { severity: 'info', text: 'Boven ~10 minuten per week levert waarschijnlijk niets extra op. Verschuif tijd naar een andere spiergroep.' },
  W6: { severity: 'info', text: "Onder de drempel van 5 minuten per week. Zie de suggestie bij 'Mijn week'." },
  W7: { severity: 'info', text: 'Dynamisch telt niet mee voor de drempel; voor blijvende winst is statisch of PNF effectiever.' },
  W8: { severity: 'blokkeert', text: 'Tijdelijk uit tijdens een opvlamming.' },
  W9: { severity: 'oranje', text: 'Deze oefening is nog in de proefperiode: maximaal één keer per 48 uur.' },
};

const COUNTED = new Set(['static', 'pnf']);
const W3_LIMIT_SEC = 60;
const MAX_TOTAL_SEC = 900;

function warning(code, extra = {}) {
  return { code, ...WARNINGS[code], ...extra };
}

// Waarschuwingen voor één routine.
// ctx = {
//   lib:            geïndexeerde bibliotheek (indexLibrary),
//   knee:           kniestatus (knee.js),
//   otherRoutines:  de andere routines van de gebruiker (alleen actieve tellen),
//   now:            tijdstip in ms (voor W9),
//   sideSwitchSec:  uit de instellingen,
// }
// Volgorde in het resultaat: per stap (W1, W8, W2, W9), daarna de routine (W3,
// W4) en de spiergroepen (W5, W6, W7).
export function routineWarnings(routine, ctx) {
  const { lib, knee, now } = ctx;
  const { exercises, meta } = lib;
  const out = [];

  routine.steps.forEach((step, stepIndex) => {
    const ex = exercises.get(step.exerciseId);
    const gate = access(ex, knee, meta.knee);
    for (const code of gate.codes) out.push(warning(code, { exerciseId: ex.id, stepIndex }));
    if (routine.slot === 'ochtend' && ex.morningLumbarFlexion) out.push(warning('W2', { exerciseId: ex.id, stepIndex }));
    const st = unlockState(ex, knee);
    if (st === 'test' || st === 'voorlopig') {
      const last = lastExposureAt(knee.unlocks[ex.id]);
      if (last !== null && now - last < meta.knee.exposureSpacingHours * 3600 * 1000) {
        out.push(warning('W9', { exerciseId: ex.id, stepIndex }));
      }
    }
  });

  // W3: vóór een run en ≥ 60 s statisch of PNF per spiergroep (alleen doelen
  // met gewicht 1) per kant in deze routine.
  if (routine.preRun) {
    const perGroup = new Map();
    for (const step of routine.steps) {
      const ex = exercises.get(step.exerciseId);
      if (!COUNTED.has(ex.type)) continue;
      const sec = secondsPerSide(step, ex);
      for (const t of ex.targets) {
        if (t.weight !== 1) continue;
        const g = perGroup.get(t.group) ?? { L: 0, R: 0 };
        g.L += sec.L;
        g.R += sec.R;
        perGroup.set(t.group, g);
      }
    }
    for (const [group, g] of perGroup) {
      if (Math.max(g.L, g.R) >= W3_LIMIT_SEC) out.push(warning('W3', { group }));
    }
  }

  // W4: totale tijd > 900 s.
  const { totalSec } = compileRoutine(routine, exercises, { timing: meta.timing, sideSwitchSec: ctx.sideSwitchSec });
  if (totalSec > MAX_TOTAL_SEC) out.push(warning('W4', { totalSec }));

  // W5–W7 gaan over de geplande weekdosis: alle actieve routines samen.
  const active = (ctx.otherRoutines ?? []).filter((r) => r.active !== false && r.id !== routine.id);
  if (routine.active !== false) active.push(routine);
  const week = plannedWeekDose(active, exercises);

  // W5: groepen waar deze (actieve) routine statische of PNF-tijd aan
  // toevoegt en die per kant boven 600 s per week komen. Een inactieve
  // routine telt niet mee in de weekdosis en voegt dus niets toe.
  if (routine.active !== false) {
    for (const [group, own] of routineDose(routine, exercises)) {
      if (own.L === 0 && own.R === 0) continue;
      const sec = meterValue(week.get(group));
      if (sec > meta.dose.plateauSec) out.push(warning('W5', { group, sec }));
    }
  }

  // W6/W7: groepen die in deze (actieve) routine primair doel zijn.
  if (routine.active !== false) {
    const primary = new Set();
    for (const step of routine.steps) {
      for (const t of exercises.get(step.exerciseId).targets) if (t.weight === 1) primary.add(t.group);
    }
    for (const group of primary) {
      // Is er in de actieve routines een statische of PNF-oefening die deze
      // groep raakt?
      const hasCounted = active.some((r) => r.steps.some((s) => {
        const ex = exercises.get(s.exerciseId);
        return COUNTED.has(ex.type) && ex.targets.some((t) => t.group === group);
      }));
      const sec = meterValue(week.get(group));
      if (!hasCounted) out.push(warning('W7', { group }));
      else if (sec < meta.dose.thresholdSec) out.push(warning('W6', { group, sec }));
    }
  }

  return out;
}

// Wat er van een routine overblijft om af te spelen: stappen die W1 of W8
// geven, gaan eruit (§6.7: "A5 zonder rf_zijlig"). De overgangstijd van de
// stap ervoor blijft staan; is de verwijderde stap de laatste, dan vervalt de
// overgang vanzelf.
export function playableRoutine(routine, ctx) {
  const { exercises, meta } = ctx.lib;
  const removed = [];
  const steps = routine.steps.filter((step, stepIndex) => {
    const gate = access(exercises.get(step.exerciseId), ctx.knee, meta.knee);
    if (!gate.allowed) removed.push({ stepIndex, exerciseId: step.exerciseId, codes: gate.codes });
    return gate.allowed;
  });
  return { routine: { ...routine, steps }, removed };
}
