/**
 * Cloudflare Pages Function (middleware): PUDi light entry on /pudi and /pudi/*.
 * Every PUDi route without a file extension (/pudi, /pudi?c=..., /pudi/programme/A1...)
 * gets the PUDi page (dist/pudi/index.html) with status 200, whatever the "pretty URLs"
 * handling of the asset server does with folders. Files (/pudi/sw.js, /pudi/images/*...)
 * go through unchanged.
 */
export const onRequest = async (context: any): Promise<Response> => {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const isFile = /\.[a-z0-9]+$/i.test(url.pathname);
  if (isFile || (request.method !== 'GET' && request.method !== 'HEAD')) return next();

  // Plain GET (no conditional headers from the browser: always a full 200 body).
  const page: Response = await env.ASSETS.fetch(new Request(new URL('/pudi/', url).toString()));
  if (!page.ok) return next();
  const headers = new Headers(page.headers);
  headers.set('Cache-Control', 'no-cache');
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return new Response(request.method === 'HEAD' ? null : page.body, { status: 200, headers });
};
