/**
 * Shared Open Graph injector for NAVY ay links (WhatsApp / Facebook preview).
 *
 * Lives OUTSIDE `functions/` on purpose: any file under `functions/` becomes a route in
 * Cloudflare Pages. This module is only imported (and bundled) by:
 *   - functions/navy/_middleware.ts    -> /navy and /navy/*
 *   - functions/ouvrir/_middleware.ts  -> /ouvrir/navy only
 *
 * Same approach as functions/i/_middleware.ts: take the SPA HTML from next(), purge the
 * default og:* / twitter:* / description metas of index.html, inject the NAVY ones before
 * </head>. Static texts only: no network call, no Supabase.
 *
 * Outside the frontend tsconfig (Workers runtime): bundled by Cloudflare, not by tsc.
 */

const TITLE = 'NAVY ay, vos petits colis à Nosy Be';
const DESCRIPTION =
  "Déposez votre colis chez l'épicier du coin, il est livré chez l'épicier choisi par le destinataire. Transporteur identifié, remise prouvée.";
const SITE_NAME = 'NAVY ay';
const DOC_TITLE = 'NAVY ay';
// `?v=N`: cache-buster to force WhatsApp/Facebook to re-download after an image change.
const IMAGE_PATH = '/navy-ay/og-navy.png?v=1';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function injectNavyOg(request: Request, response: Response): Promise<Response> {
  // Non-HTML responses (assets, errors) are returned untouched.
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();
  const { origin } = new URL(request.url);
  const imageUrl = `${origin}${IMAGE_PATH}`;

  const tags = `
    <meta name="description" content="${escapeHtml(DESCRIPTION)}" />
    <meta property="og:title" content="${escapeHtml(TITLE)}" />
    <meta property="og:description" content="${escapeHtml(DESCRIPTION)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:url" content="${escapeHtml(request.url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
    <meta property="og:locale" content="fr_FR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(TITLE)}" />
    <meta name="twitter:description" content="${escapeHtml(DESCRIPTION)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`;

  // Purge the default social tags of index.html: the NAVY ones are authoritative here.
  html = html.replace(
    /<meta\s+(?:property="og:[^"]*"|name="twitter:[^"]*"|name="description")[^>]*\/?>\s*/gi,
    ''
  );
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(DOC_TITLE)}</title>`);
  html = html.includes('</head>') ? html.replace('</head>', `${tags}\n  </head>`) : tags + html;

  const headers = new Headers(response.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'public, max-age=300');
  headers.delete('content-length');

  return new Response(html, { status: response.status, headers });
}
