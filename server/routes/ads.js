const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adController = require('../controllers/adController');

// Route publique - Récupérer toutes les annonces avec filtres
router.get('/ads', adController.getAds);

// Route publique - Récupérer une annonce par ID
router.get('/ads/:id', adController.getAdById);

// Créer une nouvelle annonce - ROUTE PROTÉGÉE SPÉCIFIQUE
router.post('/ads', authMiddleware, adController.createAd);

// Routes protégées (nécessitent authentification)
router.use(authMiddleware);

// Récupérer les annonces de l'utilisateur connecté
router.get('/my-ads', adController.getUserAds);

// Mettre à jour une annonce
router.put('/ads/:id', adController.updateAd);

// Renouveler une annonce pour 30 jours supplémentaires
router.put('/ads/:id/renew', adController.renewAd);

// Supprimer une annonce
router.delete('/ads/:id', adController.deleteAd);

// Répondre à une annonce (envoyer un message)
router.post('/ads/:id/respond', adController.respondToAd);

// Récupérer les réponses aux annonces de l'utilisateur
router.get('/responses', adController.getAdResponses);

module.exports = router;
