const User = require('../models/User');

const updateLastActivity = async (req, res, next) => {
  try {
    if (req.user && req.user._id) {
      // Mettre à jour la dernière activité de l'utilisateur
      await User.findByIdAndUpdate(
        req.user._id,
        { lastActivity: new Date() },
        { new: true }
      );
    }
    next();
  } catch (error) {
    console.error('Erreur updateLastActivity:', error);
    // Continuer même en cas d'erreur pour ne pas bloquer la route
    next();
  }
};

module.exports = { updateLastActivity };
