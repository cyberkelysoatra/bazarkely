/**
 * Moteur de bilan « par relevé en continu », détection d'anomalie, NRW et
 * détection de relevé aberrant. Fonctions PURES (aucun accès Dexie/réseau) →
 * unitairement testables. Les timestamps acceptent string ISO | number(ms) | Date.
 */

export type TS = string | number | Date;

/**
 * Taux de pertes réseau par défaut (évaporation + fuites de canalisation entre le
 * bassin et les abonnés) utilisé pour ESTIMER la consommation réelle tant qu'il n'y
 * a pas de compteurs. Valeur figée à partir des repères publics de "non-revenue water"
 * (NRW) : dans les pays en développement, 40–60 % de l'eau produite est perdue (les
 * pertes physiques/fuites en représentant une large part) ; le seuil "bon réseau"
 * recommandé est ~25 %. On retient une valeur médiane prudente pour un petit réseau.
 * Sources : World Bank (NRW) ; IWA / Aquatech "Essential guide NRW".
 */
export const PERTE_RESEAU_DEFAUT_PCT = 0.30; // 30 %

/**
 * Fraction de temps de marche EFFECTIVE de la pompe sur un intervalle. La pompe est
 * intermittente : elle se coupe au niveau flotteur et ne tourne pas en continu. Donc
 * `débit × Δt` (qui suppose une marche continue) surestime l'apport réel sur un
 * intervalle. On pondère l'apport estimé par débit par ce facteur. Valeur prudente par
 * défaut (≈ 50 % du temps), à exposer en configuration admin ultérieurement.
 *
 * SOURCE UNIQUE de vérité de la « fraction de marche / plafond pompe » du module :
 *  - utils/projection.ts et utils/consoEstimee.ts la RÉ-EXPORTENT (jamais de doublon) ;
 *  - le modèle d'apport « flotteur » (cf. `estimerApportFlotteur`) ne s'en sert plus
 *    que comme REPLI documenté quand aucun niveau n'est exploitable — le plafond
 *    physique réel étant désormais le volume au flotteur `V_flotteur = surface × Hf`.
 */
export const FRACTION_POMPE = 0.5;

/** Petite tolérance numérique pour comparer des volumes (m³). */
const EPS_M3 = 1e-6;

export function toMs(t: TS): number {
  if (typeof t === 'number') return t;
  if (t instanceof Date) return t.getTime();
  return new Date(t).getTime();
}

// ─────────── formes minimales attendues par le moteur (sous-ensembles) ───────────
export interface ReleveCompteurLite {
  compteur_id: string;
  index: number;
  rupture_index: boolean;
  timestamp: TS;
}
export interface CompteurLite {
  id: string;
  actif: boolean;
}
export interface EntreeLite {
  volume_m3: number;
  timestamp: TS;
}
export interface ReleveBassinLite {
  volume_m3: number;
  timestamp: TS;
}

/**
 * Conso d'un compteur sur l'intervalle ]tPrev, t] :
 *   conso = index(dernier relevé ≤ t) − index(dernier relevé ≤ tPrev)
 * Renvoie 0 si pas de baseline (aucun relevé ≤ tPrev) OU rupture d'index dans l'intervalle.
 */
export function consoCompteurSurIntervalle(
  relevesDuCompteur: ReleveCompteurLite[],
  tPrevMs: number,
  tMs: number
): number {
  // Baseline : dernier relevé ≤ tPrev
  let baseline: ReleveCompteurLite | null = null;
  for (const r of relevesDuCompteur) {
    const ms = toMs(r.timestamp);
    if (ms <= tPrevMs) {
      if (!baseline || ms > toMs(baseline.timestamp)) baseline = r;
    }
  }
  if (!baseline) return 0; // pas de baseline → 0

  // Rupture dans l'intervalle ]tPrev, t] → 0
  const ruptureDansIntervalle = relevesDuCompteur.some((r) => {
    const ms = toMs(r.timestamp);
    return ms > tPrevMs && ms <= tMs && r.rupture_index === true;
  });
  if (ruptureDansIntervalle) return 0;

  // Dernier relevé ≤ t
  let courant: ReleveCompteurLite | null = null;
  for (const r of relevesDuCompteur) {
    const ms = toMs(r.timestamp);
    if (ms <= tMs) {
      if (!courant || ms > toMs(courant.timestamp)) courant = r;
    }
  }
  if (!courant) return 0;

  const conso = courant.index - baseline.index;
  return conso > 0 ? conso : 0;
}

