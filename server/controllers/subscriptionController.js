const User = require('../models/User');
const { validationResult } = require('express-validator');

// Obtenir les informations d'abonnement de l'utilisateur
const getSubscriptionInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('premium');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    const subscriptionInfo = {
      isPremium: user.premium.isPremium && user.premium.expiration > new Date(),
      expiration: user.premium.expiration,
      features: {
        unlimitedMessaging:
          user.premium.isPremium && user.premium.expiration > new Date(),
        adsAccess:
          user.premium.isPremium && user.premium.expiration > new Date(),
        tonightMeets:
          user.premium.isPremium && user.premium.expiration > new Date(),
        camToCam:
          user.premium.isPremium && user.premium.expiration > new Date(),
        profileHighlight:
          user.premium.isPremium && user.premium.expiration > new Date(),
        prioritySupport:
          user.premium.isPremium && user.premium.expiration > new Date(),
      },
    };

    res.json({
      success: true,
      subscription: subscriptionInfo,
    });
  } catch (error) {
    console.error(
      'Erreur lors de la récupération des informations d\\' + 'abonnement:',
      error
    );
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message:
          'Erreur lors de la récupération des informations d\\' + 'abonnement',
      },
    });
  }
};

// FONCTION SUPPRIMÉE - Plus d'accès gratuit pour les femmes

// Vérifier si un utilisateur a accès à une fonctionnalité premium
const checkPremiumAccess = async (req, res) => {
  try {
    const { feature } = req.params;
    const user = await User.findById(req.user._id).select('premium profile');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    const validFeatures = [
      'unlimitedMessaging',
      'adsAccess',
      'tonightMeets',
      'camToCam',
      'profileHighlight',
      'prioritySupport',
    ];

    if (!validFeatures.includes(feature)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FEATURE',
          message: 'Fonctionnalité invalide',
        },
      });
    }

    // Vérifier si l'utilisateur a accès
    const hasAccess =
      user.premium.isPremium && user.premium.expiration > new Date();

    res.json({
      success: true,
      hasAccess,
      feature,
      isPremium: user.premium.isPremium,
      // isFemaleFree supprimé - plus d'accès gratuit
    });
  } catch (error) {
    console.error(
      'Erreur lors de la vérification de l\\' + 'accès premium:',
      error
    );
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la vérification de l\\' + 'accès premium',
      },
    });
  }
};

// Obtenir les statistiques d'abonnement (admin)
const getSubscriptionStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({
      'premium.isPremium': true,
    });
    // femaleFreeUsers supprimé - plus d'accès gratuit
    const paidPremiumUsers = premiumUsers; // Maintenant tous premium sont payants

    // Répartition par sexe des utilisateurs premium
    const premiumBySex = await User.aggregate([
      { $match: { 'premium.isPremium': true } },
      { $group: { _id: '$profile.sexe', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        premiumUsers,
        femaleFreeUsers,
        paidPremiumUsers,
        premiumBySex,
        premiumRate:
          totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(2) : 0,
      },
    });
  } catch (error) {
    console.error(
      'Erreur lors de la récupération des statistiques d\\' + 'abonnement:',
      error
    );
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message:
          'Erreur lors de la récupération des statistiques d\\' + 'abonnement',
      },
    });
  }
};

// Middleware pour vérifier l'accès premium
const requirePremium = feature => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id).select('premium');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Utilisateur non trouvé',
          },
        });
      }

      if (!user.premium.isPremium || user.premium.expiration <= new Date()) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PREMIUM_REQUIRED',
            message:
              'Un abonnement premium est requis pour accéder à cette fonctionnalité',
            feature,
          },
        });
      }

      next();
    } catch (error) {
      console.error('Erreur lors de la vérification premium:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Erreur lors de la vérification de l\\' + 'abonnement',
        },
      });
    }
  };
};

module.exports = {
  getSubscriptionInfo,
  // activateFemaleFreeSubscription supprimé - plus d'accès gratuit femmes
  checkPremiumAccess,
  getSubscriptionStats,
  requirePremium,
};
