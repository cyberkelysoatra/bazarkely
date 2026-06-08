/**
 * Projection « anti-zéro » de la consommation journalière (fonction PURE, testable,
 * sans accès Dexie/réseau). Tant qu'il n'y a pas de compteurs et que les relevés de
 * niveau tardent, on estime un débit de consommation journalier de référence
 * (m³/jour) à partir de l'historique récent, plutôt que d'afficher 0.
 *
 * Règle métier (propriétaire) : une absence de relevé n'est PAS une consommation
 * nulle. On extrapole à partir de la tendance des 3 derniers jours en priorité, en
 * tenant compte d'un % de pertes réseau (cf. PERTE_RESEAU_DEFAUT_PCT dans bilan.ts).
 */

/**
 * Fraction de la journée pendant laquelle la pompe tourne effectivement (elle se
 * coupe au niveau flotteur → jamais 24 h/24). Sert à BORNER l'estimation par débit,
 * qui n'est qu'un dernier recours : `débit × 24` brut surestime massivement
 * (≈ 122 m³/j vs ≈ 12 m³/j réellement observés). La tendance reste la référence.
 */
export const FRACTION_POMPE = 0.5;

export interface ProjectionInput {
  /** Série conso estimée par jour déjà calculée (m³/jour), triée croissante. */
  consoEstimeeParJour: { ms: number; value: number }[];
  /** Conso réseau moyenne/jour de secours (ex. estimerAutonomie.consoMoyenneJourM3). */
  consoMoyenneJourM3: number;
  /** Débit courant des pompes (m³/h) ou null. */
  debitM3h: number | null;
  /** Taux de pertes réseau (0..1). */
  pertePct: number;
}

export interface ProjectionResult {
  /** Conso journalière de référence retenue (m³/jour), nette de pertes. */
  tauxJourM3: number;
  /** Origine retenue : 'tendance3' | 'moyenne' | 'debit' | 'aucune'. */
  source: 'tendance3' | 'moyenne' | 'debit' | 'aucune';
}

/**
 * Calcule un débit de consommation journalier de référence (m³/jour) par repli en
 * cascade (priorité décroissante) :
 *  1. tendance3 — moyenne des 3 derniers jours estimés (réf. la plus fiable) ;
 *  2. moyenne   — conso réseau moyenne/jour de la fenêtre ;
 *  3. debit     — débit × 24 × FRACTION_POMPE × (1 − pertes), borné (dernier recours) ;
 *  4. aucune    — rien de calculable → 0.
 */
export function projeterConsoJour(input: ProjectionInput): ProjectionResult {
  const { consoEstimeeParJour, consoMoyenneJourM3, debitM3h, pertePct } = input;

  // 1. Tendance des 3 derniers jours (cas prioritaire et le plus fiable en pratique).
  const positifs = consoEstimeeParJour.filter((p) => p.value > 0);
  if (positifs.length > 0) {
    const last3 = consoEstimeeParJour.slice(-3);
    const avg3 = last3.reduce((acc, p) => acc + p.value, 0) / last3.length;
    // Si la queue récente est nulle (pertes ≥ conso ces jours-là) mais qu'il existe
    // des jours positifs, on retombe sur la moyenne des jours positifs pour ne pas
    // re-projeter 0 par erreur (honore la règle anti-zéro).
    const tauxJourM3 =
      avg3 > 0 ? avg3 : positifs.reduce((acc, p) => acc + p.value, 0) / positifs.length;
    return { tauxJourM3, source: 'tendance3' };
  }

  // 2. Conso réseau moyenne/jour de la fenêtre.
  if (consoMoyenneJourM3 > 0) {
    return { tauxJourM3: consoMoyenneJourM3, source: 'moyenne' };
  }

  // 3. Estimation par débit, BORNÉE (la pompe est intermittente, jamais 24 h/24).
  if (debitM3h != null && debitM3h > 0) {
    const taux = debitM3h * 24 * FRACTION_POMPE * (1 - pertePct);
    return { tauxJourM3: Math.max(0, taux), source: 'debit' };
  }

  // 4. Rien de calculable.
  return { tauxJourM3: 0, source: 'aucune' };
}
