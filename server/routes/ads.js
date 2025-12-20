const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const { auth } = require('../middleware/auth'); // ← IMPORT CORRECT !
const { premiumOnly, premiumLimited } = require('../middleware/premium');

// ⛔ ROUTES STRICTEMENT PREMIUM - ANNONCES 100% BLOQUÉES POUR NON-PREMIUM
// Route PREMIUM - Récupérer toutes les annonces avec filtres
router.get('/', premiumOnly, adController.getAds); // ⛔ PREMIUM REQUIS POUR VOIR LES ANNONCES

// Route PREMIUM - Récupérer une annonce par ID
router.get('/:id', premiumOnly, adController.getAdById); // ⛔ PREMIUM REQUIS POUR VOIR UNE ANNONCE

// Route protégée PREMIUM - Créer une nouvelle annonce
router.post('/', auth, premiumOnly, adController.createAd); // ⛔ PREMIUM REQUIS POUR CRÉER

console.log('✅ Routes GET + POST configurées avec controller');

module.exports = router;
