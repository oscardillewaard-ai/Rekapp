// Zelftests (§6.10): gemiddelde van drie pogingen, persoonlijke meetfout uit
// de nulmeting, echte verandering, hertestschema en "aandacht" bij een
// verschil tussen links en rechts. Puur: tijdstippen komen van de aanroeper.
//
// Meting (§8.2 store `tests`): { id, date, testId, side, trials[], mean, unit }
// met date als ISO-tijd met tijdzone.

const DAY = 24 * 3600 * 1000;
export const TRIALS = 3;
export const SIDES = ['L', 'R'];
// Ondergrens van de meetfout: de kleinste stap die je afleest (1 cm of 1°).
// Twee gelijke nulmetingen geven anders een meetfout van 0, en dan zou elk
// verschil "echt" zijn (zie AFWIJKINGEN.md).
export const MIN_ERROR = 1;
// Hertest in week 4, 8 en 12, daarna elke 8 weken.
export const RETEST_WEEKS = [4, 8, 12];
export const RETEST_EVERY_WEEKS = 8;

export const mean = (trials) => trials.reduce((a, b) => a + b, 0) / trials.length;
export const round1 = (v) => Math.round(v * 10) / 10;

export function newMeasurement({ id, date, test, side, trials }) {
  return { id, date, testId: test.id, side, trials: [...trials], mean: round1(mean(trials)), unit: test.unit };
}

// Invoer van één poging: een getal met komma of punt, eventueel negatief
// (bij de rugkraktest telt overlap negatief).
export function parseTrial(text) {
  const t = String(text ?? '').trim().replace(',', '.').replace('−', '-');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

const dayOf = (iso) => iso.slice(0, 10); // lokale datum zoals vastgelegd
function daysBetween(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY);
}

// Eén punt per meetdag (de laatste meting van die dag), oud → nieuw.
export function series(measurements, testId, side) {
  const byDay = new Map();
  for (const m of measurements) {
    if (m.testId !== testId || m.side !== side) continue;
    const day = dayOf(m.date);
    const prev = byDay.get(day);
    if (!prev || Date.parse(m.date) >= Date.parse(prev.date)) byDay.set(day, m);
  }
  return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, m]) => ({ day, at: Date.parse(m.date), mean: m.mean, id: m.id }));
}

// Nulmeting (§6.10): de eerste twee opeenvolgende meetdagen. Het verschil is
// de persoonlijke meetfout.
export function baseline(points) {
  for (let i = 0; i + 1 < points.length; i++) {
    if (daysBetween(points[i].day, points[i + 1].day) === 1) {
      const [a, b] = [points[i], points[i + 1]];
      return { days: [a.day, b.day], start: a.at, mean: (a.mean + b.mean) / 2, error: round1(Math.abs(a.mean - b.mean)) };
    }
  }
  return null;
}

// Vergelijken in honderdsten: 1,4 − 0,0000000000000014 is gewoon 1,4 (wat
// het scherm ook toont), en "meer dan" blijft echt meer dan.
const hundredths = (v) => Math.round(v * 100);

// Alles wat het scherm per test nodig heeft.
export function analyse(test, measurements, now) {
  const sides = {};
  for (const side of SIDES) {
    const points = series(measurements, test.id, side);
    sides[side] = { points, baseline: baseline(points), latest: points[points.length - 1] ?? null };
  }
  const bases = SIDES.map((s) => sides[s].baseline).filter(Boolean);
  // Meetfout van de test: de grootste van beide kanten (voorzichtig), met de
  // ondergrens van één afleesstap. Pas bekend als beide kanten een nulmeting
  // hebben.
  const error = bases.length === SIDES.length ? Math.max(MIN_ERROR, ...bases.map((b) => b.error)) : null;
  // Echte verandering: meer dan 1,5 × de meetfout, of de MDC uit de
  // literatuur als die er is.
  const threshold = test.mdc ?? (error === null ? null : hundredths(1.5 * error) / 100);
  // Alleen metingen ná de nulmeting tellen als verandering.
  for (const side of SIDES) {
    const { baseline: b, latest } = sides[side];
    sides[side].change = b && latest && threshold !== null && latest.day > b.days[1]
      ? { diff: round1(latest.mean - b.mean), real: hundredths(Math.abs(latest.mean - b.mean)) > hundredths(threshold) }
      : null;
  }
  // Verschil links–rechts groter dan de meetfout → "aandacht" (§6.10).
  const L = sides.L.latest;
  const R = sides.R.latest;
  const lrDiff = L && R ? round1(Math.abs(L.mean - R.mean)) : null;
  const attention = error !== null && lrDiff !== null && hundredths(lrDiff) > hundredths(error);
  const start = bases.length ? Math.min(...bases.map((b) => b.start)) : null;
  const last = Math.max(0, ...SIDES.flatMap((s) => sides[s].points.map((p) => p.at)));
  return { test, sides, error, threshold, lrDiff, attention, retest: start === null ? null : retestStatus(start, last, now) };
}

// Hertestschema vanaf de eerste nulmetingsdag.
export function retestDates(start, until) {
  const out = [];
  let week = 0;
  for (let i = 0; ; i++) {
    week = i < RETEST_WEEKS.length ? RETEST_WEEKS[i] : week + RETEST_EVERY_WEEKS;
    const at = start + week * 7 * DAY;
    out.push({ week, at });
    if (at > until) return out;
  }
}

// due: een hertest waarvan de datum voorbij is en waarna nog niet gemeten is
// (meten tot 3 dagen ervoor telt mee). next: de eerstvolgende.
export function retestStatus(start, lastMeasuredAt, now) {
  const dates = retestDates(start, now);
  const past = dates.filter((d) => d.at <= now);
  const lastDue = past[past.length - 1] ?? null;
  const due = lastDue && lastMeasuredAt < lastDue.at - 3 * DAY ? lastDue : null;
  const next = dates.find((d) => d.at > now) ?? null;
  return { due, next };
}

// Spiergroepen met "aandacht" in de bibliotheek: groep-id → test-ids.
export function attentionGroups(tests, measurements, now) {
  const out = new Map();
  for (const test of tests) {
    if (!analyse(test, measurements, now).attention) continue;
    for (const g of test.groups) out.set(g, [...(out.get(g) ?? []), test.id]);
  }
  return out;
}
