// Scherm aan houden tijdens een routine (§7). Op iOS werkt de Screen Wake Lock
// in een beginscherm-app pas vanaf 18.4; lukt het niet, dan toont de speler
// de melding "Zet automatisch vergrendelen tijdelijk uit".

export function createWakeLock(onStatus) {
  let lock = null;
  let wanted = false;

  async function acquire() {
    if (!('wakeLock' in navigator)) { onStatus('niet-ondersteund'); return; }
    try {
      const s = await navigator.wakeLock.request('screen');
      // Intussen gestopt, of al een lock: deze meteen weer loslaten.
      if (!wanted || lock) { s.release().catch(() => {}); return; }
      lock = s;
      s.addEventListener('release', () => { if (lock === s) lock = null; });
      onStatus('aan');
    } catch {
      onStatus('mislukt');
    }
  }

  // Opnieuw aanvragen na terugkeer naar de app (de lock vervalt bij wisselen).
  document.addEventListener('visibilitychange', () => {
    if (wanted && !lock && document.visibilityState === 'visible') acquire();
  });

  return {
    request() { wanted = true; return acquire(); },
    release() {
      wanted = false;
      lock?.release().catch(() => {});
      lock = null;
    },
  };
}
