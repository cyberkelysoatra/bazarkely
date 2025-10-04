/**
 * Service de synchronisation optimisé pour 100+ utilisateurs concurrents
 * Implémente differential sync, retry mechanisms et conflict resolution
 */

import { db } from '../lib/database';
import type { SyncOperation, User, Account, Transaction, Budget, Goal } from '../types';

export interface SyncResult {
  success: boolean;
  data?: any;
  conflicts?: ConflictResolution[];
  errors?: SyncError[];
  lastSync?: string;
  performance?: {
    syncTime: number;
    operationsProcessed: number;
    conflictsResolved: number;
    errorsHandled: number;
  };
}

export interface ConflictResolution {
  id: string;
  table: string;
  recordId: string;
  localData: any;
  remoteData: any;
  resolution: 'local' | 'remote' | 'merge';
  resolvedData?: any;
  timestamp: Date;
}

export interface SyncError {
  id: string;
  operation: string;
  error: string;
  retryCount: number;
  maxRetries: number;
  nextRetry?: Date;
  timestamp: Date;
}

export interface DifferentialSyncData {
  userId: string;
  lastSync: Date;
  operations: SyncOperation[];
  conflicts: ConflictResolution[];
  errors: SyncError[];
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface SyncConfig {
  batchSize: number;
  retryConfig: RetryConfig;
  conflictResolution: 'last-write-wins' | 'merge' | 'manual';
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

class OptimizedSyncService {
  // Note: Now using Supabase directly instead of PHP API
  private isSyncing = false;
  private syncQueue: Map<string, SyncOperation> = new Map();
  private retryQueue: Map<string, SyncError> = new Map();
  private conflictQueue: Map<string, ConflictResolution> = new Map();
  
  private config: SyncConfig = {
    batchSize: 50,
    retryConfig: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true
    },
    conflictResolution: 'last-write-wins',
    compressionEnabled: true,
    encryptionEnabled: false
  };

  private performanceMetrics = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncTime: 0,
    totalOperations: 0,
    totalConflicts: 0,
    totalErrors: 0
  };

