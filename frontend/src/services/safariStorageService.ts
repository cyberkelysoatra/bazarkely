/**
 * Service de stockage alternatif pour Safari/iOS
 * Gère les fallbacks quand IndexedDB n'est pas disponible
 */

export interface StorageOptions {
  useIndexedDB: boolean;
  useLocalStorage: boolean;
  useWebSQL: boolean;
  useMemory: boolean;
  compression: boolean;
  encryption: boolean;
}

export interface StorageStats {
  totalSize: number;
  usedSize: number;
  availableSize: number;
  itemCount: number;
  lastSync: Date | null;
}

class SafariStorageService {
  private options: StorageOptions;
  private memoryStorage: Map<string, any> = new Map();
  private compressionEnabled: boolean = false;

  constructor() {
    this.options = {
      useIndexedDB: 'indexedDB' in window,
      useLocalStorage: 'localStorage' in window,
      useWebSQL: 'openDatabase' in window,
      useMemory: true,
      compression: true,
      encryption: false
    };
  }

  /**
   * Initialise le service de stockage
   */
  async initialize(): Promise<void> {
    console.log('🔧 Initialisation Safari Storage Service');
    
    // Détecter les capacités disponibles
    this.detectCapabilities();
    
    // Configurer la compression si supportée
    this.compressionEnabled = this.options.compression && this.supportsCompression();
    
    console.log('✅ Safari Storage Service initialisé', this.options);
  }

