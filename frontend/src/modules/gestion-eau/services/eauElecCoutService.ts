/**
 * Coûts d'électricité mensuels de la centrale (eau_elec_couts — Phase 1 élec).
 * Offline-first (Dexie d'abord, push best-effort, upsert idempotent par id client).
 *
 * Un mois (`YYYY-MM`) est UNIQUE : `upsertCout` réutilise l'id existant du mois s'il
 * y en a un (pas de doublon de mois) et calcule le prix du kWh = (JIRAMA + gasoil) / kWh.
 */
import { eauDb } from '../db/gestionEauDb';
import { pullTable, saveLocal, deleteLocal } from './eauSync';
import { newId, nowIso } from '../utils/id';
import type { ElecCoutLocal } from '../types/gestionEau';

/** Prix du kWh = (JIRAMA + gasoil) / production kWh ; null si la production est ≤ 0. */
export function computePrixKwh(totalJirama: number, totalGasoil: number, totalKwh: number): number | null {
  if (!(totalKwh > 0)) return null;
  return (totalJirama + totalGasoil) / totalKwh;
}

/** Tous les coûts mensuels, du mois le plus récent au plus ancien. */
export async function listCouts(): Promise<ElecCoutLocal[]> {
  const all = (await eauDb.eau_elec_couts.toArray()) as ElecCoutLocal[];
  return all.slice().sort((a, b) => (a.mois < b.mois ? 1 : a.mois > b.mois ? -1 : 0));
}

/** Coût d'un mois donné (`YYYY-MM`), ou null. */
export async function getCoutByMois(mois: string): Promise<ElecCoutLocal | null> {
  const all = (await eauDb.eau_elec_couts.where('mois').equals(mois).toArray()) as ElecCoutLocal[];
  return all[0] ?? null;
}

/** Coût par identifiant, ou null. */
export async function getCoutById(id: string): Promise<ElecCoutLocal | null> {
  const row = (await eauDb.eau_elec_couts.get(id)) as ElecCoutLocal | undefined;
  return row ?? null;
}

/**
 * Crée ou met à jour le coût d'un mois (upsert idempotent par mois). Réutilise l'id
 * existant du mois s'il existe → jamais de doublon de mois. Calcule `prix_kwh` et
 * met à jour `updated_at`. `devise` défaut MGA.
 */
export async function upsertCout(input: {
  mois: string;
  total_jirama: number;
  total_gasoil: number;
  total_kwh: number;
  devise?: string;
}): Promise<ElecCoutLocal> {
  const existing = await getCoutByMois(input.mois);
  const prix_kwh = computePrixKwh(input.total_jirama, input.total_gasoil, input.total_kwh);
  const record: ElecCoutLocal = {
    id: existing?.id ?? newId(),
    mois: input.mois,
    total_jirama: input.total_jirama,
    total_gasoil: input.total_gasoil,
    total_kwh: input.total_kwh,
    prix_kwh,
    devise: input.devise ?? existing?.devise ?? 'MGA',
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  };
  return saveLocal('eau_elec_couts', record);
}

/** Tire les coûts depuis Supabase (au montage / online) puis renvoie la liste locale. */
export async function refreshCouts(online: boolean): Promise<ElecCoutLocal[]> {
  if (online) await pullTable('eau_elec_couts');
  return listCouts();
}

/** Supprime un coût mensuel (local + Supabase best-effort). */
export async function deleteCout(id: string): Promise<void> {
  await deleteLocal('eau_elec_couts', id);
}
