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
    library: h('div', null, library.root, library.toolbar),
    exercise: h('div', { hidden: true }, exercise.root, exercise.toolbar),
  };
  clear(app).append(views.library, views.exercise, library.sheet, exercise.sheet);

  let current = 'library';
  let libraryScroll = 0;

  function route() {
    const hash = location.hash || '#/bibliotheek';
    const m = /^#\/oefening\/([a-z0-9_]+)$/.exec(hash);
    if (m) {
      if (current === 'library') libraryScroll = window.scrollY;
      cameFromLibrary = current === 'library';
      for (const d of document.querySelectorAll('dialog[open]')) d.close();
      exercise.render(m[1]);
      views.library.hidden = true;
      views.exercise.hidden = false;
      current = 'exercise';
      window.scrollTo(0, 0);
      document.title = `${lib.exercises.get(m[1])?.name ?? 'Oefening'} · Rekapp`;
      return;
    }
    if (hash !== '#/bibliotheek') {
      history.replaceState(null, '', '#/bibliotheek');
    }
    for (const d of document.querySelectorAll('dialog[open]')) d.close();
    views.exercise.hidden = true;
    views.library.hidden = false;
    if (current !== 'library') window.scrollTo(0, libraryScroll);
    current = 'library';
    document.title = 'Bibliotheek · Rekapp';
  }

  window.addEventListener('hashchange', route);
  route();
}

boot();
