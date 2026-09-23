const CACHE_NAME = 'afterwake-shell-v1';
const SHELL = [
  './',
  './index.html',
  './icon.svg',
  './manifest.webmanifest',
  './src/styles.css',
  './src/main.js',
  './src/game.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('afterwake-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
  )));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then((cached) => {
    if (cached) return cached;
    return fetch(event.request).then((response) => {
      if (!response || !response.ok) return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    });
  }));
});
