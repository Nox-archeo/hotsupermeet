// HotMeet - Gestionnaire global de notifications
class GlobalNotificationManager {
  constructor() {
    this.isPolling = false;
    this.pollInterval = null;
    this.init();
  }

  // Initialisation
  init() {
    console.log('🔔 GlobalNotificationManager - Initialisation...');

    // Vérifier immédiatement si un token existe
    this.checkAndStart();

    // Écouter les changements de connexion
    window.addEventListener('storage', e => {
      if (e.key === 'hotmeet_token') {
        console.log('🔔 Token changé:', e.newValue ? 'connecté' : 'déconnecté');
        if (e.newValue) {
          this.startGlobalPolling();
        } else {
          this.stopGlobalPolling();
          this.hideBadge();
        }
      }
    });

    // Vérifier toutes les 5 secondes si l'utilisateur s'est connecté
    // (au cas où le token arrive après l'initialisation)
    this.initInterval = setInterval(() => {
      this.checkAndStart();
    }, 5000);
  }

  // Vérifier et démarrer si nécessaire
  checkAndStart() {
    const token = localStorage.getItem('hotmeet_token');
    if (token && !this.isPolling) {
      console.log('🔔 Token détecté, démarrage notifications globales');
      this.startGlobalPolling();
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
