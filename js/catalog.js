// Bibliotheek doorzoeken: filteren, sorteren en groeperen (§6.1). Puur: geen
// DOM, zodat het in Node te testen is.
import { rate } from './library.js';
import { exerciseDurationSec } from './format.js';
import { isTraining, FOCUS_LABELS } from './types.js';

export const SORTS = ['score', 'naam', 'R', 'tijd'];
export const REGIONS = ['Voet en onderbeen', 'Heup en bovenbeen', 'Romp en nek', 'Schouder en arm'];
// Trainingsoefeningen staan in de lijst los van het rekken, per focus.
export const TRAINING_REGION = 'Training';
export const NO_EQUIPMENT = 'geen';

export function defaultFilters() {
  return {
    query: '',
    groups: [], // meerdere; leeg = alle
    slot: null, // 'ochtend' | 'avond' | 'beide' | null
    position: null, // 'staand' | 'stoel' | 'vloer' | 'liggend' | null
    equipment: [], // meerdere, plus NO_EQUIPMENT; leeg = alle
    minStars: 0,
    type: null, // 'static' | 'pnf' | 'dynamic' | 'active' | null
    onlyK4: false,
  };
}

// Aantal filters dat afwijkt van de standaard (voor de knop "Filters (n)").
export function activeFilterCount(f, d = defaultFilters()) {
  return ['groups', 'equipment'].filter((k) => f[k].length).length
    + ['slot', 'position', 'type', 'minStars', 'onlyK4'].filter((k) => f[k] !== d[k]).length;
}

// Kleine letters, zonder accenten: "Spreidzit" vindt ook "spreidzít".
export const normalize = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Primaire spiergroepen: doelen met gewicht 1. De oefening staat in de lijst
// onder de eerste.
export const primaryGroups = (ex) => ex.targets.filter((t) => t.weight === 1).map((t) => t.group);

// Moment: 'ochtend' toont ochtend- en beide-oefeningen, 'avond' idem, 'beide'
// alleen oefeningen voor beide momenten.
function slotMatches(exSlot, wanted) {
  if (!wanted) return true;
  if (wanted === 'beide') return exSlot === 'beide';
  return exSlot === wanted || exSlot === 'beide';
}

// Materiaal: een oefening telt mee als ze minstens één gekozen materiaal
// gebruikt, of geen materiaal nodig heeft en "geen materiaal" gekozen is.
function equipmentMatches(exEquipment, wanted) {
  if (!wanted.length) return true;
  if (!exEquipment.length) return wanted.includes(NO_EQUIPMENT);
  return exEquipment.some((e) => wanted.includes(e));
}

export function matches(ex, rating, f) {
  if (f.query && !normalize(ex.name).includes(normalize(f.query.trim()))) return false;
  if (f.groups.length && !primaryGroups(ex).some((g) => f.groups.includes(g))) return false;
  if (!slotMatches(ex.slot, f.slot)) return false;
  if (f.position && ex.position !== f.position) return false;
  if (!equipmentMatches(ex.equipment, f.equipment)) return false;
  if (rating.stars < f.minStars) return false;
  if (f.type && ex.type !== f.type) return false;
  if (f.onlyK4 && ex.scores.K < 4) return false;
  return true;
}

// Alle oefeningen met hun (eventueel eigen-gewogen) sterren en tijd, eenmalig
// uit te rekenen.
export function catalogItems(lib, weightsPct) {
  return [...lib.exercises.values()].map((ex) => ({
    ex,
    rating: rate(ex, lib.meta, weightsPct),
    durationSec: exerciseDurationSec(ex, lib.meta.timing),
  }));
}

const byName = (a, b) => a.ex.name.localeCompare(b.ex.name, 'nl');
const COMPARE = {
  score: (a, b) => b.rating.score - a.rating.score || byName(a, b),
  naam: byName,
  R: (a, b) => b.ex.scores.R - a.ex.scores.R || b.rating.score - a.rating.score || byName(a, b),
  tijd: (a, b) => a.durationSec - b.durationSec || b.rating.score - a.rating.score || byName(a, b),
};

export const sortItems = (items, sort) => [...items].sort(COMPARE[sort]);

// Onder welke spiergroep een oefening in de lijst staat: de eerste doelgroep,
// of bij een spiergroepfilter de eerste primaire groep die gekozen is (zo staat
// couch_stretch bij filter "heupbuigers" ook onder Heupbuigers).
export function listGroup(ex, f = defaultFilters()) {
  return (f.groups.length && primaryGroups(ex).find((g) => f.groups.includes(g))) || ex.targets[0].group;
}

// Groepeert per regio en spiergroep in de volgorde van §4 (= de volgorde van
// groups in library.json). Lege groepen vallen weg. De trainingsoefeningen
// staan daarna in een eigen regio, per focus (Heupkracht, Enkelstabiliteit).
export function groupItems(items, lib, sort, f = defaultFilters()) {
  const sorted = sortItems(items, sort);
  const stretches = sorted.filter((it) => !isTraining(it.ex));
  const out = [];
  for (const region of REGIONS) {
    const groups = [];
    for (const g of lib.groups.values()) {
      if (g.region !== region) continue;
      const list = stretches.filter((it) => listGroup(it.ex, f) === g.id);
      if (list.length) groups.push({ group: g, items: list });
    }
    if (groups.length) out.push({ region, groups });
  }
  const training = Object.entries(FOCUS_LABELS)
    .map(([focus, label]) => ({ group: { id: `focus-${focus}`, label }, items: sorted.filter((it) => isTraining(it.ex) && it.ex.focus === focus) }))
    .filter((g) => g.items.length);
  if (training.length) out.push({ region: TRAINING_REGION, groups: training });
  return out;
}

// Alle materialen die in de bibliotheek voorkomen, in schemavolgorde.
export function equipmentOptions(lib, schemaOrder) {
  const used = new Set([...lib.exercises.values()].flatMap((x) => x.equipment));
  return schemaOrder.filter((e) => used.has(e));
}
