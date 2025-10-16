const express = require('express');
const {
  getSubscriptionInfo,
  activateFemaleFreeSubscription,
  checkPremiumAccess,
  getSubscriptionStats,
  requirePremium,
} = require('../controllers/subscriptionController');
const { auth, updateLastActivity } = require('../middleware/auth');

const router = express.Router();

// Routes protégées
router.get('/info', auth, updateLastActivity, getSubscriptionInfo);
router.post(
  '/activate-free',
  auth,
  updateLastActivity,
  activateFemaleFreeSubscription
);
router.get(
  '/check-access/:feature',
  auth,
  updateLastActivity,
  checkPremiumAccess
);

// Route admin pour les statistiques
router.get('/stats', auth, updateLastActivity, getSubscriptionStats);

module.exports = router;
