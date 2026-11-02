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

/**
 * Démarrage à froid (cache Dexie vide) : le pull serveur des rôles peut être lent ou
 * échouer transitoirement. On réessaie quelques fois (modèle waitForEauSession) AVANT
 * de conclure quoi que ce soit — pour ne JAMAIS rebondir un admin vers /dashboard sur
 * un simple échec de pull. Bornes courtes : le spinner couvre cette fenêtre.
 */
const ROLE_PULL_MAX_ATTEMPTS = 3;
const ROLE_PULL_RETRY_MS = 500;

/** Résultat de la résolution des rôles au montage (avec confirmation de fiabilité). */
export interface RolesResolution {
  roles: EauRoles;
  /**
   * `true` = on connaît de façon FIABLE les rôles de ce user :
   *   - en ligne : le pull serveur `eau_roles` a réussi (réponse OK, même vide) ;
   *   - hors-ligne : un état local existe déjà (rôle ou compte client en cache).
   * `false` = état NON résolu (pull raté/timeout à froid, ou hors-ligne sans cache).
   * La garde d'accès ne doit JAMAIS rediriger vers /dashboard quand `confirmed:false`.
   */
  confirmed: boolean;
}

/** Rôles d'un utilisateur (admin/releveur depuis Dexie, client dérivé des comptes client). */
export async function getRolesForUser(userId: string): Promise<EauRoles> {
  const row = (await eauDb.eau_roles.get(userId)) as RoleLocal | undefined;
  // client : dérivé d'un compte client d'eau OU d'une fiche client électricité active (ELEC-CC-02).
  const dom = await getClientDomaines(userId);
  return {
    admin: row?.admin ?? false,
    releveur: row?.releveur ?? false,
    client: dom.eau || dom.elec,
    promoteur: row?.promoteur ?? false,
    // Domaine Electricite (ELEC-CC-01). Vieux cache local sans ces colonnes = false.
    releveurElec: row?.releveur_elec ?? false,
    gestionElec: row?.gestion_elec ?? false,
    lectureElec: row?.lecture_elec ?? false,
    validationElec: row?.validation_elec ?? false,
  };
}

/**
 * Domaines du compte en tant que CLIENT (lecture locale) : eau = compte client d'eau lié,
 * elec = fiche client RTB Énergie active portant ce compte (ELEC-CC-02).
 */
export async function getClientDomaines(userId: string): Promise<{ eau: boolean; elec: boolean }> {
  const clientCompte = await eauDb.eau_comptes_client.where('user_id').equals(userId).first();
  const elec = (await eauDb.eau_elec_clients.toArray()).some(
    (c) => c.user_id === userId && c.statut === 'actif'
  );
  return { eau: !!clientCompte, elec };
}

/** Y a-t-il au moins un admin connu localement ? */
export async function hasAnyAdminLocal(): Promise<boolean> {
  const admins = await eauDb.eau_roles.where('admin').equals(1 as any).count().catch(() => 0);
  if (admins > 0) return true;
  // Fallback robuste (booléens non indexables uniformément selon les environnements)
  const all = (await eauDb.eau_roles.toArray()) as RoleLocal[];
  return all.some((r) => r.admin === true);
}

/**
 * Définit/écrase les rôles d'un utilisateur (upsert idempotent). Les rôles électricité
 * non fournis sont REPRIS de la ligne existante (un appelant « eau » comme la validation
 * d'une demande d'accès ne doit jamais effacer un rôle électricité).
 */
export async function setRoles(
  userId: string,
  roles: {
    admin: boolean;
    releveur: boolean;
    promoteur?: boolean;
    releveurElec?: boolean;
    gestionElec?: boolean;
    lectureElec?: boolean;
    validationElec?: boolean;
  }
): Promise<RoleLocal> {
  const existing = (await eauDb.eau_roles.get(userId)) as RoleLocal | undefined;
  const record: RoleLocal = {
    user_id: userId,
    admin: roles.admin,
    releveur: roles.releveur,
    promoteur: roles.promoteur ?? false,
    releveur_elec: roles.releveurElec ?? existing?.releveur_elec ?? false,
    gestion_elec: roles.gestionElec ?? existing?.gestion_elec ?? false,
    lecture_elec: roles.lectureElec ?? existing?.lecture_elec ?? false,
    validation_elec: roles.validationElec ?? existing?.validation_elec ?? false,
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
export async function ensureRolesBootstrap(userId: string, online: boolean): Promise<RolesResolution> {
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

    // 2. Tirer l'état serveur des rôles (source de vérité), AVEC RETRY : un pull raté
    //    à froid ne doit pas être interprété comme « aucun rôle ». On ne confirme que
    //    si le serveur a réellement répondu (res.ok).
    let rolesPullOk = false;
    for (let attempt = 1; attempt <= ROLE_PULL_MAX_ATTEMPTS; attempt++) {
      const res = await pullTable('eau_roles');
      if (res.ok) {
        rolesPullOk = true;
        break;
      }
      if (attempt < ROLE_PULL_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, ROLE_PULL_RETRY_MS));
      }
    }
    // Comptes client : best-effort (n'affecte pas la confirmation de l'accès admin/releveur).
    await pullTable('eau_comptes_client');
    // Fiches clients électricité (ELEC-CC-02) : un client RTB lit sa seule fiche (RLS).
    await pullTable('eau_elec_clients');

    // 3. Dériver les rôles effectifs depuis Dexie (à jour si le pull a réussi).
    const roles = await getRolesForUser(userId);
    return { roles, confirmed: rolesPullOk };
  }

  // Hors-ligne : aucun réseau possible. « Confirmé » = on dispose déjà d'un état local
  // pour ce user (ligne de rôle OU compte client en cache) → dernier état connu fiable.
  // Sinon (hors-ligne sans aucun cache) : non résolu → la garde affichera un écran
  // d'attente plutôt qu'un rebond silencieux vers /dashboard.
  const roles = await getRolesForUser(userId);
  const roleRow = await eauDb.eau_roles.get(userId);
  return { roles, confirmed: !!roleRow || roles.client };
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
