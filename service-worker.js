/**
 * FORWARD Platform — Service Worker
 * Offline-first PWA caching strategy for rural/low-bandwidth users.
 * Cache version: bump CACHE_VERSION to force a full refresh on deploy.
 */

'use strict';

const CACHE_VERSION = 'forward-v1';

/**
 * App shell — precached on install.
 * Each URL is fetched individually so one 404 does not break the whole install.
 */
const APP_SHELL = [
  '/',
  '/index.html',
  '/daraja-test.html',
  '/offline.html',
  '/css/tokens.css',
  '/css/main.css',
  '/css/test.css',
  '/js/config.js',
  '/js/security.js',
  '/js/main.js',
  '/js/test.js',
  '/manifest.webmanifest',
  '/assets/logos/nexus.svg',
  '/assets/logos/dominion.svg',
  '/assets/logos/imperial.svg',
  '/assets/logos/forward-mark.svg',
  '/assets/icons/favicon.svg',
];

/* ─── Install ──────────────────────────────────────────────────────────────── */

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);

      // Cache each item individually — a missing file must not abort the whole install.
      const results = await Promise.allSettled(
        APP_SHELL.map(async (url) => {
          try {
            await cache.add(url);
          } catch (err) {
            // Non-fatal: log and continue.
            console.warn(`[SW] Precache miss for ${url}:`, err.message);
          }
        })
      );

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length) {
        console.warn(`[SW] ${failures.length} precache item(s) failed (non-fatal).`);
      }

      // Activate immediately without waiting for old tabs to close.
      await self.skipWaiting();
    })()
  );
});

/* ─── Activate ─────────────────────────────────────────────────────────────── */

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Delete any cache whose name does not match the current version.
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => {
              console.info(`[SW] Deleting old cache: ${key}`);
              return caches.delete(key);
            })
        );
      } catch (err) {
        console.warn('[SW] Activate cleanup error:', err.message);
      }

      // Take control of all open clients immediately.
      await clients.claim();
    })()
  );
});

/* ─── Fetch ────────────────────────────────────────────────────────────────── */

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // ── Cross-origin requests (e.g. Google Fonts) — cache-first, opaque-tolerant ──
  if (url.origin !== self.location.origin) {
    event.respondWith(handleCrossOrigin(request));
    return;
  }

  // ── Navigation requests — network-first, fall back to cache then offline page ──
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // ── Same-origin static assets — stale-while-revalidate ──
  event.respondWith(handleStatic(request));
});

/* ─── Strategy: network-first navigation ───────────────────────────────────── */

async function handleNavigation(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Update cache with the fresh response.
      try {
        const cache = await caches.open(CACHE_VERSION);
        await cache.put(request, networkResponse.clone());
      } catch (_) { /* non-fatal */ }
    }
    return networkResponse;
  } catch (_networkErr) {
    // Network failed — try the cache.
    try {
      const cached = await caches.match(request);
      if (cached) return cached;
    } catch (_cacheErr) { /* fall through */ }

    // Nothing in cache — serve branded offline page.
    try {
      const offline = await caches.match('/offline.html');
      if (offline) return offline;
    } catch (_) { /* fall through */ }

    // Absolute last resort — minimal inline response.
    return new Response(
      '<html><body><h1>Oflayn rejim</h1><p><a href="/">Bosh sahifaga qaytish</a></p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/* ─── Strategy: stale-while-revalidate (same-origin assets) ────────────────── */

async function handleStatic(request) {
  try {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await caches.match(request);

    // Fire a background revalidation regardless of cache hit.
    const revalidationPromise = fetch(request)
      .then(async (networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          try {
            await cache.put(request, networkResponse.clone());
          } catch (_) { /* non-fatal */ }
        }
        return networkResponse;
      })
      .catch(() => null); // Revalidation failure is silent.

    // Serve from cache instantly if available; otherwise wait for network.
    if (cached) return cached;

    const networkResponse = await revalidationPromise;
    if (networkResponse) return networkResponse;

    // Nothing available — return a generic 503.
    return new Response('Resource unavailable offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    console.warn('[SW] handleStatic error:', err.message);
    return new Response('Service Worker error.', { status: 500 });
  }
}

/* ─── Strategy: cache-first cross-origin (opaque-tolerant) ─────────────────── */

async function handleCrossOrigin(request) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;

    const networkResponse = await fetch(request);
    // Cache opaque responses (status 0) and normal 2xx responses.
    if (networkResponse && (networkResponse.status === 0 || networkResponse.status === 200)) {
      try {
        const cache = await caches.open(CACHE_VERSION);
        await cache.put(request, networkResponse.clone());
      } catch (_) { /* Storage quota or opaque response rejection — non-fatal */ }
    }
    return networkResponse;
  } catch (err) {
    // Cross-origin failure must never break the app — return a 503 silently.
    return new Response('', { status: 503 });
  }
}
