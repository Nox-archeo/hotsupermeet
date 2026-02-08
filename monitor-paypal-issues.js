const mongoose = require('mongoose');
const User = require('./server/models/User');

// 🔍 Script de monitoring des problèmes PayPal potentiels
async function monitorPayPalIssues() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('🔍 MONITORING PAYPAL - Recherche des cas problématiques...\n');

    // 1. Utilisateurs premium qui expirent dans les 24h
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const expiringSoon = await User.find({
      'premium.isPremium': true,
      'premium.expiration': { $lt: tomorrow },
      'premium.paypalSubscriptionId': { $exists: true, $ne: null },
    }).select('email premium');

    if (expiringSoon.length > 0) {
      console.log('⚠️ UTILISATEURS PREMIUM EXPIRANT DANS 24H:');
      expiringSoon.forEach(user => {
        console.log(
          `   ${user.email} - Expire: ${user.premium.expiration} - PayPal: ${user.premium.paypalSubscriptionId}`
        );
      });
      console.log('');
    }

    // 2. Utilisateurs premium expirés récemment (dernières 48h)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const recentlyExpired = await User.find({
      'premium.isPremium': false,
      'premium.expiration': { $gte: twoDaysAgo, $lt: new Date() },
      'premium.paypalSubscriptionId': { $exists: true, $ne: null },
    }).select('email premium');

    if (recentlyExpired.length > 0) {
      console.log(
        '🚨 UTILISATEURS PREMIUM EXPIRÉS RÉCEMMENT (vérifier si paiement):'
      );
      recentlyExpired.forEach(user => {
        console.log(
          `   ${user.email} - Expiré: ${user.premium.expiration} - PayPal: ${user.premium.paypalSubscriptionId}`
        );
      });
      console.log('');
    }

    // 3. Statistiques générales
    const totalPremium = await User.countDocuments({
      'premium.isPremium': true,
    });
    const premiumWithPayPal = await User.countDocuments({
      'premium.isPremium': true,
      'premium.paypalSubscriptionId': { $exists: true, $ne: null },
    });

    console.log(`📊 STATISTIQUES:`);
    console.log(`   Total utilisateurs premium: ${totalPremium}`);
    console.log(`   Premium avec PayPal: ${premiumWithPayPal}`);
    console.log(`   Premium sans PayPal: ${totalPremium - premiumWithPayPal}`);

    console.log('\n✅ Monitoring terminé');
  } catch (error) {
    console.error('❌ Erreur monitoring:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

// Lancer si appelé directement
if (require.main === module) {
  monitorPayPalIssues();
}

module.exports = { monitorPayPalIssues };
