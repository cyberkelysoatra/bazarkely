/**
 * Logique PURE du débit des pompes (test « vanne fermée ») → testable sans Dexie.
 *
 * Principe : vanne de sortie fermée, on mesure la montée de niveau (cm) du bassin
 * pendant une durée (min). Le débit d'apport est :
 *   Q_in (m³/h) = S × ((niveauFin − niveauDébut)/100) ÷ (durée/60)
 * où S = surface au sol (m²). Le dernier test = débit courant supposé stable.
 */

export interface ComputeDebitInput {
  niveauDebutCm: number;
  niveauFinCm: number;
  dureeMin: number;
  /** Surface au sol du bassin (m²). */
  surfaceM2: number;
}

export interface ComputeDebitResult {
  /** Débit d'apport en m³/h (≥ 0 en cas valide). */
  debitM3h: number;
  /** Volume apporté pendant le test (m³). */
  volumeM3: number;
  /** Variation de niveau (cm). */
  deltaCm: number;
  valid: boolean;
  /** Motif d'invalidité (UI), null si valide. */
  error: string | null;
}

/**
 * Calcule Q_in à partir d'un test. Cas limites :
 *  - durée ≤ 0 → refus (division impossible).
 *  - surface ≤ 0 → refus (modèle incomplet).
 *  - niveauFin ≤ niveauDébut → débit nul/négatif → invalide (à avertir).
 */
export function computeDebit(input: ComputeDebitInput): ComputeDebitResult {
  const { niveauDebutCm, niveauFinCm, dureeMin, surfaceM2 } = input;
  const deltaCm = niveauFinCm - niveauDebutCm;

  if (!(surfaceM2 > 0)) {
    return { debitM3h: 0, volumeM3: 0, deltaCm, valid: false, error: 'Configuration du bassin incomplète (surface inconnue).' };
  }
  if (!(dureeMin > 0)) {
    return { debitM3h: 0, volumeM3: 0, deltaCm, valid: false, error: 'Durée invalide (doit être strictement positive).' };
  }
  const volumeM3 = surfaceM2 * (deltaCm / 100);
  const debitM3h = volumeM3 / (dureeMin / 60);
  if (!(deltaCm > 0)) {
    return { debitM3h, volumeM3, deltaCm, valid: false, error: 'Le niveau final doit être supérieur au niveau initial.' };
  }
  return { debitM3h, volumeM3, deltaCm, valid: true, error: null };
}

/**
 * Écart relatif (%) entre le débit courant et le précédent :
 *   |courant − précédent| / précédent × 100
 * Retourne null si pas de référence (premier test ou précédent ≤ 0).
 */
export function ecartDebitPct(debitCourant: number, debitPrecedent: number | null | undefined): number | null {
  if (debitPrecedent == null || !(debitPrecedent > 0)) return null;
  return (Math.abs(debitCourant - debitPrecedent) / debitPrecedent) * 100;
}

/** true si l'écart dépasse le seuil de stabilité configuré (déf. 15 %). */
export function debitInstable(ecartPct: number | null, seuilPct: number): boolean {
  if (ecartPct == null) return false;
  return ecartPct > seuilPct;
}
