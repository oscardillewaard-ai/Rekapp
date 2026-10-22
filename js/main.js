// Opstarten en hash-router (§8.1). De bibliotheek wordt bij elke start
// gevalideerd; met kapotte data start de app niet (§9.2 regel 8).
import { loadLibrary, LibraryError } from './library.js';
import { h, clear, fill } from './ui/dom.js';
import { loadGraphics, icon } from './ui/graphics.js';
import { createLibraryScreen, libraryState } from './ui/library.js';
import { createExerciseScreen } from './ui/exercise.js';
import { createHomeScreen } from './ui/home.js';
import { createRoutineScreen } from './ui/routine.js';
import { createPlayerScreen } from './ui/player.js';
import { createSettingsScreen } from './ui/settings.js';
import { createRoutinesScreen } from './ui/routines.js';
import { createBuilderScreen } from './ui/builder.js';
import { createWeekScreen } from './ui/week.js';
import { createMoreScreen } from './ui/more.js';
import { createUnlockScreen, kneeCards, painPicker } from './ui/knee.js';
import { openStore, loadSettings, saveSettings, loadKneeState, saveKneeState, requestPersistence, newId } from './store.js';
import { withDefaults } from './settings.js';
import { createAudio } from './audio.js';
import {
  access, unlockState, startTest, cancelTest, recordExposure, setPainDuring, recordKneeCheck, expireChecks, activateFlare,
  endFlare, postponeFlareExit, resetUnlocks, trialStep, trialExerciseIds, lastExposureAt,
} from './knee.js';
import { KNEE } from './texts.js';
import { formatDay } from './format.js';
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
  let knee = store.persistent ? await loadKneeState(store).catch(UNKNOWN_KNEE) : UNKNOWN_KNEE();
  const K = lib.meta.knee;
  // Eigen routines: alleen geldige (een kapotte routine zou de speler of de
  // dosis verstoren); sessies voor "Mijn week".
  const storedRoutines = await store.getAll('routines').catch(() => []);
  let routines = storedRoutines.filter((r) => validateUserRoutine(r, lib.exercises).length === 0);
  const skippedRoutines = storedRoutines.length - routines.length;
  let sessions = await store.getAll('sessions').catch(() => []);
  // Niet-opgeslagen werk uit de bouwer van de vorige keer (de app werd op de
  // achtergrond afgesloten, wat iOS vaak doet).
  let builderDraft = await store.get('settings', 'builderDraft').catch(() => null);
  if (builderDraft && validateUserRoutine(builderDraft.routine, lib.exercises).length) builderDraft = null;
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
  // Kort bericht (bv. "schone cyclus"), vast bovenin zodat het ook zichtbaar
  // is als je gescrold bent, en zonder de knoppen in de duimzone te bedekken.
  // Verdwijnt na 10 s of met OK; de stand zelf staat ook op de schermen.
  const toasts = h('div', { class: 'toasts', role: 'status' });
  const flash = (text) => {
    const p = h('p', { class: 'toast' }, h('span', null, text));
    p.append(h('button', { class: 'btn', type: 'button', onclick: () => p.remove() }, 'OK'));
    toasts.append(p);
    setTimeout(() => p.remove(), 10000);
  };

  // ---------- Kniestatus (§6.6–6.7) ----------
  // Elke wijziging gaat via de pure functies in knee.js en wordt meteen
  // bewaard. Een kniestatus die niet gelezen kon worden, wordt nooit
  // weggeschreven: dat zou de echte status in de opslag overschrijven.

  const exName = (id) => lib.exercises.get(id)?.name ?? id;
  function eventTexts(events) {
    const cooled = new Set(events.filter((e) => e.type === 'afkoeling').map((e) => e.exerciseId));
    return events.map((e) => {
      switch (e.type) {
        case 'opvlamming_aan': return `Opvlammingsmodus staat aan (${e.reason}). Alles boven ${K.flareMaxDeg}° kniebuiging staat uit.`;
        case 'afkoeling': return `${exName(e.exerciseId)}: cyclus niet schoon. Weer vergrendeld; afkoelperiode tot ${formatDay(e.until)}.`;
        case 'cyclus_vervallen': return `${exName(e.exerciseId)}: cyclus vervallen (${e.reason}). De teller blijft staan.`;
        case 'status':
          if (e.to === 'voorlopig') return `${exName(e.exerciseId)}: schone cyclus. Status: voorlopig.`;
          if (e.to === 'vrij') return `${exName(e.exerciseId)}: ${K.cleanCyclesToUnlock} schone cycli op rij. De oefening is vrij.`;
          if (e.to === 'vergrendeld' && !cooled.has(e.exerciseId)) return `${exName(e.exerciseId)}: weer vergrendeld.`;
          return null;
        default: return null;
      }
    }).filter(Boolean);
  }

  async function commitKnee(next, events = []) {
    knee = next;
    if (store.persistent && !knee.unknown) {
      try {
        await saveKneeState(store, knee);
      } catch (e) {
        notice(`Kniestatus niet opgeslagen: ${e?.message ?? e}`);
      }
    }
    library.refresh();
    picker.refresh();
    for (const t of eventTexts(events)) flash(t);
    // Het voorstel komt na het afrondscherm van de speler, op het volgende
    // scherm (een wissel van scherm sluit open bladen).
    if (events.some((e) => e.type === 'opvlamming_voorstel') && !knee.flare.active) {
      if (current === 'speler') flareProposalPending = true;
      else proposeFlare();
    }
    refreshView();
  }
  let flareProposalPending = false;

  // Checks die niet op tijd zijn ingevuld, laten hun cyclus vervallen (§6.6).
  function expireNow() {
    if (knee.unknown) return;
    const r = expireChecks(knee, Date.now(), K);
    if (r.events.length) commitKnee(r.state, r.events);
  }

  const kneeActions = {
    async check(context, pain, exerciseId) {
      try {
        const r = recordKneeCheck(knee, { id: newId(), at: Date.now(), pain, context, ...(exerciseId ? { exerciseId } : {}) }, K);
        await commitKnee(r.state, r.events);
      } catch (e) {
        flash(String(e?.message ?? e));
        refreshView();
      }
    },
    async startTest(ex, confirmations) {
      try {
        await commitKnee(startTest(ex, knee, Date.now(), confirmations));
      } catch (e) {
        flash(String(e?.message ?? e));
      }
    },
    async cancelTest(ex) { await commitKnee(cancelTest(ex.id, knee)); },
    // Begeleide proef: 1 × 30 s per kant. De beginwaarde is al gevraagd.
    startTrial(ex, painBefore) {
      if (unlockState(ex, knee) !== 'test' || knee.flare.active || painBefore === null || painBefore > K.painMax) return;
      beginRun({ steps: [trialStep(ex)] }, { id: `proef:${ex.id}`, name: `Proef: ${ex.name}`, slot: 'vrij' }, { ids: [ex.id], painBefore });
    },
    async endFlare() { await commitKnee(endFlare(knee)); },
    async postponeFlareExit() { await commitKnee(postponeFlareExit(knee, Date.now())); },
  };

  // Opvlamming handmatig aan ("Ik heb een opvlamming"), of na een voorstel.
  const flareSheet = h('dialog', { class: 'sheet', 'aria-labelledby': 'flare-sheet-title' });
  flareSheet.addEventListener('click', (e) => { if (e.target === flareSheet) flareSheet.close(); });
  function openFlareSheet(title, text) {
    fill(flareSheet,
      h('div', { class: 'sheet-body' },
        h('h2', { id: 'flare-sheet-title' }, title),
        h('p', null, text),
        h('p', null, `Alles boven ${K.flareMaxDeg}° kniebuiging gaat uit. Oefeningen in de proefperiode of vrijgegeven gaan terug naar vergrendeld. De modus gaat uit na ${K.flareExitDays} dagen op rij een dagelijkse kniecheck van ≤${K.painMax}/10.`)),
      h('div', { class: 'sheet-foot' },
        h('button', { class: 'btn', type: 'button', onclick: () => flareSheet.close() }, 'Niet nu'),
        h('button', {
          class: 'btn danger', type: 'button',
          onclick: async () => {
            flareSheet.close();
            const r = activateFlare(knee, Date.now(), 'handmatig');
            await commitKnee(r.state, r.events);
          },
        }, 'Aanzetten')));
    flareSheet.showModal();
  }
  const askFlare = () => openFlareSheet('Opvlammingsmodus aanzetten?', 'Zet hem aan als je knie opspeelt.');
  const proposeFlare = () => openFlareSheet('Opvlammingsmodus aanzetten?', `Een waarde lag boven ${K.painMax}/10. Het is verstandig de opvlammingsmodus aan te zetten.`);

  // "Kniepijn nu" vóór een routine met een oefening uit de proefperiode (zie
  // AFWIJKINGEN.md): de beginwaarde van de nieuwe cyclus. Boven 2/10 wordt
  // die oefening overgeslagen.
  const painSheet = h('dialog', { class: 'sheet', 'aria-labelledby': 'pain-sheet-title' });
  painSheet.addEventListener('click', (e) => { if (e.target === painSheet) painSheet.close(); });
  function askPainNow(playable, meta, ids) {
    const names = ids.map(exName).join(', ');
    const recent = ids.filter((id) => {
      const last = lastExposureAt(knee.unlocks[id]);
      return last !== null && Date.now() - last < K.exposureSpacingHours * 3600 * 1000;
    });
    const rest = playable.steps.filter((st) => !ids.includes(st.exerciseId));
    const start = h('button', { class: 'btn primary', type: 'button', disabled: true }, icon('play'), 'Start');
    const high = h('p', { class: 'warn-bar', role: 'alert', hidden: true },
      rest.length ? `Boven ${K.painMax}/10: ${names} wordt overgeslagen.` : `Boven ${K.painMax}/10: ${names} wordt overgeslagen en er blijft niets over om af te spelen.`);
    const picker2 = painPicker(KNEE.painNow, {
      onChange: (v) => {
        high.hidden = v <= K.painMax;
        start.disabled = v > K.painMax && !rest.length;
      },
    });
    start.addEventListener('click', () => {
      painSheet.close();
      const v = picker2.value();
      if (v > K.painMax) beginRun({ ...playable, steps: rest }, meta, null);
      else beginRun(playable, meta, { ids, painBefore: v });
    });
    fill(painSheet,
      h('div', { class: 'sheet-body' },
        h('h2', { id: 'pain-sheet-title' }, 'Eerst je knie'),
        h('p', null, `${names} zit in de proefperiode. Je antwoord is de beginwaarde voor de 24- en 48-uurscheck.`),
        recent.length ? h('p', { class: 'warn-bar' }, WARNINGS.W9.text) : null,
        picker2.el, high),
      h('div', { class: 'sheet-foot' },
        h('button', { class: 'btn', type: 'button', onclick: () => painSheet.close() }, 'Annuleren'),
        start));
    painSheet.showModal();
  }

  // Blootstellingen uit een sessie (§6.6): vastgelegd zodra de sessie is
  // bewaard; "kniepijn tijdens" komt bij Opslaan op het afrondscherm.
  let runExposure = null;
  const exposuresBySession = new Map();
  async function trackExposures(session) {
    let next = knee;
    const events = [];
    if (runExposure && !exposuresBySession.has(session.id)) {
      const at = Date.parse(session.endedAt);
      const recorded = [];
      for (const id of runExposure.ids) {
        const worked = session.segmentsDone.some((x) => x.exerciseId === id && x.sec > 0 && ['work', 'contract', 'relax'].includes(x.kind));
        if (!worked) continue;
        try {
          next = recordKneeCheck(next, { id: newId(), at: Date.parse(session.startedAt), pain: runExposure.painBefore, context: 'test', exerciseId: id }, K).state;
          const r = recordExposure(id, next, { at, painBefore: runExposure.painBefore }, K);
          next = r.state;
          events.push(...r.events);
          recorded.push({ id, at });
        } catch (e) {
          flash(`Blootstelling niet vastgelegd: ${e?.message ?? e}`);
        }
      }
      exposuresBySession.set(session.id, recorded);
      runExposure = null;
    }
    const pending = exposuresBySession.get(session.id) ?? [];
    if (session.kneePainDuring !== null && pending.length) {
      for (const { id, at } of pending) {
        const r = setPainDuring(id, next, { exposureAt: at, pain: session.kneePainDuring }, K);
        next = r.state;
        events.push(...r.events);
      }
      exposuresBySession.set(session.id, []);
    }
    if (next !== knee) await commitKnee(next, events);
  }

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
  const home = createHomeScreen({
    lib, getData,
    // Kniekaarten bovenaan (§6.6–6.7) en "Ik heb een opvlamming" onderaan.
    topCards: () => kneeCards({ lib, knee, now: Date.now(), actions: kneeActions }),
    bottom: () => (knee.flare.active || knee.unknown ? null
      : h('button', { class: 'btn flare-button', type: 'button', onclick: askFlare }, KNEE.flareButton)),
  });
  const libState = libraryState(settings.showLocked);
  const library = createLibraryScreen({ lib, equipmentOrder, showLocked: settings.showLocked, weights: settings.weights, blockedCodes, state: libState });
  const exercise = createExerciseScreen({
    lib, getContext, onBack: goBack('#/bibliotheek'), onTry: tryExercise, onAdd: openAddSheet,
    onUnlock: (ex) => { location.hash = `#/ontgrendelen/${ex.id}`; },
  });
  const unlock = createUnlockScreen({ lib, getKnee: () => knee, actions: kneeActions, onBack: goBack('#/start') });
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
      await trackExposures(session);
    },
    onFinished: () => { replaceRoute('#/start'); },
  });
  const settingsScreen = createSettingsScreen({
    audio, getSettings, update: updateSettings,
    knee: {
      get: () => knee,
      askFlare,
      reset: async () => commitKnee(resetUnlocks(knee)),
    },
  });
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
    lib, equipmentOrder, showLocked: settings.showLocked, weights: settings.weights, blockedCodes, state: libState,
    title: 'Kies een oefening', headerExtra: pickerClose,
    scrollTop: () => { pickerList().scrollTop = 0; },
    onPick: (ex, codes) => {
      if (codes.length) {
        // §6.3: een tik op een vergrendelde oefening opent het
        // ontgrendelprotocol (§6.6); tijdens een opvlamming alleen de reden.
        const toUnlock = codes.includes('W1') && !codes.includes('W8')
          ? h('button', { class: 'btn', type: 'button', onclick: () => { pickerDialog.close(); location.hash = `#/ontgrendelen/${ex.id}`; } }, 'Naar de 48-uurstest')
          : null;
        fill(pickerNotice, h('div', { class: 'locked-bar' }, h('p', null, h('strong', null, `${ex.name}: `), codes.map((c) => WARNINGS[c].text).join(' ')), toUnlock));
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
    onSave: async (r) => { await saveRoutine(r); dropDraft(); },
    onDelete: async (r) => {
      await store.delete('routines', r.id);
      routines = routines.filter((x) => x.id !== r.id);
    },
    onDeleted: () => replaceRoute('#/routines'),
    onDuplicate: async (r) => {
      const d = duplicateRoutine(r, { id: newId(), now: Date.now() });
      try {
        await saveRoutine(d);
      } catch (e) {
        flash(`Dupliceren is niet gelukt: ${e?.message ?? e}`);
        return;
      }
      location.hash = `#/bouwer/${encodeURIComponent(d.id)}`;
    },
    onStart: (r) => {
      const { routine: playable } = playableRoutine(r, { lib, knee });
      if (playable.steps.length) startRoutine(playable, r);
    },
    onBack: goBack('#/routines'),
    onForget: () => dropDraft(),
  });
  function dropDraft() {
    builderDraft = null;
    store.delete('settings', 'builderDraft').catch(() => {});
  }
  // Naar de achtergrond met niet-opgeslagen wijzigingen: concept bewaren.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden' || current !== 'bouwer') return;
    const d = builder.draft();
    if (d) store.put('settings', structuredClone(d), 'builderDraft').catch(() => {});
  });
  if (builderDraft) {
    const d = builderDraft;
    const bar = h('div', { class: 'warn-bar draft-bar' },
      h('p', null, `"${d.routine.name}" had wijzigingen die niet waren opgeslagen.`),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => { bar.remove(); dropDraft(); } }, 'Weggooien'),
        h('button', {
          class: 'btn primary', type: 'button',
          onclick: () => {
            bar.remove();
            pendingDraft = d;
            const target = `#/bouwer/${encodeURIComponent(d.routine.id)}`;
            // Stond de bouwer al open (herladen in de bouwer), dan verandert de
            // hash niet: zelf de router aanroepen.
            if (location.hash === target) route();
            else location.hash = target;
          },
        }, 'Verder bewerken')));
    notices.append(bar);
  }
  let pendingDraft = null;
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
      if (fresh) { openBuilder(next, { fresh: true }); return; }
      try {
        await saveRoutine(next);
      } catch (e) {
        flash(`Toevoegen is niet gelukt: ${e?.message ?? e}`);
        return;
      }
      location.hash = `#/bouwer/${encodeURIComponent(next.id)}`;
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

  // Elke start komt hier langs. Zit er een oefening uit de proefperiode in,
  // dan eerst "Kniepijn nu" (die vraag is dan het gebruikersgebaar).
  function startRoutine(playable, meta) {
    const ids = trialExerciseIds(playable.steps, lib.exercises, knee);
    if (ids.length) askPainNow(playable, meta, ids);
    else beginRun(playable, meta, null);
  }

  // Start vanuit een gebruikersgebaar: audio ontgrendelen, dan de speler. De
  // knie-poort wordt hier voor elke stap nog eens toegepast: wat vergrendeld
  // is (W1) of tijdens een opvlamming boven 45° (W8), speelt nooit af.
  function beginRun(playable, meta, exposure) {
    const steps = playable.steps.filter((st) => access(lib.exercises.get(st.exerciseId), knee, K).allowed);
    if (!steps.length) return;
    audio.unlock();
    runExposure = exposure;
    player.begin({ ...playable, steps }, { id: meta.id, name: meta.name, slot: meta.slot, exposure });
    location.hash = '#/speler';
  }

  // "Probeer nu" (§6.2): alleen deze oefening met de standaarddosis. De
  // knie-poort wordt hier opnieuw gecontroleerd.
  function tryExercise(ex) {
    if (!access(ex, knee, lib.meta.knee).allowed) return;
    // In de status test is de eerste blootstelling de begeleide proef.
    if (unlockState(ex, knee) === 'test') { location.hash = `#/ontgrendelen/${ex.id}`; return; }
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
    ontgrendelen: h('div', null, unlock.root, unlock.toolbar),
    speler: h('div', null, player.root),
  };
  for (const v of Object.values(views)) v.hidden = true;
  fill(app, notices, ...Object.values(views), tabbar,
    library.sheet, exercise.sheet, picker.sheet, pickerDialog, addSheet, ...builder.sheets, flareSheet, painSheet, toasts);
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
    if (flareProposalPending && name !== 'speler') {
      flareProposalPending = false;
      if (!knee.flare.active) proposeFlare();
    }
  }

  const SIMPLE = {
    '#/routines': () => { routinesScreen.render(); show('routines', 'Routines'); window.scrollTo(0, scrollOf.routines ?? 0); },
    '#/week': () => { week.render(); show('week', 'Mijn week'); window.scrollTo(0, 0); },
    '#/meer': () => { more.render(); show('meer', 'Meer'); window.scrollTo(0, 0); },
    '#/instellingen': () => { settingsScreen.render(); show('instellingen', 'Instellingen'); window.scrollTo(0, 0); },
  };

  // Een kapotte link (#/bouwer/%) mag de router niet laten vastlopen.
  const safeDecode = (x) => { try { return decodeURIComponent(x); } catch { return ''; } };

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
    if ((m = /^#\/ontgrendelen\/([a-z0-9_]+)$/.exec(hash))) {
      expireNow();
      unlock.render(m[1]);
      show('ontgrendelen', `48-uurstest: ${lib.exercises.get(m[1])?.name ?? m[1]}`);
      window.scrollTo(0, 0);
      return;
    }
    if ((m = /^#\/routine\/(.+)$/.exec(hash))) {
      const id = safeDecode(m[1]);
      const r = lib.templates.get(id) ?? routines.find((x) => x.id === id) ?? null;
      routine.render(r);
      show('routine', r?.name ?? 'Routine');
      window.scrollTo(0, 0);
      return;
    }
    if ((m = /^#\/bouwer\/(.+)$/.exec(hash))) {
      const id = safeDecode(m[1]);
      // Van buiten de bouwer altijd de opgeslagen versie laden (die kan
      // intussen veranderd zijn, bv. via "Toevoegen aan routine"). Alleen
      // binnen de bouwer (terugvraag bij niet-opgeslagen wijzigingen) blijft
      // de werkkopie staan.
      if (pendingDraft?.routine.id === id) {
        builder.restore(pendingDraft, routines.find((x) => x.id === id) ?? null);
        pendingDraft = null;
      } else if (current !== 'bouwer' || builder.currentId() !== id) {
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
      library.sync();
      const back = current === 'oefening';
      show('bibliotheek', 'Bibliotheek', back ? `a.row[href="#/oefening/${lastExerciseId}"]` : 'h1');
      window.scrollTo(0, scrollOf.bibliotheek ?? 0);
      return;
    }
    if (SIMPLE[hash]) { SIMPLE[hash](); return; }
    if (hash !== '#/start') history.replaceState({ depth }, '', '#/start');
    expireNow();
    home.render();
    show('start', 'Start');
    window.scrollTo(0, scrollOf.start ?? 0);
  }

  // Na een wijziging in de kniestatus: het open scherm opnieuw opbouwen.
  function refreshView() {
    if (current === 'start') home.render();
    else if (current === 'oefening') exercise.render(lastExerciseId);
    else if (current === 'ontgrendelen') unlock.render(unlock.currentId());
    else if (current === 'instellingen') settingsScreen.render();
  }

  window.addEventListener('hashchange', route);
  route();
}

boot();
