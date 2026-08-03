const CACHE_NAME = 'aegis-champion-local-v1';
const ASSETS = Object.freeze([
  './',
  './index.html',
  './champion.css',
  './champion.mjs',
  './manifest.webmanifest',
  './icon.svg',
  './sw.js',
  '../aegis-synthetic-coach/styles.css',
  '../aegis-synthetic-coach/vault.css',
  '../aegis-synthetic-coach/fixtures.mjs',
  '../aegis-synthetic-coach/coach-engine.mjs',
  '../aegis-synthetic-coach/vault-core.mjs',
  '../aegis-synthetic-coach/vault-browser.mjs',
  '../aegis-synthetic-coach/vault-ui.mjs',
  '../aegis-synthetic-coach/sw-status.mjs'
]);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(
    names
      .filter((name) => name.startsWith('aegis-champion-local-') && name !== CACHE_NAME)
      .map((name) => caches.delete(name))
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
