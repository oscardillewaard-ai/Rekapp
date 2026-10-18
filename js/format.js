// Opmaak voor de weergave (Nederlands). Puur: geen DOM.
import { compileRoutine } from './timeline.js';

const nl2 = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nl1 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 });

// Score met twee decimalen: 4,80.
export const formatScore = (n) => nl2.format(n);

// Sterren: 4,5 of 5.
export const formatStars = (n) => nl1.format(n);

// Seconden als m:ss.
export function formatDuration(sec) {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const TYPE_LABELS = { static: 'statisch', pnf: 'PNF', dynamic: 'dynamisch', active: 'actief' };
export const SLOT_LABELS = { ochtend: 'ochtend', avond: 'avond', beide: 'ochtend en avond', vrij: 'vrij' };
export const SIDED_LABELS = { unilateral: 'per kant', bilateral: 'beide kanten tegelijk', alternating: 'afwisselend' };

// Bewijslabel in woorden (§6.2): B5 sterk, B4 matig, B3 beperkt, B2 zwak, B1 geen.
export const evidenceLabel = (B, meta) => meta.scoring.evidenceLabels[String(B)];

// Dosis in woorden, bv. "45 s per kant", "2 × (5 s aanspannen + 25 s rekken)
// per kant", "60 s · 16 herhalingen".
export function formatDose(dose, ex) {
  const parts = [];
  if (dose.pnf) {
    const { rounds, contractSec, stretchSec } = dose.pnf;
    parts.push(`${rounds} × (${contractSec} s aanspannen + ${stretchSec} s rekken)${ex.sided === 'unilateral' ? ' per kant' : ''}`);
  } else if (dose.perSideSec !== undefined) {
    parts.push(`${dose.perSideSec} s per kant`);
  } else if (dose.durationSec !== undefined) {
    parts.push(`${dose.durationSec} s${ex.sided === 'alternating' ? ', afwisselend' : ''}`);
  }
  if (dose.reps) parts.push(`${dose.reps} ${dose.reps === 1 ? 'herhaling' : 'herhalingen'}`);
  return parts.join(' · ');
}

// Tijd van één oefening met de standaarddosis, zonder de voorbereiding:
// werkblokken plus kantwissels (§6.8.1).
export function exerciseDurationSec(ex, timing) {
  const step = { exerciseId: ex.id, ...ex.defaultDose };
  const { totalSec } = compileRoutine({ steps: [step] }, new Map([[ex.id, ex]]), { timing });
  return totalSec - timing.prepSec;
}

// Tijdstippen in de kniestatus: "za 18 okt, 09:30" en "18 okt".
const momentFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' });
export const formatMoment = (ms) => momentFmt.format(ms);
export const formatDay = (ms) => dayFmt.format(ms);
