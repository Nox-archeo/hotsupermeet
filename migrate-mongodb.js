#!/usr/bin/env node

/**
 * 🚨 SCRIPT DE MIGRATION MONGODB SÉCURISÉ
 * =====================================
 *
 * Usage:
 * export SOURCE_MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/db"
 * export TARGET_MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/db"
 * node migrate-mongodb.js
 */

const { exec } = require('child_process');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// 🔒 Chargement sécurisé des URIs depuis les variables d'environnement
const SOURCE_URI = process.env.SOURCE_MONGODB_URI;
const TARGET_URI = process.env.TARGET_MONGODB_URI;

// ✅ Vérification des variables d'environnement
if (!SOURCE_URI || !TARGET_URI) {
  console.error("❌ ERREUR: Variables d'environnement manquantes");
  console.error('   Définissez SOURCE_MONGODB_URI et TARGET_MONGODB_URI');
  console.error('   Exemple:');
  console.error('   export SOURCE_MONGODB_URI="mongodb+srv://..."');
  console.error('   export TARGET_MONGODB_URI="mongodb+srv://..."');
  process.exit(1);
}

const sourceDbName = extractDbName(SOURCE_URI);
const targetDbName = extractDbName(TARGET_URI);

// 📊 Collections à migrer
const collections = [
  'users',
  'messages',
  'ads',
  'tonight_events',
  'tonight_participants',
  'tonight_favorites',
  'ads_views',
];

function extractDbName(uri) {
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match ? match[1] : 'test';
}

async function testConnection(uri, label) {
  console.log(`🔄 Test connexion ${label}...`);
  try {
    const client = new MongoClient(uri, { connectTimeoutMS: 5000 });
    await client.connect();
    const db = client.db();
    const admin = db.admin();
    await admin.ping();
    await client.close();
    console.log(`✅ Connexion ${label} OK`);
    return true;
  } catch (error) {
    console.error(`❌ Connexion ${label} échoué:`, error.message);
    return false;
  }
}

async function createBackup() {
  return new Promise((resolve, reject) => {
    const backupDir = `/tmp/mongodb-backup-${Date.now()}`;
    const command = `mongodump --uri="${SOURCE_URI}" --out="${backupDir}"`;

    console.log('📦 Création backup source...');
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erreur backup:', error);
        reject(error);
      } else {
        console.log('✅ Backup créé dans:', backupDir);
        resolve(backupDir);
      }
    });
  });
}

async function restoreToTarget(backupDir) {
  return new Promise((resolve, reject) => {
    const sourceDir = path.join(backupDir, sourceDbName);
    const command = `mongorestore --uri="${TARGET_URI}" --drop "${sourceDir}"`;

    console.log('📥 Restauration vers cible...');
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erreur restauration:', error);
        reject(error);
      } else {
        console.log('✅ Restauration terminée');
        resolve();
      }
    });
  });
}

async function verifyMigration() {
  console.log('🔍 Vérification migration...');

  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  try {
    await sourceClient.connect();
    await targetClient.connect();

    const sourceDb = sourceClient.db(sourceDbName);
    const targetDb = targetClient.db(targetDbName);

    let totalSourceDocs = 0;
    let totalTargetDocs = 0;

    console.log('\n📊 Comparaison des collections:');
    console.log('='.repeat(60));
    console.log(
      'Collection'.padEnd(20) +
        'Source'.padEnd(10) +
        'Cible'.padEnd(10) +
        'Status'
    );
    console.log('-'.repeat(60));

    for (const collectionName of collections) {
      try {
        const sourceCount = await sourceDb
          .collection(collectionName)
          .countDocuments();
        const targetCount = await targetDb
          .collection(collectionName)
          .countDocuments();

        totalSourceDocs += sourceCount;
        totalTargetDocs += targetCount;

        const status = sourceCount === targetCount ? '✅ OK' : '❌ DIFF';
        console.log(
          collectionName.padEnd(20) +
            sourceCount.toString().padEnd(10) +
            targetCount.toString().padEnd(10) +
            status
        );
      } catch (error) {
        console.log(
          collectionName.padEnd(20) +
            'N/A'.padEnd(10) +
            'N/A'.padEnd(10) +
            '⚠️ ERROR'
        );
      }
    }

    console.log('-'.repeat(60));
    console.log(
      'TOTAL'.padEnd(20) +
        totalSourceDocs.toString().padEnd(10) +
        totalTargetDocs.toString().padEnd(10) +
        (totalSourceDocs === totalTargetDocs ? '✅ MATCH' : '❌ MISMATCH')
    );

    return totalSourceDocs === totalTargetDocs;
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

async function migrate() {
  const startTime = Date.now();

  console.log('🚀 DÉMARRAGE MIGRATION MONGODB');
  console.log('==============================');
  console.log(`Source: ${sourceDbName}`);
  console.log(`Cible: ${targetDbName}`);
  console.log('');

  try {
    // 1. Test connexions
    const sourceOk = await testConnection(SOURCE_URI, 'SOURCE');
    const targetOk = await testConnection(TARGET_URI, 'CIBLE');

    if (!sourceOk || !targetOk) {
      throw new Error('Connexions base de données échouées');
    }

    // 2. Backup
    const backupDir = await createBackup();

    // 3. Restauration
    await restoreToTarget(backupDir);

    // 4. Vérification
    const success = await verifyMigration();

    const duration = Math.round((Date.now() - startTime) / 1000);

    if (success) {
      console.log('\n🎉 MIGRATION RÉUSSIE!');
      console.log(`⏱️  Durée: ${duration} secondes`);
      console.log(`🗂️  Backup: ${backupDir}`);
    } else {
      throw new Error('Vérification migration échouée');
    }
  } catch (error) {
    console.error('\n❌ MIGRATION ÉCHOUÉE:', error.message);
    process.exit(1);
  }
}

// Lancement
migrate().catch(console.error);
