// Opstarten en hash-router (§8.1). De bibliotheek wordt bij elke start
// gevalideerd; met kapotte data start de app niet (§9.2 regel 8).
import { loadLibrary, LibraryError } from './library.js';
import { h, clear, fill } from './ui/dom.js';
import { loadGraphics, icon } from './ui/graphics.js';
import { createLibraryScreen } from './ui/library.js';
import { createExerciseScreen } from './ui/exercise.js';
import { createHomeScreen } from './ui/home.js';
import { createRoutineScreen } from './ui/routine.js';
import { createPlayerScreen } from './ui/player.js';
import { createSettingsScreen } from './ui/settings.js';
import { createRoutinesScreen } from './ui/routines.js';
import { createBuilderScreen } from './ui/builder.js';
import { createWeekScreen } from './ui/week.js';
import { createMoreScreen } from './ui/more.js';
import { openStore, loadSettings, saveSettings, loadKneeState, requestPersistence, newId } from './store.js';
import { withDefaults } from './settings.js';
import { createAudio } from './audio.js';
import { access } from './knee.js';
import { playableRoutine, WARNINGS } from './warnings.js';
import { newRoutine, copyTemplate, duplicateRoutine, newStep, validateUserRoutine } from './routines.js';

const app = document.getElementById('app');

