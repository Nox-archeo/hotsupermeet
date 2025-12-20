#!/bin/bash

# 🚀 Déploiement PayPal Premium sur Render
echo "🔥 DÉPLOIEMENT PAYPAL PREMIUM SUR RENDER"
echo "======================================"

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "server.js" ]; then
    echo "❌ Erreur: Vous devez être dans le répertoire racine du projet"
    exit 1
fi

echo "📦 Préparation du déploiement..."

# Ajouter tous les fichiers
git add .

# Commit avec message
git commit -m "🔥 Intégration système PayPal Premium complet

✅ Service PayPal avec webhooks sécurisés
✅ Middleware premium avec 3 niveaux de protection
✅ Frontend premium-manager dynamique  
✅ Page premium avec SDK PayPal dynamique
✅ Routes protégées: messages, annonces, cam, annuaire
✅ Accès gratuit pour femmes
✅ Modèle freemium complet

Configuration requise sur Render:
- PAYPAL_CLIENT_ID (LIVE)
- PAYPAL_SECRET (LIVE)  
- PAYPAL_MODE=live
- PAYPAL_PLAN_ID (votre plan mensuel)
- PAYPAL_WEBHOOK_ID (webhook configuré)
- PREMIUM_PRICE=5.75"

# Push vers la branche main
echo "🚀 Push vers GitHub..."
git push origin main

echo ""
echo "✅ Code poussé vers GitHub !"
echo ""
echo "🔧 CONFIGURATION RENDER REQUISE:"
echo "================================="
echo "Variables d'environnement à vérifier:"
echo "- PAYPAL_CLIENT_ID (votre client ID LIVE)"
echo "- PAYPAL_SECRET (votre secret LIVE)"
echo "- PAYPAL_MODE=live"  
echo "- PAYPAL_PLAN_ID (votre plan d'abonnement mensuel)"
echo "- PAYPAL_WEBHOOK_ID (votre webhook ID)"
echo "- PREMIUM_PRICE=5.75"
echo ""
echo "🌐 Endpoints à tester après déploiement:"
echo "- https://votre-app.onrender.com/api/payments/config"
echo "- https://votre-app.onrender.com/api/payments/pricing"  
echo "- https://votre-app.onrender.com/premium"
echo ""
echo "📡 Webhook PayPal à configurer:"
echo "URL: https://votre-app.onrender.com/api/payments/webhook"
echo "Événements: BILLING.SUBSCRIPTION.* et PAYMENT.*"
echo ""
echo "🎯 Le système est maintenant déployé ! Testez /premium après le déploiement Render !"