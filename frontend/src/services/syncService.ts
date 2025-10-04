import { db } from '../lib/database';
import { SYNC_CONFIG } from '../constants';
import type { SyncOperation, User } from '../types';
import { optimizedSyncService } from './OptimizedSyncService';
import { performanceMonitor } from './PerformanceMonitor';

class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private retryInterval: NodeJS.Timeout | null = null;

  // Démarrer la synchronisation automatique
  startAutoSync(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Synchronisation principale
    this.syncInterval = setInterval(() => {
      this.syncData();
    }, SYNC_CONFIG.interval);
    
    // Retry des opérations échouées
    this.retryInterval = setInterval(() => {
      this.retryFailedOperations();
    }, 30000); // Toutes les 30 secondes
    
    // Démarrer le monitoring de performance
    performanceMonitor.startMonitoring();
    
    console.log('🔄 Synchronisation automatique optimisée démarrée');
  }

  // Arrêter la synchronisation automatique
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    
    this.isRunning = false;
    
    // Arrêter le monitoring de performance
    performanceMonitor.stopMonitoring();
    
    console.log('⏹️ Synchronisation automatique arrêtée');
  }

  // Synchronisation optimisée avec differential sync
  async syncData(): Promise<void> {
    const startTime = performance.now();
    
    try {
      const user = this.getCurrentUser();
      if (!user) {
        console.log('❌ Aucun utilisateur connecté pour la synchronisation');
        return;
      }

      console.log('🔄 Début de la synchronisation différentielle...');

      // Utiliser le service de synchronisation optimisé
      const result = await optimizedSyncService.differentialSync(user.id);
      
      if (result.success) {
        console.log('✅ Synchronisation différentielle terminée avec succès');
        
        // Enregistrer les métriques de performance
        const syncTime = performance.now() - startTime;
        performanceMonitor.recordNetworkRequest(syncTime, true);
        
        // Nettoyer les opérations traitées
        await this.cleanupCompletedOperations();
      } else {
        console.error('❌ Erreur lors de la synchronisation différentielle:', result.errors);
        
        // Enregistrer l'erreur
        const syncTime = performance.now() - startTime;
        performanceMonitor.recordNetworkRequest(syncTime, false);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      
      // Enregistrer l'erreur
      const syncTime = performance.now() - startTime;
      performanceMonitor.recordNetworkRequest(syncTime, false);
    }
  }

  // Retry des opérations échouées
  private async retryFailedOperations(): Promise<void> {
    try {
      await optimizedSyncService.retryFailedOperations();
    } catch (error) {
      console.error('❌ Erreur lors du retry des opérations:', error);
    }
  }

  // Envoyer les opérations en attente vers le serveur (méthode legacy)
  private async pushPendingOperations(userId: string): Promise<void> {
    const pendingOps = await db.syncQueue
      .where('userId')
      .equals(userId)
      .and(op => op.status === 'pending')
      .limit(SYNC_CONFIG.batchSize)
      .toArray();

    for (const op of pendingOps) {
      try {
        await this.sendOperationToServer(op);
        
        // Marquer comme terminé
        await db.syncQueue.update(op.id, { status: 'completed' });
      } catch (error) {
        console.error(`❌ Erreur lors de l'envoi de l'opération ${op.id}:`, error);
        
        // Incrémenter le compteur de tentatives
        const retryCount = op.retryCount + 1;
        if (retryCount >= SYNC_CONFIG.maxRetries) {
          await db.syncQueue.update(op.id, { status: 'failed' });
        } else {
          await db.syncQueue.update(op.id, { 
            retryCount,
            status: 'pending'
          });
        }
      }
    }
  }

  // Envoyer une opération au serveur
  private async sendOperationToServer(operation: SyncOperation): Promise<void> {
    // Mode offline-only pour l'instant (pas de backend disponible)
    console.log(`📝 Mode offline: Opération ${operation.operation} pour ${operation.table_name} mise en queue locale`);
    
    // Simuler un succès pour éviter les erreurs
    // En mode production, cette fonction sera remplacée par l'appel au vrai serveur
    return Promise.resolve();
  }

  // Récupérer les données du serveur
  private async pullServerData(_userId: string): Promise<void> {
    // Mode offline-only pour l'instant (pas de backend disponible)
    console.log(`📥 Mode offline: Récupération des données locale uniquement`);
    
    // En mode production, cette fonction sera remplacée par l'appel au vrai serveur
    return Promise.resolve();
  }


  // Ajouter une opération à la queue de synchronisation (optimisée)
  async queueOperation(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    table_name: 'accounts' | 'transactions' | 'budgets' | 'goals',
    data: any,
    userId: string
  ): Promise<void> {
    // Enregistrer l'opération utilisateur pour les métriques
    performanceMonitor.recordUserOperation();
    
    const syncOp: SyncOperation = {
      id: crypto.randomUUID(),
      userId,
      operation,
      table_name,
      data,
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending'
    };

    try {
      // Utiliser une transaction optimisée avec verrous
      await db.optimizedTransaction(
        ['syncQueue'],
        async (trans) => {
          await trans.table('syncQueue').add(syncOp);
        },
        [{ table: 'syncQueue', recordId: userId }]
      );
      
      console.log(`📝 Opération ${operation} ajoutée à la queue pour ${table_name}`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout de l\'opération à la queue:', error);
      throw error;
    } finally {
      // Terminer l'opération utilisateur
      performanceMonitor.finishUserOperation();
    }
  }

  // Mettre à jour le timestamp de dernière synchronisation
  private async updateLastSync(userId: string): Promise<void> {
    await db.users.update(userId, { lastSync: new Date() });
  }

  // Obtenir l'utilisateur actuel
  private getCurrentUser(): User | null {
    const storedUser = localStorage.getItem('bazarkely-user');
    return storedUser ? JSON.parse(storedUser) : null;
  }


  // Synchronisation manuelle
  async manualSync(): Promise<void> {
    console.log('🔄 Synchronisation manuelle démarrée...');
    await this.syncData();
  }

  // Obtenir le statut de synchronisation (optimisé)
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    lastSync: Date | null;
    pendingOperations: number;
    performance: {
      memoryUsage: number;
      averageResponseTime: number;
      concurrentOperations: number;
      activeAlerts: number;
    };
  }> {
    const user = this.getCurrentUser();
    if (!user) {
      return {
        isOnline: navigator.onLine,
        lastSync: null,
        pendingOperations: 0,
        performance: {
          memoryUsage: 0,
          averageResponseTime: 0,
          concurrentOperations: 0,
          activeAlerts: 0
        }
      };
    }

    const userData = await db.users.get(user.id);
    const pendingOps = await db.syncQueue
      .where('userId')
      .equals(user.id)
      .and(op => op.status === 'pending')
      .count();

    // Obtenir les métriques de performance
    const currentMetrics = performanceMonitor.getCurrentMetrics();
    const activeAlerts = performanceMonitor.getActiveAlerts();

    return {
      isOnline: navigator.onLine,
      lastSync: userData?.lastSync ? new Date(userData.lastSync) : null,
      pendingOperations: pendingOps,
      performance: {
        memoryUsage: currentMetrics?.memoryUsage || 0,
        averageResponseTime: currentMetrics?.averageResponseTime || 0,
        concurrentOperations: currentMetrics?.concurrentUsers || 0,
        activeAlerts: activeAlerts.length
      }
    };
  }

  // Nettoyer les opérations terminées
  async cleanupCompletedOperations(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Garder 7 jours

    await db.syncQueue
      .where('timestamp')
      .below(cutoffDate)
      .and(op => op.status === 'completed')
      .delete();

    console.log('🧹 Opérations terminées nettoyées');
  }
}

export const syncService = new SyncService();
export default syncService;
