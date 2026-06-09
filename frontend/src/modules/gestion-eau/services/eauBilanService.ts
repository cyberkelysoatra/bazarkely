/**
 * Bilans (eau_bilans), NRW et agrégats du tableau de bord — offline-first.
 * Le calcul pur vit dans utils/bilan.ts ; ce service charge Dexie et persiste.
 */
import { supabase, withTimeout } from '../../../lib/supabase';
import { eauDb } from '../db/gestionEauDb';
import { pullTable, saveLocal, deleteLocal } from './eauSync';
import { newId } from '../utils/id';
import {
  computeBilan,
  computeNRW,
  PERTE_RESEAU_DEFAUT_PCT,
  type ReleveBassinLite,
  type EntreeLite,
  type ReleveCompteurLite,
  type CompteurLite,
  type NRWResult,
} from '../utils/bilan';
import { projeterConsoJour } from '../utils/projection';
import { calculerConsoEstimee } from '../utils/consoEstimee';
import { bucketByLocalDay, localDayLabel } from './eauTendanceService';
import {
  getConfig,
  seuilsFromConfig,
  dimensionsFromConfig,
} from './eauConfigService';
import { getDebitCourantM3h, estimerAutonomie, type AutonomieEstimee } from './eauBassinService';
import { tauxRemplissage, volumeMaxM3 } from '../utils/bassin';
import type {
  BilanLocal,
  ReleveBassinLocal,
  EntreeBassinLocal,
  ReleveCompteurLocal,
  CompteurLocal,
} from '../types/gestionEau';

/**
 * Calcule et enregistre un bilan déclenché par un relevé de niveau `current`.
 * Retourne le bilan créé, ou `null` s'il n'existe pas de relevé de niveau
 * précédent (le relevé courant sert alors de simple référence).
 */
export async function computeAndSaveBilan(current: {
  timestamp: string;
  volume_m3: number;
}): Promise<BilanLocal | null> {
  const [config, relevesBassin, entrees, compteurs, relevesCompteur, debitM3h] = await Promise.all([
    getConfig(),
    eauDb.eau_releves_bassin.toArray() as Promise<ReleveBassinLocal[]>,
    eauDb.eau_entrees_bassin.toArray() as Promise<EntreeBassinLocal[]>,
    eauDb.eau_compteurs.toArray() as Promise<CompteurLocal[]>,
    eauDb.eau_releves_compteur.toArray() as Promise<ReleveCompteurLocal[]>,
    getDebitCourantM3h(),
  ]);

  const { seuilM3, seuilPct } = seuilsFromConfig(config);

  const result = computeBilan({
    currentTimestamp: current.timestamp,
    stockMesureM3: current.volume_m3,
    relevesBassin: relevesBassin as ReleveBassinLite[],
    entrees: entrees as EntreeLite[],
    compteursActifs: compteurs.filter((c) => c.actif) as CompteurLite[],
    relevesCompteur: relevesCompteur as ReleveCompteurLite[],
    seuilM3,
    seuilPct,
    debitM3h,
  });

  if (!result) return null;

  const bilan: BilanLocal = {
    id: newId(),
    timestamp: new Date(result.timestamp).toISOString(),
    timestamp_prev: result.timestampPrev != null ? new Date(result.timestampPrev).toISOString() : null,
    stock_prev: result.stockPrev,
    entrees_m3: result.entreesM3,
    conso_m3: result.consoM3,
    stock_attendu: result.stockAttendu,
    stock_mesure: result.stockMesure,
    ecart_m3: result.ecartM3,
    ecart_pct: result.ecartPct,
    // Anomalie = écart de stock (héritage) OU pertes/NRW réseau (nouveau modèle).
    anomalie: result.anomalie || result.anomalieReseau,
    traitee: false,
    commentaire: null,
    apport_m3: result.apportM3,
    conso_reseau_m3: result.consoReseauM3,
    pertes_m3: result.pertesM3,
    debit_m3h_utilise: result.debitM3hUtilise,
  };

  return saveLocal('eau_bilans', bilan);
}

// ─────────────────── Recalcul ciblé (« voisins ») + complet ───────────────────
/**
 * Supprime le(s) bilan(s) dont le `timestamp` correspond à `timestamp` (Dexie +
 * Supabase). Sert à retirer un bilan devenu orphelin (à un horodatage qui n'a
 * plus de relevé) avant un recalcul ciblé. La comparaison se fait sur l'instant
 * (getTime) pour absorber les variantes de formatage ISO.
 */
