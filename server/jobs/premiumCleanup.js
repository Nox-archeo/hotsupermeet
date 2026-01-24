const User = require('../models/User');

/**
 * Job de nettoyage des abonnements premium expirés
 * Exécuté toutes les heures pour désactiver les abonnements expirés
 */
const cleanupExpiredPremiumSubscriptions = async () => {
  try {
    console.log('🧹 Démarrage du nettoyage des abonnements premium expirés...');

    // Trouver tous les utilisateurs qui ont isPremium = true mais expiration < maintenant
    const expiredUsers = await User.find({
      'premium.isPremium': true,
      'premium.expiration': { $lt: new Date() },
    });

    if (expiredUsers.length === 0) {
      console.log('✅ Aucun abonnement expiré trouvé');
      return;
    }

    console.log(`📋 ${expiredUsers.length} abonnement(s) expiré(s) trouvé(s):`);

    for (const user of expiredUsers) {
      console.log(
        `- ${user.email} (ID: ${user._id}) - Expiré le: ${user.premium.expiration}`
      );

      // Désactiver le premium mais garder l'historique
      user.premium.isPremium = false;
      // On garde expiration et paypalSubscriptionId pour l'historique

      await user.save();
      console.log(`  ✅ Premium désactivé pour ${user.email}`);
    }

    console.log(
      `🎉 Nettoyage terminé - ${expiredUsers.length} abonnement(s) traité(s)`
    );
  } catch (error) {
    console.error(
      '❌ Erreur lors du nettoyage des abonnements expirés:',
      error
    );
  }
};

// Programmer le job pour s'exécuter toutes les heures
const startPremiumCleanupJob = () => {
  console.log(
    '⏰ Démarrage du job de nettoyage des abonnements premium (toutes les heures)'
  );

  // Exécuter immédiatement au démarrage
  cleanupExpiredPremiumSubscriptions();

  // Puis toutes les heures (3600000 ms = 1 heure)
  setInterval(cleanupExpiredPremiumSubscriptions, 3600000);
};

module.exports = {
  cleanupExpiredPremiumSubscriptions,
  startPremiumCleanupJob,
};
