// Bibliotheek: laden, valideren (§9.1 en §9.2) en sterren bij eigen weging
// (§6.11). Puur: geen DOM, geen opslag.
import { validateSchema } from './schema.js';
import { compileRoutine } from './timeline.js';

const LETTERS = ['B', 'K', 'D', 'R', 'P'];

// Gewichten als hele procenten ({B: 25, ...}), zodat de score exact in
// honderdsten uit te rekenen is zonder afrondingsfouten van 0,15 enz.
export function weightsToPercent(weights) {
  const pct = {};
  for (const l of LETTERS) pct[l] = Math.round(weights[l] * 100);
  return pct;
}

// Score in honderdsten (geheel getal): 25·B + 25·K + 20·D + 15·R + 15·P.
function scoreHundredths(scores, pct) {
  return LETTERS.reduce((sum, l) => sum + pct[l] * scores[l], 0);
}

// §3.2: score = Σ gewicht·deelscore, twee decimalen.
export function computeScore(scores, weightsPct) {
  return scoreHundredths(scores, weightsPct) / 100;
}

// §3.2: sterren = floor(score × 2 + 0,5) / 2; knie-poort: K ≤ maxK → hoogstens
// maxStars. Rekent in honderdsten, zodat 3,25 echt 3,5 sterren wordt.
export function computeStars(scores, weightsPct, kneeGate) {
  const h = scoreHundredths(scores, weightsPct);
  const stars = Math.floor((2 * h + 50) / 100) / 2;
  return scores.K <= kneeGate.maxK ? Math.min(stars, kneeGate.maxStars) : stars;
}

// §9.2 regel 4: K ≤ 2 of meer dan 90° kniebuiging ⇒ vergrendeld.
export function mustBeLocked(ex, meta) {
  return ex.scores.K <= meta.scoring.kneeGate.maxK || ex.kneeFlexionMaxDeg > meta.knee.maxDegUnlocked;
}

// Score en sterren voor de weergave, met de standaardweging uit de
// bibliotheek of een eigen weging. Zonder kniecap (keuze Oscar, zie
// AFWIJKINGEN.md): het knieslot is verwijderd, dus de sterren tonen de score
// zelf. De validator hieronder controleert de bibliotheek nog wel volgens
// §3.2 en §9.2, met de knie-poort.
const NO_CAP = { maxK: -Infinity, maxStars: Infinity };
export function rate(ex, meta, weightsPct = weightsToPercent(meta.scoring.weights)) {
  return {
    score: computeScore(ex.scores, weightsPct),
    stars: computeStars(ex.scores, weightsPct, NO_CAP),
  };
}

export class LibraryError extends Error {
  constructor(errors) {
    const lines = errors.slice(0, 20).map((e) => `- ${e.where}${e.field ? ` · ${e.field}` : ''}: ${e.message}`);
    if (errors.length > 20) lines.push(`- … en nog ${errors.length - 20} fouten`);
    super(`De bibliotheek is niet geldig:\n${lines.join('\n')}`);
    this.name = 'LibraryError';
    this.errors = errors;
  }
}

// Leesbare plaats voor een schemafout: "exercises[17]" → "oefening couch_stretch".
function whereFromPath(lib, path) {
  const m = /^(exercises|groups|routines|tests|sources)\[(\d+)\](?:\.(.*))?$/.exec(path);
  if (!m) return { where: 'bibliotheek', field: path };
  const item = lib[m[1]]?.[Number(m[2])];
  const label = { exercises: 'oefening', groups: 'spiergroep', routines: 'sjabloon', tests: 'test', sources: 'bron' }[m[1]];
  const id = item?.id ?? item?.key ?? `#${m[2]}`;
  return { where: `${label} ${id}`, field: m[3] ?? '' };
}

