// Kniecheck en opvlammingsmodus (§6.7). Puur: elke functie krijgt de
// kniestatus en het tijdstip mee en geeft een nieuwe status terug; opslaan
// doet de aanroeper.
//
// Het knieslot met de 48-uurstest (§6.6) is op verzoek van Oscar verwijderd
// (zie AFWIJKINGEN.md): oefeningen met K ≤ 2 zijn gewoon bruikbaar. De
// opvlammingsmodus blijft hard: tijdens een opvlamming is alles boven 45°
// kniebuiging geblokkeerd (W8).
//
// KneeState = {
//   flare:  { active, since, exitProposedAt },
//   checks: [{ id, at, pain, context: 'dagelijks'|…, exerciseId? }],
// }
// Oudere kniechecks (context test/24u/48u uit de tijd van het knieslot)
// blijven in het logboek staan. Tijden zijn milliseconden sinds 1970.

const HOUR = 3600 * 1000;

export function emptyKneeState() {
  return { flare: { active: false, since: null, exitProposedAt: null }, checks: [] };
}

function clone(state) {
  return structuredClone(state);
}

// Mag deze oefening worden toegevoegd en afgespeeld? Alleen de
// opvlammingsmodus blokkeert (W8, §6.5). Dit is de enige poort; bouwer en
// speler gebruiken allebei deze functie.
export function access(ex, state, kneeMeta) {
  const codes = [];
  if (state.flare.active && ex.kneeFlexionMaxDeg > kneeMeta.flareMaxDeg) codes.push('W8');
  return { allowed: codes.length === 0, codes };
}

// Opvlammingsmodus aan (§6.7).
export function activateFlare(state, at, reason = 'handmatig') {
  const next = clone(state);
  const events = [];
  if (!next.flare.active) {
    next.flare = { active: true, since: at, exitProposedAt: null };
    events.push({ type: 'opvlamming_aan', reason });
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

// Per ongeluk aangezet (keuze Oscar): binnen 24 uur na het aanzetten kun je
// de opvlammingsmodus direct terugdraaien. Daarna alleen via het voorstel na
// 7 dagen (§6.7).
export const UNDO_FLARE_HOURS = 24;
export function canUndoFlare(state, now) {
  return state.flare.active && typeof state.flare.since === 'number' && now - state.flare.since < UNDO_FLARE_HOURS * HOUR && now >= state.flare.since;
}

// Kniecheck vastleggen (§6.7). check: { id, at, pain, context,
// exerciseId? }. Een check boven 2/10 zet de opvlammingsmodus automatisch
// aan.
export function recordKneeCheck(state, check, kneeMeta) {
  let next = clone(state);
  const events = [];
  next.checks.push({ ...check });
  if (check.context === 'dagelijks' && check.pain > kneeMeta.painMax) {
    const flare = activateFlare(next, check.at, `kniecheck ${check.pain}/10`);
    next = flare.state;
    events.push(...flare.events);
  }
  return { state: next, events };
}

// Het laatste tijdstip in de kniestatus (check of opvlamming). Ligt "nu"
// daarvoor, dan is de klok van het toestel teruggezet.
export function latestKneeTime(state) {
  let t = state.flare.since ?? 0;
  for (const c of state.checks) t = Math.max(t, c.at);
  return t;
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
