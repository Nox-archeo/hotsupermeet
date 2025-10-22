const express = require('express');
const { body } = require('express-validator');
const {
  getUsers,
  getUserProfile,
  updateUserProfile,
  searchUsers,
  getDirectoryStats,
  deleteAccount,
} = require('../controllers/userController');
const { auth, updateLastActivity } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const updateProfileValidation = [
  body('profile.nom')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  body('profile.age')
    .optional()
    .isInt({ min: 18, max: 100 })
    .withMessage("L'âge doit être compris entre 18 et 100 ans"),
  body('profile.bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La bio ne peut pas dépasser 500 caractères'),
  body('profile.localisation')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La localisation doit contenir entre 2 et 100 caractères'),
  body('profile.pratiques')
    .optional()
    .isArray()
    .withMessage('Les pratiques doivent être un tableau'),
  body('profile.pratiques.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Chaque pratique ne peut pas dépasser 50 caractères'),
];

const searchValidation = [
  body('query')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La recherche ne peut pas dépasser 100 caractères'),
  body('ageMin')
    .optional()
    .isInt({ min: 18, max: 100 })
    .withMessage("L'âge minimum doit être compris entre 18 et 100 ans"),
  body('ageMax')
    .optional()
    .isInt({ min: 18, max: 100 })
    .withMessage("L'âge maximum doit être compris entre 18 et 100 ans"),
  body('sexe')
    .optional()
    .isIn(['homme', 'femme', 'autre', 'tous'])
    .withMessage('Sexe invalide'),
  body('localisation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La localisation ne peut pas dépasser 100 caractères'),
  body('pratiques')
    .optional()
    .isArray()
    .withMessage('Les pratiques doivent être un tableau'),
  body('pratiques.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Chaque pratique ne peut pas dépasser 50 caractères'),
  body('premiumOnly')
    .optional()
    .isBoolean()
    .withMessage('premiumOnly doit être un booléen'),
  body('onlineOnly')
    .optional()
    .isBoolean()
    .withMessage('onlineOnly doit être un booléen'),
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La page doit être un nombre positif'),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La limite doit être comprise entre 1 et 100'),
];

// Routes publiques
router.get('/', getUsers); // GET /api/users?ageMin=25&ageMax=40&sexe=femme&page=1&limit=20
router.get('/stats', getDirectoryStats); // GET /api/users/stats
router.get('/:id', getUserProfile); // GET /api/users/:id

// Routes protégées
router.put(
  '/profile',
  auth,
  updateLastActivity,
  updateProfileValidation,
  updateUserProfile
); // PUT /api/users/profile
router.post('/search', auth, updateLastActivity, searchValidation, searchUsers); // POST /api/users/search

// Route de suppression de compte
router.delete(
  '/delete-account',
  auth,
  [
    body('confirmPassword')
      .notEmpty()
      .withMessage('Le mot de passe de confirmation est requis'),
  ],
  deleteAccount
); // DELETE /api/users/delete-account

module.exports = router;
