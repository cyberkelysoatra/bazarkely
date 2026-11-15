/**
 * Host service worker guard (MICRO-CC-01, H3 of HOTE-CC-01).
 * An HTML page must never be stored in place of a code file: during a deployment the SPA
 * fallback (`/* /index.html 200`) can answer for a missing /assets/ file, and a cached copy
 * would give a blank page on every later load. Same rule as the PUDi service worker (v4).
 * Kept free of any service-worker global so it can be unit tested.
 */

/** True when the response is an HTML page answering a script, a style or an /assets/ file. */
export function isHtmlForCodeFile(request: Request, response: Response | null | undefined): boolean {
  if (!response) return false;
  const type = response.headers.get('Content-Type') ?? '';
  if (!/text\/html/i.test(type)) return false;
  const destination = request.destination;
  if (destination === 'script' || destination === 'style') return true;
  let path = '';
  try {
    path = new URL(request.url).pathname;
  } catch {
    return false;
  }
  return path.startsWith('/assets/');
}

/**
 * Workbox `cacheWillUpdate`: refuses a failed answer (status >= 400, like Workbox's default
 * precache plugin it replaces) and an HTML answer for a code file. The response itself is
 * still returned to the page by the strategy, it is only not stored.
 */
export const htmlForCodeGuardPlugin = {
  cacheWillUpdate: async ({ request, response }: { request: Request; response: Response }) => {
    if (!response || response.status >= 400) return null;
    if (isHtmlForCodeFile(request, response)) {
      console.warn('[SW] HTML answer for a code file not cached:', request.url);
      return null;
    }
    return response;
  },
};
