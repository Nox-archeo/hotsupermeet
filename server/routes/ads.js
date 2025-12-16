const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');

// Route publique - Récupérer toutes les annonces avec filtres
router.get('/', adController.getAds);

// Route publique - Récupérer une annonce par ID
router.get('/:id', adController.getAdById);

// CRÉATION TEMPORAIREMENT DÉSACTIVÉE - FIX DU MIDDLEWARE EN COURS
console.log('⚠️ Route POST création désactivée temporairement');

module.exports = router;
