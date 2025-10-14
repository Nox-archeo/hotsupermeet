const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  verifyAge,
  logout,
} = require('../controllers/authController');
const { auth, updateLastActivity } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('profile.nom').notEmpty().trim().withMessage('Le nom est requis'),
  body('profile.age')
    .isInt({ min: 18, max: 100 })
    .withMessage('Vous devez avoir entre 18 et 100 ans'),
  body('profile.sexe')
    .isIn(['homme', 'femme', 'autre'])
    .withMessage('Sexe invalide'),
  body('profile.localisation')
    .notEmpty()
    .trim()
    .withMessage('La localisation est requise'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Le mot de passe est requis'),
];

const ageValidation = [
  body('birthDate').isISO8601().withMessage('Date de naissance invalide'),
  body('acceptedTerms')
    .isBoolean()
    .withMessage("L'acceptation des conditions doit être un booléen"),
];

// Routes publiques
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/verify-age', ageValidation, verifyAge);

// Routes protégées
router.get('/me', auth, updateLastActivity, getMe);
router.post('/logout', auth, logout);

module.exports = router;
