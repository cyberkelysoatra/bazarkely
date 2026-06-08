/**
 * Netlify Edge Function `og-invite` — image PNG 1200×630 de l'aperçu WhatsApp.
 *
 * Phase 3 « Invitation vitrine WhatsApp ». Sert à `/og-invite.png` (référencé par
 * og:image de l'injecteur `invite-og`). Génère un VRAI PNG (pas de SVG : non fiable
 * sur WhatsApp) via og_edge (Satori → Resvg, police Noto Sans embarquée), en charte
 * AHUVI (forest #364E30 / teal #10939F, accent or #C3C067).
 *
 * Contenu (textes FR figés) :
 *  - avec chiffres : gros « {fill_pct} % » + « Niveau du bassin » + pastille tendance
 *    (En hausse / En baisse / Stable) + bandeau bas ;
 *  - sans chiffres : visuel générique avec slogan, sans pourcentage.
 *
 * L'image NE contient PAS le jeton (chiffres globaux du bassin, non nominatifs) → une
 * seule image partagée, cache long acceptable. Anti-500 : tout échec de rendu retombe
 * sur un PNG de repli plein (charte forest) embarqué en base64 (toujours HTTP 200).
 *
 * Hors du tsconfig frontend (Deno/edge) : compilé par Netlify, pas par `tsc --noEmit`.
 */
import type { Context } from '@netlify/edge-functions';
import React from 'https://esm.sh/react@18.2.0';
import { ImageResponse } from 'https://deno.land/x/og_edge@0.0.6/mod.ts';

const SUPABASE_URL =
  Deno.env.get('SUPABASE_URL') ?? 'https://ofzmwrzatcztoekrpvkj.supabase.co';
const SUPABASE_ANON_KEY =
  Deno.env.get('SUPABASE_ANON_KEY') ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mem13cnphdGN6dG9la3JwdmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjAxMTUsImV4cCI6MjA3NDczNjExNX0.hYDpbvzwNZWmDgXPSGEgoKLR-m51TQZmaWw1whQ90Cw';

const CACHE = 'public, max-age=300, s-maxage=300';

/** PNG plein 1200×630 (charte forest #364E30) — repli garanti valide, anti-500. */
const FALLBACK_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAABLAAAAJ2CAIAAADAIuwLAAAMIElEQVR42u3XMQ0AAAgEsZfEhAz8y0EDM02q4LZLTwEAAPBQJAAAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAADKEKAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAIAhVAEAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAABgCCUAAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAAAyhCgAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAACAIVQBAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAYAglAAAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAMoQoAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAgCFUAQAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAALhZrAvkJcQcqvUAAAAASUVORK5CYII=';

interface Stats {
  fill_pct: number | null;
  trend: number | null;
}

async function fetchStats(): Promise<Stats | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/eau_public_vitrine_stats`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
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

/** PNG de repli embarqué (anti-500). */
function fallbackResponse(): Response {
  const bytes = Uint8Array.from(atob(FALLBACK_PNG_B64), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    status: 200,
    headers: { 'content-type': 'image/png', 'cache-control': CACHE },
  });
}

// Helper concis pour Satori (createElement, sans JSX → pas de pragma à configurer).
const h = (style: Record<string, unknown>, children: unknown) =>
  React.createElement('div', { style }, children as never);

export default async (_request: Request, _context: Context): Promise<Response> => {
  try {
    const stats = await fetchStats();
    const hasNumbers =
      !!stats && stats.fill_pct !== null && Number.isFinite(stats.fill_pct);
    const pct = hasNumbers ? Math.round(stats!.fill_pct as number) : null;
    const trend = stats?.trend ?? 0;

    const pillBg = trend === 1 ? '#2F855A' : trend === -1 ? '#C53030' : 'rgba(255,255,255,0.22)';
    const pillText = trend === 1 ? 'En hausse' : trend === -1 ? 'En baisse' : 'Stable';

    // En-tête : goutte (carré arrondi pivoté) + marque.
    const header = h(
      { display: 'flex', alignItems: 'center' },
      [
        React.createElement('div', {
          key: 'drop',
          style: {
            width: '74px',
            height: '74px',
            background: '#C3C067',
            borderRadius: '50% 50% 50% 0%',
            transform: 'rotate(45deg)',
            marginRight: '30px',
          },
        }),
        React.createElement(
          'div',
          { key: 'brand', style: { fontSize: '46px', fontWeight: 700, letterSpacing: '-1px' } },
          'Gestion Eau AHUVI'
        ),
      ]
    );

    // Bloc central : chiffres OU slogan générique.
    const center = hasNumbers
      ? h(
          { display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 },
          [
            React.createElement(
              'div',
              { key: 'pct', style: { fontSize: '210px', fontWeight: 800, lineHeight: 1 } },
              `${pct} %`
            ),
            React.createElement(
              'div',
              {
                key: 'lbl',
                style: { fontSize: '46px', marginTop: '6px', color: 'rgba(255,255,255,0.92)' },
              },
              'Niveau du bassin'
            ),
            React.createElement(
              'div',
              {
                key: 'pill',
                style: {
                  display: 'flex',
                  marginTop: '30px',
                  paddingTop: '12px',
                  paddingBottom: '12px',
                  paddingLeft: '36px',
                  paddingRight: '36px',
                  borderRadius: '999px',
                  background: pillBg,
                  fontSize: '38px',
                  fontWeight: 600,
                },
              },
              pillText
            ),
          ]
        )
      : h(
          { display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 },
          [
            React.createElement(
              'div',
              {
                key: 'slogan',
                style: { fontSize: '78px', fontWeight: 800, lineHeight: 1.12, maxWidth: '960px' },
              },
              "Suivez l'eau de votre quartier, simplement."
            ),
          ]
        );

    const footer = React.createElement(
      'div',
      { style: { display: 'flex', fontSize: '34px', fontWeight: 600 } },
      "Rejoignez le suivi de l'eau de votre quartier"
    );

    const root = React.createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          paddingTop: '70px',
          paddingBottom: '70px',
          paddingLeft: '80px',
          paddingRight: '80px',
          background: 'linear-gradient(135deg, #364E30 0%, #10939F 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        },
      },
      [
        React.createElement('div', { key: 'h', style: { display: 'flex' } }, header),
        React.createElement('div', { key: 'c', style: { display: 'flex', flexGrow: 1 } }, center),
        React.createElement('div', { key: 'f', style: { display: 'flex' } }, footer),
      ]
    );

    return new ImageResponse(root, {
      width: 1200,
      height: 630,
      headers: { 'cache-control': CACHE },
    });
  } catch {
    // Rendu indisponible (police/wasm) → repli plein valide, jamais de 500.
    return fallbackResponse();
  }
};

// Routage déclaré dans netlify.toml ([[edge_functions]] path = "/og-invite.png").
