import { supabase, withTimeout } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';

/** Filet de securite : compte admin historique, utilise si la lecture du role echoue. */
const ADMIN_FALLBACK_EMAIL = 'joelsoatra@gmail.com';

/** Code d'erreur renvoye quand le serveur refuse faute de session valide. */
export const ERREUR_SESSION = 'SESSION_EXPIREE';

/**
 * Vrai quand l'erreur remontee par PostgREST traduit une absence de session valide
 * (jeton expire / appel effectue en anonyme), et non un vrai probleme metier.
 */
export function estErreurDeSession(error: any): boolean {
  const message = String(error?.message || error || '').toLowerCase();
  const code = String(error?.code || '');
  return (
    code === '42501' ||
    code === 'PGRST301' ||
    message.includes('permission denied') ||
    message.includes('jwt') ||
    message.includes('invalid refresh token') ||
    message.includes('unauthorized')
  );
}

/** Etat d'acces a l'ecran d'administration. */
export type AdminAccessState = 'admin' | 'denied' | 'no-session';

/**
 * Identite courante SANS reseau (offline-first) :
 * 1) store Zustand, 2) supabase.auth.getSession() (lecture localStorage), 3) null.
 * Ne JAMAIS utiliser supabase.auth.getUser() ici : c'est un fetch HTTP qui plante hors ligne.
 */
export async function getCurrentUserSafe(): Promise<{ id: string; email: string } | null> {
  const storeUser = useAppStore.getState().user;
  if (storeUser?.id) {
    return { id: storeUser.id, email: storeUser.email || '' };
  }
  try {
    const { data } = await supabase.auth.getSession();
    const sessionUser = data?.session?.user;
    if (sessionUser?.id) {
      return { id: sessionUser.id, email: sessionUser.email || '' };
    }
  } catch (error) {
    console.warn('⚠️ Lecture de session impossible:', error);
  }
  return null;
}

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

export interface UserGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  priority: string;
  isCompleted: boolean;
}

/** Pastille d'etat d'un utilisateur dans le tableau d'administration. */
export type AdminUserEtat = 'actif' | 'dormant' | 'jamais-revenu' | 'fantome';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string | null;
  last_sync: string | null;
  /** Derniere connexion declaree. null si la valeur n'est pas exploitable (voir lastLoginInconnu). */
  last_login_at: string | null;
  /** true quand last_login_at est nul ou egal a created_at a la minute pres => date affichee "inconnue". */
  lastLoginInconnu: boolean;
  transactionsCount: number;
  lastTransactionAt: string | null;
  etat: AdminUserEtat;
  isCurrentUser: boolean;
  profilePictureUrl: string | null;
  goals: UserGoal[];
  monthlyIncome: number | null;
}

export interface AdminIndicateurs {
  inscrits: number;
  actifs7: number;
  actifs30: number;
  dormants: number;
  jamaisRevenus: number;
  fantomes: number;
}

export interface AdminSeriePoint {
  mois: string;
  valeur: number;
}

export interface AdminCohorte {
  cohorte: string;
  inscrits: number;
  m1: number;
  m2: number;
  m3: number;
}

export interface AdminLastLoginDiagnostic {
  total: number;
  nuls: number;
  egalCreation: number;
  distincts: number;
  plusRecent: string | null;
}

export interface AdminActivite {
  indicateurs: AdminIndicateurs;
  inscriptionsParMois: AdminSeriePoint[];
  transactionsParMois: AdminSeriePoint[];
  cohortes: AdminCohorte[];
  diagnosticLastLogin: AdminLastLoginDiagnostic;
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
  /** Cache court de l'etat d'acces : le chargement de la page l'interroge 4 fois. */
  private accesCache: { etat: AdminAccessState; at: number } | null = null;
  private static readonly ACCES_TTL_MS = 15000;

  /**
   * Etat d'acces a l'administration, sans aucun appel reseau bloquant.
   * - 'no-session' : aucune identite lisible (store vide + pas de session locale)
   * - 'admin'      : users.role = 'admin' (ou filet e-mail si la lecture du role echoue)
   * - 'denied'     : identite connue mais role different de 'admin'
   */
  async getAccessState(forcer = false): Promise<AdminAccessState> {
    if (!forcer && this.accesCache && Date.now() - this.accesCache.at < AdminService.ACCES_TTL_MS) {
      return this.accesCache.etat;
    }
    const etat = await this.calculerAccessState();
    this.accesCache = { etat, at: Date.now() };
    return etat;
  }

