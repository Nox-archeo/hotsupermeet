const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware pour vérifier le token JWT
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: "Token d'accès manquant",
        },
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    if (user.security.isBlocked) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_BLOCKED',
          message: 'Votre compte a été bloqué',
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Erreur d'authentification:", error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token expiré',
        },
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token invalide',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: "Erreur d'authentification",
      },
    });
  }
};

// Middleware pour vérifier le statut premium
const requirePremium = (req, res, next) => {
  if (!req.user.premium.isPremium) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'PREMIUM_REQUIRED',
        message: 'Abonnement premium requis pour cette fonctionnalité',
      },
    });
  }
  next();
};

// Middleware pour vérifier si l'utilisateur est une femme (pour la gratuité)
const isFemale = (req, res, next) => {
  if (req.user.profile.sexe !== 'femme') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'ACCESS_DENIED',
        message: 'Accès réservé aux femmes',
      },
    });
  }
  next();
};

// Middleware pour mettre à jour la dernière activité
const updateLastActivity = async (req, res, next) => {
  if (req.user) {
    try {
      await req.user.updateLastActive();
    } catch (error) {
      console.error('Erreur mise à jour activité:', error);
    }
  }
  next();
};

// Générer un token JWT
const generateToken = userId => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.TOKEN_EXPIRY || '7d',
  });
};

module.exports = {
  auth,
  requirePremium,
  isFemale,
  updateLastActivity,
  generateToken,
};