// Controleert of de dosis van een stap past bij de oefening (PNF ↔ pnf,
// unilateraal ↔ perSideSec, bilateraal/afwisselend ↔ durationSec).
export function stepDoseErrors(step, ex) {
  const errors = [];
  if (ex.type === 'pnf') {
    if (!step.pnf) errors.push({ field: 'pnf', message: 'PNF-oefening heeft rondes × (aanspannen + rekken) nodig' });
  } else if (step.pnf) {
    errors.push({ field: 'pnf', message: `alleen PNF-oefeningen hebben een PNF-dosis (${ex.id} is ${ex.type})` });
  } else if (ex.sided === 'unilateral' && step.perSideSec === undefined) {
    errors.push({ field: 'perSideSec', message: 'unilaterale oefening heeft seconden per kant nodig' });
  } else if (ex.sided !== 'unilateral' && step.durationSec === undefined) {
    errors.push({ field: 'durationSec', message: `${ex.sided === 'bilateral' ? 'bilaterale' : 'afwisselende'} oefening heeft een totale duur nodig` });
  }
  if (step.extraWeakSide && ex.sided !== 'unilateral') {
    errors.push({ field: 'extraWeakSide', message: 'extra set zwakke kant kan alleen bij een unilaterale oefening' });
  }
  return errors;
}

// §9.1 (schema) en §9.2 (inhoud). Geeft een lijst fouten { where, field,
// message } terug; leeg = geldig.
export function validateLibrary(lib, schema) {
  const errors = validateSchema(lib, schema).map((e) => ({ ...whereFromPath(lib, e.path), message: e.message }));
  // Zonder geldige structuur zijn de inhoudsregels niet zinvol na te rekenen.
  if (errors.length) return errors;

  const { meta } = lib;
  const add = (where, field, message) => errors.push({ where, field, message });

  // 1. Unieke id's; doelen bestaan; eerste doel heeft gewicht 1.
  for (const [key, items, idOf] of [
    ['groups', lib.groups, (x) => x.id],
    ['exercises', lib.exercises, (x) => x.id],
    ['routines', lib.routines, (x) => x.id],
    ['tests', lib.tests, (x) => x.id],
    ['sources', lib.sources, (x) => x.key],
  ]) {
    const seen = new Set();
    for (const item of items) {
      const id = idOf(item);
      if (seen.has(id)) add(key, 'id', `dubbele id "${id}"`);
      seen.add(id);
    }
  }
  const groups = new Map(lib.groups.map((g) => [g.id, g]));
  const exercises = new Map(lib.exercises.map((x) => [x.id, x]));
  const sourceKeys = new Set(lib.sources.map((s) => s.key));
  const pct = weightsToPercent(meta.scoring.weights);
  const pctSum = Object.values(pct).reduce((a, b) => a + b, 0);
  if (pctSum !== 100) add('meta', 'scoring.weights', `gewichten tellen op tot ${pctSum}%, niet 100%`);

  for (const ex of lib.exercises) {
    const where = `oefening ${ex.id}`;
    ex.targets.forEach((t, i) => {
      if (!groups.has(t.group)) add(where, `targets[${i}].group`, `onbekende spiergroep "${t.group}"`);
    });
    if (ex.targets[0].weight !== 1) add(where, 'targets[0].weight', 'het eerste doel moet gewicht 1 hebben');
    for (const s of ex.sources) if (!sourceKeys.has(s)) add(where, 'sources', `onbekende bron "${s}"`);

    // 2. Score narekenen; afwijking > 0,005 → fout.
    const score = computeScore(ex.scores, pct);
    if (Math.abs(ex.score - score) > 0.005) {
      add(where, 'score', `staat op ${ex.score}, maar ${LETTERS.map((l) => `${l}${ex.scores[l]}`).join('·')} geeft ${score.toFixed(2)}`);
    }
    // 3. Sterren narekenen (afronding en knie-poort).
    const stars = computeStars(ex.scores, pct, meta.scoring.kneeGate);
    if (ex.stars !== stars) add(where, 'stars', `staat op ${ex.stars}, maar moet ${stars} zijn`);

    // 4. Vergrendeld als en alleen als K ≤ 2 of kniebuiging > 90°.
    const locked = mustBeLocked(ex, meta);
    if (ex.locked !== locked) {
      add(where, 'locked', locked
        ? `moet vergrendeld zijn (K ${ex.scores.K}, kniebuiging ${ex.kneeFlexionMaxDeg}°)`
        : `mag niet vergrendeld zijn (K ${ex.scores.K}, kniebuiging ${ex.kneeFlexionMaxDeg}°)`);
    }

    // 5. B = bBase van de primaire groep, −1 voor dynamisch/actief, tenzij bNote.
    const group = groups.get(ex.targets[0].group);
    if (group && ex.bNote === undefined) {
      const penalty = meta.scoring.techniquePenalty[ex.type] ?? 0;
      const expectedB = Math.max(1, group.bBase - penalty);
      if (ex.scores.B !== expectedB) {
        add(where, 'scores.B', `is ${ex.scores.B}, maar groep ${group.id} (B ${group.bBase})${penalty ? ` met −${penalty} voor ${ex.type}` : ''} geeft ${expectedB}`);
      }
    }
    const evidence = meta.scoring.evidenceLabels[String(ex.scores.B)];
    if (evidence && ex.evidenceLevel !== evidence) {
      add(where, 'evidenceLevel', `is "${ex.evidenceLevel}", maar B${ex.scores.B} is "${evidence}"`);
    }
  }

  for (const g of lib.groups) {
    for (const s of g.sources) if (!sourceKeys.has(s)) add(`spiergroep ${g.id}`, 'sources', `onbekende bron "${s}"`);
  }
  for (const t of lib.tests) {
    t.groups.forEach((gid, i) => {
      if (!groups.has(gid)) add(`test ${t.id}`, `groups[${i}]`, `onbekende spiergroep "${gid}"`);
    });
    for (const s of t.sources) if (!sourceKeys.has(s)) add(`test ${t.id}`, 'sources', `onbekende bron "${s}"`);
  }

  // 6. Per spiergroep ≥ 2 oefeningen als primair doel, ≥ 1 niet vergrendeld
  // (uitzondering quadriceps_vasti, §4).
  for (const g of lib.groups) {
    const primary = lib.exercises.filter((x) => x.targets.some((t) => t.group === g.id && t.weight === 1));
    if (primary.length < 2) add(`spiergroep ${g.id}`, 'oefeningen', `heeft ${primary.length} oefening(en) als primair doel, minimaal 2`);
    if (g.id !== 'quadriceps_vasti' && !primary.some((x) => !x.locked)) {
      add(`spiergroep ${g.id}`, 'oefeningen', 'heeft geen niet-vergrendelde oefening als primair doel');
    }
  }

  // 7. Sjablonen: alleen niet-vergrendelde oefeningen; gecompileerde tijd =
  // expectedTotalSec.
  for (const r of lib.routines) {
    const where = `sjabloon ${r.id}`;
    let usable = true;
    r.steps.forEach((s, i) => {
      const ex = exercises.get(s.exerciseId);
      if (!ex) {
        add(where, `steps[${i}].exerciseId`, `onbekende oefening "${s.exerciseId}"`);
        usable = false;
        return;
      }
      if (ex.locked) add(where, `steps[${i}]`, `bevat vergrendelde oefening ${ex.id}`);
      for (const e of stepDoseErrors(s, ex)) {
        add(where, `steps[${i}].${e.field}`, e.message);
        usable = false;
      }
    });
    if (usable) {
      const { totalSec } = compileRoutine(r, exercises, { timing: meta.timing });
      if (totalSec !== r.expectedTotalSec) {
        add(where, 'expectedTotalSec', `is ${r.expectedTotalSec} s, maar de timeline duurt ${totalSec} s`);
      }
    }
  }

  return errors;
}

