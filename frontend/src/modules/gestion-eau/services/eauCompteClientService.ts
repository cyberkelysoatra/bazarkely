/**
 * Comptes clients (eau_comptes_client) + enrôlement par code — offline-first.
 *
 * Cycle de vie :
 *  1. L'admin crée un compte client (nom, contact, compteurs visibles) → génère un
 *     code d'enrôlement unique, `user_id=null`, `actif=false` (en attente d'activation).
 *  2. Le client se connecte avec Google + saisit le code → `linkByEnrolementCode`
 *     remplit `user_id` et passe `actif=true`. Le rôle `client` devient effectif
 *     (getRolesForUser le dérive d'un compte client lié au user).
 */
import { supabase, withTimeout } from '../../../lib/supabase';
import { eauDb } from '../db/gestionEauDb';
import { pullTable, saveLocal } from './eauSync';
import { newId, nowIso } from '../utils/id';
import { genCodeEnrolement, genCodeQr, normalizeCode } from '../utils/codes';
import type { CompteClientLocal } from '../types/gestionEau';

export interface CompteClientInput {
  nom: string;
  contact?: string | null;
  compteur_ids?: string[];
  created_by?: string | null;
}

export async function listComptesClient(): Promise<CompteClientLocal[]> {
  const all = (await eauDb.eau_comptes_client.toArray()) as CompteClientLocal[];
  return all.sort((a, b) => a.nom.localeCompare(b.nom));
}

export async function getCompteClient(id: string): Promise<CompteClientLocal | null> {
  return ((await eauDb.eau_comptes_client.get(id)) as CompteClientLocal | undefined) ?? null;
}

/** Compte client lié à un utilisateur (ou null). Sert à dériver le rôle `client`. */
export async function getCompteClientForUser(userId: string): Promise<CompteClientLocal | null> {
  const found = await eauDb.eau_comptes_client.where('user_id').equals(userId).first();
  return (found as CompteClientLocal | undefined) ?? null;
}

/** Génère un code d'enrôlement non encore utilisé localement. */
async function genUniqueEnrolement(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = genCodeEnrolement();
    const exists = await eauDb.eau_comptes_client.where('code_enrolement').equals(code).first();
    if (!exists) return code;
  }
  // Très improbable — rallonge en dernier recours.
  return genCodeEnrolement() + genCodeEnrolement();
}

/**
 * Crée un compte client en attente d'activation. Retourne le compte (le code
 * d'enrôlement à transmettre est dans `code_enrolement`).
 */
export async function createCompteClient(input: CompteClientInput): Promise<CompteClientLocal> {
  const code = await genUniqueEnrolement();
  const record: CompteClientLocal = {
    id: newId(),
    nom: input.nom,
    contact: input.contact ?? null,
    compteur_ids: input.compteur_ids ?? [],
    code_enrolement: code,
    code_qr: genCodeQr(),
    user_id: null,
    actif: false,
    created_by: input.created_by ?? null,
    created_at: nowIso(),
  };
  return saveLocal('eau_comptes_client', record);
}

export async function updateCompteClient(
  id: string,
  patch: Partial<Pick<CompteClientLocal, 'nom' | 'contact' | 'compteur_ids' | 'actif'>>
): Promise<CompteClientLocal | null> {
  const current = await getCompteClient(id);
  if (!current) return null;
  const merged: CompteClientLocal = { ...current, ...patch };
  return saveLocal('eau_comptes_client', merged);
}

export type LinkResult =
  | { ok: true; compte: CompteClientLocal }
  | { ok: false; reason: 'invalide' | 'deja_utilise' };

/**
 * Lie un compte Google (userId) au compte client pré-créé via le code d'enrôlement.
 * - code introuvable → `invalide`
 * - code déjà rattaché à un AUTRE utilisateur → `deja_utilise`
 * - déjà rattaché au MÊME utilisateur → ok idempotent
 */
export async function linkByEnrolementCode(
  rawCode: string,
  userId: string
): Promise<LinkResult> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, reason: 'invalide' };

  // Enrôlement CÔTÉ SERVEUR (RLS Phase 2) : un client sans rôle ne peut plus lire
  // `eau_comptes_client` en clair → on délègue le rattachement à la RPC SECURITY DEFINER
  // `eau_claim_enrolement`, qui pose `user_id = auth.uid()` + `actif = true` SI le code est
  // libre (ou déjà rattaché à soi). Elle retourne l'id du compte, ou `null` si le code est
  // introuvable OU déjà pris par un AUTRE utilisateur (indistinguables sous RLS → traités
  // comme « invalide » ; l'ancienne nuance `deja_utilise` n'est plus observable côté client).
  let claimedId: string | null = null;
  try {
    const { data, error } = (await withTimeout(
      (supabase.rpc as any)('eau_claim_enrolement', { p_code: code }),
      8000,
      'eau:claimEnrolement'
    )) as any;
    if (error) return { ok: false, reason: 'invalide' };
    claimedId = (data as string | null) ?? null;
  } catch {
    // Réseau/timeout : rattachement non confirmé → invalide (l'utilisateur peut réessayer).
    return { ok: false, reason: 'invalide' };
  }
  if (!claimedId) return { ok: false, reason: 'invalide' };

  // Le compte est désormais lisible par le client (user_id = soi) → on le rapatrie en local.
  await pullTable('eau_comptes_client').catch(() => {});
  const compte = await getCompteClient(claimedId);
  if (compte) return { ok: true, compte };

  // Pull réseau raté mais rattachement serveur réussi : on synthétise une ligne locale
  // minimale (non `_dirty` : déjà persistée serveur, pas de push) pour que le rôle client
  // soit dérivé immédiatement ; les champs complets seront rafraîchis au prochain pull.
  const fallback: CompteClientLocal = {
    id: claimedId,
    nom: '',
    contact: null,
    compteur_ids: [],
    code_enrolement: code,
    code_qr: '',
    user_id: userId,
    actif: true,
    created_by: null,
    created_at: nowIso(),
  };
  await eauDb.eau_comptes_client.put({ ...fallback, _dirty: false } as any);
  return { ok: true, compte: fallback };
}

/**
 * Garantit qu'un utilisateur déjà authentifié dispose d'un compte client actif avec
 * les compteurs visibles donnés (utilisé à la validation d'une demande d'accès).
 * Met à jour le compte existant ou en crée un nouveau (déjà lié + actif).
 */
export async function ensureActivatedClientForUser(
  userId: string,
  nom: string,
  compteurIds: string[],
  createdBy?: string | null
): Promise<CompteClientLocal> {
  const existing = await getCompteClientForUser(userId);
  if (existing) {
    const merged: CompteClientLocal = {
      ...existing,
      compteur_ids: compteurIds,
      actif: true,
      nom: existing.nom || nom,
    };
    return saveLocal('eau_comptes_client', merged);
  }
  const record: CompteClientLocal = {
    id: newId(),
    nom,
    contact: null,
    compteur_ids: compteurIds,
    code_enrolement: await genUniqueEnrolement(),
    code_qr: genCodeQr(),
    user_id: userId,
    actif: true,
    created_by: createdBy ?? null,
    created_at: nowIso(),
  };
  return saveLocal('eau_comptes_client', record);
}

export async function refreshComptesClient(online: boolean): Promise<CompteClientLocal[]> {
  if (online) await pullTable('eau_comptes_client');
  return listComptesClient();
}
