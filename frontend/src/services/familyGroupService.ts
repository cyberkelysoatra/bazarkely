/**
 * Service de gestion des groupes familiaux
 * Gère les opérations CRUD sur les groupes familiaux et leurs membres
 */

import { supabase, withTimeout } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { db } from '../lib/database';
import {
  readFamilyGroupsCache,
  writeFamilyGroupsCache,
} from '../lib/familyGroupsCache';
import type { SyncOperation } from '../types';
import { SYNC_PRIORITY } from '../types';
import type {
  FamilyGroup,
  FamilyMember,
  CreateFamilyGroupInput,
  JoinFamilyGroupInput,
  UpdateMemberInput,
  FamilyGroupSettings,
  FamilyRole,
} from '../types/family';

const SUPABASE_TIMEOUT_MS = 5000;
const LOG_TAG = '👨‍👩‍👧 [FamilyGroupService]';

/**
 * Lecture isOnline avec fallback navigator.onLine.
 */
function isOnline(): boolean {
  try {
    return useAppStore.getState().isOnline ?? navigator.onLine;
  } catch {
    return navigator.onLine;
  }
}

/**
 * Récupère l'utilisateur courant SANS faire de requête réseau (pattern S68).
 *
 * `supabase.auth.getUser()` fait un fetch HTTP vers /auth/v1/user → throw
 * `AuthRetryableFetchError` en mode offline. Ce helper résout dans l'ordre :
 * 1. `useAppStore.user` (Zustand, sync, instantané)
 * 2. `supabase.auth.getSession()` (lecture localStorage, pas de réseau)
 * 3. null
 */
export async function getCurrentUserSafe(): Promise<{ id: string } | null> {
  try {
    const storeUser = useAppStore.getState().user;
    if (storeUser?.id) return { id: storeUser.id };
  } catch {
    /* store pas encore initialisé */
  }
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) return { id: data.session.user.id };
  } catch {
    /* getSession ne devrait jamais throw */
  }
  return null;
}

/**
 * Settings par défaut pour un nouveau groupe familial
 */
const DEFAULT_GROUP_SETTINGS: FamilyGroupSettings = {
  sharingMode: 'selective',
  allowMemberInvites: true,
  requireApprovalForExpenses: false,
  defaultSplitType: 'split_equal',
  currency: 'MGA',
  notificationsEnabled: true,
};

/**
 * Crée un nouveau groupe familial
 * Le trigger auto-génère l'invite_code et ajoute le créateur comme admin
 * @param input - Données pour créer le groupe
 * @returns Le groupe créé avec son invite_code
 * @throws Error si l'utilisateur n'est pas authentifié ou en cas d'erreur
 */
export async function createFamilyGroup(
  input: CreateFamilyGroupInput
): Promise<FamilyGroup & { inviteCode: string }> {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserSafe();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    // S72 — La création de groupe nécessite Internet : le code d'invitation est
    // généré par un trigger Supabase et ne peut pas être connu côté client offline.
    if (!isOnline()) {
      throw new Error(
        'La création d\'un groupe familial nécessite une connexion Internet (pour générer le code d\'invitation)'
      );
    }

    // Préparer les données pour l'insertion
    const settings: FamilyGroupSettings = {
      ...DEFAULT_GROUP_SETTINGS,
      ...input.settings,
    };

    const { data, error } = await supabase
      .from('family_groups')
      .insert({
        name: input.name,
        created_by: user.id,
        settings: settings as any, // JSONB
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création du groupe familial:', error);
      throw new Error(`Erreur lors de la création du groupe: ${error.message}`);
    }

    if (!data) {
      throw new Error('Erreur lors de la création du groupe: aucune donnée retournée');
    }

    // Récupérer le groupe avec l'invite_code généré par le trigger
    const { data: groupData, error: fetchError } = await supabase
      .from('family_groups')
      .select('*, invite_code')
      .eq('id', (data as any).id)
      .single();

    if (fetchError || !groupData) {
      throw new Error('Erreur lors de la récupération du code d\'invitation');
    }

    // Convertir le format Supabase vers le format local
    const familyGroup: FamilyGroup & { inviteCode: string } = {
      id: groupData.id,
      name: groupData.name,
      createdBy: groupData.created_by,
      settings: groupData.settings as FamilyGroupSettings,
      createdAt: new Date(groupData.created_at),
      updatedAt: new Date(groupData.updated_at),
      inviteCode: (groupData as any).invite_code || '',
    };

    return familyGroup;
  } catch (error) {
    console.error('Erreur dans createFamilyGroup:', error);
    throw error;
  }
}

