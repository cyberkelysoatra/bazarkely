/**
 * React Context pour la gestion d'├®tat des groupes familiaux
 * G├¿re les groupes familiaux de l'utilisateur, le groupe actif, et les op├®rations CRUD
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
  getCurrentUserSafe,
} from '../services/familyGroupService';
import { useAppStore } from '../stores/appStore';
import type { CreateFamilyGroupInput, JoinFamilyGroupInput } from '../types/family';
import { useFamilyRealtime } from '../hooks/useFamilyRealtime';

/**
 * Type ├®tendu pour FamilyGroup avec les donn├®es additionnelles du service
 */
type FamilyGroupWithMetadata = FamilyGroup & {
  memberCount?: number;
  inviteCode?: string;
};

/**
 * Interface du contexte Family
 */
interface FamilyContextType {
  // ├ëtat
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
 * Cr├®ation du contexte
 */
const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

/**
 * Cl├® localStorage pour persister le groupe actif
 */
const ACTIVE_FAMILY_GROUP_KEY = 'bazarkely_active_family_group';

/**
 * Cache localStorage des familyGroups (S69 v3.13.1, extrait vers lib/ en v3.14.1).
 *
 * Les helpers (read/write/clear + cle localStorage) sont desormais dans
 * lib/familyGroupsCache.ts pour permettre a familyGroupService.getUserFamilyGroups()
 * de lire/ecrire le meme cache et rester offline-first pour TransactionsPage,
 * TransactionDetailPage et FamilyDashboardPage qui n'utilisent pas FamilyContext.
 */
import {
  readFamilyGroupsCache,
  writeFamilyGroupsCache,
  clearFamilyGroupsCache,
} from '../lib/familyGroupsCache';

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
  
  // Hook pour les abonnements en temps r├®el
  const { subscribeToFamilyGroup, subscribeToFamilyMembers } = useFamilyRealtime();

  /**
   * Applique une liste de groupes au state + restaure l'activeFamilyGroup.
   * Extracted pour ├¬tre r├®utilis├® entre lecture cache locale et fetch r├®seau.
   */
  const applyGroupsToState = useCallback(
    (groupsWithMetadata: FamilyGroupWithMetadata[]) => {
      setFamilyGroups(groupsWithMetadata);

      const savedActiveGroupId = localStorage.getItem(ACTIVE_FAMILY_GROUP_KEY);

      if (savedActiveGroupId && groupsWithMetadata.length > 0) {
        const savedGroup = groupsWithMetadata.find((g) => g.id === savedActiveGroupId);
        if (savedGroup) {
          setActiveFamilyGroupState(savedGroup);
        } else if (groupsWithMetadata.length > 0) {
          const firstGroup = groupsWithMetadata[0];
          setActiveFamilyGroupState(firstGroup);
          localStorage.setItem(ACTIVE_FAMILY_GROUP_KEY, firstGroup.id);
        } else {
          setActiveFamilyGroupState(null);
          localStorage.removeItem(ACTIVE_FAMILY_GROUP_KEY);
        }
      } else if (groupsWithMetadata.length > 0) {
        const firstGroup = groupsWithMetadata[0];
        setActiveFamilyGroupState(firstGroup);
        localStorage.setItem(ACTIVE_FAMILY_GROUP_KEY, firstGroup.id);
      } else {
        setActiveFamilyGroupState(null);
        localStorage.removeItem(ACTIVE_FAMILY_GROUP_KEY);
      }
    },
    []
  );

  /**
   * R├®cup├¿re les groupes familiaux de l'utilisateur — offline-first hotfix v3.13.1.
   *
   * 1. Tente d'identifier l'utilisateur via getCurrentUserSafe (pas de r├®seau)
   * 2. Charge imm├®diatement depuis localStorage si cache pr├®sent (retour rapide offline)
   * 3. Si online, lance le fetch Supabase en arri├¿re-plan et actualise le cache + state
   * 4. Pr├®serve le cache en cas d'├®chec r├®seau (ne wipe pas l'├®tat famille)
   */
  const fetchFamilyGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await getCurrentUserSafe();
      if (!user) {
        setError('Utilisateur non authentifi├®');
        setFamilyGroups([]);
        setActiveFamilyGroupState(null);
        setLoading(false);
        localStorage.removeItem(ACTIVE_FAMILY_GROUP_KEY);
        clearFamilyGroupsCache();
        return;
      }

      // STEP 1: Lecture imm├®diate du cache si disponible (retour SWR rapide, surtout offline)
      const cached = readFamilyGroupsCache();
      if (cached.length > 0) {
        applyGroupsToState(cached);
        setLoading(false);
      }

      // STEP 2: Si offline, on s'arr├¬te ici — le cache fait foi
      const isOnline = (() => {
        try {
          return useAppStore.getState().isOnline ?? navigator.onLine;
        } catch {
          return navigator.onLine;
        }
      })();

      if (!isOnline) {
        if (cached.length === 0) {
          // Pas de cache + offline : on a au moins identifi├® l'utilisateur, mais aucune donn├®e
          setFamilyGroups([]);
          setActiveFamilyGroupState(null);
          setLoading(false);
        }
        return;
      }

