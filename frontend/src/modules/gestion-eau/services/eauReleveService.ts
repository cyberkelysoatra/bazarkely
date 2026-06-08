/**
 * Saisies de terrain : entrées bassin, relevés de niveau (→ déclenche un bilan),
 * relevés de compteur (rupture d'index + détection aberrant). Offline-first.
 */
import { eauDb } from '../db/gestionEauDb';
import { pullTable, saveLocal, deleteLocal } from './eauSync';
import { newId, nowIso } from '../utils/id';
import { computeAndSaveBilan, deleteBilanAt, rebuildBilanForReleve } from './eauBilanService';
import { getConfig, dimensionsFromConfig, facteurAberrantFromConfig } from './eauConfigService';
import { hauteurCmToVolumeM3 } from '../utils/bassin';
import { moyenne, detectAberrant, type AberrantResult } from '../utils/bilan';
import type {
  EntreeBassinLocal,
  ReleveBassinLocal,
  ReleveCompteurLocal,
  BilanLocal,
} from '../types/gestionEau';

// ───────────────────────────── Entrées bassin ─────────────────────────────
export async function addEntreeBassin(input: {
  volume_m3: number;
  agent_id?: string | null;
  note?: string | null;
  timestamp?: string;
}): Promise<EntreeBassinLocal> {
  const record: EntreeBassinLocal = {
    id: newId(),
    volume_m3: input.volume_m3,
    timestamp: input.timestamp ?? nowIso(),
    agent_id: input.agent_id ?? null,
    note: input.note ?? null,
  };
  return saveLocal('eau_entrees_bassin', record);
}

// ─────────────────────── Relevé de niveau (→ bilan) ───────────────────────
/**
 * Enregistre un relevé de niveau (hauteur cm + volume m³ déjà converti) PUIS
 * déclenche le calcul d'un bilan. Retourne le relevé et le bilan (null si pas de
 * relevé de niveau précédent → simple référence).
 */
export async function addReleveBassin(input: {
  hauteur_cm: number;
  volume_m3: number;
  agent_id?: string | null;
  note?: string | null;
  timestamp?: string;
}): Promise<{ releve: ReleveBassinLocal; bilan: BilanLocal | null }> {
  const ts = input.timestamp ?? nowIso();
  const releve: ReleveBassinLocal = {
    id: newId(),
    hauteur_cm: input.hauteur_cm,
    volume_m3: input.volume_m3,
    timestamp: ts,
    agent_id: input.agent_id ?? null,
    note: input.note ?? null,
  };
  const saved = await saveLocal('eau_releves_bassin', releve);

  // Déclenche le bilan APRÈS persistance du relevé courant (il devient le stock mesuré).
  const bilan = await computeAndSaveBilan({ timestamp: ts, volume_m3: input.volume_m3 });

  // Cohérence du voisin en saisie rétro-datée : si un relevé existe APRÈS celui-ci,
  // son « précédent » a changé → son bilan doit être recalculé. En saisie « en avant »
  // normale, `next` est null → chemin rapide, comportement strictement inchangé.
  const next = await nextReleveAfter(ts, saved.id);
  if (next) await rebuildBilanForReleve(next);

  return { releve: saved, bilan };
}

// ───────────────── Édition / suppression d'un relevé de niveau (admin) ─────────────────
/**
 * Relevé immédiatement APRÈS un horodatage (plus petit `timestamp` strictement `> ts`),
 * en excluant éventuellement un id donné. `null` s'il n'existe pas de relevé postérieur.
 */
async function nextReleveAfter(ts: string, excludeId?: string): Promise<ReleveBassinLocal | null> {
  const tMs = new Date(ts).getTime();
  const all = (await eauDb.eau_releves_bassin.toArray()) as ReleveBassinLocal[];
  const after = all
    .filter((r) => r.id !== excludeId && new Date(r.timestamp).getTime() > tMs)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return after[0] ?? null;
}

