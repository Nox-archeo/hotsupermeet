const User = require('../models/User');
const PayPalService = require('../services/paypalService');

// 🔍 Analyser les problèmes d'abonnements PayPal
const analyzePayPalIssues = async (req, res) => {
  try {
    console.log('🔍 ANALYSE PROBLÈMES PAYPAL DÉMARRÉE...');

    const issues = {
      summary: {
        totalPremium: 0,
        premiumWithPayPal: 0,
        expiredButHasPayPal: 0,
        expiringSoon: 0,
        problematicCases: 0,
      },
      problematicUsers: [],
      expiredWithActivePayPal: [],
      expiringSoon: [],
    };

    // 1. Compter tous les utilisateurs premium
    issues.summary.totalPremium = await User.countDocuments({
      'premium.isPremium': true,
    });
    issues.summary.premiumWithPayPal = await User.countDocuments({
      'premium.isPremium': true,
      'premium.paypalSubscriptionId': { $exists: true, $ne: null },
    });

    // 2. Utilisateurs premium expirés MAIS qui ont encore un ID PayPal (suspect!)
    const expiredWithPayPal = await User.find({
      'premium.isPremium': false,
      'premium.expiration': { $lt: new Date() },
      'premium.paypalSubscriptionId': { $exists: true, $ne: null },
    })
      .select('email premium')
      .limit(10);

    issues.summary.expiredButHasPayPal = expiredWithPayPal.length;
    issues.expiredWithActivePayPal = expiredWithPayPal.map(user => ({
      email: user.email,
      expired: user.premium.expiration,
      paypalId: user.premium.paypalSubscriptionId,
      daysSinceExpired: Math.floor(
        (new Date() - user.premium.expiration) / (1000 * 60 * 60 * 24)
      ),
    }));

    // 3. Utilisateurs premium expirant dans les 3 prochains jours
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringSoon = await User.find({
      'premium.isPremium': true,
      'premium.expiration': { $lt: threeDaysFromNow, $gt: new Date() },
      'premium.paypalSubscriptionId': { $exists: true, $ne: null },
    })
      .select('email premium')
      .limit(5);

    issues.summary.expiringSoon = expiringSoon.length;
    issues.expiringSoon = expiringSoon.map(user => ({
      email: user.email,
      expires: user.premium.expiration,
      paypalId: user.premium.paypalSubscriptionId,
      daysUntilExpiration: Math.floor(
        (user.premium.expiration - new Date()) / (1000 * 60 * 60 * 24)
      ),
    }));

    // 4. Chercher des utilisateurs avec des PayPal IDs suspects (qui ne existent plus)
    const usersToCheck = await User.find({
      'premium.paypalSubscriptionId': { $exists: true, $ne: null },
    })
      .select('email premium')
      .limit(20);

    console.log(
      `🔍 Vérification de ${usersToCheck.length} abonnements PayPal...`
    );

    for (const user of usersToCheck) {
      try {
        // Vérifier si l'abonnement PayPal existe encore
        const subscription = await PayPalService.getSubscriptionDetails(
          user.premium.paypalSubscriptionId
        );

        // Vérifier les incohérences
        if (subscription.status !== 'ACTIVE' && user.premium.isPremium) {
          issues.problematicUsers.push({
            email: user.email,
            paypalId: user.premium.paypalSubscriptionId,
            paypalStatus: subscription.status,
            localIsPremium: user.premium.isPremium,
            localExpiration: user.premium.expiration,
            issue: 'PayPal inactif mais utilisateur premium localement',
          });
        }

        if (subscription.status === 'ACTIVE' && !user.premium.isPremium) {
          issues.problematicUsers.push({
            email: user.email,
            paypalId: user.premium.paypalSubscriptionId,
            paypalStatus: subscription.status,
            localIsPremium: user.premium.isPremium,
            localExpiration: user.premium.expiration,
            issue: 'PayPal actif mais utilisateur pas premium localement',
          });
        }
      } catch (error) {
        // Abonnement n'existe plus (404)
        if (
          error.message.includes('non trouvé') ||
          error.message.includes('404')
        ) {
          issues.problematicUsers.push({
            email: user.email,
            paypalId: user.premium.paypalSubscriptionId,
            paypalStatus: 'NOT_FOUND',
            localIsPremium: user.premium.isPremium,
            localExpiration: user.premium.expiration,
            issue: 'Abonnement PayPal supprimé/inexistant',
          });
        }
      }
    }

    issues.summary.problematicCases = issues.problematicUsers.length;

    // 5. Recommandations
    const recommendations = [];

    if (issues.summary.expiredButHasPayPal > 0) {
      recommendations.push(
        '🚨 Nettoyer les PayPal IDs des utilisateurs expirés'
      );
    }

    if (issues.problematicUsers.length > 0) {
      recommendations.push('⚠️ Synchroniser les états PayPal vs local');
    }

    if (issues.summary.expiringSoon > 0) {
      recommendations.push('👀 Surveiller les expirations prochaines');
    }

    const response = {
      timestamp: new Date().toISOString(),
      analysis: issues,
      recommendations,
      totalChecked: usersToCheck.length,
    };

    console.log('✅ ANALYSE TERMINÉE');
    console.log(
      `📊 Résumé: ${issues.summary.totalPremium} premium, ${issues.summary.problematicCases} problèmes détectés`
    );

    res.json(response);
  } catch (error) {
    console.error('❌ Erreur analyse PayPal:', error);
    res.status(500).json({
      error: 'Erreur analyse PayPal',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// 🔧 Vérifier un abonnement PayPal spécifique
const checkSpecificSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    console.log(`🔍 Vérification abonnement: ${subscriptionId}`);

    // Chercher l'utilisateur local
    const user = await User.findOne({
      'premium.paypalSubscriptionId': subscriptionId,
    }).select('email premium');

    let paypalData = null;
    let error = null;

    try {
      paypalData = await PayPalService.getSubscriptionDetails(subscriptionId);
    } catch (err) {
      error = err.message;
    }

    const result = {
      subscriptionId,
      localUser: user
        ? {
            email: user.email,
            isPremium: user.premium.isPremium,
            expiration: user.premium.expiration,
          }
        : null,
      paypalData: paypalData
        ? {
            status: paypalData.status,
            billing_info: paypalData.billing_info,
            subscriber: paypalData.subscriber,
          }
        : null,
      error,
      timestamp: new Date().toISOString(),
    };

    res.json(result);
  } catch (error) {
    console.error('❌ Erreur vérification abonnement:', error);
    res.status(500).json({
      error: 'Erreur vérification',
      message: error.message,
    });
  }
};

module.exports = {
  analyzePayPalIssues,
  checkSpecificSubscription,
};
