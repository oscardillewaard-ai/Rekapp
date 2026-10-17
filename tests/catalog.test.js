import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultFilters, matches, catalogItems, sortItems, groupItems, activeFilterCount, normalize, NO_EQUIPMENT, equipmentOptions, REGIONS } from '../js/catalog.js';
import { formatScore, formatStars, formatDuration, formatDose, exerciseDurationSec, evidenceLabel } from '../js/format.js';
import { lib, schema, ex } from './helpers.js';

const items = catalogItems(lib);
const run = (patch) => {
  const f = { ...defaultFilters(), ...patch };
  return items.filter((it) => matches(it.ex, it.rating, f)).map((it) => it.ex.id);
};

test('zonder filters: alle 70 oefeningen', () => {
  assert.equal(run({}).length, 70);
  assert.equal(activeFilterCount(defaultFilters()), 0);
});

test('activeFilterCount telt elk afwijkend filter één keer', () => {
  const f = { ...defaultFilters(), groups: ['nek', 'borst'], equipment: ['band'], slot: 'avond', minStars: 4, onlyK4: true };
  assert.equal(activeFilterCount(f), 5);
  assert.equal(activeFilterCount({ ...defaultFilters(), query: 'kuit' }), 0); // zoeken is geen filter
});

test('"toon vergrendelde" uit verbergt alle 10 vergrendelde oefeningen (§11.2)', () => {
  const shown = run({ showLocked: false });
  assert.equal(shown.length, 60);
  assert.ok(shown.every((id) => !ex(id).locked));
  assert.equal(activeFilterCount({ ...defaultFilters(), showLocked: false }), 1);
});

test('"alleen K ≥ 4" laat alleen K 4 en 5 zien', () => {
  const shown = run({ onlyK4: true });
  assert.equal(shown.length, 58); // nageteld in library.json
  assert.ok(shown.every((id) => ex(id).scores.K >= 4));
  assert.equal(shown.length, items.filter((it) => it.ex.scores.K >= 4).length);
});

test('spiergroep (meerdere) kijkt naar primaire doelen', () => {
  const shown = run({ groups: ['soleus', 'nek'] });
  assert.deepEqual(shown.sort(), ['enkel_rock', 'nek_levator', 'nek_trapezius', 'soleus_muur', 'soleus_trede']);
  // couch_stretch heeft rectus femoris én heupbuigers als primair doel.
  assert.ok(run({ groups: ['heupbuigers'] }).includes('couch_stretch'));
  // gastroc_muur raakt de soleus alleen voor 50%.
  assert.ok(!run({ groups: ['soleus'] }).includes('gastroc_muur'));
});

test('moment: ochtend = ochtend + beide; beide = alleen beide', () => {
  const morning = run({ slot: 'ochtend' });
  assert.equal(morning.length, 41); // 10 ochtend + 31 beide, nageteld in library.json
  assert.ok(morning.every((id) => ['ochtend', 'beide'].includes(ex(id).slot)));
  assert.ok(morning.includes('enkel_rock') && morning.includes('gastroc_muur') && !morning.includes('hamstring_pnf'));
  const both = run({ slot: 'beide' });
  assert.equal(both.length, 31);
  assert.ok(both.every((id) => ex(id).slot === 'beide'));
});

test('positie, type en minimum aantal sterren', () => {
  assert.deepEqual(run({ position: 'stoel' }).sort(), ['figuur4_stoel', 'voetzool_zittend', 'voorover_hangen_stoel']);
  assert.deepEqual(run({ type: 'pnf' }), ['hamstring_pnf']);
  assert.deepEqual(run({ type: 'active' }).sort(), ['gate_opener', 'heup_car', 'soldier_kick']);
  assert.equal(run({ type: 'dynamic' }).length, 10);
  const five = run({ minStars: 5 });
  assert.deepEqual(five.sort(), ['gastroc_muur', 'hamstring_pnf', 'hamstring_staand_trede']);
  assert.equal(run({ minStars: 4.5 }).length, 12);
  assert.ok(run({ minStars: 4.5 }).every((id) => ex(id).stars >= 4.5));
});

