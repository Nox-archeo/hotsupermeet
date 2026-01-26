const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const PushNotificationService = require('../services/pushNotificationService');

// S'abonner aux notifications push
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const userId = req.user.userId;

    console.log('📝 Nouvel abonnement push pour utilisateur:', userId);

    // Valider les données
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        error: "Données d'abonnement invalides",
      });
    }

    // Sauvegarder l'abonnement
    const success = await PushNotificationService.saveSubscription(userId, {
      endpoint,
      keys,
    });

    if (success) {
      res.json({
        success: true,
        message: 'Abonnement push sauvegardé avec succès',
      });

      // Envoyer une notification de test
      setTimeout(async () => {
        try {
          await PushNotificationService.sendCustomNotification(
            userId,
            '🔔 Notifications activées !',
            'Vous recevrez maintenant des notifications push de HotMeet',
            {
              tag: 'welcome-push',
              type: 'welcome',
              requireInteraction: false,
            }
          );
        } catch (error) {
          console.warn('⚠️ Erreur envoi notification bienvenue:', error);
        }
      }, 2000);
    } else {
      res.status(500).json({
        error: "Erreur lors de la sauvegarde de l'abonnement",
      });
    }
  } catch (error) {
    console.error('❌ Erreur route subscribe:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
    });
  }
});

// Se désabonner des notifications push
router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user.userId;

    console.log('🔕 Désabonnement push pour utilisateur:', userId);

    if (!endpoint) {
      return res.status(400).json({
        error: 'Endpoint requis pour le désabonnement',
      });
    }

    const success = await PushNotificationService.removeSubscription(
      userId,
      endpoint
    );

    if (success) {
      res.json({
        success: true,
        message: 'Désabonnement réussi',
      });
    } else {
      res.status(500).json({
        error: 'Erreur lors du désabonnement',
      });
    }
  } catch (error) {
    console.error('❌ Erreur route unsubscribe:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
    });
  }
});

// Envoyer une notification push (pour tests ou admin)
router.post('/send', auth, async (req, res) => {
  try {
    const { targetUserId, title, body, options } = req.body;
    const senderId = req.user.userId;

    // Vérifications de sécurité basiques
    if (!targetUserId || !title || !body) {
      return res.status(400).json({
        error: 'targetUserId, title et body sont requis',
      });
    }

    console.log(`📤 Envoi notification push: ${senderId} -> ${targetUserId}`);

    const result = await PushNotificationService.sendCustomNotification(
      targetUserId,
      title,
      body,
      options || {}
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Notification envoyée avec succès',
        stats: {
          totalSent: result.totalSent,
          totalAttempted: result.totalAttempted,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: "Erreur lors de l'envoi de la notification",
        reason: result.reason,
      });
    }
  } catch (error) {
    console.error('❌ Erreur route send:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
    });
  }
});

// Tester les notifications push pour l'utilisateur connecté
router.post('/test', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('🧪 Test notification push pour utilisateur:', userId);

    const result = await PushNotificationService.sendCustomNotification(
      userId,
      '🧪 Test de notification',
      'Si vous voyez ceci, les notifications push fonctionnent parfaitement !',
      {
        tag: 'test-notification',
        type: 'test',
        url: '/pages/profile.html',
        requireInteraction: false,
        vibrate: [100, 50, 100],
      }
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Notification test envoyée',
        stats: {
          totalSent: result.totalSent,
          totalAttempted: result.totalAttempted,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: "Erreur lors de l'envoi du test",
        reason: result.reason,
      });
    }
  } catch (error) {
    console.error('❌ Erreur route test:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
    });
  }
});

// Obtenir les statistiques des notifications push (admin)
router.get('/stats', auth, async (req, res) => {
  try {
    // TODO: Ajouter une vérification admin ici si nécessaire

    const stats = await PushNotificationService.getSubscriptionStats();

    if (stats) {
      res.json({
        success: true,
        stats,
      });
    } else {
      res.status(500).json({
        error: 'Erreur lors de la récupération des statistiques',
      });
    }
  } catch (error) {
    console.error('❌ Erreur route stats:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
    });
  }
});

// Obtenir le statut des abonnements pour l'utilisateur connecté
router.get('/status', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Récupérer l'utilisateur avec ses abonnements
    const User = require('../models/User');
    const user = await User.findById(userId).select('pushSubscriptions');

    const hasSubscriptions =
      user && user.pushSubscriptions && user.pushSubscriptions.length > 0;
    const subscriptionCount = hasSubscriptions
      ? user.pushSubscriptions.length
      : 0;

    res.json({
      success: true,
      hasSubscriptions,
      subscriptionCount,
      lastUpdated: hasSubscriptions
        ? Math.max(
            ...user.pushSubscriptions.map(
              sub => sub.updatedAt || sub.createdAt || 0
            )
          )
        : null,
    });
  } catch (error) {
    console.error('❌ Erreur route status:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
    });
  }
});

module.exports = router;
