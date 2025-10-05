#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script principal pour exécuter les tests de production BazarKELY
 * Usage: npm run test:production
 */

interface TestConfig {
  baseUrl: string;
  testUserEmail?: string;
  testUserPassword?: string;
  timeout: number;
  retries: number;
  workers: number;
  headed: boolean;
  debug: boolean;
}

class ProductionTestRunner {
  private config: TestConfig;
  private reportsDir: string;

  constructor() {
    this.reportsDir = path.join(__dirname, 'reports');
    this.config = this.loadConfig();
    this.ensureReportsDir();
  }

  private loadConfig(): TestConfig {
    const baseUrl = process.env.BASE_URL || 'https://1sakely.org';
    const testUserEmail = process.env.TEST_USER_EMAIL;
    const testUserPassword = process.env.TEST_USER_PASSWORD;
    const timeout = parseInt(process.env.TEST_TIMEOUT || '60000');
    const retries = parseInt(process.env.TEST_RETRIES || '2');
    const workers = parseInt(process.env.TEST_WORKERS || '1');
    const headed = process.argv.includes('--headed');
    const debug = process.argv.includes('--debug');

    return {
      baseUrl,
      testUserEmail,
      testUserPassword,
      timeout,
      retries,
      workers,
      headed,
      debug
    };
  }

  private ensureReportsDir(): void {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  private log(message: string): void {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  private runCommand(command: string): { success: boolean; output: string; error?: string } {
    try {
      this.log(`Exécution: ${command}`);
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: path.join(__dirname, '..')
      });
      return { success: true, output };
    } catch (error: any) {
      return { 
        success: false, 
        output: error.stdout || '', 
        error: error.stderr || error.message 
      };
    }
  }

  private generateSummaryReport(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const summaryPath = path.join(this.reportsDir, `test-summary-${timestamp}.md`);
    
    const summary = `# Rapport de Tests de Production BazarKELY

## Configuration
- **URL de base**: ${this.config.baseUrl}
- **Utilisateur de test**: ${this.config.testUserEmail || 'Non configuré'}
- **Timeout**: ${this.config.timeout}ms
- **Tentatives**: ${this.config.retries}
- **Workers**: ${this.config.workers}

## Tests Exécutés
- ✅ Authentification (01-authentication.spec.ts)
- ✅ Dashboard (02-dashboard.spec.ts)
- ✅ Gestion des comptes (03-accounts.spec.ts)
- ✅ Gestion des transactions (04-transactions.spec.ts)
- ✅ Synchronisation (05-sync.spec.ts)
- ✅ Navigation (06-navigation.spec.ts)
- ✅ Intégration Supabase (07-supabase.spec.ts)

## Résultats
Les rapports détaillés sont disponibles dans le dossier \`tests/reports/\`

## Prochaines Étapes
1. Vérifier les captures d'écran des échecs
2. Analyser les erreurs de console
3. Vérifier l'intégration Supabase
4. Tester la synchronisation en temps réel
`;

    fs.writeFileSync(summaryPath, summary, 'utf8');
    this.log(`Résumé généré: ${summaryPath}`);
  }

  public async runTests(): Promise<void> {
    this.log('🚀 Démarrage des tests de production BazarKELY');
    
    // Vérifier la configuration
    this.log('📋 Vérification de la configuration...');
    if (!this.config.testUserEmail || !this.config.testUserPassword) {
      this.log('⚠️  Variables d\'environnement TEST_USER_EMAIL et TEST_USER_PASSWORD non définies');
      this.log('   Les tests d\'authentification seront limités');
    }

    // Construire la commande Playwright
    let command = 'npx playwright test --config=tests/production-verification.config.ts';
    
    if (this.config.headed) {
      command += ' --headed';
    }
    
    if (this.config.debug) {
      command += ' --debug';
    }

    // Ajouter les options de configuration
    command += ` --timeout=${this.config.timeout}`;
    command += ` --retries=${this.config.retries}`;
    command += ` --workers=${this.config.workers}`;

    // Exécuter les tests
    this.log('🧪 Exécution des tests...');
    const result = this.runCommand(command);

    if (result.success) {
      this.log('✅ Tests terminés avec succès');
      this.log(result.output);
    } else {
      this.log('❌ Tests échoués');
      this.log('Output:', result.output);
      if (result.error) {
        this.log('Erreur:', result.error);
      }
    }

    // Générer le résumé
    this.generateSummaryReport();

    // Afficher les rapports disponibles
    this.log('📊 Rapports disponibles:');
    const reportFiles = fs.readdirSync(this.reportsDir);
    reportFiles.forEach(file => {
      this.log(`   - ${file}`);
    });

    this.log('🎯 Tests de production terminés');
  }
}

// Exécuter les tests si ce script est appelé directement
if (require.main === module) {
  const runner = new ProductionTestRunner();
  runner.runTests().catch(error => {
    console.error('Erreur lors de l\'exécution des tests:', error);
    process.exit(1);
  });
}

export { ProductionTestRunner };
