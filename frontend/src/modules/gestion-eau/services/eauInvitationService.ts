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

/** Clé sessionStorage portant le jeton d'invitation capturé sur la vitrine `/i/<token>`. */
export const PENDING_TOKEN_KEY = 'eau_pending_invitation_token';

/**
 * Octroi automatique « invitation vitrine WhatsApp par JETON » (Phase 1) : si un jeton
 * a été capturé (vitrine `/i/<token>`) et déposé dans `sessionStorage`, appelle la RPC
 * `eau_claim_invitation_by_token` pour attribuer les rôles (et créer/activer le compte
 * client + compteurs si demandé). Au succès (id non null), retire le jeton du
 * sessionStorage (usage unique). En hors-ligne ou échec, le jeton est CONSERVÉ pour
 * réessayer au prochain login. Best-effort : ne JETTE jamais, n'écrit rien en local —
 * le pull des rôles/comptes reflète l'octroi.
 */
export async function claimPendingTokenInvitation(online: boolean): Promise<string | null> {
  let token: string | null = null;
  try {
    token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(PENDING_TOKEN_KEY) : null;
  } catch {
    token = null;
  }
  if (!token || !online) return null;
  try {
    const { data, error } = (await withTimeout(
      (supabase.rpc as any)('eau_claim_invitation_by_token', { p_token: token }),
      8000,
      'eau:claim-token'
    )) as any;
    if (error) return null;
    const id = (data as string | null) ?? null;
    if (id) {
      try {
        sessionStorage.removeItem(PENDING_TOKEN_KEY);
      } catch {
        /* ignore */
      }
    }
    return id;
  } catch {
    // Réseau/timeout : jeton conservé, réessai au prochain login. Ne casse jamais le boot.
    return null;
  }
}

/** État public d'un jeton d'invitation (vu par la vitrine `/i/<token>`, ÉVO 1). */
export type InviteTokenState = 'valid' | 'used' | 'expired' | 'revoked' | 'unknown';

/**
 * État public d'un jeton d'invitation (appel RPC ANONYME `eau_invitation_token_state`).
 * Aucune donnée nominative renvoyée — uniquement le libellé d'état. Par défaut `'unknown'`
 * en cas d'erreur/hors-ligne, pour que la vitrine (ÉVO 2) montre la page marketing plutôt
 * qu'une inscription trompeuse sur un lien peut-être mort.
 */
export async function getInvitationTokenState(token: string): Promise<InviteTokenState> {
  if (!token) return 'unknown';
  try {
    const { data, error } = (await withTimeout(
      (supabase.rpc as any)('eau_invitation_token_state', { p_token: token }),
      6000,
      'eau:token-state'
    )) as any;
    if (error || data == null) return 'unknown';
    const s = String(Array.isArray(data) ? data[0] : data);
    return (['valid', 'used', 'expired', 'revoked', 'unknown'] as const).includes(s as any)
      ? (s as InviteTokenState)
      : 'unknown';
  } catch {
    return 'unknown';
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
    // Canal email : octroi par correspondance d'adresse Google (pas de jeton).
    token: existing?.token ?? null,
    expires_at: existing?.expires_at ?? null,
    invite_channel: 'email',
  };
  return saveLocal('eau_invitations', record);
}

// ───────────────────── Invitation vitrine WhatsApp (JETON) — Phase 1 ─────────────────────

/**
 * Génère un jeton d'enrôlement aléatoire, unguessable et URL-safe (base64url de 16
 * octets aléatoires → 22 caractères, ~128 bits d'entropie). Ce n'est PAS l'id de la
 * ligne : le jeton seul circule (lien `/i/<token>`) sans révéler l'identifiant interne.
 */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // base64url sans padding
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** URL de la vitrine d'invitation : prod `https://1sakely.org/i/<token>` ; en dev, l'origine courante. */
export function buildInviteUrl(token: string): string {
  const base =
    (import.meta as any)?.env?.DEV && typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : INVITATION_BASE_URL;
  return `${base}/i/${token}`;
}

export interface WhatsappInvitationInput {
  /** Numéro WhatsApp (requis) — normalisé en 261XXXXXXXXX. */
  phone: string;
  nom?: string | null;
  role_admin?: boolean;
  role_releveur?: boolean;
  role_client?: boolean;
  compteur_ids?: string[];
  /** Délai d'expiration en jours (ex. 7 / 30 / 90) ; null/0 = pas d'expiration. */
  expiresInDays?: number | null;
  invited_by?: string | null;
}