// ─────────────────────────── Modèle d'apport « flotteur » ───────────────────────────
/**
 * Mode d'estimation de l'apport retenu sur l'intervalle (pilote le libellé UI) :
 *  - 'override'        : apport imposé manuellement (correction).
 *  - 'entrees'         : somme des entrées manuelles saisies sur l'intervalle.
 *  - 'mesure'          : bilan de matière exact (Δstock + conso métrée), pompe = simple compensation.
 *  - 'mesure_plafonnee': idem, mais borné par le remplissage au flotteur (V_flotteur − stockPrev).
 *  - 'debit'           : repli — aucun signal de niveau exploitable → débit × Δt × FRACTION_POMPE.
 *  - 'debit_plafonne'  : idem repli, mais borné au remplissage flotteur.
 *  - 'aucun'           : ni apport mesurable, ni débit → 0.
 */
export type ApportMode =
  | 'override'
  | 'entrees'
  | 'mesure'
  | 'mesure_plafonnee'
  | 'debit'
  | 'debit_plafonne'
  | 'aucun';

export interface EstimerApportInput {
  /** Volume du bassin au relevé précédent (m³). */
  stockPrev: number;
  /** Volume mesuré du bassin au relevé courant (m³). */
  stockMesure: number;
  /** Consommation métrée des compteurs sur l'intervalle (m³). */
  consoM3: number;
  /** Durée de l'intervalle (heures). */
  dtHours: number;
  /** Débit courant des pompes (m³/h) ou null. */
  debitM3h: number | null;
  /** Somme des entrées manuelles de l'intervalle (m³). */
  entreesM3: number;
  /** Apport manuel imposé (m³) ou null. */
  apportOverrideM3: number | null;
  /** Surface au sol du bassin (m²) ou null si inconnue. */
  surfaceM2: number | null;
  /** Hauteur du flotteur (m) ou null si inconnue. */
  hauteurFlotteurM: number | null;
  /** Bande d'hystérésis du flotteur (m) — défaut 0,10. */
  bandFlotteurM: number | null;
}

export interface EstimerApportResult {
  /** Apport retenu sur l'intervalle (m³). */
  apportM3: number;
  /** Débit courant utilisé (m³/h) ou null si repli sur niveaux/override/entrées. */
  debitM3hUtilise: number | null;
  /** Mode d'estimation retenu (pilote le libellé UI). */
  mode: ApportMode;
}

/**
 * Estime l'apport d'eau (les « revenus ») sur un intervalle selon le modèle PHYSIQUE
 * « flotteur ». La pompe est intermittente : elle remplit jusqu'au flotteur puis
 * s'arrête, et repart ~`band` cm plus bas. Conséquence : `débit × Δt` (marche continue)
 * SURESTIME l'apport. On préfère donc le BILAN DE MATIÈRE exact :
 *
 *   apport = max(0, Δstock + conso métrée)   (la pompe n'a fait que compenser)
 *
 * borné par le remplissage possible jusqu'au flotteur (`V_flotteur − stockPrev`) — la
 * pompe ne peut pas remplir au-delà du flotteur. Quand le niveau ne donne AUCUN signal
 * (bassin plat sans compteur, Δstock = 0 & conso = 0) mais qu'un débit est connu, on
 * retombe sur `débit × Δt × FRACTION_POMPE`, lui aussi plafonné au remplissage flotteur.
 *
 * Priorité (inchangée) : override > entrées manuelles > estimation (mesuré → repli débit).
 * Fonction PURE : tous les paramètres (surface, flotteur, bande) sont injectés.
 */
