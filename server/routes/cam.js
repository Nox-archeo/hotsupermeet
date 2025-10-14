const express = require('express');
const router = express.Router();
const camController = require('../controllers/camController');
const auth = require('../middleware/auth');

// Routes protégées par authentification
router.get('/stats', auth, camController.getCamStats);
router.get('/compatible-users', auth, camController.getCompatibleUsers);
router.post('/mark-online', auth, camController.markUserOnline);
router.post('/mark-offline', auth, camController.markUserOffline);
router.get('/user/:userId', auth, camController.getUserForCam);
router.post('/cleanup', auth, camController.cleanupInactiveUsers);

module.exports = router;
