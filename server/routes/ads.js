const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const { auth } = require('../middleware/auth'); // ← IMPORT CORRECT !
const { premiumOnly, premiumLimited } = require('../middleware/premium');

// Routes avec auth normale (gestion premium dans controllers)
// Route pour récupérer toutes les annonces avec filtres
router.get('/', adController.getAds); // Public avec gestion premium dans controller

// Route pour récupérer une annonce par ID
router.get('/:id', adController.getAdById); // Public avec gestion premium dans controller

// Route protégée - Créer une nouvelle annonce (premium requis)
router.post('/', auth, premiumOnly, adController.createAd); // Création = premium obligatoire

// ✅ ROUTES MANQUANTES RESTAURÉES - Gestion des annonces utilisateur
router.get('/user/my-ads', auth, adController.getUserAds); // Mes annonces
router.put('/:id', auth, adController.updateAd); // Modifier annonce
router.delete('/:id', auth, adController.deleteAd); // Supprimer annonce
router.post('/:id/respond', auth, adController.respondToAd); // Répondre à annonce
router.get('/:id/responses', auth, adController.getAdResponses); // Voir réponses

console.log('✅ Routes complètes configurées avec controller');

module.exports = router;
