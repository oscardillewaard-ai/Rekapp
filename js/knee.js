// Kniecheck, knieslot met 48-uurstest en opvlammingsmodus (§6.6–6.7).
// Puur: elke functie krijgt de kniestatus en het tijdstip mee en geeft een
// nieuwe status terug; opslaan doet de aanroeper.
//
// KneeState = {
//   unlocks: { [exerciseId]: { state, cleanCount, cooldownUntil, cycles: [Cycle] } },
//   flare:   { active, since, exitProposedAt },
//   checks:  [{ id, at, pain, context: 'dagelijks'|'test'|'24u'|'48u', exerciseId? }],
// }
// Cycle = { exposureAt, painBefore, painDuring, p24, p48, result }
//   result: null (loopt), 'schoon', 'niet schoon', 'vervallen', 'opvlamming'
// Tijden zijn milliseconden sinds 1970 (Date.now()).

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export const STATES = ['vergrendeld', 'test', 'voorlopig', 'vrij'];

export function emptyKneeState() {
  return { unlocks: {}, flare: { active: false, since: null, exitProposedAt: null }, checks: [] };
}

function clone(state) {
  return structuredClone(state);
}

function freshUnlock() {
  return { state: 'vergrendeld', cleanCount: 0, cooldownUntil: null, cycles: [] };
}

// Status in het ontgrendelprotocol. Niet-vergrendelde oefeningen doen niet
// mee en hebben geen status (null).
export function unlockState(ex, state) {
  if (!ex.locked) return null;
  return state.unlocks[ex.id]?.state ?? 'vergrendeld';
}

// Mag deze oefening worden toegevoegd en afgespeeld? W1 en W8 blokkeren
// (§6.5). Dit is de enige poort; bouwer en speler gebruiken allebei deze
// functie.
export function access(ex, state, kneeMeta) {
  const codes = [];
  if (ex.locked && unlockState(ex, state) === 'vergrendeld') codes.push('W1');
  if (state.flare.active && ex.kneeFlexionMaxDeg > kneeMeta.flareMaxDeg) codes.push('W8');
  return { allowed: codes.length === 0, codes };
}

function openCycle(rec) {
  const last = rec.cycles[rec.cycles.length - 1];
  return last && last.result === null ? last : null;
}

// De lopende cyclus (nog geen uitslag), of null.
export const currentCycle = (rec) => (rec ? openCycle(rec) : null);

// Vensters van de 24- en 48-uurscheck van een cyclus, in ms.
export function cycleSchedule(cycle, kneeMeta) {
  const w = kneeMeta.checkWindowsHours;
  return {
    h24: [cycle.exposureAt + w.h24[0] * HOUR, cycle.exposureAt + w.h24[1] * HOUR],
    h48: [cycle.exposureAt + w.h48[0] * HOUR, cycle.exposureAt + w.h48[1] * HOUR],
  };
}

// Begeleide proef (§6.6): 1 × 30 s per kant (bilateraal: 30 s).
export const TRIAL_SEC = 30;
export function trialStep(ex) {
  return ex.sided === 'unilateral' ? { exerciseId: ex.id, perSideSec: TRIAL_SEC } : { exerciseId: ex.id, durationSec: TRIAL_SEC };
}

// Oefeningen in deze stappen die in de proefperiode zitten (test of
// voorlopig): elk gebruik is een blootstelling.
export function trialExerciseIds(steps, exercises, state) {
  const ids = new Set();
  for (const step of steps) {
    const st = unlockState(exercises.get(step.exerciseId), state);
    if (st === 'test' || st === 'voorlopig') ids.add(step.exerciseId);
  }
  return [...ids];
}

export function lastExposureAt(rec) {
  return rec?.cycles.length ? rec.cycles[rec.cycles.length - 1].exposureAt : null;
}

function cooldownActive(state, now) {
  return Object.entries(state.unlocks).find(([, r]) => r.cooldownUntil && r.cooldownUntil > now) ?? null;
}

