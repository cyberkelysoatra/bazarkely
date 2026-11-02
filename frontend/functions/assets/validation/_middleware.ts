/**
 * Cloudflare Pages Function (middleware) on /assets/validation/* (Validation client code files).
 * Same protection as functions/assets/pudi/_middleware.ts: a missing file must never get the SPA
 * fallback HTML under the "immutable, 1 year" header of /assets/* (P48). It becomes a 404 that
 * nobody keeps.
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
