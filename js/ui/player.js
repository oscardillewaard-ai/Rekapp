// Speler (§6.8): timeline afspelen met timer, kantwissels, geluid, spraak en
// wake lock; daarna het afrondscherm (§6.9). De tijd komt uit tijdstempels
// (engine.js); dit bestand tekent alleen en zet gebeurtenissen om in geluid.
import { h, fill } from './dom.js';
import { icon, bodyMap, positionIcon } from './graphics.js';
import { compileRoutine } from '../timeline.js';
import {
  createPlayer, start, tick, pause, resume, next, back, requestStop, cancelStop, confirmStop, view, sessionStatus, activeSec,
} from '../engine.js';
import { speechFor, displayFor, nextExerciseAfter } from '../cues.js';
import { buildSession, localTimeZone } from '../session.js';
import { formatDuration } from '../format.js';
import { BREATHING } from '../texts.js';
import { vibrate } from '../audio.js';
import { createWakeLock } from '../wakelock.js';
import { createFigure, hasFigure } from './figure.js';

const WORKISH = new Set(['work', 'contract', 'relax']);

// Resterende tijd in hele seconden, naar boven afgerond. Een segment duurt
// hoogstens 180 s, dus nooit meer dan drie cijfers (≥ 96 px, §8.3). De spraak
// noemt de duur ook in seconden.
function clock(ms) {
  return String(Math.max(0, Math.ceil(ms / 1000)));
}
const STARTUP_GUARD_MS = 400; // dubbel tikken op Start pauzeert niet meteen

