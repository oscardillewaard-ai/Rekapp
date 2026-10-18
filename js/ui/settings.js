// Instellingen (§6.11). Elke wijziging wordt direct opgeslagen. Latere
// mijlpalen voegen weging, opvlamming, export/import en opslag toe.
import { h, clear } from './dom.js';
import { icon } from './graphics.js';

export function createSettingsScreen({ audio, getSettings, update }) {
  const root = h('section', { class: 'screen', 'aria-labelledby': 'settings-title' });
  const extra = h('div'); // secties van latere mijlpalen

  function toggle(label, key, hint) {
    const input = h('input', { type: 'checkbox', role: 'switch' });
    input.checked = Boolean(getSettings()[key]);
    input.addEventListener('change', () => update({ [key]: input.checked }));
    return h('label', { class: 'switch' }, h('span', null, label, hint ? h('small', { class: 'hint' }, hint) : null), input);
  }

  function voiceSelect() {
    const wrap = h('div');
    const fill = () => {
      const voices = audio.dutchVoices();
      if (!voices.length) {
        clear(wrap).append(h('p', { class: 'note' }, 'Geen Nederlandse stem gevonden op dit toestel. Je hoort alleen piepjes.'));
        return;
      }
      const select = h('select', { 'aria-label': 'Stem' },
        h('option', { value: '' }, 'Automatisch (eerste Nederlandse stem)'),
        voices.map((v) => h('option', { value: v.voiceURI }, `${v.name} (${v.lang})`)));
      select.value = getSettings().voiceURI ?? '';
      select.addEventListener('change', () => update({ voiceURI: select.value || null }));
      clear(wrap).append(h('label', { class: 'field' }, h('span', null, 'Stem'), select));
    };
    fill();
    audio.onVoicesChanged(fill);
    return wrap;
  }

  function volume() {
    const s = getSettings();
    const out = h('output', null, `${Math.round(s.beepVolume * 100)}%`);
    const input = h('input', { type: 'range', min: 0, max: 100, step: 10, value: Math.round(s.beepVolume * 100), 'aria-label': 'Piepvolume' });
    input.addEventListener('input', () => { out.textContent = `${input.value}%`; });
    input.addEventListener('change', () => update({ beepVolume: Number(input.value) / 100 }));
    return h('label', { class: 'slider' }, h('span', null, 'Piepvolume', out), input);
  }

  function sideSwitch() {
    const select = h('select', { 'aria-label': 'Kantwisselduur' },
      [3, 5, 8, 10].map((n) => h('option', { value: n }, `${n} s`)));
    select.value = String(getSettings().sideSwitchSec);
    select.addEventListener('change', () => update({ sideSwitchSec: Number(select.value) }));
    return h('label', { class: 'field' }, h('span', null, 'Kantwisselduur'), select);
  }

  function render() {
    clear(root).append(
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
        toggle('Vergrendelde oefeningen tonen', 'showLocked')),
      extra);
  }
  render();
  return { root, extra, render };
}
