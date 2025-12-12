/**
 * Hook personnalisé pour gérer les abonnements en temps réel Supabase
 * pour les tables familiales (family_groups, family_members, family_shared_transactions, reimbursement_requests)
 */

import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Type d'événement pour les changements en temps réel
 */
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Interface pour le callback de mise à jour en temps réel
 */
export interface RealtimeCallback<T = any> {
  /** Type d'événement (INSERT, UPDATE, DELETE) */
  eventType: RealtimeEventType;
  /** Nouveau enregistrement (après l'événement) */
  newRecord: T | null;
  /** Ancien enregistrement (avant l'événement, pour UPDATE/DELETE) */
  oldRecord: T | null;
}

/**
 * Type pour la fonction de nettoyage (unsubscribe)
 */
export type UnsubscribeFunction = () => void;

/**
 * Hook personnalisé pour gérer les abonnements en temps réel Supabase pour les tables familiales
 * 
 * Ce hook fournit des fonctions réutilisables pour s'abonner aux changements en temps réel
 * des tables familiales :
 * - family_groups : changements sur un groupe familial spécifique
 * - family_members : changements sur les membres d'un groupe
 * - family_shared_transactions : changements sur les transactions partagées
 * - reimbursement_requests : changements sur les demandes de remboursement
 * 
 * Chaque fonction retourne une fonction de nettoyage pour se désabonner.
 * 
 * @example
 * ```tsx
 * const { subscribeToFamilyMembers } = useFamilyRealtime();
 * 
 * useEffect(() => {
 *   const unsubscribe = subscribeToFamilyMembers(
 *     groupId,
 *     (payload) => {
 *       if (payload.eventType === 'INSERT') {
 *         console.log('Nouveau membre ajouté:', payload.newRecord);
 *       } else if (payload.eventType === 'UPDATE') {
 *         console.log('Membre mis à jour:', payload.newRecord);
 *       } else if (payload.eventType === 'DELETE') {
 *         console.log('Membre supprimé:', payload.oldRecord);
 *       }
 *       // Recharger les membres
 *       loadMembers();
 *     }
 *   );
 * 
 *   return () => {
 *     unsubscribe();
 *   };
 * }, [groupId]);
 * ```
 */
export function useFamilyRealtime() {
  /**
   * S'abonner aux changements d'un groupe familial spécifique
   * @param groupId - ID du groupe familial (peut être null/undefined)
   * @param onUpdate - Callback appelé lors des changements
   * @returns Fonction de nettoyage pour se désabonner
   */
  const subscribeToFamilyGroup = useCallback(
    (
      groupId: string | null | undefined,
      onUpdate: (payload: RealtimeCallback) => void
    ): UnsubscribeFunction => {
      // Si groupId est null/undefined, retourner une fonction no-op
      if (!groupId) {
        return () => {
          // No-op cleanup function
        };
      }

      const channelName = `family-family_groups-${groupId}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'family_groups',
            filter: `id=eq.${groupId}`,
          },
          (payload) => {
            onUpdate({
              eventType: payload.eventType as RealtimeEventType,
              newRecord: payload.new || null,
              oldRecord: payload.old || null,
            });
          }
        )
        .subscribe();

      // Retourner la fonction de nettoyage
      return () => {
        supabase.removeChannel(channel);
      };
    },
    []
  );

  /**
   * S'abonner aux changements des membres d'un groupe familial
   * @param groupId - ID du groupe familial (peut être null/undefined)
   * @param onUpdate - Callback appelé lors des changements
   * @returns Fonction de nettoyage pour se désabonner
   */
  const subscribeToFamilyMembers = useCallback(
    (
      groupId: string | null | undefined,
      onUpdate: (payload: RealtimeCallback) => void
    ): UnsubscribeFunction => {
      // Si groupId est null/undefined, retourner une fonction no-op
      if (!groupId) {
        return () => {
          // No-op cleanup function
        };
      }

      const channelName = `family-family_members-${groupId}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'family_members',
            filter: `family_group_id=eq.${groupId}`,
          },
          (payload) => {
            onUpdate({
              eventType: payload.eventType as RealtimeEventType,
              newRecord: payload.new || null,
              oldRecord: payload.old || null,
            });
          }
        )
        .subscribe();

      // Retourner la fonction de nettoyage
      return () => {
        supabase.removeChannel(channel);
      };
    },
    []
  );

  /**
   * S'abonner aux changements des transactions partagées d'un groupe familial
   * @param groupId - ID du groupe familial (peut être null/undefined)
   * @param onUpdate - Callback appelé lors des changements
   * @returns Fonction de nettoyage pour se désabonner
   */
  const subscribeToSharedTransactions = useCallback(
    (
      groupId: string | null | undefined,
      onUpdate: (payload: RealtimeCallback) => void
    ): UnsubscribeFunction => {
      // Si groupId est null/undefined, retourner une fonction no-op
      if (!groupId) {
        return () => {
          // No-op cleanup function
        };
      }

      const channelName = `family-family_shared_transactions-${groupId}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'family_shared_transactions',
            filter: `family_group_id=eq.${groupId}`,
          },
          (payload) => {
            onUpdate({
              eventType: payload.eventType as RealtimeEventType,
              newRecord: payload.new || null,
              oldRecord: payload.old || null,
            });
          }
        )
        .subscribe();

      // Retourner la fonction de nettoyage
      return () => {
        supabase.removeChannel(channel);
      };
    },
    []
  );

  /**
   * S'abonner aux changements des demandes de remboursement d'un groupe familial
   * 
   * NOTE: Si la table reimbursement_requests n'a pas directement family_group_id,
   * ce filtre peut ne pas fonctionner. Dans ce cas, il faudra s'abonner sans filtre
   * et vérifier le groupId dans le callback via shared_transaction_id.
   * 
   * @param groupId - ID du groupe familial (peut être null/undefined)
   * @param onUpdate - Callback appelé lors des changements
   * @returns Fonction de nettoyage pour se désabonner
   */
  const subscribeToReimbursements = useCallback(
    (
      groupId: string | null | undefined,
      onUpdate: (payload: RealtimeCallback) => void
    ): UnsubscribeFunction => {
      // Si groupId est null/undefined, retourner une fonction no-op
      if (!groupId) {
        return () => {
          // No-op cleanup function
        };
      }

      const channelName = `family-reimbursement_requests-${groupId}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'reimbursement_requests',
            // NOTE: Si family_group_id n'existe pas dans reimbursement_requests,
            // ce filtre ne fonctionnera pas. Il faudra alors s'abonner sans filtre
            // et vérifier le groupId dans le callback.
            filter: `family_group_id=eq.${groupId}`,
          },
          (payload) => {
            onUpdate({
              eventType: payload.eventType as RealtimeEventType,
              newRecord: payload.new || null,
              oldRecord: payload.old || null,
            });
          }
        )
        .subscribe();

      // Retourner la fonction de nettoyage
      return () => {
        supabase.removeChannel(channel);
      };
    },
    []
  );

  return {
    subscribeToFamilyGroup,
    subscribeToFamilyMembers,
    subscribeToSharedTransactions,
    subscribeToReimbursements,
  };
}

// Export par défaut pour la commodité
export default useFamilyRealtime;

