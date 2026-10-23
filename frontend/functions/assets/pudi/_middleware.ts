/**
 * Cloudflare Pages Function (middleware) on /assets/pudi/* (PUDi code files, hashed names).
 * A missing file must never get the SPA fallback (`/* /index.html 200` in _redirects): that
 * HTML would be served as a script under the "immutable, 1 year" header of /assets/*, and the
 * edge keeps it. Seen on 23/10/2026 (v3.102.0): while a deployment was rolling out, the new
 * main file got index.html at the Antananarivo edge, so about one PUDi load in two stayed
 * blank there. Now a missing file is a real 404 that nobody keeps.
 */
export const onRequest = async (context: any): Promise<Response> => {
  const reponse: Response = await context.next();
  const type = reponse.headers.get('Content-Type') ?? '';
  if (!/text\/html/i.test(type)) return reponse;
  return new Response('Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
};