function showError(title, detail) {
  fill(app, h('div', { class: 'error', role: 'alert' }, h('h1', null, title), h('pre', null, detail)));
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
  // Eigen routines: alleen geldige (een kapotte routine zou de speler of de
  // dosis verstoren); sessies voor "Mijn week".
  const storedRoutines = await store.getAll('routines').catch(() => []);
  let routines = storedRoutines.filter((r) => validateUserRoutine(r, lib.exercises).length === 0);
  const skippedRoutines = storedRoutines.length - routines.length;
  let sessions = await store.getAll('sessions').catch(() => []);
  await loadGraphics([...new Set([...lib.exercises.values()].map((x) => x.position))]);

  const audio = createAudio();
  audio.configure(settings);
  const getSettings = () => settings;
  const getContext = () => ({ settings, knee, routines });
  const getData = () => ({ settings, knee, routines, sessions });
  const blockedCodes = (ex) => access(ex, knee, lib.meta.knee).codes;

  // Vaste meldingen bovenaan de app (opslag, kniestatus).
  const notices = h('div', { class: 'app-notices', role: 'status' });
  const notice = (text) => { if (![...notices.children].some((n) => n.textContent === text)) notices.append(h('p', { class: 'warn-bar' }, text)); };
  if (!store.persistent) notice('Opslaan lukt niet in deze browser: sessies en instellingen worden niet bewaard. Open de app buiten een privévenster of herlaad hem.');
  if (knee.unknown) notice('Je kniestatus kon niet worden gelezen. Voor de zekerheid staan oefeningen boven 45° uit, zoals bij een opvlamming.');
  if (skippedRoutines) notice(`${skippedRoutines} opgeslagen ${skippedRoutines === 1 ? 'routine is' : 'routines zijn'} beschadigd en worden niet getoond.`);

  async function updateSettings(patch) {
    settings = withDefaults({ ...settings, ...patch });
    applyTheme(settings);
    audio.configure(settings);
    if ('showLocked' in patch) { library.setShowLocked(settings.showLocked); picker.setShowLocked(settings.showLocked); }
    if ('weights' in patch) { library.setWeights(settings.weights); picker.setWeights(settings.weights); }
    try {
      await saveSettings(store, settings);
    } catch (e) {
      notice(`Instelling niet opgeslagen: ${e?.message ?? e}`);
    }
  }

  async function saveRoutine(r) {
    await store.put('routines', r);
    routines = [...routines.filter((x) => x.id !== r.id), r];
  }

  // ---------- Schermen ----------

  const equipmentOrder = schema.$defs.exercise.properties.equipment.items.enum;
  // Terug binnen de app: alleen history.back() als er een eerdere app-pagina in
  // de geschiedenis staat (diepte in history.state), anders naar fallback.
  const goBack = (fallback) => () => { if ((history.state?.depth ?? 0) > 0) history.back(); else location.hash = fallback; };
  const home = createHomeScreen({ lib, getData });
  const library = createLibraryScreen({ lib, equipmentOrder, showLocked: settings.showLocked, weights: settings.weights, blockedCodes });
  const exercise = createExerciseScreen({ lib, getContext, onBack: goBack('#/bibliotheek'), onTry: tryExercise, onAdd: openAddSheet });
  const routine = createRoutineScreen({
    lib, getContext, onBack: goBack('#/start'), onStart: startRoutine,
    onCopy: (tpl) => openBuilder(copyTemplate(tpl, { id: newId(), now: Date.now() }), { fresh: true }),
    onEdit: (r) => { location.hash = `#/bouwer/${encodeURIComponent(r.id)}`; },
  });
  const player = createPlayerScreen({
    lib, audio, getSettings,
    onSave: async (session) => {
      await store.put('sessions', session);
      sessions = [...sessions.filter((x) => x.id !== session.id), session];
      requestPersistence();
    },
    onFinished: () => { replaceRoute('#/start'); },
  });
  const settingsScreen = createSettingsScreen({ audio, getSettings, update: updateSettings });
  const routinesScreen = createRoutinesScreen({
    lib, getData,
    onNew: () => openBuilder(newRoutine({ id: newId(), now: Date.now() }), { fresh: true }),
  });
  const week = createWeekScreen({ lib, getData });
  const more = createMoreScreen();

  // Kiesblad voor de bouwer: de bibliotheek met dezelfde filters, maar een tik
  // kiest de oefening. Geblokkeerd (W1/W8) kan niet; dan staat de reden erbij.
  const pickerNotice = h('div', { class: 'picker-notice', role: 'alert' });
  let pickResolve = null;
  const pickerClose = h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Sluiten', onclick: () => pickerDialog.close() }, icon('cross'));
  const picker = createLibraryScreen({
    lib, equipmentOrder, showLocked: settings.showLocked, weights: settings.weights, blockedCodes,
    title: 'Kies een oefening', headerExtra: pickerClose,
    scrollTop: () => { pickerList().scrollTop = 0; },
    onPick: (ex, codes) => {
      if (codes.length) {
        fill(pickerNotice, h('p', { class: 'locked-bar' }, h('strong', null, `${ex.name}: `), codes.map((c) => WARNINGS[c].text).join(' ')));
        pickerList().scrollTop = 0;
        return;
      }
      pickerDialog.close(ex.id);
    },
  });
  picker.root.insertBefore(pickerNotice, picker.root.children[1]);
  const pickerDialog = h('dialog', { class: 'sheet picker', 'aria-label': 'Kies een oefening' }, picker.root);
  const pickerList = () => picker.root.querySelector('.lib-list');
  pickerDialog.addEventListener('close', () => {
    const id = pickerDialog.returnValue;
    pickerDialog.returnValue = '';
    clear(pickerNotice);
    pickResolve?.(id ? lib.exercises.get(id) : null);
    pickResolve = null;
  });
  function pickExercise() {
    picker.refresh();
    pickerDialog.showModal();
    pickerList().scrollTop = 0;
    return new Promise((resolve) => { pickResolve = resolve; });
  }

  const builder = createBuilderScreen({
    lib, getData, pickExercise,
    onSave: saveRoutine,
    onDelete: async (r) => {
      await store.delete('routines', r.id);
      routines = routines.filter((x) => x.id !== r.id);
      replaceRoute('#/routines');
    },
    onDuplicate: async (r) => {
      const d = duplicateRoutine(r, { id: newId(), now: Date.now() });
      await saveRoutine(d);
      location.hash = `#/bouwer/${encodeURIComponent(d.id)}`;
    },
    onStart: (r) => {
      const { routine: playable } = playableRoutine(r, { lib, knee });
      if (playable.steps.length) startRoutine(playable, r);
    },
    onBack: goBack('#/routines'),
  });
  // Nieuwe routine (of kopie van een sjabloon) die nog niet is opgeslagen.
  let pendingNew = null;
  function openBuilder(r, { fresh = false } = {}) {
    if (fresh) pendingNew = r;
    location.hash = `#/bouwer/${encodeURIComponent(r.id)}`;
  }

  // "Toevoegen aan routine" op de kaart: kies een eigen routine of maak een
  // nieuwe. De knie-poort wordt hier opnieuw gecontroleerd.
  const addSheet = h('dialog', { class: 'sheet', 'aria-labelledby': 'add-title' });
  addSheet.addEventListener('click', (e) => { if (e.target === addSheet) addSheet.close(); });
  function openAddSheet(ex) {
    if (!access(ex, knee, lib.meta.knee).allowed) return;
    const addTo = async (r, fresh) => {
      addSheet.close();
      const next = { ...r, steps: [...r.steps, newStep(ex, settings)], updatedAt: Date.now() };
      if (fresh) openBuilder(next, { fresh: true });
      else { await saveRoutine(next); location.hash = `#/bouwer/${encodeURIComponent(next.id)}`; }
    };
    const mine = [...routines].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
    fill(addSheet, 
      h('div', { class: 'sheet-body' },
        h('div', { class: 'sheet-head' },
          h('h2', { id: 'add-title' }, `${ex.name} toevoegen aan`),
          h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Sluiten', onclick: () => addSheet.close() }, icon('cross'))),
        mine.length ? h('ul', { class: 'list' }, mine.map((r) => h('li', null,
          h('button', { class: 'row routine-row', type: 'button', onclick: () => addTo(r, false) },
            h('div', { class: 'main' }, h('div', { class: 'name' }, r.name), h('div', { class: 'meta' }, `${r.steps.length} ${r.steps.length === 1 ? 'oefening' : 'oefeningen'}`)))))) : h('p', { class: 'note' }, 'Je hebt nog geen eigen routines.')),
      h('div', { class: 'sheet-foot' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => addTo(newRoutine({ id: newId(), now: Date.now() }), true) }, '+ Nieuwe routine')));
    addSheet.showModal();
  }

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

  const TABS = [['start', 'Start', 'home'], ['routines', 'Routines', 'play'], ['bibliotheek', 'Bibliotheek', 'list'], ['week', 'Week', 'sliders'], ['meer', 'Meer', 'gear']];
  const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Hoofdmenu' },
    TABS.map(([route, text, ic]) => h('a', { href: `#/${route}`, dataset: { route } }, icon(ic), h('span', null, text))));
  // Welke tab oplicht bij een scherm (instellingen hoort bij "Meer").
  const TAB_OF = { start: 'start', routines: 'routines', bibliotheek: 'bibliotheek', week: 'week', meer: 'meer', instellingen: 'meer' };

  const views = {
    start: h('div', null, home.root),
    routines: h('div', null, routinesScreen.root),
    bibliotheek: h('div', null, library.root),
    week: h('div', null, week.root),
    meer: h('div', null, more.root),
    instellingen: h('div', null, settingsScreen.root),
    oefening: h('div', null, exercise.root, exercise.toolbar),
    routine: h('div', null, routine.root, routine.toolbar),
    bouwer: h('div', null, builder.root, builder.toolbar),
    speler: h('div', null, player.root),
  };
  for (const v of Object.values(views)) v.hidden = true;
  fill(app, notices, ...Object.values(views), tabbar,
    library.sheet, exercise.sheet, picker.sheet, pickerDialog, addSheet, ...builder.sheets);
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
    tabbar.hidden = !(name in TAB_OF);
    for (const a of tabbar.querySelectorAll('a')) {
      if (a.dataset.route === TAB_OF[name]) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    current = name;
    document.title = `${title} · Rekapp`;
    views[name].querySelector(focusSel)?.focus({ preventScroll: true });
  }

  const SIMPLE = {
    '#/routines': () => { routinesScreen.render(); show('routines', 'Routines'); window.scrollTo(0, scrollOf.routines ?? 0); },
    '#/week': () => { week.render(); show('week', 'Mijn week'); window.scrollTo(0, 0); },
    '#/meer': () => { more.render(); show('meer', 'Meer'); window.scrollTo(0, 0); },
    '#/instellingen': () => { settingsScreen.render(); show('instellingen', 'Instellingen'); window.scrollTo(0, 0); },
  };

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
    // Weg uit de bouwer met niet-opgeslagen wijzigingen: eerst vragen.
    if (current === 'bouwer' && builder.isDirty() && hash !== `#/bouwer/${encodeURIComponent(builder.currentId())}`) {
      history.pushState({ depth: ++depth }, '', `#/bouwer/${encodeURIComponent(builder.currentId())}`);
      builder.leave();
      return;
    }
    let m;
    if ((m = /^#\/oefening\/([a-z0-9_]+)$/.exec(hash))) {
      exercise.render(m[1]);
      show('oefening', lib.exercises.get(m[1])?.name ?? 'Oefening');
      lastExerciseId = m[1];
      window.scrollTo(0, 0);
      return;
    }
    if ((m = /^#\/routine\/(.+)$/.exec(hash))) {
      const id = decodeURIComponent(m[1]);
      const r = lib.templates.get(id) ?? routines.find((x) => x.id === id) ?? null;
      routine.render(r);
      show('routine', r?.name ?? 'Routine');
      window.scrollTo(0, 0);
      return;
    }
    if ((m = /^#\/bouwer\/(.+)$/.exec(hash))) {
      const id = decodeURIComponent(m[1]);
      if (builder.currentId() !== id) {
        const fresh = pendingNew?.id === id ? pendingNew : null;
        const r = fresh ?? routines.find((x) => x.id === id);
        if (!r) { replaceRoute('#/routines'); return; }
        builder.open(r, { fresh: Boolean(fresh) });
        pendingNew = null;
      }
      show('bouwer', 'Routine bewerken');
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
    if (SIMPLE[hash]) { SIMPLE[hash](); return; }
    if (hash !== '#/start') history.replaceState({ depth }, '', '#/start');
    home.render();
    show('start', 'Start');
    window.scrollTo(0, scrollOf.start ?? 0);
  }

  window.addEventListener('hashchange', route);
  route();
}

boot();