export function estimerApportFlotteur(input: EstimerApportInput): EstimerApportResult {
  const {
    stockPrev, stockMesure, consoM3, dtHours, debitM3h, entreesM3, apportOverrideM3,
    surfaceM2, hauteurFlotteurM, bandFlotteurM,
  } = input;
  // Bande d'hystérésis : repli sur 0,10 m si absente/invalide (garde-fou, jamais de plantage).
  const bandM = bandFlotteurM != null && bandFlotteurM > 0 ? bandFlotteurM : 0.1;

  // 1. Override manuel imposé (correction explicite).
  if (apportOverrideM3 != null && apportOverrideM3 >= 0) {
    return { apportM3: apportOverrideM3, debitM3hUtilise: null, mode: 'override' };
  }
  // 2. Entrées manuelles saisies sur l'intervalle (mode « Entrée »).
  if (entreesM3 > 0) {
    return { apportM3: entreesM3, debitM3hUtilise: null, mode: 'entrees' };
  }

  // Plafond physique : volume au flotteur (V_flotteur), volume de redémarrage (V_bas =
  // surface × (Hf − band)) et remplissage encore possible jusqu'au flotteur.
  const vFlotteur =
    surfaceM2 != null && surfaceM2 > 0 && hauteurFlotteurM != null && hauteurFlotteurM > 0
      ? surfaceM2 * hauteurFlotteurM
      : null;
  const vBas =
    vFlotteur != null && surfaceM2 != null && hauteurFlotteurM != null
      ? surfaceM2 * Math.max(0, hauteurFlotteurM - bandM)
      : null;
  const capRemplissage = vFlotteur != null ? Math.max(0, vFlotteur - stockPrev) : null;

  const deltaStock = stockMesure - stockPrev;
  // 3. Bilan de matière : l'apport a compensé la variation de stock + la conso métrée.
  const massBalance = Math.max(0, deltaStock + consoM3);

  if (massBalance > EPS_M3) {
    // Signal de niveau/conso exploitable → mode mesuré, borné au flotteur.
    if (capRemplissage != null && massBalance > capRemplissage + EPS_M3) {
      return { apportM3: capRemplissage, debitM3hUtilise: debitM3h ?? null, mode: 'mesure_plafonnee' };
    }
    return { apportM3: massBalance, debitM3hUtilise: debitM3h ?? null, mode: 'mesure' };
  }

  // 4. Aucun signal de niveau (Δstock ≤ 0 & conso 0). Si le niveau a BAISSÉ, la pompe
  //    était à l'arrêt → apport 0. Si le niveau est PLAT et qu'un débit est connu, la
  //    pompe a pu compenser une conso non observée → repli débit × Δt × FRACTION_POMPE,
  //    plafonné au remplissage flotteur (jamais au-delà de V_flotteur − stockPrev).
  //    Quand le flotteur est connu, on n'attribue ce repli que si le bassin est DANS la
  //    bande de régulation (stockPrev ≥ V_bas) — c'est là que le flotteur fait cycler la
  //    pompe ; un bassin plat nettement sous la bande est ambigu → apport 0 (anti-sur-estim.).
  const dansBandeRegulation = vBas == null || stockPrev >= vBas - EPS_M3;
  if (deltaStock >= -EPS_M3 && dansBandeRegulation && debitM3h != null && debitM3h > 0 && dtHours > 0) {
    const apportDebit = debitM3h * dtHours * FRACTION_POMPE;
    if (capRemplissage != null && apportDebit > capRemplissage + EPS_M3) {
      return { apportM3: capRemplissage, debitM3hUtilise: debitM3h, mode: 'debit_plafonne' };
    }
    return { apportM3: apportDebit, debitM3hUtilise: debitM3h, mode: 'debit' };
  }

  // 5. Rien d'exploitable → aucun apport connu.
  return { apportM3: 0, debitM3hUtilise: null, mode: 'aucun' };
}

/**
 * Ré-déduit, depuis un bilan déjà calculé/stocké, si l'apport vient du REPLI DÉBIT
 * (true) ou du bilan de matière « mesuré » (false). En mode mesuré l'apport ne dépasse
 * jamais le bilan de matière `max(0, Δstock + conso)` (il en est le min avec le plafond
 * flotteur) ; le repli débit n'est déclenché que lorsque ce bilan vaut 0 et produit un
 * apport > 0 → la comparaison est un discriminant fiable, sans persister le mode.
 */
export function isApportDebitMode(bilan: {
  apport_m3?: number | null;
  stock_mesure?: number | null;
  stock_prev?: number | null;
  conso_m3?: number | null;
}): boolean {
  const apport = bilan.apport_m3 ?? 0;
  const massBalance = Math.max(
    0,
    (bilan.stock_mesure ?? 0) - (bilan.stock_prev ?? 0) + (bilan.conso_m3 ?? 0)
  );
  return apport > massBalance + EPS_M3;
}

