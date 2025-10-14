const axios = require('axios');

class PayPalService {
  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.secret = process.env.PAYPAL_SECRET;
    this.environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
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
  async createSubscription(userId, returnUrl, cancelUrl) {
    try {
      await this.ensureToken();

      const subscriptionData = {
        plan_id: process.env.PAYPAL_PLAN_ID,
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
    // Implémentation à compléter avec la logique métier
    console.log('Abonnement activé:', resource.id);
    return { processed: true, action: 'subscription_activated' };
  }

  // Gérer l'annulation d'un abonnement
  async handleSubscriptionCancelled(resource) {
    // Implémentation à compléter avec la logique métier
    console.log('Abonnement annulé:', resource.id);
    return { processed: true, action: 'subscription_cancelled' };
  }

  // Gérer la suspension d'un abonnement
  async handleSubscriptionSuspended(resource) {
    // Implémentation à compléter avec la logique métier
    console.log('Abonnement suspendu:', resource.id);
    return { processed: true, action: 'subscription_suspended' };
  }

  // Gérer un paiement échoué
  async handlePaymentFailed(resource) {
    // Implémentation à compléter avec la logique métier
    console.log('Paiement échoué pour abonnement:', resource.id);
    return { processed: true, action: 'payment_failed' };
  }

  // Gérer un paiement réussi
  async handlePaymentSucceeded(resource) {
    // Implémentation à compléter avec la logique métier
    console.log('Paiement réussi pour abonnement:', resource.id);
    return { processed: true, action: 'payment_succeeded' };
  }
}

module.exports = new PayPalService();
