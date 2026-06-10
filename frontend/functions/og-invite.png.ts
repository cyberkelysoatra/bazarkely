/**
 * Cloudflare Pages Function — image PNG 1200x630 de l'aperçu WhatsApp (route /og-invite.png).
 *
 * Portage de l'ancienne Netlify Edge Function `og-invite`. Référencée par og:image de
 * l'injecteur /i/* (_middleware). Génère un VRAI PNG (pas de SVG : non fiable sur
 * WhatsApp) via `workers-og` (Satori -> resvg-wasm, compatible runtime Workers), en
 * charte AHUVI (forest #364E30 / teal #10939F, accent or #C3C067).
 *
 * Contenu (textes FR figés) :
 *  - avec chiffres : gros « {fill_pct} % » + « Niveau du bassin » + pastille tendance ;
 *  - sans chiffres : visuel générique avec slogan, sans pourcentage.
 *
 * L'image NE contient PAS le jeton (chiffres globaux du bassin, non nominatifs). Anti-500 :
 * tout échec de rendu retombe sur un PNG de repli plein (charte forest) embarqué en base64.
 *
 * Hors du tsconfig frontend (runtime Workers) : bundlé par Cloudflare, pas par `tsc --noEmit`.
 */
import { ImageResponse } from 'workers-og';

const SUPABASE_URL_DEFAULT = 'https://ofzmwrzatcztoekrpvkj.supabase.co';
const SUPABASE_ANON_KEY_DEFAULT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mem13cnphdGN6dG9la3JwdmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjAxMTUsImV4cCI6MjA3NDczNjExNX0.hYDpbvzwNZWmDgXPSGEgoKLR-m51TQZmaWw1whQ90Cw';

const CACHE = 'public, max-age=300, s-maxage=300';

/** PNG plein 1200x630 (charte forest #364E30) — repli garanti valide, anti-500. */
const FALLBACK_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAABLAAAAJ2CAIAAADAIuwLAAAMIElEQVR42u3XMQ0AAAgEsZfEhAz8y0EDM02q4LZLTwEAAPBQJAAAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAADKEKAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAIAhVAEAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAAAYQgkAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAAAyhCgAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAACAIVQBAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAYAglAAAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAAGAIAQAAMIQAAAAYQgAAAAwhAAAAhhAAAABDCAAAgCEEAADAEAIAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAMoQoAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAADCEAAACGEAAAAEMIAACAIQQAAMAQAgAAYAgBAAAwhAAAABhCAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAgCFUAQAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAADCEAAAAGEIAAAAMIQAAAIYQAAAAQwgAAIAhBAAAwBACAABgCAEAALhZrAvkJcQcqvUAAAAASUVORK5CYII=';

interface Stats {
  fill_pct: number | null;
  trend: number | null;
}

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

/** PNG de repli embarqué (anti-500 / anti-corps-vide), 1200x630 plein. */
function fallbackResponse(): Response {
  const bytes = Uint8Array.from(atob(FALLBACK_PNG_B64), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    status: 200,
    headers: { 'content-type': 'image/png', 'cache-control': CACHE },
  });
}

/**
 * Police TTF pour Satori (workers-og n'embarque PAS de police par défaut : sans police,
 * le rendu produit un flux VIDE et non une exception). Récupérée à la volée (cache CDN),
 * timeout court. Échec -> null (le rendu retombera sur le PNG de repli embarqué).
 */
async function loadFont(): Promise<ArrayBuffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const resp = await fetch(
      'https://unpkg.com/@expo-google-fonts/roboto@0.2.3/Roboto_700Bold.ttf',
      { signal: controller.signal }
    );
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    return buf && buf.byteLength > 0 ? buf : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function htmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const onRequest = async (context: any): Promise<Response> => {
  const env = context && context.env ? context.env : {};
  const supabaseUrl = env.SUPABASE_URL || SUPABASE_URL_DEFAULT;
  const anonKey = env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_DEFAULT;

  try {
    const stats = await fetchStats(supabaseUrl, anonKey);
    const hasNumbers = !!stats && stats.fill_pct !== null && Number.isFinite(stats.fill_pct);
    const pct = hasNumbers ? Math.round(stats!.fill_pct as number) : null;
    const trend = stats?.trend ?? 0;

    const pillBg = trend === 1 ? '#2F855A' : trend === -1 ? '#C53030' : 'rgba(255,255,255,0.22)';
    const pillText = trend === 1 ? 'En hausse' : trend === -1 ? 'En baisse' : 'Stable';

    // Goutte (carré arrondi pivoté) + marque.
    const header = `
      <div style="display:flex;align-items:center;justify-content:center;">
        <div style="width:74px;height:74px;background:#C3C067;border-radius:50% 50% 50% 0;transform:rotate(45deg);margin-right:30px;"></div>
        <div style="font-size:46px;font-weight:700;letter-spacing:-1px;">Gestion Eau AHUVI</div>
      </div>`;

    // Bloc central : chiffres OU slogan générique.
    const center = hasNumbers
      ? `
        <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;flex-grow:1;">
          <div style="font-size:190px;font-weight:800;line-height:1;display:flex;">${pct} %</div>
          <div style="font-size:46px;margin-top:6px;color:rgba(255,255,255,0.92);display:flex;">Niveau du bassin</div>
          <div style="display:flex;margin-top:30px;padding:12px 36px;border-radius:999px;background:${pillBg};font-size:38px;font-weight:600;">${htmlEscape(
            pillText
          )}</div>
        </div>`
      : `
        <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;flex-grow:1;">
          <div style="font-size:78px;font-weight:800;line-height:1.12;max-width:620px;display:flex;">Suivez l'eau de votre quartier, simplement.</div>
        </div>`;

    const footer = `
      <div style="display:flex;justify-content:center;text-align:center;max-width:620px;font-size:34px;font-weight:600;">Rejoignez le suivi de l'eau de votre quartier</div>`;

    const markup = `
      <div style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:space-between;align-items:center;text-align:center;padding:70px 80px;background:linear-gradient(135deg, #364E30 0%, #10939F 100%);color:#ffffff;font-family:'Roboto', sans-serif;">
        <div style="display:flex;justify-content:center;">${header}</div>
        <div style="display:flex;justify-content:center;flex-grow:1;">${center}</div>
        <div style="display:flex;justify-content:center;">${footer}</div>
      </div>`;

    const font = await loadFont();
    const options: any = { width: 1200, height: 630 };
    if (font) {
      options.fonts = [{ name: 'Roboto', data: font, weight: 700, style: 'normal' }];
    }

    // On BUFFÉRISE le rendu : workers-og renvoie un Response dont le flux est généré
    // de façon asynchrone — une erreur de rendu (police/wasm) ne lève PAS à la
    // construction mais produit un flux VIDE. En lisant l'arrayBuffer ici, l'échec
    // devient attrapable et on peut retomber sur le PNG de repli (jamais de corps vide).
    const rendered = new ImageResponse(markup, options);
    const buf = await rendered.arrayBuffer();
    if (!buf || buf.byteLength === 0) return fallbackResponse();

    return new Response(buf, {
      status: 200,
      headers: { 'content-type': 'image/png', 'cache-control': CACHE },
    });
  } catch {
    // Rendu indisponible (police/wasm) -> repli plein valide, jamais de 500 ni de corps vide.
    return fallbackResponse();
  }
};

// Routage par fichier : functions/og-invite.png.ts -> /og-invite.png.
