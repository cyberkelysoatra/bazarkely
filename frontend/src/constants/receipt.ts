/**
 * Constantes de la fonctionnalité « Scan de ticket ».
 */

/**
 * Seuil de confiance au-dessus duquel le ticket est inséré DIRECTEMENT (sans écran de revue).
 * En dessous (ou si Σ lignes ≠ total lu), l'écran de relecture/correction est présenté.
 * Configurable — calibré après observation de la qualité réelle de l'OCR Tesseract (Phase 1).
 */
export const RECEIPT_CONFIDENCE_THRESHOLD = 0.75;

/** Tolérance relative entre Σ des lignes et le total lu pour considérer le ticket « cohérent ». */
export const RECEIPT_COHERENCE_TOLERANCE = 0.1;
