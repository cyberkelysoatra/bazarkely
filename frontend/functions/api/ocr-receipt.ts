/**
 * Cloudflare Pages Function — OCR cloud haute précision (Google Cloud Vision).
 *
 * Portage de l'ancienne Netlify Function `ocr-receipt`. La clé Google Vision reste
 * CÔTÉ SERVEUR (`env.GOOGLE_VISION_API_KEY`) — jamais exposée au navigateur ni au dépôt.
 *
 *   Endpoint : POST /api/ocr-receipt
 *   Body JSON : { "image": "<base64 sans préfixe data:>" }
 *   Réponse 200 : { "text": string, "confidence": number }  (confiance dérivée [0..1])
 *
 * Dégradation propre : clé absente (503), image trop grosse (413), quota/erreur Vision (502),
 * dépassement de délai (504). Dans tous ces cas le client bascule sur Tesseract (Phase 1).
 *
 * Hors du tsconfig frontend (runtime Workers) : bundlé par Cloudflare, pas par `tsc --noEmit`.
 */

const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';
/** ~6 Mo d'image binaire ≈ 8 Mo de base64. Au-delà : refus (limite Vision ≈ 10 Mo). */
const MAX_BASE64_LENGTH = 8_000_000;
/** Délai max pour l'appel Vision. */
const VISION_TIMEOUT_MS = 10_000;

function json(statusCode: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequest = async (context: any): Promise<Response> => {
  const request: Request = context.request;
  const env = context && context.env ? context.env : {};

  if (request.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  const apiKey = env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    // Clé non configurée côté Cloudflare → le client retombe sur Tesseract.
    return json(503, { error: 'vision_not_configured' });
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
