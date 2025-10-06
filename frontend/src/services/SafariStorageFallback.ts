/**
 * Service de fallback de stockage pour Safari
 * Implémente des alternatives de stockage quand IndexedDB n'est pas disponible ou limité
 */

import { safariCompatibility } from './SafariCompatibility';

export interface StorageOptions {
  maxSize?: number;
  compression?: boolean;
  encryption?: boolean;
  ttl?: number; // Time to live in milliseconds
}

export interface StorageItem<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl?: number;
  compressed?: boolean;
  encrypted?: boolean;
}

export interface StorageStats {
  totalItems: number;
  totalSize: number;
  availableSpace: number;
  compressionRatio: number;
  oldestItem: number;
  newestItem: number;
}

class SafariStorageFallback {
  private memoryStorage = new Map<string, StorageItem>();
  private localStoragePrefix = 'bazarkely_';
  private maxMemorySize = 10 * 1024 * 1024; // 10MB
  private maxLocalStorageSize = 5 * 1024 * 1024; // 5MB
  private compressionEnabled = false;
  private encryptionEnabled = false;

  constructor() {
    this.initializeStorage();
  }

  /**
   * Initialise le système de stockage avec les optimisations Safari
   */
  private initializeStorage(): void {
    const capabilities = safariCompatibility.getCapabilities();
    const strategy = safariCompatibility.getStorageStrategy();
    const metrics = safariCompatibility.getDeviceMetrics();

    // Configurer les limites selon l'appareil
    this.maxMemorySize = metrics.memoryLimit * 1024 * 1024; // Convertir MB en bytes
    this.maxLocalStorageSize = metrics.storageLimit * 1024 * 1024;

    // Activer la compression sur iOS pour économiser l'espace
    this.compressionEnabled = capabilities.isIOS;

    // Activer le chiffrement sur Safari pour la sécurité
    this.encryptionEnabled = capabilities.isSafari;

    console.log('💾 Safari Storage Fallback initialisé:', {
      strategy: strategy.primary,
      fallback: strategy.fallback,
      maxMemory: this.maxMemorySize,
      maxLocalStorage: this.maxLocalStorageSize,
      compression: this.compressionEnabled,
      encryption: this.encryptionEnabled
    });
  }

  /**
   * Stocke une valeur avec fallback automatique
   */
  async set<T>(key: string, value: T, options: StorageOptions = {}): Promise<boolean> {
    try {
      const item: StorageItem<T> = {
        key,
        value,
        timestamp: Date.now(),
        ttl: options.ttl,
        compressed: false,
        encrypted: false
      };

      // Compresser si activé
      if (this.compressionEnabled && options.compression !== false) {
        item.value = await this.compress(value) as T;
        item.compressed = true;
      }

      // Chiffrer si activé
      if (this.encryptionEnabled && options.encryption !== false) {
        item.value = await this.encrypt(JSON.stringify(value)) as T;
        item.encrypted = true;
      }

      // Essayer IndexedDB d'abord
      if (await this.isIndexedDBAvailable()) {
        return await this.setInIndexedDB(key, item);
      }

      // Fallback vers localStorage
      if (await this.isLocalStorageAvailable()) {
        return await this.setInLocalStorage(key, item);
      }

      // Fallback vers mémoire
      return await this.setInMemory(key, item);

    } catch (error) {
      console.error('❌ Erreur lors du stockage:', error);
      return false;
    }
  }

  /**
   * Récupère une valeur avec fallback automatique
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      let item: StorageItem<T> | null = null;

      // Essayer IndexedDB d'abord
      if (await this.isIndexedDBAvailable()) {
        item = await this.getFromIndexedDB<T>(key);
      }

      // Fallback vers localStorage
      if (!item && await this.isLocalStorageAvailable()) {
        item = await this.getFromLocalStorage<T>(key);
      }

      // Fallback vers mémoire
      if (!item) {
        item = await this.getFromMemory<T>(key);
      }

      if (!item) {
        return null;
      }

      // Vérifier la TTL
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        await this.delete(key);
        return null;
      }

      let value = item.value;

      // Déchiffrer si nécessaire
      if (item.encrypted) {
        value = JSON.parse(await this.decrypt(value as string)) as T;
      }

      // Décompresser si nécessaire
      if (item.compressed) {
        value = await this.decompress(value) as T;
      }

      return value;

    } catch (error) {
      console.error('❌ Erreur lors de la récupération:', error);
      return null;
    }
  }

  /**
   * Supprime une valeur
   */
  async delete(key: string): Promise<boolean> {
    try {
      let deleted = false;

      // Supprimer de tous les stockages
      if (await this.isIndexedDBAvailable()) {
        deleted = await this.deleteFromIndexedDB(key) || deleted;
      }

      if (await this.isLocalStorageAvailable()) {
        deleted = await this.deleteFromLocalStorage(key) || deleted;
      }

      deleted = await this.deleteFromMemory(key) || deleted;

      return deleted;

    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      return false;
    }
  }

