const express = require('express');
const router = express.Router();
const camController = require('../controllers/camController');
const { auth } = require('../middleware/auth');
const { premiumOnly, premiumLimited } = require('../middleware/premium');

// 🟢 Routes cam libres (mode aléatoire)
router.get('/stats', auth, camController.getCamStats); // Libre
router.post('/mark-offline', auth, camController.markUserOffline); // Libre
router.post('/cleanup', auth, camController.cleanupInactiveUsers); // Libre

// ⚠️ Routes cam avec choix de genre - STRICTEMENT PREMIUM
router.get(
  '/compatible-users',
  auth,
  premiumOnly, // 🔒 PREMIUM REQUIS pour filtrer par genre
  camController.getCompatibleUsers
);
router.post('/mark-online', auth, premiumOnly, camController.markUserOnline); // 🔒 PREMIUM REQUIS
router.get(
  '/user/:userId',
  auth,
  premiumOnly, // 🔒 PREMIUM REQUIS pour choisir utilisateur spécifique
  camController.getUserForCam
);

module.exports = router;
