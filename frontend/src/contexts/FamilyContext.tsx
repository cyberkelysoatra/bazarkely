/**
 * React Context pour la gestion d'état des groupes familiaux
 * Gère les groupes familiaux de l'utilisateur, le groupe actif, et les opérations CRUD
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { FamilyGroup } from '../types/family';
import {
  getUserFamilyGroups,
  createFamilyGroup as createFamilyGroupService,
  joinFamilyGroup as joinFamilyGroupService,
  leaveFamilyGroup as leaveFamilyGroupService,
  getFamilyGroupByCode,
} from '../services/familyGroupService';
import type { CreateFamilyGroupInput, JoinFamilyGroupInput } from '../types/family';

/**
 * Type étendu pour FamilyGroup avec les données additionnelles du service
 */
type FamilyGroupWithMetadata = FamilyGroup & {
  memberCount?: number;
  inviteCode?: string;
};

/**
 * Interface du contexte Family
 */
interface FamilyContextType {
  // État
  familyGroups: FamilyGroupWithMetadata[];
  activeFamilyGroup: FamilyGroupWithMetadata | null;
  loading: boolean;
  error: string | null;

  // Actions
  setActiveFamilyGroup: (group: FamilyGroupWithMetadata | null) => void;
  refreshFamilyGroups: () => Promise<void>;
  createFamilyGroup: (name: string, description?: string) => Promise<FamilyGroupWithMetadata>;
  joinFamilyGroup: (code: string, displayName?: string) => Promise<void>;
  leaveFamilyGroup: (groupId: string) => Promise<void>;
}

/**
 * Création du contexte
 */
const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

/**
 * Clé localStorage pour persister le groupe actif
 */
const ACTIVE_FAMILY_GROUP_KEY = 'bazarkely_active_family_group';

/**
 * Props du Provider
 */
interface FamilyProviderProps {
  children: ReactNode;
}

/**
 * Provider du contexte Family
 */