  /**
   * Vide tout le stockage
   */
  async clear(): Promise<boolean> {
    try {
      // Vider IndexedDB
      if (await this.isIndexedDBAvailable()) {
        await this.clearIndexedDB();
      }

      // Vider localStorage
      if (await this.isLocalStorageAvailable()) {
        await this.clearLocalStorage();
      }

      // Vider mémoire
      this.memoryStorage.clear();

      console.log('🗑️ Tous les stockages ont été vidés');
      return true;

    } catch (error) {
      console.error('❌ Erreur lors du vidage:', error);
      return false;
    }
  }

  /**
   * Obtient les statistiques de stockage
   */
  async getStats(): Promise<StorageStats> {
    const stats: StorageStats = {
      totalItems: 0,
      totalSize: 0,
      availableSpace: 0,
      compressionRatio: 0,
      oldestItem: Date.now(),
      newestItem: 0
    };

    try {
      // Statistiques mémoire
      for (const [key, item] of this.memoryStorage) {
        stats.totalItems++;
        stats.totalSize += this.getItemSize(item);
        stats.oldestItem = Math.min(stats.oldestItem, item.timestamp);
        stats.newestItem = Math.max(stats.newestItem, item.timestamp);
      }

      // Statistiques localStorage
      if (await this.isLocalStorageAvailable()) {
        const localStorageStats = await this.getLocalStorageStats();
        stats.totalItems += localStorageStats.totalItems;
        stats.totalSize += localStorageStats.totalSize;
        stats.oldestItem = Math.min(stats.oldestItem, localStorageStats.oldestItem);
        stats.newestItem = Math.max(stats.newestItem, localStorageStats.newestItem);
      }

      // Calculer l'espace disponible
      stats.availableSpace = this.maxMemorySize - stats.totalSize;
      stats.compressionRatio = this.compressionEnabled ? 0.7 : 1.0; // Estimation

    } catch (error) {
      console.error('❌ Erreur lors du calcul des statistiques:', error);
    }

    return stats;
  }

  // ===== MÉTHODES DE STOCKAGE SPÉCIFIQUES =====

