/**
 * Bilans (eau_bilans), NRW et agrégats du tableau de bord — offline-first.
 * Le calcul pur vit dans utils/bilan.ts ; ce service charge Dexie et persiste.
 */
import { eauDb } from '../db/gestionEauDb';
import { pullTable, saveLocal } from './eauSync';
import { newId } from '../utils/id';
import {
  computeBilan,
  computeNRW,
  type ReleveBassinLite,
  type EntreeLite,
  type ReleveCompteurLite,
  type CompteurLite,
  type NRWResult,
} from '../utils/bilan';
import {
  getConfig,
  seuilsFromConfig,
  dimensionsFromConfig,
} from './eauConfigService';
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
  const [config, relevesBassin, entrees, compteurs, relevesCompteur] = await Promise.all([
    getConfig(),
    eauDb.eau_releves_bassin.toArray() as Promise<ReleveBassinLocal[]>,
    eauDb.eau_entrees_bassin.toArray() as Promise<EntreeBassinLocal[]>,
    eauDb.eau_compteurs.toArray() as Promise<CompteurLocal[]>,
    eauDb.eau_releves_compteur.toArray() as Promise<ReleveCompteurLocal[]>,
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
    anomalie: result.anomalie,
    traitee: false,
    commentaire: null,
  };

  return saveLocal('eau_bilans', bilan);
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

export interface DashboardData {
  /** Dernier relevé de niveau (volume mesuré) ou null. */
  stockActuelM3: number | null;
  volumeMaxM3: number | null;
  tauxRemplissage: number | null; // [0,1]
  entreesJourM3: number;
  consoJourM3: number;
  dernierBilan: BilanLocal | null;
  nrwPeriode: NRWResult | null;
}

/** Agrégats du tableau de bord (jour courant + NRW sur la période de facturation). */
export async function getDashboardData(): Promise<DashboardData> {
  const config = await getConfig();
  const dim = dimensionsFromConfig(config);

  const [relevesBassin, entrees, bilans] = await Promise.all([
    eauDb.eau_releves_bassin.toArray() as Promise<ReleveBassinLocal[]>,
    eauDb.eau_entrees_bassin.toArray() as Promise<EntreeBassinLocal[]>,
    eauDb.eau_bilans.toArray() as Promise<BilanLocal[]>,
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
  const nrwStart = now.getTime() - periodeJours * 24 * 60 * 60 * 1000;
  const nrwAgg = await computeNRWForPeriod(nrwStart, now.getTime());

  return {
    stockActuelM3,
    volumeMaxM3: dim ? volumeMaxM3(dim) : null,
    tauxRemplissage: dim && stockActuelM3 != null ? tauxRemplissage(stockActuelM3, dim) : null,
    entreesJourM3,
    consoJourM3,
    dernierBilan,
    nrwPeriode: { pertesM3: nrwAgg.pertesM3, nrwPct: nrwAgg.nrwPct },
  };
}
