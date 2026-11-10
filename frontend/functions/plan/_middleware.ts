/**
 * Cloudflare Pages Function (middleware): "Mon business plan" light entry on /plan and /plan/*
 * (NEC-CC-01, same pattern as functions/validation/_middleware.ts).
 * Every route without a file extension (/plan, /plan/p/<id>/m5, /plan/inviter...) gets the page
 * (dist/plan/index.html) with status 200. Files (/plan/sw.js, /plan/manifest.webmanifest,
 * /plan/precache.json) go through unchanged, except that a missing file never gets the SPA
 * fallback HTML: it becomes a 404 that nobody keeps (P48).
 */
export const onRequest = async (context: any): Promise<Response> => {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const isFile = /\.[a-z0-9]+$/i.test(url.pathname);
  if (request.method !== 'GET' && request.method !== 'HEAD') return next();
  if (isFile) {
    const reponse: Response = await next();
    const html = /text\/html/i.test(reponse.headers.get('Content-Type') ?? '');
    if (!html || /\.html$/i.test(url.pathname)) return reponse;
    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    });
  }

  const page: Response = await env.ASSETS.fetch(new Request(new URL('/plan/', url).toString()));
  if (!page.ok) return next();
  const headers = new Headers(page.headers);
  headers.set('Cache-Control', 'no-cache');
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return new Response(request.method === 'HEAD' ? null : page.body, { status: 200, headers });
};