  /**
   * Détecte les capacités de stockage disponibles
   */
  private detectCapabilities(): void {
    this.options.useIndexedDB = 'indexedDB' in window;
    this.options.useLocalStorage = 'localStorage' in window;
    this.options.useWebSQL = 'openDatabase' in window;
    
    // Vérifier les quotas
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        console.log('📊 Quota de stockage:', estimate);
      });
    }
  }

  /**
   * Vérifie si la compression est supportée
   */
  private supportsCompression(): boolean {
    return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
  }

  /**
   * Sauvegarde des données avec fallback automatique
   */
  async save(key: string, data: any): Promise<boolean> {
    try {
      // Compresser les données si nécessaire
      const processedData = await this.processData(data, 'save');
      
      // Essayer IndexedDB en premier
      if (this.options.useIndexedDB) {
        const success = await this.saveToIndexedDB(key, processedData);
        if (success) return true;
      }
      
      // Fallback vers localStorage
      if (this.options.useLocalStorage) {
        const success = await this.saveToLocalStorage(key, processedData);
        if (success) return true;
      }
      
      // Fallback vers WebSQL
      if (this.options.useWebSQL) {
        const success = await this.saveToWebSQL(key, processedData);
        if (success) return true;
      }
      
      // Fallback vers mémoire
      if (this.options.useMemory) {
        return this.saveToMemory(key, processedData);
      }
      
      console.error('❌ Aucun stockage disponible pour sauvegarder:', key);
      return false;
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      return false;
    }
  }

  /**
   * Charge des données avec fallback automatique
   */
  async load(key: string): Promise<any> {
    try {
      let data: any = null;
      
      // Essayer IndexedDB en premier
      if (this.options.useIndexedDB) {
        data = await this.loadFromIndexedDB(key);
        if (data !== null) return this.processData(data, 'load');
      }
      
      // Fallback vers localStorage
      if (this.options.useLocalStorage) {
        data = await this.loadFromLocalStorage(key);
        if (data !== null) return this.processData(data, 'load');
      }
      
      // Fallback vers WebSQL
      if (this.options.useWebSQL) {
        data = await this.loadFromWebSQL(key);
        if (data !== null) return this.processData(data, 'load');
      }
      
      // Fallback vers mémoire
      if (this.options.useMemory) {
        data = this.loadFromMemory(key);
        if (data !== null) return this.processData(data, 'load');
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erreur lors du chargement:', error);
      return null;
    }
  }

  /**
   * Supprime des données
   */
  async remove(key: string): Promise<boolean> {
    try {
      let success = false;
      
      // Supprimer de tous les stockages
      if (this.options.useIndexedDB) {
        success = await this.removeFromIndexedDB(key) || success;
      }
      
      if (this.options.useLocalStorage) {
        success = await this.removeFromLocalStorage(key) || success;
      }
      
      if (this.options.useWebSQL) {
        success = await this.removeFromWebSQL(key) || success;
      }
      
      if (this.options.useMemory) {
        success = this.removeFromMemory(key) || success;
      }
      
      return success;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      return false;
    }
  }

  /**
   * Sauvegarde vers IndexedDB
   */
  private async saveToIndexedDB(key: string, data: any): Promise<boolean> {
    try {
      const db = await this.getIndexedDB();
      const transaction = db.transaction(['safariStorage'], 'readwrite');
      const store = transaction.objectStore('safariStorage');
      
      await store.put({ key, data, timestamp: Date.now() });
      return true;
    } catch (error) {
      console.error('❌ Erreur IndexedDB save:', error);
      return false;
    }
  }

  /**
   * Charge depuis IndexedDB
   */
  private async loadFromIndexedDB(key: string): Promise<any> {
    try {
      const db = await this.getIndexedDB();
      const transaction = db.transaction(['safariStorage'], 'readonly');
      const store = transaction.objectStore('safariStorage');
      
      const result = await store.get(key);
      return result ? result.data : null;
    } catch (error) {
      console.error('❌ Erreur IndexedDB load:', error);
      return null;
    }
  }

  /**
   * Supprime depuis IndexedDB
   */
  private async removeFromIndexedDB(key: string): Promise<boolean> {
    try {
      const db = await this.getIndexedDB();
      const transaction = db.transaction(['safariStorage'], 'readwrite');
      const store = transaction.objectStore('safariStorage');
      
      await store.delete(key);
      return true;
    } catch (error) {
      console.error('❌ Erreur IndexedDB remove:', error);
      return false;
    }
  }

  /**
   * Obtient une connexion IndexedDB
   */
  private async getIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BazarKELYSafariStorage', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('safariStorage')) {
          db.createObjectStore('safariStorage', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Sauvegarde vers localStorage
   */
  private async saveToLocalStorage(key: string, data: any): Promise<boolean> {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(`safari_${key}`, serialized);
      return true;
    } catch (error) {
      console.error('❌ Erreur localStorage save:', error);
      return false;
    }
  }

  /**
   * Charge depuis localStorage
   */
  private async loadFromLocalStorage(key: string): Promise<any> {
    try {
      const serialized = localStorage.getItem(`safari_${key}`);
      return serialized ? JSON.parse(serialized) : null;
    } catch (error) {
      console.error('❌ Erreur localStorage load:', error);
      return null;
    }
  }

  /**
   * Supprime depuis localStorage
   */
  private async removeFromLocalStorage(key: string): Promise<boolean> {
    try {
      localStorage.removeItem(`safari_${key}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur localStorage remove:', error);
      return false;
    }
  }

  /**
   * Sauvegarde vers WebSQL
   */
  private async saveToWebSQL(key: string, data: any): Promise<boolean> {
    try {
      const db = await this.getWebSQL();
      const serialized = JSON.stringify(data);
      
      return new Promise((resolve) => {
        db.transaction((tx) => {
          tx.executeSql(
            'CREATE TABLE IF NOT EXISTS safari_storage (key TEXT PRIMARY KEY, data TEXT, timestamp INTEGER)',
            [],
            () => {
              tx.executeSql(
                'INSERT OR REPLACE INTO safari_storage (key, data, timestamp) VALUES (?, ?, ?)',
                [key, serialized, Date.now()],
                () => resolve(true),
                () => resolve(false)
              );
            },
            () => resolve(false)
          );
        });
      });
    } catch (error) {
      console.error('❌ Erreur WebSQL save:', error);
      return false;
    }
  }

  /**
   * Charge depuis WebSQL
   */
  private async loadFromWebSQL(key: string): Promise<any> {
    try {
      const db = await this.getWebSQL();
      
      return new Promise((resolve) => {
        db.transaction((tx) => {
          tx.executeSql(
            'SELECT data FROM safari_storage WHERE key = ?',
            [key],
            (_, result) => {
              if (result.rows.length > 0) {
                const data = JSON.parse(result.rows.item(0).data);
                resolve(data);
              } else {
                resolve(null);
              }
            },
            () => resolve(null)
          );
        });
      });
    } catch (error) {
      console.error('❌ Erreur WebSQL load:', error);
      return null;
    }
  }

  /**
   * Supprime depuis WebSQL
   */
  private async removeFromWebSQL(key: string): Promise<boolean> {
    try {
      const db = await this.getWebSQL();
      
      return new Promise((resolve) => {
        db.transaction((tx) => {
          tx.executeSql(
            'DELETE FROM safari_storage WHERE key = ?',
            [key],
            () => resolve(true),
            () => resolve(false)
          );
        });
      });
    } catch (error) {
      console.error('❌ Erreur WebSQL remove:', error);
      return false;
    }
  }

  /**
   * Obtient une connexion WebSQL
   */
  private async getWebSQL(): Promise<Database> {
    return new Promise((resolve, reject) => {
      const db = openDatabase('BazarKELYSafariStorage', '1.0', 'Safari Storage', 5 * 1024 * 1024);
      resolve(db);
    });
  }

  /**
   * Sauvegarde vers mémoire
   */
  private saveToMemory(key: string, data: any): boolean {
    try {
      this.memoryStorage.set(key, data);
      return true;
    } catch (error) {
      console.error('❌ Erreur mémoire save:', error);
      return false;
    }
  }

  /**
   * Charge depuis mémoire
   */
  private loadFromMemory(key: string): any {
    return this.memoryStorage.get(key) || null;
  }

  /**
   * Supprime depuis mémoire
   */
  private removeFromMemory(key: string): boolean {
    return this.memoryStorage.delete(key);
  }

  /**
   * Traite les données (compression/décompression)
   */
  private async processData(data: any, operation: 'save' | 'load'): Promise<any> {
    if (!this.compressionEnabled) return data;
    
    try {
      if (operation === 'save') {
        // Utiliser le nouveau système de chiffrement AES-256
        const serialized = JSON.stringify(data);
        const { migrationService } = await import('./migrationService');
        return await migrationService.encryptNewValue(serialized);
      } else {
        // Déchiffrement avec support des anciennes données Base64
        const { migrationService } = await import('./migrationService');
        const decrypted = await migrationService.decryptMigratedValue(data);
        return JSON.parse(decrypted);
      }
    } catch (error) {
      console.error('❌ Erreur chiffrement/déchiffrement:', error);
      // Fallback vers Base64 en cas d'erreur
      try {
        if (operation === 'save') {
          const serialized = JSON.stringify(data);
          return btoa(serialized);
        } else {
          const decompressed = atob(data);
          return JSON.parse(decompressed);
        }
      } catch (fallbackError) {
        console.error('❌ Erreur fallback Base64:', fallbackError);
        return data;
      }
    }
  }

  /**
   * Obtient les statistiques de stockage
   */
  async getStats(): Promise<StorageStats> {
    const stats: StorageStats = {
      totalSize: 0,
      usedSize: 0,
      availableSize: 0,
      itemCount: 0,
      lastSync: null
    };

    try {
      // Compter les éléments en mémoire
      stats.itemCount = this.memoryStorage.size;
      
      // Estimer la taille utilisée
      let totalSize = 0;
      for (const [key, value] of this.memoryStorage) {
        totalSize += key.length + JSON.stringify(value).length;
      }
      stats.usedSize = totalSize;
      
      // Obtenir les quotas si disponibles
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        stats.totalSize = estimate.quota || 0;
        stats.availableSize = (estimate.quota || 0) - (estimate.usage || 0);
      }
      
      return stats;
    } catch (error) {
      console.error('❌ Erreur stats:', error);
      return stats;
    }
  }

  /**
   * Nettoie le stockage
   */
  async cleanup(): Promise<boolean> {
    try {
      // Nettoyer la mémoire
      this.memoryStorage.clear();
      
      // Nettoyer localStorage
      if (this.options.useLocalStorage) {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('safari_')) {
            localStorage.removeItem(key);
          }
        });
      }
      
      console.log('🧹 Nettoyage Safari Storage terminé');
      return true;
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
      return false;
    }
  }

  /**
   * Obtient les options de stockage
   */
  getOptions(): StorageOptions {
    return { ...this.options };
  }

  /**
   * Met à jour les options
   */
  updateOptions(newOptions: Partial<StorageOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }
}

export default new SafariStorageService();






