/**
 * Récupère tous les groupes familiaux de l'utilisateur connecté
 * @returns Liste des groupes avec le nombre de membres
 * @throws Error si l'utilisateur n'est pas authentifié
 */
export async function getUserFamilyGroups(): Promise<
  Array<FamilyGroup & { memberCount: number; inviteCode: string }>
> {
  // SWR offline-first (v3.14.1 S70):
  // 1. Lecture immédiate du cache localStorage (instantané, partagé avec FamilyContext via lib/familyGroupsCache).
  // 2. Si offline → retour direct du cache (ne throw plus, ne casse pas TransactionsPage/TransactionDetailPage/FamilyDashboardPage).
  // 3. Si online → tentative Supabase, fallback cache en cas d'échec, écriture du cache après succès.
  const cached: Array<FamilyGroup & { memberCount: number; inviteCode: string }> =
    readFamilyGroupsCache().map((g) => ({
      ...g,
      memberCount: g.memberCount ?? 0,
      inviteCode: g.inviteCode ?? '',
    }));

  // STEP 1: Offline → retour direct du cache
  if (!navigator.onLine) {
    return cached;
  }

  // STEP 2: Online → fetch Supabase avec fallback cache en cas d'échec
  try {
    const user = await getCurrentUserSafe();
    if (!user) {
      // Pas d'utilisateur identifiable → on retourne le cache (peut être vide) au lieu de throw
      return cached;
    }

    // Récupérer les liens user → groupes (memberships)
    const { data: memberships, error: membersError } = await supabase
      .from('family_members')
      .select('family_group_id, joined_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('joined_at', { ascending: false }) as any;

    if (membersError) {
      console.warn('getUserFamilyGroups: erreur récupération membres, fallback cache:', membersError);
      return cached;
    }

    if (!memberships || memberships.length === 0) {
      // L'utilisateur n'appartient à aucun groupe (online confirmé) → vide le cache pour cohérence
      writeFamilyGroupsCache([]);
      return [];
    }

    const groupIds = (memberships || []).map((m: any) => m.family_group_id);
    const membershipMap = new Map(
      (memberships || []).map((m: any) => [m.family_group_id, m.joined_at])
    );

    // Récupérer les groupes
    const { data: groups, error: groupsError } = await supabase
      .from('family_groups')
      .select('*, invite_code')
      .in('id', groupIds) as any;

    if (groupsError) {
      console.warn('getUserFamilyGroups: erreur récupération groupes, fallback cache:', groupsError);
      return cached;
    }

    if (!groups || groups.length === 0) {
      writeFamilyGroupsCache([]);
      return [];
    }

    // Trier par date de jointure décroissante (joined_at desc)
    const sortedGroups = (groups || []).sort((a: any, b: any) => {
      const joinedAtA = membershipMap.get(a.id);
      const joinedAtB = membershipMap.get(b.id);
      if (!joinedAtA || !joinedAtB) return 0;
      return new Date(joinedAtB).getTime() - new Date(joinedAtA).getTime();
    });

    // Compter les membres pour chaque groupe
    const groupsWithCounts = await Promise.all(
      sortedGroups.map(async (group: any) => {
        const { count, error: countError } = await supabase
          .from('family_members')
          .select('*', { count: 'exact', head: true })
          .eq('family_group_id', group.id)
          .eq('is_active', true);

        if (countError) {
          console.warn(`Erreur lors du comptage des membres pour le groupe ${group.id}:`, countError);
        }

        return {
          id: group.id,
          name: group.name,
          createdBy: group.created_by,
          settings: group.settings as FamilyGroupSettings,
          createdAt: new Date(group.created_at),
          updatedAt: new Date(group.updated_at),
          memberCount: count || 0,
          inviteCode: (group as any).invite_code || '',
        };
      })
    );

    // Persiste le résultat frais dans le cache pour les prochaines lectures offline
    writeFamilyGroupsCache(groupsWithCounts);

    return groupsWithCounts;
  } catch (error) {
    // Échec réseau / fetch failed → fallback cache (ne propage plus pour ne pas casser les pages appelantes)
    console.warn('getUserFamilyGroups: échec réseau, fallback cache:', error);
    return cached;
  }
}

/**
 * Récupère un groupe familial par son code d'invitation
 * @param code - Code d'invitation (case insensitive)
 * @returns Le groupe avec le nombre de membres et les infos du créateur, ou null si non trouvé ou expiré
 */
export async function getFamilyGroupByCode(
  code: string
): Promise<
  | (FamilyGroup & {
      memberCount: number;
      inviteCode: string;
      creator?: { id: string; username?: string; email?: string };
    })
  | null
> {
  try {
    if (!code || code.trim() === '') {
      return null;
    }

    // Recherche case-insensitive du code d'invitation
    const { data: group, error } = await supabase
      .from('family_groups')
      .select('*, invite_code')
      .ilike('invite_code', code.trim())
      .single() as any;

    if (error || !group) {
      // Code non trouvé
      return null;
    }

    // Vérifier si le code a expiré (si applicable - dépend de votre logique métier)
    // Pour l'instant, on suppose que les codes n'expirent pas sauf si spécifié dans la DB

    // Compter les membres
    const { count, error: countError } = await supabase
      .from('family_members')
      .select('*', { count: 'exact', head: true })
      .eq('family_group_id', group.id)
      .eq('is_active', true);

    if (countError) {
      console.warn(`Erreur lors du comptage des membres:`, countError);
    }

    // Récupérer les infos du créateur
    let creator;
    try {
      const { data: creatorData, error: creatorError } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('id', group.created_by)
        .single();

      if (!creatorError && creatorData) {
        creator = {
          id: creatorData.id,
          username: creatorData.username || undefined,
          email: creatorData.email || undefined,
        };
      }
    } catch (err) {
      console.warn('Erreur lors de la récupération du créateur:', err);
    }

    const groupData = group as any;
    return {
      id: groupData.id,
      name: groupData.name,
      createdBy: groupData.created_by,
      settings: groupData.settings as FamilyGroupSettings,
      createdAt: new Date(groupData.created_at),
      updatedAt: new Date(groupData.updated_at),
      memberCount: count || 0,
      inviteCode: groupData.invite_code || '',
      creator,
    };
  } catch (error) {
    console.error('Erreur dans getFamilyGroupByCode:', error);
    return null;
  }
}

/**
 * Rejoint un groupe familial avec un code d'invitation
 * @param input - Données pour rejoindre le groupe
 * @returns Le membre créé
 * @throws Error si le code est invalide, expiré, ou si l'utilisateur est déjà membre
 */
export async function joinFamilyGroup(
  input: JoinFamilyGroupInput
): Promise<FamilyMember> {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserSafe();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    // S72 — Rejoindre un groupe nécessite Internet : la validation du code
    // d'invitation et l'unicité de la membership sont vérifiées côté serveur.
    if (!isOnline()) {
      throw new Error(
        'Rejoindre un groupe familial nécessite une connexion Internet (validation du code d\'invitation)'
      );
    }

    // Vérifier que le groupe existe et que le code est valide
    let groupId = input.familyGroupId;
    if (input.invitationCode) {
      const group = await getFamilyGroupByCode(input.invitationCode);
      if (!group) {
        throw new Error('Code d\'invitation invalide ou expiré');
      }
      groupId = group.id;
    }

    if (!groupId) {
      throw new Error('ID du groupe ou code d\'invitation requis');
    }

    // Vérifier que l'utilisateur n'est pas déjà membre
    const { data: existingMember, error: checkError } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = not found, ce qui est OK
      throw new Error(`Erreur lors de la vérification: ${checkError.message}`);
    }

    if (existingMember) {
      throw new Error('Vous êtes déjà membre de ce groupe');
    }

    // Récupérer le nom d'affichage de l'utilisateur
    const { data: userData } = await supabase
      .from('users')
      .select('username, email')
      .eq('id', user.id)
      .single();

    const displayName = userData?.username || userData?.email || user.email || 'Membre';

    // Créer le membre
    const { data: member, error: insertError } = await supabase
      .from('family_members')
      .insert({
        family_group_id: groupId,
        user_id: user.id,
        display_name: displayName,
        role: 'member',
        is_active: true,
        invited_by: null, // Auto-join via code
      })
      .select()
      .single();

    if (insertError || !member) {
      throw new Error(`Erreur lors de l'ajout au groupe: ${insertError?.message || 'Erreur inconnue'}`);
    }

    // Convertir le format Supabase vers le format local
    const familyMember: FamilyMember = {
      id: member.id,
      familyGroupId: member.family_group_id,
      userId: member.user_id,
      email: member.email || undefined,
      phone: member.phone || undefined,
      displayName: member.display_name,
      role: member.role as FamilyRole,
      isActive: member.is_active,
      joinedAt: new Date(member.joined_at),
      invitedBy: member.invited_by || undefined,
    };

    return familyMember;
  } catch (error) {
    console.error('Erreur dans joinFamilyGroup:', error);
    throw error;
  }
}