      // STEP 3: Online — fetch Supabase et mise ├á jour du cache
      try {
        const groups = await getUserFamilyGroups();
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

        applyGroupsToState(groupsWithMetadata);
        writeFamilyGroupsCache(groupsWithMetadata);
        setLoading(false);
      } catch (fetchErr: any) {
        // ├ëchec r├®seau : conserver le cache au lieu de wiper l'├®tat famille
        console.warn(
          '[FamilyContext] Fetch Supabase ├®chou├®, conservation du cache local:',
          fetchErr
        );
        if (cached.length === 0) {
          // Pas de cache + ├®chec : on remonte l'erreur ├á l'UI
          setError(
            fetchErr?.message ||
              'Une erreur s\'est produite lors de la r├®cup├®ration des groupes familiaux'
          );
          setFamilyGroups([]);
          setActiveFamilyGroupState(null);
        }
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Erreur r├®cup├®ration groupes familiaux:', err);
      const cached = readFamilyGroupsCache();
      if (cached.length === 0) {
        setError(err.message || 'Une erreur s\'est produite lors de la r├®cup├®ration des groupes familiaux');
        setFamilyGroups([]);
        setActiveFamilyGroupState(null);
        localStorage.removeItem(ACTIVE_FAMILY_GROUP_KEY);
      }
      setLoading(false);
    }
  }, [applyGroupsToState]);

  /**
   * D├®finit le groupe familial actif
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
   * Rafra├«chit la liste des groupes familiaux
   */
  const refreshFamilyGroups = useCallback(async () => {
    await fetchFamilyGroups();
  }, [fetchFamilyGroups]);

  /**
   * Cr├®e un nouveau groupe familial
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
        memberCount: 1, // Le cr├®ateur est automatiquement ajout├®
        inviteCode: newGroup.inviteCode || '',
      };

      // Rafra├«chir la liste des groupes
      await refreshFamilyGroups();

      // S├®lectionner automatiquement le nouveau groupe
      setActiveFamilyGroup(groupWithMetadata);

      return groupWithMetadata;
    } catch (err: any) {
      console.error('Erreur cr├®ation groupe familial:', err);
      setError(err.message || 'Erreur lors de la cr├®ation du groupe familial');
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

      // R├®cup├®rer le groupe par code
      const group = await getFamilyGroupByCode(code);

      if (!group) {
        throw new Error('Code d\'invitation invalide ou expir├®');
      }

      // Rejoindre le groupe
      const input: JoinFamilyGroupInput = {
        familyGroupId: group.id,
        invitationCode: code,
      };

      await joinFamilyGroupService(input);

      // Rafra├«chir la liste des groupes
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

      // Si le groupe quitt├® ├®tait le groupe actif, le d├®s├®lectionner
      if (activeFamilyGroup?.id === groupId) {
        setActiveFamilyGroup(null);
      }

      // Rafra├«chir la liste des groupes
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

  // Nettoyer localStorage si l'utilisateur se d├®connecte
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setFamilyGroups([]);
        setActiveFamilyGroupState(null);
        localStorage.removeItem(ACTIVE_FAMILY_GROUP_KEY);
        clearFamilyGroupsCache();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Abonnements en temps r├®el pour synchroniser les donn├®es familiales
  useEffect(() => {
    // Ne pas s'abonner si aucun groupe actif
    if (!activeFamilyGroup?.id) {
      return;
    }

    const groupId = activeFamilyGroup.id;

    // S'abonner aux changements du groupe familial
    const unsubscribeGroup = subscribeToFamilyGroup(
      groupId,
      (payload) => {
        console.log('[FamilyContext] Realtime event:', payload.eventType, 'family_groups');
        
        // Pour UPDATE sur family_groups, rafra├«chir les groupes
        if (payload.eventType === 'UPDATE' && refreshFamilyGroups) {
          refreshFamilyGroups();
        }
      }
    );

    // S'abonner aux changements des membres du groupe
    const unsubscribeMembers = subscribeToFamilyMembers(
      groupId,
      (payload) => {
        console.log('[FamilyContext] Realtime event:', payload.eventType, 'family_members');
        
        // Pour INSERT, UPDATE, DELETE sur family_members, rafra├«chir les groupes
        // (les groupes incluent le memberCount qui doit ├¬tre mis ├á jour)
        if (
          (payload.eventType === 'INSERT' || 
           payload.eventType === 'UPDATE' || 
           payload.eventType === 'DELETE') &&
          refreshFamilyGroups
        ) {
          refreshFamilyGroups();
        }
      }
    );

    // Fonction de nettoyage : d├®sabonner quand le composant se d├®monte ou le groupe change
    return () => {
      unsubscribeGroup();
      unsubscribeMembers();
    };
  }, [activeFamilyGroup?.id, subscribeToFamilyGroup, subscribeToFamilyMembers, refreshFamilyGroups]);

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
 * Hook personnalis├® pour utiliser le contexte Family
 * @throws Error si utilis├® en dehors du Provider
 */
export const useFamily = (): FamilyContextType => {
  const context = useContext(FamilyContext);
  
  if (context === undefined) {
    throw new Error('useFamily doit ├¬tre utilis├® ├á l\'int├®rieur d\'un FamilyProvider');
  }
  
  return context;
};