export async function deleteBilanAt(timestamp: string): Promise<void> {
  const targetMs = new Date(timestamp).getTime();
  const all = (await eauDb.eau_bilans.toArray()) as BilanLocal[];
  const ids = all
    .filter((b) => new Date(b.timestamp).getTime() === targetMs)
    .map((b) => b.id);
  for (const id of ids) {
    await deleteLocal('eau_bilans', id);
  }
}

/**
 * Recalcule le bilan d'un relevé donné : retire son bilan existant (s'il y en a un)
 * puis le recrée. Retourne `null` si le relevé n'a pas de précédent (le plus ancien →
 * simple référence, aucun bilan recréé).
 */
export async function rebuildBilanForReleve(r: { timestamp: string; volume_m3: number }): Promise<BilanLocal | null> {
  await deleteBilanAt(r.timestamp);
  return computeAndSaveBilan({ timestamp: r.timestamp, volume_m3: r.volume_m3 });
}

/**
 * Recalcul COMPLET de la chaîne de bilans (bouton manuel + filet de sécurité, PAS le
 * chemin automatique) : vide tous les bilans (Dexie + Supabase) puis recrée un bilan
 * par relevé dans l'ordre chronologique. Idempotent (le plus ancien ne produit pas
 * de bilan). Nécessite la connexion pour purger côté serveur.
 */
export async function recomputeAllBilans(): Promise<void> {
  const releves = ((await eauDb.eau_releves_bassin.toArray()) as ReleveBassinLocal[])
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Purge locale + serveur (best-effort côté serveur si en ligne).
  await eauDb.eau_bilans.clear();
  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      await withTimeout(
        supabase.from('eau_bilans').delete().not('id', 'is', null) as any,
        8000,
        'eau:recompute:clear-bilans'
      );
    } catch {
      /* best-effort : un échec serveur n'empêche pas la reconstruction locale */
    }
  }

  for (const r of releves) {
    await computeAndSaveBilan({ timestamp: r.timestamp, volume_m3: r.volume_m3 });
  }
}