/**
 * Récupère tous les membres d'un groupe familial
 * @param groupId - ID du groupe
 * @returns Liste des membres avec leurs profils utilisateur
 * @throws Error si l'utilisateur n'est pas authentifié ou n'est pas membre
 */
/**
 * Mappe une ligne Supabase `family_members` vers le type local FamilyMember.
 */
function mapMemberRow(member: any): FamilyMember {
  return {
    id: member.id,
    familyGroupId: member.family_group_id,
    userId: member.user_id,
    email: member.email || undefined,
    phone: member.phone || undefined,
    displayName: member.display_name,
    role: member.role as FamilyRole,
    isActive: member.is_active,
    joinedAt: new Date(member.joined_at),
    invitedBy: member.invited_by || undefined,
    user: undefined,
  };
}

/**
 * Trie : admin first, puis par joined_at.
 */
function sortMembers(members: FamilyMember[]): FamilyMember[] {
  return [...members].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  });
}

/**
 * Vérifie offline-safe qu'un utilisateur est membre actif d'un groupe familial.
 * Pattern SWR : 1) lecture Dexie (familyMembers cache) 2) si offline + cache absent
 * → assume true (l'erreur "pas membre" ne doit être levée qu'avec une info fiable,
 * pas par une absence de cache). 3) si online + cache absent → tenter Supabase et
 * peupler le cache.
 *
 * Utilisé par familySharingService 5 lectures (getFamilySharedTransactions, etc.)
 * pour remplacer le check inline `supabase.from('family_members').select(...).single()`
 * qui plantait avec `ERR_INTERNET_DISCONNECTED` en offline.
 */
