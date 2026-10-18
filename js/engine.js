// Timer-state machine van de speler (§6.8.2). Puur: elke functie krijgt de
// toestand en het tijdstip (ms, performance.now()) mee en geeft een nieuwe
// toestand plus gebeurtenissen terug. De resterende tijd komt altijd uit
// tijdstempels; er wordt nooit geteld met setInterval.
//
// Statussen: 'idle' → start → 'running' (eerste segment is de voorbereiding)
// ⇄ 'paused'; 'confirm' (stoppen bevestigen); 'done' (laatste segment klaar);
// 'stopped' (gestopt na bevestiging).
//
// De engine bewaart per segment alleen segmentIndex, segmentStartedAt en
// pausedRemainingMs; daarnaast houdt hij bij welke werkblokken gedaan zijn
// (segmentsDone, §6.9) en hoeveel tijd er actief is verstreken.

const WORK_KINDS = new Set(['work', 'contract', 'relax']);
const HALFWAY_KINDS = new Set(['work', 'relax']);
const HALFWAY_MIN_MS = 10_000; // zachte piep halverwege alleen bij blokken van ≥ 10 s
const COUNTDOWN_MIN_MS = 4_000; // 3-2-1 alleen bij segmenten van ≥ 4 s

export function createPlayer(segments) {
  return {
    status: 'idle',
    segments,
    segmentIndex: 0,
    segmentStartedAt: null,
    pausedRemainingMs: null,
    statusBeforeConfirm: null,
    firedHalfway: false,
    firedCountdown: 4, // laatst afgegeven tel (4 = nog niets)
    runningSince: null,
    activeMs: 0,
    startedAt: null,
    endedAt: null,
    segmentsDone: [],
  };
}

const durationMs = (seg) => seg.durationSec * 1000;

function enterSegment(s, index, startedAt, events) {
  s.segmentIndex = index;
  s.segmentStartedAt = startedAt;
  s.firedHalfway = false;
  s.firedCountdown = 4;
  events.push({ type: 'segment', index, segment: s.segments[index] });
}

function recordDone(s, seg, sec) {
  if (!WORK_KINDS.has(seg.kind) || sec <= 0) return;
  s.segmentsDone.push({ exerciseId: seg.exerciseId, side: seg.side, kind: seg.kind, sec: Math.round(sec * 10) / 10 });
}

function elapsedMs(s, now) {
  const seg = s.segments[s.segmentIndex];
  if (s.status === 'paused' || s.status === 'confirm') return durationMs(seg) - s.pausedRemainingMs;
  return Math.min(durationMs(seg), Math.max(0, now - s.segmentStartedAt));
}

function stopClock(s, now) {
  if (s.runningSince !== null) {
    s.activeMs += now - s.runningSince;
    s.runningSince = null;
  }
}

// Wat er nu op het scherm hoort: segment, resterende tijd van het segment en
// van de hele routine.
export function view(s, now) {
  const seg = s.segments[s.segmentIndex];
  if (s.status === 'idle') {
    return { segment: seg, remainingMs: durationMs(seg), totalRemainingMs: s.segments.reduce((a, x) => a + durationMs(x), 0) };
  }
  if (s.status === 'done' || s.status === 'stopped') return { segment: seg, remainingMs: 0, totalRemainingMs: 0 };
  const remainingMs = durationMs(seg) - elapsedMs(s, now);
  let later = 0;
  for (let i = s.segmentIndex + 1; i < s.segments.length; i++) later += durationMs(s.segments[i]);
  return { segment: seg, remainingMs, totalRemainingMs: remainingMs + later };
}

export function start(state, now) {
  if (state.status !== 'idle') return { state, events: [] };
  const s = { ...state, segmentsDone: [], status: 'running', startedAt: now, runningSince: now };
  const events = [];
  enterSegment(s, 0, now, events);
  return { state: s, events };
}

// Bij elk animatieframe. Haalt ook een achterstand in (scherm verborgen zonder
// auto-pauze): springt naar het juiste segment en geeft alleen voor het
// huidige segment nog tellen af.
export function tick(state, now) {
  if (state.status !== 'running') return { state, events: [] };
  const s = { ...state, segmentsDone: [...state.segmentsDone] };
  const events = [];
  for (;;) {
    const seg = s.segments[s.segmentIndex];
    const end = s.segmentStartedAt + durationMs(seg);
    if (now < end) break;
    recordDone(s, seg, seg.durationSec);
    if (s.segmentIndex === s.segments.length - 1) {
      stopClock(s, end);
      s.status = 'done';
      s.endedAt = end;
      events.push({ type: 'done' });
      return { state: s, events };
    }
    enterSegment(s, s.segmentIndex + 1, end, events);
  }

  const seg = s.segments[s.segmentIndex];
  const dur = durationMs(seg);
  const elapsed = now - s.segmentStartedAt;
  const remaining = dur - elapsed;
  if (!s.firedHalfway && HALFWAY_KINDS.has(seg.kind) && dur >= HALFWAY_MIN_MS && elapsed >= dur / 2) {
    s.firedHalfway = true;
    // Niet meer piepen als de tel al bijna begint.
    if (remaining > 3000) events.push({ type: 'halfway', index: s.segmentIndex });
  }
  if (dur >= COUNTDOWN_MIN_MS && remaining <= 3000) {
    const n = Math.ceil(remaining / 1000); // 3, 2 of 1
    if (n >= 1 && n < s.firedCountdown) {
      s.firedCountdown = n;
      events.push({ type: 'countdown', n, index: s.segmentIndex });
    }
  }
  return { state: s, events };
}