/**
 * Crée une invitation par JETON (canal WhatsApp) : pas d'email d'avance, l'octroi se
 * fait au 1er login sur correspondance du jeton (et non de l'adresse Google). Offline-first
 * (`saveLocal` + push best-effort). Renvoie l'InvitationLocal (avec son `token`).
 */
export async function createWhatsappInvitation(input: WhatsappInvitationInput): Promise<InvitationLocal> {
  const phone = normalizeWhatsappNumber(input.phone);
  const roles = {
    role_admin: input.role_admin ?? false,
    role_releveur: input.role_releveur ?? false,
    role_client: input.role_client ?? false,
  };
  const days = input.expiresInDays ?? null;
  const expires_at =
    days && days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
  const record: InvitationLocal = {
    id: newId(),
    email: null,
    nom: input.nom ?? null,
    phone,
    role_admin: roles.role_admin,
    role_releveur: roles.role_releveur,
    role_client: roles.role_client,
    compteur_ids: input.compteur_ids ?? [],
    cible: invitationTargetPath(roles),
    statut: 'en_attente',
    invited_by: input.invited_by ?? null,
    created_at: nowIso(),
    accepted_by: null,
    accepted_at: null,
    token: generateInviteToken(),
    expires_at,
    invite_channel: 'whatsapp',
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
  inv: { nom?: string | null; email: string | null; cible?: string | null } & RoleFlags
): string {
  const link = invitationDeepLink(inv);
  const greeting = inv.nom && inv.nom.trim() ? `Bonjour ${inv.nom.trim()},` : 'Bonjour,';
  return [
    `${greeting} vous êtes invité(e) comme ${invitationRoleLabel(inv)} sur l'application Gestion Eau AHUVI (BazarKELY).`,
    `1) Ouvrez ce lien : ${link}`,
    `2) Connectez-vous avec CE compte Google : ${inv.email ?? ''}`,
    `⚠️ Important : connectez-vous bien avec CETTE adresse Google, sinon votre accès ne pourra pas s'activer.`,
    `Votre accès s'activera automatiquement. C'est gratuit et l'app fonctionne même hors connexion.`,
  ].join('\n');
}

/** Lien wa.me complet (numéro normalisé + message encodé) prêt à ouvrir. */
export function buildWhatsappUrl(
  inv: { nom?: string | null; email: string | null; phone?: string | null; cible?: string | null } & RoleFlags
): string {
  const digits = normalizeWhatsappNumber(inv.phone);
  const message = buildInvitationMessage(inv);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// ───────────────── Invitation par JETON (canal WhatsApp) — Phase 4 ─────────────────
// Contrairement au canal email, le message NE doit PAS exiger une adresse Google
// précise : c'est le JETON du lien `/i/<token>` qui enrôle, quel que soit le compte
// Google choisi par l'invité. Le LIEN est le cœur du message (il porte l'aperçu image).

/**
 * Message FR pré-rempli pour une invitation par jeton (WhatsApp). On insiste sur le
 * lien (à toucher) et on précise que n'importe quel compte Google convient — surtout
 * pas d'adresse imposée (l'octroi se fait par correspondance du jeton, pas de l'email).
 */
export function buildWhatsappInviteMessage(inv: { nom?: string | null; token: string | null }): string {
  const link = inv.token ? buildInviteUrl(inv.token) : INVITATION_BASE_URL;
  const greeting = inv.nom && inv.nom.trim() ? `Bonjour ${inv.nom.trim()} 👋` : 'Bonjour 👋';
  return [
    greeting,
    `Vous êtes invité(e) à rejoindre *Gestion Eau AHUVI*.`,
    `👉 Touchez ce lien pour voir et confirmer : ${link}`,
    `Connectez-vous avec le compte Google de votre choix. C'est gratuit et l'app marche même hors connexion.`,
  ].join('\n');
}

/**
 * Lien wa.me complet pour une invitation par jeton (numéro normalisé + message encodé).
 * Le message contient le lien `/i/<token>` ; « Renvoyer » réutilise le MÊME jeton.
 */
export function buildWhatsappInviteUrl(
  inv: { nom?: string | null; phone?: string | null; token: string | null }
): string {
  const digits = normalizeWhatsappNumber(inv.phone);
  const message = buildWhatsappInviteMessage(inv);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
