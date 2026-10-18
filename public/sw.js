// Quranly Service Worker — Optimized for Instant Loads
const CACHE_NAME = 'quranly-pwa-v2';
const API_CACHE = 'quranly-api-v1';
const IMAGE_CACHE = 'quranly-images-v1';

const STATIC_ASSETS = [
  '/quranly/',
  '/quranly/index.html',
  '/quranly/logo.png',
  '/quranly/apple-touch-icon.png',
  '/quranly/manifest.json',
  '/quranly/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Clean up old cache versions
          if (key !== CACHE_NAME && key !== API_CACHE && key !== IMAGE_CACHE && key !== 'quranly-audio-v1') {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Pass non-GET requests straight to network
  if (event.request.method !== 'GET') return;

  // Audio streaming — pass through (handled by Cache API in offlineCache.js)
  if (url.pathname.endsWith('.mp3')) return;

  // API requests (mp3quran.net) — Stale-While-Revalidate
  if (url.hostname.includes('mp3quran.net')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        const networkPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => cached); // Fallback to cache on network failure

        // Return cached immediately, or wait for network
        return cached || networkPromise;
      })
    );
    return;
  }

  // Reciter avatar images — Cache-First (they rarely change)
  if (url.pathname.startsWith('/reciters/') || url.pathname.includes('/reciters/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => fetch(event.request))
    );
    return;
  }

  // Vite-built JS/CSS chunks — Cache-First with background update
  if (url.pathname.match(/\.(js|css)$/) && url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) {
          // Update cache in background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse);
            }
          }).catch(() => {});
          return cached;
        }
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      })
    );
    return;
  }

  // Default — Stale-While-Revalidate for other same-origin requests
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
