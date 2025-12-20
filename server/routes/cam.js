const express = require('express');
const router = express.Router();
const camController = require('../controllers/camController');
const { auth } = require('../middleware/auth');
const { premiumOnly, premiumLimited } = require('../middleware/premium');

// Routes protégées avec limitation premium
router.get('/stats', auth, camController.getCamStats);
router.get(
  '/compatible-users',
  auth,
  premiumLimited(20),
  camController.getCompatibleUsers
); // 20 utilisateurs max pour non-premium
router.post('/mark-online', auth, premiumOnly, camController.markUserOnline); // PREMIUM SEULEMENT
router.post('/mark-offline', auth, camController.markUserOffline);
router.get(
  '/user/:userId',
  auth,
  premiumLimited(5),
  camController.getUserForCam
); // 5 profils/jour pour non-premium
router.post('/cleanup', auth, camController.cleanupInactiveUsers);

module.exports = router;
