/**
 * Cloudflare Pages Function (middleware) on /assets/* (main app code files, hashed names).
 * Same guard as /assets/pudi/* (v3.102.1), now for every code file: a missing file must never
 * get the SPA fallback (`/* /index.html 200` in _redirects), which would be served as a script
 * under the "immutable, 1 year" header of /assets/* and kept by the edge. Seen on 03/11/2026
 * (v3.121.0): right after the deployment, 11 files of the main app (Budgets, Add transaction,
 * Eau simulation...) got index.html at the Antananarivo edge. A missing file is now a real 404
 * that nobody keeps; the service worker retries on the next load.
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
