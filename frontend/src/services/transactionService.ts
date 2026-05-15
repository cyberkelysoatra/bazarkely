/**
 * Service de transactions pour BazarKELY avec pattern offline-first
 * Utilise IndexedDB comme source primaire et Supabase pour la synchronisation
 */

import apiService from './apiService';
import accountService from './accountService';
import { convertAmount, getExchangeRate } from './exchangeRateService';
import type { Transaction } from '../types/index.js';
import type { SyncOperation, SyncPriority } from '../types';
import { SYNC_PRIORITY } from '../types';
import { db } from '../lib/database';
import { supabase, withTimeout } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';

// Timeout par défaut pour les appels Supabase dans les services métier
// Cohérent avec authService et App.tsx (5s)
const SUPABASE_TIMEOUT_MS = 5000;
// TEMPORARY FIX: Comment out problematic import to unblock the app
// import notificationService from './notificationService';

// TEMPORARY: Mock notification service to unblock the app
// const notificationService = {
//   sendNotification: async (notification: any): Promise<boolean> => {
//     console.log('🔔 Notification temporarily disabled:', notification?.title || 'Unknown');
//     return false;
//   }
// };

class TransactionService {
  /**
   * Récupérer l'ID de l'utilisateur actuel — offline-safe.
   * Ordre : 1) useAppStore.user (Zustand, instantané, jamais réseau)
   *        2) supabase.auth.getSession() (lecture localStorage Supabase)
   *        3) null
   * Ne fait JAMAIS supabase.auth.getUser() (fetch réseau, throw en offline).
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const storeUser = useAppStore.getState().user;
      if (storeUser?.id) return storeUser.id;
    } catch {
      /* store pas encore initialisé */
    }
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) return data.session.user.id;
    } catch (error) {
      console.error('📱 [TransactionService] ❌ Erreur lors de la récupération de l\'utilisateur:', error);
    }
    return null;
  }

  /**
   * Queue a sync operation for offline-first processing
   * PWA Phase 3 - Now supports priority, syncTag, expiresAt
   */
  private async queueSyncOperation(
    userId: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    transactionId: string,
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
        table_name: 'transactions',
        data: { id: transactionId, ...data },
        timestamp: new Date(),
        retryCount: 0,
        status: 'pending',
        // PWA Phase 3 - New optional fields
        priority: options?.priority ?? SYNC_PRIORITY.NORMAL,
        syncTag: options?.syncTag ?? 'bazarkely-sync',
        expiresAt: options?.expiresAt ?? null,
      };
      await db.syncQueue.add(syncOp);
      console.log(`📱 [TransactionService] 📦 Opération ${operation} ajoutée à la queue de synchronisation pour la transaction ${transactionId} avec priorité ${syncOp.priority}`);
    } catch (error) {
      console.error('📱 [TransactionService] ❌ Erreur lors de l\'ajout à la queue de synchronisation:', error);
      // Ne pas faire échouer l'opération principale si la queue échoue
    }
  }

  /**
   * Convertir une transaction Supabase (snake_case) vers Transaction (camelCase)
   */
  private mapSupabaseToTransaction(supabaseTransaction: any): Transaction {
    return {
      id: supabaseTransaction.id,
      userId: supabaseTransaction.user_id,
      accountId: supabaseTransaction.account_id,
      type: supabaseTransaction.type,
      amount: supabaseTransaction.amount,
      description: supabaseTransaction.description,
      category: supabaseTransaction.category,
      date: new Date(supabaseTransaction.date),
      targetAccountId: supabaseTransaction.target_account_id || undefined,
      transferFee: supabaseTransaction.transfer_fee || undefined,
      originalCurrency: supabaseTransaction.original_currency || undefined,
      originalAmount: supabaseTransaction.original_amount || undefined,
      exchangeRateUsed: supabaseTransaction.exchange_rate_used || undefined,
      notes: supabaseTransaction.notes || undefined,
      createdAt: new Date(supabaseTransaction.created_at),
      // Champs de transfert de propriété
      currentOwnerId: supabaseTransaction.current_owner_id || supabaseTransaction.user_id,
      originalOwnerId: supabaseTransaction.original_owner_id || undefined,
      transferredAt: supabaseTransaction.transferred_at || undefined,
      // Champs de transaction récurrente
      isRecurring: supabaseTransaction.is_recurring || false,
      recurringTransactionId: supabaseTransaction.recurring_transaction_id || undefined,
    };
  }

  /**
   * Récupérer toutes les transactions (OFFLINE-FIRST avec STALE-WHILE-REVALIDATE)
   * 1. Lecture IndexedDB en premier — retour immédiat si données présentes
   * 2. En arrière-plan (fire-and-forget) si online : refresh depuis Supabase pour la prochaine lecture
   * 3. Si IndexedDB vide ET online : tenter Supabase synchrone avec timeout 5s (premier usage)
   * 4. Si IndexedDB vide ET offline (ou Supabase échoue) : retour tableau vide
   */
  async getTransactions(): Promise<Transaction[]> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        console.warn('📱 [TransactionService] ⚠️ Utilisateur non authentifié, retour des transactions IndexedDB uniquement');
        // Retourner les transactions IndexedDB même sans userId (pour compatibilité)
        const localTransactions = await db.transactions.toArray();
        return localTransactions;
      }

      // STEP 1: Lecture IndexedDB en premier (offline-first)
      console.log('📱 [TransactionService] 💾 Lecture des transactions depuis IndexedDB...');
      const localTransactions = await db.transactions
        .where('userId')
        .equals(userId)
        .toArray();

      // STEP 2: Si IndexedDB a des données → retour immédiat + refresh background (SWR)
      if (localTransactions.length > 0) {
        console.log(`📱 [TransactionService] ✅ ${localTransactions.length} transaction(s) depuis IndexedDB (retour immédiat)`);

        // Refresh Supabase en arrière-plan (fire-and-forget) si online
        if (navigator.onLine) {
          this.refreshTransactionsFromSupabase(userId).catch(err => {
            console.warn('📱 [TransactionService] ⚠️ Refresh background échoué (non bloquant):', err);
          });
        }

        return localTransactions;
      }

      // STEP 3: IndexedDB vide → tenter Supabase synchrone avec timeout (premier usage)
      if (!navigator.onLine) {
        console.warn('📱 [TransactionService] ⚠️ IndexedDB vide et offline → retour tableau vide');
        return [];
      }

      console.log('📱 [TransactionService] 🌐 IndexedDB vide → fetch Supabase synchrone (timeout 5s)...');
      try {
        const response = await withTimeout(
          apiService.getTransactions(),
          SUPABASE_TIMEOUT_MS,
          'transactionService.getTransactions/initial'
        );
        if (response.success && response.data) {
          const supabaseTransactions = (response.data as any[]) || [];
          const transactions: Transaction[] = supabaseTransactions.map((t: any) =>
            this.mapSupabaseToTransaction(t)
          );
          if (transactions.length > 0) {
            try {
              await db.transactions.bulkPut(transactions);
              console.log(`📱 [TransactionService] 💾 ${transactions.length} transaction(s) cachée(s) dans IndexedDB`);
            } catch (idbError) {
              console.error('📱 [TransactionService] ❌ Erreur lors de la sauvegarde dans IndexedDB:', idbError);
            }
          }
          console.log(`📱 [TransactionService] ✅ ${transactions.length} transaction(s) depuis Supabase (premier fetch)`);
          return transactions;
        }
        console.warn('📱 [TransactionService] ⚠️ Réponse Supabase invalide:', response.error);
        return [];
      } catch (error) {
        console.warn('📱 [TransactionService] ⚠️ Échec Supabase (timeout ou erreur) → retour tableau vide:', error);
        return [];
      }
    } catch (error) {
      console.error('📱 [TransactionService] ❌ Erreur lors de la récupération des transactions:', error);
      // En cas d'erreur, essayer de retourner IndexedDB
      try {
        const userId = await this.getCurrentUserId();
        if (userId) {
          const localTransactions = await db.transactions
            .where('userId')
            .equals(userId)
            .toArray();
          if (localTransactions.length > 0) {
            console.log(`📱 [TransactionService] ⚠️ Retour de ${localTransactions.length} transaction(s) depuis IndexedDB après erreur`);
            return localTransactions;
          }
        }
      } catch (fallbackError) {
        console.error('📱 [TransactionService] ❌ Erreur lors du fallback IndexedDB:', fallbackError);
      }
      return [];
    }
  }

  /**
   * Refresh IndexedDB depuis Supabase en arrière-plan (fire-and-forget)
   * Appelé après un retour immédiat depuis IndexedDB pour garder le cache à jour.
   * Erreurs silencieuses (timeout/network) — l'UI a déjà affiché les données locales.
   */
  private async refreshTransactionsFromSupabase(userId: string): Promise<void> {
    try {
      const response = await withTimeout(
        apiService.getTransactions(),
        SUPABASE_TIMEOUT_MS,
        'transactionService.refreshTransactionsFromSupabase'
      );
      if (response.success && response.data) {
        const supabaseTransactions = (response.data as any[]) || [];
        const transactions: Transaction[] = supabaseTransactions
          .filter((t: any) => t.user_id === userId)
          .map((t: any) => this.mapSupabaseToTransaction(t));
        if (transactions.length > 0) {
          await db.transactions.bulkPut(transactions);
          console.log(`📱 [TransactionService] 🔄 IndexedDB rafraîchi avec ${transactions.length} transaction(s) depuis Supabase (background)`);
        }
      }
    } catch (error) {
      // Erreur silencieuse — l'utilisateur a déjà ses données locales
      console.warn('📱 [TransactionService] ⚠️ Refresh background échoué:', error);
    }
  }

  async getUserTransactions(_userId: string): Promise<Transaction[]> {
    return this.getTransactions();
  }

  /**
   * Récupérer les transactions transférées de l'utilisateur
   * Retourne les transactions où l'utilisateur était le propriétaire original
   * mais qui ont été transférées à un autre utilisateur
   * @param userId - ID de l'utilisateur (propriétaire original)
   * @returns Transactions transférées, triées par date de transfert décroissante
   */
  async getUserTransferredTransactions(userId: string): Promise<Transaction[]> {
    try {
      const response = await withTimeout(
        apiService.getTransferredTransactions(userId),
        SUPABASE_TIMEOUT_MS,
        'transactionService.getUserTransferredTransactions'
      );
      if (!response.success || response.error) {
        console.error('❌ Erreur lors de la récupération des transactions transférées:', response.error);
        return [];
      }
      
      // Transformer les données Supabase vers le format local
      const supabaseTransactions = response.data as any[];
      const transactions: Transaction[] = supabaseTransactions.map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        accountId: t.account_id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        category: t.category,
        date: new Date(t.date),
        targetAccountId: t.target_account_id,
        notes: t.notes || undefined,
        createdAt: new Date(t.created_at),
        // Champs de transfert de propriété
        currentOwnerId: t.current_owner_id,
        originalOwnerId: t.original_owner_id || undefined,
        transferredAt: t.transferred_at || undefined,
      }));
      
      return transactions;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des transactions transférées:', error);
      return [];
    }
  }

  /**
   * Récupérer une transaction par ID
   */
  async getTransaction(id: string, userId?: string): Promise<Transaction | null> {
    try {
      console.log('🔍 getTransaction called with ID:', id, 'userId:', userId);
      
      // Pour l'instant, on récupère toutes les transactions et on filtre
      const transactions = await this.getTransactions();
      console.log('🔍 All transactions loaded:', transactions.length);
      
      const transaction = transactions.find(t => t.id === id) || null;
      console.log('🔍 Found transaction:', transaction);
      
      // Vérifier que la transaction appartient à l'utilisateur si userId fourni
      if (userId && transaction && transaction.userId !== userId) {
        console.error('❌ Transaction does not belong to user:', transaction.userId, 'vs', userId);
        return null;
      }
      
      return transaction;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la transaction:', error);
      return null;
    }
  }

  /**
   * Trouver la transaction jumelle d'un transfert
   */
  async getPairedTransferTransaction(transaction: Transaction): Promise<Transaction | null> {
    try {
      if (transaction.type !== 'transfer' || !transaction.targetAccountId) {
        return null;
      }

      console.log('🔍 Looking for paired transfer transaction for:', transaction.id);
      console.log('🔍 Target account ID:', transaction.targetAccountId);
      
      const transactions = await this.getTransactions();
      const pairedTransaction = transactions.find(t => 
        t.type === 'transfer' && 
        t.targetAccountId === transaction.accountId &&
        t.accountId === transaction.targetAccountId &&
        Math.abs(t.amount) === Math.abs(transaction.amount) &&
        t.id !== transaction.id
      );
      
      console.log('🔍 Found paired transaction:', pairedTransaction);
      return pairedTransaction || null;
    } catch (error) {
      console.error('❌ Erreur lors de la recherche de la transaction jumelle:', error);
      return null;
    }
  }

  /**
   * Créer une nouvelle transaction (OFFLINE-FIRST PATTERN)
   * 1. Génère un UUID si non fourni
   * 2. Sauvegarde dans IndexedDB immédiatement
   * 3. Si online, sync vers Supabase
   * 4. Si offline ou échec, queue pour sync ultérieure
   */
  async createTransaction(userId: string, transactionData: Omit<Transaction, 'id' | 'createdAt' | 'userId'>): Promise<Transaction | null> {
    try {
      // Determine transaction currency from FORM TOGGLE (not /settings or account currency)
      // This is the currency the user selected in the transaction form
      const transactionCurrency = transactionData.originalCurrency || 'MGA';
      const transactionDate = transactionData.date?.toISOString().split('T')[0];
      
      console.log('🎯 [TransactionService] Creating transaction with currency from form toggle:', {
        originalCurrency: transactionCurrency,
        originalAmount: transactionData.amount,
        transactionDate: transactionDate,
        note: 'Currency comes from form toggle, not /settings or account currency'
      });
      
      // Get the account to check its currency
      const account = await accountService.getAccount(transactionData.accountId, userId);
      // Support multi-currency: if account has no preferred currency (null), don't convert
      // Only convert if account has a specific preferred currency AND it differs from transaction currency
      const accountCurrency = account?.currency;

      let amountToStore = transactionData.amount;
      let exchangeRateUsed: number | null = null;

      // If account has a preferred currency AND currencies differ, convert to account currency
      // If accountCurrency is null/undefined, account supports multi-currency - no conversion needed
      if (accountCurrency && transactionCurrency !== accountCurrency) {
        try {
          // Get exchange rate at TRANSACTION DATE (not current date)
          const rateInfo = await getExchangeRate(transactionCurrency, accountCurrency, transactionDate);
          exchangeRateUsed = rateInfo.rate;
          amountToStore = await convertAmount(transactionData.amount, transactionCurrency, accountCurrency, transactionDate);
          console.log(`📱 [TransactionService] 💱 Currency conversion at transaction date (${transactionDate}): ${transactionData.amount} ${transactionCurrency} = ${amountToStore} ${accountCurrency} (rate: ${exchangeRateUsed})`);
        } catch (conversionError) {
          console.error('📱 [TransactionService] ❌ Erreur lors de la conversion de devise:', conversionError);
          // En cas d'erreur, utiliser le montant original (dégradation gracieuse)
          exchangeRateUsed = null;
        }
      } else {
        console.log(`📱 [TransactionService] ✅ No conversion needed: form currency (${transactionCurrency}) matches account currency (${accountCurrency || 'multi-currency'})`);
      }

      // Générer un UUID pour la transaction
      const transactionId = crypto.randomUUID();
      const now = new Date();

      // Créer l'objet Transaction complet
      const transaction: Transaction = {
        id: transactionId,
        userId,
        accountId: transactionData.accountId,
        type: transactionData.type,
        amount: amountToStore,
        description: transactionData.description,
        category: transactionData.category,
        date: transactionData.date,
        targetAccountId: transactionData.targetAccountId,
        transferFee: transactionData.transferFee,
        // Multi-currency fields: stored from form toggle and transaction date
        originalCurrency: transactionCurrency, // From form toggle (not /settings)
        originalAmount: transactionData.amount, // What user typed
        exchangeRateUsed: exchangeRateUsed || undefined, // Rate at transaction date
        notes: transactionData.notes,
        createdAt: now,
        // Champs de transfert de propriété
        currentOwnerId: transactionData.currentOwnerId || userId,
        originalOwnerId: transactionData.originalOwnerId,
        transferredAt: transactionData.transferredAt,
        // Champs de transaction récurrente
        isRecurring: transactionData.isRecurring || false,
        recurringTransactionId: transactionData.recurringTransactionId,
      };
      
      console.log('💾 [TransactionService] Storing transaction with multi-currency fields:', {
        originalAmount: transaction.originalAmount,
        originalCurrency: transaction.originalCurrency,
        exchangeRateUsed: transaction.exchangeRateUsed,
        transactionDate: transactionDate,
        storedAmount: transaction.amount
      });

      // STEP 1: Sauvegarder dans IndexedDB immédiatement (offline-first)
      console.log('📱 [TransactionService] 💾 Sauvegarde de la transaction dans IndexedDB...');
      await db.transactions.add(transaction);
      console.log(`📱 [TransactionService] ✅ Transaction "${transaction.description}" sauvegardée dans IndexedDB avec ID: ${transactionId}`);

      // Mettre à jour le solde du compte (même en offline)
      try {
        await this.updateAccountBalanceAfterTransaction(transaction.accountId, transaction.amount, userId);
        console.log('📱 [TransactionService] ✅ Solde du compte mis à jour');
      } catch (balanceError) {
        console.error('📱 [TransactionService] ❌ Erreur lors de la mise à jour du solde:', balanceError);
        // Ne pas faire échouer la transaction pour une erreur de solde
      }

      // STEP 2: Si online, essayer de sync vers Supabase
      if (navigator.onLine) {
        try {
          console.log('📱 [TransactionService] 🌐 Synchronisation de la transaction vers Supabase...');
          // Transformer camelCase vers snake_case pour Supabase
          const supabaseData = {
            user_id: userId,
            account_id: transactionData.accountId,
            amount: amountToStore,
            type: transactionData.type,
            category: transactionData.category,
            description: transactionData.description,
            date: transactionData.date.toISOString(),
            target_account_id: transactionData.targetAccountId || null,
            transfer_fee: transactionData.transferFee || 0,
            tags: null,
            location: null,
            status: 'completed',
            notes: transactionData.notes || null,
            // Multi-currency fields
            original_currency: transactionCurrency,
            original_amount: transactionData.amount,
            exchange_rate_used: exchangeRateUsed,
            // Champs de transaction récurrente
            is_recurring: transactionData.isRecurring || false,
            recurring_transaction_id: transactionData.recurringTransactionId || null,
            // Champs de transfert de propriété
            current_owner_id: transactionData.currentOwnerId || userId,
            original_owner_id: transactionData.originalOwnerId || null,
            transferred_at: transactionData.transferredAt || null,
          };

          const response = await withTimeout(
            apiService.createTransaction(supabaseData),
            SUPABASE_TIMEOUT_MS,
            'transactionService.createTransaction'
          );
          if (response.success && response.data) {
            // Mettre à jour IndexedDB avec l'ID du serveur si différent
            const supabaseTransaction = response.data as any;
            if (supabaseTransaction.id !== transactionId) {
              // Si Supabase génère un ID différent, mettre à jour IndexedDB
              await db.transactions.delete(transactionId);
              const syncedTransaction = this.mapSupabaseToTransaction(supabaseTransaction);
              await db.transactions.add(syncedTransaction);
              console.log(`📱 [TransactionService] 🔄 ID de la transaction mis à jour: ${transactionId} → ${syncedTransaction.id}`);
              return syncedTransaction;
            }
            // Mettre à jour IndexedDB avec les données Supabase (pour synchronisation)
            const syncedTransaction = this.mapSupabaseToTransaction(supabaseTransaction);
            await db.transactions.put(syncedTransaction);
            console.log('📱 [TransactionService] ✅ Transaction synchronisée avec Supabase');
            return syncedTransaction;
          } else {
            console.warn('📱 [TransactionService] ⚠️ Échec de la synchronisation Supabase, ajout à la queue');
            // Queue pour sync ultérieure
            await this.queueSyncOperation(userId, 'CREATE', transactionId, supabaseData);
            return transaction;
          }
        } catch (syncError) {
          console.error('📱 [TransactionService] ❌ Erreur lors de la synchronisation Supabase:', syncError);
          // Queue pour sync ultérieure
          const supabaseData = {
            user_id: userId,
            account_id: transactionData.accountId,
            amount: amountToStore,
            type: transactionData.type,
            category: transactionData.category,
            description: transactionData.description,
            date: transactionData.date.toISOString(),
            target_account_id: transactionData.targetAccountId || null,
            transfer_fee: transactionData.transferFee || 0,
            notes: transactionData.notes || null,
            original_currency: transactionCurrency,
            original_amount: transactionData.amount,
            exchange_rate_used: exchangeRateUsed,
            is_recurring: transactionData.isRecurring || false,
            recurring_transaction_id: transactionData.recurringTransactionId || null,
            current_owner_id: transactionData.currentOwnerId || userId,
            original_owner_id: transactionData.originalOwnerId || null,
            transferred_at: transactionData.transferredAt || null,
          };
          await this.queueSyncOperation(userId, 'CREATE', transactionId, supabaseData);
          return transaction;
        }
      } else {
        // Mode offline, queue pour sync ultérieure
        console.log('📱 [TransactionService] 📦 Mode offline, ajout à la queue de synchronisation');
        const supabaseData = {
          user_id: userId,
          account_id: transactionData.accountId,
          amount: amountToStore,
          type: transactionData.type,
          category: transactionData.category,
          description: transactionData.description,
          date: transactionData.date.toISOString(),
          target_account_id: transactionData.targetAccountId || null,
          transfer_fee: transactionData.transferFee || 0,
          notes: transactionData.notes || null,
          original_currency: transactionCurrency,
          original_amount: transactionData.amount,
          exchange_rate_used: exchangeRateUsed,
          is_recurring: transactionData.isRecurring || false,
          recurring_transaction_id: transactionData.recurringTransactionId || null,
          current_owner_id: transactionData.currentOwnerId || userId,
          original_owner_id: transactionData.originalOwnerId || null,
          transferred_at: transactionData.transferredAt || null,
        };
        await this.queueSyncOperation(userId, 'CREATE', transactionId, supabaseData);
        return transaction;
      }
    } catch (error) {
      console.error('📱 [TransactionService] ❌ Erreur lors de la création de la transaction:', error);
      return null;
    }
  }

  /**
   * Mettre à jour une transaction (OFFLINE-FIRST PATTERN)
   * 1. Met à jour IndexedDB immédiatement
   * 2. Si online, sync vers Supabase
   * 3. Si offline, queue pour sync ultérieure
   */
  async updateTransaction(id: string, transactionData: Partial<Omit<Transaction, 'id' | 'createdAt' | 'userId'>>): Promise<Transaction | null> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        console.error('📱 [TransactionService] ❌ Utilisateur non authentifié');
        return null;
      }

      // STEP 1: Récupérer la transaction depuis IndexedDB
      const existingTransaction = await db.transactions.get(id);
      if (!existingTransaction) {
        console.error(`📱 [TransactionService] ❌ Transaction ${id} non trouvée dans IndexedDB`);
        // Essayer de récupérer depuis Supabase si online
        if (navigator.onLine) {
          const transactions = await this.getTransactions();
          const transaction = transactions.find(t => t.id === id);
          if (transaction) {
            // Mettre à jour avec les nouvelles données
            const updatedTransaction = { ...transaction, ...transactionData };
            await db.transactions.put(updatedTransaction);
            return updatedTransaction;
          }
        }
        return null;
      }

      // STEP 2: Mettre à jour IndexedDB immédiatement
      const updatedTransaction: Transaction = {
        ...existingTransaction,
        ...transactionData
      };
      console.log('📱 [TransactionService] 💾 Mise à jour de la transaction dans IndexedDB...');
      await db.transactions.put(updatedTransaction);
      console.log(`📱 [TransactionService] ✅ Transaction "${updatedTransaction.description}" mise à jour dans IndexedDB`);

      // STEP 3: Si online, essayer de sync vers Supabase
      if (navigator.onLine) {
        try {
          console.log('📱 [TransactionService] 🌐 Synchronisation de la mise à jour vers Supabase...');
          // Transformer camelCase vers snake_case pour Supabase
          const supabaseData: any = {};
          
          if (transactionData.accountId !== undefined) supabaseData.account_id = transactionData.accountId;
          if (transactionData.amount !== undefined) supabaseData.amount = transactionData.amount;
          if (transactionData.type !== undefined) supabaseData.type = transactionData.type;
          if (transactionData.category !== undefined) supabaseData.category = transactionData.category;
          if (transactionData.description !== undefined) supabaseData.description = transactionData.description;
          if (transactionData.date !== undefined) supabaseData.date = transactionData.date.toISOString();
          if (transactionData.targetAccountId !== undefined) supabaseData.target_account_id = transactionData.targetAccountId;
          if (transactionData.notes !== undefined) supabaseData.notes = transactionData.notes || null;
          if (transactionData.originalCurrency !== undefined) supabaseData.original_currency = transactionData.originalCurrency;
          if (transactionData.originalAmount !== undefined) supabaseData.original_amount = transactionData.originalAmount;
          if (transactionData.exchangeRateUsed !== undefined) supabaseData.exchange_rate_used = transactionData.exchangeRateUsed;
          if (transactionData.isRecurring !== undefined) supabaseData.is_recurring = transactionData.isRecurring;
          if (transactionData.recurringTransactionId !== undefined) supabaseData.recurring_transaction_id = transactionData.recurringTransactionId;
          if (transactionData.currentOwnerId !== undefined) supabaseData.current_owner_id = transactionData.currentOwnerId;
          if (transactionData.originalOwnerId !== undefined) supabaseData.original_owner_id = transactionData.originalOwnerId;
          if (transactionData.transferredAt !== undefined) supabaseData.transferred_at = transactionData.transferredAt;

          const response = await withTimeout(
            apiService.updateTransaction(id, supabaseData),
            SUPABASE_TIMEOUT_MS,
            'transactionService.updateTransaction'
          );
          if (response.success && response.data) {
            // Mettre à jour IndexedDB avec les données Supabase (pour synchronisation)
            const supabaseTransaction = this.mapSupabaseToTransaction(response.data as any);
            await db.transactions.put(supabaseTransaction);
            console.log('📱 [TransactionService] ✅ Transaction synchronisée avec Supabase');
            return supabaseTransaction;
          } else {
            console.warn('📱 [TransactionService] ⚠️ Échec de la synchronisation Supabase, ajout à la queue');
            await this.queueSyncOperation(userId, 'UPDATE', id, supabaseData);
            return updatedTransaction;
          }
        } catch (syncError) {
          console.error('📱 [TransactionService] ❌ Erreur lors de la synchronisation Supabase:', syncError);
          await this.queueSyncOperation(userId, 'UPDATE', id, transactionData);
          return updatedTransaction;
        }
      } else {
        // Mode offline, queue pour sync ultérieure
        console.log('📱 [TransactionService] 📦 Mode offline, ajout à la queue de synchronisation');
        await this.queueSyncOperation(userId, 'UPDATE', id, transactionData);
        return updatedTransaction;
      }
    } catch (error) {
      console.error('📱 [TransactionService] ❌ Erreur lors de la mise à jour de la transaction:', error);
      return null;
    }
  }

  /**
   * Supprimer une transaction (OFFLINE-FIRST PATTERN)
   * 1. Supprime de IndexedDB immédiatement
   * 2. Si online, sync suppression vers Supabase
   * 3. Si offline, queue pour sync ultérieure
   */
  async deleteTransaction(id: string): Promise<boolean> {
    try {
      // STEP 1: Récupérer le userId
      const userId = await this.getCurrentUserId();
      if (!userId) {
        console.error('📱 [TransactionService] ❌ Utilisateur non authentifié');
        return false;
      }

      // STEP 2: Récupérer la transaction depuis IndexedDB pour la queue
      const transaction = await db.transactions.get(id);
      if (!transaction) {
        console.warn(`📱 [TransactionService] ⚠️ Transaction ${id} non trouvée dans IndexedDB`);
        // Essayer quand même de supprimer depuis Supabase si online
        if (navigator.onLine) {
          try {
            const response = await withTimeout(
              apiService.deleteTransaction(id),
              SUPABASE_TIMEOUT_MS,
              'transactionService.deleteTransaction/orphan'
            );
            return response.success;
          } catch (error) {
            console.warn('📱 [TransactionService] ⚠️ Échec/timeout suppression Supabase (orphan):', error);
            return false;
          }
        }
        return false;
      }

      // STEP 3: Supprimer de IndexedDB immédiatement
      console.log('📱 [TransactionService] 💾 Suppression de la transaction depuis IndexedDB...');
      await db.transactions.delete(id);
      console.log(`📱 [TransactionService] ✅ Transaction "${transaction.description}" supprimée de IndexedDB`);

      // STEP 4: Si online, essayer de sync vers Supabase
      if (navigator.onLine) {
        try {
          console.log('📱 [TransactionService] 🌐 Synchronisation de la suppression vers Supabase...');
          const response = await withTimeout(
            apiService.deleteTransaction(id),
            SUPABASE_TIMEOUT_MS,
            'transactionService.deleteTransaction'
          );
          if (response.success) {
            console.log('📱 [TransactionService] ✅ Suppression synchronisée avec Supabase');
            return true;
          } else {
            console.warn('📱 [TransactionService] ⚠️ Échec de la synchronisation Supabase, ajout à la queue');
            await this.queueSyncOperation(userId, 'DELETE', id, {});
            return true; // Retourner true car supprimé de IndexedDB
          }
        } catch (syncError) {
          console.error('📱 [TransactionService] ❌ Erreur lors de la synchronisation Supabase:', syncError);
          await this.queueSyncOperation(userId, 'DELETE', id, {});
          return true; // Retourner true car supprimé de IndexedDB
        }
      } else {
        // Mode offline, queue pour sync ultérieure
        console.log('📱 [TransactionService] 📦 Mode offline, ajout à la queue de synchronisation');
        await this.queueSyncOperation(userId, 'DELETE', id, {});
        return true; // Retourner true car supprimé de IndexedDB
      }
    } catch (error) {
      console.error('📱 [TransactionService] ❌ Erreur lors de la suppression de la transaction:', error);
      return false;
    }
  }

  /**
   * Créer un transfert entre comptes
   */
  async createTransfer(
    userId: string,
    transferData: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      description: string;
      notes?: string;
      date?: Date;
      // Multi-currency fields (from form toggle, not /settings)
      originalCurrency?: 'MGA' | 'EUR'; // Currency selected in form toggle
    }
  ): Promise<{ success: boolean; transactions?: Transaction[]; error?: string }> {
    try {
      console.log('💸 TRANSFER START - fromAccountId:', transferData.fromAccountId, 'toAccountId:', transferData.toAccountId, 'amount:', transferData.amount);
      console.log('📅 Transfer date provided:', transferData.date ? transferData.date.toISOString().split('T')[0] : 'Using current date');

      // Get both accounts to check currencies
      const sourceAccount = await accountService.getAccount(transferData.fromAccountId, userId);
      const targetAccount = await accountService.getAccount(transferData.toAccountId, userId);

      if (!sourceAccount || !targetAccount) {
        console.error('❌ Compte source ou destination introuvable');
        return { success: false, error: 'Compte source ou destination introuvable' };
      }

      // ============================================================================
      // STRICT CURRENCY VALIDATION - Fix EUR transfer bug
      // ============================================================================
      console.group('💸 [TransactionService] Transfer Currency Validation');
      console.log('📊 Source Account:', {
        id: sourceAccount.id,
        name: sourceAccount.name,
        currency: sourceAccount.currency,
        balance: sourceAccount.balance
      });
      console.log('📊 Target Account:', {
        id: targetAccount.id,
        name: targetAccount.name,
        currency: targetAccount.currency,
        balance: targetAccount.balance
      });

      // STRICT VALIDATION: Currency must be explicitly set (no fallback to MGA)
      if (!sourceAccount.currency || sourceAccount.currency.trim() === '') {
        const errorMsg = `Le compte source "${sourceAccount.name}" n'a pas de devise définie. ` +
          `Veuillez définir la devise dans les paramètres du compte avant d'effectuer un transfert.`;
        console.error('❌ Source account missing currency:', {
          accountId: sourceAccount.id,
          accountName: sourceAccount.name,
          currency: sourceAccount.currency
        });
        console.groupEnd();
        return { success: false, error: errorMsg };
      }

      if (!targetAccount.currency || targetAccount.currency.trim() === '') {
        const errorMsg = `Le compte destination "${targetAccount.name}" n'a pas de devise définie. ` +
          `Veuillez définir la devise dans les paramètres du compte avant d'effectuer un transfert.`;
        console.error('❌ Target account missing currency:', {
          accountId: targetAccount.id,
          accountName: targetAccount.name,
          currency: targetAccount.currency
        });
        console.groupEnd();
        return { success: false, error: errorMsg };
      }

      // Determine original currency from form toggle (not account currency or /settings)
      // If not provided, use source account currency as fallback
      const originalCurrency = transferData.originalCurrency || sourceAccount.currency || 'MGA';
      
      const sourceCurrency = sourceAccount.currency;
      const targetCurrency = targetAccount.currency;

      // Get exchange rate at TRANSACTION DATE (not current date)
      const transferDate = transferData.date?.toISOString().split('T')[0];
      let exchangeRateUsed: number | null = null;
      let targetAmount = transferData.amount;

      // Check if conversion needed
      if (sourceCurrency === targetCurrency) {
        console.log('✅ Same currency transfer - no conversion needed');
        console.log(`💰 Transfer: ${transferData.amount} ${originalCurrency} → ${targetCurrency} (same currency)`);
        
        // Even for same currency, get exchange rate if originalCurrency differs
        if (originalCurrency !== sourceCurrency) {
          try {
            const rateInfo = await getExchangeRate(originalCurrency, sourceCurrency, transferDate);
            exchangeRateUsed = rateInfo.rate;
            targetAmount = await convertAmount(transferData.amount, originalCurrency, sourceCurrency, transferDate);
            console.log(`💱 Form currency (${originalCurrency}) differs from account currency (${sourceCurrency}), converted: ${transferData.amount} ${originalCurrency} = ${targetAmount} ${sourceCurrency}`);
          } catch (conversionError) {
            console.warn('⚠️ Could not convert form currency to account currency, using original amount');
          }
        }
        console.groupEnd();
        // No conversion needed for same-currency transfers
      } else {
        console.log('🔄 Cross-currency transfer - conversion required');
        console.log(`💱 Converting: ${transferData.amount} ${sourceCurrency} → ${targetCurrency}`);
        
        try {
          // First convert from originalCurrency (form toggle) to sourceCurrency if needed
          let amountInSourceCurrency = transferData.amount;
          if (originalCurrency !== sourceCurrency) {
            const rateInfoSource = await getExchangeRate(originalCurrency, sourceCurrency, transferDate);
            amountInSourceCurrency = await convertAmount(transferData.amount, originalCurrency, sourceCurrency, transferDate);
            console.log(`💱 Step 1: Form currency to source account: ${transferData.amount} ${originalCurrency} = ${amountInSourceCurrency} ${sourceCurrency} (rate: ${rateInfoSource.rate})`);
          }
          
          // Then convert from sourceCurrency to targetCurrency
          const rateInfo = await getExchangeRate(
            sourceCurrency,
            targetCurrency,
            transferDate
          );
          exchangeRateUsed = rateInfo.rate;
          
          // Convert amount
          targetAmount = await convertAmount(
            amountInSourceCurrency,
            sourceCurrency,
            targetCurrency,
            transferDate
          );
          
          console.log('✅ Conversion successful:', {
            originalAmount: transferData.amount,
            originalCurrency: originalCurrency,
            amountInSourceCurrency: amountInSourceCurrency,
            sourceCurrency: sourceCurrency,
            convertedAmount: targetAmount,
            targetCurrency: targetCurrency,
            exchangeRate: rateInfo.rate,
            rateSource: rateInfo.source
          });
          console.log(`💱 ${amountInSourceCurrency} ${sourceCurrency} = ${targetAmount} ${targetCurrency} (rate: ${rateInfo.rate})`);
        } catch (conversionError: any) {
          const errorMsg = `Erreur lors de la conversion de devise: ${conversionError?.message || 'Erreur inconnue'}. ` +
            `Impossible de convertir ${transferData.amount} ${sourceCurrency} vers ${targetCurrency}.`;
          console.error('❌ Currency conversion error:', {
            error: conversionError,
            fromCurrency: sourceCurrency,
            toCurrency: targetCurrency,
            amount: transferData.amount
          });
          console.groupEnd();
          return { success: false, error: errorMsg };
        }
        console.groupEnd();
      }

      // Appeler l'API de transfert avec les paramètres directs
      // Note: L'API backend doit gérer la conversion, mais on envoie aussi le montant converti
      const response = await withTimeout(
        apiService.createTransfer({
          fromAccountId: transferData.fromAccountId,
          toAccountId: transferData.toAccountId,
          amount: transferData.amount, // Montant original dans la devise du formulaire
          description: transferData.description,
          transferFee: 0,
          date: transferData.date,
          // Multi-currency fields
          originalCurrency: originalCurrency,
          originalAmount: transferData.amount,
          exchangeRateUsed: exchangeRateUsed || undefined
        }),
        SUPABASE_TIMEOUT_MS,
        'transactionService.createTransfer'
      );

      if (!response.success || response.error) {
        console.error('❌ Erreur lors de la création du transfert:', response.error);
        return { success: false, error: response.error || 'Erreur lors de la création du transfert' };
      }

      console.log('✅ Transfert créé avec succès');
      
      // Transformer les données Supabase vers le format local
      const { fromTransaction, toTransaction } = response.data as any;
      console.log('🔍 Debit transaction:', fromTransaction);
      console.log('🔍 Credit transaction:', toTransaction);
      
      // Use mapSupabaseToTransaction to properly map all fields including multi-currency
      const transactions: Transaction[] = [
        this.mapSupabaseToTransaction(fromTransaction),
        this.mapSupabaseToTransaction(toTransaction)
      ];
      
      console.log('💱 Transfer transactions with multi-currency fields:', {
        debit: {
          originalCurrency: transactions[0].originalCurrency,
          originalAmount: transactions[0].originalAmount,
          exchangeRateUsed: transactions[0].exchangeRateUsed
        },
        credit: {
          originalCurrency: transactions[1].originalCurrency,
          originalAmount: transactions[1].originalAmount,
          exchangeRateUsed: transactions[1].exchangeRateUsed
        }
      });

      // Mettre à jour les soldes des deux comptes
      // Source: débit du montant original dans sa devise
      // Destination: crédit du montant converti dans sa devise
      try {
        console.log('🔍 Updating source account:', transferData.fromAccountId, 'with amount:', -Math.abs(transferData.amount));
        await this.updateAccountBalanceAfterTransaction(transferData.fromAccountId, -Math.abs(transferData.amount), userId);
        
        console.log('🔍 Updating destination account:', transferData.toAccountId, 'with amount:', Math.abs(targetAmount));
        await this.updateAccountBalanceAfterTransaction(transferData.toAccountId, Math.abs(targetAmount), userId);
        
        console.log('✅ TRANSFER COMPLETE - Both account balances updated');
      } catch (balanceError) {
        console.error('❌ Erreur lors de la mise à jour des soldes:', balanceError);
        // Ne pas faire échouer le transfert pour une erreur de solde
      }
      
      return { success: true, transactions };
    } catch (error) {
      console.error('❌ Erreur lors de la création du transfert:', error);
      return { success: false, error: 'Erreur lors de la création du transfert' };
    }
  }

  /**
   * Mettre à jour le solde d'un compte après une transaction
   */
  private async updateAccountBalanceAfterTransaction(accountId: string, transactionAmount: number, userId: string): Promise<void> {
    try {
      console.log(`🔍 Mise à jour du solde pour le compte ${accountId} avec ${transactionAmount}`);
      
      // Récupérer le compte actuel
      const account = await accountService.getAccount(accountId, userId);
      if (!account) {
        throw new Error(`Compte ${accountId} non trouvé`);
      }

      // Calculer le nouveau solde
      const newBalance = account.balance + transactionAmount;
      console.log(`💰 Nouveau solde: ${account.balance} + ${transactionAmount} = ${newBalance}`);

      // Mettre à jour le compte
      const updatedAccount = await accountService.updateAccount(accountId, userId, { balance: newBalance });
      if (!updatedAccount) {
        throw new Error(`Échec de la mise à jour du solde pour le compte ${accountId}`);
      }

      console.log(`✅ Solde mis à jour: ${account.balance} → ${newBalance}`);
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour du solde du compte ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Mettre à jour le solde d'un compte (méthode publique)
   */
  async updateAccountBalance(_accountId: string, _amount: number): Promise<boolean> {
    try {
      // Cette méthode est maintenant gérée par l'API
      console.log('ℹ️ Mise à jour du solde gérée par l\'API');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du solde:', error);
      return false;
    }
  }

  /**
   * Mettre à jour le solde d'un compte (méthode publique pour compatibilité)
   */
  async updateAccountBalancePublic(accountId: string, amount: number): Promise<boolean> {
    return this.updateAccountBalance(accountId, amount);
  }
}

/**
 * Helper function to get account by ID
 * Uses accountService.getAccount() internally
 */
async function getAccountById(accountId: string): Promise<import('../types').Account | null> {
  try {
    return await accountService.getAccount(accountId);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du compte:', error);
    return null;
  }
}

export default new TransactionService();