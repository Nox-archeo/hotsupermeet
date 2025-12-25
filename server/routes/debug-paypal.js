// Route temporaire pour trouver l'utilisateur avec abonnement PayPal problématique

const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /debug/paypal-user - Trouver utilisateur avec subscription ID spécifique
router.get('/paypal-user', async (req, res) => {
  try {
    const subscriptionId = 'I-VY5N67FMNW0S'; // L'ID problématique

    console.log(`🔍 RECHERCHE: Utilisateur avec PayPal ID ${subscriptionId}`);

    // Recherche utilisateur avec cet abonnement
    const user = await User.findOne({
      'premium.paypalSubscriptionId': subscriptionId,
    }).select('username email personalInfo premium createdAt');

    if (user) {
      const result = {
        found: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          nom:
            `${user.personalInfo?.firstName || ''} ${user.personalInfo?.lastName || ''}`.trim() ||
            'N/A',
          premium: {
            actif: user.premium?.isActive || false,
            expiration: user.premium?.expiresAt,
            paypalId: user.premium?.paypalSubscriptionId,
            createdAt: user.premium?.createdAt,
          },
          inscrit: user.createdAt,
        },
      };

      console.log(
        '✅ UTILISATEUR TROUVÉ:',
        result.user.username,
        result.user.email
      );

      res.json(result);
    } else {
      // Si pas trouvé, chercher tous les abonnements PayPal
      const allPremiumUsers = await User.find({
        'premium.paypalSubscriptionId': { $exists: true, $ne: null },
      })
        .select('username email premium.paypalSubscriptionId')
        .limit(10);

      console.log(`❌ Utilisateur ${subscriptionId} non trouvé`);
      console.log(
        `📊 Trouvé ${allPremiumUsers.length} autres abonnements PayPal`
      );

      res.json({
        found: false,
        searched: subscriptionId,
        alternativePremiumUsers: allPremiumUsers.map(u => ({
          username: u.username,
          email: u.email,
          paypalId: u.premium.paypalSubscriptionId,
        })),
      });
    }
  } catch (error) {
    console.error('❌ Erreur recherche utilisateur PayPal:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message,
    });
  }
});

module.exports = router;