export interface ComputeBilanInput {
  /** Timestamp du relevé de niveau courant. */
  currentTimestamp: TS;
  /** Volume mesuré du bassin au relevé courant (m³). */
  stockMesureM3: number;
  /** Tous les relevés de niveau connus (sert à trouver le relevé précédent). */
  relevesBassin: ReleveBassinLite[];
  /** Toutes les entrées du bassin. */
  entrees: EntreeLite[];
  /** Compteurs actifs uniquement. */
  compteursActifs: CompteurLite[];
  /** Tous les relevés compteur. */
  relevesCompteur: ReleveCompteurLite[];
  seuilM3: number;
  seuilPct: number;
  /**
   * Évolution « bassin/débit » — débit courant des pompes (m³/h) supposé stable.
   * Si fourni (> 0), l'apport sur l'intervalle = débit × Δt(h). Sinon repli sur
   * les entrées manuelles (rétrocompatibilité). Ignoré si `apportOverrideM3` fourni.
   */
  debitM3h?: number | null;
  /** Apport manuel imposé pour l'intervalle (m³) — prioritaire sur le débit. */
  apportOverrideM3?: number | null;
  // ── Modèle d'apport « flotteur » (Phase 3, injectés depuis la config) ──
  /** Surface au sol du bassin (m²), pour le plafond `V_flotteur`. null si inconnue. */
  surfaceM2?: number | null;
  /** Hauteur du flotteur (m) — plafond opérationnel. null si inconnue. */
  hauteurFlotteurM?: number | null;
  /** Bande d'hystérésis du flotteur (m) — défaut 0,10 si absent. */
  bandFlotteurM?: number | null;
}

export interface BilanResult {
  timestamp: number;
  timestampPrev: number | null;
  stockPrev: number;
  entreesM3: number;
  consoM3: number;
  stockAttendu: number;
  stockMesure: number;
  ecartM3: number;
  ecartPct: number;
  anomalie: boolean;
  // ── Modèle « bassin/débit » (additif) ──
  /** Apport sur l'intervalle (m³) : override | entrées | flotteur (mesuré/plafonné) | débit. */
  apportM3: number;
  /** Débit courant utilisé (m³/h) ou null si repli sur entrées/override/niveaux. */
  debitM3hUtilise: number | null;
  /** Mode d'estimation de l'apport retenu (pilote le libellé UI). */
  apportMode: ApportMode;
  /** Conso vers le réseau = apport − Δstock (m³). */
  consoReseauM3: number;
  /** Pertes = conso réseau − conso compteurs (m³). */
  pertesM3: number;
  /** NRW réseau = pertes / conso réseau × 100 (%). */
  nrwReseauPct: number;
  /** Anomalie selon le modèle réseau (pertes > seuilM3 OU NRW% > seuilPct). */
  anomalieReseau: boolean;
}

/**
 * Calcule un bilan au relevé de niveau courant.
 * Retourne `null` s'il n'existe aucun relevé de niveau précédent (pas de baseline
 * bassin) → ce relevé ne sert que de référence pour le prochain bilan.
 */