export async function verifyMembership(
  familyGroupId: string,
  userId: string
): Promise<boolean> {
  // 1. Lecture Dexie d'abord
  try {
    const cached = await db.familyMembers
      .where('[familyGroupId+userId]')
      .equals([familyGroupId, userId])
      .first();
    if (cached?.isActive) return true;
  } catch {
    /* Dexie indisponible, on continue */
  }

  // 2. Cache miss : si offline, assume true (faire confiance plutôt que bloquer
  // l'utilisateur sur la base d'une vérification impossible)
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }

  // 3. Online : tenter Supabase et peupler le cache
  try {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_group_id', familyGroupId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (data && !error) {
      try {
        await db.familyMembers.put(mapMemberRow(data));
      } catch {
        /* erreur Dexie put non bloquante */
      }
      return true;
    }
  } catch {
    /* erreur réseau */
  }

  return false;
}

export async function getFamilyGroupMembers(
  groupId: string
): Promise<FamilyMember[]> {
  try {
    // Vérifier l'authentification (offline-safe)
    const user = await getCurrentUserSafe();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    // SWR : lecture Dexie d'abord (retour immédiat si peuplé)
    let cachedMembers: FamilyMember[] = [];
    try {
      cachedMembers = await db.familyMembers
        .where('[familyGroupId+isActive]')
        .equals([groupId, 1 as any])
        .toArray();
    } catch {
      // Dexie indisponible → fallback réseau plus bas
    }

    // Filtrer en mémoire car Dexie boolean indexing peut être tricky
    if (cachedMembers.length === 0) {
      try {
        cachedMembers = (await db.familyMembers
          .where('familyGroupId')
          .equals(groupId)
          .toArray())
          .filter((m) => m.isActive);
      } catch {
        /* ignore */
      }
    }

    // Si offline → retour direct du cache (vide acceptable, sans throw)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // Vérifier membership depuis cache : si vide, on suppose membre (cf. verifyMembership)
      // Si cache présent et user n'y est pas, throw fait sens
      if (cachedMembers.length > 0 && !cachedMembers.some((m) => m.userId === user.id)) {
        throw new Error('Vous n\'êtes pas membre de ce groupe');
      }
      return sortMembers(cachedMembers);
    }

    // Online : vérifier membership puis refresh
    const isMember = await verifyMembership(groupId, user.id);
    if (!isMember) {
      throw new Error('Vous n\'êtes pas membre de ce groupe');
    }

    // Refresh Supabase
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_group_id', groupId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });

    if (membersError) {
      // Si fetch échoue mais cache présent, retourner le cache
      if (cachedMembers.length > 0) {
        console.warn('[familyGroupService] Refresh membres échoué, retour cache:', membersError.message);
        return sortMembers(cachedMembers);
      }
      throw new Error(`Erreur lors de la récupération des membres: ${membersError.message}`);
    }

    if (!members) {
      return sortMembers(cachedMembers);
    }

    // Convertir et peupler Dexie
    const familyMembers: FamilyMember[] = members.map(mapMemberRow);
    try {
      // Supprimer les membres locaux du groupe (au cas où des membres sont devenus inactifs)
      // puis put tous les nouveaux
      await db.familyMembers.where('familyGroupId').equals(groupId).delete();
      await db.familyMembers.bulkPut(familyMembers);
    } catch (dexieError) {
      console.warn('[familyGroupService] Erreur peuplement cache familyMembers:', dexieError);
    }

    return sortMembers(familyMembers);
  } catch (error) {
    console.error('Erreur dans getFamilyGroupMembers:', error);
    throw error;
  }
}

