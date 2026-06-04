/**
 * Saisies de terrain : entrées bassin, relevés de niveau (→ déclenche un bilan),
 * relevés de compteur (rupture d'index + détection aberrant). Offline-first.
 */
import { eauDb } from '../db/gestionEauDb';
import { pullTable, saveLocal } from './eauSync';
import { newId, nowIso } from '../utils/id';
import { computeAndSaveBilan } from './eauBilanService';
import { getConfig, facteurAberrantFromConfig } from './eauConfigService';
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

  return { releve: saved, bilan };
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