  /**
   * Synchronisation différentielle optimisée
   */
  async differentialSync(userId: string): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        errors: [{ id: 'sync_in_progress', operation: 'differential_sync', error: 'Synchronisation déjà en cours', retryCount: 0, maxRetries: 0, timestamp: new Date() }]
      };
    }

    const startTime = performance.now();
    this.isSyncing = true;

    try {
      console.log('🔄 Début de la synchronisation différentielle...');

      // 1. Récupérer la dernière synchronisation
      const lastSync = await this.getLastSyncTime(userId);
      
      // 2. Récupérer les opérations locales en attente
      const localOperations = await this.getPendingOperations(userId);
      
      // 3. Envoyer les opérations locales vers le serveur
      const pushResult = await this.pushOperations(userId, localOperations, lastSync);
      
      // 4. Récupérer les données du serveur depuis la dernière sync
      const pullResult = await this.pullServerData(userId, lastSync);
      
      // 5. Résoudre les conflits
      const conflicts = await this.resolveConflicts(pullResult.conflicts || []);
      
      // 6. Appliquer les données du serveur
      await this.applyServerData(pullResult.data);
      
      // 7. Mettre à jour le timestamp de sync
      await this.updateLastSyncTime(userId, new Date());
      
      // 8. Nettoyer les opérations traitées
      await this.cleanupProcessedOperations(localOperations);

      const syncTime = performance.now() - startTime;
      this.updatePerformanceMetrics(syncTime, true, localOperations.length, conflicts.length, 0);

      console.log('✅ Synchronisation différentielle terminée avec succès');

      return {
        success: true,
        data: pullResult.data,
        conflicts,
        lastSync: new Date().toISOString(),
        performance: {
          syncTime,
          operationsProcessed: localOperations.length,
          conflictsResolved: conflicts.length,
          errorsHandled: 0
        }
      };

    } catch (error) {
      const syncTime = performance.now() - startTime;
      this.updatePerformanceMetrics(syncTime, false, 0, 0, 1);
      
      console.error('❌ Erreur lors de la synchronisation différentielle:', error);
      
      return {
        success: false,
        errors: [{
          id: crypto.randomUUID(),
          operation: 'differential_sync',
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          retryCount: 0,
          maxRetries: this.config.retryConfig.maxRetries,
          timestamp: new Date()
        }]
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Synchronisation par lots optimisée
   */
  async batchSync(userId: string, operations: SyncOperation[]): Promise<SyncResult> {
    const startTime = performance.now();
    const batches = this.createBatches(operations, this.config.batchSize);
    const results: SyncResult[] = [];

    try {
      for (const batch of batches) {
        const batchResult = await this.processBatch(userId, batch);
        results.push(batchResult);
        
        // Pause entre les lots pour éviter la surcharge
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.delay(100);
        }
      }

      const syncTime = performance.now() - startTime;
      const totalOperations = operations.length;
      const totalConflicts = results.reduce((sum, r) => sum + (r.conflicts?.length || 0), 0);
      const totalErrors = results.reduce((sum, r) => sum + (r.errors?.length || 0), 0);

      return {
        success: results.every(r => r.success),
        data: results.flatMap(r => r.data || []),
        conflicts: results.flatMap(r => r.conflicts || []),
        errors: results.flatMap(r => r.errors || []),
        performance: {
          syncTime,
          operationsProcessed: totalOperations,
          conflictsResolved: totalConflicts,
          errorsHandled: totalErrors
        }
      };

    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation par lots:', error);
      throw error;
    }
  }

  /**
   * Gestion des retry avec backoff exponentiel
   */
  async retryFailedOperations(): Promise<void> {
    const failedOperations = await db.syncQueue
      .where('status')
      .equals('failed')
      .toArray();

    for (const operation of failedOperations) {
      const error = this.retryQueue.get(operation.id);
      if (!error) continue;

      if (error.retryCount >= error.maxRetries) {
        // Marquer comme définitivement échoué
        await db.syncQueue.update(operation.id, { status: 'permanently_failed' });
        this.retryQueue.delete(operation.id);
        continue;
      }

      if (error.nextRetry && error.nextRetry > new Date()) {
        continue; // Pas encore le moment de retry
      }

      try {
        // Calculer le délai de retry
        const delay = this.calculateRetryDelay(error.retryCount);
        
        // Attendre le délai
        await this.delay(delay);
        
        // Retry l'opération
        const result = await this.executeOperation(operation);
        
        if (result.success) {
          // Succès, supprimer de la queue de retry
          this.retryQueue.delete(operation.id);
          await db.syncQueue.update(operation.id, { status: 'completed' });
        } else {
          // Échec, incrémenter le compteur de retry
          error.retryCount++;
          error.nextRetry = new Date(Date.now() + this.calculateRetryDelay(error.retryCount));
          this.retryQueue.set(operation.id, error);
        }
      } catch (retryError) {
        console.error(`❌ Erreur lors du retry de l'opération ${operation.id}:`, retryError);
        error.retryCount++;
        error.nextRetry = new Date(Date.now() + this.calculateRetryDelay(error.retryCount));
        this.retryQueue.set(operation.id, error);
      }
    }
  }

  /**
   * Résolution des conflits
   */
  private async resolveConflicts(conflicts: ConflictResolution[]): Promise<ConflictResolution[]> {
    const resolvedConflicts: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      try {
        let resolution: ConflictResolution;
        
        switch (this.config.conflictResolution) {
          case 'last-write-wins':
            resolution = this.resolveLastWriteWins(conflict);
            break;
          case 'merge':
            resolution = await this.resolveMerge(conflict);
            break;
          case 'manual':
            resolution = await this.resolveManual(conflict);
            break;
          default:
            resolution = this.resolveLastWriteWins(conflict);
        }

        resolvedConflicts.push(resolution);
        
        // Appliquer la résolution
        await this.applyConflictResolution(resolution);
        
      } catch (error) {
        console.error(`❌ Erreur lors de la résolution du conflit ${conflict.id}:`, error);
        // Garder le conflit non résolu pour résolution manuelle
        resolvedConflicts.push(conflict);
      }
    }

    return resolvedConflicts;
  }

  /**
   * Résolution "dernière écriture gagne"
   */
  private resolveLastWriteWins(conflict: ConflictResolution): ConflictResolution {
    const localTime = new Date(conflict.localData.updatedAt || conflict.localData.createdAt);
    const remoteTime = new Date(conflict.remoteData.updatedAt || conflict.remoteData.createdAt);
    
    return {
      ...conflict,
      resolution: localTime > remoteTime ? 'local' : 'remote',
      resolvedData: localTime > remoteTime ? conflict.localData : conflict.remoteData
    };
  }

  /**
   * Résolution par fusion
   */
  private async resolveMerge(conflict: ConflictResolution): Promise<ConflictResolution> {
    // Implémentation de la fusion intelligente
    const mergedData = { ...conflict.remoteData };
    
    // Fusionner les champs non conflictuels
    for (const [key, value] of Object.entries(conflict.localData)) {
      if (key === 'id' || key === 'userId') continue;
      
      if (mergedData[key] === undefined || mergedData[key] === null) {
        mergedData[key] = value;
      } else if (typeof value === 'string' && typeof mergedData[key] === 'string') {
        // Pour les chaînes, prendre la plus longue
        mergedData[key] = value.length > mergedData[key].length ? value : mergedData[key];
      } else if (typeof value === 'number' && typeof mergedData[key] === 'number') {
        // Pour les nombres, prendre le plus grand
        mergedData[key] = Math.max(value, mergedData[key]);
      }
    }
    
    // Toujours prendre la date de mise à jour la plus récente
    const localTime = new Date(conflict.localData.updatedAt || conflict.localData.createdAt);
    const remoteTime = new Date(conflict.remoteData.updatedAt || conflict.remoteData.createdAt);
    mergedData.updatedAt = localTime > remoteTime ? conflict.localData.updatedAt : conflict.remoteData.updatedAt;
    
    return {
      ...conflict,
      resolution: 'merge',
      resolvedData: mergedData
    };
  }

  /**
   * Résolution manuelle (nécessite intervention utilisateur)
   */
  private async resolveManual(conflict: ConflictResolution): Promise<ConflictResolution> {
    // Pour l'instant, utiliser la résolution "dernière écriture gagne"
    // Dans une implémentation complète, cela déclencherait une interface utilisateur
    return this.resolveLastWriteWins(conflict);
  }

  /**
   * Appliquer la résolution de conflit
   */
  private async applyConflictResolution(resolution: ConflictResolution): Promise<void> {
    const { table, recordId, resolvedData } = resolution;
    
    switch (table) {
      case 'users':
        await db.users.update(recordId, resolvedData);
        break;
      case 'accounts':
        await db.accounts.update(recordId, resolvedData);
        break;
      case 'transactions':
        await db.transactions.update(recordId, resolvedData);
        break;
      case 'budgets':
        await db.budgets.update(recordId, resolvedData);
        break;
      case 'goals':
        await db.goals.update(recordId, resolvedData);
        break;
    }
  }

  /**
   * Obtenir les opérations en attente
   */
  private async getPendingOperations(userId: string): Promise<SyncOperation[]> {
    return await db.syncQueue
      .where('userId')
      .equals(userId)
      .and(op => op.status === 'pending' || op.status === 'failed')
      .toArray();
  }

  /**
   * Envoyer les opérations vers le serveur
   */
  private async pushOperations(
    userId: string, 
    operations: SyncOperation[], 
    lastSync: Date
  ): Promise<any> {
    if (operations.length === 0) return { success: true };

    try {
      const response = await fetch(`${this.API_BASE_URL}/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          userId,
          lastSync: lastSync.toISOString(),
          operations: operations.map(op => ({
            id: op.id,
            operation: op.operation,
            table: op.table_name,
            data: op.data,
            timestamp: op.timestamp
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi des opérations:', error);
      throw error;
    }
  }

  /**
   * Récupérer les données du serveur
   */
  private async pullServerData(userId: string, lastSync: Date): Promise<any> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/sync/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          userId,
          lastSync: lastSync.toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des données:', error);
      throw error;
    }
  }

  /**
   * Appliquer les données du serveur
   */
  private async applyServerData(data: any): Promise<void> {
    if (data.users) {
      await db.users.bulkPut(data.users);
    }
    if (data.accounts) {
      await db.accounts.bulkPut(data.accounts);
    }
    if (data.transactions) {
      await db.transactions.bulkPut(data.transactions);
    }
    if (data.budgets) {
      await db.budgets.bulkPut(data.budgets);
    }
    if (data.goals) {
      await db.goals.bulkPut(data.goals);
    }
  }

  /**
   * Créer des lots d'opérations
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Traiter un lot d'opérations
   */
  private async processBatch(userId: string, batch: SyncOperation[]): Promise<SyncResult> {
    const startTime = performance.now();
    
    try {
      const results = await Promise.allSettled(
        batch.map(operation => this.executeOperation(operation))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        success: failed === 0,
        data: results
          .filter(r => r.status === 'fulfilled')
          .map(r => (r as PromiseFulfilledResult<any>).value),
        errors: results
          .filter(r => r.status === 'rejected')
          .map(r => ({
            id: crypto.randomUUID(),
            operation: 'batch_process',
            error: (r as PromiseRejectedResult).reason?.message || 'Erreur inconnue',
            retryCount: 0,
            maxRetries: this.config.retryConfig.maxRetries,
            timestamp: new Date()
          }))
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          id: crypto.randomUUID(),
          operation: 'batch_process',
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          retryCount: 0,
          maxRetries: this.config.retryConfig.maxRetries,
          timestamp: new Date()
        }]
      };
    }
  }

  /**
   * Exécuter une opération de synchronisation
   */
  private async executeOperation(operation: SyncOperation): Promise<{ success: boolean; data?: any }> {
    try {
      switch (operation.operation) {
        case 'CREATE':
          return await this.createRecord(operation);
        case 'UPDATE':
          return await this.updateRecord(operation);
        case 'DELETE':
          return await this.deleteRecord(operation);
        default:
          throw new Error(`Opération non supportée: ${operation.operation}`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors de l'exécution de l'opération ${operation.id}:`, error);
      throw error;
    }
  }

  /**
   * Créer un enregistrement
   */
  private async createRecord(operation: SyncOperation): Promise<{ success: boolean; data?: any }> {
    const { table_name, data } = operation;
    
    switch (table_name) {
      case 'users':
        await db.users.add(data);
        break;
      case 'accounts':
        await db.accounts.add(data);
        break;
      case 'transactions':
        await db.transactions.add(data);
        break;
      case 'budgets':
        await db.budgets.add(data);
        break;
      case 'goals':
        await db.goals.add(data);
        break;
      default:
        throw new Error(`Table non supportée: ${table_name}`);
    }
    
    return { success: true, data };
  }

  /**
   * Mettre à jour un enregistrement
   */
  private async updateRecord(operation: SyncOperation): Promise<{ success: boolean; data?: any }> {
    const { table_name, data } = operation;
    
    switch (table_name) {
      case 'users':
        await db.users.update(data.id, data);
        break;
      case 'accounts':
        await db.accounts.update(data.id, data);
        break;
      case 'transactions':
        await db.transactions.update(data.id, data);
        break;
      case 'budgets':
        await db.budgets.update(data.id, data);
        break;
      case 'goals':
        await db.goals.update(data.id, data);
        break;
      default:
        throw new Error(`Table non supportée: ${table_name}`);
    }
    
    return { success: true, data };
  }

  /**
   * Supprimer un enregistrement
   */
  private async deleteRecord(operation: SyncOperation): Promise<{ success: boolean; data?: any }> {
    const { table_name, data } = operation;
    
    switch (table_name) {
      case 'users':
        await db.users.delete(data.id);
        break;
      case 'accounts':
        await db.accounts.delete(data.id);
        break;
      case 'transactions':
        await db.transactions.delete(data.id);
        break;
      case 'budgets':
        await db.budgets.delete(data.id);
        break;
      case 'goals':
        await db.goals.delete(data.id);
        break;
      default:
        throw new Error(`Table non supportée: ${table_name}`);
    }
    
    return { success: true, data };
  }

  /**
   * Calculer le délai de retry
   */
  private calculateRetryDelay(retryCount: number): number {
    const { baseDelay, maxDelay, backoffMultiplier, jitter } = this.config.retryConfig;
    
    let delay = baseDelay * Math.pow(backoffMultiplier, retryCount);
    delay = Math.min(delay, maxDelay);
    
    if (jitter) {
      // Ajouter de la variation aléatoire pour éviter le thundering herd
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  /**
   * Délai utilitaire
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtenir le timestamp de dernière synchronisation
   */
  private async getLastSyncTime(userId: string): Promise<Date> {
    const user = await db.users.get(userId);
    return user?.lastSync || new Date(0);
  }

  /**
   * Mettre à jour le timestamp de synchronisation
   */
  private async updateLastSyncTime(userId: string, timestamp: Date): Promise<void> {
    await db.users.update(userId, { lastSync: timestamp });
  }

  /**
   * Nettoyer les opérations traitées
   */
  private async cleanupProcessedOperations(operations: SyncOperation[]): Promise<void> {
    const operationIds = operations.map(op => op.id);
    await db.syncQueue.where('id').anyOf(operationIds).delete();
  }

  /**
   * Mettre à jour les métriques de performance
   */
  private updatePerformanceMetrics(
    syncTime: number, 
    success: boolean, 
    operations: number, 
    conflicts: number, 
    errors: number
  ): void {
    this.performanceMetrics.totalSyncs++;
    if (success) {
      this.performanceMetrics.successfulSyncs++;
    } else {
      this.performanceMetrics.failedSyncs++;
    }
    
    this.performanceMetrics.averageSyncTime = 
      (this.performanceMetrics.averageSyncTime * (this.performanceMetrics.totalSyncs - 1) + syncTime) / 
      this.performanceMetrics.totalSyncs;
    
    this.performanceMetrics.totalOperations += operations;
    this.performanceMetrics.totalConflicts += conflicts;
    this.performanceMetrics.totalErrors += errors;
  }

  /**
   * Obtenir les métriques de performance
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Obtenir la configuration
   */
  getConfig(): SyncConfig {
    return { ...this.config };
  }

  /**
   * Mettre à jour la configuration
   */
  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Nettoyer les données expirées
   */
  async cleanupExpiredData(): Promise<void> {
    // Nettoyer les opérations de sync anciennes
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 jours
    
    await db.syncQueue
      .where('timestamp')
      .below(cutoffDate)
      .delete();
    
    // Nettoyer les erreurs anciennes
    this.retryQueue.clear();
    
    // Nettoyer les conflits anciens
    this.conflictQueue.clear();
  }
}

export const optimizedSyncService = new OptimizedSyncService();
export default optimizedSyncService;




