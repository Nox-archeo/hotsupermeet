#!/usr/bin/env node

/**
 * 🛠️ INSTALLATION MONGODB DATABASE TOOLS
 * Script d'installation automatique pour macOS
 */

const { exec } = require('child_process');

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr, stdout });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function installMongoTools() {
  console.log('🛠️ Installation MongoDB Database Tools...\n');

  try {
    // Vérifier si brew est installé
    console.log('🔍 Vérification de Homebrew...');
    await execPromise('brew --version');
    console.log('✅ Homebrew détecté\n');

    // Installer MongoDB Database Tools
    console.log('📦 Installation MongoDB Database Tools via Homebrew...');
    const result = await execPromise(
      'brew install mongodb/brew/mongodb-database-tools'
    );
    console.log('✅ Installation terminée!\n');

    // Vérifier l'installation
    console.log('🧪 Test des outils installés...');
    await execPromise('mongodump --version');
    await execPromise('mongorestore --version');
    console.log('✅ Tous les outils sont opérationnels!\n');

    console.log('🎉 Installation réussie! Vous pouvez maintenant exécuter:');
    console.log('node migrate-mongodb.js');
  } catch (error) {
    console.error('❌ Erreur installation:', error.message);
    console.log('\n💡 Installation manuelle:');
    console.log(
      '1. Visitez: https://docs.mongodb.com/database-tools/installation/'
    );
    console.log('2. Téléchargez pour macOS');
    console.log('3. Ajoutez au PATH');
  }
}

if (require.main === module) {
  installMongoTools();
}
