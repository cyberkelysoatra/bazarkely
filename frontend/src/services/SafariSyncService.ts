/**
 * Service de synchronisation optimisé pour Safari/iOS
 * Implémente des stratégies de sync adaptées aux limitations de Safari
 */

import { safariCompatibility } from './SafariCompatibility';
import { safariStorageFallback } from './SafariStorageFallback';

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

export interface SyncConfig {
  interval: number; // ms
  maxRetries: number;
  batchSize: number;
  enableBackgroundSync: boolean;
  enablePolling: boolean;
  pollingInterval: number; // ms
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  failedOperations: number;
  syncMethod: 'serviceworker' | 'polling' | 'manual';
  deviceType: 'safari' | 'ios' | 'other';
}

class SafariSyncService {
  private syncQueue: SyncOperation[] = [];
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private config: SyncConfig;
  private capabilities: any;
  private storageStrategy: any;

  constructor() {
    this.capabilities = safariCompatibility.getCapabilities();
    this.storageStrategy = safariCompatibility.getStorageStrategy();
    
    this.config = {
      interval: 30000, // 30 secondes
      maxRetries: 3,
      batchSize: 10,
      enableBackgroundSync: this.capabilities.supportsServiceWorker && !this.capabilities.isSafari,
      enablePolling: this.capabilities.isSafari || !this.capabilities.supportsServiceWorker,
      pollingInterval: 60000 // 1 minute pour Safari
    };

    this.initializeSync();
  }

  /**
   * Initialise le service de synchronisation
   */
  private async initializeSync(): Promise<void> {
    console.log('🔄 Initialisation du service de synchronisation Safari...');
    
    // Charger la queue de synchronisation depuis le stockage
    await this.loadSyncQueue();
    
    // Démarrer la synchronisation selon la stratégie
    if (this.config.enablePolling) {
      this.startPollingSync();
    }
    
    // Écouter les changements de connectivité
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    console.log('✅ Service de synchronisation Safari initialisé');
  }

