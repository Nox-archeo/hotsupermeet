const express = require('express');
const { body } = require('express-validator');
const {
  createTonightMeet,
  getTonightMeets,
  likeTonightMeet,
  getTonightMeetLikes,
  acceptLike,
  rejectLike,
  getUserTonightMeets,
  deleteTonightMeet,
} = require('../controllers/tonightController');
const { auth, updateLastActivity } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createTonightMeetValidation = [
  body('fullDetails.lieu')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Le lieu doit contenir entre 5 et 200 caractères'),
  body('fullDetails.date').isDate().withMessage('La date doit être valide'),
  body('fullDetails.heure_debut')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("L'heure de début doit être au format HH:MM"),
  body('fullDetails.heure_fin')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("L'heure de fin doit être au format HH:MM"),
  body('fullDetails.description_personne')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('La description doit contenir entre 10 et 500 caractères'),
  body('fullDetails.type_rencontre')
    .isIn([
      'discussion',
      'flirt',
      'sensuel',
      'passionne',
      'erotique',
      'immediat',
    ])
    .withMessage('Type de rencontre invalide'),
  body('visibilityCriteria.ageMin')
    .isInt({ min: 18, max: 100 })
    .withMessage("L'âge minimum doit être compris entre 18 et 100 ans"),
  body('visibilityCriteria.ageMax')
    .isInt({ min: 18, max: 100 })
    .withMessage("L'âge maximum doit être compris entre 18 et 100 ans"),
  body('visibilityCriteria.sexe')
    .isIn(['homme', 'femme', 'autre', 'tous'])
    .withMessage('Sexe invalide'),
];

const likeValidation = [
  body('tonightMeetId').isMongoId().withMessage('ID de rencontre invalide'),
];

// Routes publiques
router.get('/', getTonightMeets); // GET /api/tonight?page=1&limit=20

// Routes protégées
router.post(
  '/',
  auth,
  updateLastActivity,
  createTonightMeetValidation,
  createTonightMeet
); // POST /api/tonight
router.get('/my-meets', auth, updateLastActivity, getUserTonightMeets); // GET /api/tonight/my-meets
router.post('/like', auth, updateLastActivity, likeValidation, likeTonightMeet); // POST /api/tonight/like
router.get('/:id/likes', auth, updateLastActivity, getTonightMeetLikes); // GET /api/tonight/:id/likes
router.put('/:id/likes/:likeId/accept', auth, updateLastActivity, acceptLike); // PUT /api/tonight/:id/likes/:likeId/accept
router.put('/:id/likes/:likeId/reject', auth, updateLastActivity, rejectLike); // PUT /api/tonight/:id/likes/:likeId/reject
router.delete('/:id', auth, updateLastActivity, deleteTonightMeet); // DELETE /api/tonight/:id

module.exports = router;
