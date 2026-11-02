/* 1saKELY Validation service worker (scope /validation/). Hand-written, no Workbox
 * (VALIDCLIENT-CC-02, same pattern as public/pudi/sw.js).
 * - install: caches the shell (page, manifest, icon)
 * - navigations under /validation: network first (3 s), fallback to the cached shell
 * - same-origin GET of /assets/validation/* and /validation/*: stale-while-revalidate
 * - Supabase (other origin) is never cached; never touches the other scopes
 * - push and notificationclick: copied from src/sw-custom.ts (used from lot 1b)
 * Bump VERSION to drop old caches. */
const VERSION = 'v1';
const SHELL = 'validation-shell-' + VERSION;
const RUNTIME = 'validation-runtime-' + VERSION;
const SHELL_URLS = ['/validation/', '/validation/manifest.webmanifest', '/icon-192x192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('validation-') && k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

async function navigation(request) {
  try {
    const response = await Promise.race([fetch(request), timeout(3000)]);
    if (response && response.ok) {
      const cache = await caches.open(SHELL);
      cache.put('/validation/', response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match('/validation/', { cacheName: SHELL });
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(event.request);
  const network = fetch(event.request)
    .then((response) => {
      // Never keep an HTML page in place of a code file (P48).
      const html = /text\/html/i.test(response?.headers.get('Content-Type') ?? '');
      if (response && response.ok && response.type === 'basic' && !(html && new URL(event.request.url).pathname.startsWith('/assets/'))) cache.put(event.request, response.clone());
      return response;
    })
    .catch(() => undefined);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  const response = await network;
  if (response) return response;
  const shell = await caches.match(event.request, { cacheName: SHELL });
  return shell || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase and other hosts: never cached
  if (request.mode === 'navigate') {
    if (url.pathname === '/validation' || url.pathname.startsWith('/validation/')) event.respondWith(navigation(request));
    return;
  }
  if (url.pathname === '/validation/sw.js') return;
  if (url.pathname.startsWith('/assets/validation/') || url.pathname.startsWith('/validation/') || url.pathname === '/icon-192x192.png') {
    event.respondWith(staleWhileRevalidate(event));
  }
});

// ---------------------------------------------------------------------------------
// Notifications: copied from src/sw-custom.ts (default address: the module home).
// ---------------------------------------------------------------------------------

/** Relative link inside the module only; anything else falls back to the given default. */
function safeInAppUrl(value, fallback) {
  return typeof value === 'string' && /^\/validation(\/|$|\?)/.test(value) ? value : fallback;
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    try {
      payload = { body: event.data && event.data.text() };
    } catch {
      payload = {};
    }
  }
  if (!payload || typeof payload !== 'object') payload = {};

  const title = typeof payload.title === 'string' && payload.title.trim() ? payload.title : '1saKELY Validation';
  const body = typeof payload.body === 'string' && payload.body.trim() ? payload.body : 'Vous avez une nouvelle notification.';
  const url = safeInAppUrl(payload.url ?? (payload.data && payload.data.clickAction), '/validation/');

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: typeof payload.tag === 'string' ? payload.tag : undefined,
      data: { clickAction: url, notificationId: payload.notificationId }
    }).catch(() => undefined)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const clickAction = safeInAppUrl(data.clickAction, '/validation/');
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows.find((c) => c.url.startsWith(self.location.origin + '/validation'));
      if (existing) {
        await existing.focus();
        try {
          await existing.navigate(clickAction);
        } catch {
          // Uncontrolled window: navigate() rejects, focusing it is enough.
        }
        return;
      }
      await self.clients.openWindow(clickAction);
    })()
  );
});
