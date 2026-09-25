/**
 * Cloudflare Pages Function (middleware) on /ouvrir/*: injects the NAVY ay Open Graph tags
 * ONLY for /ouvrir/navy (and below). Every other /ouvrir/* path (e.g. /ouvrir/budget) goes
 * through untouched and keeps the default BazarKELY preview.
 * Shared logic: functions-lib/navyOg.ts (outside functions/, not a route).
 */
import { injectNavyOg } from '../../functions-lib/navyOg';

export const onRequest = async (context: any): Promise<Response> => {
  const { request, next } = context;
  const { pathname } = new URL(request.url);
  if (pathname !== '/ouvrir/navy' && !pathname.startsWith('/ouvrir/navy/')) return next();
  return injectNavyOg(request, await next());
};

// File routing: functions/ouvrir/_middleware.ts covers /ouvrir/*.
