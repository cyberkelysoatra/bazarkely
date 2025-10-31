#!/usr/bin/env node

/**
 * Script de test de performance Lighthouse simple
 * Teste directement l'URL sans démarrer le serveur
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Test de performance Lighthouse simple...\n');

// Configuration
const config = {
  url: 'http://localhost:3000',
  outputPath: './lighthouse-reports'
};

// Créer le dossier de rapports
if (!fs.existsSync(config.outputPath)) {
  fs.mkdirSync(config.outputPath, { recursive: true });
}

try {
  console.log('📊 Test de l\'URL:', config.url);
  console.log('⏳ Vérification de la disponibilité...');
  
  // Vérifier si l'URL est accessible
  const testCommand = `curl -s -o /dev/null -w "%{http_code}" ${config.url}`;
  
  try {
    const statusCode = execSync(testCommand, { encoding: 'utf8' }).trim();
    if (statusCode !== '200') {
      throw new Error(`URL non accessible (code: ${statusCode})`);
    }
    console.log('✅ URL accessible');
  } catch (curlError) {
    console.log('⚠️  curl non disponible, tentative directe avec Lighthouse...');
  }

  // Commande Lighthouse simplifiée
  const command = `npx lighthouse ${config.url} ` +
    `--output=html ` +
    `--output-path=${path.join(config.outputPath, 'lighthouse-simple.html')} ` +
    `--chrome-flags="--headless --no-sandbox --disable-dev-shm-usage --disable-gpu" ` +
    `--quiet`;

  console.log('📊 Exécution de Lighthouse...');
  execSync(command, { stdio: 'inherit' });

  console.log('\n✅ Test de performance terminé !');
  console.log(`📄 Rapport disponible dans: ${path.join(config.outputPath, 'lighthouse-simple.html')}`);

} catch (error) {
  console.error('❌ Erreur lors du test Lighthouse:', error.message);
  console.log('\n💡 Suggestions:');
  console.log('1. Vérifiez que l\'application est démarrée sur http://localhost:3000');
  console.log('2. Essayez: npm run dev');
  console.log('3. Puis relancez: npm run test:lighthouse:simple');
  process.exit(1);
}










