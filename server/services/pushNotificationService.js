const webpush = require('web-push');
const User = require('../models/User');

class PushNotificationService {
  constructor() {
    // Configuration VAPID pour l'authentification
    this.vapidPublicKey =
      process.env.VAPID_PUBLIC_KEY ||
      'BFsQ27NRVjUQbNLMsXDO4MlFuGlBqXyZbZu-koR2Pza5nLuMuaWHpsJoiFX-RLc-ghu7tmnOPFT7FrceQoZPooc';
    this.vapidPrivateKey =
      process.env.VAPID_PRIVATE_KEY ||
      'vQtocwfzeC__5UQT4HIOTXuZJjrYkoNOxPZVzsovrSk';

    this.init();
  }

  // Initialisation du service
  init() {
    console.log('🔔 PushNotificationService - Initialisation...');

    // Configuration VAPID
    webpush.setVapidDetails(
      'mailto:admin@hotsupermeet.com',
      this.vapidPublicKey,
      this.vapidPrivateKey
    );

    console.log('✅ VAPID configuré pour push notifications');
  }

  // Sauvegarder un abonnement push pour un utilisateur
  async saveSubscription(userId, subscription) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Initialiser le tableau pushSubscriptions s'il n'existe pas
      if (!user.pushSubscriptions) {
        user.pushSubscriptions = [];
      }

      // Vérifier si cet endpoint existe déjà
      const existingIndex = user.pushSubscriptions.findIndex(
        sub => sub.endpoint === subscription.endpoint
      );

      if (existingIndex >= 0) {
        // Mettre à jour l'abonnement existant
        user.pushSubscriptions[existingIndex] = {
          ...subscription,
          updatedAt: new Date(),
        };
        console.log('🔄 Abonnement push mis à jour pour utilisateur:', userId);
      } else {
        // Ajouter nouvel abonnement
        user.pushSubscriptions.push({
          ...subscription,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(
          '✅ Nouvel abonnement push sauvé pour utilisateur:',
          userId
        );
      }

      await user.save();
      return true;
    } catch (error) {
      console.error('❌ Erreur sauvegarde abonnement push:', error);
      return false;
    }
  }

  // Supprimer un abonnement push
  async removeSubscription(userId, endpoint) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pushSubscriptions) {
        return true; // Déjà supprimé
      }

      user.pushSubscriptions = user.pushSubscriptions.filter(
        sub => sub.endpoint !== endpoint
      );

      await user.save();
      console.log('✅ Abonnement push supprimé pour utilisateur:', userId);
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression abonnement push:', error);
      return false;
    }
  }

  // Envoyer une notification push à un utilisateur
  async sendNotificationToUser(userId, payload) {
    try {
      const user = await User.findById(userId);
      if (
        !user ||
        !user.pushSubscriptions ||
        user.pushSubscriptions.length === 0
      ) {
        console.warn("🚫 Pas d'abonnement push pour utilisateur:", userId);
        return { success: false, reason: 'no_subscription' };
      }

      console.log(
        `📤 Envoi notification push à ${user.pushSubscriptions.length} device(s) pour utilisateur:`,
        userId
      );

      const promises = user.pushSubscriptions.map(
        async (subscription, index) => {
          try {
            const pushSubscription = {
              endpoint: subscription.endpoint,
              keys: subscription.keys,
            };

            await webpush.sendNotification(
              pushSubscription,
              JSON.stringify(payload)
            );
            console.log(`✅ Notification ${index + 1} envoyée avec succès`);
            return { success: true, index };
          } catch (error) {
            console.error(`❌ Erreur envoi notification ${index + 1}:`, error);

            // Si l'abonnement est invalide (410, 413), le supprimer
            if (error.statusCode === 410 || error.statusCode === 413) {
              console.log(`🧹 Suppression abonnement invalide ${index + 1}`);
              await this.removeInvalidSubscription(
                userId,
                subscription.endpoint
              );
            }

            return { success: false, index, error: error.message };
          }
        }
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;

      console.log(
        `📊 Résultats push: ${successCount}/${results.length} envoyées avec succès`
      );

      return {
        success: successCount > 0,
        totalSent: successCount,
        totalAttempted: results.length,
        results,
      };
    } catch (error) {
      console.error('❌ Erreur envoi notification push:', error);
      return { success: false, reason: 'send_error', error: error.message };
    }
  }

  // Supprimer un abonnement invalide
  async removeInvalidSubscription(userId, endpoint) {
    try {
      await this.removeSubscription(userId, endpoint);
    } catch (error) {
      console.error('❌ Erreur suppression abonnement invalide:', error);
    }
  }

  // Envoyer notification pour nouveau message
  async sendNewMessageNotification(recipientId, senderName, messagePreview) {
    const payload = {
      title: `💬 Nouveau message de ${senderName}`,
      body: messagePreview || 'Vous avez reçu un nouveau message',
      icon: '/images/logo-192.png',
      badge: '/images/badge-72.png',
      url: '/pages/messages.html',
      tag: 'new-message',
      type: 'message',
      userId: recipientId,
      requireInteraction: true,
      vibrate: [200, 100, 200],
    };

    return await this.sendNotificationToUser(recipientId, payload);
  }

  // Envoyer notification pour demande de chat
  async sendChatRequestNotification(recipientId, senderName) {
    const payload = {
      title: `💕 Nouvelle demande de chat`,
      body: `${senderName} souhaite discuter avec vous`,
      icon: '/images/logo-192.png',
      badge: '/images/badge-72.png',
      url: '/pages/messages.html',
      tag: 'chat-request',
      type: 'chat_request',
      userId: recipientId,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
    };

    return await this.sendNotificationToUser(recipientId, payload);
  }

  // Envoyer notification pour demande de photo privée
  async sendPhotoRequestNotification(recipientId, senderName) {
    const payload = {
      title: `📸 Demande de photo privée`,
      body: `${senderName} souhaite voir vos photos privées`,
      icon: '/images/logo-192.png',
      badge: '/images/badge-72.png',
      url: '/pages/profile.html',
      tag: 'photo-request',
      type: 'photo_request',
      userId: recipientId,
      requireInteraction: true,
      vibrate: [100, 50, 100, 50, 200]
    };

    return await this.sendNotificationToUser(recipientId, payload);
  },

  // Envoyer notification personnalisée
  async sendCustomNotification(userId, title, body, options = {}) {
    const payload = {
      title: title,
      body: body,
      icon: options.icon || '/images/logo-192.png',
      badge: options.badge || '/images/badge-72.png',
      url: options.url || '/',
      tag: options.tag || 'custom-notification',
      type: options.type || 'custom',
      userId: userId,
      requireInteraction: options.requireInteraction || false,
      vibrate: options.vibrate || [200, 100, 200],
    };

    return await this.sendNotificationToUser(userId, payload);
  }

  // Obtenir statistiques des abonnements
  async getSubscriptionStats() {
    try {
      const users = await User.find({
        pushSubscriptions: { $exists: true, $not: { $size: 0 } },
      }).select('_id email pushSubscriptions');

      const totalUsers = users.length;
      const totalSubscriptions = users.reduce(
        (sum, user) => sum + user.pushSubscriptions.length,
        0
      );

      return {
        totalUsersWithPush: totalUsers,
        totalSubscriptions: totalSubscriptions,
        averageSubscriptionsPerUser:
          totalUsers > 0 ? (totalSubscriptions / totalUsers).toFixed(2) : 0,
      };
    } catch (error) {
      console.error('❌ Erreur statistiques push:', error);
      return null;
    }
  }
}

module.exports = new PushNotificationService();
