/**
 * Conversions liées au bassin (parallélépipède rectangle).
 * Toutes les dimensions sont en mètres ; la hauteur mesurée est saisie en cm.
 */

export interface BassinDimensions {
  /** Longueur en mètres. */
  longueurM: number;
  /** Largeur en mètres. */
  largeurM: number;
  /** Hauteur maximale (m) — sert au calcul du % de remplissage. */
  hauteurMaxM: number;
}

/** true si les 3 dimensions sont présentes et strictement positives. */
export function isBassinConfigured(dim: Partial<BassinDimensions> | null | undefined): dim is BassinDimensions {
  if (!dim) return false;
  const { longueurM, largeurM, hauteurMaxM } = dim;
  return (
    typeof longueurM === 'number' && longueurM > 0 &&
    typeof largeurM === 'number' && largeurM > 0 &&
    typeof hauteurMaxM === 'number' && hauteurMaxM > 0
  );
}

/** Volume max du bassin (m³) = L × l × hauteurMax. */
export function volumeMaxM3(dim: BassinDimensions): number {
  return dim.longueurM * dim.largeurM * dim.hauteurMaxM;
}

/**
 * Convertit une hauteur mesurée (cm) en volume (m³) :
 *   volumeM3 = L × l × (hauteurCm / 100)
 */
export function hauteurCmToVolumeM3(hauteurCm: number, dim: Pick<BassinDimensions, 'longueurM' | 'largeurM'>): number {
  return dim.longueurM * dim.largeurM * (hauteurCm / 100);
}

/**
 * % de remplissage = stockMesure / volumeMax, borné à [0, 1].
 * Retourne null si le volume max est nul/invalide.
 */
export function tauxRemplissage(stockMesureM3: number, dim: BassinDimensions): number | null {
  const vmax = volumeMaxM3(dim);
  if (!(vmax > 0)) return null;
  const ratio = stockMesureM3 / vmax;
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}
