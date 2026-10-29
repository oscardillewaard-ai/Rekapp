// Instellingen (§6.11). Elke wijziging wordt direct opgeslagen. Latere
// mijlpalen voegen export/import, herinneringen en opslag toe.
import { h, fill, preserveFocus } from './dom.js';
import { icon } from './graphics.js';
import { DEFAULT_SETTINGS } from '../settings.js';
import { KNEE } from '../texts.js';
import { formatDay } from '../format.js';
import { canUndoFlare } from '../knee.js';

const LETTER_NAMES = { B: 'Bewijs', K: 'Knieveiligheid', D: 'Doelgerichtheid', R: 'Relevantie', P: 'Praktisch' };

export function createSettingsScreen({ audio, getSettings, update, knee, data, pwa }) {
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
  // sterren. Zonder Kniefuncties staat K er niet bij: B, D, R en P tellen
  // naar verhouding, en de verborgen K vangt het verschil op, zodat de
  // opgeslagen weging samen 100 % blijft.
  let draft = null;
  function weights() {
    const kneeOn = getSettings().kneeFeatures;
    const letters = Object.keys(LETTER_NAMES).filter((k) => kneeOn || k !== 'K');
    draft ??= { ...getSettings().weights };
    const wrap = h('section', { class: 'section' });
    const paint = () => {
      const sum = letters.reduce((a, k) => a + draft[k], 0);
      const set = (k, d) => {
        const v = Math.min(100, Math.max(0, draft[k] + d));
        if (kneeOn) {
          draft = { ...draft, [k]: v };
          const total = Object.values(draft).reduce((a, b) => a + b, 0);
          if (total === 100) update({ weights: { ...draft } });
        } else {
          const visible = sum - draft[k] + v;
          if (visible > 100 || visible <= 0) return;
          draft = { ...draft, [k]: v, K: 100 - visible };
          update({ weights: { ...draft } });
        }
        preserveFocus(wrap, paint);
      };
      const status = kneeOn
        ? h('p', { class: sum === 100 ? 'note' : 'warn-bar', role: 'status' },
          sum === 100 ? 'Som: 100 %.' : `Som: ${sum} %. Pas aan tot 100 %; tot dan blijft de vorige weging gelden.`)
        : h('p', { class: 'note', role: 'status' }, `Samen ${sum} %; de sterren rekenen dat naar verhouding om naar 100 %.`);
      fill(wrap, 
        h('h2', null, 'Weging aanpassen'),
        h('p', { class: 'note' }, 'Verandert alleen de sterren die je ziet.'),
        ...letters.map((k) => h('div', { class: 'stepper', role: 'group', 'aria-label': `${k} ${LETTER_NAMES[k]}` },
          h('span', { class: 'stepper-label' }, `${k} · ${LETTER_NAMES[k]}`),
          h('button', { class: 'btn icon', type: 'button', 'aria-label': `${LETTER_NAMES[k]} lager`, onclick: () => set(k, -5) }, '−'),
          h('output', null, `${draft[k]}%`),
          h('button', { class: 'btn icon', type: 'button', 'aria-label': `${LETTER_NAMES[k]} hoger`, onclick: () => set(k, 5) }, '+'))),
        status,
        h('button', {
          class: 'btn', type: 'button',
          onclick: () => { draft = { ...DEFAULT_SETTINGS.weights }; update({ weights: { ...draft } }); preserveFocus(wrap, paint); },
        }, kneeOn ? 'terug naar standaard 25/25/20/15/15' : 'terug naar standaard 25/20/15/15'));
    };
    paint();
    return wrap;
  }

  // Knie (§6.11): de schakelaar Kniefuncties (standaard uit), en met
  // Kniefuncties aan de opvlammingsmodus handmatig aan, en binnen 24 uur terug
  // (per ongeluk aangezet). Ontgrendelingen resetten vervalt met het knieslot.
  function kneeSection() {
    const on = getSettings().kneeFeatures;
    const input = h('input', { type: 'checkbox', role: 'switch' });
    input.checked = on;
    input.addEventListener('change', () => knee.setFeatures(input.checked));
    const sw = h('label', { class: 'switch' },
      h('span', null, KNEE.featuresLabel, h('small', { class: 'hint' }, KNEE.featuresHint)), input);
    if (!on) return h('section', { class: 'section' }, h('h2', null, 'Knie'), sw);
    const state = knee.get();
    const flare = state.unknown
      ? h('p', { class: 'note' }, 'Je kniestatus kon niet worden gelezen; voor de zekerheid geldt de opvlammingsmodus.')
      : state.flare.active
        ? h('p', null, `Opvlammingsmodus staat aan sinds ${formatDay(state.flare.since)}. Hij gaat uit na 7 dagen op rij een dagelijkse kniecheck van ≤2/10; de app vraagt het je dan.`)
        : h('button', { class: 'btn', type: 'button', onclick: () => knee.askFlare() }, KNEE.flareButton);
    const undo = !state.unknown && canUndoFlare(state, Date.now())
      ? h('button', { class: 'btn', type: 'button', onclick: () => knee.undoFlare() }, 'Per ongeluk aangezet: terugdraaien')
      : null;
    return h('section', { class: 'section' }, h('h2', null, 'Knie'), sw, flare, undo);
  }

  // Herinneringen (§7): geen push zonder server; een .ics met dagelijkse
  // herhaling en alarm voor je agenda.
  function reminders() {
    const r = getSettings().reminders;
    const row = (key, label, fallback) => {
      const input = h('input', { type: 'time', value: r[key] ?? fallback, 'aria-label': `${label}: tijdstip` });
      input.addEventListener('change', () => { if (input.value) update({ reminders: { ...getSettings().reminders, [key]: input.value } }); });
      return h('div', { class: 'reminder-row' },
        h('label', { class: 'field' }, h('span', null, label), input),
        h('button', {
          class: 'btn', type: 'button',
          onclick: () => {
            const time = input.value || fallback;
            update({ reminders: { ...getSettings().reminders, [key]: time } });
            pwa.downloadReminder(key, time);
          },
        }, 'Herinnering in agenda'));
    };
    return h('section', { class: 'section' },
      h('h2', null, 'Herinneringen'),
      h('p', { class: 'note' }, 'De app kan zonder server geen meldingen sturen. Zet daarom een dagelijkse herinnering in je agenda: kies een tijd en open het bestand dat de knop maakt.'),
      row('morning', 'Ochtend', '07:30'),
      row('evening', 'Avond', '20:30'));
  }

  // Opslagstatus (§6.11, §7).
  function storage() {
    const out = h('p', { role: 'status' }, 'Opslag controleren…');
    const btn = h('button', { class: 'btn', type: 'button', hidden: true }, 'Blijvend opslaan aanvragen');
    const show = async () => {
      const st = await pwa.storageStatus();
      if (!data.canImport()) out.textContent = 'Opslaan lukt niet in deze browser (bv. een privévenster): er wordt niets bewaard.';
      else if (!st.supported) out.textContent = 'Deze browser zegt niet of je gegevens blijvend zijn opgeslagen. Exporteer regelmatig.';
      else if (st.persisted) out.textContent = 'Blijvend opgeslagen: de browser wist je gegevens niet bij ruimtegebrek.';
      else out.textContent = `Niet blijvend opgeslagen: de browser kan je gegevens wissen${pwa.isStandalone() ? '' : ', zeker in een gewone tab. Installeer de app'}. Exporteer regelmatig.`;
      btn.hidden = !st.supported || st.persisted || !data.canImport();
    };
    btn.addEventListener('click', async () => { await pwa.requestPersistence(); show(); });
    show();
    return h('section', { class: 'section' }, h('h2', null, 'Opslag'), out, btn,
      h('p', null, h('a', { href: '#/installeren' }, 'Installeren op je beginscherm')));
  }

  // Gegevens (§6.9, §6.11): laatste export, exporteren en importeren.
  function dataSection() {
    const last = getSettings().lastExportAt;
    const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
    file.addEventListener('change', () => { if (file.files[0]) data.importFile(file.files[0]); file.value = ''; });
    return h('section', { class: 'section' },
      h('h2', null, 'Gegevens'),
      h('p', null, `Laatste export: ${last ? formatDay(last) : 'nog nooit'}.`),
      h('p', { class: 'note' }, 'Je gegevens staan alleen op dit toestel. Een export (JSON) is je back-up; importeren zet alles terug. De CSV-bestanden openen in Excel.'),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => data.openExport() }, 'Exporteren'),
        h('button', { class: 'btn', type: 'button', disabled: !data.canImport(), onclick: () => file.click() }, 'Importeren')),
      file);
  }

  // keepDraft: bij een verversing (bv. na een export) blijft een weging die
  // nog niet op 100 % staat, staan.
  function render({ keepDraft = false } = {}) {
    if (!keepDraft) draft = null;
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
        toggle('3D-figuren', 'figure3d', 'Alle stokfiguren schuin in 3D. Op de oefeningkaart draai je een figuur rond door er met je vinger opzij over te vegen.'),
        defaultHold()),
      weights(),
      kneeSection(),
      reminders(),
      dataSection(),
      storage(),
      extra);
  }
  render();
  return { root, extra, render };
}
