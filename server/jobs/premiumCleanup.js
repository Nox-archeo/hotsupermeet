const User = require('../models/User');

/**
 * Job de nettoyage des abonnements premium expirés
 * Exécuté toutes les heures pour désactiver les abonnements expirés
 */
const cleanupExpiredPremiumSubscriptions = async () => {
  try {
    console.log('🧹 Démarrage du nettoyage des abonnements premium expirés...');

    // 🚨 LOGIQUE SÉCURISÉE : Ne désactiver QUE ceux qui n'ont PAS d'abonnement PayPal actif
    // OU ceux expirés depuis plus de 48h (marge de sécurité pour les retards de paiement)
    const now = new Date();
    const seuilSecurite = new Date(now.getTime() - 48 * 60 * 60 * 1000); // -48h

    const expiredUsers = await User.find({
      'premium.isPremium': true,
      'premium.expiration': { $lt: seuilSecurite }, // Expirés depuis PLUS de 48h
      $or: [
        { 'premium.paypalSubscriptionId': null }, // Pas d'abonnement PayPal
        { 'premium.paypalSubscriptionId': '' }, // Abonnement vide
        { 'premium.paypalSubscriptionId': { $exists: false } }, // Champ inexistant
      ],
    });

    if (expiredUsers.length === 0) {
      console.log(
        '✅ Aucun abonnement expiré à nettoyer (marge de sécurité 48h appliquée)'
      );

      // 📊 Log informatif des utilisateurs en attente
      const usersInGracePeriod = await User.find({
        'premium.isPremium': true,
        'premium.expiration': { $lt: now, $gte: seuilSecurite },
        'premium.paypalSubscriptionId': { $exists: true, $ne: null, $ne: '' },
      });

      if (usersInGracePeriod.length > 0) {
        console.log(
          `ℹ️  ${usersInGracePeriod.length} utilisateur(s) avec PayPal en période de grâce (48h):`
        );
        usersInGracePeriod.forEach(u => {
          console.log(
            `   - ${u.email} (PayPal: ${u.premium.paypalSubscriptionId})`
          );
        });
      }

      return;
    }

    console.log(
      `📋 ${expiredUsers.length} abonnement(s) expiré(s) sans PayPal à désactiver :`
    );

    for (const user of expiredUsers) {
      console.log(
        `- ${user.email} (ID: ${user._id}) - Expiré le: ${user.premium.expiration} - PayPal: ${user.premium.paypalSubscriptionId || 'AUCUN'}`
      );

      // Désactiver le premium mais garder l'historique
      user.premium.isPremium = false;
      // On garde expiration et paypalSubscriptionId pour l'historique

      await user.save();
      console.log(`  ✅ Premium désactivé pour ${user.email}`);
    }

    console.log(
      `🎉 Nettoyage sécurisé terminé - ${expiredUsers.length} abonnement(s) sans PayPal désactivé(s)`
    );
    console.log(
      '💡 Les utilisateurs avec abonnements PayPal actifs sont protégés par la marge de 48h'
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
