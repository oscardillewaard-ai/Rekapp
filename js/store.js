// IndexedDB-opslag (§8.2). Alle gebruikersdata staat hier, niet in
// localStorage. Lukt IndexedDB niet (bv. een privévenster), dan valt de app
// terug op geheugen en meldt dat (persistent = false).

const DB_NAME = 'rekapp';
const DB_VERSION = 1;
// Stores uit §8.2. Met keyPath 'id' voor lijsten; de rest met eigen sleutel.
const STORES = {
  routines: { keyPath: 'id' },
  sessions: { keyPath: 'id' },
  kneeChecks: { keyPath: 'id' },
  unlocks: {}, // knieslot (vervallen); blijft bestaan, maar leeg
  tests: { keyPath: 'id' },
  flare: {}, // sleutel: 'state'
  settings: {}, // sleutel: 'settings'
};

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB ontbreekt')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, opts] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, opts.keyPath ? { keyPath: opts.keyPath } : undefined);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB geblokkeerd'));
  });
}

function idbBackend(db) {
  const tx = (store, mode) => db.transaction(store, mode).objectStore(store);
  // Pas klaar als de transactie echt is vastgelegd (ook bij bv. een volle
  // schijf komt de fout dan terug bij de aanroeper).
  const done = (t) => new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error ?? new DOMException('Opslaan mislukt', 'UnknownError'));
    t.onabort = () => reject(t.error ?? new DOMException('Afgebroken', 'AbortError'));
  });
  const write = (store, fn) => {
    const os = tx(store, 'readwrite');
    fn(os);
    return done(os.transaction);
  };
  return {
    get: (store, key) => request(tx(store, 'readonly').get(key)),
    getAll: (store) => request(tx(store, 'readonly').getAll()),
    put: (store, value, key) => write(store, (os) => (STORES[store].keyPath ? os.put(value) : os.put(value, key))),
    delete: (store, key) => write(store, (os) => os.delete(key)),
    clear: (store) => write(store, (os) => os.clear()),
    // Meerdere schrijfacties in één transactie (alles of niets).
    batch: (stores, fn) => {
      const t = db.transaction(stores, 'readwrite');
      fn((name) => t.objectStore(name));
      return done(t);
    },
  };
}

function memoryBackend() {
  const data = Object.fromEntries(Object.keys(STORES).map((s) => [s, new Map()]));
  const keyOf = (store, value, key) => (STORES[store].keyPath ? value[STORES[store].keyPath] : key);
  const clone = (v) => (v === undefined ? v : structuredClone(v));
  return {
    get: async (store, key) => clone(data[store].get(key)),
    getAll: async (store) => [...data[store].values()].map(clone),
    put: async (store, value, key) => { data[store].set(keyOf(store, value, key), clone(value)); },
    delete: async (store, key) => { data[store].delete(key); },
    clear: async (store) => { data[store].clear(); },
    batch: async (stores, fn) => {
      fn((name) => ({
        put: (value, key) => data[name].set(keyOf(name, value, key), clone(value)),
        delete: (key) => data[name].delete(key),
        clear: () => data[name].clear(),
      }));
    },
  };
}

export async function openStore() {
  try {
    const db = await openDb().catch(() => openDb()); // één keer opnieuw proberen
    return { persistent: true, ...idbBackend(db) };
  } catch (e) {
    console.warn('Opslag valt terug op geheugen:', e);
    return { persistent: false, ...memoryBackend() };
  }
}

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

// ---------- Hulpfuncties per onderwerp ----------

export async function loadSettings(store) {
  return store.get('settings', 'settings');
}
export function saveSettings(store, settings) {
  return store.put('settings', settings, 'settings');
}

// Kniestatus zoals knee.js die gebruikt: { flare, checks, rev }.
// rev telt elke opgeslagen wijziging; zo merkt een tweede venster (of de
// geïnstalleerde app naast een browsertab) dat zijn kopie verouderd is.
export async function loadKneeState(store) {
  const [flare, checks, rev] = await Promise.all([
    store.get('flare', 'state'), store.getAll('kneeChecks'), store.get('flare', 'rev'),
  ]);
  return {
    flare: flare ?? { active: false, since: null, exitProposedAt: null },
    checks: checks.sort((a, b) => a.at - b.at),
    rev: rev ?? 0,
  };
}

export async function loadKneeRev(store) {
  return (await store.get('flare', 'rev')) ?? 0;
}

// De oude store met ontgrendelingen (knieslot, vervallen) wordt meteen
// leeggemaakt.
export function saveKneeState(store, knee) {
  return store.batch(['unlocks', 'flare', 'kneeChecks'], (os) => {
    os('unlocks').clear();
    os('flare').put(knee.flare, 'state');
    os('flare').put(knee.rev ?? 0, 'rev');
    for (const c of knee.checks) os('kneeChecks').put(c);
  });
}

// Na de eerste opgeslagen sessie om blijvende opslag vragen (§7).
export async function requestPersistence() {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return navigator.storage?.persist ? await navigator.storage.persist() : false;
  } catch {
    return false;
  }
}

// ---------- Export en import (§6.9) ----------

const DATA_STORES = ['routines', 'sessions', 'kneeChecks', 'unlocks', 'tests', 'flare', 'settings'];

// Alles wat in de export hoort (het concept uit de bouwer niet).
export async function readAll(store) {
  const [routines, sessions, kneeChecks, tests, flare, settings] = await Promise.all([
    store.getAll('routines'), store.getAll('sessions'), store.getAll('kneeChecks'),
    store.getAll('tests'), store.get('flare', 'state'), store.get('settings', 'settings'),
  ]);
  return {
    routines, sessions, kneeChecks, tests,
    flare: flare ?? { active: false, since: null, exitProposedAt: null }, settings: settings ?? null,
  };
}

// Import: alles vervangen, in één transactie (alles of niets).
export function replaceAll(store, data) {
  return store.batch(DATA_STORES, (os) => {
    for (const name of DATA_STORES) os(name).clear();
    for (const r of data.routines) os('routines').put(r);
    for (const s of data.sessions) os('sessions').put(s);
    for (const c of data.kneeChecks) os('kneeChecks').put(c);
    for (const t of data.tests) os('tests').put(t);
    os('flare').put(data.flare, 'state');
    os('flare').put(Date.now(), 'rev'); // andere vensters laden opnieuw
    if (data.settings) os('settings').put(data.settings, 'settings');
  });
}