/**
 * Met à jour les paramètres d'un membre
 * @param input - Données de mise à jour (doit inclure l'ID du membre via memberId)
 * @returns Le membre mis à jour
 * @throws Error si l'utilisateur n'est pas autorisé ou en cas d'erreur
 */
export async function updateMemberSettings(
  input: UpdateMemberInput & { memberId: string }
): Promise<FamilyMember> {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserSafe();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Récupérer le membre actuel
    const { data: currentMember, error: fetchError } = await supabase
      .from('family_members')
      .select('*, family_groups!inner(created_by)')
      .eq('id', input.memberId)
      .single();

    if (fetchError || !currentMember) {
      throw new Error('Membre non trouvé');
    }

    // Vérifier les autorisations : soit le membre lui-même, soit un admin
    const isOwnRecord = currentMember.user_id === user.id;
    const isAdmin = currentMember.role === 'admin' && currentMember.user_id === user.id;
    const isGroupCreator = (currentMember.family_groups as any)?.created_by === user.id;

    // Vérifier si l'utilisateur est admin du groupe (pour les modifications d'autres membres)
    let userMembership;
    if (!isOwnRecord && !isAdmin && !isGroupCreator) {
      const { data: membership } = await supabase
        .from('family_members')
        .select('role')
        .eq('family_group_id', currentMember.family_group_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      userMembership = membership;

      if (userMembership?.role !== 'admin' && !isGroupCreator) {
        throw new Error('Vous n\'êtes pas autorisé à modifier ce membre');
      }
    }

    // Préparer les données de mise à jour
    const updateData: any = {};
    if (input.displayName !== undefined) {
      updateData.display_name = input.displayName;
    }
    if (input.role !== undefined) {
      // Seul un admin peut changer le rôle
      if (!isAdmin && !isGroupCreator && userMembership?.role !== 'admin') {
        throw new Error('Seuls les administrateurs peuvent modifier les rôles');
      }
      updateData.role = input.role;
    }
    if (input.isActive !== undefined) {
      updateData.is_active = input.isActive;
    }

    // Mettre à jour
    const { data: updatedMember, error: updateError } = await supabase
      .from('family_members')
      .update(updateData)
      .eq('id', input.memberId)
      .select()
      .single();

    if (updateError || !updatedMember) {
      throw new Error(`Erreur lors de la mise à jour: ${updateError?.message || 'Erreur inconnue'}`);
    }

    // Convertir le format Supabase vers le format local
    const familyMember: FamilyMember = {
      id: updatedMember.id,
      familyGroupId: updatedMember.family_group_id,
      userId: updatedMember.user_id,
      email: updatedMember.email || undefined,
      phone: updatedMember.phone || undefined,
      displayName: updatedMember.display_name,
      role: updatedMember.role as FamilyRole,
      isActive: updatedMember.is_active,
      joinedAt: new Date(updatedMember.joined_at),
      invitedBy: updatedMember.invited_by || undefined,
    };

    return familyMember;
  } catch (error) {
    console.error('Erreur dans updateMemberSettings:', error);
    throw error;
  }
}

