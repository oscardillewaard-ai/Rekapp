// Installeren (§7): stappen per platform. Op Android met de knop van Chrome
// (beforeinstallprompt) als die beschikbaar is.
import { h, fill } from './dom.js';
import { INSTALL } from '../texts.js';
import { isStandalone, platform, canPromptInstall, promptInstall, onInstallChange } from '../pwa.js';

export function createInstallScreen() {
  const root = h('section', { class: 'screen', 'aria-labelledby': 'install-title' });

  function steps(p) {
    if (p === 'ios') {
      return h('ol', { class: 'cues install-steps' },
        h('li', null, 'Open deze pagina in Safari (niet in een andere app of browser).'),
        h('li', null, 'Tik onderin op Deel (het vierkantje met de pijl omhoog).'),
        h('li', null, 'Kies "Zet op beginscherm" en tik op Voeg toe.'),
        h('li', null, 'Open Rekapp voortaan via het icoon op je beginscherm.'));
    }
    if (p === 'android') {
      return h('ol', { class: 'cues install-steps' },
        h('li', null, 'Open deze pagina in Chrome.'),
        h('li', null, 'Tik op het menu (drie puntjes rechtsboven).'),
        h('li', null, 'Kies "App installeren" (of "Toevoegen aan startscherm").'),
        h('li', null, 'Open Rekapp voortaan via het icoon.'));
    }
    return h('p', null, 'Open Rekapp op je telefoon: op de iPhone in Safari, op Android in Chrome, en volg daar de stappen.');
  }

  function render() {
    const p = platform();
    const installed = isStandalone();
    fill(root,
      h('header', { class: 'topbar' }, h('h1', { id: 'install-title', tabindex: '-1' }, 'Installeren')),
      installed
        ? h('p', { class: 'info-bar' }, 'Rekapp draait als app vanaf je beginscherm. Alles werkt ook zonder internet.')
        : h('p', { class: 'warn-bar' }, `${INSTALL.first} Een geïnstalleerde app werkt offline en houdt je gegevens beter vast; in een gewone browsertab kan de browser ze na een tijd wissen.`),
      installed ? null : h('section', { class: 'section' },
        h('h2', null, p === 'ios' ? 'iPhone' : p === 'android' ? 'Android' : 'Op je telefoon'),
        p === 'android' && canPromptInstall()
          ? h('button', { class: 'btn primary install-now', type: 'button', onclick: async () => { await promptInstall(); render(); } }, 'App installeren')
          : null,
        steps(p)),
      h('section', { class: 'section' },
        h('h2', null, 'Goed om te weten'),
        h('ul', { class: 'plain' },
          h('li', null, `iPhone: ${INSTALL.ios}. De geïnstalleerde app heeft eigen opslag, los van Safari: gegevens uit de Safari-tab staan er niet in. Exporteer en importeer ze zo nodig (Instellingen → Gegevens).`),
          h('li', null, `Android: ${INSTALL.android}.`),
          h('li', null, 'Zet na het installeren in Instellingen de herinneringen in je agenda en controleer de opslagstatus.'))));
  }
  onInstallChange(() => { if (root.isConnected) render(); });
  return { root, render };
}
