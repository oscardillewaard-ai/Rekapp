// Opstarten en hash-router (§8.1). De bibliotheek wordt bij elke start
// gevalideerd; met kapotte data start de app niet (§9.2 regel 8).
import { loadLibrary, LibraryError } from './library.js';
import { h, clear } from './ui/dom.js';
import { loadGraphics, icon } from './ui/graphics.js';
import { createLibraryScreen } from './ui/library.js';
import { createExerciseScreen } from './ui/exercise.js';
import { createHomeScreen } from './ui/home.js';
import { createRoutineScreen } from './ui/routine.js';
import { createPlayerScreen } from './ui/player.js';
import { createSettingsScreen } from './ui/settings.js';
import { openStore, loadSettings, saveSettings, loadKneeState, requestPersistence } from './store.js';
import { withDefaults } from './settings.js';
import { createAudio } from './audio.js';
import { access } from './knee.js';

const app = document.getElementById('app');

function showError(title, detail) {
  clear(app).append(h('div', { class: 'error', role: 'alert' }, h('h1', null, title), h('pre', null, detail)));
}

// Vaste balken onderin (werkbalk, tabbalk) zijn niet altijd even hoog (grote
// tekst, knoppen over twee regels). Meet ze, zodat de inhoud er nooit onder
// verdwijnt.
function watchBars() {
  const set = () => {
    const visible = (sel) => [...document.querySelectorAll(sel)].find((t) => t.getClientRects().length > 0);
    const toolbar = visible('.toolbar');
    const tabbar = visible('.tabbar');
    const root = document.documentElement.style;
    root.setProperty('--toolbar-h', `${toolbar ? toolbar.offsetHeight : 0}px`);
    root.setProperty('--tabbar-h', `${tabbar ? tabbar.offsetHeight : 0}px`);
    document.body.classList.toggle('with-tabbar', Boolean(tabbar));
  };
  const ro = new ResizeObserver(set);
  const mo = new MutationObserver(() => {
    for (const el of document.querySelectorAll('.toolbar, .tabbar')) ro.observe(el);
    set();
  });
  mo.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  set();
  return set;
}

function applyTheme(settings) {
  document.documentElement.dataset.theme = settings.nightMode ? 'nacht' : 'donker';
}

// Kniestatus die niet gelezen kon worden: de knieregels zijn hard, dus dan
// geldt de opvlammingsmodus (alles boven 45° uit) tot de opslag weer werkt.
const UNKNOWN_KNEE = () => ({ unlocks: {}, flare: { active: true, since: null, exitProposedAt: null }, checks: [], unknown: true });

