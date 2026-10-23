// "Over" (§6.12): geen medisch advies, wat rekken wel en niet doet, de uitleg
// van de sterren (§3) en het bewijs per spiergroep (§4).
import { h, fill } from './dom.js';
import { icon } from './graphics.js';
import { ABOUT, STARS_FORMULA, STARS_MEANING, RUBRICS } from '../texts.js';
import { REGIONS } from '../catalog.js';

const LETTERS = ['B', 'K', 'D', 'R', 'P'];
const cap = (t) => t[0].toUpperCase() + t.slice(1);

export function createAboutScreen({ lib }) {
  const root = h('section', { class: 'screen about', 'aria-labelledby': 'about-title' });

  const source = (key) => {
    const s = lib.sources.get(key);
    if (!s) return null;
    return h('li', null, s.url ? h('a', { class: 'source-link', href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.citation) : s.citation);
  };
  const details = (title, ...children) => h('details', { class: 'sources' },
    h('summary', null, h('span', null, title), h('span', { class: 'chev', 'aria-hidden': 'true' }, icon('back'))), ...children);

  function render() {
    fill(root,
      h('header', { class: 'topbar' }, h('h1', { id: 'about-title', tabindex: '-1' }, 'Over Rekapp')),
      h('section', { class: 'section' }, h('ul', { class: 'about-list' }, ABOUT.map((t) => h('li', null, t)))),
      h('section', { class: 'section' },
        h('h2', null, 'De sterren'),
        h('p', null, 'Elke oefening krijgt vijf deelscores van 1 tot 5. De score is een gewogen gemiddelde. Deze app toont de sterren zonder knie-poort: het knieslot is op jouw verzoek verwijderd. Kies je liever knievriendelijk, zet dan het filter "alleen K ≥ 4" aan of geef K meer gewicht bij "Weging aanpassen" in de instellingen.'),
        h('pre', { class: 'formula' }, STARS_FORMULA.join('\n')),
        ...LETTERS.map((l) => {
          const r = RUBRICS[l];
          return details(r.title.replace(/\.$/, ''),
            r.intro ? h('p', null, cap(r.intro)) : null,
            h('ol', { class: 'rubric', reversed: true }, [5, 4, 3, 2, 1].map((lvl) => h('li', null, h('b', null, String(lvl)), h('span', null, r.levels[lvl])))),
            r.outro ? h('p', { class: 'note' }, r.outro) : null);
        }),
        h('h3', null, 'Wat de sterren wel en niet zeggen'),
        h('ul', { class: 'about-list' }, STARS_MEANING.map(([lead, rest]) => h('li', null, h('strong', null, lead), ' ', rest)))),
      h('section', { class: 'section' },
        h('h2', null, 'Bewijs per spiergroep'),
        ...REGIONS.map((region) => [
          h('h3', { class: 'region-title' }, region),
          ...[...lib.groups.values()].filter((g) => g.region === region).map((g) => details(g.label,
            h('p', null, g.evidence),
            g.relevance ? h('p', null, h('strong', null, 'Relevantie: '), g.relevance) : null,
            g.note ? h('p', null, h('strong', null, 'Let op: '), g.note) : null,
            g.sources.length ? h('ul', null, g.sources.map(source)) : null)),
        ]).flat()),
      h('p', { class: 'note' }, `Bibliotheek: schema ${lib.raw.schemaVersion}, ${lib.exercises.size} oefeningen, ${lib.groups.size} spiergroepen.`));
  }
  return { root, render };
}
