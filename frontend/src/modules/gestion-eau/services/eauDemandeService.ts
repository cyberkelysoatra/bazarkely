/**
 * Demandes d'accès (eau_demandes_acces) — offline-first.
 * Un utilisateur sans code se connecte avec Google et demande un accès → demande
 * `en_attente`. Un admin valide (attribue rôles + compteurs visibles) ou refuse.
 */
import { eauDb } from '../db/gestionEauDb';
import { pullTable, saveLocal } from './eauSync';
import { newId, nowIso } from '../utils/id';
import { setRoles } from './eauRoleService';
import { ensureActivatedClientForUser } from './eauCompteClientService';
import type { DemandeAccesLocal, DemandeStatut } from '../types/gestionEau';

export interface DemandeInput {
  user_id: string;
  email?: string | null;
  nom?: string | null;
}

/**
 * Crée une demande d'accès `en_attente` (idempotent : si une demande en_attente
 * existe déjà pour cet utilisateur, la renvoie sans en créer une seconde).
 */
export async function createDemande(input: DemandeInput): Promise<DemandeAccesLocal> {
  await pullTable('eau_demandes_acces').catch(() => {});
  const all = (await eauDb.eau_demandes_acces.toArray()) as DemandeAccesLocal[];
  const existing = all.find((d) => d.user_id === input.user_id && d.statut === 'en_attente');
  if (existing) return existing;

  const record: DemandeAccesLocal = {
    id: newId(),
    user_id: input.user_id,
    email: input.email ?? null,
    nom: input.nom ?? null,
    statut: 'en_attente',
    roles_attribues: null,
    compteurs_visibles: null,
    traitee_par: null,
    traitee_at: null,
    created_at: nowIso(),
  };
  return saveLocal('eau_demandes_acces', record);
}

export async function listDemandes(opts?: { statut?: DemandeStatut }): Promise<DemandeAccesLocal[]> {
  let all = (await eauDb.eau_demandes_acces.toArray()) as DemandeAccesLocal[];
  if (opts?.statut) all = all.filter((d) => d.statut === opts.statut);
  return all.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
}

export async function getDemande(id: string): Promise<DemandeAccesLocal | null> {
  return ((await eauDb.eau_demandes_acces.get(id)) as DemandeAccesLocal | undefined) ?? null;
}

export interface ValidationInput {
  admin: boolean;
  releveur: boolean;
  /** Compteurs visibles → si non vide, l'utilisateur devient client. */
  compteur_ids: string[];
  traitee_par: string | null;
}

/**
 * Valide une demande : attribue les rôles admin/releveur (si demandés) et, si des
 * compteurs visibles sont fournis, crée/active un compte client lié à l'utilisateur.
 */
export async function validerDemande(id: string, v: ValidationInput): Promise<DemandeAccesLocal | null> {
  const demande = await getDemande(id);
  if (!demande || !demande.user_id) return null;

  if (v.admin || v.releveur) {
    await setRoles(demande.user_id, { admin: v.admin, releveur: v.releveur });
  }
  if (v.compteur_ids.length > 0) {
    await ensureActivatedClientForUser(
      demande.user_id,
      demande.nom || demande.email || 'Client',
      v.compteur_ids,
      v.traitee_par
    );
  }

  const merged: DemandeAccesLocal = {
    ...demande,
    statut: 'validee',
    roles_attribues: { admin: v.admin, releveur: v.releveur } as unknown,
    compteurs_visibles: v.compteur_ids as unknown,
    traitee_par: v.traitee_par,
    traitee_at: nowIso(),
  };
  return saveLocal('eau_demandes_acces', merged);
}

export async function refuserDemande(id: string, traiteePar: string | null): Promise<DemandeAccesLocal | null> {
  const demande = await getDemande(id);
  if (!demande) return null;
  const merged: DemandeAccesLocal = {
    ...demande,
    statut: 'refusee',
    traitee_par: traiteePar,
    traitee_at: nowIso(),
  };
  return saveLocal('eau_demandes_acces', merged);
}

export async function refreshDemandes(online: boolean): Promise<DemandeAccesLocal[]> {
  if (online) await pullTable('eau_demandes_acces');
  return listDemandes();
}
