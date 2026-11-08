/**
 * Cloudflare Pages Function : lecture d'un ticket de caisse dans le cloud.
 *
 *   1. Google Gemini (prioritaire) : `env.GEMINI_API_KEY`, sortie JSON structurée.
 *   2. Google Cloud Vision (en second) : seulement si `env.GOOGLE_VISION_API_KEY` existe.
 *
 * Les clés restent CÔTÉ SERVEUR, jamais exposées au navigateur ni au dépôt.
 *
 *   Endpoint : POST /api/ocr-receipt
 *   En-tête  : Authorization: Bearer <jeton d'accès Supabase> (obligatoire)
 *   Body JSON : { "image": "<base64 sans préfixe data:>" }
 *   Réponse 200 Gemini : { "engine": "gemini", "text": "", "confidence": 0.9, "structured": {...} }
 *   Réponse 200 Vision : { "text": string, "confidence": number }  (confiance dérivée [0..1])
 *
 * Dégradation propre : aucune clé (503), jeton absent/invalide (401), image trop grosse (413),
 * quota/erreur/réponse mal formée (502), dépassement de délai (504). Dans tous ces cas le
 * client bascule sur Tesseract (Phase 1).
 *
 * Hors du tsconfig frontend (runtime Workers) : bundlé par Cloudflare, pas par `tsc --noEmit`.
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
/** Flash-Lite stable, gratuit, déjà utilisé avec cette clé par /api/dictee-depense. */
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
/** Délai max pour l'appel Gemini (le client attend 18 s). */
const GEMINI_TIMEOUT_MS = 15_000;
const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';
/** ~6 Mo d'image binaire ≈ 8 Mo de base64. Au-delà : refus (limite Vision ≈ 10 Mo). */
const MAX_BASE64_LENGTH = 8_000_000;
/** Délai max pour l'appel Vision. */
const VISION_TIMEOUT_MS = 10_000;
const AUTH_TIMEOUT_MS = 5_000;
const MAX_ITEMS = 100;

/** Public values (same as src/lib/supabase.ts): used when the Pages variables are absent. */
const SUPABASE_URL_PUBLIC = 'https://ofzmwrzatcztoekrpvkj.supabase.co';
const SUPABASE_ANON_PUBLIC =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mem13cnphdGN6dG9la3JwdmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjAxMTUsImV4cCI6MjA3NDczNjExNX0.hYDpbvzwNZWmDgXPSGEgoKLR-m51TQZmaWw1whQ90Cw';

const GEMINI_PROMPT = [
  'Tu lis la photo d’un ticket de caisse à Madagascar et tu renvoies uniquement le JSON demandé.',
  '',
  'Règles :',
  '- Montants en nombres entiers d’ariary, sans séparateur (14600, jamais « 14 600 »).',
  '- Ignore les téléphones, adresses, TVA, espèces rendues, monnaie, numéro de ticket, serveur, table et publicité.',
  '- Un article écrit sur deux lignes (quantité et libellé, puis prix unitaire et total) est UN SEUL article.',
  '- quantity : la quantité achetée ; unitPrice : le prix unitaire (null s’il n’est pas écrit) ; lineTotal : le montant de la ligne.',
  '- total : le total final à payer tel qu’il est imprimé, null s’il est illisible.',
  '- date : la date du ticket au format AAAA-MM-JJ, null si elle est illisible.',
  '- currency : la devise imprimée (par exemple MGA), null si elle n’est pas indiquée.',
  '- supplier : le nom du commerce, null s’il est illisible.',
  '- N’invente jamais une ligne illisible : laisse-la de côté.',
].join('\n');

const RECEIPT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    supplier: { type: 'STRING', nullable: true },
    date: { type: 'STRING', nullable: true },
    currency: { type: 'STRING', nullable: true },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          quantity: { type: 'NUMBER' },
          unitPrice: { type: 'NUMBER', nullable: true },
          lineTotal: { type: 'NUMBER' },
        },
        required: ['label', 'quantity', 'unitPrice', 'lineTotal'],
      },
    },
    total: { type: 'NUMBER', nullable: true },
  },
  required: ['supplier', 'date', 'currency', 'items', 'total'],
};

