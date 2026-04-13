/**
 * sw.js — Service Worker for Visitor Induction PWA
 * Strategy:
 *   - App shell (HTML, CSS, JS, icons): Cache First
 *   - YouTube & external: Network Only (cannot be cached)
 */

const CACHE_NAME    = 'visitor-induction-v5';
const OFFLINE_URL   = './index.html';

// Files to pre-cache (app shell)
const SHELL_ASSETS = [
  './index.html',
  './visitor-registration.html',
  './video.html',
  './success.html',
  './css/style.css',
  './js/registration.js',
  './js/video.js',
  './js/success.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── Install: pre-cache shell ─────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ───────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Cache First for shell, Network for external ───────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET & external URLs (YouTube, Google Fonts, Supabase)
  if (event.request.method !== 'GET') return;
  if (url.hostname !== self.location.hostname) return;

  event.respondWith(
    // NETWORK FIRST STRATEGY (Untuk mencegah perlu hard-refresh saat development)
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.destination === 'document') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});
