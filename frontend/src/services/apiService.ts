/**
 * Service API pour BazarKELY - Migration vers Supabase
 * Communication directe avec Supabase PostgreSQL
 * Remplacement de l'API PHP par Supabase
 */

import { supabase, db, handleSupabaseError, withTimeout } from '../lib/supabase';
import type { 
  User, Account, SupabaseTransaction, Budget, Goal, 
  UserInsert, AccountInsert, SupabaseTransactionInsert, BudgetInsert, GoalInsert,
  UserUpdate, AccountUpdate, SupabaseTransactionUpdate, BudgetUpdate, GoalUpdate
} from '../types/supabase';

/**
 * Convertit une chaîne camelCase en snake_case
 * @param str - Chaîne en camelCase (ex: "linkedGoalId")
 * @returns Chaîne en snake_case (ex: "linked_goal_id")
 */
const camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * Convertit toutes les clés d'un objet de camelCase vers snake_case
 * Crée une nouvelle copie de l'objet sans modifier l'original
 * @param obj - Objet avec clés en camelCase
 * @returns Nouvel objet avec clés en snake_case
 */
const convertKeysToSnakeCase = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = obj[key];
    }
  }
  return result;
};

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  /**
   * Obtenir l'utilisateur actuel depuis Supabase Auth
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      // Essayer d'abord getSession() qui est plus fiable
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        return session.user.id;
      }

      // Si pas de session, essayer getUser()
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        return user.id;
      }

      // Si toujours pas d'utilisateur, attendre un peu et réessayer (pour les cas post-inscription)
      console.log('⏳ Session non disponible, tentative de récupération...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: { session: retrySession } } = await supabase.auth.getSession();
      if (retrySession?.user?.id) {
        console.log('✅ Session récupérée après attente');
        return retrySession.user.id;
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error);
      return null;
    }
  }

  /**
   * Gestionnaire d'erreur Supabase unifié
   */
  private handleError(error: any, operation: string): ApiResponse {
    console.error(`❌ Erreur ${operation}:`, error);
    return {
      success: false,
      error: handleSupabaseError(error)
    };
  }

  // === UTILISATEURS ===
  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      const { data, error } = await db.users().select('*');
      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return this.handleError(error, 'getUsers');
    }
  }

  async createUser(userData: UserInsert): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await db.users().insert(userData).select().single();
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return this.handleError(error, 'createUser');
    }
  }

  // === COMPTES ===
  async getAccounts(): Promise<ApiResponse<Account[]>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      console.log('🔍 Querying Supabase accounts for user:', userId);
      const { data, error } = await db.accounts()
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      console.log('✅ Supabase accounts query successful:', data?.length || 0, 'accounts');
      return { success: true, data: data || [] };
    } catch (error) {
      return this.handleError(error, 'getAccounts');
    }
  }

  async createAccount(accountData: AccountInsert): Promise<ApiResponse<Account>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      // Convertir camelCase → snake_case pour Supabase
      const snakeCaseData = convertKeysToSnakeCase(accountData);
      const { data, error } = await db.accounts()
        .upsert({ ...snakeCaseData, user_id: userId }, { onConflict: 'id' })
        .select()
        .single();
      
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return this.handleError(error, 'createAccount');
    }
  }

  async updateAccount(id: string, accountData: AccountUpdate): Promise<ApiResponse<Account>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      // Convertir camelCase → snake_case pour Supabase
      const snakeCaseData = convertKeysToSnakeCase(accountData);
      const { data, error } = await db.accounts()
        .update(snakeCaseData)
        .eq('id', id)
        .eq('user_id', userId)
        .select();
      
      if (error) throw error;

      // Vérifier si des données ont été retournées (peut être vide à cause de RLS)
      if (data && Array.isArray(data) && data.length > 0) {
        return { success: true, data: data[0] };
      } else {
        // Supabase retourne 0 lignes (RLS policy ou ligne manquante)
        // Retourner une erreur gracieuse pour que accountService puisse utiliser IndexedDB
        return { 
          success: false, 
          error: 'Supabase returned 0 rows (RLS policy or missing row)' 
        };
      }
    } catch (error) {
      return this.handleError(error, 'updateAccount');
    }
  }

  async deleteAccount(id: string): Promise<ApiResponse<boolean>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      const { error } = await db.accounts()
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;

      return { success: true, data: true };
    } catch (error) {
      return this.handleError(error, 'deleteAccount');
    }
  }

  // === TRANSACTIONS ===
  async getTransactions(): Promise<ApiResponse<SupabaseTransaction[]>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      const { data, error } = await db.transactions()
        .select(`
          *,
          accounts!transactions_account_id_fkey(name, type),
          target_account:accounts!transactions_target_account_id_fkey(name, type)
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false });
      
      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return this.handleError(error, 'getTransactions');
    }
  }

  /**
   * Récupérer les transactions transférées (où l'utilisateur était le propriétaire original)
   * Retourne les transactions où original_owner_id = userId ET current_owner_id != userId ET transferred_at IS NOT NULL
   * @param userId - ID de l'utilisateur (propriétaire original)
   * @returns Transactions transférées, triées par transferred_at décroissant
   */
  async getTransferredTransactions(userId: string): Promise<ApiResponse<SupabaseTransaction[]>> {
    try {
      const { data, error } = await db.transactions()
        .select(`
          *,
          accounts!transactions_account_id_fkey(name, type),
          target_account:accounts!transactions_target_account_id_fkey(name, type)
        `)
        .eq('original_owner_id', userId)
        .neq('current_owner_id', userId)
        .not('transferred_at', 'is', null)
        .order('transferred_at', { ascending: false });
      
      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return this.handleError(error, 'getTransferredTransactions');
    }
  }

  async createTransaction(transactionData: SupabaseTransactionInsert): Promise<ApiResponse<SupabaseTransaction>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      // Convertir camelCase → snake_case pour Supabase
      const snakeCaseData = convertKeysToSnakeCase(transactionData);
      const { data, error } = await db.transactions()
        .upsert({ ...snakeCaseData, user_id: userId }, { onConflict: 'id' })
        .select()
        .single();
      
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return this.handleError(error, 'createTransaction');
    }
  }

  async updateTransaction(id: string, transactionData: TransactionUpdate): Promise<ApiResponse<Transaction>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      // Convertir camelCase → snake_case pour Supabase
      const snakeCaseData = convertKeysToSnakeCase(transactionData);
      const { data, error } = await db.transactions()
        .update(snakeCaseData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return this.handleError(error, 'updateTransaction');
    }
  }

  async deleteTransaction(id: string): Promise<ApiResponse<boolean>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      const { error } = await db.transactions()
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;

      return { success: true, data: true };
    } catch (error) {
      return this.handleError(error, 'deleteTransaction');
    }
  }

  async createTransfer(transferData: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description?: string;
    transferFee?: number;
    date?: Date;
    // Multi-currency fields (from form toggle)
    originalCurrency?: 'MGA' | 'EUR';
    originalAmount?: number;
    exchangeRateUsed?: number;
  }): Promise<ApiResponse<{ fromTransaction: Transaction; toTransaction: Transaction }>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      const { 
        fromAccountId, 
        toAccountId, 
        amount, 
        description, 
        transferFee = 0, 
        date,
        originalCurrency,
        originalAmount,
        exchangeRateUsed
      } = transferData;
      
      // Use provided date or default to current date
      const transferDate = date || new Date();
      console.log('📅 Transfer date being used:', transferDate.toISOString().split('T')[0]);
      console.log('💱 Transfer multi-currency fields:', {
        originalCurrency,
        originalAmount,
        exchangeRateUsed
      });

      // Créer les deux transactions (débit et crédit)
      const { data: fromTransaction, error: fromError } = await db.transactions()
        .insert({
          user_id: userId,
          account_id: fromAccountId,
          amount: -amount, // Débit
          type: 'transfer',
          category: 'Transfert sortant',
          description: description || `Transfert vers ${toAccountId}`,
          target_account_id: toAccountId,
          transfer_fee: transferFee,
          date: transferDate.toISOString().split('T')[0], // Format YYYY-MM-DD for Supabase
          // Multi-currency fields
          original_currency: originalCurrency || null,
          original_amount: originalAmount || amount,
          exchange_rate_used: exchangeRateUsed || null
        })
        .select()
        .single();

      if (fromError) throw fromError;

      const { data: toTransaction, error: toError } = await db.transactions()
        .insert({
          user_id: userId,
          account_id: toAccountId,
          amount: amount, // Crédit
          type: 'transfer',
          category: 'Transfert entrant',
          description: description || `Transfert depuis ${fromAccountId}`,
          target_account_id: fromAccountId,
          transfer_fee: 0,
          date: transferDate.toISOString().split('T')[0], // Same date for both transactions
          // Multi-currency fields (same as debit transaction)
          original_currency: originalCurrency || null,
          original_amount: originalAmount || amount,
          exchange_rate_used: exchangeRateUsed || null
        })
        .select()
        .single();

      if (toError) throw toError;

      return { 
        success: true, 
        data: { fromTransaction, toTransaction } 
      };
    } catch (error) {
      return this.handleError(error, 'createTransfer');
    }
  }

  // === BUDGETS ===
  async getBudgets(): Promise<ApiResponse<Budget[]>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      const { data, error } = await db.budgets()
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return this.handleError(error, 'getBudgets');
    }
  }

  async createBudget(budgetData: BudgetInsert): Promise<ApiResponse<Budget>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      // Convertir camelCase → snake_case pour Supabase
      const snakeCaseData = convertKeysToSnakeCase(budgetData);
      const { data, error } = await db.budgets()
        .upsert({ ...snakeCaseData, user_id: userId }, { onConflict: 'id' })
        .select()
        .single();
      
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return this.handleError(error, 'createBudget');
    }
  }

  // === OBJECTIFS ===
  async getGoals(): Promise<ApiResponse<Goal[]>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      const { data, error } = await db.goals()
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return this.handleError(error, 'getGoals');
    }
  }

  async createGoal(goalData: GoalInsert): Promise<ApiResponse<Goal>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      // Convertir camelCase → snake_case pour Supabase
      const snakeCaseData = convertKeysToSnakeCase(goalData);
      const { data, error } = await db.goals()
        .upsert({ ...snakeCaseData, user_id: userId }, { onConflict: 'id' })
        .select()
        .single();
      
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return this.handleError(error, 'createGoal');
    }
  }

  // === MÉTHODES UTILITAIRES ===
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  async getServerStatus() {
    try {
      const { data, error } = await withTimeout(
        supabase.from('users').select('count').limit(1),
        5000,
        'apiService.getServerStatus'
      ) as any;

      return {
        online: !error,
        status: error ? 500 : 200,
        supabase: 'connected',
        error: error?.message || null
      };
    } catch (error) {
      return {
        online: false,
        error: error instanceof Error ? error.message : 'Erreur de connexion',
        supabase: 'disconnected'
      };
    }
  }

  async logout(): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      return { success: true, data: true };
    } catch (error) {
      return this.handleError(error, 'logout');
    }
  }

  /**
   * Mettre à jour les préférences utilisateur dans Supabase
   * @param userId - ID de l'utilisateur
   * @param preferences - Objet des préférences à sauvegarder
   * @returns ApiResponse avec succès ou erreur
   */
  async updateUserPreferences(userId: string, preferences: any): Promise<ApiResponse<User>> {
    try {
      console.log('💾 Sauvegarde des préférences utilisateur vers Supabase...', { userId, preferences });

      const { data, error } = await supabase
        .from('users')
        .update({ 
          preferences: preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur Supabase lors de la mise à jour des préférences:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Aucune donnée retournée par Supabase');
      }

      console.log('✅ Préférences utilisateur sauvegardées avec succès');
      
      // Convertir les données Supabase en format User
      const user: User = {
        id: data.id,
        username: data.username,
        email: data.email,
        phone: data.phone || '',
        role: data.role,
        preferences: data.preferences,
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_sync: data.last_sync
      };

      return { success: true, data: user };
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde des préférences:', error);
      return this.handleError(error, 'updateUserPreferences');
    }
  }

  // === MÉTHODES DE COMPATIBILITÉ (pour migration) ===
  
  /**
   * Obtenir l'endpoint actuel (pour compatibilité)
   */
  getCurrentApiEndpoint() {
    return 'supabase://ofzmwrzatcztoekrpvkj.supabase.co';
  }

  /**
   * Obtenir l'environnement actuel (pour compatibilité)
   */
  getCurrentApiEnvironment() {
    return 'supabase';
  }

  /**
   * Tester la connectivité (pour compatibilité)
   */
  async testCurrentEndpoint() {
    const result = await this.testConnection();
    return {
      endpoint: this.getCurrentApiEndpoint(),
      environment: this.getCurrentApiEnvironment(),
      online: result,
      supabase: 'connected'
    };
  }

  /**
   * Obtenir la configuration API actuelle (pour compatibilité)
   */
  getApiConfig() {
    return {
      endpoint: this.getCurrentApiEndpoint(),
      environment: this.getCurrentApiEnvironment(),
      fallbackUsed: false,
      supabase: true
    };
  }

  // === SCAN DE TICKET (transaction_receipts / transaction_items) ===
  // Calqué sur createTransaction : upsert idempotent (onConflict: 'id'), payloads en
  // snake_case. Les tables ne figurent pas dans le schéma TS généré → cast `as any`.

  /**
   * Upsert (idempotent) de l'en-tête de ticket. Le `id` client est conservé.
   */
  async upsertReceipt(payload: Record<string, any>): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await (supabase as any)
        .from('transaction_receipts')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return this.handleError(error, 'upsertReceipt');
    }
  }

  /**
   * Upsert (idempotent) en lot des lignes d'article. Vide → no-op succès.
   */
  async upsertReceiptItems(items: Record<string, any>[]): Promise<ApiResponse<any>> {
    try {
      if (!items || items.length === 0) {
        return { success: true, data: [] };
      }
      const { data, error } = await (supabase as any)
        .from('transaction_items')
        .upsert(items, { onConflict: 'id' })
        .select();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return this.handleError(error, 'upsertReceiptItems');
    }
  }

  async getReceiptByTransaction(transactionId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await (supabase as any)
        .from('transaction_receipts')
        .select('*')
        .eq('transaction_id', transactionId)
        .maybeSingle();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return this.handleError(error, 'getReceiptByTransaction');
    }
  }

  async getItemsByTransaction(transactionId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await (supabase as any)
        .from('transaction_items')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return this.handleError(error, 'getItemsByTransaction');
    }
  }

  async deleteReceiptItem(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await (supabase as any)
        .from('transaction_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true, data: true };
    } catch (error) {
      return this.handleError(error, 'deleteReceiptItem');
    }
  }
}

export default new ApiService();
