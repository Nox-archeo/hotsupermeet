// HotMeet - Gestionnaire global de notifications
class GlobalNotificationManager {
  constructor() {
    this.isPolling = false;
    this.pollInterval = null;
    this.pushSupported = false;
    this.pushSubscription = null;
    this.swRegistration = null;
    this.init();
  }

  // Initialisation
  async init() {
    console.log('🔔 GlobalNotificationManager - Initialisation...');

    // Initialiser le service worker et les push notifications
    await this.initServiceWorker();
    await this.initPushNotifications();

    // Vérifier immédiatement si un token existe
    this.checkAndStart();

    // Écouter les changements de connexion
    window.addEventListener('storage', e => {
      if (e.key === 'hotmeet_token') {
        console.log('🔔 Token changé:', e.newValue ? 'connecté' : 'déconnecté');
        if (e.newValue) {
          this.startGlobalPolling();
          // Si les push sont supportés, s'abonner
          if (this.pushSupported) {
            this.subscribeToPush();
          }
        } else {
          this.stopGlobalPolling();
          this.hideBadge();
          // Désabonner des push
          this.unsubscribeFromPush();
        }
      }
    });

    // Écouter les messages du service worker
    navigator.serviceWorker.addEventListener('message', event => {
      this.handleServiceWorkerMessage(event.data);
    });

    // Vérifier toutes les 5 secondes si l'utilisateur s'est connecté
    // (au cas où le token arrive après l'initialisation)
    this.initInterval = setInterval(() => {
      this.checkAndStart();
    }, 5000);
  }

