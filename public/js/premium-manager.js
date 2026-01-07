// Gestion des fonctionnalités premium côté client
class PremiumManager {
  constructor() {
    this.userPremiumStatus = null;
    this.isInitialized = false;
    this.init();
  }

  async init() {
    try {
      await this.loadPremiumStatus();
      this.isInitialized = true;
      this.updateUI();
    } catch (error) {
      console.error('Erreur initialisation PremiumManager:', error);
    }
  }

  // Charger le statut premium de l'utilisateur
  async loadPremiumStatus() {
    try {
      const token = localStorage.getItem('hotmeet_token');
      if (!token) return;

      const response = await fetch('/api/payments/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.userPremiumStatus = data.subscription;
      }
    } catch (error) {
      console.error('Erreur chargement statut premium:', error);
    }
  }

  // Vérifier si l'utilisateur a accès premium
  isPremium() {
    return this.userPremiumStatus?.isPremium;
  }

  // isFemaleFree supprimé - plus d'accès gratuit femmes

  // Obtenir le statut d'expiration
  getExpirationStatus() {
    if (!this.userPremiumStatus?.expiration) return null;

    const expiration = new Date(this.userPremiumStatus.expiration);
    const now = new Date();
    const daysLeft = Math.ceil((expiration - now) / (1000 * 60 * 60 * 24));

    return {
      expiration,
      daysLeft,
      isExpired: expiration < now,
      isExpiringSoon: daysLeft <= 7 && daysLeft > 0,
    };
  }

  // Afficher la modal premium
  showPremiumModal(feature = 'cette fonctionnalité') {
    const modal = document.createElement('div');
    modal.className = 'premium-modal';
    modal.innerHTML = `
      <div class="premium-modal-content">
        <div class="premium-modal-header">
          <h2>🔥 Premium Requis</h2>
          <button class="premium-modal-close">&times;</button>
        </div>
        <div class="premium-modal-body">
          <p>L'accès à ${feature} nécessite un abonnement premium.</p>
          <div class="premium-features">
            <h3>Avec Premium, vous débloquez :</h3>
            <ul>
              <li>✓ Accès illimité aux profils</li>
              <li>✓ Messages illimités avec tous les membres</li>
              <li>🌟 Non-premium peuvent vous écrire sans limite</li>
              <li>✓ Recherche avancée</li>
              <li>✓ Cam avec sélection de genre</li>
              <li>✓ Création d'annonces</li>
              <li>✓ Statut premium visible</li>
            </ul>
          </div>
          <div class="premium-price">
            <span class="price">5.75 CHF/mois</span>
          </div>
          <div class="premium-actions">
            <button class="btn-premium" onclick="window.location.href='/premium'">
              Devenir Premium
            </button>
            <button class="btn-cancel" onclick="this.closest('.premium-modal').remove()">
              Plus tard
            </button>
          </div>
        </div>
      </div>
    `;

    // Styles CSS inline
    const styles = `
      .premium-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
      }
      .premium-modal-content {
        background: white;
        border-radius: 15px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        animation: slideUp 0.3s ease;
      }
      .premium-modal-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 15px 15px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .premium-modal-header h2 {
        margin: 0;
        font-size: 1.5rem;
      }
      .premium-modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .premium-modal-close:hover {
        background: rgba(255,255,255,0.2);
      }
      .premium-modal-body {
        padding: 30px;
        text-align: center;
      }
      .premium-features {
        margin: 20px 0;
        text-align: left;
      }
      .premium-features h3 {
        color: #333;
        margin-bottom: 15px;
        text-align: center;
      }
      .premium-features ul {
        list-style: none;
        padding: 0;
      }
      .premium-features li {
        padding: 8px 0;
        color: #4CAF50;
        font-weight: 500;
      }
      .premium-price {
        margin: 20px 0;
      }
      .price {
        font-size: 2rem;
        font-weight: 700;
        color: #667eea;
      }
      .premium-actions {
        display: flex;
        gap: 15px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .btn-premium {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 30px;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .btn-premium:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 20px rgba(102, 126, 234, 0.3);
      }
      .btn-cancel {
        background: #f8f9fa;
        color: #666;
        padding: 12px 30px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .btn-cancel:hover {
        background: #e9ecef;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { 
          opacity: 0;
          transform: translateY(30px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
      @media (max-width: 768px) {
        .premium-modal-content {
          width: 95%;
          margin: 10px;
        }
        .premium-modal-body {
          padding: 20px;
        }
        .premium-actions {
          flex-direction: column;
        }
        .btn-premium, .btn-cancel {
          width: 100%;
        }
      }
    `;

    // Ajouter les styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Event listeners
    modal
      .querySelector('.premium-modal-close')
      .addEventListener('click', () => {
        modal.remove();
      });

    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    document.body.appendChild(modal);
  }

