// "Meer": de schermen die niet in de tabbalk passen.
import { h, fill } from './dom.js';
import { icon } from './graphics.js';

export function createMoreScreen() {
  const root = h('section', { class: 'screen', 'aria-labelledby': 'more-title' });
  const items = [
    ['#/logboek', 'Logboek', 'list'], ['#/zelftests', 'Zelftests', 'sliders'], ['#/instellingen', 'Instellingen', 'gear'],
    ['#/installeren', 'Installeren', 'home'], ['#/over', 'Over Rekapp', 'info'],
  ];

  function render() {
    fill(root, 
      h('header', { class: 'topbar' }, h('h1', { id: 'more-title', tabindex: '-1' }, 'Meer')),
      h('ul', { class: 'list' }, items.map(([href, text, ic]) => h('li', null,
        h('a', { class: 'row menu-row', href }, icon(ic), h('div', { class: 'main' }, h('div', { class: 'name' }, text)), icon('back', 'chev-right'))))));
  }
  return { root, render, add: (href, text, ic) => items.push([href, text, ic]) };
}