function json(statusCode: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Jeton Supabase valide ? Empêche quiconque d'appeler cette adresse pour consommer la clé. */
async function isAuthorized(env: any, authorization: string): Promise<boolean> {
  if (!/^Bearer\s+\S+/.test(authorization)) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    const resp = await fetch(
      `${String(env.SUPABASE_URL || SUPABASE_URL_PUBLIC).replace(/\/$/, '')}/auth/v1/user`,
      {
        headers: { apikey: env.SUPABASE_ANON_KEY || SUPABASE_ANON_PUBLIC, Authorization: authorization },
        signal: controller.signal,
      }
    );
    if (!resp.ok) return false;
    const user: any = await resp.json();
    return typeof user?.id === 'string';
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function isAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/** Validation stricte de la sortie du modèle. Mal formée → null (502). */
function validateStructured(raw: any): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return null;
  if (!isNullableString(raw.supplier) || !isNullableString(raw.date) || !isNullableString(raw.currency)) {
    return null;
  }
  if (raw.total !== null && !isAmount(raw.total)) return null;

  const items: Array<Record<string, unknown>> = [];
  for (const item of raw.items) {
    if (!item || typeof item !== 'object' || typeof item.label !== 'string') return null;
    if (!isAmount(item.quantity) || !isAmount(item.lineTotal)) return null;
    if (item.unitPrice !== null && !isAmount(item.unitPrice)) return null;
    items.push({
      label: item.label.trim().slice(0, 200),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    });
  }

  return {
    supplier: raw.supplier,
    date: raw.date,
    currency: raw.currency,
    items: items.slice(0, MAX_ITEMS),
    total: raw.total,
  };
}

async function readWithGemini(env: any, imageBase64: string): Promise<Response> {
  const model = String(env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).replace(/[^a-z0-9.\-]/gi, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const resp = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: GEMINI_PROMPT },
              { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RECEIPT_SCHEMA,
          temperature: 0,
        },
      }),
    });

    if (!resp.ok) {
      return json(502, {
        error: resp.status === 429 ? 'gemini_quota' : 'gemini_http_error',
        status: resp.status,
      });
    }

    let structured: Record<string, unknown> | null = null;
    try {
      const data: any = await resp.json();
      const text = (data?.candidates?.[0]?.content?.parts || [])
        .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
        .join('');
      structured = validateStructured(JSON.parse(text));
    } catch {
      structured = null;
    }
    if (!structured) return json(502, { error: 'gemini_malformed' });

    return json(200, { engine: 'gemini', text: '', confidence: 0.9, structured });
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    return json(aborted ? 504 : 502, { error: aborted ? 'gemini_timeout' : 'gemini_fetch_failed' });
  } finally {
    clearTimeout(timer);
  }
}

async function readWithVision(apiKey: string, imageBase64: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);

  try {
    const resp = await fetch(`${VISION_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            imageContext: { languageHints: ['fr'] },
          },
        ],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      return json(502, {
        error: 'vision_http_error',
        status: resp.status,
        detail: detail.slice(0, 500),
      });
    }

    const data: any = await resp.json();
    const r = data?.responses?.[0];
    if (r?.error) {
      return json(502, { error: 'vision_api_error', detail: r.error.message || 'unknown' });
    }

    const text: string = r?.fullTextAnnotation?.text || '';
    const confidence = deriveConfidence(r);
    return json(200, { text, confidence });
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    return json(aborted ? 504 : 502, {
      error: aborted ? 'vision_timeout' : 'vision_fetch_failed',
    });
  } finally {
    clearTimeout(timer);
  }
}

export const onRequest = async (context: any): Promise<Response> => {
  const request: Request = context.request;
  const env = context && context.env ? context.env : {};

  if (request.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  if (!env.GEMINI_API_KEY && !env.GOOGLE_VISION_API_KEY) {
    // Aucune clé configurée côté Cloudflare → le client retombe sur Tesseract.
    return json(503, { error: 'vision_not_configured' });
  }

  if (!(await isAuthorized(env, request.headers.get('Authorization') || ''))) {
    return json(401, { error: 'unauthorized' });
  }

  // --- Lecture de l'image (base64) depuis le body JSON { image }. ---
  let imageBase64 = '';
  try {
    const parsed: any = await request.json();
    imageBase64 = String((parsed && parsed.image) || '');
  } catch {
    return json(400, { error: 'invalid_body' });
  }

  // Retirer un éventuel préfixe data URI (« data:image/...;base64, »).
  if (imageBase64.startsWith('data:')) {
    const comma = imageBase64.indexOf(',');
    if (comma !== -1) imageBase64 = imageBase64.slice(comma + 1);
  }
  imageBase64 = imageBase64.trim();

  if (!imageBase64) return json(400, { error: 'empty_image' });
  if (imageBase64.length > MAX_BASE64_LENGTH) return json(413, { error: 'image_too_large' });

  if (env.GEMINI_API_KEY) {
    const geminiResponse = await readWithGemini(env, imageBase64);
    if (geminiResponse.ok || !env.GOOGLE_VISION_API_KEY) return geminiResponse;
  }

  return readWithVision(env.GOOGLE_VISION_API_KEY, imageBase64);
};

/** Confiance [0..1] dérivée de la moyenne des confiances de pages/blocs Vision. */
function deriveConfidence(response: any): number {
  const pages = response?.fullTextAnnotation?.pages;
  if (Array.isArray(pages) && pages.length > 0) {
    const confs: number[] = [];
    for (const page of pages) {
      if (typeof page?.confidence === 'number') confs.push(page.confidence);
      for (const block of page?.blocks || []) {
        if (typeof block?.confidence === 'number') confs.push(block.confidence);
      }
    }
    if (confs.length > 0) {
      const avg = confs.reduce((s, c) => s + c, 0) / confs.length;
      return Math.max(0, Math.min(1, avg));
    }
  }
  // Vision a renvoyé du texte sans score détaillé → confiance élevée (texte propre).
  return response?.fullTextAnnotation?.text ? 0.9 : 0;
}

// Routage par fichier : functions/api/ocr-receipt.ts -> /api/ocr-receipt.
