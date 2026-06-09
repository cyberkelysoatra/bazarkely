/**
 * Estimateur de consommation réseau (fonction PURE, testable, sans Dexie/réseau).
 * SOURCE UNIQUE de la conso estimée pour le tableau de bord ET les tendances.
 *
 * Problème corrigé (v3.46) : sur un intervalle où le bassin atteint le flotteur
 * (niveau plein), la pompe se coupe → l'apport réel < `débit × Δt`. La formule
 * `consoReseau = débit×Δt − Δstock` SURESTIME alors la consommation (mesurée en prod :
 * ~81 m³/j projetés vs ~18,8 m³/j réels).
 *
 * Principe : on ne fait confiance à `débit × Δt` que sur les intervalles FIABLES (qui
 * finissent SOUS le flotteur). Les intervalles PLAFONNÉS (finissant au flotteur, pompe
 * coupée) prennent un taux de base réaliste `consoBaseM3h` ancré sur les seuls
 * intervalles fiables — donc non circulaire et débarrassé de la surestime.
 */
import { toMs } from './bilan';
import { FRACTION_POMPE } from './projection';

export interface IntervalleConso {
  /** ms du relevé de fin de l'intervalle (= jour d'imputation). */
  ms: number;
  /** Conso réseau NETTE de pertes (m³) retenue pour l'intervalle. */
  consoNetteM3: number;
  /** true si l'intervalle a été plafonné (fini au flotteur). */
  plafonne: boolean;
}

export interface ConsoEstimeeInput {
  relevesBassin: { timestamp: string | number | Date; volume_m3: number }[];
  entrees: { timestamp: string | number | Date; volume_m3: number }[];
  debitM3h: number | null;
  /** volumeMaxM3(dim) ; null si bassin non configuré. */
  volumeFlotteurM3: number | null;
  /** Repli d'ancrage (estimerAutonomie.consoMoyenneHeureM3). */
  consoMoyenneHeureM3: number;
  /** PERTE_RESEAU_DEFAUT_PCT (0..1). */
  pertePct: number;
  /** Seuil τ de détection « au flotteur » (défaut 0,95). */
  seuilFlotteur?: number;
}

interface IntervalleBrut {
  ms: number;
  dtH: number;
  /** Conso réseau brute (apport − Δstock), bornée ≥ 0. */
  consoBrut: number;
  plafonne: boolean;
}

/**
 * Calcule la conso estimée NETTE par intervalle, en plafonnant les intervalles
 * « parqués au flotteur » (pompe intermittente) sur un taux de base réaliste.
 */
export function calculerConsoEstimee(input: ConsoEstimeeInput): IntervalleConso[] {
  const { relevesBassin, entrees, debitM3h, volumeFlotteurM3, consoMoyenneHeureM3, pertePct } = input;
  const tau = input.seuilFlotteur ?? 0.95;

  // Trie par date (timestamps tolérants : string ISO | ms | Date).
  const sorted = relevesBassin
    .map((r) => ({ ms: toMs(r.timestamp), volume: r.volume_m3 }))
    .filter((r) => Number.isFinite(r.ms))
    .sort((a, b) => a.ms - b.ms);

  // 1ʳᵉ passe : conso brute par intervalle + classification fiable/plafonné.
  const bruts: IntervalleBrut[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const dtH = (cur.ms - prev.ms) / 3_600_000;
    if (!(dtH > 0)) continue;

    const entreesInt = entrees.reduce((acc, e) => {
      const ms = toMs(e.timestamp);
      return ms > prev.ms && ms <= cur.ms ? acc + e.volume_m3 : acc;
    }, 0);

    const apportBrut =
      entreesInt > 0 ? entreesInt : debitM3h != null && debitM3h > 0 ? debitM3h * dtH : 0;
    const consoBrut = Math.max(0, apportBrut - (cur.volume - prev.volume));

    // Plafonné = fini au flotteur ET apport estimé par débit (jamais une entrée manuelle).
    const plafonne =
      volumeFlotteurM3 != null &&
      volumeFlotteurM3 > 0 &&
      cur.volume >= tau * volumeFlotteurM3 &&
      entreesInt === 0;

    bruts.push({ ms: cur.ms, dtH, consoBrut, plafonne });
  }

  // Ancrage : taux de base (m³/h) = moyenne consoBrut/h des intervalles FIABLES.
  const fiables = bruts.filter((b) => !b.plafonne);
  let consoBaseM3h: number;
  if (fiables.length > 0) {
    consoBaseM3h = fiables.reduce((acc, b) => acc + b.consoBrut / b.dtH, 0) / fiables.length;
  } else if (consoMoyenneHeureM3 > 0) {
    consoBaseM3h = consoMoyenneHeureM3;
  } else if (debitM3h != null && debitM3h > 0) {
    consoBaseM3h = debitM3h * FRACTION_POMPE;
  } else {
    consoBaseM3h = 0;
  }

  // 2ᵉ passe : conso retenue (plafonnés ← taux de base) puis nette de pertes.
  return bruts.map((b) => {
    const consoRetenue = b.plafonne ? consoBaseM3h * b.dtH : b.consoBrut;
    const consoNetteM3 = Math.max(0, consoRetenue * (1 - pertePct));
    return { ms: b.ms, consoNetteM3, plafonne: b.plafonne };
  });
}

/**
 * Taux de base d'ancrage (m³/h) exposé pour le diagnostic/rapport (mêmes replis que
 * `calculerConsoEstimee`). Utile pour journaliser `consoBase` sans dupliquer la logique.
 */
export function consoBaseM3hOf(input: ConsoEstimeeInput): number {
  const { relevesBassin, entrees, debitM3h, volumeFlotteurM3, consoMoyenneHeureM3 } = input;
  const tau = input.seuilFlotteur ?? 0.95;
  const sorted = relevesBassin
    .map((r) => ({ ms: toMs(r.timestamp), volume: r.volume_m3 }))
    .filter((r) => Number.isFinite(r.ms))
    .sort((a, b) => a.ms - b.ms);
  const rates: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const dtH = (cur.ms - prev.ms) / 3_600_000;
    if (!(dtH > 0)) continue;
    const entreesInt = entrees.reduce((acc, e) => {
      const ms = toMs(e.timestamp);
      return ms > prev.ms && ms <= cur.ms ? acc + e.volume_m3 : acc;
    }, 0);
    const plafonne =
      volumeFlotteurM3 != null && volumeFlotteurM3 > 0 && cur.volume >= tau * volumeFlotteurM3 && entreesInt === 0;
    if (plafonne) continue;
    const apportBrut = entreesInt > 0 ? entreesInt : debitM3h != null && debitM3h > 0 ? debitM3h * dtH : 0;
    const consoBrut = Math.max(0, apportBrut - (cur.volume - prev.volume));
    rates.push(consoBrut / dtH);
  }
  if (rates.length > 0) return rates.reduce((a, b) => a + b, 0) / rates.length;
  if (consoMoyenneHeureM3 > 0) return consoMoyenneHeureM3;
  if (debitM3h != null && debitM3h > 0) return debitM3h * FRACTION_POMPE;
  return 0;
}