  /**
   * Stockage en IndexedDB
   */
  private async setInIndexedDB(key: string, item: StorageItem): Promise<boolean> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      await store.put(item, key);
      return true;
    } catch (error) {
      console.error('❌ Erreur IndexedDB set:', error);
      return false;
    }
  }

  private async getFromIndexedDB<T>(key: string): Promise<StorageItem<T> | null> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      const result = await store.get(key);
      return result || null;
    } catch (error) {
      console.error('❌ Erreur IndexedDB get:', error);
      return null;
    }
  }

  private async deleteFromIndexedDB(key: string): Promise<boolean> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      await store.delete(key);
      return true;
    } catch (error) {
      console.error('❌ Erreur IndexedDB delete:', error);
      return false;
    }
  }

  private async clearIndexedDB(): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      await store.clear();
    } catch (error) {
      console.error('❌ Erreur IndexedDB clear:', error);
    }
  }

  /**
   * Stockage en localStorage
   */
  private async setInLocalStorage(key: string, item: StorageItem): Promise<boolean> {
    try {
      const storageKey = this.localStoragePrefix + key;
      const serialized = JSON.stringify(item);
      
      // Vérifier la taille
      if (serialized.length > this.maxLocalStorageSize) {
        console.warn('⚠️ Item trop grand pour localStorage, utilisation de la mémoire');
        return await this.setInMemory(key, item);
      }

      localStorage.setItem(storageKey, serialized);
      return true;
    } catch (error) {
      console.error('❌ Erreur localStorage set:', error);
      return false;
    }
  }

  private async getFromLocalStorage<T>(key: string): Promise<StorageItem<T> | null> {
    try {
      const storageKey = this.localStoragePrefix + key;
      const serialized = localStorage.getItem(storageKey);
      return serialized ? JSON.parse(serialized) : null;
    } catch (error) {
      console.error('❌ Erreur localStorage get:', error);
      return null;
    }
  }

  private async deleteFromLocalStorage(key: string): Promise<boolean> {
    try {
      const storageKey = this.localStoragePrefix + key;
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error('❌ Erreur localStorage delete:', error);
      return false;
    }
  }

  private async clearLocalStorage(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.localStoragePrefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('❌ Erreur localStorage clear:', error);
    }
  }

  /**
   * Stockage en mémoire
   */
  private async setInMemory(key: string, item: StorageItem): Promise<boolean> {
    try {
      // Vérifier la taille disponible
      if (this.getMemoryUsage() > this.maxMemorySize) {
        await this.cleanupMemory();
      }

      this.memoryStorage.set(key, item);
      return true;
    } catch (error) {
      console.error('❌ Erreur mémoire set:', error);
      return false;
    }
  }

  private async getFromMemory<T>(key: string): Promise<StorageItem<T> | null> {
    try {
      const item = this.memoryStorage.get(key);
      return item ? item as StorageItem<T> : null;
    } catch (error) {
      console.error('❌ Erreur mémoire get:', error);
      return null;
    }
  }

  private async deleteFromMemory(key: string): Promise<boolean> {
    try {
      return this.memoryStorage.delete(key);
    } catch (error) {
      console.error('❌ Erreur mémoire delete:', error);
      return false;
    }
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Vérifie si IndexedDB est disponible
   */
  private async isIndexedDBAvailable(): Promise<boolean> {
    return safariCompatibility.isFeatureSupported('supportsIndexedDB');
  }

  /**
   * Vérifie si localStorage est disponible
   */
  private async isLocalStorageAvailable(): Promise<boolean> {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ouvre la base de données IndexedDB
   */
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BazarKELYStorage', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage');
        }
      };
    });
  }

  /**
   * Compresse une valeur
   */
  private async compress(value: any): Promise<string> {
    // Implémentation simple de compression (peut être améliorée avec des libs)
    const serialized = JSON.stringify(value);
    return btoa(serialized); // Base64 encoding simple
  }

  /**
   * Décompresse une valeur
   */
  private async decompress(value: string): Promise<any> {
    try {
      const decompressed = atob(value);
      return JSON.parse(decompressed);
    } catch {
      return value; // Retourner la valeur originale si la décompression échoue
    }
  }

  /**
   * Chiffre une valeur
   */
  private async encrypt(value: string): Promise<string> {
    // Implémentation simple de chiffrement (peut être améliorée)
    return btoa(value); // Base64 encoding simple
  }

  /**
   * Déchiffre une valeur
   */
  private async decrypt(value: string): Promise<string> {
    try {
      return atob(value);
    } catch {
      return value; // Retourner la valeur originale si le déchiffrement échoue
    }
  }

  /**
   * Calcule la taille d'un item
   */
  private getItemSize(item: StorageItem): number {
    return JSON.stringify(item).length;
  }

  /**
   * Obtient l'utilisation mémoire actuelle
   */
  private getMemoryUsage(): number {
    let totalSize = 0;
    for (const item of this.memoryStorage.values()) {
      totalSize += this.getItemSize(item);
    }
    return totalSize;
  }

  /**
   * Nettoie la mémoire en supprimant les anciens items
   */
  private async cleanupMemory(): Promise<void> {
    const items = Array.from(this.memoryStorage.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Supprimer les 25% les plus anciens
    const itemsToRemove = Math.floor(items.length * 0.25);
    for (let i = 0; i < itemsToRemove; i++) {
      this.memoryStorage.delete(items[i][0]);
    }

    console.log(`🧹 Nettoyage mémoire: ${itemsToRemove} items supprimés`);
  }

  /**
   * Obtient les statistiques localStorage
   */
  private async getLocalStorageStats(): Promise<StorageStats> {
    const stats: StorageStats = {
      totalItems: 0,
      totalSize: 0,
      availableSpace: 0,
      compressionRatio: 1.0,
      oldestItem: Date.now(),
      newestItem: 0
    };

    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.localStoragePrefix)) {
          const item = localStorage.getItem(key);
          if (item) {
            stats.totalItems++;
            stats.totalSize += item.length;
            const parsed = JSON.parse(item);
            stats.oldestItem = Math.min(stats.oldestItem, parsed.timestamp);
            stats.newestItem = Math.max(stats.newestItem, parsed.timestamp);
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur calcul stats localStorage:', error);
    }

    return stats;
  }
}

// Instance singleton
export const safariStorageFallback = new SafariStorageFallback();











