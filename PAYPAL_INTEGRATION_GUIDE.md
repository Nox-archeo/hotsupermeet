# Guide d'Intégration PayPal - HotMeet

## Configuration PayPal Complète

### Variables d'Environnement Requises

Le fichier `.env` doit contenir les variables suivantes :

```env
# Configuration PayPal - Abonnement Récurrent Mensuel
PAYPAL_CLIENT_ID=votre_client_id_paypal_ici
PAYPAL_SECRET=votre_secret_paypal_ici
PAYPAL_MODE=sandbox
PAYPAL_PLAN_ID=votre_plan_abonnement_mensuel_ici
PAYPAL_RETURN_URL=http://localhost:3000/payment/success
PAYPAL_CANCEL_URL=http://localhost:3000/payment/cancel
PAYPAL_WEBHOOK_URL=http://localhost:3000/api/paypal/webhook
PAYPAL_WEBHOOK_ID=votre_webhook_id_ici
PAYPAL_ENVIRONMENT=sandbox
PREMIUM_PRICE=5.75
```

### Structure du Système d'Abonnement

#### Fichiers Créés

1. **`server/services/paypalService.js`** - Service principal pour les interactions PayPal
2. **`server/controllers/paymentController.js`** - Contrôleur pour la gestion des paiements
3. **`server/routes/payments.js`** - Routes API pour les fonctionnalités de paiement

#### Fonctionnalités Implémentées

✅ **Création d'abonnement récurrent mensuel (5.75 CHF)**

- Redirection vers PayPal pour l'approbation
- Gestion des retours de callback
- Sauvegarde de l'ID d'abonnement dans MongoDB

✅ **Webhooks PayPal pour les mises à jour automatiques**

- Activation d'abonnement
- Annulation/suspension
- Paiements réussis/échoués
- Mise à jour automatique du statut premium

✅ **Gestion complète du cycle de vie de l'abonnement**

- Vérification du statut premium
- Annulation manuelle par l'utilisateur
- Renouvellement automatique via webhooks

✅ **Pages de retour utilisateur**

- Page de succès avec redirection automatique
- Page d'annulation avec option de réessai

### API Endpoints Disponibles

#### Routes Protégées (Authentification Requise)

- **POST** `/api/payments/subscribe` - Créer un abonnement
- **GET** `/api/payments/status` - Statut de l'abonnement
- **POST** `/api/payments/cancel` - Annuler l'abonnement

#### Routes Publiques

- **GET** `/api/payments/pricing` - Informations de prix
- **GET** `/api/payments/confirm` - Confirmation d'abonnement (callback PayPal)
- **POST** `/api/payments/webhook` - Webhook PayPal

#### Pages Web

- **GET** `/payment/success` - Page de succès
- **GET** `/payment/cancel` - Page d'annulation

### Configuration PayPal Developer

#### 1. Créer un Compte Développeur PayPal

1. Aller sur [developer.paypal.com](https://developer.paypal.com)
2. Se connecter avec un compte PayPal business
3. Créer une application sandbox pour les tests

#### 2. Obtenir les Identifiants

- **Client ID** : Disponible dans les détails de l'application
- **Secret** : Générer un nouveau secret si nécessaire
- **Webhook ID** : Créer un webhook dans les paramètres de l'application

#### 3. Configurer le Plan d'Abonnement

Dans l'interface PayPal Developer :

1. Créer un plan d'abonnement avec les paramètres :
   - Prix : 5.75 CHF
   - Intervalle : Mensuel
   - Type : Récurrent illimité
   - Statut : Actif

2. Récupérer l'ID du plan créé

#### 4. Configurer les Webhooks

1. Ajouter l'URL de webhook : `http://localhost:3000/api/payments/webhook`
2. Sélectionner les événements à écouter :
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
   - `BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED`

### Tests en Mode Sandbox

#### 1. Configuration des Comptes de Test

- **Vendeur** : Utiliser le compte business sandbox
- **Acheteur** : Utiliser le compte personnel sandbox

#### 2. Processus de Test Complet

1. **Inscription utilisateur** → Connexion au compte
2. **Accès page premium** → Cliquer sur "S'abonner"
3. **Redirection PayPal** → Connexion avec compte acheteur sandbox
4. **Approbation paiement** → Retour automatique vers HotMeet
5. **Activation premium** → Vérification du statut dans le profil
6. **Test webhook** → Simuler des événements via l'interface PayPal

### Déploiement sur Infomaniak

#### 1. Préparation des Variables

Mettre à jour les URLs pour la production :

```env
PAYPAL_MODE=live
PAYPAL_RETURN_URL=https://votre-domaine.infomaniak.com/payment/success
PAYPAL_CANCEL_URL=https://votre-domaine.infomaniak.com/payment/cancel
PAYPAL_WEBHOOK_URL=https://votre-domaine.infomaniak.com/api/payments/webhook
```

#### 2. Configuration Base de Données

Assurer que MongoDB est accessible depuis Infomaniak :

```env
MONGODB_URI=mongodb://utilisateur:motdepasse@serveur-mongodb:27017/hotmeet
```

#### 3. Certificats SSL

- HTTPS obligatoire pour les webhooks PayPal
- Certificats Let's Encrypt recommandés

### Monitoring et Logs

#### Logs Importants à Surveiller

- Création/annulation d'abonnements
- Événements webhook PayPal
- Erreurs d'authentification PayPal
- Échecs de paiement

#### Métriques Clés

- Taux de conversion abonnement
- Taux d'échec de paiement
- Nombre d'abonnements actifs
- Revenus mensuels

### Dépannage

#### Erreurs Courantes

**"Cannot find module 'axios'**

```bash
npm install axios
```

**Erreur de connexion MongoDB**

- Vérifier que MongoDB est démarré
- Vérifier les credentials de connexion

**Webhook non reçu**

- Vérifier l'URL de webhook dans PayPal
- Vérifier que le serveur est accessible depuis l'internet
- Vérifier les logs pour les requêtes entrantes

#### Tests de Santé

```bash
# Vérifier que le service PayPal répond
curl -X GET http://localhost:3000/api/payments/pricing

# Tester l'authentification
curl -X GET http://localhost:3000/api/payments/status \
  -H "Authorization: Bearer VOTRE_JWT_TOKEN"
```

### Sécurité

#### Bonnes Pratiques

- **Tokens JWT** : Validation stricte des tokens
- **Webhooks** : Vérification des signatures PayPal
- **Données sensibles** : Stockage sécurisé dans .env
- **Rate limiting** : Protection contre les abus

#### Audits Recommandés

- Revue des permissions MongoDB
- Test de pénétration des webhooks
- Audit des flux de paiement

### Évolutions Futures

#### Intégration SegPay

La structure est préparée pour une future intégration SegPay :

- Architecture modulaire des services de paiement
- Interface commune pour les fournisseurs
- Gestion multi-fournisseurs dans le modèle User

#### Fonctionnalités Avancées

- Abonnements annuels avec réduction
- Paiements par carte crédit directs
- Système de parrainage et réductions
- Analytics détaillés des revenus

---

## Résumé de l'Intégration

L'intégration PayPal est maintenant **complètement fonctionnelle** et prête pour :

1. **Tests en local** avec le mode sandbox
2. **Déploiement sur Infomaniak** avec configuration production
3. **Monitoring en temps réel** des transactions
4. **Évolutivité** pour de futurs fournisseurs de paiement

Le système gère automatiquement tout le cycle de vie des abonnements via les webhooks PayPal, garantissant une expérience utilisateur fluide et une maintenance réduite.
