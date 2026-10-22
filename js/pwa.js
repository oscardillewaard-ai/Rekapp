// Installeren, service worker en opslagstatus (§7). Browser-API's, geen
// rekenwerk.

// Draait de app als geïnstalleerde webapp (beginscherm)?
export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// Platform voor de installatiestappen.
export function platform() {
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (iOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'anders';
}

// Chrome (Android) biedt installeren aan via beforeinstallprompt.
let deferredPrompt = null;
const installListeners = new Set();
export function watchInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    for (const f of installListeners) f();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    for (const f of installListeners) f();
  });
}
export const canPromptInstall = () => deferredPrompt !== null;
export function onInstallChange(f) {
  installListeners.add(f);
  return () => installListeners.delete(f);
}
export async function promptInstall() {
  if (!deferredPrompt) return 'niet beschikbaar';
  const e = deferredPrompt;
  deferredPrompt = null;
  e.prompt();
  const { outcome } = await e.userChoice;
  for (const f of installListeners) f();
  return outcome;
}

// Service worker registreren. onUpdate(apply) wordt aangeroepen zodra er een
// nieuwe versie klaarstaat; apply() activeert die en herlaadt de pagina.
export async function registerServiceWorker(onUpdate) {
  if (!('serviceWorker' in navigator)) return null;
  let reg;
  try {
    reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
  } catch {
    return null;
  }
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Alleen herladen na een bewuste update, niet bij de allereerste installatie.
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
  const offer = (worker) => {
    if (!worker || !navigator.serviceWorker.controller) return; // eerste installatie: niets te melden
    onUpdate(() => worker.postMessage('skipWaiting'));
  };
  if (reg.waiting) offer(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    w?.addEventListener('statechange', () => { if (w.state === 'installed') offer(w); });
  });
  // Bij terugkomen in de app opnieuw kijken of er een update is.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  return reg;
}

// Opslagstatus (§6.11): blijvend opgeslagen of niet.
export async function storageStatus() {
  try {
    if (!navigator.storage?.persisted) return { supported: false, persisted: false };
    const persisted = await navigator.storage.persisted();
    const est = navigator.storage.estimate ? await navigator.storage.estimate() : null;
    return { supported: true, persisted, usage: est?.usage ?? null };
  } catch {
    return { supported: false, persisted: false };
  }
}
