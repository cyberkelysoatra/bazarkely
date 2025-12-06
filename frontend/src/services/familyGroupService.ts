/**
 * Service de gestion des groupes familiaux
 * Gère les opérations CRUD sur les groupes familiaux et leurs membres
 */

import { supabase } from '../lib/supabase';
import type {
  FamilyGroup,
  FamilyMember,
  CreateFamilyGroupInput,
  JoinFamilyGroupInput,
  UpdateMemberInput,
  FamilyGroupSettings,
  FamilyRole,
} from '../types/family';

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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
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
  try {
    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Récupérer les groupes où l'utilisateur est membre avec la date de jointure
    const { data: memberships, error: membersError } = await supabase
      .from('family_members')
      .select('family_group_id, joined_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('joined_at', { ascending: false }) as any;

    if (membersError) {
      throw new Error(`Erreur lors de la récupération des membres: ${membersError.message}`);
    }

    if (!memberships || memberships.length === 0) {
      return [];
    }

    const groupIds = (memberships || []).map((m: any) => m.family_group_id);
    const membershipMap = new Map(
      (memberships || []).map((m: any) => [m.family_group_id, m.joined_at])
    );

    // Récupérer les groupes avec le nombre de membres
    const { data: groups, error: groupsError } = await supabase
      .from('family_groups')
      .select('*, invite_code')
      .in('id', groupIds) as any;

    if (groupsError) {
      throw new Error(`Erreur lors de la récupération des groupes: ${groupsError.message}`);
    }

    if (!groups || groups.length === 0) {
      return [];
    }

    // Trier par date de jointure décroissante (joined_at desc)
    const sortedGroups = (groups || []).sort((a: any, b: any) => {
      const joinedAtA = membershipMap.get(a.id);
      const joinedAtB = membershipMap.get(b.id);
      if (!joinedAtA || !joinedAtB) return 0;
      return new Date(joinedAtB).getTime() - new Date(joinedAtA).getTime();
    });

    if (groupsError) {
      throw new Error(`Erreur lors de la récupération des groupes: ${groupsError.message}`);
    }

    if (!sortedGroups || sortedGroups.length === 0) {
      return [];
    }

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

    return groupsWithCounts;
  } catch (error) {
    console.error('Erreur dans getUserFamilyGroups:', error);
    throw error;
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
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
export async function getFamilyGroupMembers(
  groupId: string
): Promise<FamilyMember[]> {
  try {
    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Vérifier que l'utilisateur est membre du groupe
    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      throw new Error('Vous n\'êtes pas membre de ce groupe');
    }

    // Récupérer tous les membres actifs
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_group_id', groupId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });

    if (membersError) {
      throw new Error(`Erreur lors de la récupération des membres: ${membersError.message}`);
    }

    if (!members) {
      return [];
    }

    // Convertir le format Supabase vers le format local
    const familyMembers: FamilyMember[] = members.map((member: any) => ({
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
      // user field is optional and not available without join - using display_name instead
      user: undefined,
    }));

    // Trier : admin first, puis par joined_at
    familyMembers.sort((a, b) => {
      // Admin first
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (a.role !== 'admin' && b.role === 'admin') return 1;
      // Then by joined_at
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });

    return familyMembers;
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
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
  try {
    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Récupérer le membre actuel
    const { data: currentMember, error: fetchError } = await supabase
      .from('family_members')
      .select('id, role')
      .eq('family_group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (fetchError || !currentMember) {
      throw new Error('Vous n\'êtes pas membre de ce groupe');
    }

    // Vérifier qu'il n'est pas le dernier admin
    if (currentMember.role === 'admin') {
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
        throw new Error('Vous ne pouvez pas quitter le groupe car vous êtes le dernier administrateur');
      }
    }

    // Supprimer le membre (soft delete en mettant is_active à false)
    const { error: deleteError } = await supabase
      .from('family_members')
      .update({ is_active: false })
      .eq('id', currentMember.id);

    if (deleteError) {
      throw new Error(`Erreur lors de la sortie du groupe: ${deleteError.message}`);
    }
  } catch (error) {
    console.error('Erreur dans leaveFamilyGroup:', error);
    throw error;
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
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

