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
  unlocks: {}, // sleutel: exerciseId
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
  const done = (t) => new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
  return {
    get: (store, key) => request(tx(store, 'readonly').get(key)),
    getAll: (store) => request(tx(store, 'readonly').getAll()),
    getAllKeyed: async (store) => {
      const os = tx(store, 'readonly');
      const [keys, values] = await Promise.all([request(os.getAllKeys()), request(os.getAll())]);
      return keys.map((k, i) => [k, values[i]]);
    },
    put: (store, value, key) => request(STORES[store].keyPath ? tx(store, 'readwrite').put(value) : tx(store, 'readwrite').put(value, key)),
    delete: (store, key) => request(tx(store, 'readwrite').delete(key)),
    clear: (store) => request(tx(store, 'readwrite').clear()),
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
    getAllKeyed: async (store) => [...data[store].entries()].map(([k, v]) => [k, clone(v)]),
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
    return { persistent: true, ...idbBackend(await openDb()) };
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

// Kniestatus zoals knee.js die gebruikt: { unlocks, flare, checks }.
export async function loadKneeState(store) {
  const [unlocks, flare, checks] = await Promise.all([
    store.getAllKeyed('unlocks'), store.get('flare', 'state'), store.getAll('kneeChecks'),
  ]);
  return {
    unlocks: Object.fromEntries(unlocks),
    flare: flare ?? { active: false, since: null, exitProposedAt: null },
    checks: checks.sort((a, b) => a.at - b.at),
  };
}

export function saveKneeState(store, knee) {
  return store.batch(['unlocks', 'flare', 'kneeChecks'], (os) => {
    os('unlocks').clear();
    for (const [id, rec] of Object.entries(knee.unlocks)) os('unlocks').put(rec, id);
    os('flare').put(knee.flare, 'state');
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