async function boot() {
  // Eerst de instellingen, zodat ook "Laden…" en foutschermen al in het goede
  // thema staan (nachtmodus: geen grijs of wit).
  const store = await openStore();
  let settings = withDefaults(await loadSettings(store).catch(() => null));
  applyTheme(settings);
  app.append(h('p', { class: 'empty' }, 'Laden…'));
  let lib;
  let schema;
  try {
    ({ lib, schema } = await loadLibrary());
  } catch (e) {
    if (e instanceof LibraryError) showError('De bibliotheek is niet geldig. De app start niet.', e.message);
    else showError('De bibliotheek kon niet worden geladen.', String(e?.message ?? e));
    return;
  }
  const knee = store.persistent ? await loadKneeState(store).catch(UNKNOWN_KNEE) : UNKNOWN_KNEE();
  await loadGraphics([...new Set([...lib.exercises.values()].map((x) => x.position))]);

  const audio = createAudio();
  audio.configure(settings);
  const getSettings = () => settings;
  const getContext = () => ({ settings, knee });

  // Vaste meldingen bovenaan de app (opslag, kniestatus).
  const notices = h('div', { class: 'app-notices', role: 'status' });
  const notice = (text) => { if (![...notices.children].some((n) => n.textContent === text)) notices.append(h('p', { class: 'warn-bar' }, text)); };
  if (!store.persistent) notice('Opslaan lukt niet in deze browser: sessies en instellingen worden niet bewaard. Open de app buiten een privévenster of herlaad hem.');
  if (knee.unknown) notice('Je kniestatus kon niet worden gelezen. Voor de zekerheid staan oefeningen boven 45° uit, zoals bij een opvlamming.');

  async function updateSettings(patch) {
    settings = withDefaults({ ...settings, ...patch });
    applyTheme(settings);
    audio.configure(settings);
    if ('showLocked' in patch) library.setShowLocked(settings.showLocked);
    try {
      await saveSettings(store, settings);
    } catch (e) {
      notice(`Instelling niet opgeslagen: ${e?.message ?? e}`);
    }
  }

  // ---------- Schermen ----------

  const equipmentOrder = schema.$defs.exercise.properties.equipment.items.enum;
  const home = createHomeScreen({ lib });
  const library = createLibraryScreen({ lib, equipmentOrder, showLocked: settings.showLocked });
  // Terug binnen de app: alleen history.back() als er een eerdere app-pagina in
  // de geschiedenis staat (diepte in history.state), anders naar fallback.
  const goBack = (fallback) => () => { if ((history.state?.depth ?? 0) > 0) history.back(); else location.hash = fallback; };
  const exercise = createExerciseScreen({ lib, getContext, onBack: goBack('#/bibliotheek'), onTry: tryExercise });
  const routine = createRoutineScreen({ lib, getContext, onBack: goBack('#/start'), onStart: startRoutine });
  const player = createPlayerScreen({
    lib, audio, getSettings,
    onSave: async (session) => {
      await store.put('sessions', session);
      requestPersistence();
    },
    onFinished: () => { replaceRoute('#/start'); },
  });
  const settingsScreen = createSettingsScreen({ audio, getSettings, update: updateSettings });

  // Start vanuit een gebruikersgebaar: audio ontgrendelen, dan de speler.
  function startRoutine(playable, meta) {
    audio.unlock();
    player.begin(playable, { id: meta.id, name: meta.name, slot: meta.slot });
    location.hash = '#/speler';
  }

  // "Probeer nu" (§6.2): alleen deze oefening met de standaarddosis. De
  // knie-poort wordt hier opnieuw gecontroleerd.
  function tryExercise(ex) {
    if (!access(ex, knee, lib.meta.knee).allowed) return;
    const step = { exerciseId: ex.id, ...ex.defaultDose };
    startRoutine({ steps: [step] }, { id: `probeer:${ex.id}`, name: `Probeer nu: ${ex.name}`, slot: 'vrij' });
  }

  const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Hoofdmenu' },
    [['start', 'Start', 'home'], ['bibliotheek', 'Bibliotheek', 'list'], ['instellingen', 'Instellingen', 'gear']].map(([route, text, ic]) =>
      h('a', { href: `#/${route}`, dataset: { route } }, icon(ic), h('span', null, text))));

  const views = {
    start: h('div', null, home.root),
    bibliotheek: h('div', null, library.root),
    oefening: h('div', null, exercise.root, exercise.toolbar),
    routine: h('div', null, routine.root, routine.toolbar),
    speler: h('div', null, player.root),
    instellingen: h('div', null, settingsScreen.root),
  };
  for (const v of Object.values(views)) v.hidden = true;
  clear(app).append(notices, ...Object.values(views), tabbar, library.sheet, exercise.sheet);
  watchBars();

  // ---------- Router ----------

  history.scrollRestoration = 'manual';
  const scrollOf = {};
  let current = null;
  let lastExerciseId = null;

  // Diepte in de geschiedenis van de app (voor de terugknoppen). Een nieuwe
  // regel (link, location.hash) heeft nog geen state en krijgt diepte + 1;
  // terug/vooruit leest de diepte die er al stond.
  let depth = typeof history.state?.depth === 'number' ? history.state.depth : 0;
  if (typeof history.state?.depth !== 'number') history.replaceState({ depth }, '');
  function stamp() {
    if (typeof history.state?.depth === 'number') depth = history.state.depth;
    else history.replaceState({ depth: ++depth }, '');
  }
  function replaceRoute(hash) {
    history.replaceState({ depth }, '', hash);
    route();
  }

  function show(name, title, focusSel = 'h1') {
    if (current && current !== name) scrollOf[current] = window.scrollY;
    for (const d of document.querySelectorAll('dialog[open]')) if (!views.speler.contains(d)) d.close();
    for (const [n, v] of Object.entries(views)) v.hidden = n !== name;
    const topLevel = ['start', 'bibliotheek', 'instellingen'].includes(name);
    tabbar.hidden = !topLevel;
    for (const a of tabbar.querySelectorAll('a')) {
      if (a.dataset.route === name) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    current = name;
    document.title = `${title} · Rekapp`;
    const el = views[name].querySelector(focusSel);
    el?.focus({ preventScroll: true });
  }
  function route() {
    stamp();
    const hash = location.hash || '#/start';
    // Tijdens een routine: "terug" vraagt eerst of je wilt stoppen, in plaats
    // van de speler stilletjes te verlaten.
    if (player.isActive() && hash !== '#/speler') {
      history.pushState({ depth: ++depth }, '', '#/speler');
      player.askStop();
      return;
    }
    // Weg van het afrondscherm: de sessie is al opgeslagen (zonder
    // intensiteit en kniepijn als je niet op Opslaan tikte).
    if (player.isFinishing() && hash !== '#/speler') player.leave();
    let m;
    if ((m = /^#\/oefening\/([a-z0-9_]+)$/.exec(hash))) {
      exercise.render(m[1]);
      show('oefening', lib.exercises.get(m[1])?.name ?? 'Oefening');
      lastExerciseId = m[1];
      window.scrollTo(0, 0);
      return;
    }
    if ((m = /^#\/routine\/([A-Za-z0-9_:-]+)$/.exec(hash))) {
      routine.render(lib.templates.get(m[1]) ?? null);
      show('routine', lib.templates.get(m[1])?.name ?? 'Routine');
      window.scrollTo(0, 0);
      return;
    }
    if (hash === '#/speler') {
      if (!player.isActive() && !player.isFinishing()) { replaceRoute('#/start'); return; }
      show('speler', 'Speler');
      player.focus();
      return;
    }
    if (hash === '#/bibliotheek') {
      const back = current === 'oefening';
      show('bibliotheek', 'Bibliotheek', back ? `a.row[href="#/oefening/${lastExerciseId}"]` : 'h1');
      window.scrollTo(0, scrollOf.bibliotheek ?? 0);
      return;
    }
    if (hash === '#/instellingen') {
      settingsScreen.render();
      show('instellingen', 'Instellingen');
      window.scrollTo(0, 0);
      return;
    }
    if (hash !== '#/start') history.replaceState({ depth }, '', '#/start');
    show('start', 'Start');
    window.scrollTo(0, scrollOf.start ?? 0);
  }

  window.addEventListener('hashchange', route);
  route();
}

boot();