  private async calculerAccessState(): Promise<AdminAccessState> {
    const current = await getCurrentUserSafe();
    if (!current) return 'no-session';

    // 1) Source de verite : users.role
    try {
      const { data, error } = await withTimeout(
        supabase.from('users').select('role').eq('id', current.id).single(),
        5000,
        'admin-role'
      ) as any;

      if (!error && data && typeof data.role === 'string' && data.role.length > 0) {
        return data.role === 'admin' ? 'admin' : 'denied';
      }
      console.warn('⚠️ Rôle indisponible, bascule sur le filet e-mail:', error?.message);
    } catch (error) {
      console.warn('⚠️ Lecture du rôle impossible (hors ligne ?), bascule sur le filet e-mail:', error);
    }

    // 2) Filet de securite : e-mail admin historique
    const email = (current.email || '').trim().toLowerCase();
    return email === ADMIN_FALLBACK_EMAIL ? 'admin' : 'denied';
  }

  /**
   * Vérifier si l'utilisateur actuel est admin (users.role, filet e-mail en secours)
   */
  async isAdmin(): Promise<boolean> {
    return (await this.getAccessState()) === 'admin';
  }

  /**
   * Obtenir tous les utilisateurs avec données enrichies (admin seulement) - Bypass RLS
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

      // Identite courante (offline-first, jamais getUser())
      const currentUser = await getCurrentUserSafe();
      const currentUserId = currentUser?.id || '';

      // RPC enrichie : bypass RLS + compteur et date de derniere transaction
      const { data: usersRaw, error: usersError } = await withTimeout(
        supabase.rpc('get_admin_utilisateurs') as any,
        8000,
        'get_admin_utilisateurs'
      ) as any;
      const users = (usersRaw as any[]) || [];

      if (usersError) {
        console.error('❌ Erreur RPC get_admin_utilisateurs:', usersError);
        if (estErreurDeSession(usersError)) {
          return { success: false, error: ERREUR_SESSION };
        }
        if (usersError.message.includes('Access denied')) {
          return {
            success: false,
            error: 'Accès refusé. Fonction admin uniquement.'
          };
        }
        throw usersError;
      }

      if (users.length === 0) {
        return {
          success: true,
          data: [],
          message: 'Aucun utilisateur trouvé'
        };
      }

      // Get all user IDs for additional queries
      const userIds = users.map((user: any) => user.id);

      // Fetch goals for all users in parallel
      const { data: goalsData, error: goalsError } = await withTimeout(
        supabase
          .from('goals')
          .select('id, user_id, name, target_amount, current_amount, target_date, priority, is_completed')
          .in('user_id', userIds),
        8000,
        'admin-goals'
      ) as any;

      if (goalsError) {
        console.warn('⚠️ Erreur lors de la récupération des objectifs:', goalsError);
      }

      // Fetch income transactions for current month for all users
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data: incomeTransactions, error: incomeError } = await withTimeout(
        supabase
          .from('transactions')
          .select('user_id, amount')
          .in('user_id', userIds)
          .eq('type', 'income')
          .gte('date', startOfMonth.toISOString())
          .lte('date', endOfMonth.toISOString()),
        8000,
        'admin-income'
      ) as any;

      if (incomeError) {
        console.warn('⚠️ Erreur lors de la récupération des transactions de revenus:', incomeError);
      }

      // Group goals by user_id
      const goalsByUser: Record<string, UserGoal[]> = {};
      if (goalsData) {
        (goalsData as any[]).forEach((goal: any) => {
          if (!goalsByUser[goal.user_id]) {
            goalsByUser[goal.user_id] = [];
          }
          goalsByUser[goal.user_id].push({
            id: goal.id,
            name: goal.name,
            targetAmount: goal.target_amount,
            currentAmount: goal.current_amount,
            targetDate: goal.target_date,
            priority: goal.priority,
            isCompleted: goal.is_completed
          });
        });
      }

      // Calculate monthly income for each user
      const incomeByUser: Record<string, number> = {};
      if (incomeTransactions) {
        (incomeTransactions as any[]).forEach((transaction: any) => {
          if (!incomeByUser[transaction.user_id]) {
            incomeByUser[transaction.user_id] = 0;
          }
          incomeByUser[transaction.user_id] += transaction.amount;
        });
      }

      const maintenant = Date.now();
      const SEUIL_DORMANT_MS = 60 * 24 * 60 * 60 * 1000;

      // Build enriched AdminUser objects
      const enrichedUsers: AdminUser[] = users.map((user: any) => {
        // Champs additionnels remontes directement par la RPC
        const userDetails = {
          profile_picture_url: user.profile_picture_url,
          preferences: user.preferences
        };

        // Calculate monthly income from transactions or fallback to preferences
        let monthlyIncome: number | null = incomeByUser[user.id] || null;

        // Fallback to preferences if no transaction data
        if (monthlyIncome === null && userDetails.preferences) {
          try {
            const preferences = typeof userDetails.preferences === 'string'
              ? JSON.parse(userDetails.preferences)
              : userDetails.preferences;

            if (preferences.priorityAnswers?.monthly_income) {
              const incomeRanges: Record<string, number> = {
                'low': 200000,
                'medium': 500000,
                'high': 1000000
              };
              monthlyIncome = incomeRanges[preferences.priorityAnswers.monthly_income] || null;
            }
          } catch (prefError) {
            console.warn('⚠️ Erreur lors du parsing des préférences pour l\'utilisateur:', user.id, prefError);
          }
        }

        const lastLoginInconnu = Boolean(user.last_login_inconnu);
        const transactionsCount = Number(user.transactions_count) || 0;
        const lastTransactionAt = user.last_transaction_at || null;
        const lastLoginMs = !lastLoginInconnu && user.last_login_at
          ? new Date(user.last_login_at).getTime()
          : null;

        // Pastille d'etat (priorite : fantome > jamais revenu > dormant > actif)
        let etat: AdminUserEtat;
        if (transactionsCount === 0) {
          etat = 'fantome';
        } else if (lastLoginInconnu || lastLoginMs === null) {
          etat = 'jamais-revenu';
        } else if (maintenant - lastLoginMs > SEUIL_DORMANT_MS) {
          etat = 'dormant';
        } else {
          etat = 'actif';
        }

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at || null,
          last_sync: user.last_sync,
          last_login_at: lastLoginInconnu ? null : (user.last_login_at || null),
          lastLoginInconnu,
          transactionsCount,
          lastTransactionAt,
          etat,
          isCurrentUser: user.id === currentUserId,
          profilePictureUrl: userDetails.profile_picture_url || null,
          goals: goalsByUser[user.id] || [],
          monthlyIncome
        };
      });

      console.log(`✅ Admin: Récupéré ${enrichedUsers.length} utilisateurs enrichis avec avatars, objectifs et revenus`);

      return {
        success: true,
        data: enrichedUsers,
        message: `${enrichedUsers.length} utilisateur(s) trouvé(s) avec données enrichies`
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des utilisateurs enrichis:', error);
      return {
        success: false,
        error: 'Erreur lors de la récupération des utilisateurs enrichis'
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
        if (estErreurDeSession(error)) {
          return { success: false, error: ERREUR_SESSION };
        }
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

  /**
   * Bandeau d'activite + courbes mensuelles + cohortes (admin seulement) - Bypass RLS.
   * Tout est calcule cote serveur, en heure locale Indian/Antananarivo.
   */
  async getActivite(): Promise<AdminResponse<AdminActivite>> {
    try {
      const isAdminUser = await this.isAdmin();
      if (!isAdminUser) {
        return {
          success: false,
          error: 'Acces refuse. Seuls les administrateurs peuvent consulter l\'activite.'
        };
      }

      const { data, error } = await withTimeout(
        supabase.rpc('get_admin_activite') as any,
        8000,
        'get_admin_activite'
      ) as any;

      if (error) {
        console.error('❌ Erreur RPC get_admin_activite:', error);
        if (estErreurDeSession(error)) {
          return { success: false, error: ERREUR_SESSION };
        }
        if (String(error.message || '').includes('Access denied')) {
          return { success: false, error: 'Acces refuse. Fonction admin uniquement.' };
        }
        throw error;
      }

      const brut = (data || {}) as any;
      const activite: AdminActivite = {
        indicateurs: {
          inscrits: Number(brut?.indicateurs?.inscrits) || 0,
          actifs7: Number(brut?.indicateurs?.actifs7) || 0,
          actifs30: Number(brut?.indicateurs?.actifs30) || 0,
          dormants: Number(brut?.indicateurs?.dormants) || 0,
          jamaisRevenus: Number(brut?.indicateurs?.jamaisRevenus) || 0,
          fantomes: Number(brut?.indicateurs?.fantomes) || 0
        },
        inscriptionsParMois: Array.isArray(brut?.inscriptionsParMois) ? brut.inscriptionsParMois : [],
        transactionsParMois: Array.isArray(brut?.transactionsParMois) ? brut.transactionsParMois : [],
        cohortes: Array.isArray(brut?.cohortes) ? brut.cohortes : [],
        diagnosticLastLogin: {
          total: Number(brut?.diagnosticLastLogin?.total) || 0,
          nuls: Number(brut?.diagnosticLastLogin?.nuls) || 0,
          egalCreation: Number(brut?.diagnosticLastLogin?.egalCreation) || 0,
          distincts: Number(brut?.diagnosticLastLogin?.distincts) || 0,
          plusRecent: brut?.diagnosticLastLogin?.plusRecent || null
        }
      };

      console.log('✅ Admin: activite recuperee via RPC:', activite.indicateurs);
      return { success: true, data: activite };
    } catch (error) {
      console.error('❌ Erreur lors de la recuperation de l\'activite:', error);
      return { success: false, error: 'Erreur lors de la recuperation de l\'activite' };
    }
  }
}

export default new AdminService();
