/* PUDi Nosy Be service worker (scope /pudi/). Hand-written, no Workbox.
 * - install: caches the shell (page, manifest, fonts, icons)
 * - navigations under /pudi: network first (3 s), fallback to the cached shell
 * - same-origin GET of /assets/* and /pudi/*: stale-while-revalidate
 * - Supabase (other origin) is never cached
 * - the public PUDi documents (/pudi/documents/, PDFs of 1 to 15 MB) are never cached: network
 *   only, opened in a tab or downloaded (v3: they must not fill the phone, nor replace the shell)
 * Bump VERSION to drop old caches (v4, 23/10/2026: drops any HTML stored in place of a script). */
const VERSION = 'v4';
const DOCUMENTS = '/pudi/documents/';
const SHELL = 'pudi-shell-' + VERSION;
const RUNTIME = 'pudi-runtime-' + VERSION;
const SHELL_URLS = [
  '/pudi/',
  '/pudi/manifest.webmanifest',
  '/pudi/polices/archivo-black-latin-400-normal.woff2',
  '/pudi/polices/lato-latin-400-normal.woff2',
  '/pudi/polices/lato-latin-700-normal.woff2',
  '/pudi/icones/pudi-icone-192.png'
  // The 512 px icons are fetched by the browser itself when installing: not cached here,
  // they would add 23 kB to the first visit on 3G for nothing offline.
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('pudi-') && k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))
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
      cache.put('/pudi/', response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match('/pudi/', { cacheName: SHELL });
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(event.request);
  const network = fetch(event.request)
    .then((response) => {
      // Never keep an HTML page in place of a code file (v3.102.1: an edge served index.html
      // for a missing /assets/ file during a deployment).
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
  if (url.pathname.startsWith(DOCUMENTS)) return; // PDFs: network only, never stored
  if (request.mode === 'navigate') {
    if (url.pathname === '/pudi' || url.pathname.startsWith('/pudi/')) event.respondWith(navigation(request));
    return;
  }
  if (url.pathname === '/pudi/sw.js') return;
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/pudi/')) {
    event.respondWith(staleWhileRevalidate(event));
  }
});
