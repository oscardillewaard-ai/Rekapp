// Geluid en spraak voor de speler (§7). Alleen in de browser.
//
// iOS: Web Audio is standaard "ambient" en de stille schakelaar dempt het.
// navigator.audioSession.type = 'playback' maakt het hoorbaar (vanaf iOS 17);
// dat moet vóór het aanmaken van de AudioContext, bij de eerste tik.
import { audioSessionType } from './settings.js';

const TONES = {
  start: [[880, 0.16]],
  countdown: [[660, 0.1]],
  halfway: [[520, 0.08, 0.5]], // zacht
  switch: [[740, 0.12], [988, 0.16]],
  done: [[660, 0.14], [880, 0.14], [1175, 0.3]],
  test: [[880, 0.2]],
};

export function createAudio() {
  let ctx = null;
  let settings = null;
  let voice = null;
  let voicesLoaded = false;
  const listeners = new Set();

  function pickVoice() {
    if (typeof speechSynthesis === 'undefined') { voice = null; return; }
    const voices = speechSynthesis.getVoices();
    voicesLoaded = voicesLoaded || voices.length > 0;
    const nl = voices.filter((v) => (v.lang || '').toLowerCase().replace('_', '-').startsWith('nl'));
    voice = nl.find((v) => v.voiceURI === settings?.voiceURI) ?? nl[0] ?? null;
    for (const fn of listeners) fn();
  }
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
    pickVoice();
  }

  return {
    configure(next) {
      settings = next;
      pickVoice();
    },

    // In de click-handler van Start (gebruikersgebaar): audiosessie zetten,
    // AudioContext maken en hervatten.
    unlock() {
      try {
        if ('audioSession' in navigator) navigator.audioSession.type = audioSessionType(settings);
      } catch { /* oudere iOS: niet beschikbaar */ }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!ctx && AC) ctx = new AC();
      ctx?.resume?.();
    },

    beep(kind) {
      if (!ctx || !settings || settings.beepVolume <= 0) return;
      let t = ctx.currentTime + 0.01;
      for (const [freq, dur, rel = 1] of TONES[kind] ?? TONES.start) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const vol = Math.max(0.0001, settings.beepVolume * rel * 0.5);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
        t += dur + 0.04;
      }
    },

    // Spreekt tekst uit met een Nederlandse stem. Geen stem of spraak uit:
    // false (dan alleen piepjes).
    speak(text) {
      if (!text || !settings?.voiceOn || !voice || typeof speechSynthesis === 'undefined') return false;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 1;
      speechSynthesis.speak(u);
      return true;
    },

    stopSpeech() {
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    },

    hasDutchVoice: () => voice !== null,
    voicesKnown: () => voicesLoaded,
    dutchVoices() {
      if (typeof speechSynthesis === 'undefined') return [];
      return speechSynthesis.getVoices().filter((v) => (v.lang || '').toLowerCase().replace('_', '-').startsWith('nl'));
    },
    onVoicesChanged(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

// Trillen kan alleen op Android; iOS heeft geen navigator.vibrate (§7).
export function vibrate(pattern) {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch { /* genegeerd */ }
  }
}
