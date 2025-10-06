import { supabase } from '../lib/supabase';

// Define User type locally to avoid import issues
export interface User {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  role: string;
  preferences: any;
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
      if (!result || !(result as any).success) {
        console.error('❌ RPC delete_user_admin failed:', result);
        return { 
          success: false, 
          error: (result as any)?.error || 'Erreur lors de la suppression de l\'utilisateur' 
        };
      }

      console.log(`✅ RPC delete_user_admin success:`, result);

      // Try to delete from auth.users (requires admin privileges)
      try {
        const { error: authUserError } = await supabase.auth.admin.deleteUser(userId);
        
        if (authUserError) {
          console.warn('⚠️ Impossible de supprimer de auth.users (privilèges insuffisants):', authUserError);
          // Don't fail the deletion since public data is deleted
        } else {
          console.log('✅ Utilisateur supprimé de auth.users');
        }
      } catch (authError) {
        console.warn('⚠️ Erreur lors de la suppression de auth.users:', authError);
        // Don't fail the deletion since public data is deleted
      }

      console.log(`✅ Utilisateur supprimé avec succès: ${(result as any).user_deleted}`);

      return { 
        success: true, 
        message: (result as any).message || `Utilisateur supprimé avec succès`,
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

      return {
        success: true,
        data: {
          totalUsers: (stats as any)?.total_users || 0,
          totalTransactions: (stats as any)?.total_transactions || 0,
          totalAccounts: (stats as any)?.total_accounts || 0,
          totalBudgets: (stats as any)?.total_budgets || 0,
          totalGoals: (stats as any)?.total_goals || 0,
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
