/**
 * CRUD des compteurs (eau_compteurs) — offline-first.
 */
import { eauDb } from '../db/gestionEauDb';
import { pullTable, saveLocal, deleteLocal } from './eauSync';
import { newId, nowIso } from '../utils/id';
import type { CompteurLocal, CompteurType } from '../types/gestionEau';

export interface CompteurInput {
  nom: string;
  type: CompteurType;
  proprietaire?: string | null;
  zone?: string | null;
  ordre?: number | null;
  actif?: boolean;
}

/** Liste tous les compteurs, triés par zone puis ordre puis nom. */
export async function listCompteurs(): Promise<CompteurLocal[]> {
  const all = (await eauDb.eau_compteurs.toArray()) as CompteurLocal[];
  return all.sort((a, b) => {
    const za = a.zone ?? '';
    const zb = b.zone ?? '';
    if (za !== zb) return za.localeCompare(zb);
    const oa = a.ordre ?? Number.MAX_SAFE_INTEGER;
    const ob = b.ordre ?? Number.MAX_SAFE_INTEGER;
    if (oa !== ob) return oa - ob;
    return a.nom.localeCompare(b.nom);
  });
}

/** Compteurs actifs uniquement. */
export async function listCompteursActifs(): Promise<CompteurLocal[]> {
  const all = await listCompteurs();
  return all.filter((c) => c.actif);
}

export async function getCompteur(id: string): Promise<CompteurLocal | null> {
  return ((await eauDb.eau_compteurs.get(id)) as CompteurLocal | undefined) ?? null;
}

/** Recherche par nom / propriétaire / zone (insensible à la casse). */
export async function searchCompteurs(query: string): Promise<CompteurLocal[]> {
  const q = query.trim().toLowerCase();
  const all = await listCompteurs();
  if (!q) return all;
  return all.filter((c) =>
    c.nom.toLowerCase().includes(q) ||
    (c.proprietaire ?? '').toLowerCase().includes(q) ||
    (c.zone ?? '').toLowerCase().includes(q)
  );
}

export async function refreshCompteurs(online: boolean): Promise<CompteurLocal[]> {
  if (online) await pullTable('eau_compteurs');
  return listCompteurs();
}

export async function createCompteur(input: CompteurInput): Promise<CompteurLocal> {
  const now = nowIso();
  const record: CompteurLocal = {
    id: newId(),
    nom: input.nom,
    type: input.type,
    proprietaire: input.proprietaire ?? null,
    zone: input.zone ?? null,
    ordre: input.ordre ?? null,
    lat: null,
    lng: null,
    actif: input.actif ?? true,
    created_at: now,
    updated_at: now,
  };
  return saveLocal('eau_compteurs', record);
}

export async function updateCompteur(id: string, patch: Partial<CompteurInput>): Promise<CompteurLocal | null> {
  const current = await getCompteur(id);
  if (!current) return null;
  const merged: CompteurLocal = {
    ...current,
    ...patch,
    updated_at: nowIso(),
  };
  return saveLocal('eau_compteurs', merged);
}

export async function deleteCompteur(id: string): Promise<void> {
  await deleteLocal('eau_compteurs', id);
}
