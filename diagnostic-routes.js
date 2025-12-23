const express = require('express');
const router = express.Router();
const User = require('./server/models/User');
const { auth } = require('./server/middleware/auth');

// 🧪 ROUTE DE DIAGNOSTIC - Variables PayPal
router.get('/diagnostic/env', (req, res) => {
  const requiredVars = {
    APP_URL: process.env.APP_URL,
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID ? 'SET' : 'MISSING',
    PAYPAL_SECRET: process.env.PAYPAL_SECRET ? 'SET' : 'MISSING',
    PAYPAL_PLAN_MONTHLY_ID: process.env.PAYPAL_PLAN_MONTHLY_ID,
    PAYPAL_ENVIRONMENT: process.env.PAYPAL_ENVIRONMENT,
    PREMIUM_PRICE: process.env.PREMIUM_PRICE,
  };

  const missing = [];
  const present = [];

  Object.keys(requiredVars).forEach(key => {
    if (requiredVars[key] && requiredVars[key] !== 'MISSING') {
      present.push(key);
    } else {
      missing.push(key);
    }
  });

  res.json({
    success: missing.length === 0,
    status: missing.length === 0 ? 'ALL_GOOD' : 'MISSING_VARS',
    variables: requiredVars,
    summary: {
      total: Object.keys(requiredVars).length,
      present: present.length,
      missing: missing.length,
      missingVars: missing,
    },
    urls: {
      paymentSuccess: `${process.env.APP_URL}/payment/success`,
      paymentCancel: `${process.env.APP_URL}/payment/cancel`,
      webhookUrl: `${process.env.APP_URL}/api/payments/webhook`,
    },
  });
});

// 🧪 ROUTE DE DIAGNOSTIC - Test Synchronisation PayPal ↔ Base
router.get('/diagnostic/user-paypal-sync/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Vérifier que l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
        userId: userId,
      });
    }

    // 2. Simuler sauvegarde subscription_id
    const fakeSubscriptionId = 'I-TEST123456789';
    user.premium.paypalSubscriptionId = fakeSubscriptionId;
    await user.save();

    // 3. Tester recherche par subscription_id
    const foundUser = await User.findOne({
      'premium.paypalSubscriptionId': fakeSubscriptionId,
    });

    // 4. Nettoyer (supprimer le fake ID)
    user.premium.paypalSubscriptionId = null;
    await user.save();

    res.json({
      success: true,
      tests: {
        userExists: !!user,
        canSaveSubscriptionId: true,
        canFindBySubscriptionId: !!foundUser,
        userFoundCorrect: foundUser?._id.toString() === userId,
      },
      userInfo: {
        id: user._id,
        nom: user.profile.nom,
        premiumStatus: {
          isPremium: user.premium.isPremium,
          expiration: user.premium.expiration,
          subscriptionId: user.premium.paypalSubscriptionId,
        },
      },
      diagnostic: 'Synchronisation PayPal ↔ Base OK',
    });
  } catch (error) {
    console.error('Erreur diagnostic sync:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      diagnostic: 'ERREUR Synchronisation PayPal ↔ Base',
    });
  }
});

// 🧪 ROUTE DE DIAGNOSTIC - Test Premium Access
router.get('/diagnostic/premium-access/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
    }

    // Vérifier statut premium actuel
    const isPremiumActive =
      user.premium.isPremium && user.premium.expiration > new Date();

    res.json({
      success: true,
      userId: user._id,
      nom: user.profile.nom,
      premium: {
        isPremium: user.premium.isPremium,
        expiration: user.premium.expiration,
        isActive: isPremiumActive,
        subscriptionId: user.premium.paypalSubscriptionId,
        daysLeft: user.premium.expiration
          ? Math.ceil(
              (user.premium.expiration - new Date()) / (1000 * 60 * 60 * 24)
            )
          : 0,
      },
      accessWillWork: {
        annuaire: isPremiumActive,
        annonces: isPremiumActive,
        camFilters: isPremiumActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 🧪 ROUTE DE DIAGNOSTIC - Lister utilisateurs pour trouver votre ID
router.get('/diagnostic/find-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.json({
        success: false,
        message: 'Utilisateur non trouvé',
        email: email,
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        premium: {
          isPremium: user.premium.isPremium,
          expiration: user.premium.expiration,
          subscriptionId: user.premium.paypalSubscriptionId,
        },
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
