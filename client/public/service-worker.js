const CACHE_PREFIX = 'taskkollecta';
const CACHE_VERSION = 'v1';
const APP_CACHE = `${CACHE_PREFIX}-app-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/offline.html',
  '/site.webmanifest',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith(`${CACHE_PREFIX}-`) && ![APP_CACHE, RUNTIME_CACHE].includes(name))
        .map((name) => caches.delete(name)),
    );

    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }

    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

function isAppDataRequest(url) {
  return url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/');
}

function canCache(response) {
  return response?.ok && (response.type === 'basic' || response.type === 'cors');
}

async function handleNavigation(event) {
  try {
    const preloadResponse = await event.preloadResponse;
    const response = preloadResponse || await fetch(event.request);

    if (canCache(response)) {
      const cache = await caches.open(APP_CACHE);
      await cache.put('/', response.clone());
    }

    return response;
  } catch {
    return (await caches.match(event.request))
      || (await caches.match('/'))
      || caches.match('/offline.html');
  }
}

async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  const response = await fetch(request);
  if (canCache(response)) {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || isAppDataRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (['style', 'script', 'worker', 'font', 'image'].includes(request.destination)) {
    event.respondWith(handleStaticAsset(request));
  }
});
