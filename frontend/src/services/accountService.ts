/**
 * Service de comptes pour BazarKELY avec pattern offline-first
 * Utilise IndexedDB comme source primaire et Supabase pour la synchronisation
 */

import type { Account } from '../types';
import type { Account as SupabaseAccount, AccountInsert, AccountUpdate } from '../types/supabase';
import type { SyncOperation, SyncPriority } from '../types';
import { SYNC_PRIORITY } from '../types';
import { db } from '../lib/database';
import { supabase, withTimeout } from '../lib/supabase';
import apiService from './apiService';

// Timeout par défaut pour les appels Supabase dans les services métier
// Cohérent avec authService et App.tsx (5s)
const SUPABASE_TIMEOUT_MS = 5000;
import { convertAmount } from './exchangeRateService';

class AccountService {
  /**
   * Récupérer l'ID de l'utilisateur actuel
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        return session.user.id;
      }
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error);
      return null;
    }
  }

  /**
   * Queue a sync operation for offline-first processing
   * PWA Phase 3 - Now supports priority, syncTag, expiresAt
   */
  private async queueSyncOperation(
    userId: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    accountId: string,
    data: any,
    options?: {
      priority?: SyncPriority;
      syncTag?: string;
      expiresAt?: Date | null;
    }
  ): Promise<void> {
    try {
      const syncOp: SyncOperation = {
        id: crypto.randomUUID(),
        userId,
        operation,
        table_name: 'accounts',
        data: { id: accountId, ...data },
        timestamp: new Date(),
        retryCount: 0,
        status: 'pending',
        // PWA Phase 3 - New optional fields
        priority: options?.priority ?? SYNC_PRIORITY.NORMAL,
        syncTag: options?.syncTag ?? 'bazarkely-sync',
        expiresAt: options?.expiresAt ?? null,
      };
      await db.syncQueue.add(syncOp);
      console.log(`📦 [AccountService] Queued ${operation} operation for account ${accountId} with priority ${syncOp.priority}`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout à la queue de synchronisation:', error);
      // Ne pas faire échouer l'opération principale si la queue échoue
    }
  }

  /**
   * Convertir un compte Supabase (snake_case) vers Account (camelCase)
   */
  private mapSupabaseToAccount(supabaseAccount: any): Account {
    return {
      id: supabaseAccount.id,
      userId: supabaseAccount.user_id,
      name: supabaseAccount.name,
      type: supabaseAccount.type,
      balance: supabaseAccount.balance,
      currency: supabaseAccount.currency || null, // Support multi-currency: NULL means no preferred currency
      isDefault: supabaseAccount.is_default,
      displayOrder: supabaseAccount.display_order ?? undefined,
      createdAt: new Date(supabaseAccount.created_at)
    };
  }

  /**
   * Récupérer tous les comptes (OFFLINE-FIRST PATTERN)
   * 1. Essaie IndexedDB d'abord (toujours disponible)
   * 2. Si IndexedDB vide et online, fetch depuis Supabase
   * 3. Cache les résultats Supabase dans IndexedDB
   */
  async getAccounts(): Promise<Account[]> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        console.warn('⚠️ Utilisateur non authentifié, retour des comptes IndexedDB uniquement');
        // Retourner les comptes IndexedDB même sans userId (pour compatibilité)
        const localAccounts = await db.accounts.toArray();
        return localAccounts;
      }

      // STEP 1: Essayer IndexedDB d'abord (offline-first)
      console.log('💾 Récupération des comptes depuis IndexedDB...');
      const localAccounts = await db.accounts
        .where('userId')
        .equals(userId)
        .toArray();

      if (localAccounts.length > 0) {
        console.log(`✅ ${localAccounts.length} compte(s) récupéré(s) depuis IndexedDB`);
        return localAccounts;
      }

      // STEP 2: IndexedDB vide, essayer Supabase si online
      if (!navigator.onLine) {
        console.warn('⚠️ Mode offline et IndexedDB vide, retour d\'un tableau vide');
        return [];
      }

      console.log('🌐 IndexedDB vide, récupération depuis Supabase...');
      const response = await withTimeout(
        apiService.getAccounts(),
        SUPABASE_TIMEOUT_MS,
        'accountService.getAccounts'
      );
      if (!response.success || response.error) {
        console.error('❌ Erreur lors de la récupération des comptes depuis Supabase:', response.error);
        return [];
      }

