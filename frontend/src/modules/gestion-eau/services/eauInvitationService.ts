/**
 * Invitations par email (eau_invitations) — octroi automatique du rôle au 1er login.
 *
 * Un admin pré-enregistre une invitation (email Google + rôles admin/releveur/client
 * + compteurs visibles pour un client). À la connexion de la personne avec cette
 * adresse Google, la RPC SECURITY DEFINER `eau_claim_invitation()` attribue les rôles
 * (et crée/active le compte client + compteurs si `role_client`), puis marque
 * l'invitation `acceptee`. L'opération est idempotente (un 2ᵉ login ne duplique rien).
 *
 * Offline-first (cf. CLAUDE.md) : lectures Dexie d'abord ; écritures admin via
 * `saveLocal` + push best-effort (la policy RLS `eau_is_admin()` autorise l'admin).
 * L'octroi (`claimInvitationForCurrentUser`) est best-effort EN LIGNE : c'est le pull
 * des rôles/comptes qui reflète l'octroi, pas une écriture locale directe.
 */
import { supabase, withTimeout } from '../../../lib/supabase';
import { eauDb } from '../db/gestionEauDb';
import { pullTable, saveLocal } from './eauSync';
import { newId, nowIso } from '../utils/id';
import type { InvitationLocal, InvitationStatut } from '../types/gestionEau';

/**
 * Octroi automatique pour l'utilisateur courant : appelle la RPC `eau_claim_invitation()`
 * qui, s'il existe une invitation `en_attente` pour l'email du JWT, attribue les rôles
 * (et crée/active le compte client + compteurs si demandé) puis marque l'invitation
 * `acceptee`. Retourne l'id de l'invitation consommée, ou `null` (aucune invitation,
 * hors-ligne, ou échec réseau). Best-effort : n'écrit RIEN en local — le pull des rôles
 * et comptes (fait ensuite par le contexte) reflète l'octroi.
 */
export async function claimInvitationForCurrentUser(online: boolean): Promise<string | null> {
  if (!online) return null;
  try {
    const { data, error } = (await withTimeout(
      (supabase.rpc as any)('eau_claim_invitation'),
      8000,
      'eau:claimInvitation'
    )) as any;
    if (error) return null;
    return (data as string | null) ?? null;
  } catch {
    // Réseau/timeout : octroi non confirmé. Les rôles déjà en cache restent valables ;
    // un prochain login (ou refresh) réessaiera. Ne casse jamais le chargement.
    return null;
  }
}

// ───────────────────────── Administration (Phase 2) ──────────────────────────
// Créés ici pour être réutilisés par l'UI admin de la Phase 2. Offline-first sur le
// modèle de eauDemandeService : la policy RLS `eau_is_admin()` autorise l'admin à
// insérer/mettre à jour `eau_invitations` directement (push via saveLocal/upsert).

export interface InvitationInput {
  email: string;
  nom?: string | null;
  phone?: string | null;
  role_admin?: boolean;
  role_releveur?: boolean;
  role_client?: boolean;
  compteur_ids?: string[];
  cible?: string | null;
  invited_by?: string | null;
}

/**
 * Crée une invitation `en_attente`. L'id client est transmis (idempotence : un envoi
 * « expiré-mais-commité » et le rejeu de file convergent sur la même ligne via upsert).
 */
export async function createInvitation(input: InvitationInput): Promise<InvitationLocal> {
  const record: InvitationLocal = {
    id: newId(),
    email: input.email.trim().toLowerCase(),
    nom: input.nom ?? null,
    phone: input.phone ?? null,
    role_admin: input.role_admin ?? false,
    role_releveur: input.role_releveur ?? false,
    role_client: input.role_client ?? false,
    compteur_ids: input.compteur_ids ?? [],
    cible: input.cible ?? null,
    statut: 'en_attente',
    invited_by: input.invited_by ?? null,
    created_at: nowIso(),
    accepted_by: null,
    accepted_at: null,
  };
  return saveLocal('eau_invitations', record);
}

export async function listInvitations(opts?: { statut?: InvitationStatut }): Promise<InvitationLocal[]> {
  let all = (await eauDb.eau_invitations.toArray()) as InvitationLocal[];
  if (opts?.statut) all = all.filter((i) => i.statut === opts.statut);
  return all.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
}

export async function getInvitation(id: string): Promise<InvitationLocal | null> {
  return ((await eauDb.eau_invitations.get(id)) as InvitationLocal | undefined) ?? null;
}

/** Révoque une invitation `en_attente` (l'octroi auto ne la consommera plus). */
export async function revokeInvitation(id: string): Promise<InvitationLocal | null> {
  const current = await getInvitation(id);
  if (!current) return null;
  const merged: InvitationLocal = { ...current, statut: 'revoquee' };
  return saveLocal('eau_invitations', merged);
}

export async function refreshInvitations(online: boolean): Promise<InvitationLocal[]> {
  if (online) await pullTable('eau_invitations').catch(() => {});
  return listInvitations();
}
