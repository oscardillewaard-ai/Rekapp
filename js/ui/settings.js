// Instellingen (§6.11). Elke wijziging wordt direct opgeslagen. Latere
// mijlpalen voegen weging, opvlamming, export/import en opslag toe.
import { h, fill } from './dom.js';
import { icon } from './graphics.js';
import { DEFAULT_SETTINGS } from '../settings.js';

const LETTER_NAMES = { B: 'Bewijs', K: 'Knieveiligheid', D: 'Doelgerichtheid', R: 'Relevantie', P: 'Praktisch' };

export function createSettingsScreen({ audio, getSettings, update }) {
  const root = h('section', { class: 'screen', 'aria-labelledby': 'settings-title' });
  const extra = h('div'); // secties van latere mijlpalen
  let offVoices = null;

  function toggle(label, key, hint) {
    const input = h('input', { type: 'checkbox', role: 'switch' });
    input.checked = Boolean(getSettings()[key]);
    input.addEventListener('change', () => update({ [key]: input.checked }));
    return h('label', { class: 'switch' }, h('span', null, label, hint ? h('small', { class: 'hint' }, hint) : null), input);
  }

  function voiceSelect() {
    const wrap = h('div');
    const fillVoices = () => {
      const voices = audio.dutchVoices();
      if (!voices.length) {
        fill(wrap, h('p', { class: 'note' }, 'Geen Nederlandse stem gevonden op dit toestel. Je hoort alleen piepjes.'));
        return;
      }
      const select = h('select', { 'aria-label': 'Stem' },
        h('option', { value: '' }, 'Automatisch (eerste Nederlandse stem)'),
        voices.map((v) => h('option', { value: v.voiceURI }, `${v.name} (${v.lang})`)));
      select.value = getSettings().voiceURI ?? '';
      select.addEventListener('change', () => update({ voiceURI: select.value || null }));
      fill(wrap, h('label', { class: 'field' }, h('span', null, 'Stem'), select));
    };
    fillVoices();
    offVoices?.();
    offVoices = audio.onVoicesChanged(fillVoices);
    return wrap;
  }

  function volume() {
    const s = getSettings();
    const out = h('output', null, `${Math.round(s.beepVolume * 100)}%`);
    const input = h('input', { type: 'range', min: 0, max: 100, step: 10, value: Math.round(s.beepVolume * 100), 'aria-label': 'Piepvolume' });
    const paint = () => input.style.setProperty('--pct', `${input.value}%`);
    paint();
    input.addEventListener('input', () => { out.textContent = `${input.value}%`; paint(); });
    input.addEventListener('change', () => update({ beepVolume: Number(input.value) / 100 }));
    return h('label', { class: 'slider' }, h('span', null, 'Piepvolume', out), input);
  }

  // Standaard statische houdtijd (§6.11): voor nieuwe statische stappen in de
  // bouwer die in de bibliotheek de standaard 45 s hebben.
  function defaultHold() {
    const select = h('select', { 'aria-label': 'Standaard statische houdtijd' },
      [30, 45, 60, 75, 90].map((n) => h('option', { value: n }, `${n} s`)));
    select.value = String(getSettings().defaultStaticHoldSec);
    select.addEventListener('change', () => update({ defaultStaticHoldSec: Number(select.value) }));
    return h('label', { class: 'field' }, h('span', null, 'Standaard statische houdtijd', h('small', { class: 'hint' }, 'Voor nieuwe statische stappen in de bouwer.')), select);
  }

  function sideSwitch() {
    const select = h('select', { 'aria-label': 'Kantwisselduur' },
      [3, 5, 8, 10].map((n) => h('option', { value: n }, `${n} s`)));
    select.value = String(getSettings().sideSwitchSec);
    select.addEventListener('change', () => update({ sideSwitchSec: Number(select.value) }));
    return h('label', { class: 'field' }, h('span', null, 'Kantwisselduur'), select);
  }

  // Weging aanpassen (§6.11): som altijd 100 %; herberekent alleen de getoonde
  // sterren, de knie-poort blijft gelden.
  let draft = null;
  function weights() {
    draft ??= { ...getSettings().weights };
    const wrap = h('section', { class: 'section' });
    const paint = () => {
      const sum = Object.values(draft).reduce((a, b) => a + b, 0);
      const set = (k, d) => {
        draft = { ...draft, [k]: Math.min(100, Math.max(0, draft[k] + d)) };
        const total = Object.values(draft).reduce((a, b) => a + b, 0);
        if (total === 100) update({ weights: { ...draft } });
        paint();
      };
      fill(wrap, 
        h('h2', null, 'Weging aanpassen'),
        h('p', { class: 'note' }, 'Verandert alleen de sterren die je ziet. De knie-poort blijft altijd gelden.'),
        ...Object.keys(LETTER_NAMES).map((k) => h('div', { class: 'stepper', role: 'group', 'aria-label': `${k} ${LETTER_NAMES[k]}` },
          h('span', { class: 'stepper-label' }, `${k} · ${LETTER_NAMES[k]}`),
          h('button', { class: 'btn icon', type: 'button', 'aria-label': `${LETTER_NAMES[k]} lager`, onclick: () => set(k, -5) }, '−'),
          h('output', null, `${draft[k]}%`),
          h('button', { class: 'btn icon', type: 'button', 'aria-label': `${LETTER_NAMES[k]} hoger`, onclick: () => set(k, 5) }, '+'))),
        h('p', { class: sum === 100 ? 'note' : 'warn-bar', role: 'status' },
          sum === 100 ? 'Som: 100 %.' : `Som: ${sum} %. Pas aan tot 100 %; tot dan blijft de vorige weging gelden.`),
        h('button', {
          class: 'btn', type: 'button',
          onclick: () => { draft = { ...DEFAULT_SETTINGS.weights }; update({ weights: { ...draft } }); paint(); },
        }, 'terug naar standaard 25/25/20/15/15'));
    };
    paint();
    return wrap;
  }

  function render() {
    draft = null;
    fill(root, 
      h('header', { class: 'topbar' }, h('h1', { id: 'settings-title', tabindex: '-1' }, 'Instellingen')),
      h('section', { class: 'section' },
        h('h2', null, 'Geluid en spraak'),
        toggle('Geluid ook in stille modus', 'soundInSilentMode', 'iPhone: piepjes en spraak klinken ook met de stille schakelaar aan. Andere muziek pauzeert dan.'),
        toggle('Mixen met muziek', 'mixWithMusic', 'Muziek speelt door; de stille schakelaar dempt de app.'),
        toggle('Spraak', 'voiceOn'),
        voiceSelect(),
        volume(),
        h('button', {
          class: 'btn', type: 'button',
          onclick: () => {
            audio.unlock();
            audio.beep('test');
            setTimeout(() => audio.speak('Linkerkant. Kuit tegen de muur. 45 seconden.'), 300);
          },
        }, icon('speaker'), 'Test geluid')),
      h('section', { class: 'section' },
        h('h2', null, 'Speler'),
        toggle('Auto-pauze bij een verborgen scherm', 'autoPauseOnHide', 'Uit: de routine loopt door op de achtergrond en springt bij terugkomst naar de juiste plek.'),
        sideSwitch()),
      h('section', { class: 'section' },
        h('h2', null, 'Weergave'),
        toggle('Nachtmodus', 'nightMode', 'Alleen rood en amber.'),
        toggle('Vergrendelde oefeningen tonen', 'showLocked'),
        defaultHold()),
      weights(),
      extra);
  }
  render();
  return { root, extra, render };
}