  // Initialiser le service worker
  async initServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('🚫 Service Worker non supporté');
      return false;
    }

    try {
      // Enregistrer le service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.swRegistration = registration;
      console.log('✅ Service Worker enregistré:', registration.scope);

      // Attendre qu'il soit prêt
      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker prêt');

      return true;
    } catch (error) {
      console.error('❌ Erreur enregistrement Service Worker:', error);
      return false;
    }
  }

  // Initialiser les push notifications
  async initPushNotifications() {
    if (!('PushManager' in window)) {
      console.warn('🚫 Push notifications non supportées');
      return false;
    }

    if (!('Notification' in window)) {
      console.warn('🚫 Notifications non supportées');
      return false;
    }

    this.pushSupported = true;
    console.log('✅ Push notifications supportées');

    // Vérifier l'état des permissions
    const permission = Notification.permission;
    console.log('🔐 Permission notifications:', permission);

    return true;
  }

  // Demander la permission pour les notifications
  async requestNotificationPermission() {
    if (!this.pushSupported) {
      console.warn('🚫 Push notifications non supportées');
      return false;
    }

    const permission = await Notification.requestPermission();
    console.log('🔐 Nouvelle permission notifications:', permission);

    if (permission === 'granted') {
      // Si accordée, s'abonner aux push
      await this.subscribeToPush();
      return true;
    }

    return false;
  }

  // S'abonner aux push notifications
  async subscribeToPush() {
    if (!this.pushSupported || !this.swRegistration) {
      console.warn('🚫 Conditions push non remplies');
      return false;
    }

    if (Notification.permission !== 'granted') {
      console.warn('🚫 Permission notifications non accordée');
      return false;
    }

    const token = localStorage.getItem('hotmeet_token');
    if (!token) {
      console.warn('🚫 Pas de token utilisateur');
      return false;
    }

    try {
      // Générer clés VAPID (utilisation de la clé publique générée)
      const vapidPublicKey =
        'BFsQ27NRVjUQbNLMsXDO4MlFuGlBqXyZbZu-koR2Pza5nLuMuaWHpsJoiFX-RLc-ghu7tmnOPFT7FrceQoZPooc';

      // Vérifier si déjà abonné
      let subscription =
        await this.swRegistration.pushManager.getSubscription();

      if (!subscription) {
        // Créer nouvel abonnement
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
        });

        console.log('✅ Nouvel abonnement push créé');
      } else {
        console.log('✅ Abonnement push existant trouvé');
      }

      this.pushSubscription = subscription;

      // Envoyer l'abonnement au serveur
      await this.sendSubscriptionToServer(subscription);

      return true;
    } catch (error) {
      console.error('❌ Erreur abonnement push:', error);
      return false;
    }
  }

  // Se désabonner des push notifications
  async unsubscribeFromPush() {
    if (!this.pushSubscription) return;

    try {
      await this.pushSubscription.unsubscribe();
      console.log('✅ Désabonné des push notifications');

      // Informer le serveur
      const token = localStorage.getItem('hotmeet_token');
      if (token) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: this.pushSubscription.endpoint,
          }),
        });
      }

      this.pushSubscription = null;
    } catch (error) {
      console.error('❌ Erreur désabonnement push:', error);
    }
  }

  // Envoyer l'abonnement au serveur
  async sendSubscriptionToServer(subscription) {
    const token = localStorage.getItem('hotmeet_token');
    if (!token) return;

    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(
              String.fromCharCode(
                ...new Uint8Array(subscription.getKey('p256dh'))
              )
            ),
            auth: btoa(
              String.fromCharCode(
                ...new Uint8Array(subscription.getKey('auth'))
              )
            ),
          },
        }),
      });

      if (response.ok) {
        console.log('✅ Abonnement push envoyé au serveur');
      } else {
        console.error('❌ Erreur envoi abonnement serveur:', response.status);
      }
    } catch (error) {
      console.error('❌ Erreur envoi abonnement:', error);
    }
  }

  // Gérer les messages du service worker
  handleServiceWorkerMessage(data) {
    console.log('💬 Message SW reçu:', data);

    switch (data.action) {
      case 'navigate':
        // Naviguer vers une URL
        if (data.url && data.url !== window.location.pathname) {
          window.location.href = data.url;
        }
        break;

      default:
        console.log('❓ Action SW non reconnue:', data.action);
    }
  }

  // Convertir clé VAPID base64 en Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Tester les notifications push
  async testPushNotification() {
    if (this.swRegistration) {
      this.swRegistration.active.postMessage({
        action: 'testNotification',
      });
    }
  }

  // Vérifier et démarrer si nécessaire
  checkAndStart() {
    const token = localStorage.getItem('hotmeet_token');
    if (token && !this.isPolling) {
      console.log('🔔 Token détecté, démarrage notifications globales');
      this.startGlobalPolling();

      // Si les push sont supportés, s'abonner
      if (this.pushSupported) {
        this.subscribeToPush();
      }

      // Arrêter la vérification d'initialisation
      if (this.initInterval) {
        clearInterval(this.initInterval);
        this.initInterval = null;
      }
    }
  }

  // Démarrer la vérification globale
  startGlobalPolling() {
    if (this.isPolling) return;

    console.log('🔔 Démarrage polling notifications globales');
    this.isPolling = true;

    // Vérifier immédiatement
    this.checkGlobalNotifications();

    // Puis vérifier toutes les 30 secondes (moins fréquent que sur la page messages)
    this.pollInterval = setInterval(() => {
      this.checkGlobalNotifications();
    }, 30000);
  }

  // Arrêter la vérification
  stopGlobalPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
  }

  // Vérifier les notifications globales
  async checkGlobalNotifications() {
    const token = localStorage.getItem('hotmeet_token');
    if (!token) {
      this.hideBadge();
      return;
    }

    console.log('🔔 Vérification notifications globales...');

    try {
      let totalNotifications = 0;

      // Vérifier les demandes de chat en attente
      try {
        const requestsResponse = await fetch('/api/messages/requests', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json();
          totalNotifications += (requestsData.requests || []).length;
        }
      } catch (error) {
        console.warn('Erreur vérification demandes chat:', error);
      }

      // Vérifier les conversations avec messages non lus
      try {
        const conversationsResponse = await fetch(
          '/api/messages/conversations',
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (conversationsResponse.ok) {
          const conversationsData = await conversationsResponse.json();
          const conversations = conversationsData.conversations || [];
          const unreadMessages = conversations.reduce((total, conv) => {
            return total + (conv.unreadCount || 0);
          }, 0);
          totalNotifications += unreadMessages;
        }
      } catch (error) {
        console.warn('Erreur vérification conversations:', error);
      }

      // TODO: Ajouter vérification des réponses aux annonces et demandes Ce Soir
      // quand les APIs seront disponibles

      // Mettre à jour le badge
      console.log('🔔 Total notifications:', totalNotifications);
      this.updateBadge(totalNotifications);
    } catch (error) {
      console.error('Erreur vérification notifications globales:', error);
    }
  }

  // Mettre à jour le badge de notification
  updateBadge(count) {
    const badge = document.getElementById('messageBadge');
    console.log('🔔 Mise à jour badge:', count, 'Badge element:', badge);

    if (!badge) {
      console.warn('🔔 Badge messageBadge non trouvé sur cette page');
      return;
    }

    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline';

      // Ajouter une animation si le nombre a augmenté
      if (this.lastCount !== undefined && count > this.lastCount) {
        badge.style.animation = 'none';
        // Force reflow
        badge.offsetHeight;
        badge.style.animation = 'notificationPulse 0.6s ease-in-out';
      }
    } else {
      badge.style.display = 'none';
    }

    this.lastCount = count;
  }

  // Cacher le badge
  hideBadge() {
    const badge = document.getElementById('messageBadge');
    if (badge) {
      badge.style.display = 'none';
    }
  }

  // Méthode publique pour forcer une mise à jour
  forceUpdate() {
    this.checkGlobalNotifications();
  }
}

// Styles CSS pour l'animation du badge
const globalNotificationStyles = `
<style>
  .notification-badge {
    background: #ff4757;
    color: white;
    border-radius: 50%;
    padding: 2px 6px;
    font-size: 0.8rem;
    margin-left: 5px;
    font-weight: bold;
    min-width: 18px;
    text-align: center;
    position: relative;
    top: -2px;
  }

  @keyframes notificationPulse {
    0% { 
      transform: scale(1); 
      background-color: #ff4757;
    }
    50% { 
      transform: scale(1.2); 
      background-color: #ff6b7d;
    }
    100% { 
      transform: scale(1); 
      background-color: #ff4757;
    }
  }

  /* Style pour le badge actif */
  .notification-badge.active {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }
</style>
`;

// Initialisation automatique quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
  // Ajouter les styles
  document.head.insertAdjacentHTML('beforeend', globalNotificationStyles);

  // Initialiser le gestionnaire global
  window.globalNotificationManager = new GlobalNotificationManager();
});

// Exposer la classe pour usage externe si nécessaire
window.GlobalNotificationManager = GlobalNotificationManager;
