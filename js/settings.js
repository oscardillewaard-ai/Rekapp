// Instellingen (§6.11) met hun standaardwaarden. Puur.

export const DEFAULT_SETTINGS = {
  soundInSilentMode: true, // geluid ook in stille modus (iOS: audioSession 'playback')
  mixWithMusic: false, // mixen met muziek (iOS: audioSession 'ambient')
  voiceOn: true,
  voiceURI: null, // null = eerste Nederlandse stem
  beepVolume: 0.7, // 0–1
  autoPauseOnHide: true, // uit = doorlopen op de achtergrond
  nightMode: false,
  sideSwitchSec: 5,
  defaultStaticHoldSec: 45,
  largeFigure: false, // groot stokfiguur in de speler (keuze Oscar), de ring kleiner
  figure3d: false, // alle stokfiguren schuin in 3D (keuze Oscar); op de kaart ronddraaien
  kneeFeatures: false, // kniescore K, kniecheck, opvlammingsmodus en knie-info (keuze Oscar: standaard uit)
  weights: { B: 25, K: 25, D: 20, R: 15, P: 15 }, // procenten, som 100
  reminders: { morning: null, evening: null },
  lastExportAt: null, // ms; de laatste JSON-export
  exportReminderSnoozedAt: null, // ms; "Later" bij de exportherinnering
};

// Opgeslagen instellingen aanvullen met standaardwaarden (nieuwe velden in een
// latere versie krijgen zo vanzelf hun standaard).
export function withDefaults(stored) {
  const s = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  s.weights = { ...DEFAULT_SETTINGS.weights, ...(stored?.weights ?? {}) };
  s.reminders = { ...DEFAULT_SETTINGS.reminders, ...(stored?.reminders ?? {}) };
  return s;
}

// Kniefuncties stonden er vóór deze instelling altijd aan. Wie toen al
// kniechecks deed of een opvlamming heeft (ook een kniestatus die niet te
// lezen is), houdt ze aan; een nieuwe installatie begint zonder.
export function migrateKneeFeatures(stored, knee) {
  if (!stored || 'kneeFeatures' in stored) return null;
  return knee.unknown || knee.flare.active || knee.checks.length > 0 ? true : null;
}

// Weging voor de sterren: zonder Kniefuncties telt K niet mee (de andere
// vier naar verhouding, zie rate in library.js).
export function ratingWeights(settings) {
  return settings.kneeFeatures ? settings.weights : { ...settings.weights, K: 0 };
}

// iOS audiosessie (§7): mixen met muziek → 'ambient'; geluid in stille modus →
// 'playback'; anders de standaard 'auto'.
export function audioSessionType(settings) {
  if (settings.mixWithMusic) return 'ambient';
  if (settings.soundInSilentMode) return 'playback';
  return 'auto';
}
