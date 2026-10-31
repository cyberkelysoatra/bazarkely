/**
 * Relevés des compteurs RTB Énergie (eau_elec_releves_compteur, ELEC-CC-02) : la table
 * pointe désormais vers `eau_elec_compteurs`. Offline-first : Dexie d'abord, upsert
 * idempotent par id client (timeout ≠ échec), photo en data URL dans la ligne. Les
 * calculs (échelle, conso par jour, cycle) vivent dans `utils/elecReleves.ts`.
 */
import { eauDb } from '../db/gestionEauDb';
import { pullTable, saveLocal, deleteLocal } from './eauSync';
import { saveLocalApresParents } from './eauElecService';
import { newId, nowIso } from '../utils/id';
import { getConfig, facteurAberrantFromConfig } from './eauConfigService';
import { FACTEUR_ECART_DEFAUT, trierReleves } from '../utils/elecReleves';
import { moyenne, detectAberrant, type AberrantResult } from '../utils/bilan';
import type { ElecReleveLocal, ElecReleveOrigine } from '../types/gestionEau';

/** Tous les relevés d'un compteur, du plus ancien au plus récent. */
export async function relevesDuCompteurElec(compteurId: string): Promise<ElecReleveLocal[]> {
  const releves = (await eauDb.eau_elec_releves_compteur
    .where('compteur_id')
    .equals(compteurId)
    .toArray()) as ElecReleveLocal[];
  return trierReleves(releves);
}

/** Tous les relevés groupés par compteur (une seule lecture Dexie), chaque liste triée. */
export async function relevesElecParCompteur(): Promise<Map<string, ElecReleveLocal[]>> {
  const all = (await eauDb.eau_elec_releves_compteur.toArray()) as ElecReleveLocal[];
  const map = new Map<string, ElecReleveLocal[]>();
  for (const r of all) {
    const list = map.get(r.compteur_id);
    if (list) list.push(r);
    else map.set(r.compteur_id, [r]);
  }
  for (const [k, list] of map) map.set(k, trierReleves(list));
  return map;
}

/** Facteur d'écart : celui de la configuration s'il est lisible, sinon 3. */
export async function facteurEcartElec(): Promise<number> {
  const f = facteurAberrantFromConfig(await getConfig());
  return f > 1 ? f : FACTEUR_ECART_DEFAUT;
}

/** Dernier relevé (index + date) d'un compteur, ou null. */
export async function getDernierReleveElec(compteurId: string): Promise<ElecReleveLocal | null> {
  const releves = await relevesDuCompteurElec(compteurId);
  return releves.length === 0 ? null : releves[releves.length - 1];
}

/** Historique des consommations (>0) d'un compteur, du plus ancien au plus récent. */
export async function historiqueConsoElec(compteurId: string): Promise<number[]> {
  const tries = await relevesDuCompteurElec(compteurId);
  const consos: number[] = [];
  for (let i = 1; i < tries.length; i++) {
    if (tries[i].rupture_index) continue;
    const c = tries[i].index - tries[i - 1].index;
    if (c > 0) consos.push(c);
  }
  return consos;
}

/**
 * Évaluation simple (conso depuis le dernier relevé) gardée pour les appelants de la
 * page Relevés eau v2 (nature « élec » retirée en ELEC-CC-01, code encore présent).
 */
export async function evaluerReleveElec(compteurId: string, nouvelIndex: number): Promise<{
  dernier: ElecReleveLocal | null;
  ruptureIndex: boolean;
  conso: number;
  aberrant: AberrantResult;
}> {
  const dernier = await getDernierReleveElec(compteurId);
  const ruptureIndex = dernier != null && nouvelIndex < dernier.index;
  const conso = dernier && !ruptureIndex ? Math.max(0, nouvelIndex - dernier.index) : 0;
  const hist = await historiqueConsoElec(compteurId);
  const aberrant =
    ruptureIndex || conso <= 0
      ? { aberrant: false, type: null }
      : detectAberrant(conso, moyenne(hist), await facteurEcartElec());
  return { dernier, ruptureIndex, conso, aberrant };
}

/** Enregistre un relevé. Rupture et écart confirmés sont fournis par l'écran. */
export async function addReleveElec(input: {
  compteur_id: string;
  index: number;
  rupture_index?: boolean;
  aberrant_confirme?: boolean;
  agent_id?: string | null;
  note?: string | null;
  photo_url?: string | null;
  timestamp?: string;
  origine?: ElecReleveOrigine;
}): Promise<ElecReleveLocal> {
  const now = nowIso();
  const record: ElecReleveLocal = {
    id: newId(),
    compteur_id: input.compteur_id,
    index: input.index,
    rupture_index: input.rupture_index ?? false,
    aberrant_confirme: input.aberrant_confirme ?? false,
    timestamp: input.timestamp ?? now,
    agent_id: input.agent_id ?? null,
    note: input.note ?? null,
    photo_url: input.photo_url ?? null,
    origine: input.origine ?? 'terrain',
    created_at: now,
    updated_at: now,
  };
  // Écriture locale immédiate ; un compteur créé juste avant (encore en attente) part avant
  // le relevé, en arrière-plan (sinon refus de la clé étrangère).
  return saveLocalApresParents('eau_elec_releves_compteur', record, input.compteur_id, null);
}

/** Modifie un relevé (merge partiel, upsert idempotent). La RLS applique la règle des 48 h. */
export async function updateReleveElec(
  id: string,
  patch: Partial<Omit<ElecReleveLocal, 'id'>>
): Promise<ElecReleveLocal | null> {
  const current = (await eauDb.eau_elec_releves_compteur.get(id)) as ElecReleveLocal | undefined;
  if (!current) return null;
  const merged: ElecReleveLocal = { ...current, ...patch, id, updated_at: nowIso() };
  return saveLocal('eau_elec_releves_compteur', merged);
}

/** Supprime un relevé (local + tombstone rejoué au retour du réseau). */
export async function deleteReleveElec(id: string): Promise<void> {
  await deleteLocal('eau_elec_releves_compteur', id);
}

/** Tire les relevés depuis Supabase (en ligne). */
export async function refreshElecReleves(online: boolean): Promise<void> {
  if (online) await pullTable('eau_elec_releves_compteur');
}
