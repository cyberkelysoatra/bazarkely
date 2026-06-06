/**
 * Constantes de la fonctionnalité « Scan de ticket ».
 */

/**
 * Seuil de confiance au-dessus duquel le ticket est inséré DIRECTEMENT (sans écran de revue).
 * En dessous (ou si Σ lignes ≠ total lu), l'écran de relecture/correction est présenté.
 *
 * Seuil par défaut = celui de TESSERACT (repli), volontairement PRUDENT (revue plus souvent),
 * car la lecture locale est moins fiable que l'OCR cloud.
 */
export const RECEIPT_CONFIDENCE_THRESHOLD = 0.75;

/**
 * Seuil pour GOOGLE VISION (en ligne) : le texte est nettement plus propre, donc on insère
 * directement plus volontiers. La cohérence (Σ lignes ≈ total) reste le vrai garde-fou.
 */
export const RECEIPT_CONFIDENCE_THRESHOLD_VISION = 0.6;

/** Renvoie le seuil de confiance à appliquer selon le moteur OCR ayant produit le résultat. */
export function confidenceThresholdFor(engine: string | undefined): number {
  return engine === 'google_vision'
    ? RECEIPT_CONFIDENCE_THRESHOLD_VISION
    : RECEIPT_CONFIDENCE_THRESHOLD;
}

/** Tolérance relative entre Σ des lignes et le total lu pour considérer le ticket « cohérent ». */
export const RECEIPT_COHERENCE_TOLERANCE = 0.1;
