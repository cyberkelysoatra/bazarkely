/**
 * Gestion des rôles du module (eau_roles : admin / releveur, cumulables).
 * Offline-first : lecture Dexie d'abord ; pull/push Supabase en arrière-plan.
 *
 * Bootstrap « premier admin = propriétaire » : si AUCUN admin n'existe (ni local,
 * ni serveur après pull), le premier utilisateur authentifié qui ouvre le module
 * devient admin (son flag est initialisé dans eau_roles).
 */
import { eauDb } from '../db/gestionEauDb';
import { pullTable, saveLocal } from './eauSync';
import { nowIso } from '../utils/id';
import { supabase, withTimeout } from '../../../lib/supabase';
import type { RoleLocal, EauRoles } from '../types/gestionEau';

/** Timeout des requêtes réseau du service de rôles (RPC bootstrap) — cf. CLAUDE.md. */
const ROLE_RPC_TIMEOUT_MS = 8000;

/** Rôles d'un utilisateur (admin/releveur depuis Dexie, client dérivé des comptes client). */
export async function getRolesForUser(userId: string): Promise<EauRoles> {
  const row = (await eauDb.eau_roles.get(userId)) as RoleLocal | undefined;
  // client : dérivé d'un compte client lié à ce user (inexploité en phase 1)
  const clientCompte = await eauDb.eau_comptes_client.where('user_id').equals(userId).first();
  return {
    admin: row?.admin ?? false,
    releveur: row?.releveur ?? false,
    client: !!clientCompte,
  };
}

/** Y a-t-il au moins un admin connu localement ? */
export async function hasAnyAdminLocal(): Promise<boolean> {
  const admins = await eauDb.eau_roles.where('admin').equals(1 as any).count().catch(() => 0);
  if (admins > 0) return true;
  // Fallback robuste (booléens non indexables uniformément selon les environnements)
  const all = (await eauDb.eau_roles.toArray()) as RoleLocal[];
  return all.some((r) => r.admin === true);
}

/** Définit/écrase les rôles admin+releveur d'un utilisateur (upsert idempotent). */
export async function setRoles(userId: string, roles: { admin: boolean; releveur: boolean }): Promise<RoleLocal> {
  const record: RoleLocal = {
    user_id: userId,
    admin: roles.admin,
    releveur: roles.releveur,
    updated_at: nowIso(),
  };
  return saveLocal('eau_roles', record);
}

/**
 * Initialise l'accès du user au montage du module et applique le bootstrap propriétaire.
 * Retourne les rôles effectifs après bootstrap éventuel.
 *
 * Phase 1 (sécurité) : le bootstrap « premier admin = propriétaire » est désormais
 * fait CÔTÉ SERVEUR via la RPC idempotente `eau_bootstrap_admin()` (SECURITY DEFINER) :
 * elle pose admin = true sur `auth.uid()` UNIQUEMENT s'il n'existe encore aucun admin.
 * On ne pousse plus jamais une ligne de rôle admin depuis le client (fragile + bientôt
 * refusé par la RLS). Hors-ligne : on lit l'état local pour l'affichage, sans push.
 */
export async function ensureRolesBootstrap(userId: string, online: boolean): Promise<EauRoles> {
  if (online) {
    // 1. Bootstrap propriétaire côté serveur (idempotent : no-op si un admin existe déjà).
    try {
      await withTimeout(
        (supabase.rpc as any)('eau_bootstrap_admin'),
        ROLE_RPC_TIMEOUT_MS,
        'eau:bootstrapAdmin'
      );
    } catch (e: any) {
      // Best-effort : un timeout/erreur ne doit pas bloquer l'ouverture du module.
      console.warn('⚠️ [eauRole] eau_bootstrap_admin RPC échec (rejouable):', e?.message);
    }

    // 2. Tirer l'état serveur des rôles + comptes client (source de vérité).
    await pullTable('eau_roles');
    await pullTable('eau_comptes_client');
  }

  // 3. Dériver les rôles effectifs depuis Dexie (en ligne : à jour ; hors-ligne : dernier connu).
  return getRolesForUser(userId);
}

/** Liste tous les utilisateurs ayant un rôle (pour l'écran d'administration). */
export async function listRoles(): Promise<RoleLocal[]> {
  return (await eauDb.eau_roles.toArray()) as RoleLocal[];
}

export interface UserInfo {
  id: string;
  email: string | null;
  username: string | null;
}

/**
 * Résout (best-effort, online) email/username depuis la table partagée `users`.
 * RLS peut restreindre : on renvoie une map partielle (jamais d'erreur bloquante).
 */
export async function fetchUserDirectory(ids: string[]): Promise<Map<string, UserInfo>> {
  const map = new Map<string, UserInfo>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return map;
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;
  if (!online) return map;
  try {
    const { data } = (await withTimeout(
      supabase.from('users').select('id, email, username').in('id', unique) as any,
      8000,
      'eau:userDirectory'
    )) as any;
    if (Array.isArray(data)) {
      for (const u of data) map.set(u.id, { id: u.id, email: u.email ?? null, username: u.username ?? null });
    }
  } catch {
    /* best-effort */
  }
  return map;
}