export const FamilyProvider: React.FC<FamilyProviderProps> = ({ children }) => {
  const [familyGroups, setFamilyGroups] = useState<FamilyGroupWithMetadata[]>([]);
  const [activeFamilyGroup, setActiveFamilyGroupState] = useState<FamilyGroupWithMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Récupère les groupes familiaux de l'utilisateur depuis Supabase
   */
  const fetchFamilyGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Vérifier l'authentification
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('Utilisateur non authentifié');
        setFamilyGroups([]);
        setActiveFamilyGroupState(null);
        setLoading(false);
        // Nettoyer localStorage si non authentifié
        localStorage.removeItem(ACTIVE_FAMILY_GROUP_KEY);
        return;
      }

      // Récupérer les groupes familiaux
      const groups = await getUserFamilyGroups();

      // Convertir en format FamilyGroupWithMetadata
      const groupsWithMetadata: FamilyGroupWithMetadata[] = groups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        createdBy: group.createdBy,
        settings: group.settings,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        memberCount: group.memberCount,
        inviteCode: group.inviteCode,
      }));

      setFamilyGroups(groupsWithMetadata);

      // Restaurer le groupe actif depuis localStorage ou sélectionner le premier
      const savedActiveGroupId = localStorage.getItem(ACTIVE_FAMILY_GROUP_KEY);
      
      if (savedActiveGroupId && groupsWithMetadata.length > 0) {
        const savedGroup = groupsWithMetadata.find((g) => g.id === savedActiveGroupId);
        if (savedGroup) {
          setActiveFamilyGroupState(savedGroup);
        } else {
          // Le groupe sauvegardé n'existe plus, sélectionner le premier
          if (groupsWithMetadata.length > 0) {
            const firstGroup = groupsWithMetadata[0];
            setActiveFamilyGroupState(firstGroup);
            localStorage.setItem(ACTIVE_FAMILY_GROUP_KEY, firstGroup.id);
          } else {
            setActiveFamilyGroupState(null);
            localStorage.removeItem(ACTIVE_FAMILY_GROUP_KEY);
          }
        }
      } else if (groupsWithMetadata.length > 0) {
        // Pas de groupe sauvegardé, sélectionner le premier
        const firstGroup = groupsWithMetadata[0];
        setActiveFamilyGroupState(firstGroup);
        localStorage.setItem(ACTIVE_FAMILY_GROUP_KEY, firstGroup.id);
      } else {
        // Aucun groupe
        setActiveFamilyGroupState(null);
        localStorage.removeItem(ACTIVE_FAMILY_GROUP_KEY);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Erreur récupération groupes familiaux:', err);
      setError(err.message || 'Une erreur s\'est produite lors de la récupération des groupes familiaux');
      setFamilyGroups([]);
      setActiveFamilyGroupState(null);
      localStorage.removeItem(ACTIVE_FAMILY_GROUP_KEY);
      setLoading(false);
    }
  }, []);

  /**
   * Définit le groupe familial actif
   */
  const setActiveFamilyGroup = useCallback((group: FamilyGroupWithMetadata | null) => {
    setActiveFamilyGroupState(group);
    if (group) {
      localStorage.setItem(ACTIVE_FAMILY_GROUP_KEY, group.id);
    } else {
      localStorage.removeItem(ACTIVE_FAMILY_GROUP_KEY);
    }
  }, []);

  /**
   * Rafraîchit la liste des groupes familiaux
   */
  const refreshFamilyGroups = useCallback(async () => {
    await fetchFamilyGroups();
  }, [fetchFamilyGroups]);

  /**
   * Crée un nouveau groupe familial
   */
  const createFamilyGroup = useCallback(async (
    name: string,
    description?: string
  ): Promise<FamilyGroupWithMetadata> => {
    try {
      setError(null);

      const input: CreateFamilyGroupInput = {
        name,
        description,
      };

      const newGroup = await createFamilyGroupService(input);

      // Convertir en format avec metadata
      const groupWithMetadata: FamilyGroupWithMetadata = {
        ...newGroup,
        memberCount: 1, // Le créateur est automatiquement ajouté
        inviteCode: newGroup.inviteCode || '',
      };

      // Rafraîchir la liste des groupes
      await refreshFamilyGroups();

      // Sélectionner automatiquement le nouveau groupe
      setActiveFamilyGroup(groupWithMetadata);

      return groupWithMetadata;
    } catch (err: any) {
      console.error('Erreur création groupe familial:', err);
      setError(err.message || 'Erreur lors de la création du groupe familial');
      throw err;
    }
  }, [refreshFamilyGroups, setActiveFamilyGroup]);

  /**
   * Rejoint un groupe familial avec un code d'invitation
   */
  const joinFamilyGroup = useCallback(async (
    code: string,
    displayName?: string
  ): Promise<void> => {
    try {
      setError(null);

      // Récupérer le groupe par code
      const group = await getFamilyGroupByCode(code);

      if (!group) {
        throw new Error('Code d\'invitation invalide ou expiré');
      }

      // Rejoindre le groupe
      const input: JoinFamilyGroupInput = {
        familyGroupId: group.id,
        invitationCode: code,
      };

      await joinFamilyGroupService(input);

      // Rafraîchir la liste des groupes
      await refreshFamilyGroups();
    } catch (err: any) {
      console.error('Erreur rejoindre groupe familial:', err);
      setError(err.message || 'Erreur lors de la jointure au groupe familial');
      throw err;
    }
  }, [refreshFamilyGroups]);

  /**
   * Quitte un groupe familial
   */
  const leaveFamilyGroup = useCallback(async (groupId: string): Promise<void> => {
    try {
      setError(null);

      await leaveFamilyGroupService(groupId);

      // Si le groupe quitté était le groupe actif, le désélectionner
      if (activeFamilyGroup?.id === groupId) {
        setActiveFamilyGroup(null);
      }

      // Rafraîchir la liste des groupes
      await refreshFamilyGroups();
    } catch (err: any) {
      console.error('Erreur quitter groupe familial:', err);
      setError(err.message || 'Erreur lors de la sortie du groupe familial');
      throw err;
    }
  }, [activeFamilyGroup, refreshFamilyGroups, setActiveFamilyGroup]);

  // Charger les groupes au montage
  useEffect(() => {
    fetchFamilyGroups();
  }, [fetchFamilyGroups]);

  // Nettoyer localStorage si l'utilisateur se déconnecte
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setFamilyGroups([]);
        setActiveFamilyGroupState(null);
        localStorage.removeItem(ACTIVE_FAMILY_GROUP_KEY);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const contextValue: FamilyContextType = {
    familyGroups,
    activeFamilyGroup,
    loading,
    error,
    setActiveFamilyGroup,
    refreshFamilyGroups,
    createFamilyGroup,
    joinFamilyGroup,
    leaveFamilyGroup,
  };

  return (
    <FamilyContext.Provider value={contextValue}>
      {children}
    </FamilyContext.Provider>
  );
};

/**
 * Hook personnalisé pour utiliser le contexte Family
 * @throws Error si utilisé en dehors du Provider
 */
export const useFamily = (): FamilyContextType => {
  const context = useContext(FamilyContext);
  
  if (context === undefined) {
    throw new Error('useFamily doit être utilisé à l\'intérieur d\'un FamilyProvider');
  }
  
  return context;
};

