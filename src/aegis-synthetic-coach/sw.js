const CACHE_NAME = 'aegis-synthetic-static-v2';
const ASSETS = Object.freeze([
  './', './index.html', './styles.css', './vault.css', './fixtures.mjs',
  './coach-engine.mjs', './app.mjs', './vault-core.mjs', './vault-browser.mjs',
  './vault-ui.mjs', './sw-status.mjs', './sw.js'
]);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(
    names.filter((name) => name.startsWith('aegis-synthetic-static-') && name !== CACHE_NAME).map((name) => caches.delete(name))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const allowed = new Set(ASSETS.map((asset) => new URL(asset, self.registration.scope).pathname));
  if (!allowed.has(url.pathname)) return;
  event.respondWith(caches.match(event.request).then((response) => response || Response.error()));
});
