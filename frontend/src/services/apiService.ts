/**
 * Service API pour BazarKELY - Migration vers Supabase
 * Communication directe avec Supabase PostgreSQL
 * Remplacement de l'API PHP par Supabase
 */

import { supabase, db, handleSupabaseError } from '../lib/supabase';
import type { 
  User, Account, SupabaseTransaction, Budget, Goal, 
  UserInsert, AccountInsert, SupabaseTransactionInsert, BudgetInsert, GoalInsert,
  UserUpdate, AccountUpdate, SupabaseTransactionUpdate, BudgetUpdate, GoalUpdate
} from '../types/supabase';

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

      const { data, error } = await db.accounts()
        .insert({ ...accountData, user_id: userId })
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

      const { data, error } = await db.accounts()
        .update(accountData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;

      return { success: true, data };
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

  async createTransaction(transactionData: SupabaseTransactionInsert): Promise<ApiResponse<SupabaseTransaction>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      const { data, error } = await db.transactions()
        .insert({ ...transactionData, user_id: userId })
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

      const { data, error } = await db.transactions()
        .update(transactionData)
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
  }): Promise<ApiResponse<{ fromTransaction: Transaction; toTransaction: Transaction }>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      const { fromAccountId, toAccountId, amount, description, transferFee = 0, date } = transferData;
      
      // Use provided date or default to current date
      const transferDate = date || new Date();
      console.log('📅 Transfer date being used:', transferDate.toISOString().split('T')[0]);

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
          date: transferDate.toISOString().split('T')[0] // Format YYYY-MM-DD for Supabase
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
          date: transferDate.toISOString().split('T')[0] // Same date for both transactions
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

      const { data, error } = await db.budgets()
        .insert({ ...budgetData, user_id: userId })
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

      const { data, error } = await db.goals()
        .insert({ ...goalData, user_id: userId })
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
      const { data, error } = await supabase.from('users').select('count').limit(1);
      
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
}

export default new ApiService();
