# 🚀 CONFIGURATION RENDER POUR PAYPAL PREMIUM

## ✅ VARIABLES D'ENVIRONNEMENT RENDER

Ajoutez ces variables dans votre dashboard Render (Environment Variables) :

```
# PayPal Live Configuration
PAYPAL_MODE=live
PREMIUM_PRICE=5.75

# Ces 3 variables vous les avez déjà sur PayPal :
PAYPAL_CLIENT_ID=votre_client_id_live
PAYPAL_SECRET=votre_secret_live
PAYPAL_PLAN_ID=votre_plan_mensuel_id

# Webhook ID - À récupérer après configuration webhook
PAYPAL_WEBHOOK_ID=votre_webhook_id
```

## 📡 CONFIGURATION WEBHOOK PAYPAL

1. Allez sur https://developer.paypal.com/developer/notifications/
2. Créez un webhook avec cette URL :
   ```
   https://votre-app.onrender.com/api/payments/webhook
   ```
3. Sélectionnez ces événements :
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
   - `BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED`

4. Copiez l'ID du webhook et ajoutez `PAYPAL_WEBHOOK_ID=xxx` sur Render

## 🎯 APRÈS DÉPLOIEMENT

Testez ces URLs :

- `https://votre-app.onrender.com/premium` (page premium)
- `https://votre-app.onrender.com/api/payments/config` (config PayPal)
- `https://votre-app.onrender.com/api/payments/pricing` (tarifs)

## 🔧 DÉPLOIEMENT

```bash
./deploy-premium.sh
```

C'est tout ! Le système PayPal Premium sera opérationnel 🚀
