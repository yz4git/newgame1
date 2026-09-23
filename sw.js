const BUILD_ID = '__BUILD_ID__';
const CACHE_NAME = 'afterwake-newgame1-' + BUILD_ID;
const BASE_URL = new URL('./', self.location.href);
const CACHE_PREFIX = 'afterwake-newgame1-';
const LEGACY_CACHE_NAMES = new Set([
  'afterwake-shell-v1',
  'afterwake-d37f1d0ca8663515c72befadca1eab1b87a6e499',
]);
const NETWORK_FIRST_FILE = /\.(?:html?|mjs?|js|css|json|webmanifest)$/i;

function withBuild(path) {
  const url = new URL(path, BASE_URL);
  url.searchParams.set('v', BUILD_ID);
  return url.href;
}

const SHELL = [
  new Request(new URL('./', BASE_URL).href, { cache: 'reload' }),
  new Request(new URL('./index.html', BASE_URL).href, { cache: 'reload' }),
  new Request(withBuild('./latest.html'), { cache: 'reload' }),
  new Request(withBuild('./icon.svg'), { cache: 'reload' }),
  new Request(withBuild('./manifest.webmanifest'), { cache: 'reload' }),
  new Request(withBuild('./src/styles.css'), { cache: 'reload' }),
  new Request(withBuild('./src/main.js'), { cache: 'reload' }),
  new Request(withBuild('./src/game.js'), { cache: 'reload' }),
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => (key.startsWith(CACHE_PREFIX) || LEGACY_CACHE_NAMES.has(key)) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE_URL.pathname)) return;

  const isBuildAsset = url.searchParams.get('v') === BUILD_ID;
  if (isBuildAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response?.ok) await cache.put(request, response.clone());
      return response;
    })().catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(request)) || Response.error();
    }));
    return;
  }

  const networkFirst = request.mode === 'navigate' || NETWORK_FIRST_FILE.test(url.pathname);
  if (networkFirst) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cacheKey = request.mode === 'navigate'
        ? new Request(url.origin + url.pathname)
        : request;
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response?.ok) await cache.put(cacheKey, response.clone());
        return response;
      } catch {
        const cached = await cache.match(cacheKey);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return (await cache.match(new URL('./index.html', BASE_URL).href)) || Response.error();
        }
        return Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response?.ok) await cache.put(request, response.clone());
    return response;
  })());
});
