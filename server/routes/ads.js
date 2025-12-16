const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const { auth } = require('../middleware/auth'); // ← IMPORT CORRECT !

// Route publique - Récupérer toutes les annonces avec filtres
router.get('/', adController.getAds);

// Route publique - Récupérer une annonce par ID
router.get('/:id', adController.getAdById);

// Route protégée - Créer une nouvelle annonce
router.post('/', auth, adController.createAd); // ← UTILISE auth PAS authMiddleware !

console.log('✅ Routes GET + POST configurées avec controller');

module.exports = router;
