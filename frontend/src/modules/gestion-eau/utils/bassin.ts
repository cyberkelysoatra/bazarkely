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
 * NB : depuis l'évolution « bassin/débit », `hauteurMaxM` porte la hauteur du
 * flotteur (plafond opérationnel) → la référence du % est bien le flotteur.
 */
export function tauxRemplissage(stockMesureM3: number, dim: BassinDimensions): number | null {
  const vmax = volumeMaxM3(dim);
  if (!(vmax > 0)) return null;
  const ratio = stockMesureM3 / vmax;
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}

// ──────────────────────── Modèle physique (flotteur / trop-plein) ────────────────────────
/**
 * Modèle complet du bassin : dimensions + hauteurs de flotteur (arrêt pompes,
 * plafond opérationnel) et de trop-plein (sécurité). Source unique de vérité des
 * déductions exposée par services/eauBassinService.ts.
 */
export interface BassinModel {
  longueurM: number;
  largeurM: number;
  /** Hauteur du flotteur (m) — arrêt des pompes, plafond opérationnel. */
  hauteurFlotteurM: number;
  /** Hauteur du trop-plein (m) — sécurité, ≥ flotteur. */
  hauteurTropPleinM: number;
}

/** Déductions géométriques réutilisables. */
export interface BassinDeductions {
  /** Surface au sol S = L × l (m²). */
  surfaceM2: number;
  /** Volume utile à 100 % = S × Hf (m³) — référence du % de remplissage. */
  volumeUtileM3: number;
  /** Volume de sécurité = S × Htp (m³). */
  volumeSecuriteM3: number;
  /** m³ gagnés/perdus par cm de niveau = S × 0,01 (m³/cm). */
  m3ParCm: number;
}

/** true si le modèle est complet (4 valeurs strictement positives). */
export function isBassinModelComplete(m: Partial<BassinModel> | null | undefined): m is BassinModel {
  if (!m) return false;
  return (
    typeof m.longueurM === 'number' && m.longueurM > 0 &&
    typeof m.largeurM === 'number' && m.largeurM > 0 &&
    typeof m.hauteurFlotteurM === 'number' && m.hauteurFlotteurM > 0 &&
    typeof m.hauteurTropPleinM === 'number' && m.hauteurTropPleinM > 0
  );
}

/** Surface au sol S = L × l (m²). */
export function surfaceM2(m: Pick<BassinModel, 'longueurM' | 'largeurM'>): number {
  return m.longueurM * m.largeurM;
}

/** Stock (m³) pour un niveau donné (cm) = S × (niveau/100). */
export function stockFromNiveauCm(niveauCm: number, m: Pick<BassinModel, 'longueurM' | 'largeurM'>): number {
  return surfaceM2(m) * (niveauCm / 100);
}

/** Toutes les déductions géométriques d'un modèle complet. */
export function bassinDeductions(m: BassinModel): BassinDeductions {
  const S = surfaceM2(m);
  return {
    surfaceM2: S,
    volumeUtileM3: S * m.hauteurFlotteurM,
    volumeSecuriteM3: S * m.hauteurTropPleinM,
    m3ParCm: S * 0.01,
  };
}

/**
 * % de remplissage référencé au flotteur = stock / volumeUtile, borné à [0, 1].
 * Retourne null si le volume utile est nul/invalide.
 */
export function tauxRemplissageFlotteur(stockMesureM3: number, m: BassinModel): number | null {
  const vutile = surfaceM2(m) * m.hauteurFlotteurM;
  if (!(vutile > 0)) return null;
  const ratio = stockMesureM3 / vutile;
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}

// ──────────────────────────── Autonomie estimée (pure) ────────────────────────────

export interface AutonomieEstimee {
  /** Conso réseau moyenne par jour sur la fenêtre (m³/j). */
  consoMoyenneJourM3: number;
  /** Conso réseau moyenne par heure (m³/h). */
  consoMoyenneHeureM3: number;
  /** Heures d'autonomie restantes (stock ÷ conso horaire), null si conso nulle. */
  autonomieHeures: number | null;
  /** Horodatage ms de vidage prévu, null si conso nulle. */
  vidagePrevuMs: number | null;
}

/** Bilan minimal nécessaire au calcul d'autonomie (timestamp + conso). */
export interface BilanLiteAutonomie {
  timestamp: string;
  conso_reseau_m3?: number | null;
  conso_m3?: number | null;
}

/**
 * Estime l'autonomie à partir du stock courant et de la conso réseau moyenne
 * (repli sur la conso métrée des bilans si la conso réseau n'est pas renseignée).
 * `nowMs` injecté pour la testabilité.
 */
export function estimerAutonomie(input: {
  stockActuelM3: number | null;
  bilans: BilanLiteAutonomie[];
  fenetreJours: number;
  nowMs: number;
}): AutonomieEstimee {
  const { stockActuelM3, bilans, fenetreJours, nowMs } = input;
  const startMs = nowMs - fenetreJours * 24 * 60 * 60 * 1000;
  const totalConso = bilans.reduce((acc, b) => {
    const ms = new Date(b.timestamp).getTime();
    if (ms < startMs || ms > nowMs) return acc;
    return acc + (b.conso_reseau_m3 ?? b.conso_m3 ?? 0);
  }, 0);
  const consoMoyenneJourM3 = fenetreJours > 0 ? totalConso / fenetreJours : 0;
  const consoMoyenneHeureM3 = consoMoyenneJourM3 / 24;
  let autonomieHeures: number | null = null;
  let vidagePrevuMs: number | null = null;
  if (consoMoyenneHeureM3 > 0 && stockActuelM3 != null && stockActuelM3 > 0) {
    autonomieHeures = stockActuelM3 / consoMoyenneHeureM3;
    vidagePrevuMs = nowMs + autonomieHeures * 60 * 60 * 1000;
  }
  return { consoMoyenneJourM3, consoMoyenneHeureM3, autonomieHeures, vidagePrevuMs };
}
