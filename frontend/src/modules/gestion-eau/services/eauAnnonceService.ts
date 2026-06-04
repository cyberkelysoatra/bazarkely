/**
 * Annonces du domaine (eau_annonces) — offline-first.
 *
 * CRUD admin (titre, texte, type promo/évènement/communauté, fenêtre dateDebut→dateFin,
 * actif) + lecture des annonces ACTIVES à un instant donné (pour le bandeau du header).
 * Toute écriture passe par `saveLocal` (upsert idempotent, id client) → pas de doublon.
 */
import { eauDb } from '../db/gestionEauDb';
import { saveLocal, deleteLocal, pullTable } from './eauSync';
import { newId, nowIso } from '../utils/id';
import { getCurrentUserIdSync } from './eauAuth';
import { logAudit } from './eauAuditService';
import type { AnnonceLocal } from '../types/gestionEau';

export type AnnonceType = 'promo' | 'evenement' | 'communaute';

/** Toutes les annonces, plus récentes d'abord. */
export async function listAnnonces(): Promise<AnnonceLocal[]> {
  const all = (await eauDb.eau_annonces.toArray()) as AnnonceLocal[];
  return all.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

/**
 * Annonces ACTIVES à l'instant `at` (défaut : maintenant) : `actif` = true ET
 * (date_debut nulle OU ≤ at) ET (date_fin nulle OU ≥ at). Triées récentes d'abord.
 */
export async function listActiveAnnonces(at: Date = new Date()): Promise<AnnonceLocal[]> {
  const atMs = at.getTime();
  const all = (await eauDb.eau_annonces.toArray()) as AnnonceLocal[];
  return all
    .filter((a) => isAnnonceActive(a, atMs))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

/** Prédicat PUR : une annonce est-elle active à l'instant `atMs` ? (testable) */
export function isAnnonceActive(a: AnnonceLocal, atMs: number = Date.now()): boolean {
  if (!a.actif) return false;
  if (a.date_debut) {
    const d = new Date(a.date_debut).getTime();
    if (!Number.isNaN(d) && atMs < d) return false;
  }
  if (a.date_fin) {
    const f = new Date(a.date_fin).getTime();
    if (!Number.isNaN(f) && atMs > f) return false;
  }
  return true;
}

export interface AnnonceInput {
  id?: string;
  titre: string;
  texte: string;
  type: AnnonceType;
  actif: boolean;
  date_debut?: string | null;
  date_fin?: string | null;
}

/** Crée ou met à jour une annonce (merge sur l'existant si id fourni). */
export async function saveAnnonce(input: AnnonceInput): Promise<AnnonceLocal> {
  const existing = input.id
    ? ((await eauDb.eau_annonces.get(input.id)) as AnnonceLocal | undefined)
    : undefined;

  const record: AnnonceLocal = {
    id: input.id ?? newId(),
    titre: input.titre,
    texte: input.texte,
    type: input.type,
    actif: input.actif,
    date_debut: input.date_debut ?? null,
    date_fin: input.date_fin ?? null,
    created_by: existing?.created_by ?? getCurrentUserIdSync(),
    created_at: existing?.created_at ?? nowIso(),
  };
  const saved = await saveLocal('eau_annonces', record);
  void logAudit({
    action: existing ? 'annonce_modifiee' : 'annonce_creee',
    entite: 'eau_annonces',
    entiteId: saved.id,
    details: { titre: saved.titre, type: saved.type, actif: saved.actif },
  });
  return saved;
}

/** Supprime une annonce. */
export async function deleteAnnonce(id: string): Promise<void> {
  await deleteLocal('eau_annonces', id);
  void logAudit({ action: 'annonce_supprimee', entite: 'eau_annonces', entiteId: id });
}

/** Bascule rapide actif/inactif. */
export async function toggleAnnonceActif(id: string): Promise<AnnonceLocal | null> {
  const a = (await eauDb.eau_annonces.get(id)) as AnnonceLocal | undefined;
  if (!a) return null;
  return saveAnnonce({
    id: a.id,
    titre: a.titre ?? '',
    texte: a.texte ?? '',
    type: (a.type ?? 'promo') as AnnonceType,
    actif: !a.actif,
    date_debut: a.date_debut,
    date_fin: a.date_fin,
  });
}

export async function refreshAnnonces(online: boolean): Promise<AnnonceLocal[]> {
  if (online) await pullTable('eau_annonces');
  return listAnnonces();
}
