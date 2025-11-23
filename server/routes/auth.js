
Camille
Il y a 6 h

"Aimerais voir vos photos privées"
📸 Demande d'accès aux photos privées
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

// Route pour récupérer les demandes REÇUES
router.get('/private-photos/received', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await PrivatePhotoRequest.find({ 
      target: userId,
      status: 'pending'  // Ne montrer que les demandes en attente
    })
      .populate('requester', 'profile')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests: requests,
    });
  } catch (error) {
    console.error('Erreur récupération demandes reçues:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur' },
    });
  }
});

// Route pour récupérer les demandes ENVOYÉES
router.get('/private-photos/sent', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await PrivatePhotoRequest.find({ requester: userId })
      .populate('target', 'profile')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests: requests,
    });
  } catch (error) {
    console.error('Erreur récupération demandes envoyées:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur' },
    });
  }
});

// Route pour RÉPONDRE à une demande (accepter/refuser)
router.post('/private-photos/respond', auth, async (req, res) => {
  try {
    console.log('🔥 SERVER - Route /private-photos/respond appelée');
    console.log('🔥 SERVER - Body reçu:', req.body);
    console.log('🔥 SERVER - User ID:', req.user._id);

    const { requestId, action } = req.body;
    const userId = req.user._id;

    if (!['accept', 'reject'].includes(action)) {
      console.log('❌ SERVER - Action invalide:', action);
      return res.status(400).json({
        success: false,
        error: { message: 'Action invalide' },
      });
    }

    console.log('🔍 SERVER - Recherche de la demande:', requestId);
    const request = await PrivatePhotoRequest.findById(requestId);

    if (!request) {
      console.log('❌ SERVER - Demande non trouvée:', requestId);
      return res.status(404).json({
        success: false,
        error: { message: 'Demande non trouvée' },
      });
    }

    console.log('📋 SERVER - Demande trouvée:', request);
    console.log('🎯 SERVER - Target de la demande:', request.target);
    console.log('👤 SERVER - User connecté:', userId);

    // Vérifier que l'utilisateur est bien le destinataire de la demande
    if (request.target.toString() !== userId.toString()) {
      console.log(
        '❌ SERVER - Non autorisé - Target vs User:',
        request.target.toString(),
        'vs',
        userId.toString()
      );
      return res.status(403).json({
        success: false,
        error: { message: 'Non autorisé' },
      });
    }

    // Au lieu de sauvegarder, on supprime directement la demande !
    console.log('🗑️ SERVER - Suppression de la demande après réponse');
    
    // Sauvegarder les infos importantes pour la réponse
    const responseData = {
      _id: request._id,
      requester: request.requester,
      target: request.target,
      status: newStatus,
      message: request.message,
      createdAt: request.createdAt,
      respondedAt: new Date()
    };

    // SUPPRIMER la demande de la base de données
    await PrivatePhotoRequest.findByIdAndRemove(requestId);

    console.log('✅ DEMANDE PHOTO SUPPRIMÉE:', {
      requestId,
      action,
      status: newStatus,
    });

    res.json({
      success: true,
      message:
        action === 'accept' ? 'Accès accordé avec succès' : 'Demande refusée',
      request: responseData,
      notifyRequester: true, // Signal pour notifier le demandeur
    });
  } catch (error) {
    console.error('Erreur réponse demande photo:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur' },
    });
  }
});

// Route pour vérifier l'accès aux photos privées
router.get(
  '/private-photos/check-access/:targetUserId',
  auth,
  async (req, res) => {
    try {
      const { targetUserId } = req.params;
      const userId = req.user._id;

      if (userId.toString() === targetUserId) {
        return res.json({
          success: true,
          hasAccess: true,
          reason: 'own_photos',
        });
      }

      const acceptedRequest = await PrivatePhotoRequest.findOne({
        requester: userId,
        target: targetUserId,
        status: 'accepted',
      });

      res.json({
        success: true,
        hasAccess: !!acceptedRequest,
        reason: acceptedRequest ? 'request_accepted' : 'no_access',
      });
    } catch (error) {
      console.error('Erreur vérification accès photos:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Erreur serveur' },
      });
    }
  }
);

module.exports = router;
