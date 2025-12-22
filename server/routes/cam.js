const express = require('express');
const router = express.Router();
const camController = require('../controllers/camController');
const { auth } = require('../middleware/auth');
const { premiumOnly, premiumLimited } = require('../middleware/premium');

// 🟢 Routes cam LIBRES (mode "tous" seulement pour non-premium)
router.get('/stats', auth, camController.getCamStats); // Libre
router.post('/mark-offline', auth, camController.markUserOffline); // Libre
router.post('/cleanup', auth, camController.cleanupInactiveUsers); // Libre
router.post('/mark-online', auth, camController.markUserOnline); // Libre maintenant

// ⚠️ Routes cam avec restrictions - Premium pour filtres genre
router.get(
  '/compatible-users',
  auth,
  premiumLimited(), // 🎆 Libre mais vérification premium pour filtres
  camController.getCompatibleUsers
);
router.get(
  '/user/:userId',
  auth,
  premiumLimited(), // 🎆 Libre mais vérification premium pour filtres
  camController.getUserForCam
);

module.exports = router;