/** Tous les relevés de niveau, du plus récent au plus ancien, limités à `limit`. */
export async function listRecentRelevesBassin(limit = 30): Promise<ReleveBassinLocal[]> {
  const all = (await eauDb.eau_releves_bassin.toArray()) as ReleveBassinLocal[];
  return all
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Modifie un relevé de niveau (hauteur et/ou horodatage) puis recalcule les bilans
 * « voisins » (≤ 3 : l'ancien emplacement, le nouvel emplacement, et le relevé suivant
 * de part et d'autre). Les autres bilans (et leur statut traitee/commentaire) sont
 * conservés. Le volume est recalculé depuis la config du bassin.
 */
export async function updateReleveBassin(input: {
  id: string;
  hauteur_cm: number;
  timestamp: string;
}): Promise<ReleveBassinLocal> {
  const existing = (await eauDb.eau_releves_bassin.get(input.id)) as ReleveBassinLocal | undefined;
  if (!existing) throw new Error('Relevé introuvable');
  const oldTs = existing.timestamp;
  const oldNext = await nextReleveAfter(oldTs, input.id);

  const dim = dimensionsFromConfig(await getConfig());
  if (!dim) throw new Error('Configurez le bassin d\'abord (dimensions manquantes)');
  const volume_m3 = hauteurCmToVolumeM3(input.hauteur_cm, dim);

  const updated = await saveLocal('eau_releves_bassin', {
    ...existing,
    hauteur_cm: input.hauteur_cm,
    volume_m3,
    timestamp: input.timestamp,
  });

  // Recalcul des voisins.
  await deleteBilanAt(oldTs);                 // retire le bilan de l'ancien emplacement (orphelin si la date a changé)
  await rebuildBilanForReleve(updated);       // bilan du relevé à sa nouvelle position
  const newNext = await nextReleveAfter(input.timestamp, input.id);
  if (oldNext) await rebuildBilanForReleve(oldNext);
  if (newNext && newNext.id !== oldNext?.id) await rebuildBilanForReleve(newNext);

  return updated;
}

/**
 * Supprime un relevé de niveau puis recalcule les bilans concernés : retire son bilan
 * (devenu orphelin) et recalcule le bilan du relevé suivant (dont le « précédent » était
 * le relevé supprimé). Les autres bilans sont conservés.
 */
export async function deleteReleveBassin(id: string): Promise<void> {
  const existing = (await eauDb.eau_releves_bassin.get(id)) as ReleveBassinLocal | undefined;
  if (!existing) return;
  const ts = existing.timestamp;
  const next = await nextReleveAfter(ts, id);
  await deleteLocal('eau_releves_bassin', id);
  await deleteBilanAt(ts);
  if (next) await rebuildBilanForReleve(next);
}

// ─────────────────────────── Relevés compteur ─────────────────────────────
/** Dernier relevé (index + date) d'un compteur, ou null. */
export async function getDernierReleveCompteur(compteurId: string): Promise<ReleveCompteurLocal | null> {
  const releves = (await eauDb.eau_releves_compteur
    .where('compteur_id')
    .equals(compteurId)
    .toArray()) as ReleveCompteurLocal[];
  if (releves.length === 0) return null;
  return releves.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
}

/** Historique des consommations instantanées (>0) d'un compteur, du plus ancien au plus récent. */
export async function historiqueConsoCompteur(compteurId: string): Promise<number[]> {
  const releves = (await eauDb.eau_releves_compteur
    .where('compteur_id')
    .equals(compteurId)
    .toArray()) as ReleveCompteurLocal[];
  const tries = releves.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const consos: number[] = [];
  for (let i = 1; i < tries.length; i++) {
    if (tries[i].rupture_index) continue; // une rupture casse la continuité
    const c = tries[i].index - tries[i - 1].index;
    if (c > 0) consos.push(c);
  }
  return consos;
}

/**
 * Évalue (sans enregistrer) la conso instantanée et le caractère aberrant d'un
 * nouvel index — pour pré-validation UI avant confirmation.
 *  - `ruptureIndex` = nouvel index < dernier index (compteur remis à zéro / remplacé).
 *  - `conso` = nouvel index − dernier (0 si rupture ou pas de baseline).
 */
export async function evaluerReleveCompteur(compteurId: string, nouvelIndex: number): Promise<{
  dernier: ReleveCompteurLocal | null;
  ruptureIndex: boolean;
  conso: number;
  aberrant: AberrantResult;
}> {
  const dernier = await getDernierReleveCompteur(compteurId);
  const ruptureIndex = dernier != null && nouvelIndex < dernier.index;
  let conso = 0;
  if (dernier && !ruptureIndex) conso = Math.max(0, nouvelIndex - dernier.index);

  const config = await getConfig();
  const facteur = facteurAberrantFromConfig(config);
  const hist = await historiqueConsoCompteur(compteurId);
  const aberrant = ruptureIndex ? { aberrant: false, type: null } : detectAberrant(conso, moyenne(hist), facteur);

  return { dernier, ruptureIndex, conso, aberrant };
}

/**
 * Enregistre un relevé de compteur. `ruptureIndex` et `aberrantConfirme` sont fournis
 * par l'UI après confirmation de l'utilisateur le cas échéant.
 */
export async function addReleveCompteur(input: {
  compteur_id: string;
  index: number;
  rupture_index?: boolean;
  aberrant_confirme?: boolean;
  agent_id?: string | null;
  note?: string | null;
  photo_url?: string | null;
  timestamp?: string;
}): Promise<ReleveCompteurLocal> {
  const record: ReleveCompteurLocal = {
    id: newId(),
    compteur_id: input.compteur_id,
    index: input.index,
    rupture_index: input.rupture_index ?? false,
    aberrant_confirme: input.aberrant_confirme ?? false,
    timestamp: input.timestamp ?? nowIso(),
    agent_id: input.agent_id ?? null,
    note: input.note ?? null,
    photo_url: input.photo_url ?? null,
  };
  return saveLocal('eau_releves_compteur', record);
}

export async function refreshReleves(online: boolean): Promise<void> {
  if (online) {
    await pullTable('eau_entrees_bassin');
    await pullTable('eau_releves_bassin');
    await pullTable('eau_releves_compteur');
  }
}
