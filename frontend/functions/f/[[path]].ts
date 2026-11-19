/**
 * Cloudflare Pages Function: private supplier sheets on /f/<32 hex>.html (FICHE-CC-01).
 * The repository is public, so the sheets never live in git: they are stored in the
 * Cloudflare KV namespace "fiches-1sakely", bound to the Pages project as FICHES.
 * Only GET and HEAD; any other path under /f gets a plain 404 (never the app shell).
 */
const KEY_PATH = /^\/f\/([0-9a-f]{32})\.html$/;

const BASE_HEADERS: Record<string, string> = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};

const notFound = (method: string): Response =>
  new Response(method === 'HEAD' ? null : 'Fiche introuvable', {
    status: 404,
    headers: { ...BASE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' }
  });

export const onRequest = async (context: any): Promise<Response> => {
  const { request, env } = context;
  const method: string = request.method;
  if (method !== 'GET' && method !== 'HEAD') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { ...BASE_HEADERS, Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  const match = KEY_PATH.exec(new URL(request.url).pathname);
  if (!match || !env || !env.FICHES) return notFound(method);

  let body: string | null = null;
  try {
    body = await env.FICHES.get(match[1], 'text');
  } catch {
    body = null;
  }
  if (body === null) return notFound(method);

  return new Response(method === 'HEAD' ? null : body, {
    status: 200,
    headers: { ...BASE_HEADERS, 'Content-Type': 'text/html; charset=utf-8' }
  });
};