/** Liste des bilans, plus récents d'abord ; option « anomalies seulement ». */
export async function listBilans(opts?: { anomaliesOnly?: boolean }): Promise<BilanLocal[]> {
  let all = (await eauDb.eau_bilans.toArray()) as BilanLocal[];
  if (opts?.anomaliesOnly) all = all.filter((b) => b.anomalie);
  return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getDernierBilan(): Promise<BilanLocal | null> {
  const all = await listBilans();
  return all[0] ?? null;
}

/** Marque un bilan « traité » avec commentaire. */
export async function markBilanTraitee(id: string, commentaire: string): Promise<BilanLocal | null> {
  const current = (await eauDb.eau_bilans.get(id)) as BilanLocal | undefined;
  if (!current) return null;
  const merged: BilanLocal = { ...current, traitee: true, commentaire: commentaire || current.commentaire };
  return saveLocal('eau_bilans', merged);
}

export async function refreshBilans(online: boolean): Promise<BilanLocal[]> {
  if (online) await pullTable('eau_bilans');
  return listBilans();
}

/**
 * NRW sur une période [startMs, endMs] :
 *   entréesΣ = Σ entrées dans la période
 *   consoΣ   = Σ conso_m3 des bilans dans la période (conso métrée cumulée)
 */
export async function computeNRWForPeriod(startMs: number, endMs: number): Promise<NRWResult & {
  entreesTotalM3: number;
  consoTotalM3: number;
}> {
  const [entrees, bilans] = await Promise.all([
    eauDb.eau_entrees_bassin.toArray() as Promise<EntreeBassinLocal[]>,
    eauDb.eau_bilans.toArray() as Promise<BilanLocal[]>,
  ]);

  const entreesTotalM3 = entrees.reduce((acc, e) => {
    const ms = new Date(e.timestamp).getTime();
    return ms >= startMs && ms <= endMs ? acc + e.volume_m3 : acc;
  }, 0);

  const consoTotalM3 = bilans.reduce((acc, b) => {
    const ms = new Date(b.timestamp).getTime();
    return ms >= startMs && ms <= endMs ? acc + (b.conso_m3 ?? 0) : acc;
  }, 0);

  const nrw = computeNRW(entreesTotalM3, consoTotalM3);
  return { ...nrw, entreesTotalM3, consoTotalM3 };
}

/**
 * Origine du chiffre « conso du jour » affiché, pour piloter le libellé :
 *  - mesuree            : conso métrée (compteurs) > 0
 *  - estimee_intervalle : estimée par intervalle (relevés du jour + débit), nette de pertes
 *  - projection_tendance: projetée sur la tendance des 3 derniers jours (relevés en attente)
 *  - projection_moyenne : projetée sur la conso moyenne de la période
 *  - projection_debit   : projetée sur le débit (dernier recours, à confirmer)
 *  - zero_compteurs     : compteurs présents mais 0 réel (les compteurs n'ont pas tourné)
 */
export type ConsoJourSource =
  | 'mesuree'
  | 'estimee_intervalle'
  | 'projection_tendance'
  | 'projection_moyenne'
  | 'projection_debit'
  | 'zero_compteurs';

export interface DashboardData {
  /** Dernier relevé de niveau (volume mesuré) ou null. */
  stockActuelM3: number | null;
  volumeMaxM3: number | null;
  tauxRemplissage: number | null; // [0,1] — référencé au flotteur
  entreesJourM3: number;
  /** Conso du jour affichée : métrée (compteurs) ou estimée (débit) selon `consoJourEstimee`. */
  consoJourM3: number;
  /** true si `consoJourM3` est une ESTIMATION (débit/projection) faute de compteurs. */
  consoJourEstimee: boolean;
  /** Origine du chiffre affiché (pilote le libellé sous la valeur). */
  consoJourSource: ConsoJourSource;
  dernierBilan: BilanLocal | null;
  nrwPeriode: NRWResult | null;
  // ── Évolution « bassin/débit » ──
  /** Débit courant des pompes (m³/h), null si aucun test. */
  debitCourantM3h: number | null;
  /** Conso réseau cumulée sur la période (m³). */
  consoReseauPeriodeM3: number | null;
  /** NRW recalculé via le modèle réseau (pertes réseau / conso réseau). */
  nrwReseauPeriode: NRWResult | null;
  /** Autonomie estimée (stock ÷ conso horaire moyenne). */
  autonomie: AutonomieEstimee;
}

/** Agrégats du tableau de bord (jour courant + NRW sur la période de facturation). */
export async function getDashboardData(): Promise<DashboardData> {
  const config = await getConfig();
  const dim = dimensionsFromConfig(config);

  const [relevesBassin, entrees, bilans, relevesCompteur] = await Promise.all([
    eauDb.eau_releves_bassin.toArray() as Promise<ReleveBassinLocal[]>,
    eauDb.eau_entrees_bassin.toArray() as Promise<EntreeBassinLocal[]>,
    eauDb.eau_bilans.toArray() as Promise<BilanLocal[]>,
    eauDb.eau_releves_compteur.toArray() as Promise<ReleveCompteurLocal[]>,
  ]);

  // Dernier relevé de niveau
  const dernierReleve = relevesBassin
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  const stockActuelM3 = dernierReleve ? dernierReleve.volume_m3 : null;

  // Bornes du jour courant
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

  const entreesJourM3 = entrees.reduce((acc, e) => {
    const ms = new Date(e.timestamp).getTime();
    return ms >= startOfDay && ms <= endOfDay ? acc + e.volume_m3 : acc;
  }, 0);

  const consoJourM3 = bilans.reduce((acc, b) => {
    const ms = new Date(b.timestamp).getTime();
    return ms >= startOfDay && ms <= endOfDay ? acc + (b.conso_m3 ?? 0) : acc;
  }, 0);

  const dernierBilan = bilans
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ?? null;

  // NRW sur la période de facturation (défaut 30 j)
  const periodeJours = config?.periode_facturation_jours ?? 30;
  const nowMs = now.getTime();
  const nrwStart = nowMs - periodeJours * 24 * 60 * 60 * 1000;
  const nrwAgg = await computeNRWForPeriod(nrwStart, nowMs);

  // Modèle réseau : conso réseau cumulée + pertes/NRW recalculés via les bilans.
  const bilansPeriode = bilans.filter((b) => {
    const ms = new Date(b.timestamp).getTime();
    return ms >= nrwStart && ms <= nowMs;
  });
  const consoReseauPeriodeM3 = bilansPeriode.reduce((acc, b) => acc + (b.conso_reseau_m3 ?? 0), 0);
  const pertesReseauM3 = bilansPeriode.reduce((acc, b) => acc + (b.pertes_m3 ?? 0), 0);
  const aDuReseau = bilansPeriode.some((b) => b.conso_reseau_m3 != null);
  const nrwReseauPeriode: NRWResult | null = aDuReseau
    ? {
        pertesM3: pertesReseauM3,
        nrwPct: consoReseauPeriodeM3 > 0 ? (pertesReseauM3 / consoReseauPeriodeM3) * 100 : 0,
      }
    : null;

  // Débit courant + autonomie estimée
  const debitCourantM3h = await getDebitCourantM3h();

  const autonomie = estimerAutonomie({
    stockActuelM3,
    bilans: bilans.map((b) => ({
      timestamp: b.timestamp,
      conso_reseau_m3: b.conso_reseau_m3 ?? null,
      conso_m3: b.conso_m3,
    })),
    fenetreJours: periodeJours,
    nowMs,
  });

  // ── Conso du jour : métrée (compteurs) si dispo, sinon ESTIMÉE puis PROJETÉE ──
  // Une absence de relevé n'est PAS une consommation nulle : à défaut d'intervalle
  // aujourd'hui, on PROJETTE (tendance 3 j → moyenne → débit borné), proratisé sur la
  // fraction du jour écoulée. On ne projette JAMAIS par-dessus une mesure compteur.
  const aDesCompteurs = relevesCompteur.length > 0;
  let consoJourAffichee = consoJourM3; // métré par défaut
  let consoJourEstimee = false;
  let consoJourSource: ConsoJourSource;

  if (aDesCompteurs) {
    // Carve-out : 0 légitime si les compteurs n'ont pas tourné (aucune projection).
    consoJourSource = consoJourM3 > 0 ? 'mesuree' : 'zero_compteurs';
  } else {
    const estimable = (debitCourantM3h != null && debitCourantM3h > 0) || entrees.length > 0;

    // Estimateur corrigé « pompe intermittente » — SOURCE UNIQUE partagée avec les
    // tendances : plafonne les intervalles parqués au flotteur (où débit×Δt surestime).
    const volumeFlotteurM3 = dim ? volumeMaxM3(dim) : null;
    const intervalles = estimable
      ? calculerConsoEstimee({
          relevesBassin,
          entrees,
          debitM3h: debitCourantM3h,
          volumeFlotteurM3,
          consoMoyenneHeureM3: autonomie.consoMoyenneHeureM3,
          pertePct: PERTE_RESEAU_DEFAUT_PCT,
        })
      : [];

    // Intervalles dont le jour LOCAL d'imputation = aujourd'hui.
    const todayLabel = localDayLabel(new Date(nowMs));
    let somme = 0;
    let n = 0;
    for (const iv of intervalles) {
      if (localDayLabel(new Date(iv.ms)) === todayLabel) {
        somme += iv.consoNetteM3;
        n++;
      }
    }

    if (n > 0) {
      consoJourAffichee = somme;
      consoJourEstimee = true;
      consoJourSource = 'estimee_intervalle';
    } else {
      // Anti-zéro : aucun relevé aujourd'hui → projeter plutôt qu'afficher 0.
      const proj = projeterConsoJour({
        consoEstimeeParJour: bucketByLocalDay(intervalles.map((iv) => ({ ms: iv.ms, value: iv.consoNetteM3 }))),
        consoMoyenneJourM3: autonomie.consoMoyenneJourM3,
        debitM3h: debitCourantM3h,
        pertePct: PERTE_RESEAU_DEFAUT_PCT,
      });
      if (proj.tauxJourM3 > 0) {
        const heuresEcoulees = (nowMs - startOfDay) / 3_600_000;
        consoJourAffichee = proj.tauxJourM3 * (heuresEcoulees / 24);
        consoJourEstimee = true;
        consoJourSource =
          proj.source === 'tendance3'
            ? 'projection_tendance'
            : proj.source === 'moyenne'
              ? 'projection_moyenne'
              : 'projection_debit';
      } else {
        // Rien de calculable (ni historique, ni moyenne, ni débit) → 0 propre, sans mention.
        consoJourAffichee = 0;
        consoJourEstimee = false;
        consoJourSource = 'mesuree';
      }
    }
  }

  return {
    stockActuelM3,
    volumeMaxM3: dim ? volumeMaxM3(dim) : null,
    tauxRemplissage: dim && stockActuelM3 != null ? tauxRemplissage(stockActuelM3, dim) : null,
    entreesJourM3,
    consoJourM3: consoJourAffichee,
    consoJourEstimee,
    consoJourSource,
    dernierBilan,
    nrwPeriode: { pertesM3: nrwAgg.pertesM3, nrwPct: nrwAgg.nrwPct },
    debitCourantM3h,
    consoReseauPeriodeM3: aDuReseau ? consoReseauPeriodeM3 : null,
    nrwReseauPeriode,
    autonomie,
  };
}
