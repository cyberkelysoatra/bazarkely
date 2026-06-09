/**
 * Relevés de compteur ÉLECTRIQUE (eau_elec_releves_compteur — Phase 1 élec).
 * Squelette de LECTURE, miroir de `eauReleveService` côté eau. La saisie complète
 * (rupture d'index, détection aberrant, écriture) arrive en Phase 2 ; ici on pose
 * uniquement les lectures pour ne pas casser le build et préparer le terrain.
 * Offline-first : lecture directe Dexie.
 */
import { eauDb } from '../db/gestionEauDb';
import { pullTable } from './eauSync';
import type { ElecReleveLocal } from '../types/gestionEau';

/** Tous les relevés élec d'un compteur, du plus ancien au plus récent. */
export async function relevesDuCompteurElec(compteurId: string): Promise<ElecReleveLocal[]> {
  const releves = (await eauDb.eau_elec_releves_compteur
    .where('compteur_id')
    .equals(compteurId)
    .toArray()) as ElecReleveLocal[];
  return releves.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/** Dernier relevé élec (index + date) d'un compteur, ou null. */
export async function getDernierReleveElec(compteurId: string): Promise<ElecReleveLocal | null> {
  const releves = await relevesDuCompteurElec(compteurId);
  return releves.length === 0 ? null : releves[releves.length - 1];
}

/** Tire les relevés élec depuis Supabase (au montage / online). */
export async function refreshElecReleves(online: boolean): Promise<void> {
  if (online) await pullTable('eau_elec_releves_compteur');
}
