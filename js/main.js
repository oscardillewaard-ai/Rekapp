// Opstarten en hash-router (§8.1). De bibliotheek wordt bij elke start
// gevalideerd; met kapotte data start de app niet (§9.2 regel 8).
import { loadLibrary, LibraryError } from './library.js';
import { h, clear } from './ui/dom.js';
import { loadGraphics } from './ui/graphics.js';
import { createLibraryScreen } from './ui/library.js';
import { createExerciseScreen } from './ui/exercise.js';

const app = document.getElementById('app');

function showError(title, detail) {
  clear(app).append(h('div', { class: 'error', role: 'alert' }, h('h1', null, title), h('pre', null, detail)));
}

// De vaste werkbalk onderin is niet altijd even hoog (grotere tekst, knoppen
// die over twee regels lopen). Meet hem, zodat de inhoud er nooit onder
// verdwijnt (.screen gebruikt --toolbar-h als ruimte onderaan).
function watchToolbarHeight(toolbars) {
  const set = () => {
    // offsetParent is altijd null bij position: fixed; getClientRects is leeg als
    // een voorouder verborgen is.
    const visible = toolbars.find((t) => t.getClientRects().length > 0);
    if (visible) document.documentElement.style.setProperty('--toolbar-h', `${visible.offsetHeight}px`);
  };
  const ro = new ResizeObserver(set);
  for (const t of toolbars) ro.observe(t);
  window.addEventListener('hashchange', () => requestAnimationFrame(set));
}

async function boot() {
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
  await loadGraphics([...new Set([...lib.exercises.values()].map((x) => x.position))]);

  const equipmentOrder = schema.$defs.exercise.properties.equipment.items.enum;
  const library = createLibraryScreen({ lib, equipmentOrder });
  let cameFromLibrary = false;
  const exercise = createExerciseScreen({
    lib,
    onBack: () => { if (cameFromLibrary) history.back(); else location.hash = '#/bibliotheek'; },
  });

  const views = {
    library: h('div', null, library.root),
    exercise: h('div', { hidden: true }, exercise.root, exercise.toolbar),
  };
  clear(app).append(views.library, views.exercise, library.sheet, exercise.sheet);
  watchToolbarHeight([library.toolbar, exercise.toolbar]);

  // De router regelt het scrollen zelf (terug naar de bibliotheek = oude plek).
  history.scrollRestoration = 'manual';
  let current = null; // null = eerste route, bv. een deeplink naar een kaart
  let libraryScroll = 0;
  let lastExerciseId = null;

  function route() {
    const hash = location.hash || '#/bibliotheek';
    const m = /^#\/oefening\/([a-z0-9_]+)$/.exec(hash);
    for (const d of document.querySelectorAll('dialog[open]')) d.close();
    if (m) {
      if (current === 'library') libraryScroll = window.scrollY;
      cameFromLibrary = current === 'library';
      exercise.render(m[1]);
      views.library.hidden = true;
      views.exercise.hidden = false;
      current = 'exercise';
      lastExerciseId = m[1];
      window.scrollTo(0, 0);
      document.title = `${lib.exercises.get(m[1])?.name ?? 'Oefening'} · Rekapp`;
      views.exercise.querySelector('h1')?.focus({ preventScroll: true });
      return;
    }
    if (hash !== '#/bibliotheek') history.replaceState(null, '', '#/bibliotheek');
    views.exercise.hidden = true;
    views.library.hidden = false;
    if (current === 'exercise') {
      window.scrollTo(0, libraryScroll);
      // Focus terug op de rij die geopend was.
      views.library.querySelector(`a.row[href="#/oefening/${lastExerciseId}"]`)?.focus({ preventScroll: true });
    }
    current = 'library';
    document.title = 'Bibliotheek · Rekapp';
  }

  window.addEventListener('hashchange', route);
  route();
}

boot();
