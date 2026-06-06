/**
 * ocrService — OCR HORS-LIGNE via Tesseract.js (Phase 1, gratuit, sans clé ni réseau).
 *
 * Tous les assets (worker, cœur WASM, données de langue française) sont SERVIS LOCALEMENT
 * depuis /public/tesseract — aucun CDN au runtime. Le service worker les met en cache
 * (precache) pour un fonctionnement 100 % hors-ligne après le premier chargement.
 *
 * OEM 1 = LSTM only → cœur `tesseract-core-simd-lstm`. corePath pointe DIRECTEMENT le
 * fichier (se termine par « .js ») pour éviter toute résolution dynamique vers un CDN.
 *
 * Phase 2 (à venir) : OCR cloud haute précision (Google Vision) — ne PAS anticiper ici.
 */

import { createWorker } from 'tesseract.js';

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

export interface OcrResult {
  text: string;
  /** Confiance globale Tesseract normalisée [0..1]. */
  confidence: number;
}

/**
 * Reconnaît le texte d'une image (Blob/File) hors-ligne.
 * @returns texte brut + confiance [0..1]
 */
export async function recognizeOffline(imageBlob: Blob): Promise<OcrResult> {
  const worker = await getWorker();
  const { data } = await worker.recognize(imageBlob);
  const confidence = typeof data.confidence === 'number' ? data.confidence / 100 : 0;
  return { text: data.text || '', confidence: Math.max(0, Math.min(1, confidence)) };
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
