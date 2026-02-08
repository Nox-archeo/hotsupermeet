const User = require('../models/User');

// 🔍 Endpoint de monitoring des problèmes PayPal potentiels
const monitorPayPalIssues = async (req, res) => {
  try {
    console.log('🔍 MONITORING PAYPAL - Recherche des cas problématiques...');

    // Vérification de sécurité admin (optionnelle)
    const adminKey = req.query.admin_key || req.headers['admin-key'];
    if (adminKey !== 'hotmeet2026admin') {
      return res
        .status(403)
        .json({ error: 'Accès refusé - Clé admin requise' });
    }

    const results = {};

    // 1. Utilisateurs premium qui expirent dans les 24h avec PayPal
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const expiringSoon = await User.find({
      'premium.isPremium': true,
      'premium.expiration': { $lt: tomorrow },
      'premium.paypalSubscriptionId': { $exists: true, $ne: null },
    }).select('email premium updatedAt');

    results.expiringSoon = expiringSoon.map(user => ({
      email: user.email,
      expiration: user.premium.expiration,
      paypalId: user.premium.paypalSubscriptionId,
      lastUpdate: user.updatedAt,
    }));

    // 2. Utilisateurs premium expirés récemment (dernières 48h) avec PayPal
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const recentlyExpired = await User.find({
      'premium.isPremium': false,
      'premium.expiration': { $gte: twoDaysAgo, $lt: new Date() },
      'premium.paypalSubscriptionId': { $exists: true, $ne: null },
    }).select('email premium updatedAt');

    results.recentlyExpired = recentlyExpired.map(user => ({
      email: user.email,
      expiration: user.premium.expiration,
      paypalId: user.premium.paypalSubscriptionId,
      lastUpdate: user.updatedAt,
    }));

    // 3. Utilisateurs premium récemment mis à jour (dernières 24h)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentlyUpdated = await User.find({
      'premium.isPremium': true,
      'premium.paypalSubscriptionId': { $exists: true, $ne: null },
      updatedAt: { $gte: yesterday },
    })
      .select('email premium updatedAt')
      .sort({ updatedAt: -1 })
      .limit(10);

    results.recentlyUpdated = recentlyUpdated.map(user => ({
      email: user.email,
      expiration: user.premium.expiration,
      paypalId: user.premium.paypalSubscriptionId,
      lastUpdate: user.updatedAt,
    }));

    // 4. Statistiques générales
    const totalPremium = await User.countDocuments({
      'premium.isPremium': true,
    });
    const premiumWithPayPal = await User.countDocuments({
      'premium.isPremium': true,
      'premium.paypalSubscriptionId': { $exists: true, $ne: null },
    });
    const expiredWithPayPal = await User.countDocuments({
      'premium.isPremium': false,
      'premium.paypalSubscriptionId': { $exists: true, $ne: null },
    });

    results.stats = {
      totalPremium,
      premiumWithPayPal,
      premiumWithoutPayPal: totalPremium - premiumWithPayPal,
      expiredWithPayPal,
      currentTime: new Date().toISOString(),
    };

    // 5. Alertes importantes
    results.alerts = [];

    if (results.expiringSoon.length > 0) {
      results.alerts.push({
        level: 'warning',
        message: `${results.expiringSoon.length} utilisateurs premium avec PayPal expirent dans 24h`,
      });
    }

    if (results.recentlyExpired.length > 0) {
      results.alerts.push({
        level: 'critical',
        message: `${results.recentlyExpired.length} utilisateurs premium avec PayPal ont expiré récemment - vérifier s'ils ont payé`,
      });
    }

    if (results.recentlyUpdated.length > 5) {
      results.alerts.push({
        level: 'info',
        message: `${results.recentlyUpdated.length} renouvellements premium récents - système PayPal actif`,
      });
    }

    console.log(
      `✅ Monitoring terminé - Trouvé ${results.expiringSoon.length} expirant bientôt, ${results.recentlyExpired.length} expirés récemment`
    );

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: results,
    });
  } catch (error) {
    console.error('❌ Erreur monitoring PayPal:', error);
    res.status(500).json({
      error: 'Erreur monitoring PayPal',
      message: error.message,
    });
  }
};

module.exports = {
  monitorPayPalIssues,
};