export function computeBilan(input: ComputeBilanInput): BilanResult | null {
  const tMs = toMs(input.currentTimestamp);

  // Relevé de niveau précédent : max timestamp STRICTEMENT < t
  let prev: ReleveBassinLite | null = null;
  for (const r of input.relevesBassin) {
    const ms = toMs(r.timestamp);
    if (ms < tMs) {
      if (!prev || ms > toMs(prev.timestamp)) prev = r;
    }
  }
  if (!prev) return null; // pas de baseline → pas de bilan

  const tPrevMs = toMs(prev.timestamp);
  const stockPrev = prev.volume_m3;

  // Entrées dans ]tPrev, t]
  const entreesM3 = input.entrees.reduce((acc, e) => {
    const ms = toMs(e.timestamp);
    return ms > tPrevMs && ms <= tMs ? acc + e.volume_m3 : acc;
  }, 0);

  // Conso par compteur actif
  let consoM3 = 0;
  for (const c of input.compteursActifs) {
    const relevesC = input.relevesCompteur.filter((r) => r.compteur_id === c.id);
    consoM3 += consoCompteurSurIntervalle(relevesC, tPrevMs, tMs);
  }

  const stockMesure = input.stockMesureM3;

  // ── Apport sur l'intervalle (modèle d'apport « flotteur », Phase 3) ──
  //   La pompe étant intermittente (arrêt au flotteur), on n'utilise plus `débit × Δt`
  //   (marche continue, surestime) : l'apport est le BILAN DE MATIÈRE exact (Δstock +
  //   conso métrée), borné au remplissage flotteur ; repli documenté sur le débit
  //   plafonné quand aucun niveau n'est exploitable. Priorité override > entrées > estimation.
  const dtHours = (tMs - tPrevMs) / 3_600_000;
  const { apportM3, debitM3hUtilise, mode: apportMode } = estimerApportFlotteur({
    stockPrev,
    stockMesure,
    consoM3,
    dtHours,
    debitM3h: input.debitM3h ?? null,
    entreesM3,
    apportOverrideM3: input.apportOverrideM3 ?? null,
    surfaceM2: input.surfaceM2 ?? null,
    hauteurFlotteurM: input.hauteurFlotteurM ?? null,
    bandFlotteurM: input.bandFlotteurM ?? null,
  });

  // Stock attendu basé sur l'apport (≡ entrées quand aucun débit/override → rétrocompatible).
  const stockAttendu = stockPrev + apportM3 - consoM3;
  const ecartM3 = stockMesure - stockAttendu;
  const denom = Math.max(apportM3, consoM3, 1);
  const ecartPct = (Math.abs(ecartM3) / denom) * 100;
  const anomalie = Math.abs(ecartM3) > input.seuilM3 || ecartPct > input.seuilPct;

  // Conso réseau / pertes / NRW réseau.
  const consoReseauM3 = apportM3 - (stockMesure - stockPrev);
  const pertesM3 = consoReseauM3 - consoM3;
  const nrwReseauPct = consoReseauM3 > 0 ? (pertesM3 / consoReseauM3) * 100 : 0;
  const anomalieReseau = pertesM3 > input.seuilM3 || nrwReseauPct > input.seuilPct;

  return {
    timestamp: tMs,
    timestampPrev: tPrevMs,
    stockPrev,
    entreesM3,
    consoM3,
    stockAttendu,
    stockMesure,
    ecartM3,
    ecartPct,
    anomalie,
    apportM3,
    debitM3hUtilise,
    apportMode,
    consoReseauM3,
    pertesM3,
    nrwReseauPct,
    anomalieReseau,
  };
}

export interface NRWResult {
  pertesM3: number;
  nrwPct: number;
}

/**
 * NRW (Non-Revenue Water) sur une période :
 *   pertesM3 = entréesΣ − consoΣ ; NRW% = pertesM3 / entréesΣ × 100
 * Retourne 0 % si aucune entrée (évite la division par zéro).
 */
export function computeNRW(entreesTotalM3: number, consoTotalM3: number): NRWResult {
  const pertesM3 = entreesTotalM3 - consoTotalM3;
  const nrwPct = entreesTotalM3 > 0 ? (pertesM3 / entreesTotalM3) * 100 : 0;
  return { pertesM3, nrwPct };
}

// ─────────────────────────── Détection de relevé aberrant ───────────────────────────
export interface AberrantResult {
  aberrant: boolean;
  type: 'haut' | 'bas' | null;
}

/** Moyenne arithmétique d'un tableau (0 si vide). */
export function moyenne(valeurs: number[]): number {
  if (valeurs.length === 0) return 0;
  return valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
}

/**
 * Détecte un relevé aberrant par rapport à la moyenne historique des consos :
 *  - aberrant HAUT  : conso > moyenne × facteur
 *  - aberrant BAS   : conso < moyenne ÷ facteur (anormalement basse)
 * Si la moyenne historique est nulle/absente (≤ 0) → jamais aberrant (pas d'historique).
 */
export function detectAberrant(conso: number, moyenneHist: number, facteur: number): AberrantResult {
  if (!(moyenneHist > 0) || !(facteur > 1)) return { aberrant: false, type: null };
  if (conso > moyenneHist * facteur) return { aberrant: true, type: 'haut' };
  if (conso < moyenneHist / facteur) return { aberrant: true, type: 'bas' };
  return { aberrant: false, type: null };
}
