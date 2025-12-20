#!/bin/bash

# 🚀 Configuration automatique PayPal LIVE pour HotMeet
# Ce script configure le système en mode production

echo "🔥 CONFIGURATION PAYPAL LIVE - HotMeet Premium"
echo "============================================="
echo ""

# Couleurs pour affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables PayPal (À REMPLACER par vos vraies valeurs)
LIVE_CLIENT_ID="YOUR_LIVE_CLIENT_ID_HERE"
LIVE_SECRET="YOUR_LIVE_SECRET_HERE"
LIVE_PLAN_ID="YOUR_LIVE_PLAN_ID_HERE"
LIVE_WEBHOOK_ID="YOUR_LIVE_WEBHOOK_ID_HERE"
DOMAIN="https://votre-domaine.com"

echo -e "${BLUE}🔧 Configuration des variables d'environnement...${NC}"

# Créer/Mettre à jour le fichier .env
cat > .env << EOF
# ======================================================
# CONFIGURATION LIVE PAYPAL - HotMeet Premium
# ======================================================
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/DATABASE?retryWrites=true&w=majority

# JWT
JWT_SECRET=$(openssl rand -hex 32)
BCRYPT_ROUNDS=12
TOKEN_EXPIRY=7d

# PayPal LIVE Configuration
PAYPAL_CLIENT_ID=$LIVE_CLIENT_ID
PAYPAL_SECRET=$LIVE_SECRET
PAYPAL_MODE=live
PAYPAL_ENVIRONMENT=live
PAYPAL_PLAN_ID=$LIVE_PLAN_ID
PAYPAL_WEBHOOK_ID=$LIVE_WEBHOOK_ID
PAYPAL_WEBHOOK_URL=$DOMAIN/api/payments/webhook
PAYPAL_RETURN_URL=$DOMAIN/api/payments/confirm
PAYPAL_CANCEL_URL=$DOMAIN/payment/cancel
PREMIUM_PRICE=5.75

# URLs Application
APP_URL=$DOMAIN
CLIENT_URL=$DOMAIN

# Cloudinary (Images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Configuration Serveur
PORT=3000
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# WebRTC
WEBRTC_STUN_SERVER=stun:stun.l.google.com:19302

# Sécurité
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=$DOMAIN
EOF

echo -e "${GREEN}✅ Fichier .env créé${NC}"

# Mettre à jour le client ID PayPal dans premium.html
echo -e "${BLUE}🔧 Mise à jour du SDK PayPal...${NC}"

sed -i.bak "s/YOUR_PAYPAL_CLIENT_ID/$LIVE_CLIENT_ID/g" public/pages/premium.html

echo -e "${GREEN}✅ SDK PayPal mis à jour dans premium.html${NC}"

# Créer le plan d'abonnement PayPal (nécessite curl et jq)
echo -e "${BLUE}💳 Création du plan d'abonnement PayPal...${NC}"

