const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');

// Route publique - Récupérer toutes les annonces avec filtres
router.get('/', adController.getAds);

// Route publique - Récupérer une annonce par ID
router.get('/:id', adController.getAdById);

// POST géré par route directe dans server.js qui fonctionne
console.log('ℹ️ Routes GET seulement - POST dans server.js');

module.exports = router;