  /**
   * Ajoute une opération à la queue de synchronisation
   */
  async queueOperation(
    type: 'create' | 'update' | 'delete',
    table: string,
    data: any
  ): Promise<string> {
    const operation: SyncOperation = {
      id: crypto.randomUUID(),
      type,
      table,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    this.syncQueue.push(operation);
    await this.saveSyncQueue();

    console.log(`📝 Opération ${type} ajoutée à la queue pour ${table}`);

    // Déclencher une synchronisation si en ligne
    if (navigator.onLine) {
      this.triggerSync();
    }

    return operation.id;
  }

  /**
   * Déclenche une synchronisation manuelle
   */
  async triggerSync(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    console.log('🔄 Démarrage de la synchronisation...');

    try {
      const pendingOps = this.syncQueue.filter(op => op.status === 'pending');
      const batch = pendingOps.slice(0, this.config.batchSize);

      for (const operation of batch) {
        await this.syncOperation(operation);
      }

      // Nettoyer la queue
      this.syncQueue = this.syncQueue.filter(op => op.status !== 'completed');
      await this.saveSyncQueue();

      console.log('✅ Synchronisation terminée');

    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Synchronise une opération individuelle
   */
  private async syncOperation(operation: SyncOperation): Promise<void> {
    operation.status = 'syncing';

    try {
      // Simuler l'envoi vers le serveur
      await this.sendToServer(operation);
      
      operation.status = 'completed';
      console.log(`✅ Opération ${operation.id} synchronisée`);

    } catch (error) {
      operation.retryCount++;
      
      if (operation.retryCount >= this.config.maxRetries) {
        operation.status = 'failed';
        console.error(`❌ Opération ${operation.id} échouée après ${operation.retryCount} tentatives`);
      } else {
        operation.status = 'pending';
        console.warn(`⚠️ Opération ${operation.id} en retry (${operation.retryCount}/${this.config.maxRetries})`);
      }
    }
  }

  /**
   * Envoie une opération vers le serveur
   */
  private async sendToServer(operation: SyncOperation): Promise<void> {
    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Simuler un taux d'erreur de 5% pour les tests
    if (Math.random() < 0.05) {
      throw new Error('Erreur réseau simulée');
    }

    // En production, ceci serait un appel API réel
    console.log(`📤 Envoi vers le serveur: ${operation.type} ${operation.table}`, operation.data);
  }

  /**
   * Démarre la synchronisation par polling
   */
  private startPollingSync(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(() => {
      if (navigator.onLine && this.syncQueue.length > 0) {
        this.triggerSync();
      }
    }, this.config.pollingInterval);

    console.log(`⏰ Synchronisation par polling démarrée (${this.config.pollingInterval}ms)`);
  }

  /**
   * Arrête la synchronisation
   */
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    console.log('⏹️ Synchronisation arrêtée');
  }

  /**
   * Gère la reconnexion
   */
  private handleOnline(): void {
    console.log('🌐 Connexion rétablie');
    this.triggerSync();
  }

  /**
   * Gère la déconnexion
   */
  private handleOffline(): void {
    console.log('📴 Connexion perdue');
  }

  /**
   * Obtient le statut de synchronisation
   */
  getSyncStatus(): SyncStatus {
    const pendingOps = this.syncQueue.filter(op => op.status === 'pending').length;
    const failedOps = this.syncQueue.filter(op => op.status === 'failed').length;
    const lastSync = this.getLastSyncTime();

    return {
      isOnline: navigator.onLine,
      isSyncing: this.isSyncing,
      lastSync,
      pendingOperations: pendingOps,
      failedOperations: failedOps,
      syncMethod: this.config.enablePolling ? 'polling' : 'serviceworker',
      deviceType: this.capabilities.isSafari ? 'safari' : this.capabilities.isIOS ? 'ios' : 'other'
    };
  }

  /**
   * Obtient le temps de la dernière synchronisation
   */
  private getLastSyncTime(): Date | null {
    const completedOps = this.syncQueue.filter(op => op.status === 'completed');
    if (completedOps.length === 0) return null;

    const lastOp = completedOps.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    );

    return new Date(lastOp.timestamp);
  }

  /**
   * Sauvegarde la queue de synchronisation
   */
  private async saveSyncQueue(): Promise<void> {
    try {
      await safariStorageFallback.set('syncQueue', this.syncQueue, {
        ttl: 7 * 24 * 60 * 60 * 1000 // 7 jours
      });
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde de la queue:', error);
    }
  }

  /**
   * Charge la queue de synchronisation
   */
  private async loadSyncQueue(): Promise<void> {
    try {
      const savedQueue = await safariStorageFallback.get('syncQueue');
      if (savedQueue && Array.isArray(savedQueue)) {
        this.syncQueue = savedQueue;
        console.log(`📦 Queue de synchronisation chargée: ${this.syncQueue.length} opérations`);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la queue:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Retry les opérations échouées
   */
  async retryFailedOperations(): Promise<void> {
    const failedOps = this.syncQueue.filter(op => op.status === 'failed');
    
    for (const operation of failedOps) {
      operation.status = 'pending';
      operation.retryCount = 0;
    }

    await this.saveSyncQueue();
    
    if (navigator.onLine) {
      this.triggerSync();
    }

    console.log(`🔄 ${failedOps.length} opérations échouées remises en queue`);
  }

  /**
   * Vide la queue de synchronisation
   */
  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
    console.log('🗑️ Queue de synchronisation vidée');
  }

  /**
   * Obtient les statistiques de synchronisation
   */
  getSyncStats(): {
    totalOperations: number;
    pendingOperations: number;
    completedOperations: number;
    failedOperations: number;
    averageRetryCount: number;
    oldestPendingOperation: Date | null;
  } {
    const total = this.syncQueue.length;
    const pending = this.syncQueue.filter(op => op.status === 'pending').length;
    const completed = this.syncQueue.filter(op => op.status === 'completed').length;
    const failed = this.syncQueue.filter(op => op.status === 'failed').length;
    
    const averageRetryCount = this.syncQueue.length > 0 
      ? this.syncQueue.reduce((sum, op) => sum + op.retryCount, 0) / this.syncQueue.length 
      : 0;

    const oldestPending = this.syncQueue
      .filter(op => op.status === 'pending')
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    return {
      totalOperations: total,
      pendingOperations: pending,
      completedOperations: completed,
      failedOperations: failed,
      averageRetryCount: Math.round(averageRetryCount * 100) / 100,
      oldestPendingOperation: oldestPending ? new Date(oldestPending.timestamp) : null
    };
  }

  /**
   * Configure le service de synchronisation
   */
  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Redémarrer la synchronisation si nécessaire
    if (this.config.enablePolling && !this.pollingInterval) {
      this.startPollingSync();
    } else if (!this.config.enablePolling && this.pollingInterval) {
      this.stopSync();
    }
    
    console.log('⚙️ Configuration de synchronisation mise à jour:', this.config);
  }
}

// Instance singleton
export const safariSyncService = new SafariSyncService();
























