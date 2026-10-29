import { useEffect, useCallback } from 'react';
import { useSyncStore } from '../stores/appStore';
import syncService from '../services/syncService';

export const useSync = () => {
  const {
    isOnline,
    lastSync,
    pendingOperations,
    isSyncing,
    setLastSync,
    setPendingOperations,
    setIsSyncing
  } = useSyncStore();

  // Démarrer la synchronisation automatique
  const startSync = useCallback(() => {
    syncService.startAutoSync();
  }, []);

  // Arrêter la synchronisation automatique
  const stopSync = useCallback(() => {
    syncService.stopAutoSync();
  }, []);

  // Synchronisation manuelle
  const manualSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncService.manualSync();
      const status = await syncService.getSyncStatus();
      
      // S'assurer que lastSync est un Date valide
      let validLastSync: Date | null = null;
      if (status.lastSync) {
        if (status.lastSync instanceof Date) {
          validLastSync = status.lastSync;
        } else if (typeof status.lastSync === 'string') {
          const parsedDate = new Date(status.lastSync);
          if (!isNaN(parsedDate.getTime())) {
            validLastSync = parsedDate;
          }
        }
      }
      
      setLastSync(validLastSync);
      setPendingOperations(status.pendingOperations);
    } catch (error) {
      console.error('Erreur lors de la synchronisation manuelle:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [setIsSyncing, setLastSync, setPendingOperations]);

  // Mettre à jour le statut de synchronisation
  const updateSyncStatus = useCallback(async () => {
    try {
      const status = await syncService.getSyncStatus();
      
      // S'assurer que lastSync est un Date valide
      let validLastSync: Date | null = null;
      if (status.lastSync) {
        if (status.lastSync instanceof Date) {
          validLastSync = status.lastSync;
        } else if (typeof status.lastSync === 'string') {
          const parsedDate = new Date(status.lastSync);
          if (!isNaN(parsedDate.getTime())) {
            validLastSync = parsedDate;
          }
        }
      }
      
      setLastSync(validLastSync);
      setPendingOperations(status.pendingOperations);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  }, [setLastSync, setPendingOperations]);

  // Retour en ligne : synchronisation automatique.
  // Le drapeau en ligne / hors ligne est écrit uniquement par onlineStatusService.
  useEffect(() => {
    const handleOnline = () => {
      console.log('🔄 [useSync] Retour en ligne → synchronisation');
      manualSync();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [manualSync]);

  // Mise à jour périodique du statut
  useEffect(() => {
    const interval = setInterval(updateSyncStatus, 10000); // Toutes les 10 secondes
    return () => clearInterval(interval);
  }, [updateSyncStatus]);

  // Nettoyage des opérations terminées
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      syncService.cleanupCompletedOperations();
    }, 60000); // Toutes les minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    isOnline,
    lastSync,
    pendingOperations,
    isSyncing,
    startSync,
    stopSync,
    manualSync,
    updateSyncStatus
  };
};