/**
 * Quitte un groupe familial
 * @param groupId - ID du groupe à quitter
 * @throws Error si l'utilisateur est le dernier admin ou en cas d'erreur
 */
export async function leaveFamilyGroup(groupId: string): Promise<void> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');

  // Lecture locale : trouver la membership actuelle de l'utilisateur dans ce groupe
  const localMemberships = await db.familyMembers
    .where('[familyGroupId+userId]')
    .equals([groupId, user.id])
    .toArray();
  const currentMember = localMemberships.find((m) => m.isActive);

  if (!currentMember) {
    throw new Error("Vous n'êtes pas membre de ce groupe");
  }

  // Vérifier qu'il n'est pas le dernier admin (lecture locale)
  if (currentMember.role === 'admin') {
    const allMembers = await db.familyMembers
      .where('familyGroupId')
      .equals(groupId)
      .toArray();
    const activeAdmins = allMembers.filter((m) => m.isActive && m.role === 'admin');
    if (activeAdmins.length <= 1) {
      throw new Error(
        'Vous ne pouvez pas quitter le groupe car vous êtes le dernier administrateur'
      );
    }
  }

  // STEP 1: Soft delete local (is_active → false)
  await db.familyMembers.update(currentMember.id, { isActive: false });

  // STEP 2: Push Supabase ou queue
  const supabasePayload = { is_active: false };

  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase
          .from('family_members')
          .update(supabasePayload as any)
          .eq('id', currentMember.id),
        SUPABASE_TIMEOUT_MS,
        'familyGroupService.leaveFamilyGroup'
      );
      if (error) throw error;
    } catch (error) {
      console.warn(`${LOG_TAG} ⚠️ leaveFamilyGroup Supabase échoué, queue:`, error);
      const syncOp: SyncOperation = {
        id: crypto.randomUUID(),
        userId: user.id,
        operation: 'UPDATE',
        table_name: 'family_members',
        data: { id: currentMember.id, ...supabasePayload },
        timestamp: new Date(),
        retryCount: 0,
        status: 'pending',
        priority: SYNC_PRIORITY.NORMAL,
        syncTag: 'bazarkely-sync',
        expiresAt: null,
      };
      await db.syncQueue.add(syncOp);
    }
  } else {
    const syncOp: SyncOperation = {
      id: crypto.randomUUID(),
      userId: user.id,
      operation: 'UPDATE',
      table_name: 'family_members',
      data: { id: currentMember.id, ...supabasePayload },
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending',
      priority: SYNC_PRIORITY.NORMAL,
      syncTag: 'bazarkely-sync',
      expiresAt: null,
    };
    await db.syncQueue.add(syncOp);
  }
}

