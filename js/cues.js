// Wat de speler per segment zegt en toont (§6.8.2). Puur: geen DOM, geen audio.

// Letterlijk uit §6.8.2.
export const SPOKEN = {
  contract: 'Aanspannen…',
  relax: 'Loslaten, zak verder',
  switch: 'Wissel van kant',
  next: 'Volgende:',
  rest: 'Rust.',
};

const SIDE_SPOKEN = { L: 'Linkerkant.', R: 'Rechterkant.' };
const SIDE_LABEL = { L: 'Links', R: 'Rechts' };
const SIDED_LABEL = { bilateral: 'Beide kanten', alternating: 'Afwisselend' };

// Naam zonder toelichting tussen haakjes: "Kuit tegen de muur (gestrekte
// knie)" wordt "Kuit tegen de muur", zoals in het voorbeeld van §6.8.2.
export function spokenName(ex) {
  return ex.name.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

const sentence = (t) => (/[.!?…]$/.test(t) ? t : `${t}.`);

// Gesproken tekst bij het begin van een segment, of null.
// segments: de hele timeline, voor de context (eerste ronde van een kant,
// extra set). exercises: Map id → oefening.
export function speechFor(segments, index, exercises, { catchUp = false } = {}) {
  const seg = segments[index];
  const ex = exercises.get(seg.exerciseId);
  const side = seg.side ? `${SIDE_SPOKEN[seg.side]} ` : '';
  const extra = seg.set === 'extra' ? 'Extra set. ' : '';
  // Sets: "Set 2 van 3." bij het begin van de set (de eerste kant).
  const setNo = seg.setNo && seg.side !== 'R' ? `Set ${seg.setNo} van ${seg.setCount}. ` : '';
  switch (seg.kind) {
    case 'prep':
      return ex ? `${SPOKEN.next} ${sentence(spokenName(ex))}` : null;
    case 'work':
      // Na een inhaalslag is het blok al bezig: dan geen volle duur noemen.
      return catchUp ? `${setNo}${extra}${side}${sentence(spokenName(ex))}` : `${setNo}${extra}${side}${sentence(spokenName(ex))} ${seg.durationSec} seconden.`;
    case 'contract': {
      const prev = segments[index - 1];
      const firstOfSide = !prev || prev.kind !== 'relax' || prev.side !== seg.side || prev.stepIndex !== seg.stepIndex;
      return firstOfSide ? `${extra}${side}${sentence(spokenName(ex))} ${SPOKEN.contract}` : SPOKEN.contract;
    }
    case 'relax':
      return SPOKEN.relax;
    case 'switch':
      return SPOKEN.switch;
    case 'rest':
      return catchUp ? SPOKEN.rest : `${SPOKEN.rest} ${seg.durationSec} seconden.`;
    case 'transition':
      return `${SPOKEN.next} ${sentence(spokenName(exercises.get(seg.nextExerciseId)))}`;
    default:
      return null;
  }
}

// Wat er groot op het scherm staat (§6.2 speler: naam en kant).
export function displayFor(segments, index, exercises) {
  const seg = segments[index];
  const ex = exercises.get(seg.exerciseId);
  const nextEx = seg.kind === 'transition' ? exercises.get(seg.nextExerciseId) : null;
  const sideLabel = seg.side ? SIDE_LABEL[seg.side] : ex ? SIDED_LABEL[ex.sided] ?? '' : '';
  const setLabel = seg.setNo ? `Set ${seg.setNo} van ${seg.setCount}` : '';
  const label = {
    prep: 'Voorbereiden',
    work: seg.set === 'extra' ? 'Extra set' : setLabel ? `Rekken · ${setLabel.toLowerCase()}` : 'Rekken',
    contract: 'Aanspannen',
    relax: 'Loslaten en verder rekken',
    switch: SPOKEN.switch,
    rest: `Rust · straks ${setLabel.toLowerCase()}`,
    transition: nextEx ? `${SPOKEN.next} ${nextEx.name}` : '',
  }[seg.kind];
  // Tijdens voorbereiding, kantwissel, rust en overgang staat de volgende
  // houding al in beeld.
  let upcoming = null;
  for (let i = index + 1; i < segments.length; i++) {
    if (['work', 'contract'].includes(segments[i].kind)) { upcoming = segments[i]; break; }
  }
  return {
    exercise: seg.kind === 'transition' ? nextEx : ex,
    sideLabel: seg.kind === 'transition' ? '' : ['switch', 'prep', 'rest'].includes(seg.kind) ? sideOf(upcoming, exercises) : sideLabel,
    label,
    upcoming,
  };
}

function sideOf(seg, exercises) {
  if (!seg) return '';
  if (seg.side) return SIDE_LABEL[seg.side];
  return SIDED_LABEL[exercises.get(seg.exerciseId)?.sided] ?? '';
}

// "Volgende: …" onderaan: de eerstvolgende andere oefening.
export function nextExerciseAfter(segments, index, exercises) {
  const cur = segments[index];
  const curStep = cur.kind === 'prep' ? -1 : cur.stepIndex;
  const nextSeg = segments.find((s, i) => i > index && s.kind !== 'transition' && s.stepIndex !== null && s.stepIndex > curStep);
  return nextSeg ? exercises.get(nextSeg.exerciseId) : null;
}
