const User = require('../models/User');
const PayPalService = require('../services/paypalService');
const { validationResult } = require('express-validator');

// Initialiser un abonnement premium pour un utilisateur
const createSubscription = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: errors.array(),
        },
      });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Vérifier si l'utilisateur a déjà un abonnement actif
    if (user.premium.isPremium && user.premium.expiration > new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_ACTIVE',
          message: 'Vous avez déjà un abonnement premium actif',
        },
      });
    }

    // Créer l'abonnement PayPal
    const subscription = await PayPalService.createSubscription(
      userId.toString(),
      `${process.env.APP_URL}/payment/success`,
      `${process.env.APP_URL}/payment/cancel`
    );

    // Sauvegarder l'ID d'abonnement temporairement
    user.premium.paypalSubscriptionId = subscription.id;
    await user.save();

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        approvalUrl: subscription.links.find(link => link.rel === 'approve')
          .href,
      },
    });
  } catch (error) {
    console.error('Erreur création abonnement:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_ERROR',
        message: "Erreur lors de la création de l'abonnement",
      },
    });
  }
};

// Confirmer l'activation d'un abonnement après retour de PayPal
const confirmSubscription = async (req, res) => {
  try {
    const { subscription_id: subscriptionId } = req.query;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SUBSCRIPTION_ID',
          message: "ID d'abonnement manquant",
        },
      });
    }

    // Récupérer les détails de l'abonnement depuis PayPal
    const subscriptionDetails =
      await PayPalService.getSubscriptionDetails(subscriptionId);

    // Trouver l'utilisateur par l'ID d'abonnement
    const user = await User.findOne({
      'premium.paypalSubscriptionId': subscriptionId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé pour cet abonnement',
        },
      });
    }

    // Mettre à jour le statut premium de l'utilisateur
    if (subscriptionDetails.status === 'ACTIVE') {
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1); // 1 mois

      user.premium.isPremium = true;
      user.premium.expiration = expirationDate;
      user.premium.paypalSubscriptionId = subscriptionId;

      await user.save();

      // Rediriger vers la page de succès
      return res.redirect(`${process.env.CLIENT_URL}/premium?success=true`);
    } else {
      return res.redirect(
        `${process.env.CLIENT_URL}/premium?success=false&reason=subscription_not_active`
      );
    }
  } catch (error) {
    console.error('Erreur confirmation abonnement:', error);
    res.redirect(
      `${process.env.CLIENT_URL}/premium?success=false&reason=error`
    );
  }
};

// Annuler un abonnement
const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    if (!user.premium.paypalSubscriptionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_SUBSCRIPTION',
          message: 'Aucun abonnement trouvé pour cet utilisateur',
        },
      });
    }

    // Annuler l'abonnement chez PayPal
    await PayPalService.cancelSubscription(user.premium.paypalSubscriptionId);

    // Mettre à jour le statut de l'utilisateur
    user.premium.isPremium = false;
    user.premium.expiration = null;
    user.premium.paypalSubscriptionId = null;

    await user.save();

    res.json({
      success: true,
      message: 'Abonnement annulé avec succès',
    });
  } catch (error) {
    console.error('Erreur annulation abonnement:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CANCELLATION_ERROR',
        message: "Erreur lors de l'annulation de l'abonnement",
      },
    });
  }
};

// Vérifier le statut d'un abonnement
const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('premium');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    let subscriptionDetails = null;

    // Si l'utilisateur a un abonnement PayPal, récupérer les détails
    if (user.premium.paypalSubscriptionId) {
      try {
        subscriptionDetails = await PayPalService.getSubscriptionDetails(
          user.premium.paypalSubscriptionId
        );
      } catch (error) {
        console.warn('Erreur récupération détails PayPal:', error.message);
        // Continuer sans les détails PayPal
      }
    }

    const isPremiumActive =
      user.premium.isPremium && user.premium.expiration > new Date();

    res.json({
      success: true,
      subscription: {
        isPremium: isPremiumActive,
        expiration: user.premium.expiration,
        paypalSubscriptionId: user.premium.paypalSubscriptionId,
        paypalStatus: subscriptionDetails?.status,
        nextBillingDate: subscriptionDetails?.billing_info?.next_billing_time,
        isFemaleFree: user.premium.isFemaleFree,
      },
    });
  } catch (error) {
    console.error('Erreur vérification statut abonnement:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_CHECK_ERROR',
        message: "Erreur lors de la vérification du statut de l'abonnement",
      },
    });
  }
};

// Gérer les webhooks PayPal
const handleWebhook = async (req, res) => {
  try {
    const headers = req.headers;
    const body = req.body;

    // Vérifier la signature du webhook
    const isValidSignature = await PayPalService.verifyWebhookSignature(
      headers,
      body
    );

    if (!isValidSignature) {
      console.warn('Signature webhook PayPal invalide');
      return res.status(400).json({
        success: false,
        error: 'Signature invalide',
      });
    }

    // Traiter l'événement webhook
    const result = await PayPalService.processWebhookEvent(body);

    // Mettre à jour l'utilisateur en fonction de l'événement
    const resource = body.resource;
    const customId = resource.custom_id || resource.subscriber?.custom_id;

    if (customId) {
      const user = await User.findById(customId);

      if (user) {
        switch (body.event_type) {
          case 'BILLING.SUBSCRIPTION.ACTIVATED':
            user.premium.isPremium = true;
            user.premium.expiration = new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ); // 30 jours
            break;

          case 'BILLING.SUBSCRIPTION.CANCELLED':
          case 'BILLING.SUBSCRIPTION.SUSPENDED':
            user.premium.isPremium = false;
            user.premium.expiration = null;
            break;

          case 'BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED':
            // Renouveler l'abonnement pour 30 jours supplémentaires
            user.premium.isPremium = true;
            user.premium.expiration = new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            );
            break;

          case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
            // Désactiver le premium après 3 échecs (géré par PayPal)
            user.premium.isPremium = false;
            user.premium.expiration = null;
            break;
        }

        await user.save();
        console.log(`Statut premium mis à jour pour l'utilisateur ${customId}`);
      }
    }

    res.json({
      success: true,
      processed: result.processed,
      message: 'Webhook traité avec succès',
    });
  } catch (error) {
    console.error('Erreur traitement webhook:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_ERROR',
        message: 'Erreur lors du traitement du webhook',
      },
    });
  }
};

// Obtenir les informations de prix et de plan
const getPricingInfo = async (req, res) => {
  try {
    res.json({
      success: true,
      pricing: {
        monthlyPrice: parseFloat(process.env.PREMIUM_PRICE) || 5.75,
        currency: 'CHF',
        features: [
          'Accès illimité à tous les profils',
          'Messagerie prioritaire',
          'Visibilité accrue dans les recherches',
          'Statut premium visible',
          'Support prioritaire',
        ],
      },
    });
  } catch (error) {
    console.error('Erreur récupération informations prix:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PRICING_ERROR',
        message: 'Erreur lors de la récupération des informations de prix',
      },
    });
  }
};

module.exports = {
  createSubscription,
  confirmSubscription,
  cancelSubscription,
  getSubscriptionStatus,
  handleWebhook,
  getPricingInfo,
};
