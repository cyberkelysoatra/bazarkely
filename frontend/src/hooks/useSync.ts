import { useEffect, useCallback } from 'react';
import { useSyncStore } from '../stores/appStore';
import syncService from '../services/syncService';

export const useSync = () => {
  const {
    isOnline,
    lastSync,
    pendingOperations,
    isSyncing,
    setOnline,
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

  // Gestion des événements en ligne/hors ligne
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      // Synchroniser automatiquement quand on revient en ligne
      manualSync();
    };

    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, manualSync]);

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



