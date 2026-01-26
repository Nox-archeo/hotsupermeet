const axios = require('axios');

class PayPalService {
  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.secret = process.env.PAYPAL_SECRET;
    this.environment = process.env.PAYPAL_ENVIRONMENT;
    this.baseUrl =
      this.environment === 'live'
        ? 'https://api.paypal.com'
        : 'https://api.sandbox.paypal.com';

    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Authentification auprès de PayPal
  async authenticate() {
    try {
      const auth = Buffer.from(`${this.clientId}:${this.secret}`).toString(
        'base64'
      );

      const response = await axios.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;

      return this.accessToken;
    } catch (error) {
      console.error(
        "Erreur d'authentification PayPal:",
        error.response?.data || error.message
      );
      throw new Error("Échec de l'authentification PayPal");
    }
  }

  // Vérifier et renouveler le token si nécessaire
  async ensureToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
    return this.accessToken;
  }

  // Créer un plan d'abonnement mensuel
  async createSubscriptionPlan() {
    try {
      await this.ensureToken();

      const planData = {
        product_id: 'PROD-' + Date.now(), // ID unique pour le produit
        name: 'Abonnement Premium HotMeet',
        description: 'Accès premium mensuel à HotMeet',
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: {
              interval_unit: 'MONTH',
              interval_count: 1,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // 0 = illimité
            pricing_scheme: {
              fixed_price: {
                value: process.env.PREMIUM_PRICE || '5.75',
                currency_code: 'CHF',
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3,
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/v1/billing/plans`,
        planData,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        'Erreur création plan PayPal:',
        error.response?.data || error.message
      );
      throw new Error("Échec de la création du plan d'abonnement");
    }
  }

  // Créer un abonnement pour un utilisateur
  async createSubscription(userId, returnUrl, cancelUrl, planId = null) {
    try {
      await this.ensureToken();

      const subscriptionData = {
        plan_id:
          planId ||
          process.env.PAYPAL_PLAN_MONTHLY_ID ||
          process.env.PAYPAL_PLAN_ID,
        subscriber: {
          name: {
            given_name: 'Utilisateur',
            surname: 'HotMeet',
          },
        },
        application_context: {
          brand_name: 'HotMeet',
          locale: 'fr-CH',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: returnUrl || process.env.PAYPAL_RETURN_URL,
          cancel_url: cancelUrl || process.env.PAYPAL_CANCEL_URL,
        },
        custom_id: userId, // ID de l'utilisateur dans notre système
      };

      const response = await axios.post(
        `${this.baseUrl}/v1/billing/subscriptions`,
        subscriptionData,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        'Erreur création abonnement PayPal:',
        error.response?.data || error.message
      );
      throw new Error("Échec de la création de l'abonnement");
    }
  }

  // Récupérer les détails d'un abonnement
  async getSubscriptionDetails(subscriptionId) {
    try {
      await this.ensureToken();

      const response = await axios.get(
        `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        'Erreur récupération abonnement PayPal:',
        error.response?.data || error.message
      );

      // Gestion spécifique erreur 404 - Abonnement inexistant
      if (error.response?.status === 404) {
        const errorDetail = error.response.data;
        if (errorDetail?.issue === 'INVALID_RESOURCE_ID') {
          console.warn(
            `🚨 PAYPAL: Abonnement ${subscriptionId} inexistant ou annulé`
          );
          throw new Error(
            `Abonnement ${subscriptionId} non trouvé - possiblement annulé ou expiré`
          );
        }
      }

      throw new Error("Échec de la récupération des détails de l'abonnement");
    }
  }

  // Suspendre un abonnement
  async suspendSubscription(subscriptionId) {
    try {
      await this.ensureToken();

      await axios.post(
        `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/suspend`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return { success: true, message: 'Abonnement suspendu avec succès' };
    } catch (error) {
      console.error(
        'Erreur suspension abonnement PayPal:',
        error.response?.data || error.message
      );
      throw new Error("Échec de la suspension de l'abonnement");
    }
  }

  // Annuler un abonnement
  async cancelSubscription(
    subscriptionId,
    reason = "Annulation par l'utilisateur"
  ) {
    try {
      await this.ensureToken();

      await axios.post(
        `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
        { reason },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return { success: true, message: 'Abonnement annulé avec succès' };
    } catch (error) {
      console.error(
        'Erreur annulation abonnement PayPal:',
        error.response?.data || error.message
      );
      throw new Error("Échec de l'annulation de l'abonnement");
    }
  }

  // Activer un abonnement suspendu
  async activateSubscription(subscriptionId) {
    try {
      await this.ensureToken();

      await axios.post(
        `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/activate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return { success: true, message: 'Abonnement activé avec succès' };
    } catch (error) {
      console.error(
        'Erreur activation abonnement PayPal:',
        error.response?.data || error.message
      );
      throw new Error("Échec de l'activation de l'abonnement");
    }
  }

  // Vérifier la validité d'un webhook PayPal
  async verifyWebhookSignature(headers, body) {
    try {
      await this.ensureToken();

      const verificationData = {
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: body,
      };

      const response = await axios.post(
        `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
        verificationData,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.verification_status === 'SUCCESS';
    } catch (error) {
      console.error(
        'Erreur vérification signature webhook:',
        error.response?.data || error.message
      );
      return false;
    }
  }

  // Traiter les événements webhook PayPal
  async processWebhookEvent(event) {
    try {
      const eventType = event.event_type;
      const resource = event.resource;

      console.log(`Webhook PayPal reçu: ${eventType}`);

      switch (eventType) {
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          return await this.handleSubscriptionActivated(resource);

        case 'BILLING.SUBSCRIPTION.CANCELLED':
          return await this.handleSubscriptionCancelled(resource);

        case 'BILLING.SUBSCRIPTION.SUSPENDED':
          return await this.handleSubscriptionSuspended(resource);

        case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
          return await this.handlePaymentFailed(resource);

        case 'BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED':
          return await this.handlePaymentSucceeded(resource);

        // 🚨 CORRECTION CRITIQUE: PayPal envoie aussi PAYMENT.SALE.COMPLETED pour les renouvellements
        case 'PAYMENT.SALE.COMPLETED':
          console.log(
            '🔄 PAYMENT.SALE.COMPLETED détecté - Traitement comme renouvellement...'
          );
          return await this.handlePaymentSaleCompleted(resource);

        default:
          console.log(`Événement webhook non géré: ${eventType}`);
          return { processed: false, message: 'Événement non géré' };
      }
    } catch (error) {
      console.error('Erreur traitement webhook PayPal:', error);
      throw new Error("Échec du traitement de l'événement webhook");
    }
  }

  // Gérer l'activation d'un abonnement
  async handleSubscriptionActivated(resource) {
    try {
      const userId = resource.custom_id;
      if (!userId) {
        console.warn(
          "Pas d'ID utilisateur dans l'abonnement activé:",
          resource.id
        );
        return { processed: false, message: 'ID utilisateur manquant' };
      }

      const User = require('../models/User');
      const user = await User.findById(userId);

      if (!user) {
        console.warn('Utilisateur non trouvé:', userId);
        return { processed: false, message: 'Utilisateur non trouvé' };
      }

      // Activer le premium pour 30 jours
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1);

      user.premium.isPremium = true;
      user.premium.expiration = expirationDate;
      user.premium.paypalSubscriptionId = resource.id;

      await user.save();

      console.log(
        `✅ Premium activé pour utilisateur ${userId}, expire: ${expirationDate}`
      );
      return { processed: true, action: 'subscription_activated', userId };
    } catch (error) {
      console.error('Erreur activation abonnement:', error);
      return { processed: false, message: error.message };
    }
  }

  // Gérer l'annulation d'un abonnement
  async handleSubscriptionCancelled(resource) {
    try {
      const subscriptionId = resource.id;
      const User = require('../models/User');

      const user = await User.findOne({
        'premium.paypalSubscriptionId': subscriptionId,
      });

      if (!user) {
        console.warn('Utilisateur non trouvé pour abonnement:', subscriptionId);
        return { processed: false, message: 'Utilisateur non trouvé' };
      }

      // Désactiver le premium mais garder jusqu'à expiration naturelle
      // (PayPal permet généralement de finir la période payée)
      user.premium.paypalSubscriptionId = null;

      await user.save();

      console.log(`❌ Abonnement annulé pour utilisateur ${user._id}`);
      return {
        processed: true,
        action: 'subscription_cancelled',
        userId: user._id,
      };
    } catch (error) {
      console.error('Erreur annulation abonnement:', error);
      return { processed: false, message: error.message };
    }
  }

  // Gérer la suspension d'un abonnement
  async handleSubscriptionSuspended(resource) {
    try {
      const subscriptionId = resource.id;
      const User = require('../models/User');

      const user = await User.findOne({
        'premium.paypalSubscriptionId': subscriptionId,
      });

      if (!user) {
        console.warn(
          'Utilisateur non trouvé pour abonnement suspendu:',
          subscriptionId
        );
        return { processed: false, message: 'Utilisateur non trouvé' };
      }

      // Suspendre le premium immédiatement
      user.premium.isPremium = false;
      user.premium.expiration = new Date(); // Expire maintenant

      await user.save();

      console.log(`⏸️ Premium suspendu pour utilisateur ${user._id}`);
      return {
        processed: true,
        action: 'subscription_suspended',
        userId: user._id,
      };
    } catch (error) {
      console.error('Erreur suspension abonnement:', error);
      return { processed: false, message: error.message };
    }
  }

  // Gérer un paiement échoué
  async handlePaymentFailed(resource) {
    try {
      const subscriptionId = resource.billing_agreement_id || resource.id;
      const User = require('../models/User');

      const user = await User.findOne({
        'premium.paypalSubscriptionId': subscriptionId,
      });

      if (!user) {
        console.warn(
          'Utilisateur non trouvé pour paiement échoué:',
          subscriptionId
        );
        return { processed: false, message: 'Utilisateur non trouvé' };
      }

      console.log(
        `💸 Paiement échoué pour utilisateur ${user._id} - PayPal gèrera les reprises`
      );

      // Note: On ne désactive PAS le premium immédiatement car PayPal fait des reprises
      // Si PayPal suspend l'abonnement après plusieurs échecs, on recevra un autre webhook

      return { processed: true, action: 'payment_failed', userId: user._id };
    } catch (error) {
      console.error('Erreur paiement échoué:', error);
      return { processed: false, message: error.message };
    }
  }

  // Gérer un paiement réussi
  async handlePaymentSucceeded(resource) {
    try {
      console.log(
        '💰 handlePaymentSucceeded() APPELÉ:',
        new Date().toISOString()
      );
      console.log('💳 Resource reçu:', JSON.stringify(resource, null, 2));

      // ⚠️ CORRECTION CRITIQUE: PayPal peut envoyer différents champs selon le type de webhook
      const subscriptionId =
        resource.billing_agreement_id ||
        resource.id ||
        resource.subscription_id;
      console.log('🔍 Subscription ID extrait:', subscriptionId);

      const User = require('../models/User');

      // 🚨 CHERCHER L'UTILISATEUR avec différentes stratégies
      let user = await User.findOne({
        'premium.paypalSubscriptionId': subscriptionId,
      });

      // Si pas trouvé avec l'ID direct, essayer avec custom_id du webhook
      if (!user && resource.custom_id) {
        console.log('🔄 Recherche par custom_id:', resource.custom_id);
        user = await User.findById(resource.custom_id);

        // Si trouvé par custom_id, vérifier que c'est bien le bon abonnement
        if (user && user.premium.paypalSubscriptionId !== subscriptionId) {
          console.warn(
            '⚠️ Subscription ID mismatch, mais utilisateur trouvé par custom_id'
          );
        }
      }

      if (!user) {
        console.warn('❌ Utilisateur non trouvé pour paiement réussi:');
        console.warn('   Subscription ID cherché:', subscriptionId);
        console.warn('   Custom ID cherché:', resource.custom_id);

        // 🚨 DEBUG: Lister tous les utilisateurs premium pour voir les IDs PayPal
        const premiumUsers = await User.find({
          'premium.paypalSubscriptionId': { $exists: true, $ne: null },
        })
          .select('_id email premium.paypalSubscriptionId')
          .limit(5);

        console.log('📋 Utilisateurs premium existants:');
        premiumUsers.forEach(u => {
          console.log(`   ${u.email}: ${u.premium.paypalSubscriptionId}`);
        });

        return { processed: false, message: 'Utilisateur non trouvé' };
      }

      console.log(`👤 UTILISATEUR TROUVÉ: ${user._id} (${user.email})`);
      console.log(`📅 Expiration ACTUELLE: ${user.premium.expiration}`);

      // 🚨 LOGIQUE CORRIGÉE : TOUJOURS partir de l'ancienne expiration + 1 mois
      // Un utilisateur qui paye ne doit JAMAIS perdre son statut premium !
      const currentExpiration = user.premium.expiration || new Date();

      // TOUJOURS prolonger depuis l'ancienne date d'expiration, même si elle est passée
      // Car l'utilisateur a payé = il mérite la continuité de son abonnement
      const newExpiration = new Date(currentExpiration);
      newExpiration.setMonth(newExpiration.getMonth() + 1);

      console.log(`🔄 CALCUL NOUVELLE EXPIRATION (PAYMENT.SUCCEEDED):`);
      console.log(`   Expiration actuelle: ${currentExpiration}`);
      console.log(`   Nouvelle expiration (+1 mois): ${newExpiration}`);

      user.premium.isPremium = true;
      user.premium.expiration = newExpiration;

      await user.save();

      console.log(
        `✅ PREMIUM RENOUVELÉ AUTOMATIQUEMENT pour utilisateur ${user._id} (${user.email}) jusqu'au ${newExpiration.toLocaleDateString()}`
      );
      return { processed: true, action: 'payment_succeeded', userId: user._id };
    } catch (error) {
      console.error('Erreur paiement réussi:', error);
      return { processed: false, message: error.message };
    }
  }

  // 🚨 NOUVEAU: Gérer les paiements PAYMENT.SALE.COMPLETED (renouvellements)
  async handlePaymentSaleCompleted(resource) {
    try {
      console.log(
        '💰 handlePaymentSaleCompleted() APPELÉ:',
        new Date().toISOString()
      );
      console.log('💳 Resource reçu:', JSON.stringify(resource, null, 2));

      // Pour PAYMENT.SALE.COMPLETED, l'ID d'abonnement peut être dans billing_agreement_id
      const subscriptionId = resource.billing_agreement_id || resource.id;
      console.log('🔍 Subscription ID extrait:', subscriptionId);

      const User = require('../models/User');

      // Chercher l'utilisateur par subscription ID
      let user = await User.findOne({
        'premium.paypalSubscriptionId': subscriptionId,
      });

      // Si pas trouvé, essayer avec custom_id du webhook
      if (!user && resource.custom_id) {
        console.log('🔄 Recherche par custom_id:', resource.custom_id);
        user = await User.findById(resource.custom_id);
      }

      // 🚨 DEBUG SPÉCIAL pour Steve Rossier
      if (!user) {
        console.warn('❌ Utilisateur non trouvé pour PAYMENT.SALE.COMPLETED:');
        console.warn('   Subscription ID cherché:', subscriptionId);
        console.warn('   Custom ID cherché:', resource.custom_id);

        // Chercher Steve Rossier spécifiquement
        const steveUser = await User.findOne({
          email: 'steverosse@hotmail.com',
        });
        if (steveUser) {
          console.log('🔍 STEVE ROSSIER TROUVÉ par email:');
          console.log(`   ID: ${steveUser._id}`);
          console.log(
            `   PayPal Sub ID: ${steveUser.premium.paypalSubscriptionId}`
          );

          // Si c'est Steve et que l'ID correspond approximativement, on l'utilise
          if (
            steveUser.premium.paypalSubscriptionId &&
            (steveUser.premium.paypalSubscriptionId === subscriptionId ||
              subscriptionId.includes('UT41KX29XFX6') ||
              steveUser.premium.paypalSubscriptionId.includes('UT41KX29XFX6'))
          ) {
            user = steveUser;
            console.log('✅ Utilisation de Steve Rossier pour ce paiement');
          }
        }
      }

      if (!user) {
        return {
          processed: false,
          message: 'Utilisateur non trouvé pour PAYMENT.SALE.COMPLETED',
        };
      }

      console.log(`👤 UTILISATEUR TROUVÉ: ${user._id} (${user.email})`);
      console.log(`📅 Expiration ACTUELLE: ${user.premium.expiration}`);

      // 🚨 LOGIQUE CORRIGÉE : TOUJOURS partir de l'ancienne expiration + 1 mois
      // Un utilisateur qui paye ne doit JAMAIS perdre son statut premium !
      const currentExpiration = user.premium.expiration || new Date();

      // TOUJOURS prolonger depuis l'ancienne date d'expiration, même si elle est passée
      // Car l'utilisateur a payé = il mérite la continuité de son abonnement
      const newExpiration = new Date(currentExpiration);
      newExpiration.setMonth(newExpiration.getMonth() + 1);

      console.log(`🔄 CALCUL NOUVELLE EXPIRATION (PAYMENT.SALE.COMPLETED):`);
      console.log(`   Expiration actuelle: ${currentExpiration}`);
      console.log(`   Nouvelle expiration (+1 mois): ${newExpiration}`);

      user.premium.isPremium = true;
      user.premium.expiration = newExpiration;

      await user.save();

      console.log(
        `✅ PREMIUM RENOUVELÉ via PAYMENT.SALE.COMPLETED pour ${user._id} (${user.email}) jusqu'au ${newExpiration.toLocaleDateString()}`
      );
      return {
        processed: true,
        action: 'payment_sale_completed',
        userId: user._id,
      };
    } catch (error) {
      console.error('Erreur PAYMENT.SALE.COMPLETED:', error);
      return { processed: false, message: error.message };
    }
  }
}

module.exports = new PayPalService();
