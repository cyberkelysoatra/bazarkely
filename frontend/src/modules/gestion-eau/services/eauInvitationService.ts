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
 * Crée (ou met à jour) une invitation `en_attente` pour un email.
 *
 * Idempotence : si une invitation `en_attente` existe déjà pour cet email, on la
 * **met à jour en conservant son id** (et sa date de création) plutôt que d'en créer
 * une 2ᵉ — l'admin peut ainsi corriger rôles/compteurs/numéro sans accumuler de doublons.
 * L'id client est transmis dans le payload (un envoi « expiré-mais-commité » et le rejeu
 * de file convergent sur la même ligne via upsert).
 */
export async function createInvitation(input: InvitationInput): Promise<InvitationLocal> {
  const email = input.email.trim().toLowerCase();
  const existing = ((await eauDb.eau_invitations.toArray()) as InvitationLocal[]).find(
    (i) => i.email === email && i.statut === 'en_attente'
  );
  const record: InvitationLocal = {
    id: existing?.id ?? newId(),
    email,
    nom: input.nom ?? null,
    phone: input.phone ?? null,
    role_admin: input.role_admin ?? false,
    role_releveur: input.role_releveur ?? false,
    role_client: input.role_client ?? false,
    compteur_ids: input.compteur_ids ?? [],
    cible: input.cible ?? null,
    statut: 'en_attente',
    invited_by: input.invited_by ?? null,
    created_at: existing?.created_at ?? nowIso(),
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

// ────────────────────────── WhatsApp (wa.me) — Phase 2 ───────────────────────
// Helpers purs (testables, sans I/O) : normalisation du numéro malgache, libellé de
// rôle, lien profond d'atterrissage, message FR pré-rempli et lien wa.me complet.

/** Base de production pour les liens profonds envoyés aux invités. */
export const INVITATION_BASE_URL = 'https://1sakely.org';

type RoleFlags = { role_admin?: boolean; role_releveur?: boolean; role_client?: boolean };

/**
 * Normalise un numéro de téléphone au format international malgache (digits only, sans `+`),
 * tel qu'attendu par wa.me :
 *  - on ne garde que les chiffres ;
 *  - déjà international (commence par l'indicatif `261`) → conservé tel quel ;
 *  - commence par `0` (format local) → le `0` est remplacé par `261` ;
 *  - sinon → on préfixe `261`.
 * Ex. `032 89 95 681` ou `0328995681` → `261328995681`.
 */
export function normalizeWhatsappNumber(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('261')) return digits;
  if (digits.startsWith('0')) return '261' + digits.slice(1);
  return '261' + digits;
}

/** Libellé FR des rôles cumulés d'une invitation (pour le message). */
export function invitationRoleLabel(flags: RoleFlags): string {
  const parts: string[] = [];
  if (flags.role_admin) parts.push('Administrateur');
  if (flags.role_releveur) parts.push('Releveur');
  if (flags.role_client) parts.push('Client');
  return parts.join(' / ') || 'utilisateur';
}

/**
 * Chemin d'atterrissage (lien profond) selon le rôle :
 *  - Releveur OU Admin → saisie bassin/niveau,
 *  - Client seul       → espace client.
 */
export function invitationTargetPath(flags: RoleFlags): string {
  if (flags.role_admin || flags.role_releveur) return '/gestion-eau/releves?tab=bassin&bt=niveau';
  return '/gestion-eau/client';
}

/** URL complète d'atterrissage (base prod + cible enregistrée ou dérivée du rôle). */
export function invitationDeepLink(inv: { cible?: string | null } & RoleFlags): string {
  const path = inv.cible && inv.cible.trim() ? inv.cible : invitationTargetPath(inv);
  return path.startsWith('http') ? path : INVITATION_BASE_URL + path;
}

/**
 * Message FR pré-rempli. Insiste explicitement sur l'usage de CETTE adresse Google
 * (sinon l'octroi automatique ne matchera pas l'email).
 */
export function buildInvitationMessage(
  inv: { nom?: string | null; email: string; cible?: string | null } & RoleFlags
): string {
  const link = invitationDeepLink(inv);
  const greeting = inv.nom && inv.nom.trim() ? `Bonjour ${inv.nom.trim()},` : 'Bonjour,';
  return [
    `${greeting} vous êtes invité(e) comme ${invitationRoleLabel(inv)} sur l'application Gestion Eau AHUVI (BazarKELY).`,
    `1) Ouvrez ce lien : ${link}`,
    `2) Connectez-vous avec CE compte Google : ${inv.email}`,
    `⚠️ Important : connectez-vous bien avec CETTE adresse Google, sinon votre accès ne pourra pas s'activer.`,
    `Votre accès s'activera automatiquement. C'est gratuit et l'app fonctionne même hors connexion.`,
  ].join('\n');
}

/** Lien wa.me complet (numéro normalisé + message encodé) prêt à ouvrir. */
export function buildWhatsappUrl(
  inv: { nom?: string | null; email: string; phone?: string | null; cible?: string | null } & RoleFlags
): string {
  const digits = normalizeWhatsappNumber(inv.phone);
  const message = buildInvitationMessage(inv);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
