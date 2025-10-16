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
      isPremium: user.premium.isPremium,
      expiration: user.premium.expiration,
      isFemaleFree: user.premium.isFemaleFree,
      features: {
        unlimitedMessaging: user.premium.isPremium,
        adsAccess: user.premium.isPremium,
        tonightMeets: user.premium.isPremium,
        camToCam: user.premium.isPremium,
        profileHighlight: user.premium.isPremium,
        prioritySupport: user.premium.isPremium,
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

// Activer l'abonnement gratuit pour les femmes
const activateFemaleFreeSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Vérifier l'éligibilité
    if (user.profile.sexe !== 'femme') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_ELIGIBLE',
          message: 'Cette fonctionnalité est réservée aux femmes',
        },
      });
    }

    // Activer l'abonnement gratuit
    user.premium.isPremium = true;
    user.premium.isFemaleFree = true;
    user.premium.expiration = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 an

    await user.save();

    res.json({
      success: true,
      message: 'Abonnement gratuit activé avec succès',
      subscription: {
        isPremium: true,
        expiration: user.premium.expiration,
        isFemaleFree: true,
      },
    });
  } catch (error) {
    console.error(
      'Erreur lors de l\\' + 'activation de l\\' + 'abonnement gratuit:',
      error
    );
    res.status(500).json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_ERROR',
        message: 'Erreur lors de l\\' + 'activation de l\\' + 'abonnement',
      },
    });
  }
};

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
    const hasAccess = user.premium.isPremium;

    res.json({
      success: true,
      hasAccess,
      feature,
      isPremium: user.premium.isPremium,
      isFemaleFree: user.premium.isFemaleFree,
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
    const femaleFreeUsers = await User.countDocuments({
      'premium.isFemaleFree': true,
    });
    const paidPremiumUsers = premiumUsers - femaleFreeUsers;

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

      if (!user.premium.isPremium) {
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
  activateFemaleFreeSubscription,
  checkPremiumAccess,
  getSubscriptionStats,
  requirePremium,
};
