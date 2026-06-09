/**
 * Relevés de compteur ÉLECTRIQUE (eau_elec_releves_compteur — Phase 1/2 élec).
 * Miroir EXACT de la partie compteur de `eauReleveService` côté eau, sur une table
 * dédiée (kWh) : même logique de rupture d'index, de détection aberrant et d'écriture
 * offline-first (Dexie d'abord, upsert idempotent par id client ; timeout ≠ échec).
 */
import { eauDb } from '../db/gestionEauDb';
import { pullTable, saveLocal, deleteLocal } from './eauSync';
import { newId, nowIso } from '../utils/id';
import { getConfig, facteurAberrantFromConfig } from './eauConfigService';
import { moyenne, detectAberrant, type AberrantResult } from '../utils/bilan';
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

/** Historique des consommations instantanées (>0) d'un compteur élec, du plus ancien au plus récent. */
export async function historiqueConsoElec(compteurId: string): Promise<number[]> {
  const tries = await relevesDuCompteurElec(compteurId);
  const consos: number[] = [];
  for (let i = 1; i < tries.length; i++) {
    if (tries[i].rupture_index) continue; // une rupture casse la continuité
    const c = tries[i].index - tries[i - 1].index;
    if (c > 0) consos.push(c);
  }
  return consos;
}

/**
 * Évalue (sans enregistrer) la conso instantanée et le caractère aberrant d'un nouvel
 * index élec — pour pré-validation UI avant confirmation.
 *  - `ruptureIndex` = nouvel index < dernier index (compteur remis à zéro / remplacé).
 *  - `conso` = nouvel index − dernier (0 si rupture ou pas de baseline).
 */
export async function evaluerReleveElec(compteurId: string, nouvelIndex: number): Promise<{
  dernier: ElecReleveLocal | null;
  ruptureIndex: boolean;
  conso: number;
  aberrant: AberrantResult;
}> {
  const dernier = await getDernierReleveElec(compteurId);
  const ruptureIndex = dernier != null && nouvelIndex < dernier.index;
  let conso = 0;
  if (dernier && !ruptureIndex) conso = Math.max(0, nouvelIndex - dernier.index);

  const config = await getConfig();
  const facteur = facteurAberrantFromConfig(config);
  const hist = await historiqueConsoElec(compteurId);
  const aberrant = ruptureIndex ? { aberrant: false, type: null } : detectAberrant(conso, moyenne(hist), facteur);

  return { dernier, ruptureIndex, conso, aberrant };
}

/**
 * Enregistre un relevé de compteur élec. `ruptureIndex` et `aberrantConfirme` sont
 * fournis par l'UI après confirmation de l'utilisateur le cas échéant.
 */
export async function addReleveElec(input: {
  compteur_id: string;
  index: number;
  rupture_index?: boolean;
  aberrant_confirme?: boolean;
  agent_id?: string | null;
  note?: string | null;
  photo_url?: string | null;
  timestamp?: string;
}): Promise<ElecReleveLocal> {
  const record: ElecReleveLocal = {
    id: newId(),
    compteur_id: input.compteur_id,
    index: input.index,
    rupture_index: input.rupture_index ?? false,
    aberrant_confirme: input.aberrant_confirme ?? false,
    timestamp: input.timestamp ?? nowIso(),
    agent_id: input.agent_id ?? null,
    note: input.note ?? null,
    photo_url: input.photo_url ?? null,
    created_at: nowIso(),
  };
  return saveLocal('eau_elec_releves_compteur', record);
}

/** Modifie un relevé élec (admin) — merge partiel, upsert idempotent. */
export async function updateReleveElec(
  id: string,
  patch: Partial<Omit<ElecReleveLocal, 'id'>>
): Promise<ElecReleveLocal | null> {
  const current = (await eauDb.eau_elec_releves_compteur.get(id)) as ElecReleveLocal | undefined;
  if (!current) return null;
  const merged: ElecReleveLocal = { ...current, ...patch, id };
  return saveLocal('eau_elec_releves_compteur', merged);
}

/** Supprime un relevé élec (admin) — local + Supabase best-effort. */
export async function deleteReleveElec(id: string): Promise<void> {
  await deleteLocal('eau_elec_releves_compteur', id);
}

/** Tire les relevés élec depuis Supabase (au montage / online). */
export async function refreshElecReleves(online: boolean): Promise<void> {
  if (online) await pullTable('eau_elec_releves_compteur');
}
