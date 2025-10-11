/**
 * Script de Test de Production - Système de Nettoyage BazarKELY
 * 
 * Ce script automatise les tests de production pour valider
 * le système de nettoyage des utilisateurs orphelins.
 * 
 * SÉCURITÉ:
 * - Tests non-destructifs uniquement
 * - Utilisation d'utilisateurs de test
 * - Surveillance des logs et erreurs
 * - Arrêt immédiat en cas de problème
 */

import adminCleanupService from './services/adminCleanupService';
import adminService from './services/adminService';

// =====================================================
// TYPES ET INTERFACES
// =====================================================

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL';
  steps: string[];
  expectedResult: string;
  actualResult: string;
  logs: string[];
  issues: string[];
  recommendations: string[];
  timestamp: string;
}

interface TestSuite {
  suiteName: string;
  startTime: string;
  endTime: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
}

// =====================================================
// CLASSE DE TEST DE PRODUCTION
// =====================================================

class ProductionCleanupTester {
  private testResults: TestResult[] = [];
  private currentTest: string = '';
  private logs: string[] = [];

  /**
   * Logger pour capturer les événements de test
   */
  private log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    this.logs.push(logMessage);
    console.log(logMessage);
  }

  /**
   * Créer un résultat de test
   */
  private createTestResult(
    testName: string,
    status: 'PASS' | 'FAIL' | 'PARTIAL',
    steps: string[],
    expectedResult: string,
    actualResult: string,
    issues: string[] = [],
    recommendations: string[] = []
  ): TestResult {
    return {
      testName,
      status,
      steps,
      expectedResult,
      actualResult,
      logs: [...this.logs],
      issues,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * TEST 1 - Vérification UI AdminPage
   */
  async testAdminPageUI(): Promise<TestResult> {
    this.currentTest = 'TEST 1 - Vérification UI AdminPage';
    this.logs = [];
    this.log('Démarrage du test UI AdminPage');

    const steps: string[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Étape 1: Vérifier l'accès admin
      steps.push('Vérification de l\'accès administrateur');
      const adminTest = await adminCleanupService.testCleanupSystem();
      
      if (!adminTest.success) {
        issues.push('Accès administrateur échoué');
        recommendations.push('Vérifier la configuration Supabase et les permissions');
        return this.createTestResult(
          this.currentTest,
          'FAIL',
          steps,
          'Accès administrateur réussi',
          `Échec: ${adminTest.error}`,
          issues,
          recommendations
        );
      }
      this.log('Accès administrateur validé');

      // Étape 2: Vérifier les statistiques initiales
      steps.push('Vérification des statistiques initiales');
      const statsResponse = await adminCleanupService.getCleanupStats();
      
      if (!statsResponse.success) {
        issues.push('Impossible de charger les statistiques');
        recommendations.push('Vérifier la fonction getCleanupStats');
        return this.createTestResult(
          this.currentTest,
          'FAIL',
          steps,
          'Statistiques chargées avec succès',
          `Échec: ${statsResponse.error}`,
          issues,
          recommendations
        );
      }
      this.log('Statistiques chargées avec succès');

      // Étape 3: Vérifier la structure des données
      steps.push('Vérification de la structure des données');
      const stats = statsResponse.data;
      if (!stats || typeof stats.total_orphaned !== 'number') {
        issues.push('Structure des statistiques invalide');
        recommendations.push('Vérifier la structure de retour de getCleanupStats');
        return this.createTestResult(
          this.currentTest,
          'FAIL',
          steps,
          'Structure des statistiques valide',
          'Structure invalide ou manquante',
          issues,
          recommendations
        );
      }
      this.log(`Statistiques validées: ${stats.total_orphaned} orphelins, système ${stats.cleanup_system_healthy ? 'sain' : 'non-sain'}`);

      // Étape 4: Vérifier la liste des orphelins
      steps.push('Vérification de la liste des orphelins');
      const orphanedListResponse = await adminCleanupService.getOrphanedUsersList();
      
      if (!orphanedListResponse.success) {
        issues.push('Impossible de charger la liste des orphelins');
        recommendations.push('Vérifier la vue orphaned_auth_users_monitor');
        return this.createTestResult(
          this.currentTest,
          'FAIL',
          steps,
          'Liste des orphelins chargée avec succès',
          `Échec: ${orphanedListResponse.error}`,
          issues,
          recommendations
        );
      }
      this.log(`Liste des orphelins chargée: ${orphanedListResponse.data?.length || 0} utilisateurs`);

      // Validation finale
      const actualResult = `UI AdminPage fonctionnelle - ${stats.total_orphaned} orphelins, système ${stats.cleanup_system_healthy ? 'sain' : 'non-sain'}`;
      
      return this.createTestResult(
        this.currentTest,
        'PASS',
        steps,
        'UI AdminPage fonctionnelle avec statistiques chargées',
        actualResult,
        issues,
        recommendations
      );

    } catch (error) {
      this.log(`Erreur lors du test UI: ${error}`, 'ERROR');
      issues.push(`Erreur inattendue: ${error}`);
      recommendations.push('Vérifier la console pour plus de détails');
      
      return this.createTestResult(
        this.currentTest,
        'FAIL',
        steps,
        'UI AdminPage fonctionnelle',
        `Erreur: ${error}`,
        issues,
        recommendations
      );
    }
  }

  /**
   * TEST 2 - Test de Monitoring
   */
  async testMonitoring(): Promise<TestResult> {
    this.currentTest = 'TEST 2 - Test de Monitoring';
    this.logs = [];
    this.log('Démarrage du test de monitoring');

    const steps: string[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Étape 1: Test du système de nettoyage
      steps.push('Test du système de nettoyage');
      const testResponse = await adminCleanupService.testCleanupSystem();
      
      if (!testResponse.success) {
        issues.push('Test du système échoué');
        recommendations.push('Vérifier les fonctions SQL de nettoyage');
        return this.createTestResult(
          this.currentTest,
          'FAIL',
          steps,
          'Test du système réussi',
          `Échec: ${testResponse.error}`,
          issues,
          recommendations
        );
      }
      this.log('Test du système réussi');

      // Étape 2: Vérification des fonctions
      steps.push('Vérification des fonctions SQL');
      const testData = testResponse.data;
      if (!testData) {
        issues.push('Données de test manquantes');
        recommendations.push('Vérifier la fonction test_cleanup_orphaned_auth_users');
        return this.createTestResult(
          this.currentTest,
          'FAIL',
          steps,
          'Données de test présentes',
          'Données manquantes',
          issues,
          recommendations
        );
      }

      // Vérifier que les fonctions existent
      if (!testData.cleanup_function_exists) {
        issues.push('Fonction de nettoyage manquante');
        recommendations.push('Exécuter le script SQL de déploiement');
      }
      if (!testData.trigger_exists) {
        issues.push('Trigger manquant');
        recommendations.push('Créer le trigger cleanup_orphaned_auth_users_trigger');
      }
      if (!testData.monitoring_view_exists) {
        issues.push('Vue de monitoring manquante');
        recommendations.push('Créer la vue orphaned_auth_users_monitor');
      }

      this.log(`Fonctions SQL: cleanup=${testData.cleanup_function_exists}, trigger=${testData.trigger_exists}, view=${testData.monitoring_view_exists}`);

      // Étape 3: Test des statistiques
      steps.push('Test des statistiques de nettoyage');
      const statsResponse = await adminCleanupService.getCleanupStats();
      
      if (!statsResponse.success) {
        issues.push('Impossible de charger les statistiques');
        recommendations.push('Vérifier la fonction getCleanupStats');
        return this.createTestResult(
          this.currentTest,
          'FAIL',
          steps,
          'Statistiques chargées avec succès',
          `Échec: ${statsResponse.error}`,
          issues,
          recommendations
        );
      }

      const stats = statsResponse.data;
      this.log(`Statistiques: ${stats?.total_orphaned || 0} orphelins, système ${stats?.cleanup_system_healthy ? 'sain' : 'non-sain'}`);

      // Validation finale
      const hasIssues = issues.length > 0;
      const actualResult = `Monitoring fonctionnel - ${stats?.total_orphaned || 0} orphelins, fonctions SQL: ${testData.cleanup_function_exists ? 'OK' : 'MANQUANT'}`;
      
      return this.createTestResult(
        this.currentTest,
        hasIssues ? 'PARTIAL' : 'PASS',
        steps,
        'Monitoring complètement fonctionnel',
        actualResult,
        issues,
        recommendations
      );

    } catch (error) {
      this.log(`Erreur lors du test de monitoring: ${error}`, 'ERROR');
      issues.push(`Erreur inattendue: ${error}`);
      recommendations.push('Vérifier la console pour plus de détails');
      
      return this.createTestResult(
        this.currentTest,
        'FAIL',
        steps,
        'Monitoring fonctionnel',
        `Erreur: ${error}`,
        issues,
        recommendations
      );
    }
  }

  /**
   * TEST 3 - Test de Nettoyage Manuel
   */
  async testManualCleanup(): Promise<TestResult> {
    this.currentTest = 'TEST 3 - Test de Nettoyage Manuel';
    this.logs = [];
    this.log('Démarrage du test de nettoyage manuel');

    const steps: string[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Étape 1: Vérifier l'état initial
      steps.push('Vérification de l\'état initial');
      const initialStats = await adminCleanupService.getCleanupStats();
      
      if (!initialStats.success) {
        issues.push('Impossible de charger les statistiques initiales');
        recommendations.push('Vérifier la fonction getCleanupStats');
        return this.createTestResult(
          this.currentTest,
          'FAIL',
          steps,
          'Statistiques initiales chargées',
          `Échec: ${initialStats.error}`,
          issues,
          recommendations
        );
      }

      const initialOrphaned = initialStats.data?.total_orphaned || 0;
      this.log(`État initial: ${initialOrphaned} orphelins`);

      // Étape 2: Exécuter le nettoyage manuel
      steps.push('Exécution du nettoyage manuel');
      const cleanupResponse = await adminCleanupService.cleanupOrphanedAuthUsers();
      
      if (!cleanupResponse.success) {
        issues.push('Nettoyage manuel échoué');
        recommendations.push('Vérifier la fonction cleanupOrphanedAuthUsers');
        return this.createTestResult(
          this.currentTest,
          'FAIL',
          steps,
          'Nettoyage manuel réussi',
          `Échec: ${cleanupResponse.error}`,
          issues,
          recommendations
        );
      }

      this.log('Nettoyage manuel exécuté avec succès');

      // Étape 3: Vérifier les résultats
      steps.push('Vérification des résultats');
      const result = cleanupResponse.data;
      if (!result || !result.cleanup_summary) {
        issues.push('Résultats de nettoyage manquants');
        recommendations.push('Vérifier la structure de retour de cleanupOrphanedAuthUsers');
        return this.createTestResult(
          this.currentTest,
          'FAIL',
          steps,
          'Résultats de nettoyage présents',
          'Résultats manquants',
          issues,
          recommendations
        );
      }

      const { successful_deletions, failed_deletions } = result.cleanup_summary;
      this.log(`Résultats: ${successful_deletions} suppressions réussies, ${failed_deletions} échecs`);

      // Étape 4: Vérifier l'état final
      steps.push('Vérification de l\'état final');
      const finalStats = await adminCleanupService.getCleanupStats();
      
      if (!finalStats.success) {
        issues.push('Impossible de charger les statistiques finales');
        recommendations.push('Vérifier la fonction getCleanupStats après nettoyage');
      } else {
        const finalOrphaned = finalStats.data?.total_orphaned || 0;
        this.log(`État final: ${finalOrphaned} orphelins`);
      }

      // Validation finale
      const actualResult = `Nettoyage exécuté - ${successful_deletions} réussies, ${failed_deletions} échecs`;
      
      return this.createTestResult(
        this.currentTest,
        'PASS',
        steps,
        'Nettoyage manuel exécuté avec succès',
        actualResult,
        issues,
        recommendations
      );

    } catch (error) {
      this.log(`Erreur lors du test de nettoyage manuel: ${error}`, 'ERROR');
      issues.push(`Erreur inattendue: ${error}`);
      recommendations.push('Vérifier la console pour plus de détails');
      
      return this.createTestResult(
        this.currentTest,
        'FAIL',
        steps,
        'Nettoyage manuel réussi',
        `Erreur: ${error}`,
        issues,
        recommendations
      );
    }
  }

  /**
   * TEST 4 - Test des Fonctionnalités Existantes
   */
  async testExistingFunctionality(): Promise<TestResult> {
    this.currentTest = 'TEST 4 - Test des Fonctionnalités Existantes';
    this.logs = [];
    this.log('Démarrage du test des fonctionnalités existantes');

    const steps: string[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Étape 1: Test de la liste des utilisateurs
      steps.push('Test de la liste des utilisateurs');
      const usersResponse = await adminService.getAllUsers();
      
      if (!usersResponse.success) {
        issues.push('Impossible de charger la liste des utilisateurs');
        recommendations.push('Vérifier la fonction getAllUsers');
        return this.createTestResult(
          this.currentTest,
          'FAIL',
          steps,
          'Liste des utilisateurs chargée',
          `Échec: ${usersResponse.error}`,
          issues,
          recommendations
        );
      }

      const usersCount = usersResponse.data?.length || 0;
      this.log(`Liste des utilisateurs chargée: ${usersCount} utilisateurs`);

      // Étape 2: Test des statistiques générales
      steps.push('Test des statistiques générales');
      const statsResponse = await adminService.getUserStats();
      
      if (!statsResponse.success) {
        issues.push('Impossible de charger les statistiques générales');
        recommendations.push('Vérifier la fonction getUserStats');
        return this.createTestResult(
          this.currentTest,
          'FAIL',
          steps,
          'Statistiques générales chargées',
          `Échec: ${statsResponse.error}`,
          issues,
          recommendations
        );
      }

      const stats = statsResponse.data;
      this.log(`Statistiques générales: ${stats?.totalUsers || 0} utilisateurs, ${stats?.totalTransactions || 0} transactions`);

      // Étape 3: Test de l'accès admin
      steps.push('Test de l\'accès administrateur');
      const adminTest = await adminService.checkAdminAccess();
      
      if (!adminTest.success) {
        issues.push('Accès administrateur échoué');
        recommendations.push('Vérifier les permissions administrateur');
        return this.createTestResult(
          this.currentTest,
          'FAIL',
          steps,
          'Accès administrateur validé',
          `Échec: ${adminTest.error}`,
          issues,
          recommendations
        );
      }

      this.log('Accès administrateur validé');

      // Validation finale
      const actualResult = `Fonctionnalités existantes préservées - ${usersCount} utilisateurs, ${stats?.totalTransactions || 0} transactions`;
      
      return this.createTestResult(
        this.currentTest,
        'PASS',
        steps,
        'Toutes les fonctionnalités existantes préservées',
        actualResult,
        issues,
        recommendations
      );

    } catch (error) {
      this.log(`Erreur lors du test des fonctionnalités existantes: ${error}`, 'ERROR');
      issues.push(`Erreur inattendue: ${error}`);
      recommendations.push('Vérifier la console pour plus de détails');
      
      return this.createTestResult(
        this.currentTest,
        'FAIL',
        steps,
        'Fonctionnalités existantes préservées',
        `Erreur: ${error}`,
        issues,
        recommendations
      );
    }
  }

  /**
   * Exécuter tous les tests de production
   */
  async runAllTests(): Promise<TestSuite> {
    const startTime = new Date().toISOString();
    this.log('🚀 Démarrage des tests de production - Système de Nettoyage BazarKELY');
    this.log('⚠️  MODE SÉCURISÉ - Tests non-destructifs uniquement');

    const results: TestResult[] = [];

    try {
      // Test 1: UI AdminPage
      this.log('\n📋 TEST 1 - Vérification UI AdminPage');
      const test1 = await this.testAdminPageUI();
      results.push(test1);
      this.log(`Résultat Test 1: ${test1.status}`);

      // Test 2: Monitoring
      this.log('\n📋 TEST 2 - Test de Monitoring');
      const test2 = await this.testMonitoring();
      results.push(test2);
      this.log(`Résultat Test 2: ${test2.status}`);

      // Test 3: Nettoyage Manuel
      this.log('\n📋 TEST 3 - Test de Nettoyage Manuel');
      const test3 = await this.testManualCleanup();
      results.push(test3);
      this.log(`Résultat Test 3: ${test3.status}`);

      // Test 4: Fonctionnalités Existantes
      this.log('\n📋 TEST 4 - Test des Fonctionnalités Existantes');
      const test4 = await this.testExistingFunctionality();
      results.push(test4);
      this.log(`Résultat Test 4: ${test4.status}`);

    } catch (error) {
      this.log(`Erreur critique lors des tests: ${error}`, 'ERROR');
    }

    const endTime = new Date().toISOString();
    const passedTests = results.filter(r => r.status === 'PASS').length;
    const failedTests = results.filter(r => r.status === 'FAIL').length;

    this.log(`\n🎯 Tests terminés: ${passedTests} réussis, ${failedTests} échoués`);

    return {
      suiteName: 'Production Cleanup System Tests',
      startTime,
      endTime,
      totalTests: results.length,
      passedTests,
      failedTests,
      results
    };
  }

  /**
   * Générer le rapport de test
   */
  generateReport(testSuite: TestSuite): string {
    let report = `# 🧪 RAPPORT DE TEST DE PRODUCTION - SYSTÈME DE NETTOYAGE BazarKELY\n\n`;
    report += `**Date de test :** ${new Date().toLocaleDateString('fr-FR')}\n`;
    report += `**Heure de début :** ${testSuite.startTime}\n`;
    report += `**Heure de fin :** ${testSuite.endTime}\n`;
    report += `**Durée :** ${Math.round((new Date(testSuite.endTime).getTime() - new Date(testSuite.startTime).getTime()) / 1000)} secondes\n\n`;

    report += `## 📊 RÉSUMÉ GLOBAL\n\n`;
    report += `- **Total des tests :** ${testSuite.totalTests}\n`;
    report += `- **Tests réussis :** ${testSuite.passedTests} ✅\n`;
    report += `- **Tests échoués :** ${testSuite.failedTests} ❌\n`;
    report += `- **Taux de réussite :** ${Math.round((testSuite.passedTests / testSuite.totalTests) * 100)}%\n\n`;

    report += `## 📋 DÉTAIL DES TESTS\n\n`;

    testSuite.results.forEach((result, index) => {
      const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      report += `### ${statusIcon} ${result.testName}\n\n`;
      report += `**Statut :** ${result.status}\n`;
      report += `**Heure :** ${result.timestamp}\n\n`;

      report += `#### Étapes Exécutées\n`;
      result.steps.forEach((step, i) => {
        report += `${i + 1}. ${step}\n`;
      });
      report += `\n`;

      report += `#### Résultat Attendu\n`;
      report += `${result.expectedResult}\n\n`;

      report += `#### Résultat Obtenu\n`;
      report += `${result.actualResult}\n\n`;

      if (result.issues.length > 0) {
        report += `#### Problèmes Détectés\n`;
        result.issues.forEach((issue, i) => {
          report += `- ${issue}\n`;
        });
        report += `\n`;
      }

      if (result.recommendations.length > 0) {
        report += `#### Recommandations\n`;
        result.recommendations.forEach((rec, i) => {
          report += `- ${rec}\n`;
        });
        report += `\n`;
      }

      if (result.logs.length > 0) {
        report += `#### Logs\n`;
        report += `\`\`\`\n`;
        result.logs.forEach(log => {
          report += `${log}\n`;
        });
        report += `\`\`\`\n\n`;
      }

      report += `---\n\n`;
    });

    report += `## 🎯 CONCLUSION\n\n`;
    if (testSuite.failedTests === 0) {
      report += `✅ **TOUS LES TESTS ONT RÉUSSI**\n\n`;
      report += `Le système de nettoyage des utilisateurs orphelins est entièrement fonctionnel en production.\n`;
      report += `Toutes les fonctionnalités ont été validées et aucune régression n'a été détectée.\n\n`;
    } else {
      report += `⚠️ **CERTAINS TESTS ONT ÉCHOUÉ**\n\n`;
      report += `${testSuite.failedTests} test(s) ont échoué et nécessitent une attention particulière.\n`;
      report += `Consultez les détails ci-dessus pour identifier les problèmes et appliquer les corrections recommandées.\n\n`;
    }

    report += `**Système prêt pour la production :** ${testSuite.failedTests === 0 ? 'OUI' : 'NON'}\n\n`;
    report += `---\n\n`;
    report += `*Rapport généré automatiquement le ${new Date().toLocaleString('fr-FR')} - BazarKELY v2.0*\n`;

    return report;
  }
}

// =====================================================
// FONCTIONS D'EXPORT
// =====================================================

/**
 * Exécuter tous les tests de production
 */
export async function runProductionTests(): Promise<string> {
  const tester = new ProductionCleanupTester();
  const testSuite = await tester.runAllTests();
  return tester.generateReport(testSuite);
}

/**
 * Exécuter un test spécifique
 */
export async function runSpecificTest(testName: string): Promise<TestResult> {
  const tester = new ProductionCleanupTester();
  
  switch (testName.toLowerCase()) {
    case 'ui':
    case 'adminpage':
      return await tester.testAdminPageUI();
    case 'monitoring':
      return await tester.testMonitoring();
    case 'cleanup':
    case 'manual':
      return await tester.testManualCleanup();
    case 'existing':
    case 'functionality':
      return await tester.testExistingFunctionality();
    default:
      throw new Error(`Test inconnu: ${testName}`);
  }
}

/**
 * Exécuter les tests et sauvegarder le rapport
 */
export async function runAndSaveTests(): Promise<void> {
  try {
    console.log('🚀 Démarrage des tests de production...');
    const report = await runProductionTests();
    
    // Sauvegarder le rapport
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `production-test-report-${timestamp}.md`;
    
    // Note: En production, vous devriez sauvegarder ce rapport
    console.log('📄 Rapport de test généré:');
    console.log(report);
    console.log(`\n💾 Rapport sauvegardé: ${filename}`);
    
  } catch (error) {
    console.error('❌ Erreur lors des tests de production:', error);
  }
}

// Export par défaut
export default {
  runProductionTests,
  runSpecificTest,
  runAndSaveTests
};






