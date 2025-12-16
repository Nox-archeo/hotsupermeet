const express = require('express');
const router = express.Router();

// Test simple pour vérifier que l'import fonctionne
console.log('🔧 TENTATIVE IMPORT CONTROLLER ADS...');
try {
  const adController = require('../controllers/adController');
  console.log('✅ Controller importé avec succès');
  console.log('📋 Fonctions disponibles:', Object.keys(adController));
} catch (error) {
  console.error('❌ ERREUR IMPORT CONTROLLER:', error);
}

const adController = require('../controllers/adController');

// Route publique - Récupérer toutes les annonces avec filtres
router.get('/', adController.getAds);

module.exports = router;
