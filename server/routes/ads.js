const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const authMiddleware = require('../middleware/auth');

// Route publique - Récupérer toutes les annonces avec filtres
router.get('/', adController.getAds);

// Route publique - Récupérer une annonce par ID
router.get('/:id', adController.getAdById);

// Route protégée - Créer une annonce
router.post('/', authMiddleware, adController.createAd);

// Routes protégées - Mes annonces
router.get('/my-ads', authMiddleware, adController.getUserAds);

module.exports = router;