if command -v curl >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
  
  # Obtenir le token d'accès
  ACCESS_TOKEN=$(curl -s -X POST https://api.paypal.com/v1/oauth2/token \
    -H "Accept: application/json" \
    -H "Accept-Language: en_US" \
    -u "$LIVE_CLIENT_ID:$LIVE_SECRET" \
    -d "grant_type=client_credentials" | jq -r '.access_token')

  if [ "$ACCESS_TOKEN" != "null" ] && [ "$ACCESS_TOKEN" != "" ]; then
    echo -e "${GREEN}✅ Token PayPal obtenu${NC}"
    
    # Créer le produit
    PRODUCT_RESPONSE=$(curl -s -X POST https://api.paypal.com/v1/catalogs/products \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -d '{
        "name": "Abonnement Premium HotMeet",
        "description": "Accès premium mensuel à toutes les fonctionnalités HotMeet",
        "type": "SERVICE",
        "category": "SOFTWARE"
      }')

    PRODUCT_ID=$(echo $PRODUCT_RESPONSE | jq -r '.id')
    
    if [ "$PRODUCT_ID" != "null" ] && [ "$PRODUCT_ID" != "" ]; then
      echo -e "${GREEN}✅ Produit PayPal créé: $PRODUCT_ID${NC}"
      
      # Créer le plan
      PLAN_RESPONSE=$(curl -s -X POST https://api.paypal.com/v1/billing/plans \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d "{
          \"product_id\": \"$PRODUCT_ID\",
          \"name\": \"Abonnement Premium HotMeet - Mensuel\",
          \"description\": \"Accès premium mensuel à HotMeet avec toutes les fonctionnalités\",
          \"status\": \"ACTIVE\",
          \"billing_cycles\": [
            {
              \"frequency\": {
                \"interval_unit\": \"MONTH\",
                \"interval_count\": 1
              },
              \"tenure_type\": \"REGULAR\",
              \"sequence\": 1,
              \"total_cycles\": 0,
              \"pricing_scheme\": {
                \"fixed_price\": {
                  \"value\": \"5.75\",
                  \"currency_code\": \"CHF\"
                }
              }
            }
          ],
          \"payment_preferences\": {
            \"auto_bill_outstanding\": true,
            \"setup_fee_failure_action\": \"CONTINUE\",
            \"payment_failure_threshold\": 3
          }
        }")

      PLAN_ID=$(echo $PLAN_RESPONSE | jq -r '.id')
      
      if [ "$PLAN_ID" != "null" ] && [ "$PLAN_ID" != "" ]; then
        echo -e "${GREEN}✅ Plan d'abonnement créé: $PLAN_ID${NC}"
        
        # Mettre à jour le .env avec le vrai plan ID
        sed -i.bak "s/YOUR_LIVE_PLAN_ID_HERE/$PLAN_ID/" .env
        echo -e "${GREEN}✅ Plan ID mis à jour dans .env${NC}"
      else
        echo -e "${RED}❌ Erreur création plan: $PLAN_RESPONSE${NC}"
      fi
    else
      echo -e "${RED}❌ Erreur création produit: $PRODUCT_RESPONSE${NC}"
    fi
  else
    echo -e "${RED}❌ Impossible d'obtenir le token PayPal${NC}"
  fi
else
  echo -e "${YELLOW}⚠️ curl ou jq manquant - créez le plan manuellement sur developer.paypal.com${NC}"
fi

# Instructions pour configurer le webhook
echo ""
echo -e "${YELLOW}📡 CONFIGURATION WEBHOOK PAYPAL REQUISE:${NC}"
echo "1. Allez sur https://developer.paypal.com/developer/notifications/"
echo "2. Créez un webhook avec l'URL: $DOMAIN/api/payments/webhook"
echo "3. Sélectionnez ces événements:"
echo "   - BILLING.SUBSCRIPTION.ACTIVATED"
echo "   - BILLING.SUBSCRIPTION.CANCELLED"
echo "   - BILLING.SUBSCRIPTION.SUSPENDED"
echo "   - BILLING.SUBSCRIPTION.PAYMENT.FAILED"
echo "   - BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED"
echo "4. Copiez l'ID du webhook et mettez à jour PAYPAL_WEBHOOK_ID dans .env"

# Instructions finales
echo ""
echo -e "${GREEN}🎉 CONFIGURATION TERMINÉE !${NC}"
echo ""
echo -e "${BLUE}📋 ÉTAPES SUIVANTES:${NC}"
echo "1. Vérifiez les valeurs dans .env (surtout MONGODB_URI et Cloudinary)"
echo "2. Configurez le webhook PayPal (instructions ci-dessus)"
echo "3. Redémarrez le serveur: npm start ou pm2 restart hotmeet"
echo "4. Testez sur $DOMAIN/premium"
echo ""
echo -e "${YELLOW}🔧 COMMANDES DE TEST:${NC}"
echo "curl $DOMAIN/api/payments/pricing"
echo "curl $DOMAIN/premium"
echo ""
echo -e "${GREEN}Le système PayPal Premium est maintenant configuré ! 🚀${NC}"

# Test de connectivité
echo ""
echo -e "${BLUE}🌐 Test de connectivité...${NC}"
if curl -s --max-time 5 https://api.paypal.com/v1/oauth2/token >/dev/null; then
  echo -e "${GREEN}✅ API PayPal accessible${NC}"
else
  echo -e "${RED}❌ Problème de connectivité PayPal${NC}"
fi