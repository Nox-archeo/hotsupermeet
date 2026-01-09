const express = require('express');
const fileUpload = require('express-fileupload');
const { body } = require('express-validator');
const crypto = require('crypto');
const mongoose = require('mongoose');
const {
  register,
  login,
  getMe,
  verifyAge,
  checkAgeVerified,
  confirmAge,
  logout,
} = require('../controllers/authController');
const { auth, updateLastActivity } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/emailService');

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

// Route mot de passe oublié (VRAI système avec email)
router.post('/forgot-password', async (req, res) => {
  console.log('🔴 DÉBUT ROUTE FORGOT-PASSWORD - APPELÉE !');
  try {
    const { email } = req.body;
    console.log('🔴 EMAIL REÇU:', email);

    if (!email) {
      return res.status(400).json({
        message: 'Email requis',
        success: false,
      });
    }

    // Normaliser l'email (supprime points Gmail, etc.) COMME pour login/register
    const emailParts = email.toLowerCase().split('@');
    const localPart = emailParts[0].replace(/\./g, ''); // Supprimer points SEULEMENT avant @
    const domain = emailParts[1]; // Garder domaine intact
    const normalizedEmail = `${localPart}@${domain}`;

    console.log('🔴 EMAIL ORIGINAL:', email);
    console.log('🔴 EMAIL NORMALISÉ:', normalizedEmail);

    // Chercher l'utilisateur avec email normalisé
    const user = await User.findOne({
      email: { $in: [email.toLowerCase(), normalizedEmail] },
    });

    console.log('🔴 UTILISATEUR TROUVÉ:', user ? 'OUI' : 'NON');
    if (user) {
      console.log('🔴 EMAIL EN BASE:', user.email);
    }

    if (!user) {
      console.log("🔍 RECHERCHE D'EMAILS SIMILAIRES...");
      const similarUsers = await User.find(
        {
          email: { $regex: 'seb', $options: 'i' },
        },
        'email profile.nom'
      );

      console.log(
        '🔍 EMAILS TROUVÉS AVEC "seb":',
        similarUsers.map(u => u.email)
      );

      // Cherchons aussi par regex exacte
      const exactSearch = await User.findOne({
        email: { $regex: '^' + email.toLowerCase() + '$', $options: 'i' },
      });
      console.log(
        '🔍 RECHERCHE REGEX EXACTE:',
        exactSearch ? 'TROUVÉ' : 'PAS TROUVÉ'
      );
    }
    if (!user) {
      // Réponse identique pour éviter l'énumération d'emails
      return res.json({
        message:
          'Si votre email existe, vous recevrez un lien de récupération.',
        success: true,
      });
    }

    // Générer token sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 heure

    console.log(`🔥 TOKEN GÉNÉRÉ: ${resetToken.substring(0, 10)}...`);
    console.log(`🔥 EMAIL UTILISATEUR: ${email}`);

    // Sauvegarder token dans l'utilisateur
    user.security.resetPasswordToken = resetToken;
    user.security.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    console.log(`🔥 TOKEN SAUVEGARDÉ EN BASE POUR: ${email}`);

    // Envoyer email
    console.log(`🔄 AVANT APPEL sendPasswordResetEmail pour: ${email}`);
    console.log(`🔑 Token généré: ${resetToken.substring(0, 10)}...`);

    try {
      await sendPasswordResetEmail(email, resetToken);
      console.log(`✅ Email envoyé avec succès à: ${email}`);
    } catch (emailError) {
      console.error(`❌ ERREUR EMAIL pour ${email}:`, emailError);
      // On continue quand même pour ne pas révéler si l'email existe
    }

    res.json({
      message: 'Si votre email existe, vous recevrez un lien de récupération.',
      success: true,
    });
  } catch (error) {
    console.error('Erreur forgot-password:', error);
    res.status(500).json({ message: 'Erreur serveur', success: false });
  }
});