// Voorwaarden vergrendeld → test (§6.6). confirmations: { pain7d,
// noLegTrainingToday, noHeavyNext48h } — de drie bevestigingen van de
// gebruiker. Geeft { ok, reasons[] } terug.
export function canStartTest(ex, state, now, confirmations = {}) {
  const reasons = [];
  if (!ex.locked) reasons.push('Deze oefening is niet vergrendeld.');
  else if (unlockState(ex, state) !== 'vergrendeld') reasons.push('Deze oefening zit al in het ontgrendelprotocol.');
  if (state.flare.active) reasons.push('De opvlammingsmodus staat aan.');
  const cooling = cooldownActive(state, now);
  if (cooling) reasons.push(`Afkoelperiode loopt tot ${new Date(cooling[1].cooldownUntil).toLocaleDateString('nl-NL')}.`);
  const busy = Object.entries(state.unlocks).find(([id, r]) => id !== ex.id && (r.state === 'test' || r.state === 'voorlopig'));
  if (busy) reasons.push(`Er zit al een andere oefening in de proefperiode (${busy[0]}).`);
  if (!confirmations.pain7d) reasons.push('Bevestig: kniepijn de afgelopen 7 dagen steeds ≤2/10.');
  if (!confirmations.noLegTrainingToday) reasons.push('Bevestig: vandaag geen loop- of beentraining.');
  if (!confirmations.noHeavyNext48h) reasons.push('Bevestig: de komende 48 uur geen afdaalsessie of zware beentraining gepland.');
  return { ok: reasons.length === 0, reasons };
}

export function startTest(ex, state, now, confirmations) {
  const check = canStartTest(ex, state, now, confirmations);
  if (!check.ok) throw new Error(check.reasons.join(' '));
  const next = clone(state);
  const rec = next.unlocks[ex.id] ?? freshUnlock();
  rec.state = 'test';
  rec.cleanCount = 0;
  next.unlocks[ex.id] = rec;
  return next;
}

// Proef afgebroken voordat er een blootstelling was: terug naar vergrendeld,
// zonder afkoelperiode.
export function cancelTest(exId, state) {
  const next = clone(state);
  const rec = next.unlocks[exId];
  if (rec && rec.state === 'test' && rec.cycles.every((c) => c.result !== null)) rec.state = 'vergrendeld';
  return next;
}

// Cyclus niet schoon (§6.6): vergrendeld, afkoelperiode, teller terug naar 0.
function failCycle(rec, cycle, at, kneeMeta, events, exId) {
  cycle.result = 'niet schoon';
  const from = rec.state;
  rec.state = 'vergrendeld';
  rec.cleanCount = 0;
  rec.cooldownUntil = at + kneeMeta.cooldownDays * DAY;
  events.push({ type: 'status', exerciseId: exId, from, to: 'vergrendeld' });
  events.push({ type: 'afkoeling', exerciseId: exId, until: rec.cooldownUntil });
  const values = [cycle.painDuring, cycle.p24, cycle.p48].filter((v) => v !== null && v !== undefined);
  if (values.some((v) => v > kneeMeta.painMax)) events.push({ type: 'opvlamming_voorstel', exerciseId: exId });
}

// Blootstelling: de begeleide proef (status test) of gebruik in een routine
// (status test of voorlopig). Opent een nieuwe 24/48-uurscyclus. Loopt er nog
// een cyclus, dan vervalt die en telt de nieuwe vanaf deze blootstelling; de
// teller blijft staan. painDuring mag null zijn: de app legt de blootstelling
// vast zodra de routine klaar is en vraagt de pijn tijdens daarna (zie
// setPainDuring).
export function recordExposure(exId, state, { at, painBefore, painDuring = null }, kneeMeta) {
  const next = clone(state);
  const rec = next.unlocks[exId];
  if (!rec || (rec.state !== 'test' && rec.state !== 'voorlopig')) {
    throw new Error(`Oefening ${exId} is niet in de proefperiode.`);
  }
  if (next.flare.active) throw new Error('Tijdens een opvlamming kan er geen blootstelling zijn.');
  const events = [];
  const running = openCycle(rec);
  if (running) {
    running.result = 'vervallen';
    events.push({ type: 'cyclus_vervallen', exerciseId: exId, reason: 'nieuwe blootstelling' });
  }
  const cycle = { exposureAt: at, painBefore, painDuring, p24: null, p48: null, result: null };
  rec.cycles.push(cycle);
  // Pijn tijdens boven 2/10: direct niet schoon.
  if (painDuring !== null && painDuring > kneeMeta.painMax) failCycle(rec, cycle, at, kneeMeta, events, exId);
  return { state: next, events };
}

