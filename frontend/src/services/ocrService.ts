/**
 * ocrService — DEUX moteurs OCR avec bascule automatique online/offline.
 *
 *  • EN LIGNE → Google Cloud Vision (haute précision), via la Netlify Function
 *    `/.netlify/functions/ocr-receipt` (la clé reste serveur, jamais côté client).
 *  • HORS-LIGNE (ou échec/timeout Vision) → repli Tesseract.js (Phase 1), 100 % local,
 *    gratuit, sans réseau ni clé.
 *
 * Point d'entrée unique : `recognize(blob)` choisit le moteur et renvoie le moteur réellement
 * utilisé (`engine`) pour le tracer dans `transaction_receipts.ocr_engine`.
 *
 * Tesseract (Phase 1) : tous les assets (worker, cœur WASM, données de langue française) sont
 * SERVIS LOCALEMENT depuis /public/tesseract — aucun CDN au runtime. Le service worker les met
 * en cache (precache) pour un fonctionnement 100 % hors-ligne après le premier chargement.
 * OEM 1 = LSTM only → cœur `tesseract-core-simd-lstm`. corePath pointe DIRECTEMENT le fichier
 * (se termine par « .js ») pour éviter toute résolution dynamique vers un CDN.
 */

import { createWorker } from 'tesseract.js';
import { withTimeout } from '../lib/supabase';

const WORKER_PATH = '/tesseract/worker.min.js';
const CORE_PATH = '/tesseract/core/tesseract-core-simd-lstm.wasm.js';
const LANG_PATH = '/tesseract/lang';

type OcrWorker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<OcrWorker> | null = null;

/** Crée (une seule fois) le worker Tesseract configuré 100 % local. */
async function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = createWorker('fra', 1, {
      workerPath: WORKER_PATH,
      corePath: CORE_PATH,
      langPath: LANG_PATH,
      gzip: true,
    }).catch((err) => {
      // Réinitialiser pour permettre une nouvelle tentative au prochain scan.
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

/** Moteur OCR ayant produit le résultat (tracé dans `transaction_receipts.ocr_engine`). */
export type OcrEngine = 'google_vision' | 'tesseract';

export interface OcrResult {
  text: string;
  /** Confiance globale normalisée [0..1]. */
  confidence: number;
  /** Moteur réellement utilisé. */
  engine: OcrEngine;
}

/** Endpoint serveur (clé Google Vision cachée côté Netlify). */
const OCR_FUNCTION_URL = '/.netlify/functions/ocr-receipt';
/** Délai max de l'appel en ligne avant repli Tesseract. */
const ONLINE_TIMEOUT_MS = 12_000;

/** Encode un Blob en base64 (sans préfixe data:), par tranches pour éviter les gros call-stacks. */
async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Reconnaît le texte d'une image EN LIGNE via Google Cloud Vision (Netlify Function).
 * Lève une erreur en cas d'échec/timeout/texte vide → l'appelant bascule sur Tesseract.
 */
export async function recognizeOnline(imageBlob: Blob): Promise<OcrResult> {
  const base64 = await blobToBase64(imageBlob);
  const resp = await withTimeout(
    fetch(OCR_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 }),
    }),
    ONLINE_TIMEOUT_MS,
    'ocr-vision'
  );
  if (!resp.ok) throw new Error(`OCR en ligne: HTTP ${resp.status}`);
  const data = await resp.json();
  const text = typeof data?.text === 'string' ? data.text : '';
  if (!text.trim()) throw new Error('OCR en ligne: texte vide');
  const confidence =
    typeof data?.confidence === 'number' ? Math.max(0, Math.min(1, data.confidence)) : 0.9;
  return { text, confidence, engine: 'google_vision' };
}

/**
 * Reconnaît le texte d'une image (Blob/File) HORS-LIGNE via Tesseract.
 * @returns texte brut + confiance [0..1] + engine 'tesseract'
 */
export async function recognizeOffline(imageBlob: Blob): Promise<OcrResult> {
  const worker = await getWorker();
  const { data } = await worker.recognize(imageBlob);
  const confidence = typeof data.confidence === 'number' ? data.confidence / 100 : 0;
  return {
    text: data.text || '',
    confidence: Math.max(0, Math.min(1, confidence)),
    engine: 'tesseract',
  };
}

/**
 * Point d'entrée unique : choisit le moteur selon la connectivité.
 * En ligne → Google Vision ; hors-ligne ou échec/timeout Vision → repli Tesseract.
 * Ne lève JAMAIS pour cause réseau : la dégradation est silencieuse (un log).
 */
export async function recognize(imageBlob: Blob): Promise<OcrResult> {
  if (navigator.onLine) {
    try {
      return await recognizeOnline(imageBlob);
    } catch (err) {
      console.warn(
        '🧾 [ocrService] OCR en ligne (Google Vision) indisponible → repli Tesseract:',
        err
      );
    }
  }
  return recognizeOffline(imageBlob);
}

/** Libère le worker (et sa mémoire WASM). Optionnel — à appeler en fin de session de scan. */
export async function terminateOcr(): Promise<void> {
  if (workerPromise) {
    try {
      const worker = await workerPromise;
      await worker.terminate();
    } catch {
      /* worker déjà mort — sans gravité */
    } finally {
      workerPromise = null;
    }
  }
}
