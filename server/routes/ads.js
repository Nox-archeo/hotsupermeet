const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adController = require('../controllers/adController');

// Route publique - Récupérer toutes les annonces avec filtres
router.get('/ads', adController.getAds);

// Route publique - Récupérer une annonce par ID
router.get('/ads/:id', adController.getAdById);

// Routes protégées (nécessitent authentification)
router.use(authMiddleware);

// Créer une nouvelle annonce - accepte JSON (pas multipart)
router.post('/ads', adController.createAd);

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

module.exports = router;
