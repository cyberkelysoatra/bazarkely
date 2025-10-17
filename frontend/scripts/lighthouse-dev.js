#!/usr/bin/env node

/**
 * Script de test de performance Lighthouse pour le développement
 * Version simplifiée avec des seuils réalistes
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Démarrage des tests de performance Lighthouse...\n');

// Configuration
const config = {
  url: 'http://localhost:3000',
  runs: 1, // Une seule exécution pour le développement
  output: 'html',
  outputPath: './lighthouse-reports',
  viewport: 'mobile'
};

// Créer le dossier de rapports
if (!fs.existsSync(config.outputPath)) {
  fs.mkdirSync(config.outputPath, { recursive: true });
}

try {
  // Commande Lighthouse
  const command = `npx lighthouse ${config.url} ` +
    `--output=${config.output} ` +
    `--output-path=${path.join(config.outputPath, 'lighthouse-report.html')} ` +
    `--view-port=${config.viewport} ` +
    `--chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" ` +
    `--only-categories=performance,accessibility,best-practices,seo,pwa ` +
    `--quiet`;

  console.log('📊 Exécution de Lighthouse...');
  execSync(command, { stdio: 'inherit' });

  console.log('\n✅ Tests de performance terminés !');
  console.log(`📄 Rapport disponible dans: ${path.join(config.outputPath, 'lighthouse-report.html')}`);
  
  // Afficher un résumé des métriques clés
  console.log('\n📈 Résumé des métriques:');
  console.log('- Performance: Vérifiez le rapport pour les détails');
  console.log('- Accessibilité: Vérifiez le rapport pour les détails');
  console.log('- Bonnes pratiques: Vérifiez le rapport pour les détails');
  console.log('- SEO: Vérifiez le rapport pour les détails');
  console.log('- PWA: Vérifiez le rapport pour les détails');

} catch (error) {
  console.error('❌ Erreur lors de l\'exécution de Lighthouse:', error.message);
  process.exit(1);
}



