const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adController = require('../controllers/adController');

// Route publique - Récupérer toutes les annonces avec filtres
router.get('/', adController.getAds); // ← Changé de '/ads' à '/'

// Route publique - Récupérer une annonce par ID
router.get('/:id', adController.getAdById); // ← Changé de '/ads/:id' à '/:id'

// Créer une nouvelle annonce - ROUTE PROTÉGÉE SPÉCIFIQUE
router.post('/', authMiddleware, adController.createAd); // ← Changé de '/ads' à '/'

// Routes protégées (nécessitent authentification)
router.use(authMiddleware);

// Récupérer les annonces de l'utilisateur connecté
router.get('/my-ads', adController.getUserAds);

// Mettre à jour une annonce
router.put('/:id', adController.updateAd);

// Supprimer une annonce
router.delete('/:id', adController.deleteAd);

// Répondre à une annonce (envoyer un message)
router.post('/:id/respond', adController.respondToAd); // ← Changé de '/ads/:id/respond' à '/:id/respond'

// Récupérer les réponses aux annonces de l'utilisateur
router.get('/responses', adController.getAdResponses);

module.exports = router;