      // STEP 3: Mapper et sauvegarder dans IndexedDB
      const supabaseAccounts = (response.data as any[]) || [];
      const accounts: Account[] = supabaseAccounts.map((supabaseAccount: any) =>
        this.mapSupabaseToAccount(supabaseAccount)
      );

      if (accounts.length > 0) {
        // Sauvegarder dans IndexedDB pour la prochaine fois
        try {
          await db.accounts.bulkPut(accounts);
          console.log(`💾 ${accounts.length} compte(s) sauvegardé(s) dans IndexedDB`);
        } catch (idbError) {
          console.error('❌ Erreur lors de la sauvegarde dans IndexedDB:', idbError);
          // Continuer même si la sauvegarde échoue
        }
      }

      console.log(`✅ ${accounts.length} compte(s) récupéré(s) depuis Supabase`);
      return accounts;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des comptes:', error);
      // En cas d'erreur, essayer de retourner IndexedDB
      try {
        const userId = await this.getCurrentUserId();
        if (userId) {
          const localAccounts = await db.accounts
            .where('userId')
            .equals(userId)
            .toArray();
          if (localAccounts.length > 0) {
            console.log(`⚠️ Retour de ${localAccounts.length} compte(s) depuis IndexedDB après erreur`);
            return localAccounts;
          }
        }
      } catch (fallbackError) {
        console.error('❌ Erreur lors du fallback IndexedDB:', fallbackError);
      }
      return [];
    }
  }

  async getUserAccounts(_userId: string): Promise<Account[]> {
    try {
      const accounts = await this.getAccounts();
      // Sort by displayOrder ASC, then by createdAt DESC for accounts without displayOrder
      return accounts.sort((a, b) => {
        const aOrder = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        // If same displayOrder or both null, sort by createdAt DESC
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des comptes utilisateur:', error);
      return [];
    }
  }

  /**
   * Récupérer un compte par ID
   */
  async getAccount(id: string, _userId?: string): Promise<Account | null> {
    try {
      // Pour l'instant, on récupère tous les comptes et on filtre
      const accounts = await this.getAccounts();
      return accounts.find(account => account.id === id) || null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du compte:', error);
      return null;
    }
  }

  /**
   * Créer un nouveau compte (OFFLINE-FIRST PATTERN)
   * 1. Génère un UUID si non fourni
   * 2. Sauvegarde dans IndexedDB immédiatement
   * 3. Si online, sync vers Supabase
   * 4. Si offline ou échec, queue pour sync ultérieure
   */
  async createAccount(userId: string, accountData: Omit<Account, 'id' | 'createdAt' | 'userId'>): Promise<Account | null> {
    try {
      // Générer un UUID pour le compte
      const accountId = crypto.randomUUID();
      const now = new Date();

      // Créer l'objet Account complet
      // Support multi-currency: currency is optional (NULL means no preferred currency)
      const account: Account = {
        id: accountId,
        userId,
        name: accountData.name,
        type: accountData.type,
        balance: accountData.balance,
        currency: accountData.currency ?? null, // Default to null for multi-currency support
        isDefault: accountData.isDefault ?? false,
        displayOrder: accountData.displayOrder,
        createdAt: now
      };

      // STEP 1: Sauvegarder dans IndexedDB immédiatement (offline-first)
      console.log('💾 Sauvegarde du compte dans IndexedDB...');
      await db.accounts.add(account);
      console.log(`✅ Compte "${account.name}" sauvegardé dans IndexedDB avec ID: ${accountId}`);

      // STEP 2: Si online, essayer de sync vers Supabase
      if (navigator.onLine) {
        try {
          console.log('🌐 Synchronisation du compte vers Supabase...');
          const supabaseData: AccountInsert = {
            name: accountData.name,
            type: accountData.type,
            balance: accountData.balance,
            currency: accountData.currency ?? null, // Support multi-currency: NULL means no preferred currency
            is_default: accountData.isDefault ?? false,
            is_active: (accountData as any).isActive ?? true // isActive existe dans Supabase mais pas dans le type Account local
          };
          if (accountData.displayOrder !== undefined) {
            (supabaseData as any).display_order = accountData.displayOrder;
          }

          const response = await withTimeout(
            apiService.createAccount(supabaseData),
            SUPABASE_TIMEOUT_MS,
            'accountService.createAccount'
          );
          if (response.success && response.data) {
            // Mettre à jour IndexedDB avec l'ID du serveur si différent
            const supabaseAccount = response.data as any;
            if (supabaseAccount.id !== accountId) {
              // Si Supabase génère un ID différent, mettre à jour IndexedDB
              await db.accounts.delete(accountId);
              const syncedAccount = this.mapSupabaseToAccount(supabaseAccount);
              await db.accounts.add(syncedAccount);
              console.log(`🔄 ID du compte mis à jour: ${accountId} → ${syncedAccount.id}`);
              return syncedAccount;
            }
            console.log('✅ Compte synchronisé avec Supabase');
            return account;
          } else {
            console.warn('⚠️ Échec de la synchronisation Supabase, ajout à la queue');
            // Queue pour sync ultérieure
            await this.queueSyncOperation(userId, 'CREATE', accountId, accountData);
            return account;
          }
        } catch (syncError) {
          console.error('❌ Erreur lors de la synchronisation Supabase:', syncError);
          // Queue pour sync ultérieure
          await this.queueSyncOperation(userId, 'CREATE', accountId, accountData);
          return account;
        }
      } else {
        // Mode offline, queue pour sync ultérieure
        console.log('📦 Mode offline, ajout à la queue de synchronisation');
        await this.queueSyncOperation(userId, 'CREATE', accountId, accountData);
        return account;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création du compte:', error);
      return null;
    }
  }

  /**
   * Mettre à jour un compte (OFFLINE-FIRST PATTERN)
   * 1. Met à jour IndexedDB immédiatement
   * 2. Si online, sync vers Supabase
   * 3. Si offline, queue pour sync ultérieure
   */
  async updateAccount(id: string, userId: string, accountData: Partial<Omit<Account, 'id' | 'createdAt' | 'userId'>>): Promise<Account | null> {
    try {
      // STEP 1: Récupérer le compte depuis IndexedDB
      const existingAccount = await db.accounts.get(id);
      if (!existingAccount) {
        console.error(`❌ Compte ${id} non trouvé dans IndexedDB`);
        // Essayer de récupérer depuis Supabase si online
        if (navigator.onLine) {
          const accounts = await this.getAccounts();
          const account = accounts.find(a => a.id === id);
          if (account) {
            // Mettre à jour avec les nouvelles données
            const updatedAccount = { ...account, ...accountData };
            await db.accounts.put(updatedAccount);
            return updatedAccount;
          }
        }
        return null;
      }

      // STEP 2: Mettre à jour IndexedDB immédiatement
      const updatedAccount: Account = {
        ...existingAccount,
        ...accountData
      };
      console.log('💾 Mise à jour du compte dans IndexedDB...');
      await db.accounts.put(updatedAccount);
      console.log(`✅ Compte "${updatedAccount.name}" mis à jour dans IndexedDB`);

      // STEP 3: Si online, essayer de sync vers Supabase
      if (navigator.onLine) {
        try {
          console.log('🌐 Synchronisation de la mise à jour vers Supabase...');
          const supabaseData: AccountUpdate = {};
          if (accountData.name !== undefined) supabaseData.name = accountData.name;
          if (accountData.type !== undefined) supabaseData.type = accountData.type;
          if (accountData.balance !== undefined) supabaseData.balance = accountData.balance;
          // Support multi-currency: allow setting currency to null explicitly
          if (accountData.currency !== undefined) {
            supabaseData.currency = accountData.currency ?? null;
          }
          if (accountData.isDefault !== undefined) supabaseData.is_default = accountData.isDefault;
          // isActive existe dans Supabase mais pas dans le type Account local
          if ((accountData as any).isActive !== undefined) supabaseData.is_active = (accountData as any).isActive;
          if (accountData.displayOrder !== undefined) supabaseData.display_order = accountData.displayOrder;

          const response = await withTimeout(
            apiService.updateAccount(id, supabaseData),
            SUPABASE_TIMEOUT_MS,
            'accountService.updateAccount'
          );
          if (response.success && response.data) {
            // Mettre à jour IndexedDB avec les données Supabase (pour synchronisation)
            const supabaseAccount = this.mapSupabaseToAccount(response.data as any);
            await db.accounts.put(supabaseAccount);
            console.log('✅ Compte synchronisé avec Supabase');
            return supabaseAccount;
          } else {
            // Supabase retourne 0 lignes (RLS policy ou ligne manquante)
            // Ne pas bloquer - l'update IndexedDB a réussi, continuer avec le compte local
            console.warn('⚠️ Échec de la synchronisation Supabase (RLS ou ligne manquante), utilisation du compte IndexedDB');
            await this.queueSyncOperation(userId, 'UPDATE', id, accountData);
            return updatedAccount;
          }
        } catch (syncError) {
          // Erreur Supabase ne doit pas bloquer - l'update IndexedDB a réussi
          console.warn('⚠️ Erreur lors de la synchronisation Supabase (non-bloquant):', syncError);
          await this.queueSyncOperation(userId, 'UPDATE', id, accountData);
          return updatedAccount;
        }
      } else {
        // Mode offline, queue pour sync ultérieure
        console.log('📦 Mode offline, ajout à la queue de synchronisation');
        await this.queueSyncOperation(userId, 'UPDATE', id, accountData);
        return updatedAccount;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du compte:', error);
      return null;
    }
  }

  /**
   * Mettre à jour l'ordre des comptes pour le drag-and-drop
   * @param userId - ID de l'utilisateur
   * @param orderedAccountIds - Tableau d'IDs de comptes dans l'ordre souhaité
   * @returns true si la mise à jour réussit, false sinon
   */
  async updateAccountsOrder(userId: string, orderedAccountIds: string[]): Promise<boolean> {
    try {
      console.log('🔄 Updating accounts order for user:', userId);
      
      // Mettre à jour chaque compte avec son nouvel ordre (index + 1)
      const updatePromises = orderedAccountIds.map(async (accountId, index) => {
        const displayOrder = index + 1;
        try {
          const result = await this.updateAccount(accountId, userId, { displayOrder });
          if (!result) {
            console.error(`❌ Failed to update order for account ${accountId}`);
            return false;
          }
          return true;
        } catch (error) {
          console.error(`❌ Error updating order for account ${accountId}:`, error);
          return false;
        }
      });

      const results = await Promise.all(updatePromises);
      const allSuccess = results.every(result => result === true);

      if (allSuccess) {
        console.log('✅ Accounts order updated successfully');
        return true;
      } else {
        console.error('❌ Some accounts failed to update order');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de l\'ordre des comptes:', error);
      return false;
    }
  }

  /**
   * Supprimer un compte (OFFLINE-FIRST PATTERN)
   * 1. Supprime de IndexedDB immédiatement
   * 2. Si online, sync suppression vers Supabase
   * 3. Si offline, queue pour sync ultérieure
   */
  async deleteAccount(id: string, userId?: string): Promise<boolean> {
    try {
      // STEP 1: Récupérer le userId si non fourni
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) {
        console.error('❌ Utilisateur non authentifié');
        return false;
      }

      // STEP 2: Récupérer le compte depuis IndexedDB pour la queue
      const account = await db.accounts.get(id);
      if (!account) {
        console.warn(`⚠️ Compte ${id} non trouvé dans IndexedDB`);
        // Essayer quand même de supprimer depuis Supabase si online
        if (navigator.onLine) {
          try {
            const response = await withTimeout(
              apiService.deleteAccount(id),
              SUPABASE_TIMEOUT_MS,
              'accountService.deleteAccount/orphan'
            );
            return response.success;
          } catch (error) {
            console.warn('⚠️ Échec/timeout suppression Supabase (orphan):', error);
            return false;
          }
        }
        return false;
      }

      // STEP 3: Supprimer de IndexedDB immédiatement
      console.log('💾 Suppression du compte depuis IndexedDB...');
      await db.accounts.delete(id);
      console.log(`✅ Compte "${account.name}" supprimé de IndexedDB`);

      // STEP 4: Si online, essayer de sync vers Supabase
      if (navigator.onLine) {
        try {
          console.log('🌐 Synchronisation de la suppression vers Supabase...');
          const response = await withTimeout(
            apiService.deleteAccount(id),
            SUPABASE_TIMEOUT_MS,
            'accountService.deleteAccount'
          );
          if (response.success) {
            console.log('✅ Suppression synchronisée avec Supabase');
            return true;
          } else {
            console.warn('⚠️ Échec de la synchronisation Supabase, ajout à la queue');
            await this.queueSyncOperation(currentUserId, 'DELETE', id, {});
            return true; // Retourner true car supprimé de IndexedDB
          }
        } catch (syncError) {
          console.error('❌ Erreur lors de la synchronisation Supabase:', syncError);
          await this.queueSyncOperation(currentUserId, 'DELETE', id, {});
          return true; // Retourner true car supprimé de IndexedDB
        }
      } else {
        // Mode offline, queue pour sync ultérieure
        console.log('📦 Mode offline, ajout à la queue de synchronisation');
        await this.queueSyncOperation(currentUserId, 'DELETE', id, {});
        return true; // Retourner true car supprimé de IndexedDB
      }
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du compte:', error);
      return false;
    }
  }

  /**
   * Définir un compte comme par défaut
   */
  async setDefaultAccount(accountId: string, userId?: string): Promise<boolean> {
    try {
      // D'abord, retirer le statut par défaut de tous les comptes
      const accounts = await this.getAccounts();
      for (const account of accounts) {
        if (account.isDefault) {
          await this.updateAccount(account.id, userId || '', { isDefault: false });
        }
      }

      // Ensuite, définir le compte sélectionné comme par défaut
      const success = await this.updateAccount(accountId, userId || '', { isDefault: true });
      
      if (success) {
        console.log('✅ Compte défini comme par défaut');
        return true;
      }
      
      return !!success;
    } catch (error) {
      console.error('❌ Erreur lors de la définition du compte par défaut:', error);
      return false;
    }
  }

  /**
   * Obtenir le compte par défaut
   */
  async getDefaultAccount(): Promise<Account | null> {
    try {
      const accounts = await this.getAccounts();
      return accounts.find(account => account.isDefault) || null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du compte par défaut:', error);
      return null;
    }
  }

  /**
   * Obtenir les comptes par type
   */
  async getAccountsByType(type: string): Promise<Account[]> {
    try {
      const accounts = await this.getAccounts();
      return accounts.filter(account => account.type === type);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des comptes par type:', error);
      return [];
    }
  }

  /**
   * Calculer le solde total
   * Note: Pour un total avec conversion, utiliser getTotalBalanceInCurrency()
   */
  async getTotalBalance(): Promise<number> {
    try {
      const accounts = await this.getAccounts();
      return accounts.reduce((total, account) => total + account.balance, 0);
    } catch (error) {
      console.error('❌ Erreur lors du calcul du solde total:', error);
      return 0;
    }
  }

  /**
   * Initialiser et nettoyer les comptes
   */
  async initializeAndCleanup(): Promise<void> {
    try {
      console.log('🔍 Initialisation des comptes...');
      
      // Vérifier s'il y a un compte Espèces par défaut
      const especesAccounts = await this.getAccountsByType('especes');
      
      if (especesAccounts.length === 0) {
        // Créer un compte Espèces par défaut
        await this.createAccount('', {
          name: 'Espèces',
          type: 'especes',
          balance: 0,
          isDefault: true,
          currency: 'MGA' as const
        });
        console.log('✅ Compte Espèces par défaut créé');
      } else if (!especesAccounts.some(acc => acc.isDefault)) {
        // S'assurer qu'un compte Espèces est marqué comme par défaut
        await this.setDefaultAccount(especesAccounts[0].id);
        console.log('✅ Compte Espèces marqué comme par défaut');
      } else {
        console.log('ℹ️ Compte Espèces par défaut déjà existant');
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des comptes:', error);
    }
  }
}

const accountService = new AccountService();

/**
 * Calcule le solde total de tous les comptes, converti dans la devise cible
 * @param targetCurrency - Devise cible ('MGA' ou 'EUR')
 * @returns Solde total dans la devise cible
 */
export async function getTotalBalanceInCurrency(targetCurrency: 'MGA' | 'EUR' = 'MGA'): Promise<number> {
  try {
    const accounts = await accountService.getAccounts();
    let total = 0;
    
    for (const account of accounts) {
      // Support multi-currency: if account has no preferred currency, assume MGA
      const accountCurrency = account.currency || 'MGA';
      
      if (accountCurrency === targetCurrency) {
        // Même devise, pas de conversion
        total += account.balance;
      } else {
        // Conversion nécessaire
        const converted = await convertAmount(
          account.balance,
          accountCurrency,
          targetCurrency
        );
        total += converted;
      }
    }
    
    // Arrondir selon la devise
    return targetCurrency === 'MGA' ? Math.round(total) : Math.round(total * 100) / 100;
  } catch (error) {
    console.error('Error calculating total balance:', error);
    return 0;
  }
}

export default accountService;