/**
 * Supprime un membre d'un groupe (admin uniquement)
 * @param groupId - ID du groupe
 * @param userId - ID de l'utilisateur à supprimer
 * @throws Error si l'utilisateur n'est pas admin, essaie de se supprimer lui-même, ou en cas d'erreur
 */
export async function removeMember(groupId: string, userId: string): Promise<void> {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserSafe();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Ne pas permettre de se supprimer soi-même (utiliser leaveFamilyGroup à la place)
    if (user.id === userId) {
      throw new Error('Utilisez la fonction leaveFamilyGroup pour quitter le groupe');
    }

    // Vérifier que l'utilisateur est admin du groupe
    const { data: adminMembership, error: adminError } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_group_id', groupId)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .eq('is_active', true)
      .single();

    if (adminError || !adminMembership) {
      throw new Error('Seuls les administrateurs peuvent supprimer des membres');
    }

    // Vérifier que le membre à supprimer existe
    const { data: memberToRemove, error: memberError } = await supabase
      .from('family_members')
      .select('id, role')
      .eq('family_group_id', groupId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (memberError || !memberToRemove) {
      throw new Error('Membre non trouvé');
    }

    // Vérifier qu'on ne supprime pas le dernier admin
    if (memberToRemove.role === 'admin') {
      const { count, error: countError } = await supabase
        .from('family_members')
        .select('*', { count: 'exact', head: true })
        .eq('family_group_id', groupId)
        .eq('role', 'admin')
        .eq('is_active', true);

      if (countError) {
        throw new Error(`Erreur lors de la vérification: ${countError.message}`);
      }

      if (count === 1) {
        throw new Error('Impossible de supprimer le dernier administrateur du groupe');
      }
    }

    // Supprimer le membre (soft delete)
    const { error: deleteError } = await supabase
      .from('family_members')
      .update({ is_active: false })
      .eq('id', memberToRemove.id);

    if (deleteError) {
      throw new Error(`Erreur lors de la suppression: ${deleteError.message}`);
    }
  } catch (error) {
    console.error('Erreur dans removeMember:', error);
    throw error;
  }
}

/**
 * Régénère le code d'invitation d'un groupe (admin uniquement)
 * @param groupId - ID du groupe
 * @returns Le nouveau code d'invitation
 * @throws Error si l'utilisateur n'est pas admin ou en cas d'erreur
 */
export async function regenerateInviteCode(groupId: string): Promise<string> {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserSafe();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Vérifier que l'utilisateur est admin du groupe
    const { data: adminMembership, error: adminError } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_group_id', groupId)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .eq('is_active', true)
      .single();

    if (adminError || !adminMembership) {
      throw new Error('Seuls les administrateurs peuvent régénérer le code d\'invitation');
    }

    // Appeler la fonction RPC pour générer un nouveau code
    const { data: newCode, error: rpcError } = await supabase.rpc('generate_family_invite_code');

    if (rpcError || !newCode) {
      throw new Error(`Erreur lors de la génération du code: ${rpcError?.message || 'Erreur inconnue'}`);
    }

    // Mettre à jour le groupe avec le nouveau code
    const { error: updateError } = await supabase
      .from('family_groups')
      .update({ invite_code: newCode })
      .eq('id', groupId);

    if (updateError) {
      throw new Error(`Erreur lors de la mise à jour: ${updateError.message}`);
    }

    return newCode;
  } catch (error) {
    console.error('Erreur dans regenerateInviteCode:', error);
    throw error;
  }
}

