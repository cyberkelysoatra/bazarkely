/**
 * Cloudflare Pages Function (middleware) — injection Open Graph sur /i/* (aperçu WhatsApp).
 *
 * Portage 1:1 de l'ancienne Netlify Edge Function `invite-og`. Le robot d'aperçu de
 * WhatsApp/Facebook n'exécute PAS le JavaScript : la PWA seule renvoie un <head> sans
 * contenu social. Ce middleware s'insère AVANT le rendu SPA, uniquement sur /i/* :
 *   1. récupère le HTML de l'app (context.next() -> repli SPA /index.html ; fallback
 *      explicite via env.ASSETS si nécessaire) ;
 *   2. lit les chiffres NON nominatifs via la RPC anon `eau_public_vitrine_stats()`
 *      (timeout court ; dégradation propre en valeurs génériques si échec) ;
 *   3. injecte les balises og:* / twitter:* (textes FR figés, JAMAIS le jeton) avec
 *      une og:image absolue pointant vers /og-invite.png ;
 *   4. renvoie le HTML modifié — un vrai navigateur boote ensuite la SPA (route
 *      /i/:token -> EauVitrinePage) ; le robot lit juste les balises.
 *
 * Sécurité : clé ANON uniquement (jamais la service key). Le jeton reste dans l'URL
 * de la page (og:url) mais n'apparaît ni dans le titre ni dans la description ni dans
 * l'image (chiffres globaux du bassin, pas de donnée nominative).
 *
 * Hors du tsconfig frontend (runtime Workers) : bundlé par Cloudflare, pas par `tsc --noEmit`.
 */

const SUPABASE_URL_DEFAULT = 'https://ofzmwrzatcztoekrpvkj.supabase.co';
const SUPABASE_ANON_KEY_DEFAULT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mem13cnphdGN6dG9la3JwdmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjAxMTUsImV4cCI6MjA3NDczNjExNX0.hYDpbvzwNZWmDgXPSGEgoKLR-m51TQZmaWw1whQ90Cw';

const TITLE = 'Gestion Eau AHUVI — Vous êtes invité(e)';
const GENERIC_DESC =
  "Suivez l'eau de votre quartier, simplement — gratuit et même sans connexion. Touchez pour rejoindre.";

interface Stats {
  fill_pct: number | null;
  trend: number | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function trendLabel(t: number | null): string {
  if (t === 1) return 'en hausse';
  if (t === -1) return 'en baisse';
  return 'stable';
}

/** RPC anon publique, timeout court. Toute erreur -> null (dégradation propre). */
async function fetchStats(supabaseUrl: string, anonKey: string): Promise<Stats | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/eau_public_vitrine_stats`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      fill_pct: row.fill_pct === null || row.fill_pct === undefined ? null : Number(row.fill_pct),
      trend: row.trend === null || row.trend === undefined ? null : Number(row.trend),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const onRequest = async (context: any): Promise<Response> => {
  const { request, next, env } = context;
  const supabaseUrl = (env && env.SUPABASE_URL) || SUPABASE_URL_DEFAULT;
  const anonKey = (env && env.SUPABASE_ANON_KEY) || SUPABASE_ANON_KEY_DEFAULT;

  // 1) HTML de l'app. context.next() applique le repli SPA (_redirects /* -> /index.html).
  //    Si ce n'est pas du HTML (cas limite), on va chercher /index.html explicitement.
  let response: Response = await next();
  let contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    try {
      const { origin } = new URL(request.url);
      response = await env.ASSETS.fetch(new URL('/index.html', origin));
      contentType = response.headers.get('content-type') || 'text/html';
    } catch {
      return response; // pas de HTML récupérable : ne touche à rien.
    }
  }

  let html = await response.text();
  const { origin } = new URL(request.url);

  // 2) Chiffres globaux (best-effort).
  const stats = await fetchStats(supabaseUrl, anonKey);
  const hasNumbers = !!stats && stats.fill_pct !== null && Number.isFinite(stats.fill_pct);
  const description = hasNumbers
    ? `Bassin rempli à ${Math.round(stats!.fill_pct as number)} % (${trendLabel(
        stats!.trend
      )}). Suivez l'eau de votre quartier, simplement — gratuit et même sans connexion. Touchez pour rejoindre.`
    : GENERIC_DESC;

  // `?v=N` : cache-buster pour forcer WhatsApp/Facebook à re-télécharger l'image après
  // un changement de composition. Aligné sur l'ancienne edge Netlify (v2).
  const imageUrl = `${origin}/og-invite.png?v=2`;
  const pageUrl = request.url;

  // 3) Balises sociales (titre/description figés ; jeton jamais exposé hors og:url).
  const tags = `
    <meta property="og:title" content="${escapeHtml(TITLE)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Gestion Eau AHUVI" />
    <meta property="og:locale" content="fr_FR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(TITLE)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <meta name="description" content="${escapeHtml(description)}" />`;

  // Purge les balises sociales par défaut de index.html pour éviter tout doublon :
  // les balises dynamiques ci-dessous font foi sur /i/*.
  html = html.replace(
    /<meta\s+(?:property="og:[^"]*"|name="twitter:[^"]*"|name="description")[^>]*\/?>\s*/gi,
    ''
  );

  html = html.includes('</head>') ? html.replace('</head>', `${tags}\n  </head>`) : tags + html;

  // 4) Réponse HTML — Cache-Control court.
  const headers = new Headers(response.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'public, max-age=300');
  headers.delete('content-length');

  return new Response(html, { status: 200, headers });
};

// Routage par fichier : functions/i/_middleware.ts couvre /i/*.
