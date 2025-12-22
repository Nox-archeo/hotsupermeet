const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const { auth } = require('../middleware/auth'); // ← IMPORT CORRECT !
const { premiumOnly, premiumLimited } = require('../middleware/premium');

// Routes STRICTEMENT PREMIUM - Toutes les annonces nécessitent premium
// Route pour récupérer toutes les annonces avec filtres
router.get('/', auth, premiumOnly, adController.getAds); // PREMIUM OBLIGATOIRE

// Route pour récupérer une annonce par ID
router.get('/:id', auth, premiumOnly, adController.getAdById); // PREMIUM OBLIGATOIRE

// Route protégée - Créer une nouvelle annonce (premium requis)
router.post('/', auth, premiumOnly, adController.createAd); // Création = premium obligatoire

// ✅ ROUTES MANQUANTES RESTAURÉES - Gestion des annonces utilisateur
router.get('/user/my-ads', auth, premiumOnly, adController.getUserAds); // PREMIUM OBLIGATOIRE
router.put('/:id', auth, premiumOnly, adController.updateAd); // PREMIUM OBLIGATOIRE
router.delete('/:id', auth, premiumOnly, adController.deleteAd); // PREMIUM OBLIGATOIRE
router.post('/:id/respond', auth, premiumOnly, adController.respondToAd); // PREMIUM OBLIGATOIRE
router.get('/:id/responses', auth, premiumOnly, adController.getAdResponses); // PREMIUM OBLIGATOIRE

console.log(
  '✅ Routes PREMIUM STRICTES configurées - toutes les annonces nécessitent premium'
);

module.exports = router;
