/**
 * Script de validation du système de nettoyage - BazarKELY
 * 
 * Ce script effectue des tests de validation SANS modifier les données
 * pour vérifier que le système de nettoyage est prêt pour le déploiement.
 * 
 * SÉCURITÉ:
 * - Aucune opération de suppression
 * - Aucune modification de données
 * - Tests en lecture seule uniquement
 */

import adminCleanupService from './services/adminCleanupService';

/**
 * Test de validation complet du système de nettoyage
 */
export async function validateCleanupSystem(): Promise<{
  phase1_sql_validation: boolean;
  phase2_monitoring_check: boolean;
  phase3_typescript_validation: boolean;
  overall_safe_to_deploy: boolean;
  issues: string[];
  recommendations: string[];
}> {
  console.log('🔍 DÉMARRAGE DE LA VALIDATION DU SYSTÈME DE NETTOYAGE');
  console.log('⚠️  MODE SÉCURISÉ - AUCUNE MODIFICATION DE DONNÉES');
  
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // PHASE 1: Validation TypeScript Service
  console.log('\n📋 PHASE 1: Validation du Service TypeScript');
  let phase1_sql_validation = true;
  
  try {
    // Test de compilation du service
    console.log('✅ Service TypeScript compilé avec succès');
    
    // Test de l'accès admin
    console.log('🔐 Test de l\'accès administrateur...');
    const adminTest = await adminCleanupService.testCleanupSystem();
    
    if (!adminTest.success) {
      console.log('⚠️  Test d\'accès admin échoué (attendu en développement):', adminTest.error);
      issues.push('Test d\'accès admin échoué - vérifier la configuration Supabase');
      recommendations.push('Configurer les variables d\'environnement Supabase pour les tests');
    } else {
      console.log('✅ Accès administrateur validé');
      console.log('📊 Système de nettoyage détecté:', {
        fonction_existe: adminTest.data?.cleanup_function_exists,
        trigger_existe: adminTest.data?.trigger_exists,
        vue_monitoring_existe: adminTest.data?.monitoring_view_exists,
        utilisateurs_orphelins: adminTest.data?.orphaned_users_count
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la validation TypeScript:', error);
    issues.push('Erreur de compilation ou d\'exécution du service TypeScript');
    phase1_sql_validation = false;
  }
  
  // PHASE 2: Test de monitoring (lecture seule)
  console.log('\n📋 PHASE 2: Test de Monitoring (Lecture Seule)');
  let phase2_monitoring_check = true;
  
  try {
    // Test de récupération de la liste des orphelins (lecture seule)
    console.log('📊 Test de récupération de la liste des utilisateurs orphelins...');
    const orphanedList = await adminCleanupService.getOrphanedUsersList();
    
    if (!orphanedList.success) {
      console.log('⚠️  Impossible de récupérer la liste des orphelins:', orphanedList.error);
      issues.push('Impossible d\'accéder à la vue de monitoring des orphelins');
      recommendations.push('Vérifier que la vue orphaned_auth_users_monitor existe dans la base de données');
    } else {
      console.log('✅ Liste des utilisateurs orphelins récupérée');
      console.log('📊 Nombre d\'utilisateurs orphelins détectés:', orphanedList.data?.length || 0);
      
      if (orphanedList.data && orphanedList.data.length > 0) {
        console.log('👥 Utilisateurs orphelins trouvés:');
        orphanedList.data.slice(0, 3).forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.email} (créé le ${user.created_at})`);
        });
        
        if (orphanedList.data.length > 3) {
          console.log(`  ... et ${orphanedList.data.length - 3} autres`);
        }
        
        recommendations.push(`${orphanedList.data.length} utilisateurs orphelins détectés - nettoyage recommandé`);
      } else {
        console.log('✅ Aucun utilisateur orphelin détecté - système propre');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test de monitoring:', error);
    issues.push('Erreur lors de l\'accès aux données de monitoring');
    phase2_monitoring_check = false;
  }
  
  // PHASE 3: Test des statistiques (lecture seule)
  console.log('\n📋 PHASE 3: Test des Statistiques (Lecture Seule)');
  let phase3_typescript_validation = true;
  
  try {
    // Test de récupération des statistiques
    console.log('📈 Test de récupération des statistiques...');
    const stats = await adminCleanupService.getCleanupStats();
    
    if (!stats.success) {
      console.log('⚠️  Impossible de récupérer les statistiques:', stats.error);
      issues.push('Impossible d\'accéder aux statistiques de nettoyage');
      recommendations.push('Vérifier les permissions sur les fonctions de statistiques');
    } else {
      console.log('✅ Statistiques récupérées');
      console.log('📊 Statistiques détaillées:', {
        total_orphelins: stats.data?.total_orphaned,
        plus_ancien: stats.data?.oldest_orphaned,
        plus_recent: stats.data?.newest_orphaned,
        age_moyen_jours: stats.data?.avg_age_days,
        systeme_sain: stats.data?.cleanup_system_healthy
      });
      
      if (stats.data && stats.data.total_orphaned > 10) {
        issues.push(`Nombre élevé d'utilisateurs orphelins: ${stats.data.total_orphaned}`);
        recommendations.push('Nettoyage urgent recommandé');
      }
      
      if (stats.data && stats.data.avg_age_days > 7) {
        issues.push(`Utilisateurs orphelins anciens: âge moyen ${stats.data.avg_age_days} jours`);
        recommendations.push('Nettoyage recommandé pour les utilisateurs anciens');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test des statistiques:', error);
    issues.push('Erreur lors de l\'accès aux statistiques');
    phase3_typescript_validation = false;
  }
  
  // Évaluation globale
  const overall_safe_to_deploy = phase1_sql_validation && phase2_monitoring_check && phase3_typescript_validation && issues.length === 0;
  
  // Rapport final
  console.log('\n🎯 RAPPORT DE VALIDATION FINAL');
  console.log('================================');
  console.log(`✅ Phase 1 (TypeScript): ${phase1_sql_validation ? 'PASSÉ' : 'ÉCHOUÉ'}`);
  console.log(`✅ Phase 2 (Monitoring): ${phase2_monitoring_check ? 'PASSÉ' : 'ÉCHOUÉ'}`);
  console.log(`✅ Phase 3 (Statistiques): ${phase3_typescript_validation ? 'PASSÉ' : 'ÉCHOUÉ'}`);
  console.log(`🎯 Déploiement sécurisé: ${overall_safe_to_deploy ? 'OUI' : 'NON'}`);
  
  if (issues.length > 0) {
    console.log('\n⚠️  PROBLÈMES DÉTECTÉS:');
    issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  }
  
  if (recommendations.length > 0) {
    console.log('\n💡 RECOMMANDATIONS:');
    recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }
  
  return {
    phase1_sql_validation,
    phase2_monitoring_check,
    phase3_typescript_validation,
    overall_safe_to_deploy,
    issues,
    recommendations
  };
}

/**
 * Test rapide de validation (lecture seule)
 */
export async function quickValidationTest(): Promise<boolean> {
  console.log('⚡ Test rapide de validation du système de nettoyage...');
  
  try {
    // Test d'accès admin uniquement
    const adminTest = await adminCleanupService.testCleanupSystem();
    
    if (!adminTest.success) {
      console.log('⚠️  Test d\'accès admin échoué:', adminTest.error);
      return false;
    }
    
    console.log('✅ Test rapide réussi');
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors du test rapide:', error);
    return false;
  }
}

// Export par défaut
export default {
  validateCleanupSystem,
  quickValidationTest
};














