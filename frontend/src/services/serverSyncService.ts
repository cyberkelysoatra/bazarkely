/**
 * Service de synchronisation serveur-first pour BazarKELY
 * Garantit la cohérence des données entre tous les navigateurs
 */

import { db } from '../lib/database';

export interface SyncData {
  users: any[];
  accounts: any[];
  transactions: any[];
  budgets: any[];
  goals: any[];
  feeConfigurations: any[];
}

export interface SyncResult {
  success: boolean;
  data?: SyncData;
  error?: string;
  lastSync?: string;
}

class ServerSyncService {
  // Note: Now using Supabase directly instead of PHP API
  private readonly SYNC_INTERVAL = 30 * 1000; // 30 secondes
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private lastSyncTime: string | null = null;

  constructor() {
    this.startAutoSync();
  }

  /**
   * Démarrer la synchronisation automatique
   */
  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      await this.syncFromServer();
    }, this.SYNC_INTERVAL);

    console.log('🔄 Synchronisation automatique démarrée (intervalle: 30 secondes)');
  }

  /**
   * Arrêter la synchronisation automatique
   */
  public stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    console.log('⏹️ Synchronisation automatique arrêtée');
  }

  /**
   * Vérifier la disponibilité du serveur
   */
  public async isServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.log('🔍 Serveur non accessible:', error instanceof Error ? error.message : 'Erreur inconnue');
      return false;
    }
  }

  /**
   * Synchroniser les données depuis le serveur
   */
  public async syncFromServer(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('⏳ Synchronisation déjà en cours...');
      return { success: false, error: 'Synchronisation déjà en cours' };
    }

    try {
      this.isSyncing = true;
      console.log('🔄 Synchronisation depuis le serveur...');

      const currentUser = JSON.parse(localStorage.getItem('bazarkely-user') || '{}');
      if (!currentUser.username) {
        console.log('⚠️ Aucun utilisateur connecté pour la synchronisation');
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      // Vérifier la disponibilité du serveur
      const isServerAvailable = await this.isServerAvailable();
      if (!isServerAvailable) {
        console.log('⚠️ Serveur non disponible, synchronisation locale uniquement');
        return { success: false, error: 'Serveur non disponible' };
      }

      // Récupérer les données depuis le serveur
      const response = await fetch(`${this.API_BASE_URL}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_user_data',
          username: currentUser.username,
          lastSync: this.lastSyncTime
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status} ${response.statusText}`);
      }

      const serverData: SyncData = await response.json();
      
      // Synchroniser les données dans IndexedDB
      await this.syncDataToLocal(serverData);
      
      this.lastSyncTime = new Date().toISOString();
      console.log('✅ Synchronisation depuis le serveur réussie');
      
      return {
        success: true,
        data: serverData,
        lastSync: this.lastSyncTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur lors de la synchronisation:', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Synchroniser les données vers le serveur
   */
  public async syncToServer(): Promise<SyncResult> {
    try {
      console.log('🔄 Synchronisation vers le serveur...');

      const currentUser = JSON.parse(localStorage.getItem('bazarkely-user') || '{}');
      if (!currentUser.username) {
        console.log('⚠️ Aucun utilisateur connecté pour la synchronisation');
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      // Vérifier la disponibilité du serveur
      const isServerAvailable = await this.isServerAvailable();
      if (!isServerAvailable) {
        console.log('⚠️ Serveur non disponible, synchronisation locale uniquement');
        return { success: false, error: 'Serveur non disponible' };
      }

      // Récupérer les données locales
      const localData: SyncData = {
        users: await db.users.toArray(),
        accounts: await db.accounts.toArray(),
        transactions: await db.transactions.toArray(),
        budgets: await db.budgets.toArray(),
        goals: await db.goals.toArray(),
        feeConfigurations: await db.feeConfigurations.toArray()
      };

      // Envoyer les données au serveur
      const response = await fetch(`${this.API_BASE_URL}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'save_user_data',
          username: currentUser.username,
          data: localData,
          lastSync: this.lastSyncTime
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status} ${response.statusText}`);
      }

      this.lastSyncTime = new Date().toISOString();
      console.log('✅ Synchronisation vers le serveur réussie');
      
      return {
        success: true,
        data: localData,
        lastSync: this.lastSyncTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur lors de la synchronisation vers le serveur:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Synchroniser les données du serveur vers IndexedDB local
   */
  private async syncDataToLocal(serverData: SyncData): Promise<void> {
    try {
      console.log('🔄 Synchronisation des données vers IndexedDB local...');

      // Synchroniser les utilisateurs
      if (serverData.users && serverData.users.length > 0) {
        await db.users.clear();
        await db.users.bulkAdd(serverData.users);
        console.log(`✅ ${serverData.users.length} utilisateurs synchronisés`);
      }

      // Synchroniser les comptes
      if (serverData.accounts && serverData.accounts.length > 0) {
        await db.accounts.clear();
        await db.accounts.bulkAdd(serverData.accounts);
        console.log(`✅ ${serverData.accounts.length} comptes synchronisés`);
      }

      // Synchroniser les transactions
      if (serverData.transactions && serverData.transactions.length > 0) {
        await db.transactions.clear();
        await db.transactions.bulkAdd(serverData.transactions);
        console.log(`✅ ${serverData.transactions.length} transactions synchronisées`);
      }

      // Synchroniser les budgets
      if (serverData.budgets && serverData.budgets.length > 0) {
        await db.budgets.clear();
        await db.budgets.bulkAdd(serverData.budgets);
        console.log(`✅ ${serverData.budgets.length} budgets synchronisés`);
      }

      // Synchroniser les objectifs
      if (serverData.goals && serverData.goals.length > 0) {
        await db.goals.clear();
        await db.goals.bulkAdd(serverData.goals);
        console.log(`✅ ${serverData.goals.length} objectifs synchronisés`);
      }

      // Synchroniser les configurations de frais
      if (serverData.feeConfigurations && serverData.feeConfigurations.length > 0) {
        await db.feeConfigurations.clear();
        await db.feeConfigurations.bulkAdd(serverData.feeConfigurations);
        console.log(`✅ ${serverData.feeConfigurations.length} configurations de frais synchronisées`);
      }

      console.log('✅ Synchronisation vers IndexedDB local terminée');

    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation vers IndexedDB local:', error);
      throw error;
    }
  }

  /**
   * Forcer la synchronisation immédiate
   */
  public async forceSync(): Promise<SyncResult> {
    console.log('🔄 Forçage de la synchronisation...');
    
    // Arrêter la synchronisation automatique temporairement
    this.stopAutoSync();
    
    try {
      // Synchroniser depuis le serveur
      const syncResult = await this.syncFromServer();
      
      if (syncResult.success) {
        // Redémarrer la synchronisation automatique
        this.startAutoSync();
        return syncResult;
      } else {
        // En cas d'échec, essayer de synchroniser vers le serveur
        const uploadResult = await this.syncToServer();
        this.startAutoSync();
        return uploadResult;
      }
    } catch (error) {
      this.startAutoSync();
      throw error;
    }
  }

  /**
   * Obtenir le statut de synchronisation
   */
  public getSyncStatus(): { isSyncing: boolean; lastSync: string | null } {
    return {
      isSyncing: this.isSyncing,
      lastSync: this.lastSyncTime
    };
  }

  /**
   * Nettoyer les ressources
   */
  public destroy(): void {
    this.stopAutoSync();
  }
}

export default new ServerSyncService();