// Route reset password
router.post('/reset-password', async (req, res) => {
  console.log('🚨 RESET-PASSWORD: Requête reçue');
  console.log('🚨 BODY:', JSON.stringify(req.body));

  try {
    const { token, newPassword } = req.body;

    console.log('🚨 TOKEN:', token ? token.substring(0, 10) + '...' : 'VIDE');
    console.log('🚨 PASSWORD:', newPassword ? 'REÇU' : 'VIDE');

    if (!token || !newPassword) {
      console.log('❌ DONNÉES MANQUANTES');
      return res.status(400).json({
        message: 'Token et nouveau mot de passe requis',
        success: false,
      });
    }

    if (newPassword.length < 6) {
      console.log('❌ PASSWORD TROP COURT');
      return res.status(400).json({
        message: 'Le mot de passe doit contenir au moins 6 caractères',
        success: false,
      });
    }

    console.log('🔍 RECHERCHE USER...');
    console.log('🕐 TIMESTAMP ACTUEL:', Date.now());
    console.log('🕐 DATE ACTUELLE:', new Date(Date.now()));

    // DÉBOGAGE COMPLET: Chercher TOUS les utilisateurs avec un resetPasswordToken
    const usersWithTokens = await User.find(
      { 'security.resetPasswordToken': { $exists: true, $ne: null } },
      'email security.resetPasswordToken security.resetPasswordExpiry'
    );
    console.log('🔍 USERS AVEC TOKENS EN BASE:', usersWithTokens.length);
    usersWithTokens.forEach((u, i) => {
      console.log(
        `🔐 USER ${i + 1}: ${u.email} - Token: ${u.security?.resetPasswordToken ? u.security.resetPasswordToken.substring(0, 10) + '...' : 'NULL'} - Expiry: ${u.security?.resetPasswordExpiry ? new Date(u.security.resetPasswordExpiry) : 'NULL'}`
      );
    });

    // Chercher l'utilisateur avec le token valide
    const user = await User.findOne({
      'security.resetPasswordToken': token,
      'security.resetPasswordExpiry': { $gt: Date.now() },
    });

    console.log('🚨 USER TROUVÉ:', user ? 'OUI' : 'NON');

    if (!user) {
      console.log('🔍 RECHERCHE TOKEN EXPIRÉ...');
      const expiredUser = await User.findOne({
        'security.resetPasswordToken': token,
      });
      if (expiredUser) {
        console.log('❌ TOKEN EXPIRÉ pour:', expiredUser.email);
        console.log(
          '❌ EXPIRY DATE:',
          new Date(expiredUser.security.resetPasswordExpiry)
        );
        console.log(
          '❌ DIFF EN MS:',
          Date.now() - expiredUser.security.resetPasswordExpiry
        );
        console.log(
          '❌ EXPIRY:',
          new Date(expiredUser.security.resetPasswordExpiry)
        );
        console.log('❌ NOW:', new Date());
      } else {
        console.log('❌ AUCUN TOKEN TROUVÉ');
      }

      return res.status(400).json({
        message: 'Token invalide ou expiré',
        success: false,
      });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword; // Le modèle User hash automatiquement
    user.security.resetPasswordToken = undefined;
    user.security.resetPasswordExpiry = undefined;
    await user.save();

    res.json({
      message: 'Mot de passe mis à jour avec succès',
      success: true,
    });
  } catch (error) {
    console.error('Erreur reset-password:', error);
    res.status(500).json({ message: 'Erreur serveur', success: false });
  }
});

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

    // Vérifier si une demande existe déjà (AVEC CONVERSION CORRECTE)
    const targetObjectId = new mongoose.Types.ObjectId(targetUserId);
    const existingRequest = await PrivatePhotoRequest.findOne({
      requester: requesterId,
      target: targetObjectId,
    });

    console.log('🔍 DEBUG CRÉATION - Vérification demande existante:', {
      requester: requesterId,
      target: targetUserId,
      targetObjectId: targetObjectId,
      found: !!existingRequest,
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
      target: targetObjectId,
      message: message || 'Aimerais voir vos photos privées',
    });

    console.log('🔍 DEBUG CRÉATION - Avant sauvegarde:', {
      requester: newRequest.requester,
      target: newRequest.target,
      requesterType: typeof newRequest.requester,
      targetType: typeof newRequest.target,
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
      status: 'pending', // Ne montrer que les demandes en attente
    })
      .select('_id message createdAt status') // Ne sélectionner que les champs nécessaires
      .sort({ createdAt: -1 });

    // Masquer les informations du demandeur pour la confidentialité
    const sanitizedRequests = requests.map(request => ({
      _id: request._id,
      message: request.message,
      createdAt: request.createdAt,
      status: request.status,
      requester: {
        profile: {
          nom: 'Demandeur anonyme', // Masquer l'identité
        },
      },
    }));

    res.json({
      success: true,
      requests: sanitizedRequests,
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

    // Masquer les informations du destinataire si la demande n'est pas acceptée
    const sanitizedRequests = requests.map(request => ({
      _id: request._id,
      message: request.message,
      createdAt: request.createdAt,
      status: request.status,
      target: {
        _id: request.status === 'accepted' ? request.target._id : 'masked',
        profile: {
          nom:
            request.status === 'accepted'
              ? request.target.profile.nom
              : 'Destinataire masqué',
          photos:
            request.status === 'accepted' ? request.target.profile.photos : [],
        },
      },
    }));

    res.json({
      success: true,
      requests: sanitizedRequests,
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

    // Définir le nouveau statut
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    // Mettre à jour le statut de la demande au lieu de la supprimer
    request.status = newStatus;
    request.respondedAt = new Date();

    console.log('💾 SERVER - Sauvegarde du statut:', newStatus);
    await request.save();

    // Préparer la réponse
    const responseData = {
      _id: request._id,
      requester: request.requester,
      target: request.target,
      status: newStatus,
      message: request.message,
      createdAt: request.createdAt,
      respondedAt: request.respondedAt,
    };

    console.log('✅ DEMANDE PHOTO MISE À JOUR:', {
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
    console.log('📸 CHECK ACCESS AUTH.JS: Fonction appelée avec:', {
      params: req.params,
      userId: req.user?._id,
    });
    try {
      const { targetUserId } = req.params;
      const userId = req.user._id;

      console.log('🔍 DEBUG checkPrivatePhotoAccess AUTH.JS - Début:', {
        requester: userId,
        target: targetUserId,
        requesterStr: userId.toString(),
        targetStr: targetUserId,
      });

      if (userId.toString() === targetUserId) {
        console.log(
          '🔍 DEBUG AUTH.JS - Utilisateur regarde ses propres photos'
        );
        return res.json({
          success: true,
          hasAccess: true,
          isOwner: true,
          reason: 'own_photos',
        });
      }

      // Convertir targetUserId en ObjectId pour la requête
      const targetObjectId = new mongoose.Types.ObjectId(targetUserId);

      console.log('🔍 DEBUG AUTH.JS - Recherche demande acceptée avec:', {
        requester: userId,
        target: targetObjectId,
        status: 'accepted',
      });

      const acceptedRequest = await PrivatePhotoRequest.findOne({
        requester: userId,
        target: targetObjectId,
        status: 'accepted',
      });

      console.log('🔍 DEBUG AUTH.JS - Résultat recherche:', {
        found: !!acceptedRequest,
        acceptedRequest: acceptedRequest,
      });

      // Vérifier s'il y a des demandes dans la collection
      const allRequests = await PrivatePhotoRequest.find({
        requester: userId,
        target: targetObjectId,
      });

      console.log('🔍 DEBUG AUTH.JS - Toutes les demandes pour cette paire:', {
        count: allRequests.length,
        requests: allRequests.map(r => ({
          id: r._id,
          status: r.status,
          createdAt: r.createdAt,
        })),
      });

      const hasAccess = !!acceptedRequest;
      const reason = acceptedRequest ? 'access_granted' : 'no_access';

      console.log('🔍 DEBUG AUTH.JS - Réponse finale:', {
        hasAccess,
        reason,
      });

      res.json({
        success: true,
        hasAccess: hasAccess,
        isOwner: false,
        reason: reason,
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

// Route DELETE pour supprimer une demande de photo privée
router.delete('/private-photos/delete/:requestId', auth, async (req, res) => {
  console.log('🗑️ DELETE PHOTO REQUEST: Fonction appelée avec:', {
    params: req.params,
    userId: req.user?._id,
  });

  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    console.log(`🗑️ Tentative suppression demande ${requestId} par ${userId}`);

    // Vérifier d'abord que la demande existe, peu importe le requester
    const anyRequest = await PrivatePhotoRequest.findById(requestId);
    console.log('🔍 Demande trouvée (any):', anyRequest ? 'OUI' : 'NON');
    if (anyRequest) {
      console.log('🔍 Détails demande:', {
        id: anyRequest._id,
        requester: anyRequest.requester,
        target: anyRequest.target,
        status: anyRequest.status,
      });
    }

    // Trouver la demande et vérifier que l'utilisateur en est le propriétaire (requester)
    const request = await PrivatePhotoRequest.findOne({
      _id: requestId,
      requester: userId, // Seul celui qui a fait la demande peut la supprimer
    });

    console.log('🔍 Demande trouvée (user specific):', request ? 'OUI' : 'NON');

    if (!request) {
      console.log('❌ Demande non trouvée ou accès refusé');
      return res.status(404).json({
        success: false,
        error: {
          message:
            "Demande non trouvée ou vous n'avez pas l'autorisation de la supprimer",
        },
      });
    }

    // Supprimer définitivement de MongoDB
    const deleteResult = await PrivatePhotoRequest.findByIdAndDelete(requestId);
    console.log('🗑️ Résultat suppression:', deleteResult ? 'SUCCÈS' : 'ÉCHEC');

    console.log(
      `✅ Demande de photo privée ${requestId} supprimée définitivement`
    );

    res.json({
      success: true,
      message: 'Demande supprimée définitivement',
    });
  } catch (error) {
    console.error('❌ Erreur suppression demande photo:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur lors de la suppression' },
    });
  }
});

module.exports = router;
