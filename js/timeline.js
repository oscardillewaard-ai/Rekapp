// Routine → lijst segmenten (§6.8.1). De totale tijd in de bouwer is de som van
// precies deze lijst. Puur: geen DOM, geen opslag.

// Automatische overgang (§6.3): hoog = staand of stoel, laag = vloer of
// liggend; hoog→hoog 5 s, laag→laag 10 s, hoog↔laag 15 s.
export function autoTransitionSec(fromEx, toEx, timing) {
  const a = timing.positionClass[fromEx.position];
  const b = timing.positionClass[toEx.position];
  if (a === 'hoog' && b === 'hoog') return timing.transitionSec.hoog_hoog;
  if (a === 'laag' && b === 'laag') return timing.transitionSec.laag_laag;
  return timing.transitionSec.hoog_laag;
}

// exercises: Map id → oefening. timing: meta.timing uit de bibliotheek.
// sideSwitchSec: uit de instellingen (standaard 5 s, §6.8.1).
export function compileRoutine(routine, exercises, { timing, sideSwitchSec = timing.sideSwitchSec } = {}) {
  const segments = [];
  const push = (seg) => segments.push(seg);
  push({ kind: 'prep', stepIndex: null, exerciseId: routine.steps[0]?.exerciseId ?? null, side: null, durationSec: timing.prepSec });

  routine.steps.forEach((step, stepIndex) => {
    const ex = exercises.get(step.exerciseId);
    if (!ex) throw new Error(`Onbekende oefening "${step.exerciseId}" in stap ${stepIndex + 1}.`);
    const base = { stepIndex, exerciseId: ex.id };
    const unilateral = ex.sided === 'unilateral';
    const sw = () => push({ ...base, kind: 'switch', side: null, durationSec: sideSwitchSec });

    // Sets (§6.8.1): per set L en R (of één blok), met rust tussen de sets.
    // Zonder sets (1) zijn de segmenten precies als voorheen.
    const sets = step.sets ?? 1;
    const setInfo = (n) => (sets > 1 ? { setNo: n, setCount: sets } : {});
    for (let n = 1; n <= sets; n++) {
      if (n > 1) push({ ...base, kind: 'rest', side: null, ...setInfo(n), durationSec: step.restSec });
      // Kanten in afspeelvolgorde: L, R en na de laatste set eventueel de
      // extra set zwakke kant.
      const sides = unilateral ? ['L', 'R'] : [null];
      if (unilateral && step.extraWeakSide && n === sets) sides.push(step.extraWeakSide);

      sides.forEach((side, i) => {
        if (i > 0) sw();
        const set = i < 2 ? 'normaal' : 'extra';
        const info = set === 'normaal' ? setInfo(n) : {};
        if (step.pnf) {
          for (let round = 1; round <= step.pnf.rounds; round++) {
            push({ ...base, kind: 'contract', side, set, round, durationSec: step.pnf.contractSec });
            push({ ...base, kind: 'relax', side, set, round, durationSec: step.pnf.stretchSec });
          }
        } else {
          push({ ...base, kind: 'work', side, set, ...info, durationSec: unilateral ? step.perSideSec : step.durationSec });
        }
      });
    }

    const next = routine.steps[stepIndex + 1];
    if (next) {
      const nextEx = exercises.get(next.exerciseId);
      if (!nextEx) throw new Error(`Onbekende oefening "${next.exerciseId}" in stap ${stepIndex + 2}.`);
      push({
        ...base,
        kind: 'transition',
        side: null,
        nextExerciseId: nextEx.id,
        durationSec: step.transitionAfterSec ?? autoTransitionSec(ex, nextEx, timing),
      });
    }
  });

  const totalSec = segments.reduce((sum, s) => sum + s.durationSec, 0);
  return { segments, totalSec };
}
