const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const { auth } = require('../middleware/auth'); // ← IMPORT CORRECT !
const { premiumOnly, premiumLimited } = require('../middleware/premium');

// Route publique - Récupérer toutes les annonces avec filtres (limitée pour non-premium)
router.get('/', premiumLimited(20), adController.getAds); // 20 annonces max pour non-premium

// Route publique - Récupérer une annonce par ID
router.get('/:id', adController.getAdById);

// Route protégée PREMIUM - Créer une nouvelle annonce
router.post('/', auth, premiumOnly, adController.createAd); // PREMIUM SEULEMENT !

console.log('✅ Routes GET + POST configurées avec controller');

module.exports = router;
