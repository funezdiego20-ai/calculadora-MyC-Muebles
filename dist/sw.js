const CACHE_NAME = 'myc-muebles-v3';
const APP_ROOT = new URL('./', self.registration.scope).href;
const PRECACHE_URLS = [
  APP_ROOT,
  new URL('manifest.json', APP_ROOT).href,
  new URL('icon.svg', APP_ROOT).href,
  new URL('icons/myc-192.png', APP_ROOT).href,
  new URL('icons/myc-512.png', APP_ROOT).href,
  new URL('icons/myc-maskable-512.png', APP_ROOT).href,
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('myc-muebles-') && key !== CACHE_NAME).map(key => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(APP_ROOT)) return;
  if (url.pathname.includes('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(APP_ROOT, response.clone()));
      return response;
    }).catch(() => caches.match(APP_ROOT)));
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    return response;
  })));
});