export function pause(state, now) {
  if (state.status !== 'running') return { state, events: [] };
  const caught = tick(state, now);
  if (caught.state.status !== 'running') return caught;
  const s = { ...caught.state };
  s.pausedRemainingMs = durationMs(s.segments[s.segmentIndex]) - (now - s.segmentStartedAt);
  stopClock(s, now);
  s.status = 'paused';
  return { state: s, events: [...caught.events, { type: 'paused' }] };
}

// Hervatten: segmentStartedAt = nu − verstreken (§6.8.2).
export function resume(state, now) {
  if (state.status !== 'paused') return { state, events: [] };
  const s = { ...state };
  const seg = s.segments[s.segmentIndex];
  s.segmentStartedAt = now - (durationMs(seg) - s.pausedRemainingMs);
  s.pausedRemainingMs = null;
  s.status = 'running';
  s.runningSince = now;
  return { state: s, events: [{ type: 'resumed' }] };
}

// Springen naar een ander segment (volgende/terug). Het lopende werkblok telt
// mee voor zover het gedaan is. Gepauzeerd blijft gepauzeerd.
function jump(state, now, target) {
  const s = { ...state, segmentsDone: [...state.segmentsDone] };
  const cur = s.segments[s.segmentIndex];
  recordDone(s, cur, elapsedMs(s, now) / 1000);
  const events = [];
  if (target >= s.segments.length) {
    stopClock(s, now);
    s.status = 'done';
    s.endedAt = now;
    events.push({ type: 'done' });
    return { state: s, events };
  }
  enterSegment(s, target, now, events);
  if (s.status === 'paused') s.pausedRemainingMs = durationMs(s.segments[target]);
  return { state: s, events };
}

const stepOf = (seg) => (seg.kind === 'prep' ? -1 : seg.stepIndex);

// ⏭ Volgende oefening: eerst naar de aangekondigde overgang ("Volgende: …"),
// vanuit de overgang of de voorbereiding naar het begin van de volgende
// oefening. Na de laatste oefening is de routine klaar.
export function next(state, now) {
  if (state.status !== 'running' && state.status !== 'paused') return { state, events: [] };
  const segs = state.segments;
  const cur = segs[state.segmentIndex];
  const step = stepOf(cur);
  let target;
  if (cur.kind === 'transition' || cur.kind === 'prep') {
    target = segs.findIndex((x) => x.kind !== 'prep' && x.kind !== 'transition' && x.stepIndex === step + 1);
    if (target < 0) target = segs.length;
  } else {
    target = segs.findIndex((x, i) => i > state.segmentIndex && (x.stepIndex !== step || x.kind === 'transition'));
    if (target < 0) target = segs.length;
  }
  return jump(state, now, target);
}

// ⏮ Terug: naar het begin van de huidige oefening (tijdens een overgang: de
// oefening die net klaar is; tijdens de voorbereiding: opnieuw voorbereiden).
export function back(state, now) {
  if (state.status !== 'running' && state.status !== 'paused') return { state, events: [] };
  const cur = state.segments[state.segmentIndex];
  const target = cur.kind === 'prep' ? 0 : state.segments.findIndex((x) => x.kind !== 'prep' && x.stepIndex === cur.stepIndex);
  return jump(state, now, target);
}

// ✕ Stoppen vraagt eerst bevestiging; de timer staat dan stil.
export function requestStop(state, now) {
  if (state.status !== 'running' && state.status !== 'paused') return { state, events: [] };
  const paused = state.status === 'running' ? pause(state, now) : { state, events: [] };
  if (paused.state.status !== 'paused') return paused; // net klaar
  return { state: { ...paused.state, status: 'confirm', statusBeforeConfirm: state.status }, events: paused.events };
}

export function cancelStop(state, now) {
  if (state.status !== 'confirm') return { state, events: [] };
  const s = { ...state, status: 'paused' };
  return state.statusBeforeConfirm === 'running' ? resume(s, now) : { state: s, events: [] };
}

export function confirmStop(state, now) {
  if (state.status !== 'confirm') return { state, events: [] };
  const s = { ...state, segmentsDone: [...state.segmentsDone] };
  recordDone(s, s.segments[s.segmentIndex], elapsedMs(s, now) / 1000);
  s.status = 'stopped';
  s.endedAt = now;
  return { state: s, events: [{ type: 'stopped' }] };
}

// Status voor het logboek (§6.9): voltooid als de routine tot het einde liep;
// na stoppen gedeeltelijk als er werk gedaan is, anders afgebroken.
export function sessionStatus(state) {
  if (state.status === 'done') return 'voltooid';
  return state.segmentsDone.length ? 'gedeeltelijk' : 'afgebroken';
}

export const activeSec = (state) => Math.round(state.activeMs / 1000);
