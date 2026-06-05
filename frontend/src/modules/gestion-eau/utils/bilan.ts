/**
 * Moteur de bilan « par relevé en continu », détection d'anomalie, NRW et
 * détection de relevé aberrant. Fonctions PURES (aucun accès Dexie/réseau) →
 * unitairement testables. Les timestamps acceptent string ISO | number(ms) | Date.
 */

export type TS = string | number | Date;

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
  /** Apport sur l'intervalle (m³) : override | débit×Δt | Σ entrées (repli). */
  apportM3: number;
  /** Débit courant utilisé (m³/h) ou null si repli sur entrées/override. */
  debitM3hUtilise: number | null;
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

  // ── Apport sur l'intervalle (modèle « bassin/débit ») ──
  //   priorité : override explicite > Σ entrées manuelles de l'intervalle (mode « Entrée »)
  //              > débit courant × Δt > 0 (repli). Une saisie manuelle prime donc toujours
  //              sur l'estimation par débit, et l'absence des deux retombe sur l'historique.
  const dtHours = (tMs - tPrevMs) / 3_600_000;
  let apportM3: number;
  let debitM3hUtilise: number | null = null;
  if (input.apportOverrideM3 != null && input.apportOverrideM3 >= 0) {
    apportM3 = input.apportOverrideM3;
  } else if (entreesM3 > 0) {
    apportM3 = entreesM3; // override manuel : volume(s) saisi(s) pour l'intervalle
  } else if (input.debitM3h != null && input.debitM3h > 0) {
    apportM3 = input.debitM3h * dtHours;
    debitM3hUtilise = input.debitM3h;
  } else {
    apportM3 = entreesM3; // = 0 : ni entrées, ni débit → aucun apport connu
  }

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