// "Kniepijn tijdens" achteraf invullen bij een blootstelling (afrondscherm van
// de speler). Boven 2/10: de cyclus is niet schoon.
export function setPainDuring(exId, state, { exposureAt, pain }, kneeMeta) {
  const next = clone(state);
  const events = [];
  const rec = next.unlocks[exId];
  const c = rec && openCycle(rec);
  if (!c || c.exposureAt !== exposureAt) return { state: next, events }; // al vervallen of afgesloten
  c.painDuring = pain;
  if (pain > kneeMeta.painMax) failCycle(rec, c, exposureAt, kneeMeta, events, exId);
  return { state: next, events };
}

function inWindow(cycle, at, [fromH, toH]) {
  const h = (at - cycle.exposureAt) / HOUR;
  return h >= fromH && h <= toH;
}

// Openstaande 24- en 48-uurschecks die nu in te vullen zijn (§6.6).
export function pendingChecks(state, now, kneeMeta) {
  const due = [];
  for (const [exId, rec] of Object.entries(state.unlocks)) {
    const c = openCycle(rec);
    if (!c || c.painDuring === null) continue;
    if (c.p24 === null && inWindow(c, now, kneeMeta.checkWindowsHours.h24)) due.push({ exerciseId: exId, context: '24u', exposureAt: c.exposureAt });
    if (c.p24 !== null && c.p48 === null && inWindow(c, now, kneeMeta.checkWindowsHours.h48)) due.push({ exerciseId: exId, context: '48u', exposureAt: c.exposureAt });
  }
  return due;
}

// Een niet-ingevulde check telt niet als schoon: de cyclus vervalt en de
// teller blijft staan (§6.6).
export function expireChecks(state, now, kneeMeta) {
  const next = clone(state);
  const events = [];
  for (const [exId, rec] of Object.entries(next.unlocks)) {
    const c = openCycle(rec);
    if (!c) continue;
    const hours = (now - c.exposureAt) / HOUR;
    const missedDuring = c.painDuring === null && hours >= kneeMeta.checkWindowsHours.h24[0];
    const missed24 = c.p24 === null && hours > kneeMeta.checkWindowsHours.h24[1];
    const missed48 = c.p48 === null && hours > kneeMeta.checkWindowsHours.h48[1];
    if (missedDuring || missed24 || missed48) {
      c.result = 'vervallen';
      const reason = missedDuring ? 'kniepijn tijdens niet ingevuld' : missed24 ? '24u niet ingevuld' : '48u niet ingevuld';
      events.push({ type: 'cyclus_vervallen', exerciseId: exId, reason });
    }
  }
  return { state: next, events };
}

// Opvlammingsmodus aan (§6.7): elke oefening in test, voorlopig of vrij gaat
// naar vergrendeld en begint na de opvlamming opnieuw.
export function activateFlare(state, at, reason = 'handmatig') {
  const next = clone(state);
  const events = [];
  if (!next.flare.active) {
    next.flare = { active: true, since: at, exitProposedAt: null };
    events.push({ type: 'opvlamming_aan', reason });
  }
  for (const [exId, rec] of Object.entries(next.unlocks)) {
    const c = openCycle(rec);
    if (c) c.result = 'opvlamming';
    if (rec.state !== 'vergrendeld') {
      events.push({ type: 'status', exerciseId: exId, from: rec.state, to: 'vergrendeld' });
      rec.state = 'vergrendeld';
    }
    rec.cleanCount = 0;
  }
  return { state: next, events };
}

// "Nog niet" op het voorstel om de opvlamming te beëindigen: vandaag niet
// meer vragen (morgen weer, als de reeks dan nog klopt).
export function postponeFlareExit(state, at) {
  const next = clone(state);
  next.flare.exitProposedAt = at;
  return next;
}

export function flareExitPostponedToday(state, now) {
  const t = state.flare.exitProposedAt;
  return Boolean(t) && dayKey(t) === dayKey(now);
}

export function endFlare(state) {
  const next = clone(state);
  next.flare = { active: false, since: null, exitProposedAt: null };
  return next;
}

