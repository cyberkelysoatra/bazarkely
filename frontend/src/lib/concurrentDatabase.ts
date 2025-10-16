/**
 * Base de données IndexedDB optimisée pour l'accès concurrent
 * Gère les connexions multiples, la pagination et les transactions isolées
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface BazarKELYSchema extends DBSchema {
  users: {
    key: string;
    value: {
      id: string;
      username: string;
      email: string;
      createdAt: Date;
      lastLogin: Date;
      preferences: any;
    };
  };
  accounts: {
    key: string;
    value: {
      id: string;
      userId: string;
      name: string;
      type: 'checking' | 'savings' | 'mobile_money';
      balance: number;
      currency: string;
      createdAt: Date;
      updatedAt: Date;
    };
    indexes: { 'by-userId': string };
  };
  transactions: {
    key: string;
    value: {
      id: string;
      userId: string;
      accountId: string;
      type: 'income' | 'expense' | 'transfer';
      amount: number;
      description: string;
      category: string;
      date: Date;
      createdAt: Date;
      updatedAt: Date;
      syncStatus: 'pending' | 'synced' | 'error';
      version: number;
    };
    indexes: { 
      'by-userId': string;
      'by-accountId': string;
      'by-date': Date;
      'by-syncStatus': string;
    };
  };
  budgets: {
    key: string;
    value: {
      id: string;
      userId: string;
      category: string;
      limit: number;
      spent: number;
      period: 'monthly' | 'weekly' | 'yearly';
      startDate: Date;
      endDate: Date;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    };
    indexes: { 'by-userId': string };
  };
  goals: {
    key: string;
    value: {
      id: string;
      userId: string;
      name: string;
      targetAmount: number;
      currentAmount: number;
      targetDate: Date;
      status: 'active' | 'completed' | 'paused';
      createdAt: Date;
      updatedAt: Date;
      version: number;
    };
    indexes: { 'by-userId': string };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      userId: string;
      operation: 'create' | 'update' | 'delete';
      table: string;
      recordId: string;
      data: any;
      timestamp: Date;
      retryCount: number;
      maxRetries: number;
      priority: number;
    };
    indexes: { 
      'by-userId': string;
      'by-priority': number;
      'by-timestamp': Date;
    };
  };
  performanceMetrics: {
    key: string;
    value: {
      id: string;
      userId: string;
      operation: string;
      duration: number;
      memoryUsage: number;
      timestamp: Date;
      success: boolean;
      error?: string;
    };
    indexes: { 'by-userId': string; 'by-timestamp': Date };
  };
}

class ConcurrentDatabase {
  private db: IDBPDatabase<BazarKELYSchema> | null = null;
  private connectionPool: Map<string, IDBPDatabase<BazarKELYSchema>> = new Map();
  private maxConnections = 10;
  private activeConnections = 0;
  private connectionQueue: Array<() => void> = [];
  private isInitialized = false;
  private performanceMetrics: Array<any> = [];
  private memoryThreshold = 50 * 1024 * 1024; // 50MB

  /**
   * Initialise la base de données avec gestion des connexions
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔧 Initialisation Concurrent Database...');
      
      this.db = await this.createConnection('main');
      this.connectionPool.set('main', this.db);
      this.activeConnections = 1;
      this.isInitialized = true;
      
      // Démarrer le nettoyage périodique
      this.startPeriodicCleanup();
      
      console.log('✅ Concurrent Database initialisée');
    } catch (error) {
      console.error('❌ Erreur initialisation Concurrent Database:', error);
      throw error;
    }
  }

  /**
   * Crée une nouvelle connexion à la base de données
   */
  private async createConnection(name: string): Promise<IDBPDatabase<BazarKELYSchema>> {
    return await openDB<BazarKELYSchema>('BazarKELYConcurrent', 2, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`🔄 Mise à jour DB: ${oldVersion} -> ${newVersion}`);

        // Créer les stores avec index optimisés
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('accounts')) {
          const accountsStore = db.createObjectStore('accounts', { keyPath: 'id' });
          accountsStore.createIndex('by-userId', 'userId');
        }

        if (!db.objectStoreNames.contains('transactions')) {
          const transactionsStore = db.createObjectStore('transactions', { keyPath: 'id' });
          transactionsStore.createIndex('by-userId', 'userId');
          transactionsStore.createIndex('by-accountId', 'accountId');
          transactionsStore.createIndex('by-date', 'date');
          transactionsStore.createIndex('by-syncStatus', 'syncStatus');
        }

        if (!db.objectStoreNames.contains('budgets')) {
          const budgetsStore = db.createObjectStore('budgets', { keyPath: 'id' });
          budgetsStore.createIndex('by-userId', 'userId');
        }

        if (!db.objectStoreNames.contains('goals')) {
          const goalsStore = db.createObjectStore('goals', { keyPath: 'id' });
          goalsStore.createIndex('by-userId', 'userId');
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncQueueStore.createIndex('by-userId', 'userId');
          syncQueueStore.createIndex('by-priority', 'priority');
          syncQueueStore.createIndex('by-timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('performanceMetrics')) {
          const metricsStore = db.createObjectStore('performanceMetrics', { keyPath: 'id' });
          metricsStore.createIndex('by-userId', 'userId');
          metricsStore.createIndex('by-timestamp', 'timestamp');
        }
      },
      blocked() {
        console.warn('⚠️ DB bloquée par une autre connexion');
      },
      blocking() {
        console.warn('⚠️ DB bloquante, fermeture des connexions');
        this.closeAllConnections();
      },
      terminated() {
        console.warn('⚠️ DB terminée, reconnexion...');
        this.reconnect();
      }
    });
  }

  /**
   * Obtient une connexion de la pool
   */
  private async getConnection(): Promise<IDBPDatabase<BazarKELYSchema>> {
    if (this.activeConnections < this.maxConnections) {
      const connectionName = `conn_${this.activeConnections}`;
      const connection = await this.createConnection(connectionName);
      this.connectionPool.set(connectionName, connection);
      this.activeConnections++;
      return connection;
    }

    // Attendre qu'une connexion soit disponible
    return new Promise((resolve) => {
      this.connectionQueue.push(() => {
        const connectionName = `conn_${this.activeConnections}`;
        this.createConnection(connectionName).then(connection => {
          this.connectionPool.set(connectionName, connection);
          this.activeConnections++;
          resolve(connection);
        });
      });
    });
  }

  /**
   * Libère une connexion
   */
  private releaseConnection(connectionName: string): void {
    if (this.connectionPool.has(connectionName) && connectionName !== 'main') {
      this.connectionPool.get(connectionName)?.close();
      this.connectionPool.delete(connectionName);
      this.activeConnections--;
      
      // Traiter la queue
      if (this.connectionQueue.length > 0) {
        const next = this.connectionQueue.shift();
        next?.();
      }
    }
  }

  /**
   * Exécute une transaction avec gestion des conflits
   */
  async executeTransaction<T>(
    storeNames: string[],
    mode: 'readonly' | 'readwrite',
    operation: (tx: any) => Promise<T>,
    retries = 3
  ): Promise<T> {
    const startTime = performance.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const connection = await this.getConnection();
        const tx = connection.transaction(storeNames, mode);
        
        const result = await operation(tx);
        
        // Mesurer les performances
        const duration = performance.now() - startTime;
        this.recordPerformance('transaction', duration, true);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Tentative ${attempt + 1}/${retries} échouée:`, error);
        
        if (attempt < retries - 1) {
          // Attendre avec backoff exponentiel
          await this.delay(Math.pow(2, attempt) * 100);
        }
      }
    }

    const duration = performance.now() - startTime;
    this.recordPerformance('transaction', duration, false, lastError?.message);
    throw lastError;
  }

  /**
   * Exécute une opération en batch pour l'efficacité
   */
  async executeBatch<T>(
    operations: Array<{
      store: string;
      operation: 'add' | 'put' | 'delete';
      data?: any;
      key?: string;
    }>
  ): Promise<T[]> {
    const startTime = performance.now();
    
    try {
      const connection = await this.getConnection();
      const tx = connection.transaction(operations.map(op => op.store), 'readwrite');
      
      const results: T[] = [];
      
      for (const op of operations) {
        const store = tx.objectStore(op.store);
        let result: any;
        
        switch (op.operation) {
          case 'add':
            result = await store.add(op.data);
            break;
          case 'put':
            result = await store.put(op.data);
            break;
          case 'delete':
            result = await store.delete(op.key!);
            break;
        }
        
        results.push(result);
      }
      
      const duration = performance.now() - startTime;
      this.recordPerformance('batch', duration, true);
      
      return results;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordPerformance('batch', duration, false, (error as Error).message);
      throw error;
    }
  }

  /**
   * Pagination optimisée pour les grandes listes
   */
  async paginate<T>(
    storeName: string,
    indexName: string | null,
    query: IDBValidKey | IDBKeyRange | null,
    options: {
      page: number;
      pageSize: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    data: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }> {
    const startTime = performance.now();
    
    try {
      const connection = await this.getConnection();
      const tx = connection.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      
      const targetStore = indexName ? store.index(indexName) : store;
      
      // Compter le total
      const totalCount = await targetStore.count(query);
      
      // Calculer les limites
      const offset = (options.page - 1) * options.pageSize;
      const totalPages = Math.ceil(totalCount / options.pageSize);
      
      // Récupérer les données
      const data: T[] = [];
      let cursor = await targetStore.openCursor(query);
      let currentIndex = 0;
      
      // Aller à la page demandée
      while (cursor && currentIndex < offset) {
        cursor = await cursor.continue();
        currentIndex++;
      }
      
      // Récupérer les données de la page
      while (cursor && data.length < options.pageSize) {
        data.push(cursor.value as T);
        cursor = await cursor.continue();
      }
      
      const duration = performance.now() - startTime;
      this.recordPerformance('paginate', duration, true);
      
      return {
        data,
        totalCount,
        page: options.page,
        pageSize: options.pageSize,
        totalPages,
        hasNext: options.page < totalPages,
        hasPrevious: options.page > 1
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordPerformance('paginate', duration, false, (error as Error).message);
      throw error;
    }
  }

  /**
   * Synchronisation différentielle optimisée
   */
  async differentialSync(
    userId: string,
    lastSyncTimestamp: Date,
    changes: Array<{
      table: string;
      operation: 'create' | 'update' | 'delete';
      recordId: string;
      data?: any;
    }>
  ): Promise<{
    applied: number;
    conflicts: Array<{
      table: string;
      recordId: string;
      localVersion: number;
      remoteVersion: number;
      resolution: 'local' | 'remote' | 'merge';
    }>;
  }> {
    const startTime = performance.now();
    let applied = 0;
    const conflicts: any[] = [];

    try {
      const connection = await this.getConnection();
      const tx = connection.transaction(['transactions', 'budgets', 'goals'], 'readwrite');

      for (const change of changes) {
        try {
          const store = tx.objectStore(change.table);
          
          if (change.operation === 'delete') {
            await store.delete(change.recordId);
          } else {
            // Vérifier les conflits de version
            const existing = await store.get(change.recordId);
            if (existing && existing.version && change.data.version) {
              if (existing.version > change.data.version) {
                conflicts.push({
                  table: change.table,
                  recordId: change.recordId,
                  localVersion: existing.version,
                  remoteVersion: change.data.version,
                  resolution: 'local'
                });
                continue;
              }
            }
            
            await store.put({
              ...change.data,
              version: (change.data.version || 0) + 1,
              updatedAt: new Date()
            });
          }
          
          applied++;
        } catch (error) {
          console.error(`❌ Erreur sync ${change.table}:`, error);
        }
      }

      const duration = performance.now() - startTime;
      this.recordPerformance('differentialSync', duration, true);

      return { applied, conflicts };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordPerformance('differentialSync', duration, false, (error as Error).message);
      throw error;
    }
  }

  /**
   * Enregistre les métriques de performance
   */
  private recordPerformance(
    operation: string,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    const metric = {
      id: `perf_${Date.now()}_${Math.random()}`,
      userId: 'system',
      operation,
      duration,
      memoryUsage: this.getMemoryUsage(),
      timestamp: new Date(),
      success,
      error
    };

    this.performanceMetrics.push(metric);

    // Garder seulement les 1000 dernières métriques
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }

    // Alerte si performance dégradée
    if (duration > 1000) { // Plus de 1 seconde
      console.warn(`⚠️ Performance dégradée: ${operation} a pris ${duration}ms`);
    }
  }

  /**
   * Obtient l'utilisation mémoire
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Démarre le nettoyage périodique
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupOldData();
      this.cleanupPerformanceMetrics();
      this.checkMemoryUsage();
    }, 300000); // Toutes les 5 minutes
  }

  /**
   * Nettoie les anciennes données
   */
  private async cleanupOldData(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 6); // Garder 6 mois

      const connection = await this.getConnection();
      const tx = connection.transaction(['performanceMetrics'], 'readwrite');
      const store = tx.objectStore('performanceMetrics');
      const index = store.index('by-timestamp');

      const range = IDBKeyRange.upperBound(cutoffDate);
      let cursor = await index.openCursor(range);
      
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }

      console.log('🧹 Nettoyage des anciennes données terminé');
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
    }
  }

  /**
   * Nettoie les métriques de performance
   */
  private cleanupPerformanceMetrics(): void {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24); // Garder 24h

    this.performanceMetrics = this.performanceMetrics.filter(
      metric => metric.timestamp > cutoffDate
    );
  }

  /**
   * Vérifie l'utilisation mémoire
   */
  private checkMemoryUsage(): void {
    const memoryUsage = this.getMemoryUsage();
    
    if (memoryUsage > this.memoryThreshold) {
      console.warn(`⚠️ Utilisation mémoire élevée: ${Math.round(memoryUsage / 1024 / 1024)}MB`);
      
      // Forcer le garbage collection si possible
      if ('gc' in window) {
        (window as any).gc();
      }
    }
  }

  /**
   * Obtient les statistiques de performance
   */
  getPerformanceStats(): {
    averageResponseTime: number;
    successRate: number;
    memoryUsage: number;
    activeConnections: number;
    queueLength: number;
  } {
    const recentMetrics = this.performanceMetrics.slice(-100);
    
    const averageResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      : 0;

    const successRate = recentMetrics.length > 0
      ? recentMetrics.filter(m => m.success).length / recentMetrics.length
      : 1;

    return {
      averageResponseTime,
      successRate,
      memoryUsage: this.getMemoryUsage(),
      activeConnections: this.activeConnections,
      queueLength: this.connectionQueue.length
    };
  }

  /**
   * Ferme toutes les connexions
   */
  async closeAllConnections(): Promise<void> {
    for (const [name, connection] of this.connectionPool) {
      connection.close();
    }
    this.connectionPool.clear();
    this.activeConnections = 0;
    this.connectionQueue = [];
  }

  /**
   * Reconnexion en cas de problème
   */
  private async reconnect(): Promise<void> {
    console.log('🔄 Reconnexion à la base de données...');
    await this.closeAllConnections();
    await this.initialize();
  }

  /**
   * Délai avec backoff exponentiel
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtient la base de données principale
   */
  getDB(): IDBPDatabase<BazarKELYSchema> | null {
    return this.db;
  }
}

export default new ConcurrentDatabase();
