// Maakt opzoektabellen. Alleen aanroepen op een gevalideerde bibliotheek.
export function indexLibrary(lib) {
  return {
    raw: lib,
    meta: lib.meta,
    groups: new Map(lib.groups.map((g) => [g.id, g])),
    exercises: new Map(lib.exercises.map((x) => [x.id, x])),
    templates: new Map(lib.routines.map((r) => [r.id, r])),
    tests: new Map(lib.tests.map((t) => [t.id, t])),
    sources: new Map(lib.sources.map((s) => [s.key, s])),
  };
}

// §9.2 regel 8: valideren en bij een fout niet starten.
export function checkedLibrary(lib, schema) {
  const errors = validateLibrary(lib, schema);
  if (errors.length) throw new LibraryError(errors);
  return indexLibrary(lib);
}

// Browser: laadt en valideert bij elke start. Geeft de geïndexeerde
// bibliotheek en het schema terug.
export async function loadLibrary(base = './data/') {
  const [raw, schema] = await Promise.all(
    ['library.json', 'library.schema.json'].map(async (name) => {
      const res = await fetch(base + name);
      if (!res.ok) throw new Error(`${name} kon niet worden geladen (${res.status}).`);
      return res.json();
    }),
  );
  return { lib: checkedLibrary(raw, schema), schema };
}
