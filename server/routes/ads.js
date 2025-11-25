const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const adController = require('../controllers/adController');

// Route publique - Récupérer toutes les annonces avec filtres
router.get('/', adController.getAds);

// Route publique - Récupérer une annonce par ID
router.get('/:id', adController.getAdById);

// Routes protégées (nécessitent authentification)
router.use(authMiddleware);

// Créer une nouvelle annonce avec upload d'images
router.post(
  '/',
  upload.array('photos', 5), // Jusqu'à 5 photos
  adController.createAd
);

// Récupérer les annonces de l'utilisateur connecté
router.get('/my-ads', adController.getUserAds);

// Mettre à jour une annonce
router.put('/:id', adController.updateAd);

// Renouveler une annonce pour 30 jours supplémentaires
router.put('/:id/renew', adController.renewAd);

// Supprimer une annonce
router.delete('/:id', adController.deleteAd);

// Répondre à une annonce (envoyer un message)
router.post('/:id/respond', adController.respondToAd);

module.exports = router;
