/**
 * Admin Cleanup Service - BazarKELY
 * 
 * This service provides manual cleanup functionality for orphaned auth.users entries
 * that remain after successful public.users deletion due to insufficient privileges.
 * 
 * SAFETY FEATURES:
 * - Non-invasive: Does not modify existing adminService.deleteUser() method
 * - Additive only: All new functionality, no modifications to existing code
 * - Comprehensive logging: Detailed reports for monitoring and troubleshooting
 * - Error handling: Graceful failure with detailed error reporting
 * - Admin-only access: Restricted to joelsoatra@gmail.com
 */

import { supabase } from '../lib/supabase';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface CleanupSummary {
  start_time: string;
  end_time: string;
  duration_seconds: number;
  orphaned_users_found: number;
  cleanup_attempts: number;
  successful_deletions: number;
  failed_deletions: number;
  success_rate: number;
}

export interface CleanupResult {
  user_id: string;
  email: string;
  created_at: string;
  cleanup_attempted: boolean;
  cleanup_successful: boolean;
  deletion_method: string;
  deletion_error: string;
  timestamp: string;
}

export interface CleanupResponse {
  cleanup_summary: CleanupSummary;
  cleanup_results: CleanupResult[];
  errors: string[];
  total_errors: number;
  status: 'complete_success' | 'partial_success' | 'complete_failure' | 'function_failure';
}

export interface TestCleanupResponse {
  test_type: string;
  orphaned_users_count: number;
  cleanup_function_exists: boolean;
  trigger_exists: boolean;
  monitoring_view_exists: boolean;
  timestamp: string;
}

export interface AdminCleanupResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// =====================================================
// ADMIN CLEANUP SERVICE CLASS
// =====================================================

