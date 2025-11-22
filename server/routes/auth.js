const express = require('express');
const fileUpload = require('express-fileupload');
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  verifyAge,
  checkAgeVerified,
  confirmAge,
  logout,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { auth, updateLastActivity } = require('../middleware/auth');

// IMPORTS POUR PRIVATE PHOTOS
const PrivatePhotoRequest = require('../models/PrivatePhotoRequest');
const User = require('../models/User');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('nom').notEmpty().trim().withMessage('Le nom est requis'),
  body('age')
    .isInt({ min: 18, max: 100 })
    .withMessage('Vous devez avoir entre 18 et 100 ans'),
  body('sexe').isIn(['homme', 'femme', 'autre']).withMessage('Sexe invalide'),
  body('pays').notEmpty().trim().withMessage('Le pays est requis'),
  body('region').notEmpty().trim().withMessage('La région est requise'),
  body('ville').notEmpty().trim().withMessage('La ville est requise'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Le mot de passe est requis'),
];

const ageValidation = [
  body('birthDate').isISO8601().withMessage('Date de naissance invalide'),
  body('acceptedTerms')
    .isBoolean()
    .withMessage('L\\' + 'acceptation des conditions doit être un booléen'),
];

// Routes publiques
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/verify-age', ageValidation, verifyAge);
router.get('/age-verified', checkAgeVerified);
router.post('/confirm-age', confirmAge);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Routes protégées
router.get('/me', auth, updateLastActivity, getMe);
router.post('/logout', auth, logout);

// SOLUTION TEMPORAIRE: Route private-photos dans auth.js car server.js ne se met pas à jour
router.post('/private-photos/send-request', auth, async (req, res) => {
  console.log('� ROUTE PRIVATE PHOTOS: Fonction appelée avec:', {
    body: req.body,
    userId: req.user?._id,
  });
  try {
    const { targetUserId, message } = req.body;
    const requesterId = req.user._id;

    // Vérifications de base
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: { message: 'ID utilisateur cible requis' },
      });
    }

    if (requesterId.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Impossible de faire une demande à soi-même' },
      });
    }

    // Vérifier que l'utilisateur cible existe
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: { message: 'Utilisateur non trouvé' },
      });
    }

    // Vérifier si une demande existe déjà
    const existingRequest = await PrivatePhotoRequest.findOne({
      requester: requesterId,
      target: targetUserId,
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        error: {
          message:
            existingRequest.status === 'pending'
              ? 'Demande déjà envoyée'
              : `Demande déjà ${existingRequest.status === 'accepted' ? 'acceptée' : 'refusée'}`,
        },
      });
    }

    // Créer la nouvelle demande
    const newRequest = new PrivatePhotoRequest({
      requester: requesterId,
      target: targetUserId,
      message: message || 'Aimerais voir vos photos privées',
    });

    await newRequest.save();

    console.log('✅ DEMANDE PHOTO PRIVÉE CRÉÉE:', newRequest);

    res.json({
      success: true,
      message: "Demande d'accès envoyée avec succès",
      request: newRequest,
    });
  } catch (error) {
    console.error('Erreur route private photos:', error);
    res.status(500).json({
      success: false,
      error: { message: "Erreur serveur lors de l'envoi de la demande" },
    });
  }
});

module.exports = router;
