/**
 * Cloudflare Pages Function (middleware): NAVY ay Open Graph tags on /navy and /navy/*
 * (WhatsApp link preview). Logic shared with functions/ouvrir/_middleware.ts, see
 * functions-lib/navyOg.ts (kept outside functions/ so it does not become a route).
 */
import { injectNavyOg } from '../../functions-lib/navyOg';

export const onRequest = async (context: any): Promise<Response> => {
  const { request, next } = context;
  return injectNavyOg(request, await next());
};

// File routing: functions/navy/_middleware.ts covers /navy and /navy/*.
