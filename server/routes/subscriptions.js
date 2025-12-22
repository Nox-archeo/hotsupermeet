const express = require('express');
const {
  getSubscriptionInfo,
  // activateFemaleFreeSubscription supprimé - plus d'accès gratuit femmes
  checkPremiumAccess,
  getSubscriptionStats,
  requirePremium,
} = require('../controllers/subscriptionController');
const { auth, updateLastActivity } = require('../middleware/auth');

const router = express.Router();

// Routes protégées
router.get('/info', auth, updateLastActivity, getSubscriptionInfo);
// ROUTE SUPPRIMÉE - Plus d'accès gratuit pour les femmes
// router.post('/activate-free', auth, updateLastActivity, activateFemaleFreeSubscription);
router.get(
  '/check-access/:feature',
  auth,
  updateLastActivity,
  checkPremiumAccess
);

// Route admin pour les statistiques
router.get('/stats', auth, updateLastActivity, getSubscriptionStats);

module.exports = router;
