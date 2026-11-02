/**
 * Cloudflare Pages Function (middleware): Validation client light entry on /validation and
 * /validation/* (VALIDCLIENT-CC-02, same pattern as functions/pudi/_middleware.ts).
 * Every route without a file extension (/validation, /validation/i/<jeton>, /validation/connexion...)
 * gets the page (dist/validation/index.html) with status 200. Files (/validation/sw.js,
 * /validation/manifest.webmanifest) go through unchanged.
 */
export const onRequest = async (context: any): Promise<Response> => {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const isFile = /\.[a-z0-9]+$/i.test(url.pathname);
  if (isFile || (request.method !== 'GET' && request.method !== 'HEAD')) return next();

  const page: Response = await env.ASSETS.fetch(new Request(new URL('/validation/', url).toString()));
  if (!page.ok) return next();
  const headers = new Headers(page.headers);
  headers.set('Cache-Control', 'no-cache');
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return new Response(request.method === 'HEAD' ? null : page.body, { status: 200, headers });
};
