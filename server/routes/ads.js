const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const authMiddleware = require('../middleware/auth');

// Route publique - Récupérer toutes les annonces avec filtres
router.get('/', adController.getAds);

// Route publique - Récupérer une annonce par ID
router.get('/:id', adController.getAdById);

// Route protégée - Créer une nouvelle annonce
router.post('/', authMiddleware, adController.createAd);

console.log('✅ Routes GET + POST configurées avec controller');

module.exports = router;