  // Vérifier et bloquer une fonctionnalité si nécessaire
  checkFeatureAccess(feature, requiredLevel = 'premium') {
    if (!this.isInitialized) {
      console.warn('PremiumManager non initialisé');
      return false;
    }

    const hasAccess = this.isPremium();

    if (!hasAccess) {
      this.showPremiumModal(feature);
      return false;
    }

    return true;
  }

  // Limiter une action (ex: nombre de messages par jour)
  async checkActionLimit(action, currentCount, limit) {
    if (this.isPremium()) {
      return true; // Pas de limite pour premium
    }

    if (currentCount >= limit) {
      this.showPremiumModal(`${action} (limite: ${limit}/jour)`);
      return false;
    }

    return true;
  }

  // Mettre à jour l'interface utilisateur selon le statut premium
  updateUI() {
    if (!this.isInitialized) return;

    // Marquer les éléments premium
    document.querySelectorAll('[data-premium-required]').forEach(element => {
      if (!this.isPremium()) {
        element.classList.add('premium-locked');
        element.setAttribute('title', 'Fonctionnalité Premium');

        // Ajouter l'icône premium
        if (!element.querySelector('.premium-badge')) {
          const badge = document.createElement('span');
          badge.className = 'premium-badge';
          badge.innerHTML = '👑';
          badge.style.cssText = `
            position: absolute;
            top: -5px;
            right: -5px;
            background: gold;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
          `;
          element.style.position = 'relative';
          element.appendChild(badge);
        }
      }
    });

    // Afficher le statut premium dans la navbar
    this.updatePremiumStatus();
  }

  // Mettre à jour l'affichage du statut premium
  updatePremiumStatus() {
    const statusElement = document.querySelector('#premium-status');
    if (!statusElement) return;

    if (this.isPremium()) {
      const expiration = this.getExpirationStatus();

      statusElement.innerHTML = `
        <span class="premium-active">
          👑 Premium
          ${expiration?.daysLeft > 0 ? `(${expiration.daysLeft}j)` : ''}
        </span>
      `;
      statusElement.style.color = '#4CAF50';
    } else {
      statusElement.innerHTML = `
        <a href="/premium" class="premium-upgrade">
          Devenir Premium
        </a>
      `;
    }
  }

  // Notification d'expiration proche
  showExpirationWarning() {
    const expiration = this.getExpirationStatus();

    if (expiration?.isExpiringSoon) {
      const notification = document.createElement('div');
      notification.className = 'expiration-warning';
      notification.innerHTML = `
        <div class="warning-content">
          <span>⚠️ Votre abonnement expire dans ${expiration.daysLeft} jour(s)</span>
          <a href="/premium" class="renew-link">Renouveler</a>
        </div>
      `;
      notification.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        background: #ff9800;
        color: white;
        padding: 15px;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 9999;
        max-width: 300px;
      `;

      document.body.appendChild(notification);

      setTimeout(() => notification.remove(), 10000);
    }
  }
}

// Instance globale
window.premiumManager = new PremiumManager();

// Utilitaires d'intégration
window.checkPremiumAccess = feature => {
  return window.premiumManager.checkFeatureAccess(feature);
};

window.requirePremium = (callback, feature = 'cette fonctionnalité') => {
  if (window.premiumManager.checkFeatureAccess(feature)) {
    callback();
  }
};

// Auto-initialisation après chargement DOM
document.addEventListener('DOMContentLoaded', () => {
  // Ajouter un élément de statut premium à la navbar si absent
  const navbar = document.querySelector('.navbar .nav-menu');
  if (navbar && !document.querySelector('#premium-status')) {
    const statusElement = document.createElement('span');
    statusElement.id = 'premium-status';
    statusElement.style.marginLeft = '15px';
    navbar.appendChild(statusElement);
  }

  // Vérifier l'expiration après 2 secondes
  setTimeout(() => {
    window.premiumManager.showExpirationWarning();
  }, 2000);
});

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PremiumManager;
}
