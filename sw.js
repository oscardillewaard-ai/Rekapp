// Service worker (§8.1): alles wat de app nodig heeft staat vooraf in de
// cache, zodat de app ook zonder netwerk opent en afspeelt. Cache-first; de
// versie zit in de cachenaam. Een nieuwe versie wacht tot de gebruiker
// "Update beschikbaar → herladen" kiest (§11.3).
//
// De lijst en de versie worden bijgewerkt met: node tools/update-sw.mjs
// (tests/sw.test.js controleert dat ze kloppen).

const VERSION = 'v-66cd7053eb';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/audio.js',
  './js/backup.js',
  './js/catalog.js',
  './js/charts.js',
  './js/cues.js',
  './js/dose.js',
  './js/engine.js',
  './js/format.js',
  './js/ics.js',
  './js/knee.js',
  './js/library.js',
  './js/main.js',
  './js/pwa.js',
  './js/routines.js',
  './js/schema.js',
  './js/selftests.js',
  './js/session.js',
  './js/settings.js',
  './js/store.js',
  './js/texts.js',
  './js/timeline.js',
  './js/ui/about.js',
  './js/ui/builder.js',
  './js/ui/dom.js',
  './js/ui/exercise.js',
  './js/ui/graphics.js',
  './js/ui/home.js',
  './js/ui/install.js',
  './js/ui/knee.js',
  './js/ui/library.js',
  './js/ui/log.js',
  './js/ui/more.js',
  './js/ui/player.js',
  './js/ui/routine.js',
  './js/ui/routines.js',
  './js/ui/settings.js',
  './js/ui/tests.js',
  './js/ui/week.js',
  './js/wakelock.js',
  './js/warnings.js',
  './js/week.js',
  './data/library.json',
  './data/library.schema.json',
  './img/body.svg',
  './img/pos/liggend.svg',
  './img/pos/staand.svg',
  './img/pos/stoel.svg',
  './img/pos/vloer.svg',
  './icons/apple-touch-icon-180.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
];

const CACHE = `rekapp-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('rekapp-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// De pagina vraagt dit na "Herladen" bij "Update beschikbaar".
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Pagina's (ook met een #-route of ?-parameter): altijd de app-shell.
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./index.html', { cacheName: CACHE }).then((hit) => hit ?? fetch(req)));
    return;
  }
  event.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then((hit) => hit ?? fetch(req)));
});