class AdminCleanupService {
  /**
   * Vérifier si l'utilisateur actuel est admin (joelsoatra@gmail.com)
   */
  private async isAdmin(): Promise<boolean> {
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
   * Tester le système de nettoyage sans effectuer de suppressions
   * Permet de vérifier l'état du système et compter les utilisateurs orphelins
   */
  async testCleanupSystem(): Promise<AdminCleanupResponse<TestCleanupResponse>> {
    try {
      const isAdminUser = await this.isAdmin();
      if (!isAdminUser) {
        return { 
          success: false, 
          error: 'Accès refusé. Seuls les administrateurs peuvent tester le système de nettoyage.' 
        };
      }

      console.log('🧪 Test du système de nettoyage des utilisateurs orphelins...');

      // Appel de la fonction de test SQL
      const { data: testResult, error } = await supabase.rpc('test_cleanup_orphaned_auth_users');

      if (error) {
        console.error('❌ Erreur lors du test du système:', error);
        return { 
          success: false, 
          error: 'Erreur lors du test du système de nettoyage: ' + error.message 
        };
      }

      console.log('✅ Test du système réussi:', testResult);

      return {
        success: true,
        data: testResult as TestCleanupResponse,
        message: `Système de nettoyage testé avec succès. ${testResult.orphaned_users_count} utilisateurs orphelins détectés.`
      };

    } catch (error) {
      console.error('❌ Erreur lors du test du système de nettoyage:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors du test du système de nettoyage' 
      };
    }
  }

  /**
   * Nettoyer manuellement les utilisateurs auth.users orphelins
   * Cette fonction appelle la fonction SQL cleanup_orphaned_auth_users()
   */
  async cleanupOrphanedAuthUsers(): Promise<AdminCleanupResponse<CleanupResponse>> {
    try {
      const isAdminUser = await this.isAdmin();
      if (!isAdminUser) {
        return { 
          success: false, 
          error: 'Accès refusé. Seuls les administrateurs peuvent nettoyer les utilisateurs orphelins.' 
        };
      }

      console.log('🧹 Démarrage du nettoyage manuel des utilisateurs orphelins...');

      // Appel de la fonction de nettoyage SQL
      const { data: cleanupResult, error } = await supabase.rpc('cleanup_orphaned_auth_users');

      if (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
        return { 
          success: false, 
          error: 'Erreur lors du nettoyage des utilisateurs orphelins: ' + error.message 
        };
      }

      const result = cleanupResult as CleanupResponse;
      
      // Log des résultats
      console.log('📊 Résultats du nettoyage:', result.cleanup_summary);
      
      if (result.cleanup_summary.successful_deletions > 0) {
        console.log(`✅ ${result.cleanup_summary.successful_deletions} utilisateurs orphelins nettoyés avec succès`);
      }
      
      if (result.cleanup_summary.failed_deletions > 0) {
        console.warn(`⚠️ ${result.cleanup_summary.failed_deletions} échecs de nettoyage`);
      }

      // Déterminer le message de succès
      let message = '';
      if (result.status === 'complete_success') {
        message = `Nettoyage complet réussi: ${result.cleanup_summary.successful_deletions} utilisateurs orphelins supprimés.`;
      } else if (result.status === 'partial_success') {
        message = `Nettoyage partiellement réussi: ${result.cleanup_summary.successful_deletions} supprimés, ${result.cleanup_summary.failed_deletions} échecs.`;
      } else if (result.status === 'complete_failure') {
        message = `Nettoyage échoué: ${result.cleanup_summary.failed_deletions} échecs. Vérifiez les logs pour plus de détails.`;
      } else {
        message = `Nettoyage terminé avec des problèmes: ${result.cleanup_summary.failed_deletions} échecs.`;
      }

      return {
        success: true,
        data: result,
        message: message
      };

    } catch (error) {
      console.error('❌ Erreur lors du nettoyage des utilisateurs orphelins:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors du nettoyage des utilisateurs orphelins' 
      };
    }
  }

  /**
   * Obtenir la liste des utilisateurs auth.users orphelins pour monitoring
   * Utilise la vue orphaned_auth_users_monitor
   */
  async getOrphanedUsersList(): Promise<AdminCleanupResponse<any[]>> {
    try {
      const isAdminUser = await this.isAdmin();
      if (!isAdminUser) {
        return { 
          success: false, 
          error: 'Accès refusé. Seuls les administrateurs peuvent consulter la liste des utilisateurs orphelins.' 
        };
      }

      console.log('📋 Récupération de la liste des utilisateurs orphelins...');

      // Requête sur la vue de monitoring
      const { data: orphanedUsers, error } = await supabase
        .from('orphaned_auth_users_monitor')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur lors de la récupération des utilisateurs orphelins:', error);
        return { 
          success: false, 
          error: 'Erreur lors de la récupération des utilisateurs orphelins: ' + error.message 
        };
      }

      console.log(`📊 ${orphanedUsers?.length || 0} utilisateurs orphelins trouvés`);

      return {
        success: true,
        data: orphanedUsers || [],
        message: `${orphanedUsers?.length || 0} utilisateurs orphelins trouvés.`
      };

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des utilisateurs orphelins:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de la récupération des utilisateurs orphelins' 
      };
    }
  }

  /**
   * Obtenir les statistiques de nettoyage pour monitoring
   * Combine les informations de la vue de monitoring avec des statistiques
   */
  async getCleanupStats(): Promise<AdminCleanupResponse<{
    total_orphaned: number;
    oldest_orphaned: string | null;
    newest_orphaned: string | null;
    avg_age_days: number;
    cleanup_system_healthy: boolean;
  }>> {
    try {
      const isAdminUser = await this.isAdmin();
      if (!isAdminUser) {
        return { 
          success: false, 
          error: 'Accès refusé. Seuls les administrateurs peuvent consulter les statistiques de nettoyage.' 
        };
      }

      console.log('📊 Calcul des statistiques de nettoyage...');

      // Récupérer la liste des utilisateurs orphelins
      const orphanedUsersResponse = await this.getOrphanedUsersList();
      
      if (!orphanedUsersResponse.success || !orphanedUsersResponse.data) {
        return {
          success: false,
          error: 'Impossible de récupérer les données pour les statistiques'
        };
      }

      const orphanedUsers = orphanedUsersResponse.data;
      const totalOrphaned = orphanedUsers.length;

      if (totalOrphaned === 0) {
        return {
          success: true,
          data: {
            total_orphaned: 0,
            oldest_orphaned: null,
            newest_orphaned: null,
            avg_age_days: 0,
            cleanup_system_healthy: true
          },
          message: 'Aucun utilisateur orphelin détecté. Système de nettoyage en bonne santé.'
        };
      }

      // Calculer les statistiques
      const createdDates = orphanedUsers.map(user => new Date(user.created_at));
      const oldestOrphaned = new Date(Math.min(...createdDates.map(d => d.getTime())));
      const newestOrphaned = new Date(Math.max(...createdDates.map(d => d.getTime())));
      
      const now = new Date();
      const avgAgeDays = orphanedUsers.reduce((sum, user) => {
        const ageDays = (now.getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return sum + ageDays;
      }, 0) / totalOrphaned;

      // Le système est considéré comme sain si moins de 10 utilisateurs orphelins
      // et que l'âge moyen est inférieur à 7 jours
      const cleanupSystemHealthy = totalOrphaned < 10 && avgAgeDays < 7;

      const stats = {
        total_orphaned: totalOrphaned,
        oldest_orphaned: oldestOrphaned.toISOString(),
        newest_orphaned: newestOrphaned.toISOString(),
        avg_age_days: Math.round(avgAgeDays * 100) / 100,
        cleanup_system_healthy: cleanupSystemHealthy
      };

      console.log('📊 Statistiques de nettoyage calculées:', stats);

      return {
        success: true,
        data: stats,
        message: `Statistiques calculées: ${totalOrphaned} utilisateurs orphelins, âge moyen ${Math.round(avgAgeDays)} jours.`
      };

    } catch (error) {
      console.error('❌ Erreur lors du calcul des statistiques de nettoyage:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors du calcul des statistiques de nettoyage' 
      };
    }
  }

  /**
   * Effectuer un nettoyage complet avec rapport détaillé
   * Combine test, nettoyage et statistiques
   */
  async performFullCleanup(): Promise<AdminCleanupResponse<{
    test_result: TestCleanupResponse;
    cleanup_result: CleanupResponse;
    stats_result: any;
    summary: {
      orphaned_before: number;
      orphaned_after: number;
      cleaned_up: number;
      success_rate: number;
    };
  }>> {
    try {
      const isAdminUser = await this.isAdmin();
      if (!isAdminUser) {
        return { 
          success: false, 
          error: 'Accès refusé. Seuls les administrateurs peuvent effectuer un nettoyage complet.' 
        };
      }

      console.log('🔄 Démarrage du nettoyage complet...');

      // 1. Test du système
      const testResponse = await this.testCleanupSystem();
      if (!testResponse.success) {
        return {
          success: false,
          error: 'Échec du test du système: ' + testResponse.error
        };
      }

      const orphanedBefore = testResponse.data?.orphaned_users_count || 0;

      // 2. Nettoyage
      const cleanupResponse = await this.cleanupOrphanedAuthUsers();
      if (!cleanupResponse.success) {
        return {
          success: false,
          error: 'Échec du nettoyage: ' + cleanupResponse.error
        };
      }

      // 3. Statistiques après nettoyage
      const statsResponse = await this.getCleanupStats();
      if (!statsResponse.success) {
        return {
          success: false,
          error: 'Échec du calcul des statistiques: ' + statsResponse.error
        };
      }

      const orphanedAfter = statsResponse.data?.total_orphaned || 0;
      const cleanedUp = orphanedBefore - orphanedAfter;
      const successRate = orphanedBefore > 0 ? (cleanedUp / orphanedBefore) * 100 : 100;

      const summary = {
        orphaned_before: orphanedBefore,
        orphaned_after: orphanedAfter,
        cleaned_up: cleanedUp,
        success_rate: Math.round(successRate * 100) / 100
      };

      console.log('✅ Nettoyage complet terminé:', summary);

      return {
        success: true,
        data: {
          test_result: testResponse.data!,
          cleanup_result: cleanupResponse.data!,
          stats_result: statsResponse.data!,
          summary: summary
        },
        message: `Nettoyage complet terminé: ${cleanedUp} utilisateurs nettoyés (${successRate.toFixed(1)}% de succès).`
      };

    } catch (error) {
      console.error('❌ Erreur lors du nettoyage complet:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors du nettoyage complet' 
      };
    }
  }
}

// =====================================================
// EXPORT SINGLETON INSTANCE
// =====================================================

export default new AdminCleanupService();



















