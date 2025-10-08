import { supabase } from '../lib/supabase';

// Define User type locally to avoid import issues
export interface UserPreferences {
  theme: 'light' | 'dark';
  language: 'fr' | 'mg';
  currency: 'MGA' | 'EUR' | 'USD';
  notifications: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  role: 'user' | 'admin';
  preferences: UserPreferences;
  created_at: string;
  updated_at: string;
  last_sync: string | null;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
  last_sync: string | null;
  isCurrentUser: boolean;
}

export interface AdminResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RPCDeleteUserResult {
  success: boolean;
  user_deleted: boolean;
  auth_user_deleted: boolean;
  auth_deletion_error?: string;
  message?: string;
  error?: string;
}

export interface RPCStatsResult {
  total_users: number;
  total_transactions: number;
  total_accounts: number;
  total_budgets: number;
  total_goals: number;
}

class AdminService {
  /**
   * Vérifier si l'utilisateur actuel est admin (joelsoatra@gmail.com)
   */
  async isAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return false;
      
      return user.email === 'joelsoatra@gmail.com';
    } catch (error) {
      console.error('❌ Erreur lors de la vérification admin:', error);
      return false;
    }
  }

  /**
   * Obtenir tous les utilisateurs (admin seulement) - Bypass RLS
   */
  async getAllUsers(): Promise<AdminResponse<AdminUser[]>> {
    try {
      const isAdminUser = await this.isAdmin();
      if (!isAdminUser) {
        return { 
          success: false, 
          error: 'Accès refusé. Seuls les administrateurs peuvent accéder à cette fonctionnalité.' 
        };
      }

      // Get current user email for comparison
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const currentUserEmail = currentUser?.email || '';

      // Call RPC function to bypass RLS and get all users
      const { data: users, error } = await supabase.rpc('get_all_users_admin');

      if (error) {
        console.error('❌ Erreur RPC get_all_users_admin:', error);
        if (error.message.includes('Access denied')) {
          return { 
            success: false, 
            error: 'Accès refusé. Fonction admin uniquement.' 
          };
        }
        throw error;
      }

      // Add isCurrentUser property to each user
      const usersWithCurrentFlag: AdminUser[] = (users as any[] || []).map((user: any) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        last_sync: user.last_sync,
        isCurrentUser: user.email === currentUserEmail
      }));

      console.log(`✅ Admin: Récupéré ${usersWithCurrentFlag.length} utilisateurs via RPC`);

      return { 
        success: true, 
        data: usersWithCurrentFlag,
        message: `${usersWithCurrentFlag.length} utilisateur(s) trouvé(s)` 
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', error);
      return { 
        success: false, 
        error: 'Erreur lors de la récupération des utilisateurs' 
      };
    }
  }

  /**
   * Supprimer complètement un utilisateur et toutes ses données - Bypass RLS
   */
  async deleteUser(userId: string): Promise<AdminResponse<boolean>> {
    try {
      const isAdminUser = await this.isAdmin();
      if (!isAdminUser) {
        return { 
          success: false, 
          error: 'Accès refusé. Seuls les administrateurs peuvent supprimer des utilisateurs.' 
        };
      }

      console.log(`🗑️ Suppression de l'utilisateur via RPC: ${userId}`);

      // Call RPC function to delete user and all related data (bypasses RLS)
      const { data: result, error } = await supabase.rpc('delete_user_admin', {
        target_user_id: userId
      } as any);

      if (error) {
        console.error('❌ Erreur RPC delete_user_admin:', error);
        if (error.message.includes('Access denied')) {
          return { 
            success: false, 
            error: 'Accès refusé. Fonction admin uniquement.' 
          };
        }
        if (error.message.includes('Cannot delete your own account')) {
          return { 
            success: false, 
            error: 'Impossible de supprimer votre propre compte.' 
          };
        }
        throw error;
      }

      // Check RPC result
      const rpcResult = result as RPCDeleteUserResult;
      if (!rpcResult || !rpcResult.success) {
        console.error('❌ RPC delete_user_admin failed:', rpcResult);
        return { 
          success: false, 
          error: rpcResult?.error || 'Erreur lors de la suppression de l\'utilisateur' 
        };
      }

      console.log(`✅ RPC delete_user_admin success:`, rpcResult);

      // Check if auth.users deletion was successful
      const authUserDeleted = rpcResult.auth_user_deleted;
      const authDeletionError = rpcResult.auth_deletion_error;

      if (authUserDeleted) {
        console.log('✅ Utilisateur supprimé de auth.users via RPC');
      } else {
        console.warn('⚠️ Échec de la suppression de auth.users via RPC:', authDeletionError);
        
        // Try fallback method using Supabase admin API
        try {
          const { error: authUserError } = await supabase.auth.admin.deleteUser(userId);
          
          if (authUserError) {
            console.warn('⚠️ Fallback auth.users deletion also failed:', authUserError);
          } else {
            console.log('✅ Utilisateur supprimé de auth.users via fallback admin API');
          }
        } catch (authError) {
          console.warn('⚠️ Erreur lors de la suppression de auth.users via fallback:', authError);
        }
      }

      console.log(`✅ Utilisateur supprimé avec succès: ${rpcResult.user_deleted}`);

      return { 
        success: true, 
        message: rpcResult.message || `Utilisateur supprimé avec succès`,
        data: true
      };

    } catch (error) {
      console.error('❌ Erreur lors de la suppression de l\'utilisateur:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de la suppression de l\'utilisateur' 
      };
    }
  }

  /**
   * Obtenir les statistiques application-wide (admin seulement) - Bypass RLS
   */
  async getUserStats(): Promise<AdminResponse<{
    totalUsers: number;
    totalTransactions: number;
    totalAccounts: number;
    totalBudgets: number;
    totalGoals: number;
  }>> {
    try {
      const isAdminUser = await this.isAdmin();
      if (!isAdminUser) {
        return { 
          success: false, 
          error: 'Accès refusé. Seuls les administrateurs peuvent accéder aux statistiques.' 
        };
      }

      // Call RPC function to get application-wide statistics
      const { data: stats, error } = await supabase.rpc('get_admin_stats');

      if (error) {
        console.error('❌ Erreur RPC get_admin_stats:', error);
        if (error.message.includes('Access denied')) {
          return { 
            success: false, 
            error: 'Accès refusé. Fonction admin uniquement.' 
          };
        }
        throw error;
      }

      console.log(`✅ Admin: Statistiques application-wide récupérées via RPC:`, stats);

      const rpcStats = stats as RPCStatsResult;
      return {
        success: true,
        data: {
          totalUsers: rpcStats?.total_users || 0,
          totalTransactions: rpcStats?.total_transactions || 0,
          totalAccounts: rpcStats?.total_accounts || 0,
          totalBudgets: rpcStats?.total_budgets || 0,
          totalGoals: rpcStats?.total_goals || 0,
        }
      };

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques:', error);
      return { 
        success: false, 
        error: 'Erreur lors de la récupération des statistiques' 
      };
    }
  }
}

export default new AdminService();