export function createPlayerScreen({ lib, audio, getSettings, onSave, onFinished }) {
  const root = h('section', { class: 'player', 'aria-label': 'Speler' });
  let state = null;
  let routine = null;
  let raf = 0;
  let shownIndex = -1;
  let figure = null; // stokfiguur van het huidige segment
  let wakeStatus = 'onbekend';
  let finishing = false;
  let shownPaused = null;
  let shownTotal = '';
  let beganAt = 0;
  let sessionId = null;

  const wake = createWakeLock((st) => { wakeStatus = st; renderBanners(); });

  // ---------- Elementen ----------
  const title = h('div', { class: 'player-title' });
  const totalLeft = h('div', { class: 'player-total', 'aria-hidden': 'true' });
  const banners = h('div', { class: 'player-banners' });
  const visual = h('button', { class: 'player-visual', type: 'button', 'aria-label': 'Uitleg van de oefening', onclick: () => openDetail() });
  const live = h('div', { class: 'player-live', 'aria-live': 'polite' });
  const exName = h('h1', { class: 'player-name', tabindex: '-1' });
  const side = h('div', { class: 'player-side' });
  const label = h('div', { class: 'player-label' });
  live.append(exName, side, label);
  // Resterende tijd: grote cijfers met een balk eronder die afloopt, in de
  // kleur van de fase (werk, voorbereiden/wisselen/rust, aanspannen).
  const digits = h('div', { class: 'player-digits', role: 'timer', 'aria-live': 'off' });
  const barFill = h('i', { class: 'player-bar-fill' });
  const timer = h('div', { class: 'player-timer' }, digits, h('div', { class: 'player-bar', 'aria-hidden': 'true' }, barFill));
  const cue = h('p', { class: 'player-cue' });
  const upNext = h('p', { class: 'player-next' });

  const btnBack = h('button', { class: 'btn ctrl', type: 'button', 'aria-label': 'Terug naar het begin van deze oefening', onclick: () => act(back) }, icon('prev'));
  const btnPlay = h('button', { class: 'btn ctrl primary', type: 'button', onclick: () => togglePause() });
  const btnNext = h('button', { class: 'btn ctrl', type: 'button', 'aria-label': 'Volgende oefening', onclick: () => act(next) }, icon('next'));
  const btnStop = h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Stoppen', onclick: () => askStop() }, icon('cross'));
  const flash = h('div', { class: 'flash', 'aria-hidden': 'true' });

  const confirm = h('dialog', { class: 'sheet', 'aria-labelledby': 'stop-title' },
    h('div', { class: 'sheet-body' },
      h('h2', { id: 'stop-title' }, 'Stoppen?'),
      h('p', null, 'Wat je al gedaan hebt, wordt opgeslagen in je logboek.')),
    h('div', { class: 'sheet-foot' },
      h('button', { class: 'btn', type: 'button', onclick: () => { confirm.close(); act(cancelStop); } }, 'Doorgaan'),
      h('button', { class: 'btn danger', type: 'button', onclick: () => { confirm.close(); act(confirmStop); } }, 'Stoppen')));
  confirm.addEventListener('cancel', (e) => { e.preventDefault(); confirm.close(); act(cancelStop); });

  const detail = h('dialog', { class: 'sheet', 'aria-labelledby': 'detail-title' });
  detail.addEventListener('click', (e) => { if (e.target === detail) detail.close(); });

  const runView = h('div', { class: 'player-run' },
    h('header', { class: 'player-head' }, btnStop, title, totalLeft),
    banners,
    // Het stokfiguur bovenaan vult de ruimte die overblijft (variant A, keuze
    // Oscar); de ademcue staat in het uitlegblad onder een tik op het figuur.
    h('div', { class: 'player-main' }, visual, live, timer, cue, upNext),
    h('div', { class: 'player-controls' }, btnBack, btnPlay, btnNext));
  const finishView = h('div', { class: 'player-finish', hidden: true });
  root.append(runView, finishView, flash, confirm, detail);

  // ---------- Afspelen ----------

  // Aangeroepen in de click-handler van Start (gebruikersgebaar): audio is dan
  // al ontgrendeld, en de eerste spraak gebeurt nog binnen dat gebaar.
  function begin(playable, meta) {
    if (state && ['running', 'paused', 'confirm'].includes(state.status)) return; // loopt al
    const settings = getSettings();
    routine = meta;
    const { segments, totalSec } = compileRoutine(playable, lib.exercises, { timing: lib.meta.timing, sideSwitchSec: settings.sideSwitchSec });
    routine.plannedSec = totalSec;
    state = createPlayer(segments);
    finishing = false;
    shownIndex = -1;
    shownPaused = null;
    shownTotal = '';
    sessionId = null;
    beganAt = performance.now();
    runView.hidden = false;
    finishView.hidden = true;
    const now = performance.now();
    const r = start(state, now);
    state = r.state;
    state.wallStart = Date.now() - (performance.now() - now);
    title.textContent = routine.name;
    handle(r.events);
    wake.request();
    renderBanners();
    loop();
  }

  function loop() {
    cancelAnimationFrame(raf);
    const frame = () => {
      if (!state) return;
      const r = tick(state, performance.now());
      state = r.state;
      handle(r.events);
      render();
      if (state.status === 'running' || state.status === 'paused' || state.status === 'confirm') raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  function act(fn) {
    if (!state) return;
    if (fn !== cancelStop && fn !== confirmStop && performance.now() - beganAt < STARTUP_GUARD_MS) return;
    const r = fn(state, performance.now());
    state = r.state;
    handle(r.events);
    render();
    if (state.status === 'running' || state.status === 'paused') loop();
  }

  function togglePause() {
    if (!state) return;
    if (state.status === 'running') {
      audio.stopSpeech();
      act(pause);
    } else if (state.status === 'paused') {
      audio.unlock();
      // Een segment dat nog niet begonnen was (na ⏭/⏮ in pauze) wordt bij
      // hervatten alsnog aangekondigd.
      const seg = state.segments[state.segmentIndex];
      const fresh = state.pausedRemainingMs === seg.durationSec * 1000;
      act(resume);
      if (fresh && state.status === 'running') announce(state.segmentIndex, false);
    }
  }

  function askStop() {
    if (!state || !['running', 'paused'].includes(state.status)) return;
    audio.stopSpeech();
    const before = beganAt;
    beganAt = 0; // stoppen mag altijd, ook vlak na de start
    act(requestStop);
    beganAt = before;
    if (state.status === 'confirm') confirm.showModal();
  }

  // Begin van een segment aankondigen: piep, spraak, en bij een kantwissel ook
  // trilling (Android) en een flits. Na een inhaalslag alleen kant en naam,
  // zonder startpiep en zonder de volle duur.
  function announce(index, catchUp) {
    const seg = state.segments[index];
    if (!catchUp && WORKISH.has(seg.kind)) audio.beep('start');
    if (seg.kind === 'switch' && !catchUp) {
      audio.beep('switch');
      vibrate(150);
      doFlash();
    }
    audio.speak(speechFor(state.segments, index, lib.exercises, { catchUp }));
  }

  // Gebeurtenissen → geluid, spraak, trilling, flits. Alleen als de timer
  // loopt (⏭/⏮ in pauze kondigt pas bij hervatten aan). Bij een inhaalslag
  // (scherm was verborgen) alleen het laatste segment.
  function handle(events) {
    const segEvents = events.filter((e) => e.type === 'segment');
    const last = segEvents[segEvents.length - 1];
    if (last && state.status === 'running') announce(last.index, segEvents.length > 1);
    for (const e of events) {
      if (e.type === 'halfway') audio.beep('halfway');
      if (e.type === 'countdown') audio.beep('countdown');
      if (e.type === 'done') {
        audio.beep('done');
        vibrate([200, 100, 200]);
      }
    }
    if (events.some((e) => e.type === 'done' || e.type === 'stopped')) finish();
  }

  function doFlash() {
    flash.classList.remove('on');
    void flash.offsetWidth; // animatie opnieuw starten
    flash.classList.add('on');
  }

  // ---------- Tekenen ----------

  function renderBanners() {
    const items = [];
    if (state && (wakeStatus === 'niet-ondersteund' || wakeStatus === 'mislukt')) {
      items.push(h('p', { class: 'warn-bar' }, 'Zet automatisch vergrendelen tijdelijk uit'));
    }
    const settings = getSettings();
    // Geen (Nederlandse) stem, of helemaal geen spraak: alleen piepjes plus
    // deze melding (§7, §11.3).
    if (state && settings.voiceOn && !audio.hasDutchVoice()) {
      items.push(h('p', { class: 'warn-bar' }, 'Geen Nederlandse stem gevonden. Je hoort alleen piepjes.'));
    }
    fill(banners, ...items);
  }

  function render() {
    if (!state || state.status === 'done' || state.status === 'stopped') return;
    const now = performance.now();
    const v = view(state, now);
    const idx = state.segmentIndex;
    if (idx !== shownIndex) {
      shownIndex = idx;
      const d = displayFor(state.segments, idx, lib.exercises);
      const ex = d.exercise;
      exName.textContent = ex?.name ?? '';
      side.textContent = d.sideLabel;
      label.textContent = d.label;
      // Stokfiguur (fase 2, proef) in plaats van het positie-icoon; hij
      // beweegt mee met de timer en staat dus ook stil bij pauze.
      figure = ex && hasFigure(ex.id) ? createFigure(ex.id, 'fig-lg', { mode3d: getSettings().figure3d }) : null;
      fill(visual,
        ex ? bodyMap(ex.targets, { crop: 'mini', aspect: 72 / 104, className: 'mini-lg' }) : null,
        figure ? figure.el : ex ? positionIcon(ex.position, 'pos-lg') : null);
      cue.textContent = ex ? ex.cues[0] : '';
      const after = nextExerciseAfter(state.segments, idx, lib.exercises);
      upNext.textContent = after && after !== ex ? `Volgende: ${after.name}` : '';
      const step = state.segments[idx].stepIndex;
      const steps = new Set(state.segments.filter((x) => x.stepIndex !== null).map((x) => x.stepIndex)).size;
      title.textContent = `${routine.name} · ${step === null ? 'start' : `${step + 1}/${steps}`}`;
      root.dataset.kind = state.segments[idx].kind;
    }
    const seg = v.segment;
    figure?.update(seg.kind, seg.durationSec * 1000 - v.remainingMs, { round: seg.round ?? 1 });
    const frac = seg.durationSec ? Math.min(1, Math.max(0, v.remainingMs / (seg.durationSec * 1000))) : 0;
    barFill.style.transform = `scaleX(${frac.toFixed(4)})`;
    const text = clock(v.remainingMs);
    if (digits.textContent !== text) digits.textContent = text;
    const total = formatDuration(Math.ceil(v.totalRemainingMs / 1000));
    if (total !== shownTotal) { shownTotal = total; totalLeft.textContent = total; }
    // Alleen bij een wissel opnieuw tekenen (anders vallen klikken op het icoon weg).
    const paused = state.status !== 'running';
    if (paused !== shownPaused) {
      shownPaused = paused;
      btnPlay.replaceChildren(icon(paused ? 'play' : 'pause'));
      btnPlay.setAttribute('aria-label', paused ? 'Hervatten' : 'Pauze');
      root.classList.toggle('paused', paused);
    }
  }

  // Tik op de tekening: uitleg, de timer loopt door.
  function openDetail() {
    const d = state ? displayFor(state.segments, state.segmentIndex, lib.exercises) : null;
    const ex = d?.exercise;
    if (!ex) return;
    fill(detail, 
      h('div', { class: 'sheet-body' },
        h('div', { class: 'sheet-head' }, h('h2', { id: 'detail-title' }, ex.name)),
        bodyMap(ex.targets, { className: 'large' }),
        h('ol', { class: 'cues' }, ex.cues.map((c) => h('li', null, c))),
        h('p', null, h('strong', null, 'Ademhaling: '), BREATHING[ex.type]),
        getSettings().kneeFeatures ? h('p', null, h('strong', null, 'Knie: '), `max ${ex.kneeFlexionMaxDeg}°. ${ex.pfpsNote}`) : null,
        h('p', null, h('strong', null, 'Regressie: '), ex.regression),
        h('p', null, h('strong', null, 'Progressie: '), ex.progression)),
      h('div', { class: 'sheet-foot' }, h('button', { class: 'btn primary', type: 'button', onclick: () => detail.close() }, 'Sluiten')));
    detail.showModal();
  }

  // ---------- Afronden (§6.9) ----------

  function finish() {
    if (finishing) return;
    finishing = true;
    cancelAnimationFrame(raf);
    wake.release();
    audio.stopSpeech();
    if (confirm.open) confirm.close();
    if (detail.open) detail.close();
    const status = sessionStatus(state);
    const run = {
      startedAtMs: state.wallStart,
      // performance.now() staat stil als het toestel slaapt: de eindtijd komt
      // daarom van de gewone klok.
      endedAtMs: Date.now() - (performance.now() - state.endedAt),
      plannedSec: routine.plannedSec,
      activeSec: activeSec(state),
      status,
      segmentsDone: state.segmentsDone,
    };
    // Standaard op de cue "rek 5–6/10".
    const intensity = slider('Rekintensiteit', 5);
    const save = h('button', { class: 'btn primary', type: 'button' }, 'Opslaan');
    // Kniepijn tijdens alleen met Kniefuncties (instelling).
    const knee = getSettings().kneeFeatures ? slider('Kniepijn tijdens', 0) : null;
    const notes = h('textarea', { rows: 3, 'aria-label': 'Notitie', placeholder: 'Notitie (optioneel)' });
    const error = h('p', { class: 'warn-bar', role: 'alert', hidden: true });
    const showError = (e) => {
      error.hidden = false;
      error.textContent = `Opslaan is niet gelukt: ${e?.message ?? e}`;
    };
    // De sessie staat meteen in het logboek (DONE → LOG, §6.8.2), ook als de
    // app nu wordt afgesloten. Opslaan vult intensiteit, kniepijn en notitie aan.
    sessionId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const record = (finishValues) => buildSession({ id: sessionId, tz: localTimeZone(), routine, run, finish: finishValues });
    onSave(record({ stretchIntensity: null, kneePainDuring: null, notes: '' })).catch(showError);
    save.addEventListener('click', async () => {
      save.disabled = true;
      try {
        await onSave(record({ stretchIntensity: intensity.value(), kneePainDuring: knee ? knee.value() : null, notes: notes.value.trim() }));
        state = null;
        finishing = false;
        onFinished();
      } catch (e) {
        save.disabled = false;
        showError(e);
      }
    });
    fill(finishView, 
      h('div', { class: 'screen' },
        h('header', { class: 'card-head' },
          h('h1', { tabindex: '-1' }, status === 'voltooid' ? 'Klaar!' : 'Gestopt'),
          h('p', { class: 'evidence' }, `${routine.name} · ${status} · actief ${formatDuration(run.activeSec)} van ${formatDuration(run.plannedSec)}`)),
        h('section', { class: 'section' }, intensity.el, knee?.el, notes),
        error),
      h('div', { class: 'toolbar' }, save));
    runView.hidden = true;
    finishView.hidden = false;
    finishView.querySelector('h1').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function slider(text, initial) {
    const out = h('output', null, String(initial));
    const input = h('input', { type: 'range', min: 0, max: 10, step: 1, value: initial, 'aria-label': `${text} (0–10)` });
    const paint = () => input.style.setProperty('--pct', `${input.value * 10}%`);
    paint();
    input.addEventListener('input', () => { out.textContent = input.value; paint(); });
    return {
      el: h('label', { class: 'slider' }, h('span', null, `${text} (0–10)`, out), input),
      value: () => Number(input.value),
    };
  }

  // ---------- Buitenwereld ----------

  audio.onVoicesChanged(renderBanners);

  document.addEventListener('visibilitychange', () => {
    if (!state) return;
    if (document.visibilityState === 'hidden' && state.status === 'running' && getSettings().autoPauseOnHide) {
      audio.stopSpeech();
      act(pause);
    }
    if (document.visibilityState === 'visible' && (state.status === 'running' || state.status === 'paused')) loop();
  });

  return {
    root,
    begin,
    askStop,
    // Er loopt een routine (ook gepauzeerd of bij de stopvraag).
    isActive: () => state !== null && ['running', 'paused', 'confirm'].includes(state.status),
    // Het afrondscherm staat open; de sessie is dan al opgeslagen.
    isFinishing: () => state !== null && finishing,
    // Weg van het afrondscherm zonder Opslaan: de sessie blijft zoals hij al
    // bewaard is (zonder intensiteit en kniepijn).
    leave() { state = null; finishing = false; },
    focus: () => (finishing ? finishView : runView).querySelector('h1')?.focus({ preventScroll: true }),
  };
}
