// Gedeelde hulpjes voor de tests: bibliotheek laden en tijden maken.
import { readFileSync } from 'node:fs';
import { indexLibrary } from '../js/library.js';

const read = (name) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8'));

export const rawLibrary = () => read('library.json');
export const schema = read('library.schema.json');
export const lib = indexLibrary(rawLibrary());

export const HOUR = 3600 * 1000;
export const DAY = 24 * HOUR;

// Lokale tijd, buiten de zomertijdwissels (die van 2026 is op 25 oktober).
export const at = (day, hour = 10, minute = 0) => new Date(2026, 10, 2 + day, hour, minute).getTime();

export const ex = (id) => {
  const x = lib.exercises.get(id);
  if (!x) throw new Error(`onbekende oefening ${id}`);
  return x;
};

// §11.1 D. Testroutine T1: ochtend, vóór een run, 5× per week.
export const T1 = {
  id: 'T1', name: 'T1', slot: 'ochtend', preRun: true, timesPerWeek: 5, active: true,
  steps: [
    { exerciseId: 'gastroc_muur', perSideSec: 45 },
    { exerciseId: 'soleus_muur', perSideSec: 30 },
    { exerciseId: 'hamstring_zittend_vouw', durationSec: 60 },
    { exerciseId: 'heupbuiger_dyn', perSideSec: 30 },
  ],
};