test('materiaal: één van de gekozen, of "geen materiaal"', () => {
  const none = run({ equipment: [NO_EQUIPMENT] });
  assert.equal(none.length, 22);
  assert.ok(none.every((id) => ex(id).equipment.length === 0));
  const band = run({ equipment: ['band'] });
  assert.deepEqual(band.sort(), ['hamstring_pnf', 'quad_buiklig_band', 'rf_zijlig']);
  assert.deepEqual(run({ equipment: ['band', NO_EQUIPMENT] }).sort(), [...band, ...none].sort());
  const opts = equipmentOptions(lib, schema.$defs.exercise.properties.equipment.items.enum);
  assert.ok(opts.length > 0 && opts.every((e) => [...lib.exercises.values()].some((x) => x.equipment.includes(e))));
});

test('zoeken op naam, zonder hoofdletters of accenten', () => {
  assert.deepEqual(run({ query: 'kuit' }).sort(), ['gastroc_muur', 'gastroc_trede']);
  assert.deepEqual(run({ query: '  KUIT TEGEN ' }), ['gastroc_muur']);
  assert.equal(normalize('Één'), 'een');
  assert.equal(run({ query: 'xyz' }).length, 0);
});

test('filters werken samen', () => {
  const shown = run({ slot: 'avond', onlyK4: true, groups: ['adductoren'] });
  assert.deepEqual(shown.sort(), ['spreidzit_muur', 'vlinder_breed']);
});

test('sorteren op score, naam, R en tijd', () => {
  const byScore = sortItems(items, 'score').map((it) => it.rating.score);
  assert.deepEqual(byScore, [...byScore].sort((a, b) => b - a));
  assert.equal(sortItems(items, 'score')[0].ex.id, 'hamstring_pnf');
  const names = sortItems(items, 'naam').map((it) => it.ex.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'nl')));
  const rs = sortItems(items, 'R').map((it) => it.ex.scores.R);
  assert.deepEqual(rs, [...rs].sort((a, b) => b - a));
  const times = sortItems(items, 'tijd').map((it) => it.durationSec);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

test('groeperen per regio en spiergroep in de volgorde van §4, binnen een groep op score', () => {
  const grouped = groupItems(items, lib, 'score');
  assert.deepEqual(grouped.map((r) => r.region), REGIONS);
  const order = grouped.flatMap((r) => r.groups.map((g) => g.group.id));
  assert.deepEqual(order, [...lib.groups.keys()]);
  assert.equal(grouped.flatMap((r) => r.groups.flatMap((g) => g.items)).length, 70);
  const hams = grouped[1].groups.find((g) => g.group.id === 'hamstrings').items.map((it) => it.ex.id);
  assert.deepEqual(hams, ['hamstring_pnf', 'hamstring_staand_trede', 'hamstring_deurpost', 'hamstring_zittend_vouw', 'beenzwaai_va', 'soldier_kick']);
  // Met spiergroepfilter staat couch_stretch onder de gekozen groep.
  const f = { ...defaultFilters(), groups: ['heupbuigers'] };
  const g2 = groupItems(items.filter((it) => matches(it.ex, it.rating, f)), lib, 'score', f);
  assert.deepEqual(g2.flatMap((r) => r.groups.map((g) => g.group.id)), ['heupbuigers']);
});

test('opmaak: score, sterren, tijd, dosis en bewijslabel', () => {
  assert.equal(formatScore(4.8), '4,80');
  assert.equal(formatScore(3.05), '3,05');
  assert.equal(formatStars(4.5), '4,5');
  assert.equal(formatStars(5), '5');
  assert.equal(formatDuration(95), '1:35');
  assert.equal(formatDuration(305), '5:05');
  assert.equal(formatDose(ex('gastroc_muur').defaultDose, ex('gastroc_muur')), '45 s per kant');
  assert.equal(formatDose(ex('hamstring_pnf').defaultDose, ex('hamstring_pnf')), '2 × (5 s aanspannen + 25 s rekken) per kant');
  assert.equal(formatDose(ex('lateraal_shift').defaultDose, ex('lateraal_shift')), '60 s, afwisselend · 16 herhalingen');
  assert.equal(formatDose(ex('spreidzit_muur').defaultDose, ex('spreidzit_muur')), '60 s');
  assert.equal(exerciseDurationSec(ex('gastroc_muur'), lib.meta.timing), 95);
  assert.equal(exerciseDurationSec(ex('hamstring_pnf'), lib.meta.timing), 125);
  assert.equal(exerciseDurationSec(ex('spreidzit_muur'), lib.meta.timing), 60);
  assert.equal(evidenceLabel(5, lib.meta), 'sterk');
  assert.equal(evidenceLabel(1, lib.meta), 'geen');
});
