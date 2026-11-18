/* "Relevé terrain" service worker (scope /releve/, RELEVE-CC-03). Hand-written, no Workbox
 * (same pattern as public/validation/sw.js).
 * - install: precaches EVERY file of the releve build, listed in /releve/precache.json (written by
 *   vite.releve.config.ts), so that the whole app works in airplane mode after one online visit
 * - the page registers /releve/sw.js?v=<name of its entry file>: a new deploy = a new address = a new
 *   worker, which WAITS until the page asks for it (banner "Nouvelle version", SKIP_WAITING)
 * - navigations under /releve (no file extension): network first (3 s), fallback to the cached page
 * - code, styles, fonts, icons: cache first (Vary ignored); an HTML answer is never kept in place of a file (P48)
 * - other origins are never touched; IndexedDB is never touched */
const VERSION = new URL(self.location.href).searchParams.get('v') || 'local';
const PRECACHE = 'releve-precache-' + VERSION;
const RUNTIME = 'releve-runtime-' + VERSION;
const PAGE = '/releve/';
const LISTE = '/releve/precache.json';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const reponse = await fetch(LISTE, { cache: 'no-store' });
      if (!reponse.ok) throw new Error('precache list ' + reponse.status);
      const liste = await reponse.clone().json();
      const cache = await caches.open(PRECACHE);
      await cache.addAll(liste.files.map((f) => new Request(f, { cache: 'reload' })));
      // The list itself is kept last: the page reads it to know when everything is ready.
      await cache.put(LISTE, reponse);
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('releve-') && k !== PRECACHE && k !== RUNTIME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

function estHtml(response) {
  return /text\/html/i.test((response && response.headers.get('Content-Type')) || '');
}

async function navigation(request) {
  try {
    const response = await Promise.race([fetch(request), timeout(3000)]);
    if (response && response.ok && estHtml(response)) {
      const cache = await caches.open(PRECACHE);
      cache.put(PAGE, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(PAGE, { cacheName: PRECACHE, ignoreVary: true }) || await caches.match(PAGE, { ignoreVary: true });
    return cached || Response.error();
  }
}

async function cacheFirst(event) {
  const request = event.request;
  // ignoreVary: a server that adds « Vary: Origin » (vite preview) must not hide a cached module script.
  const cached = await caches.match(request, { ignoreSearch: false, ignoreVary: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    // Never keep an HTML page in place of a code file (P48).
    if (response && response.ok && response.type === 'basic' && !estHtml(response)) {
      const cache = await caches.open(RUNTIME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // other hosts: never touched
  if (request.mode === 'navigate') {
    // Module routes only: a file opened directly is never answered with the page.
    if ((url.pathname === '/releve' || url.pathname.startsWith('/releve/')) && !/\.[a-z0-9]+$/i.test(url.pathname)) event.respondWith(navigation(request));
    return;
  }
  if (url.pathname === '/releve/sw.js' || url.pathname === LISTE) return;
  if (url.pathname.startsWith('/assets/releve/') || url.pathname.startsWith('/releve/')) {
    event.respondWith(cacheFirst(event));
  }
});
