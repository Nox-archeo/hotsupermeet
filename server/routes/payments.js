const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');

// Validation pour la création d'abonnement
const subscriptionValidation = [
  body('planType')
    .isIn(['monthly', 'annual'])
    .withMessage('Le type de plan doit être mensuel ou annuel'),
];

// Routes protégées par authentification
router.post('/subscribe', auth, subscriptionValidation, (req, res, next) => {
  paymentController.createSubscription(req, res).catch(next);
});

// Route pour redirect checkout (alias de subscribe)
router.post(
  '/create-subscription-redirect',
  auth,
  subscriptionValidation,
  (req, res, next) => {
    paymentController.createSubscription(req, res).catch(next);
  }
);

router.post('/activate-premium', auth, (req, res, next) => {
  paymentController.activatePremium(req, res).catch(next);
});
router.get('/status', auth, (req, res, next) => {
  paymentController.getSubscriptionStatus(req, res).catch(next);
});
router.post('/cancel', auth, (req, res, next) => {
  paymentController.cancelSubscription(req, res).catch(next);
});
router.get('/pricing', (req, res, next) => {
  paymentController.getPricingInfo(req, res).catch(next);
});

// Route pour la configuration PayPal (client ID et plan ID)
router.get('/config', (req, res) => {
  res.json({
    success: true,
    clientId: process.env.PAYPAL_CLIENT_ID,
    planMonthlyId: process.env.PAYPAL_PLAN_MONTHLY_ID,
    planYearlyId: process.env.PAYPAL_PLAN_YEARLY_ID,
    environment: process.env.PAYPAL_ENVIRONMENT,
    returnUrl: 'https://www.hotsupermeet.com/merci-abonnement',
    cancelUrl: 'https://www.hotsupermeet.com/abonnement-annule',
  });
});

// Routes publiques pour les callbacks PayPal
router.get('/confirm', (req, res, next) => {
  paymentController.confirmSubscription(req, res).catch(next);
});
router.post('/webhook', (req, res, next) => {
  paymentController.handleWebhook(req, res).catch(next);
});

// Route webhook PayPal selon vos variables d'environnement
// URL: https://www.hotsupermeet.com/api/paypal-webhook
router.post('/paypal-webhook', (req, res, next) => {
  paymentController.handleWebhook(req, res).catch(next);
});

// Routes pour les pages de retour PayPal
router.get('/success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Paiement Réussi - HotMeet</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0; 
          padding: 20px; 
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container { 
          background: white; 
          padding: 40px; 
          border-radius: 10px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          text-align: center;
          max-width: 500px;
        }
        .success-icon { 
          color: #4CAF50; 
          font-size: 48px; 
          margin-bottom: 20px;
        }
        h1 { 
          color: #333; 
          margin-bottom: 20px;
        }
        p { 
          color: #666; 
          line-height: 1.6;
          margin-bottom: 30px;
        }
        .btn { 
          background: #667eea; 
          color: white; 
          padding: 12px 30px; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer; 
          text-decoration: none;
          display: inline-block;
          font-size: 16px;
          transition: background 0.3s;
        }
        .btn:hover { 
          background: #5a6fd8; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">✓</div>
        <h1>Paiement Réussi !</h1>
        <p>Votre abonnement premium a été activé avec succès. Vous avez maintenant accès à toutes les fonctionnalités premium de HotMeet.</p>
        <a href="/premium" class="btn">Accéder à votre compte premium</a>
      </div>
      <script>
        setTimeout(() => {
          window.location.href = '/premium';
        }, 5000);
      </script>
    </body>
    </html>
  `);
});

router.get('/cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Paiement Annulé - HotMeet</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
          margin: 0; 
          padding: 20px; 
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container { 
          background: white; 
          padding: 40px; 
          border-radius: 10px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          text-align: center;
          max-width: 500px;
        }
        .cancel-icon { 
          color: #ff6b6b; 
          font-size: 48px; 
          margin-bottom: 20px;
        }
        h1 { 
          color: #333; 
          margin-bottom: 20px;
        }
        p { 
          color: #666; 
          line-height: 1.6;
          margin-bottom: 30px;
        }
        .btn { 
          background: #ff6b6b; 
          color: white; 
          padding: 12px 30px; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer; 
          text-decoration: none;
          display: inline-block;
          font-size: 16px;
          transition: background 0.3s;
        }
        .btn:hover { 
          background: #ee5a52; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="cancel-icon">✕</div>
        <h1>Paiement Annulé</h1>
        <p>Votre processus de paiement a été annulé. Vous pouvez réessayer à tout moment si vous changez d'avis.</p>
        <a href="/premium" class="btn">Retour à la page premium</a>
      </div>
      <script>
        setTimeout(() => {
          window.location.href = '/premium';
        }, 5000);
      </script>
    </body>
    </html>
  `);
});

module.exports = router;
