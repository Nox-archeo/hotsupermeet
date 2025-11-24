const cron = require('node-cron');
const Ad = require('../models/Ad');

// Fonction pour supprimer les annonces expirées
async function cleanupExpiredAds() {
  try {
    // Date limite : 30 jours avant maintenant
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Supprimer toutes les annonces créées il y a plus de 30 jours
    const result = await Ad.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
    });

    console.log(
      `🧹 Nettoyage automatique: ${result.deletedCount} annonces expirées supprimées`
    );

    return {
      success: true,
      deletedCount: result.deletedCount,
    };
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des annonces:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Programmer la tâche pour s'exécuter tous les jours à 2h00
function startAdCleanupJob() {
  // Cron pattern : '0 2 * * *' = tous les jours à 2h00
  cron.schedule(
    '0 2 * * *',
    async () => {
      console.log('🕐 Démarrage du nettoyage automatique des annonces...');
      await cleanupExpiredAds();
    },
    {
      timezone: 'Europe/Paris',
    }
  );

  console.log(
    '✅ Tâche de nettoyage automatique des annonces programmée (tous les jours à 2h00)'
  );
}

// Fonction pour nettoyer manuellement (pour les tests)
function runCleanupNow() {
  return cleanupExpiredAds();
}

module.exports = {
  startAdCleanupJob,
  runCleanupNow,
  cleanupExpiredAds,
};
