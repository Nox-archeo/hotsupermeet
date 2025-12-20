const User = require('../models/User');

// Middleware pour vérifier le statut premium - STRICTEMENT PREMIUM
const premiumOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Authentification requise pour accéder à cette fonctionnalité',
        redirectTo: '/pages/auth.html',
      });
    }

    const userId = req.user._id;
    const user = await User.findById(userId).select('premium profile');

    if (!user) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'Utilisateur non trouvé',
        redirectTo: '/pages/auth.html',
      });
    }

    // Vérifier si l'utilisateur est premium ou femme gratuite
    const isPremiumActive =
      user.premium.isPremium && user.premium.expiration > new Date();
    const isFemaleFree =
      user.premium.isFemaleFree && user.profile.sexe === 'femme';

    // ⛔ ACCÈS STRICTEMENT PREMIUM - REDIRECTION OBLIGATOIRE
    if (!isPremiumActive && !isFemaleFree) {
      return res.status(403).json({
        error: 'premium_required',
        message:
          'Abonnement premium requis pour accéder à cette fonctionnalité',
        redirectTo: '/pages/premium.html',
      });
    }

    // Ajouter le statut premium à req pour utilisation dans les controllers
    req.isPremium = isPremiumActive;
    req.isFemaleFree = isFemaleFree;

    next();
  } catch (error) {
    console.error('Erreur vérification premium:', error);
    res.status(500).json({
      error: 'premium_check_error',
      message: 'Erreur lors de la vérification du statut premium',
      redirectTo: '/pages/premium.html',
    });
  }
};

// Middleware pour vérifier premium avec limite pour non-premium
const premiumLimited = (basicLimit = 10) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentification requise',
          },
        });
      }

      const userId = req.user._id;
      const user = await User.findById(userId).select('premium profile');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Utilisateur non trouvé',
          },
        });
      }

      // Vérifier le statut premium
      const isPremiumActive =
        user.premium.isPremium && user.premium.expiration > new Date();
      const isFemaleFree =
        user.premium.isFemaleFree && user.profile.sexe === 'femme';
      const hasFullAccess = isPremiumActive || isFemaleFree;

      // Ajouter les infos à req
      req.isPremium = isPremiumActive;
      req.isFemaleFree = isFemaleFree;
      req.hasFullAccess = hasFullAccess;
      req.basicLimit = basicLimit;

      next();
    } catch (error) {
      console.error('Erreur vérification premium limited:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PREMIUM_CHECK_ERROR',
          message: 'Erreur lors de la vérification du statut premium',
        },
      });
    }
  };
};

// Middleware pour femmes gratuites seulement
const femaleOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentification requise',
        },
      });
    }

    const userId = req.user._id;
    const user = await User.findById(userId).select('profile');

    if (!user || user.profile.sexe !== 'femme') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FEMALE_ONLY',
          message: 'Cette fonctionnalité est réservée aux femmes',
        },
      });
    }

    next();
  } catch (error) {
    console.error('Erreur vérification femme:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GENDER_CHECK_ERROR',
        message: 'Erreur lors de la vérification du genre',
      },
    });
  }
};

// Utilitaire pour vérifier le statut premium d'un utilisateur
const checkPremiumStatus = async userId => {
  try {
    const user = await User.findById(userId).select('premium profile');
    if (!user) return { isPremium: false, isFemaleFree: false };

    const isPremiumActive =
      user.premium.isPremium && user.premium.expiration > new Date();
    const isFemaleFree =
      user.premium.isFemaleFree && user.profile.sexe === 'femme';

    return {
      isPremium: isPremiumActive,
      isFemaleFree,
      hasFullAccess: isPremiumActive || isFemaleFree,
      expiration: user.premium.expiration,
      subscriptionId: user.premium.paypalSubscriptionId,
    };
  } catch (error) {
    console.error('Erreur vérification statut premium:', error);
    return { isPremium: false, isFemaleFree: false };
  }
};

module.exports = {
  premiumOnly,
  premiumLimited,
  femaleOnly,
  checkPremiumStatus,
};
