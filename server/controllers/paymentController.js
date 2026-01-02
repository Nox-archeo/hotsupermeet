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

    // Utiliser le plan mensuel (le seul disponible)
    const planId = process.env.PAYPAL_PLAN_MONTHLY_ID;

    if (!planId) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'MISSING_PLAN_ID',
          message:
            "PAYPAL_PLAN_MONTHLY_ID manquant dans les variables d'environnement",
        },
      });
    }

    // Créer l'abonnement PayPal
    console.log(`🚀 CRÉATION ABONNEMENT PAYPAL pour utilisateur ${userId}...`);
    const subscription = await PayPalService.createSubscription(
      userId.toString(),
      `${process.env.APP_URL}/payment/success`,
      `${process.env.APP_URL}/payment/cancel`,
      planId
    );
    console.log(`📝 SUBSCRIPTION CRÉÉE: ${subscription.id}`);

    // Sauvegarder l'ID d'abonnement temporairement
    console.log(`💾 SAUVEGARDE subscription_id dans user ${userId}...`);
    user.premium.paypalSubscriptionId = subscription.id;
    await user.save();
    console.log(
      `✅ SUBSCRIPTION_ID SAUVEGARDÉ: ${subscription.id} pour user ${userId}`
    );

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

    console.log(`🔥 CONFIRMATION SUBSCRIPTION - ID: ${subscriptionId}`);
    console.log(`🔥 QUERY PARAMS COMPLETS:`, req.query);
    console.log(`🔥 URL COMPLÈTE:`, req.url);

    if (!subscriptionId) {
      console.log('❌ ERREUR: subscription_id manquant');
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SUBSCRIPTION_ID',
          message: "ID d'abonnement manquant",
        },
      });
    }

    // Récupérer les détails de l'abonnement depuis PayPal
    console.log('🔍 Récupération détails PayPal...');
    const subscriptionDetails =
      await PayPalService.getSubscriptionDetails(subscriptionId);
    console.log(`📋 Statut PayPal: ${subscriptionDetails.status}`);

    // Trouver l'utilisateur par l'ID d'abonnement
    console.log(
      `🔍 Recherche utilisateur avec subscription_id: ${subscriptionId}`
    );
    const user = await User.findOne({
      'premium.paypalSubscriptionId': subscriptionId,
    });

    if (!user) {
      console.log(
        `❌ AUCUN UTILISATEUR trouvé avec subscription_id: ${subscriptionId}`
      );
      // FALLBACK: Chercher par custom_id dans PayPal si possible
      console.log('🔍 Tentative fallback avec custom_id...');

      // Si pas d'utilisateur trouvé, rediriger quand même mais avec erreur
      return res.redirect(
        `/pages/premium.html?success=false&reason=user_not_found&subscription_id=${subscriptionId}`
      );
    }

    console.log(`✅ UTILISATEUR TROUVÉ: ${user._id} - ${user.profile.nom}`);

    // Mettre à jour le statut premium de l'utilisateur
    if (subscriptionDetails.status === 'ACTIVE') {
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1); // 1 mois

      console.log(`🔄 MISE À JOUR PREMIUM pour ${user._id}...`);
      user.premium.isPremium = true;
      user.premium.expiration = expirationDate;
      user.premium.paypalSubscriptionId = subscriptionId;

      await user.save();

      console.log(
        `✅ PREMIUM ACTIVÉ AVEC SUCCÈS pour utilisateur ${user._id} (${user.profile.nom}) jusqu'au ${expirationDate}`
      );

      // Rediriger vers la page de succès avec instructions pour rafraîchir le token
      return res.redirect(
        `/pages/premium.html?success=true&premium_activated=true&user_id=${user._id}&refresh_token=true`
      );
    } else {
      console.log(
        `❌ SUBSCRIPTION PAYPAL PAS ACTIVE: ${subscriptionDetails.status}`
      );
      return res.redirect(
        `/pages/premium.html?success=false&reason=subscription_not_active&status=${subscriptionDetails.status}`
      );
    }
  } catch (error) {
    console.error('❌ ERREUR CONFIRMATION ABONNEMENT:', error);
    res.redirect(`/pages/premium.html?success=false&reason=error`);
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

    // ✅ CORRECTION : Garder l'accès jusqu'à expiration
    // Ne pas toucher à isPremium et expiration - l'utilisateur garde son accès jusqu'à la date payée
    // Supprimer seulement l'ID PayPal pour empêcher le renouvellement
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
            // ✅ CORRECTION : Ne pas couper l'accès immédiatement
            // L'utilisateur garde son accès jusqu'à l'expiration naturelle
            // On supprime juste l'ID PayPal pour empêcher le renouvellement
            user.premium.paypalSubscriptionId = null;
            console.log(
              `🔄 Abonnement PayPal annulé, accès maintenu jusqu'à expiration pour utilisateur ${user._id}`
            );
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

// 🚀 ACTIVER LE PREMIUM APRÈS PAIEMENT PAYPAL
const activatePremium = async (req, res) => {
  try {
    const { subscriptionId, planId } = req.body;
    const userId = req.user._id;

    if (!subscriptionId || !planId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATA',
          message: "ID d'abonnement et plan requis",
        },
      });
    }

    // Vérifier l'abonnement auprès de PayPal
    try {
      const subscriptionDetails =
        await PayPalService.getSubscriptionDetails(subscriptionId);

      if (subscriptionDetails.status !== 'ACTIVE') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_NOT_ACTIVE',
            message: 'Abonnement non actif chez PayPal',
          },
        });
      }

      // Mettre à jour l'utilisateur avec le statut premium
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

      // Calculer la date d'expiration (30 jours pour mensuel)
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1);

      // Activer le premium
      user.premium.isPremium = true;
      user.premium.expiration = expirationDate;
      user.premium.paypalSubscriptionId = subscriptionId;
      user.premium.planId = planId;
      user.premium.activatedAt = new Date();

      await user.save();

      console.log(
        `✅ Premium activé pour utilisateur ${userId}: ${subscriptionId}`
      );

      res.json({
        success: true,
        message: 'Premium activé avec succès !',
        premium: {
          isPremium: true,
          expiration: expirationDate,
          subscriptionId: subscriptionId,
        },
      });
    } catch (paypalError) {
      console.error('Erreur vérification PayPal:', paypalError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PAYPAL_VERIFICATION_ERROR',
          message: "Impossible de vérifier l'abonnement PayPal",
        },
      });
    }
  } catch (error) {
    console.error('Erreur activation premium:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ACTIVATION_ERROR',
        message: "Erreur lors de l'activation premium",
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
  activatePremium, // ✅ Nouvelle méthode
};
