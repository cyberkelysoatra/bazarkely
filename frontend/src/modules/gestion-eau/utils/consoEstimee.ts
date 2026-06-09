/**
 * Estimateur de consommation réseau (fonction PURE, testable, sans Dexie/réseau).
 * SOURCE UNIQUE de la conso estimée pour le tableau de bord ET les tendances.
 *
 * Problème corrigé (v3.45.2) : la formule `consoReseau = débit×Δt − Δstock` suppose la
 * pompe en MARCHE CONTINUE. Or la pompe est intermittente (elle se coupe au flotteur,
 * et plus largement ne tourne pas dès que le bassin ne monte pas). Sur tout intervalle
 * où le bassin NE MONTE PAS, `débit×Δt` n'a pas coulé en entier → l'apport (donc la
 * conso) est gonflé. Mesuré en prod : ~81 m³/j estimés vs ~18,8 m³/j réels.
 *
 * Principe physique retenu : la consommation n'est DIRECTEMENT OBSERVABLE que sur les
 * intervalles de VIDAGE (le niveau baisse, pompe à l'arrêt) → conso = −Δstock, sans
 * hypothèse sur la pompe. On ancre un taux de base réaliste `consoBaseM3h` sur ces
 * intervalles, et on l'applique aux intervalles MONTANTS/PLATS (où la conso est masquée
 * par le remplissage et où `débit×Δt` surestimerait). Une saisie manuelle d'entrée reste
 * traitée par bilan direct (apport connu).
 *
 * NB : ancrer sur le vidage suppose la pompe coupée pendant la baisse — c'est une borne
 * basse (si la pompe tournait un peu, la conso réelle serait un peu supérieure), mais
 * c'est l'estimation observable la plus fiable et elle recale l'ordre de grandeur.
 */
import { toMs } from './bilan';
import { FRACTION_POMPE } from './projection';

export interface IntervalleConso {
  /** ms du relevé de fin de l'intervalle (= jour d'imputation). */
  ms: number;
  /** Conso réseau NETTE de pertes (m³) retenue pour l'intervalle. */
  consoNetteM3: number;
  /**
   * true si la conso a été ESTIMÉE via le taux de base (intervalle montant/plat, conso
   * non directement observable) ; false si OBSERVÉE (vidage) ou saisie manuelle.
   */
  plafonne: boolean;
}

export interface ConsoEstimeeInput {
  relevesBassin: { timestamp: string | number | Date; volume_m3: number }[];
  entrees: { timestamp: string | number | Date; volume_m3: number }[];
  debitM3h: number | null;
  /** Repli d'ancrage (estimerAutonomie.consoMoyenneHeureM3). */
  consoMoyenneHeureM3: number;
  /** PERTE_RESEAU_DEFAUT_PCT (0..1). */
  pertePct: number;
}

type TypeIntervalle = 'vidage' | 'manuel' | 'estime';
interface IntervalleBrut {
  ms: number;
  dtH: number;
  type: TypeIntervalle;
  /** Conso observée (vidage/manuel) ; ignorée si type 'estime'. */
  consoObs: number;
}

/** 1ʳᵉ passe : classe chaque intervalle et calcule la conso observable. */
function classer(input: ConsoEstimeeInput): IntervalleBrut[] {
  const { relevesBassin, entrees } = input;
  const sorted = relevesBassin
    .map((r) => ({ ms: toMs(r.timestamp), volume: r.volume_m3 }))
    .filter((r) => Number.isFinite(r.ms))
    .sort((a, b) => a.ms - b.ms);

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
    const dstock = cur.volume - prev.volume;

    if (entreesInt > 0) {
      // Apport connu (entrée manuelle) → bilan direct, jamais estimé.
      bruts.push({ ms: cur.ms, dtH, type: 'manuel', consoObs: Math.max(0, entreesInt - dstock) });
    } else if (dstock < 0) {
      // Vidage : le niveau baisse, pompe à l'arrêt → conso observable = −Δstock.
      bruts.push({ ms: cur.ms, dtH, type: 'vidage', consoObs: -dstock });
    } else {
      // Montée/plat : conso masquée par le remplissage → à estimer via le taux de base.
      bruts.push({ ms: cur.ms, dtH, type: 'estime', consoObs: 0 });
    }
  }
  return bruts;
}

/**
 * Taux de base d'ancrage (m³/h) = moyenne du rythme de conso observé sur les intervalles
 * de VIDAGE (anti-circularité : aucune hypothèse de pompe). Replis si aucun vidage :
 * (1) consoMoyenneHeureM3 ; (2) débit × FRACTION_POMPE ; (3) 0.
 */
export function consoBaseM3hOf(input: ConsoEstimeeInput): number {
  const { debitM3h, consoMoyenneHeureM3 } = input;
  const vidages = classer(input).filter((b) => b.type === 'vidage');
  if (vidages.length > 0) {
    return vidages.reduce((acc, b) => acc + b.consoObs / b.dtH, 0) / vidages.length;
  }
  if (consoMoyenneHeureM3 > 0) return consoMoyenneHeureM3;
  if (debitM3h != null && debitM3h > 0) return debitM3h * FRACTION_POMPE;
  return 0;
}

/**
 * Calcule la conso estimée NETTE par intervalle. Les intervalles montants/plats (où
 * `débit×Δt` surestimerait) prennent `consoBase × Δt` ; vidages et entrées manuelles
 * gardent leur conso observée. Tout est net de pertes réseau.
 */
export function calculerConsoEstimee(input: ConsoEstimeeInput): IntervalleConso[] {
  const { pertePct } = input;
  const bruts = classer(input);
  const consoBaseM3h = consoBaseM3hOf(input);

  return bruts.map((b) => {
    const consoRetenue = b.type === 'estime' ? consoBaseM3h * b.dtH : b.consoObs;
    return {
      ms: b.ms,
      consoNetteM3: Math.max(0, consoRetenue * (1 - pertePct)),
      plafonne: b.type === 'estime',
    };
  });
}
