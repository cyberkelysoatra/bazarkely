/**
 * Test d'intégration pour le système de nettoyage des utilisateurs orphelins
 * 
 * Ce fichier de test peut être exécuté pour valider l'intégration
 * du système de nettoyage sans affecter le code de production.
 * 
 * USAGE:
 * 1. Importer dans un composant de test ou exécuter directement
 * 2. Vérifier les logs dans la console
 * 3. Supprimer ce fichier après validation
 */

import adminCleanupService from './services/adminCleanupService';

/**
 * Test complet du système de nettoyage
 */
export async function testCleanupIntegration(): Promise<boolean> {
  console.log('🧪 Démarrage des tests d\'intégration du système de nettoyage...');
  
  try {
    // Test 1: Vérification de l'accès admin
    console.log('\n📋 Test 1: Vérification de l\'accès admin');
    const adminTest = await adminCleanupService.testCleanupSystem();
    
    if (!adminTest.success) {
      console.error('❌ Échec du test d\'accès admin:', adminTest.error);
      return false;
    }
    
    console.log('✅ Accès admin validé');
    console.log('📊 Système de nettoyage:', {
      fonction_existe: adminTest.data?.cleanup_function_exists,
      trigger_existe: adminTest.data?.trigger_exists,
      vue_monitoring_existe: adminTest.data?.monitoring_view_exists,
      utilisateurs_orphelins: adminTest.data?.orphaned_users_count
    });

    // Test 2: Récupération de la liste des utilisateurs orphelins
    console.log('\n📋 Test 2: Récupération de la liste des utilisateurs orphelins');
    const orphanedList = await adminCleanupService.getOrphanedUsersList();
    
    if (!orphanedList.success) {
      console.error('❌ Échec de la récupération de la liste:', orphanedList.error);
      return false;
    }
    
    console.log('✅ Liste des utilisateurs orphelins récupérée');
    console.log('📊 Nombre d\'utilisateurs orphelins:', orphanedList.data?.length || 0);
    
    if (orphanedList.data && orphanedList.data.length > 0) {
      console.log('👥 Utilisateurs orphelins détectés:');
      orphanedList.data.slice(0, 5).forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (créé le ${user.created_at})`);
      });
      
      if (orphanedList.data.length > 5) {
        console.log(`  ... et ${orphanedList.data.length - 5} autres`);
      }
    } else {
      console.log('✅ Aucun utilisateur orphelin détecté');
    }

    // Test 3: Récupération des statistiques
    console.log('\n📋 Test 3: Récupération des statistiques');
    const stats = await adminCleanupService.getCleanupStats();
    
    if (!stats.success) {
      console.error('❌ Échec de la récupération des statistiques:', stats.error);
      return false;
    }
    
    console.log('✅ Statistiques récupérées');
    console.log('📊 Statistiques détaillées:', {
      total_orphelins: stats.data?.total_orphaned,
      plus_ancien: stats.data?.oldest_orphaned,
      plus_recent: stats.data?.newest_orphaned,
      age_moyen_jours: stats.data?.avg_age_days,
      systeme_sain: stats.data?.cleanup_system_healthy
    });

    // Test 4: Nettoyage manuel (si des orphelins existent)
    if (orphanedList.data && orphanedList.data.length > 0) {
      console.log('\n📋 Test 4: Nettoyage manuel des utilisateurs orphelins');
      const cleanup = await adminCleanupService.cleanupOrphanedAuthUsers();
      
      if (!cleanup.success) {
        console.error('❌ Échec du nettoyage:', cleanup.error);
        return false;
      }
      
      console.log('✅ Nettoyage exécuté');
      console.log('📊 Résultats du nettoyage:', {
        utilisateurs_trouves: cleanup.data?.cleanup_summary.orphaned_users_found,
        tentatives_nettoyage: cleanup.data?.cleanup_summary.cleanup_attempts,
        suppressions_reussies: cleanup.data?.cleanup_summary.successful_deletions,
        suppressions_echouees: cleanup.data?.cleanup_summary.failed_deletions,
        taux_succes: cleanup.data?.cleanup_summary.success_rate + '%',
        statut: cleanup.data?.status
      });
      
      // Afficher les détails des résultats
      if (cleanup.data?.cleanup_results && cleanup.data.cleanup_results.length > 0) {
        console.log('🔍 Détails des résultats de nettoyage:');
        cleanup.data.cleanup_results.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.email}: ${result.cleanup_successful ? '✅' : '❌'} (${result.deletion_method})`);
          if (result.deletion_error) {
            console.log(`     Erreur: ${result.deletion_error}`);
          }
        });
      }
    } else {
      console.log('⏭️ Test 4: Aucun utilisateur orphelin à nettoyer');
    }

    // Test 5: Nettoyage complet (test final)
    console.log('\n📋 Test 5: Nettoyage complet');
    const fullCleanup = await adminCleanupService.performFullCleanup();
    
    if (!fullCleanup.success) {
      console.error('❌ Échec du nettoyage complet:', fullCleanup.error);
      return false;
    }
    
    console.log('✅ Nettoyage complet exécuté');
    console.log('📊 Résumé du nettoyage complet:', {
      orphelins_avant: fullCleanup.data?.summary.orphaned_before,
      orphelins_apres: fullCleanup.data?.summary.orphaned_after,
      nettoyes: fullCleanup.data?.summary.cleaned_up,
      taux_succes: fullCleanup.data?.summary.success_rate + '%'
    });

    // Résumé final
    console.log('\n🎉 Tous les tests d\'intégration ont réussi !');
    console.log('✅ Le système de nettoyage des utilisateurs orphelins est opérationnel');
    
    return true;

  } catch (error) {
    console.error('❌ Erreur lors des tests d\'intégration:', error);
    return false;
  }
}

/**
 * Test rapide du système (sans nettoyage)
 */
export async function quickCleanupTest(): Promise<boolean> {
  console.log('⚡ Test rapide du système de nettoyage...');
  
  try {
    // Test d'accès admin uniquement
    const adminTest = await adminCleanupService.testCleanupSystem();
    
    if (!adminTest.success) {
      console.error('❌ Échec du test d\'accès admin:', adminTest.error);
      return false;
    }
    
    console.log('✅ Test rapide réussi');
    console.log('📊 Système de nettoyage opérationnel');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors du test rapide:', error);
    return false;
  }
}

/**
 * Fonction utilitaire pour exécuter les tests
 */
export async function runCleanupTests(): Promise<void> {
  console.log('🚀 Démarrage des tests du système de nettoyage...');
  
  // Test rapide d'abord
  const quickTest = await quickCleanupTest();
  if (!quickTest) {
    console.error('❌ Test rapide échoué, arrêt des tests');
    return;
  }
  
  // Test complet
  const fullTest = await testCleanupIntegration();
  if (fullTest) {
    console.log('🎉 Tous les tests ont réussi !');
  } else {
    console.error('❌ Certains tests ont échoué');
  }
}

// Export par défaut pour utilisation directe
export default {
  testCleanupIntegration,
  quickCleanupTest,
  runCleanupTests
};