// Kniecheck vastleggen (§6.6, §6.7). check: { id, at, pain, context,
// exerciseId? }. Een check boven 2/10 (dagelijks, 24u of 48u) zet de
// opvlammingsmodus automatisch aan.
export function recordKneeCheck(state, check, kneeMeta) {
  let next = clone(state);
  const events = [];
  const { at, pain, context, exerciseId } = check;

  if (context === '24u' || context === '48u') {
    const rec = next.unlocks[exerciseId];
    const c = rec && openCycle(rec);
    const win = context === '24u' ? kneeMeta.checkWindowsHours.h24 : kneeMeta.checkWindowsHours.h48;
    if (!c) throw new Error(`Geen lopende cyclus voor ${exerciseId}.`);
    if (context === '24u' ? c.p24 !== null : c.p24 === null || c.p48 !== null) {
      throw new Error(`De ${context}-check voor ${exerciseId} is nu niet aan de beurt.`);
    }
    if (!inWindow(c, at, win)) throw new Error(`De ${context}-check kan alleen ${win[0]}–${win[1]} uur na de blootstelling.`);

    if (context === '24u') c.p24 = pain;
    else c.p48 = pain;
    const ok = pain <= kneeMeta.painMax && pain <= c.painBefore;
    if (!ok) {
      failCycle(rec, c, at, kneeMeta, events, exerciseId);
    } else if (context === '48u') {
      c.result = 'schoon';
      rec.cleanCount += 1;
      const from = rec.state;
      if (rec.cleanCount >= kneeMeta.cleanCyclesToUnlock) rec.state = 'vrij';
      else if (rec.state === 'test') rec.state = 'voorlopig';
      if (rec.state !== from) events.push({ type: 'status', exerciseId, from, to: rec.state });
    }
  }

  next.checks.push({ ...check });

  if (context !== 'test' && pain > kneeMeta.painMax) {
    const flare = activateFlare(next, at, `kniecheck ${context} ${pain}/10`);
    next = flare.state;
    events.push(...flare.events);
    // De automatische opvlamming vervangt het voorstel.
    for (let i = events.length - 1; i >= 0; i--) if (events[i].type === 'opvlamming_voorstel') events.splice(i, 1);
  }
  return { state: next, events };
}

// Dag volgens de dagelijkse kniecheck: een nieuwe dag begint om 04:00 lokale
// tijd (§6.7). Geeft 'JJJJ-MM-DD' terug.
export function dayKey(ms) {
  const d = new Date(ms);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getHours() < 4 ? 1 : 0));
  const pad = (n) => String(n).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

function previousDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1, 12).getTime());
}

// Eén kaart per dag, bij de eerste keer openen na 04:00 (§6.7).
export function dailyCheckDue(state, now) {
  const today = dayKey(now);
  return !state.checks.some((c) => c.context === 'dagelijks' && dayKey(c.at) === today);
}

// §6.7 Uit: na 7 opeenvolgende dagelijkse kniechecks ≤2/10 het voorstel om de
// modus te beëindigen. Dagen zonder check tellen niet (ze breken de reeks).
export function flareExitDue(state, now, kneeMeta) {
  return state.flare.active && flareStreak(state, now, kneeMeta) >= kneeMeta.flareExitDays;
}

// Aantal opeenvolgende dagen (tot en met vandaag of gisteren) met een
// dagelijkse kniecheck en geen check boven 2/10, sinds de opvlamming begon.
export function flareStreak(state, now, kneeMeta) {
  if (!state.flare.active) return 0;
  const byDay = new Map();
  for (const c of state.checks) {
    if (c.at < state.flare.since || c.at > now) continue;
    const key = dayKey(c.at);
    const day = byDay.get(key) ?? { daily: false, high: false };
    if (c.context === 'dagelijks') day.daily = true;
    if (c.pain > kneeMeta.painMax) day.high = true;
    byDay.set(key, day);
  }
  let key = dayKey(now);
  if (!byDay.get(key)?.daily) key = previousDayKey(key);
  let streak = 0;
  for (;;) {
    const day = byDay.get(key);
    if (!day || !day.daily || day.high) break;
    streak += 1;
    if (streak >= kneeMeta.flareExitDays) break;
    key = previousDayKey(key);
  }
  return streak;
}

// Instellingen → "ontgrendelingen resetten".
export function resetUnlocks(state) {
  const next = clone(state);
  next.unlocks = {};
  return next;
}
