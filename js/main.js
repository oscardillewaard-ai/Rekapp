// Opstarten en hash-router (§8.1). De bibliotheek wordt bij elke start
// gevalideerd; met kapotte data start de app niet (§9.2 regel 8).
import { loadLibrary, LibraryError } from './library.js';
import { h, clear, fill, preserveFocus } from './ui/dom.js';
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
import { kneeCards } from './ui/knee.js';
import { createLogScreen } from './ui/log.js';
import { createTestsScreen, createTestScreen } from './ui/tests.js';
import { createInstallScreen } from './ui/install.js';
import { createAboutScreen } from './ui/about.js';
import { isStandalone, watchInstallPrompt, registerServiceWorker, storageStatus } from './pwa.js';
import { reminderIcs } from './ics.js';
import {
  openStore, loadSettings, saveSettings, loadKneeState, loadKneeRev, saveKneeState, requestPersistence, newId, readAll, replaceAll,
} from './store.js';
import { buildDump, sessionsCsv, kneeChecksCsv, weekDoseCsv, parseDump, exportReminderDue, checkKneeState } from './backup.js';
import { newMeasurement, analyse, attentionGroups } from './selftests.js';
import { isoWithOffset } from './session.js';
import { withDefaults, DEFAULT_SETTINGS } from './settings.js';
import { createAudio } from './audio.js';
import {
  access, recordKneeCheck, activateFlare, endFlare, postponeFlareExit, latestKneeTime, flareExitDue, canUndoFlare,
} from './knee.js';
import { KNEE } from './texts.js';
import { formatDay } from './format.js';
import { playableRoutine, WARNINGS } from './warnings.js';
import { newRoutine, copyTemplate, duplicateRoutine, newStep, validateUserRoutine, capPnf } from './routines.js';

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
const UNKNOWN_KNEE = () => ({ flare: { active: true, since: null, exitProposedAt: null }, checks: [], unknown: true });

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
  const K = lib.meta.knee;
  // De kniestatus nalopen (zelfde regels als een import); niet te lezen →
  // opvlammingsmodus (fail-closed).
  const readKnee = async () => {
    const raw = await loadKneeState(store).catch(() => null);
    return raw ? checkKneeState(raw, lib) : null;
  };
  const bootKnee = store.persistent ? await readKnee() : null;
  let knee = bootKnee ? bootKnee.knee : UNKNOWN_KNEE();
  // Eigen routines: alleen geldige (een kapotte routine zou de speler of de
  // dosis verstoren); sessies voor "Mijn week".
  // PNF-stappen van vóór de grens van 180 s per kant worden eerst ingekort
  // (en zo opgeslagen).
  const capped = (await store.getAll('routines').catch(() => [])).map(capPnf);
  const storedRoutines = capped.map((c) => c.routine);
  let routines = storedRoutines.filter((r) => validateUserRoutine(r, lib.exercises).length === 0);
  const skippedRoutines = storedRoutines.length - routines.length;
  const shortened = capped.filter((c) => c.changed && routines.includes(c.routine)).map((c) => c.routine);
  for (const r of shortened) store.put('routines', r).catch(() => {});
  let sessions = await store.getAll('sessions').catch(() => []);
  let tests = await store.getAll('tests').catch(() => []);
  // Niet-opgeslagen werk uit de bouwer van de vorige keer (de app werd op de
  // achtergrond afgesloten, wat iOS vaak doet).
  let builderDraft = await store.get('settings', 'builderDraft').catch(() => null);
  if (builderDraft) builderDraft = { ...builderDraft, routine: capPnf(builderDraft.routine).routine };
  if (builderDraft && validateUserRoutine(builderDraft.routine, lib.exercises).length) builderDraft = null;
  await loadGraphics([...new Set([...lib.exercises.values()].map((x) => x.position))]);

  const audio = createAudio();
  audio.configure(settings);
  const getSettings = () => settings;
  const getContext = () => ({ settings, knee, routines });
  const getData = () => ({ settings, knee, routines, sessions, tests });
  // Spiergroepen met "aandacht" uit de zelftests (§6.10), voor de bibliotheek.
  // Opgeslagen metingen die niet te lezen zijn, mogen de start niet blokkeren.
  const safeAttention = () => { try { return attentionGroups([...lib.tests.values()], tests, Date.now()); } catch { return new Map(); } };
  let attention = safeAttention();
  const blockedCodes = (ex) => access(ex, knee, lib.meta.knee).codes;

  // Vaste meldingen bovenaan de app (opslag, kniestatus).
  const notices = h('div', { class: 'app-notices', role: 'status' });
  const notice = (text) => { if (![...notices.children].some((n) => n.textContent === text)) notices.append(h('p', { class: 'warn-bar' }, text)); };
  if (!store.persistent) notice('Opslaan lukt niet in deze browser: sessies en instellingen worden niet bewaard. Open de app buiten een privévenster of herlaad hem.');
  if (knee.unknown) notice('Je kniestatus kon niet worden gelezen. Voor de zekerheid staan oefeningen boven 45° uit, zoals bij een opvlamming.');
  for (const w of bootKnee?.warnings ?? []) notice(w);
  if (bootKnee?.changed) saveKneeState(store, knee).catch(() => {});
  if (shortened.length) notice(`PNF ingekort tot hoogstens 180 s per kant in: ${shortened.map((r) => r.name).join(', ')}.`);
  if (skippedRoutines) notice(`${skippedRoutines} opgeslagen ${skippedRoutines === 1 ? 'routine is' : 'routines zijn'} beschadigd en worden niet getoond.`);
  // Kort bericht (bv. "opvlammingsmodus aan"), vast bovenin zodat het ook zichtbaar
  // is als je gescrold bent, en zonder de knoppen in de duimzone te bedekken.
  // Verdwijnt na 10 s of met OK; de stand zelf staat ook op de schermen.
  const toasts = h('div', { class: 'toasts', role: 'status' });
  // Staat er een blad open (bv. het opvlammingsvoorstel), dan wacht het
  // bericht tot dat dicht is: anders valt het eronder en is het niet te lezen.
  const flash = (text) => {
    if (document.querySelector('dialog[open]')) { setTimeout(() => flash(text), 400); return; }
    const p = h('p', { class: 'toast' }, h('span', null, text));
    p.append(h('button', { class: 'btn', type: 'button', onclick: () => p.remove() }, 'OK'));
    toasts.append(p);
    setTimeout(() => p.remove(), 10000);
  };

  // ---------- Kniestatus (§6.7) ----------
  // Elke wijziging gaat via de pure functies in knee.js en wordt meteen
  // bewaard. Een kniestatus die niet gelezen kon worden, wordt nooit
  // weggeschreven: dat zou de echte status in de opslag overschrijven.

  const exName = (id) => lib.exercises.get(id)?.name ?? id;
  function eventTexts(events) {
    return events.map((e) => (e.type === 'opvlamming_aan'
      ? `Opvlammingsmodus staat aan (${e.reason}). Alles boven ${K.flareMaxDeg}° kniebuiging staat uit.`
      : null)).filter(Boolean);
  }

  // Opslaan gebeurt op volgorde, en alleen als de opgeslagen stand nog de
  // stand is waarop deze wijziging voortbouwt. Is hij intussen in een ander
  // venster veranderd, dan laadt de app die stand en geldt deze wijziging
  // niet (de knieregels zijn hard: nooit een nieuwere stand overschrijven).
  let kneeQueue = Promise.resolve();
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('rekapp') : null;
  function commitKnee(next, events = []) {
    const base = knee.rev ?? 0;
    knee = { ...next, rev: base + 1 };
    const mine = knee;
    kneeQueue = kneeQueue.then(() => persistKnee(mine, base, events)).catch(() => {});
    return kneeQueue;
  }
  async function persistKnee(mine, base, events) {
    if (store.persistent && !mine.unknown) {
      try {
        const stored = await loadKneeRev(store);
        if (stored !== base) {
          await reloadKnee({ force: true });
          flash('Je kniestatus is intussen in een ander venster gewijzigd. De nieuwste stand is geladen; probeer het zo nodig opnieuw.');
          return;
        }
        await saveKneeState(store, mine);
        channel?.postMessage({ type: 'knee', rev: mine.rev });
      } catch (e) {
        notice(`Kniestatus niet opgeslagen: ${e?.message ?? e}`);
      }
    }
    afterKnee(events);
  }
  // De stand uit de opslag halen als die nieuwer is (ander venster, terug uit
  // de achtergrond).
  async function reloadKnee({ force = false } = {}) {
    if (!store.persistent || knee.unknown) return;
    const fresh = await readKnee();
    if (!fresh) return;
    if (!force && fresh.knee.rev === knee.rev) return;
    knee = fresh.knee;
    afterKnee([]);
  }
  channel?.addEventListener('message', (e) => { if (e.data?.type === 'knee' && e.data.rev !== knee.rev) reloadKnee(); });
  function afterKnee(events) {
    library.refresh();
    picker.refresh();
    for (const t of eventTexts(events)) flash(t);
    refreshView();
  }

  // Staat de klok van het toestel vóór de laatste kniegebeurtenis, dan is hij
  // teruggezet: dan legt de app niets vast (anders kun je een gemiste check
  // inhalen of een venster verschuiven).
  function clockBack() {
    if (knee.unknown || Date.now() >= latestKneeTime(knee) - 60000) return false;
    flash('De klok van je toestel staat vóór je laatste kniecheck. Zet de datum en tijd goed; tot dan legt de app geen kniechecks vast.');
    return true;
  }

  const kneeActions = {
    async check(context, pain) {
      if (clockBack()) return;
      try {
        const r = recordKneeCheck(knee, { id: newId(), at: Date.now(), pain, context }, K);
        await commitKnee(r.state, r.events);
      } catch (e) {
        flash(String(e?.message ?? e));
        refreshView();
      }
    },
    // Alleen als de reeks van 7 dagen nog klopt (een oude kaart kan nog open
    // staan).
    async endFlare() {
      if (!flareExitDue(knee, Date.now(), K)) { flash('De reeks van 7 dagen klopt niet meer; de opvlammingsmodus blijft aan.'); refreshView(); return; }
      await commitKnee(endFlare(knee));
    },
    async postponeFlareExit() { await commitKnee(postponeFlareExit(knee, Date.now())); },
    undoFlare: () => askUndoFlare(),
  };

  // Opvlamming handmatig aan ("Ik heb een opvlamming"), of na een voorstel.
  const flareSheet = h('dialog', { class: 'sheet', 'aria-labelledby': 'flare-sheet-title' });
  flareSheet.addEventListener('click', (e) => { if (e.target === flareSheet) flareSheet.close(); });
  function openFlareSheet(title, text) {
    fill(flareSheet,
      h('div', { class: 'sheet-body' },
        h('h2', { id: 'flare-sheet-title' }, title),
        h('p', null, text),
        h('p', null, `Alles boven ${K.flareMaxDeg}° kniebuiging gaat uit. De modus gaat uit na ${K.flareExitDays} dagen op rij een dagelijkse kniecheck van ≤${K.painMax}/10. Per ongeluk aangezet? Dan kun je hem binnen 24 uur terugdraaien.`)),
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

  // Per ongeluk aangezet (keuze Oscar, AFWIJKINGEN.md): binnen 24 uur direct
  // terugdraaien, na een bevestiging. Bij een echte opvlamming laat je hem aan.
  const undoSheet = h('dialog', { class: 'sheet', 'aria-labelledby': 'undo-sheet-title' });
  undoSheet.addEventListener('click', (e) => { if (e.target === undoSheet) undoSheet.close(); });
  function askUndoFlare() {
    if (!canUndoFlare(knee, Date.now())) { flash('Terugdraaien kan alleen binnen 24 uur na het aanzetten.'); refreshView(); return; }
    fill(undoSheet,
      h('div', { class: 'sheet-body' },
        h('h2', { id: 'undo-sheet-title' }, 'Opvlammingsmodus terugdraaien?'),
        h('p', null, 'Doe dit alleen als je hem per ongeluk hebt aangezet. Speelt je knie echt op, laat hem dan aan.'),
        h('p', { class: 'note' }, 'Je kniechecks blijven in het logboek staan.')),
      h('div', { class: 'sheet-foot' },
        h('button', { class: 'btn', type: 'button', onclick: () => undoSheet.close() }, 'Aan laten'),
        h('button', {
          class: 'btn danger', type: 'button',
          onclick: async () => {
            undoSheet.close();
            // Opnieuw controleren: het blad kan lang hebben opengestaan.
            if (!canUndoFlare(knee, Date.now())) { flash('Terugdraaien kan alleen binnen 24 uur na het aanzetten.'); return; }
            await commitKnee(endFlare(knee));
            flash('Opvlammingsmodus teruggedraaid.');
          },
        }, 'Terugdraaien')));
    undoSheet.showModal();
  }

  async function updateSettings(patch) {
    settings = withDefaults({ ...settings, ...patch });
    applyTheme(settings);
    audio.configure(settings);
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
    // Kniekaarten bovenaan (§6.7) en "Ik heb een opvlamming" onderaan.
    topCards: () => [...kneeCards({ lib, knee, now: Date.now(), actions: kneeActions }), ...dataCards()],
    bottom: () => (knee.flare.active || knee.unknown ? null
      : h('button', { class: 'btn flare-button', type: 'button', onclick: askFlare }, KNEE.flareButton)),
  });
  const libState = libraryState();
  const library = createLibraryScreen({
    lib, equipmentOrder, weights: settings.weights, blockedCodes, state: libState,
    attention: () => attention,
  });
  const exercise = createExerciseScreen({
    lib, getContext, onBack: goBack('#/bibliotheek'), onTry: tryExercise, onAdd: openAddSheet,
  });
  const routine = createRoutineScreen({
    lib, getContext, onBack: goBack('#/start'), onStart: beginRun,
    onCopy: (tpl) => openBuilder(withoutBlocked(copyTemplate(tpl, { id: newId(), now: Date.now() })), { fresh: true }),
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
  const settingsScreen = createSettingsScreen({
    audio, getSettings, update: updateSettings,
    knee: {
      get: () => knee,
      askFlare,
      undoFlare: () => askUndoFlare(),
    },
    data: { openExport, importFile, canImport: () => store.persistent },
    pwa: { storageStatus, requestPersistence, isStandalone, downloadReminder },
  });
  const routinesScreen = createRoutinesScreen({
    lib, getData,
    onNew: () => openBuilder(newRoutine({ id: newId(), now: Date.now() }), { fresh: true }),
  });
  const week = createWeekScreen({ lib, getData });
  const more = createMoreScreen();
  const log = createLogScreen({ lib, getData });
  const testsScreen = createTestsScreen({ lib, getData });
  const install = createInstallScreen();
  const about = createAboutScreen({ lib });

  // Herinnering in de agenda (§7): een .ics met dagelijkse herhaling en alarm.
  function downloadReminder(key, time) {
    const label = key === 'morning' ? 'ochtendroutine' : 'avondroutine';
    const text = reminderIcs({
      uid: `rekapp-${key}@rekapp`, time, title: `Rekapp: ${label}`,
      description: 'Tijd om te rekken. Open Rekapp op je beginscherm.',
      url: new URL('./', location.href).href, now: Date.now(),
    });
    download({ name: `rekapp-${label}.ics`, type: 'text/calendar;charset=utf-8', text });
  }
  const testScreen = createTestScreen({
    lib, getData, onBack: goBack('#/zelftests'),
    onSave: async (test, entries) => {
      const date = isoWithOffset(Date.now());
      const ms = entries.map(({ side, trials }) => newMeasurement({ id: newId(), date, test, side, trials }));
      await store.batch(['tests'], (os) => { for (const m of ms) os('tests').put(m); });
      tests = [...tests, ...ms];
      refreshAttention();
    },
    onDelete: async (m) => {
      await store.delete('tests', m.id);
      tests = tests.filter((x) => x.id !== m.id);
      refreshAttention();
    },
  });
  function refreshAttention() {
    attention = safeAttention();
    library.refresh();
    picker.refresh();
  }

  // ---------- Export en import (§6.9) ----------

  async function exportFiles() {
    const data = await readAll(store);
    const now = Date.now();
    const exportedAt = isoWithOffset(now);
    const dump = buildDump(data, { exportedAt, librarySchemaVersion: lib.raw.schemaVersion });
    return [
      { name: `rekapp-${exportedAt.slice(0, 10)}.json`, type: 'application/json', text: `${JSON.stringify(dump, null, 2)}\n`, backup: true },
      { name: 'sessies.csv', type: 'text/csv;charset=utf-8', text: sessionsCsv(data.sessions) },
      { name: 'kniechecks.csv', type: 'text/csv;charset=utf-8', text: kneeChecksCsv(data.kneeChecks) },
      { name: 'dosis_per_week.csv', type: 'text/csv;charset=utf-8', text: weekDoseCsv(data.sessions, lib) },
    ];
  }
  const markExported = () => updateSettings({ lastExportAt: Date.now(), exportReminderSnoozedAt: null });
  function download(f) {
    const url = URL.createObjectURL(new Blob([f.text], { type: f.type }));
    const a = h('a', { href: url, download: f.name, hidden: true });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  const exportSheet = h('dialog', { class: 'sheet', 'aria-labelledby': 'export-title' });
  exportSheet.addEventListener('click', (e) => { if (e.target === exportSheet) exportSheet.close(); });
  // Delen (iPhone: "Bewaar in Bestanden") of per bestand downloaden. Elke knop
  // is een eigen tik, zodat ook iOS de bestanden toestaat.
  async function openExport() {
    let files;
    try {
      files = await exportFiles();
    } catch (e) {
      flash(`Export is niet gelukt: ${e?.message ?? e}`);
      return;
    }
    const asFiles = files.map((f) => new File([f.text], f.name, { type: f.type }));
    const canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: asFiles });
    const status = h('p', { class: 'note', role: 'status' });
    fill(exportSheet,
      h('div', { class: 'sheet-body' },
        h('div', { class: 'sheet-head' },
          h('h2', { id: 'export-title' }, 'Exporteren'),
          h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Sluiten', onclick: () => exportSheet.close() }, icon('cross'))),
        h('p', null, 'Het JSON-bestand is je volledige back-up (importeren zet alles terug). De drie CSV-bestanden openen in Excel.'),
        canShare ? h('button', {
          class: 'btn primary export-share', type: 'button',
          onclick: async () => {
            try {
              await navigator.share({ files: asFiles, title: 'Rekapp-export' });
              markExported();
              status.textContent = 'Gedeeld.';
            } catch (e) {
              if (e?.name !== 'AbortError') status.textContent = `Delen lukte niet: ${e?.message ?? e}. Download de bestanden hieronder.`;
            }
          },
        }, 'Alles delen of bewaren') : null,
        h('ul', { class: 'plain export-files' }, files.map((f) => h('li', null,
          h('button', {
            class: 'btn', type: 'button',
            onclick: () => { download(f); if (f.backup) markExported(); status.textContent = `${f.name} gedownload.`; },
          }, `Download ${f.name}`)))),
        status),
      h('div', { class: 'sheet-foot' }, h('button', { class: 'btn', type: 'button', onclick: () => exportSheet.close() }, 'Klaar')));
    exportSheet.showModal();
  }
  // "Laatste export" en de herinneringskaart bijwerken; de focus is dan al
  // terug op de knop die het blad opende.
  exportSheet.addEventListener('close', () => setTimeout(refreshView, 0));

  // Import: eerst controleren en laten zien wat er komt, dan alles vervangen.
  const importSheet = h('dialog', { class: 'sheet', 'aria-labelledby': 'import-title' });
  importSheet.addEventListener('click', (e) => { if (e.target === importSheet) importSheet.close(); });
  const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
  async function importFile(file) {
    let r;
    try {
      r = parseDump(await file.text(), lib, { defaults: DEFAULT_SETTINGS });
      // Zonder instellingen in het bestand blijven de huidige staan.
      if (r.ok && !r.data.settings) r.data.settings = settings;
    } catch (e) {
      r = { ok: false, errors: [String(e?.message ?? e)], warnings: [] };
    }
    const c = r.counts;
    fill(importSheet,
      h('div', { class: 'sheet-body' },
        h('h2', { id: 'import-title' }, r.ok ? 'Alles vervangen door deze import?' : 'Import niet mogelijk'),
        r.ok ? h('p', null, `${n(c.routines, 'routine', 'routines')}, ${n(c.sessions, 'sessie', 'sessies')}, ${n(c.kneeChecks, 'kniecheck', 'kniechecks')}, en ${n(c.tests, 'meting', 'metingen')}. Wat nu in de app staat, wordt vervangen.`) : null,
        r.errors.length ? h('ul', { class: 'plain' }, r.errors.slice(0, 12).map((e) => h('li', { class: 'locked-bar' }, e))) : null,
        r.warnings.length ? h('ul', { class: 'plain' }, r.warnings.map((w) => h('li', { class: 'warn-bar' }, w))) : null),
      h('div', { class: 'sheet-foot' },
        h('button', { class: 'btn', type: 'button', onclick: () => importSheet.close() }, r.ok ? 'Annuleren' : 'Sluiten'),
        r.ok ? h('button', {
          class: 'btn danger', type: 'button',
          onclick: async (e) => {
            e.currentTarget.disabled = true;
            try {
              await replaceAll(store, r.data);
            } catch (err) {
              importSheet.close();
              flash(`Importeren is niet gelukt: ${err?.message ?? err}. Er is niets veranderd.`);
              return;
            }
            // Opnieuw starten met de geïmporteerde gegevens.
            history.replaceState(null, '', '#/start');
            location.reload();
          },
        }, 'Alles vervangen') : null));
    importSheet.showModal();
  }

  // Kaarten op het startscherm: installeren, exportherinnering en open
  // hertests.
  let installHintHidden = false;
  function dataCards() {
    const now = Date.now();
    const out = [];
    // §7 "Eerst installeren, dan gebruiken."
    if (!isStandalone() && !installHintHidden) {
      out.push(h('section', { class: 'section knee-card install-card', 'aria-labelledby': 'install-card-title' },
        h('h2', { id: 'install-card-title' }, 'Installeer Rekapp'),
        h('p', null, 'Zet Rekapp op je beginscherm. Dan werkt hij offline en blijven je gegevens beter bewaard.'),
        h('div', { class: 'actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => { installHintHidden = true; home.render(); } }, 'Niet nu'),
          h('a', { class: 'btn card-save', href: '#/installeren' }, 'Hoe?'))));
    }
    if (exportReminderDue({ lastExportAt: settings.lastExportAt, snoozedAt: settings.exportReminderSnoozedAt, sessions, now })) {
      out.push(h('section', { class: 'section knee-card', 'aria-labelledby': 'export-card-title' },
        h('h2', { id: 'export-card-title' }, 'Tijd voor een export'),
        h('p', null, settings.lastExportAt ? `Je laatste export is van ${formatDay(settings.lastExportAt)}.` : 'Je hebt nog geen export gemaakt.',
          ' Je gegevens staan alleen op dit toestel; met een export kun je alles terugzetten.'),
        h('div', { class: 'actions' },
          h('button', { class: 'btn', type: 'button', onclick: async () => { await updateSettings({ exportReminderSnoozedAt: Date.now() }); home.render(); } }, 'Later'),
          h('button', { class: 'btn card-save', type: 'button', onclick: () => openExport() }, 'Exporteren'))));
    }
    const due = [...lib.tests.values()].map((t) => analyse(t, tests, now)).filter((a) => a.retest?.due);
    if (due.length) {
      out.push(h('a', { class: 'section week-card', href: '#/zelftests' },
        h('h2', null, 'Hertest zelftests'),
        h('p', null, due.map((a) => `${a.test.name} (week ${a.retest.due.week})`).join(', '), '.')));
    }
    return out;
  }

  // Kiesblad voor de bouwer: de bibliotheek met dezelfde filters, maar een tik
  // kiest de oefening. Geblokkeerd (W8) kan niet; dan staat de reden erbij.
  const pickerNotice = h('div', { class: 'picker-notice', role: 'alert' });
  let pickResolve = null;
  const pickerClose = h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Sluiten', onclick: () => pickerDialog.close() }, icon('cross'));
  const picker = createLibraryScreen({
    lib, equipmentOrder, weights: settings.weights, blockedCodes, state: libState,
    title: 'Kies een oefening', headerExtra: pickerClose,
    scrollTop: () => { pickerList().scrollTop = 0; },
    onPick: (ex, codes) => {
      if (codes.length) {
        // Tijdens een opvlamming: alleen de reden.
        fill(pickerNotice, h('div', { class: 'locked-bar' }, h('p', null, h('strong', null, `${ex.name}: `), codes.map((c) => WARNINGS[c].text).join(' '))));
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
      if (builderDraft?.routine.id === r.id) dropDraft();
    },
    onDeleted: () => replaceRoute('#/routines'),
    onDuplicate: async (r) => {
      if (builderDraft?.routine.id === r.id) dropDraft();
      const d = withoutBlocked(duplicateRoutine(r, { id: newId(), now: Date.now() }));
      try {
        await saveRoutine(d);
      } catch (e) {
        flash(`Dupliceren is niet gelukt: ${e?.message ?? e}`);
        return;
      }
      location.hash = `#/bouwer/${encodeURIComponent(d.id)}`;
    },
    onStart: (r) => {
      if (builderDraft?.routine.id === r.id) dropDraft();
      const { routine: playable } = playableRoutine(r, { lib, knee });
      if (playable.steps.length) beginRun(playable, r);
    },
    onBack: goBack('#/routines'),
    onForget: () => dropDraft(),
  });
  // Het concept vervalt zodra die routine wordt opgeslagen, gestart,
  // gedupliceerd of verwijderd, of als je "Niet opslaan" kiest.
  let draftBar = null;
  function dropDraft() {
    if (!builderDraft && !draftBar) return;
    builderDraft = null;
    draftBar?.remove();
    draftBar = null;
    store.delete('settings', 'builderDraft').catch(() => {});
  }
  // Terug in beeld (de app bleef open op de achtergrond): de nieuwste
  // kniestatus laden en de kaarten bijwerken (dagelijkse check na 04:00,
  // terugdraaien alleen binnen 24 uur).
  const onVisible = async () => {
    await reloadKnee();
    if (!player.isActive()) refreshView();
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') onVisible(); });
  window.addEventListener('pageshow', (e) => { if (e.persisted) onVisible(); });
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
        h('button', { class: 'btn', type: 'button', onclick: () => dropDraft() }, 'Weggooien'),
        h('button', {
          class: 'btn', type: 'button',
          onclick: () => {
            // Niets overschrijven wat je nu aan het bewerken bent.
            if (builder.isDirty()) { flash('Sla eerst je huidige wijzigingen op, of kies "Niet opslaan".'); return; }
            draftBar = null;
            bar.remove();
            pendingDraft = d;
            const target = `#/bouwer/${encodeURIComponent(d.routine.id)}`;
            // Stond de bouwer al open (herladen in de bouwer), dan verandert de
            // hash niet: zelf de router aanroepen.
            if (location.hash === target) route();
            else location.hash = target;
          },
        }, 'Verder bewerken')));
    draftBar = bar;
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
  // nieuwe. De opvlammingsmodus wordt hier opnieuw gecontroleerd.
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

  // Kopiëren en dupliceren maken een nieuwe routine: wat de opvlammingsmodus
  // nu blokkeert (W8), komt er niet in (§6.5 "voorkomen toevoegen"). Zeg wat
  // er is weggelaten.
  function withoutBlocked(r) {
    const { routine: kept, removed } = playableRoutine(r, { lib, knee });
    if (removed.length) {
      const names = [...new Set(removed.map((x) => exName(x.exerciseId)))].join(', ');
      flash(`Niet overgenomen (opvlammingsmodus): ${names}.`);
    }
    return kept;
  }

  // Elke start komt hier langs, vanuit een gebruikersgebaar: audio
  // ontgrendelen, dan de speler. De opvlammingsmodus wordt hier voor elke
  // stap nog eens toegepast: wat boven 45° gaat (W8), speelt nooit af. Geeft
  // true als de speler start.
  function beginRun(playable, meta) {
    const steps = playable.steps.filter((st) => access(lib.exercises.get(st.exerciseId), knee, K).allowed);
    if (!steps.length) return false;
    audio.unlock();
    player.begin({ ...playable, steps }, { id: meta.id, name: meta.name, slot: meta.slot });
    location.hash = '#/speler';
    return true;
  }

  // "Probeer nu" (§6.2): alleen deze oefening met de standaarddosis. De
  // opvlammingsmodus wordt hier opnieuw gecontroleerd.
  function tryExercise(ex) {
    if (!access(ex, knee, lib.meta.knee).allowed) return;
    const step = { exerciseId: ex.id, ...ex.defaultDose };
    beginRun({ steps: [step] }, { id: `probeer:${ex.id}`, name: `Probeer nu: ${ex.name}`, slot: 'vrij' });
  }

  const TABS = [['start', 'Start', 'home'], ['routines', 'Routines', 'play'], ['bibliotheek', 'Bibliotheek', 'list'], ['week', 'Week', 'sliders'], ['meer', 'Meer', 'gear']];
  const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Hoofdmenu' },
    TABS.map(([route, text, ic]) => h('a', { href: `#/${route}`, dataset: { route } }, icon(ic), h('span', null, text))));
  // Welke tab oplicht bij een scherm (instellingen hoort bij "Meer").
  const TAB_OF = {
    start: 'start', routines: 'routines', bibliotheek: 'bibliotheek', week: 'week', meer: 'meer',
    instellingen: 'meer', logboek: 'meer', zelftests: 'meer', installeren: 'meer', over: 'meer',
  };

  const views = {
    start: h('div', null, home.root),
    routines: h('div', null, routinesScreen.root),
    bibliotheek: h('div', null, library.root),
    week: h('div', null, week.root),
    meer: h('div', null, more.root),
    instellingen: h('div', null, settingsScreen.root),
    logboek: h('div', null, log.root),
    zelftests: h('div', null, testsScreen.root),
    zelftest: h('div', null, testScreen.root, testScreen.toolbar),
    installeren: h('div', null, install.root),
    over: h('div', null, about.root),
    oefening: h('div', null, exercise.root, exercise.toolbar),
    routine: h('div', null, routine.root, routine.toolbar),
    bouwer: h('div', null, builder.root, builder.toolbar),
    speler: h('div', null, player.root),
  };
  for (const v of Object.values(views)) v.hidden = true;
  fill(app, notices, ...Object.values(views), tabbar,
    library.sheet, exercise.sheet, picker.sheet, pickerDialog, addSheet, ...builder.sheets, flareSheet, undoSheet, exportSheet, importSheet, toasts);
  watchBars();

  // Service worker (§8.1) en "Update beschikbaar → herladen" (§11.3). Een
  // nieuwe versie wacht tot je zelf herlaadt; tijdens een routine niet.
  watchInstallPrompt();
  registerServiceWorker((apply) => {
    if (notices.querySelector('.update-bar')) return;
    const bar = h('div', { class: 'info-bar update-bar', role: 'status' },
      h('span', null, 'Update beschikbaar.'),
      h('button', {
        class: 'btn', type: 'button',
        onclick: () => {
          if (player.isActive()) { flash('Rond eerst de routine af; daarna kun je herladen.'); return; }
          bar.remove();
          apply();
        },
      }, 'Herladen'));
    notices.prepend(bar);
  });

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
    '#/logboek': () => { log.render(); show('logboek', 'Logboek'); window.scrollTo(0, 0); },
    '#/zelftests': () => { testsScreen.render(); show('zelftests', 'Zelftests'); window.scrollTo(0, scrollOf.zelftests ?? 0); },
    '#/installeren': () => { install.render(); show('installeren', 'Installeren'); window.scrollTo(0, 0); },
    '#/over': () => { about.render(); show('over', 'Over Rekapp'); window.scrollTo(0, 0); },
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
      pendingDraft = null;
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
        // Wat de opvlammingsmodus nu blokkeert en niet al in de opgeslagen
        // routine stond, komt er niet bij (net als bij kopiëren).
        const base = routines.find((x) => x.id === id) ?? null;
        const had = new Set((base?.steps ?? []).map((st) => st.exerciseId));
        const steps = pendingDraft.routine.steps.filter((st) => had.has(st.exerciseId) || access(lib.exercises.get(st.exerciseId), knee, K).allowed);
        if (steps.length < pendingDraft.routine.steps.length) flash('Niet overgenomen uit het concept (opvlammingsmodus): geblokkeerde oefeningen.');
        builder.restore({ ...pendingDraft, routine: { ...pendingDraft.routine, steps } }, base);
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
    if ((m = /^#\/zelftest\/([a-z0-9_]+)$/.exec(hash))) {
      testScreen.render(m[1]);
      show('zelftest', lib.tests.get(m[1])?.name ?? 'Zelftest');
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
      library.sync();
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

  // Na een wijziging in de kniestatus: het open scherm opnieuw opbouwen.
  // Focus blijft op dezelfde knop, of gaat naar de kop als die weg is.
  function refreshView() {
    const view = views[current];
    if (!view) return;
    preserveFocus(view, () => {
      if (current === 'start') home.render();
      else if (current === 'oefening') exercise.render(lastExerciseId);
      else if (current === 'instellingen') settingsScreen.render({ keepDraft: true });
    });
  }

  window.addEventListener('hashchange', route);
  route();
}

boot();
