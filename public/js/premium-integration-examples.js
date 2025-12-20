// 🔥 EXEMPLE D'INTÉGRATION PREMIUM DANS VOS PAGES EXISTANTES
// Ajoutez ce code dans vos fichiers JavaScript existants

// ==================== ANNONCES (ads.js) ====================

// Avant de créer une annonce
function createAd() {
  // Vérifier l'accès premium
  if (!window.premiumManager.checkFeatureAccess("la création d'annonces")) {
    return; // La modal premium s'affichera automatiquement
  }

  // Continuer avec la création d'annonce normale
  // ... votre code existant
}

// Avant d'afficher toutes les annonces
function loadAds() {
  // Pas de vérification needed - la limitation est appliquée côté serveur
  // Mais vous pouvez afficher un message si limitées
  fetch('/api/ads')
    .then(response => response.json())
    .then(data => {
      displayAds(data.data);

      // Afficher message de limitation si applicable
      if (data.premium && data.premium.upgradeRequired) {
        showPremiumUpgradeNotice();
      }
    });
}

// ==================== MESSAGES (messages.js) ====================

// Avant d'envoyer un message
async function sendMessage(recipientId, message) {
  // Vérifier la limite quotidienne
  const dailyCount = await getDailyMessageCount();
  if (
    !(await window.premiumManager.checkActionLimit('messages', dailyCount, 3))
  ) {
    return; // Modal premium affichée automatiquement
  }

  // Continuer avec l'envoi normal
  // ... votre code existant
}

// ==================== ANNUAIRE (directory.js) ====================

// Avant de voir plus de profils
function loadMoreProfiles() {
  const currentCount = document.querySelectorAll('.profile-card').length;

  // Vérifier la limite pour non-premium
  if (!window.premiumManager.isPremium() && currentCount >= 50) {
    window.premiumManager.showPremiumModal('plus de 50 profils');
    return;
  }

  // Continuer le chargement normal
  // ... votre code existant
}

// Avant la recherche avancée
function performAdvancedSearch() {
  if (!window.premiumManager.checkFeatureAccess('la recherche avancée')) {
    return;
  }

  // Continuer la recherche
  // ... votre code existant
}

// ==================== CAM (cam.js) ====================

// Avant de se mettre en ligne
function goOnline() {
  if (!window.premiumManager.checkFeatureAccess('la mise en ligne cam')) {
    return;
  }

  // Continuer la mise en ligne
  // ... votre code existant
}

// Avant de filtrer par genre
function filterByGender(gender) {
  if (!window.premiumManager.checkFeatureAccess('le filtrage par genre')) {
    return;
  }

  // Appliquer le filtre
  // ... votre code existant
}

// ==================== PROFIL (profile.js) ====================

// Avant d'accéder aux photos privées
function viewPrivatePhotos(userId) {
  if (!window.premiumManager.checkFeatureAccess("l'accès aux photos privées")) {
    return;
  }

  // Continuer l'accès
  // ... votre code existant
}

// ==================== UTILITAIRES GÉNÉRIQUES ====================

// Afficher un notice d'upgrade premium
function showPremiumUpgradeNotice() {
  const notice = document.createElement('div');
  notice.className = 'premium-upgrade-notice';
  notice.innerHTML = `
    <div class="notice-content">
      <span>👑 Vous voyez un aperçu limité. </span>
      <a href="/premium" class="upgrade-link">Devenir Premium</a>
    </div>
  `;
  notice.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px;
    text-align: center;
    margin: 20px 0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;

  document.querySelector('.main-content').prepend(notice);
}

// Compter les actions quotidiennes depuis localStorage
function getDailyActionCount(action) {
  const today = new Date().toDateString();
  const key = `daily_${action}_${today}`;
  return parseInt(localStorage.getItem(key)) || 0;
}

// Incrémenter le compteur d'actions
function incrementDailyAction(action) {
  const today = new Date().toDateString();
  const key = `daily_${action}_${today}`;
  const current = getDailyActionCount(action);
  localStorage.setItem(key, current + 1);
}

// Vérifier et appliquer une limitation
function checkAndApplyLimit(action, limit, callback) {
  const count = getDailyActionCount(action);

  if (window.premiumManager.isPremium()) {
    callback(); // Pas de limite pour premium
    return;
  }

  if (count >= limit) {
    window.premiumManager.showPremiumModal(`${action} (limite: ${limit}/jour)`);
    return;
  }

  callback();
  incrementDailyAction(action);
}

// ==================== INTÉGRATION HTML ====================

// Marquer des éléments comme premium dans le HTML
// Ajoutez l'attribut data-premium-required="true" aux boutons/liens premium
// Exemple: <button data-premium-required="true" onclick="createAd()">Créer Annonce</button>

// Le premium-manager.js ajoutera automatiquement :
// - Badge 👑
// - Style "premium-locked" si non-premium
// - Tooltip "Fonctionnalité Premium"

// ==================== CSS POUR LES FONCTIONNALITÉS VERROUILLÉES ====================

const premiumCSS = `
.premium-locked {
  position: relative;
  opacity: 0.7;
  cursor: help;
}

.premium-locked:hover::after {
  content: "Premium requis";
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
}

.premium-upgrade-notice {
  animation: slideDown 0.5s ease;
}

.upgrade-link {
  color: white;
  text-decoration: underline;
  font-weight: bold;
}

.upgrade-link:hover {
  color: #ffd700;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

// Ajouter les styles premium
const styleSheet = document.createElement('style');
styleSheet.textContent = premiumCSS;
document.head.appendChild(styleSheet);

// ==================== CONFIGURATION PAR PAGE ====================

// Dans ads.js - Restreindre la création
document.addEventListener('DOMContentLoaded', () => {
  const createButtons = document.querySelectorAll('[data-action="create-ad"]');
  createButtons.forEach(button => {
    button.addEventListener('click', e => {
      if (!window.premiumManager.checkFeatureAccess("la création d'annonces")) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  });
});

// Dans directory.js - Limiter les profils affichés
let profilesShown = 0;
function showProfile(profile) {
  if (!window.premiumManager.isPremium() && profilesShown >= 50) {
    window.premiumManager.showPremiumModal('plus de 50 profils');
    return false;
  }
  profilesShown++;
  return true;
}

// Dans messages.js - Limiter les messages
let dailyMessages = getDailyActionCount('messages');
function canSendMessage() {
  if (window.premiumManager.isPremium()) return true;
  if (dailyMessages >= 3) {
    window.premiumManager.showPremiumModal('plus de 3 messages par jour');
    return false;
  }
  return true;
}

// ==================== EXEMPLES D'UTILISATION ====================

// 1. Dans un gestionnaire de clic
document.getElementById('advancedSearchBtn').addEventListener('click', () => {
  window.requirePremium(() => {
    performAdvancedSearch();
  }, 'la recherche avancée');
});

// 2. Avec une vérification de limite
document.getElementById('sendMessageBtn').addEventListener('click', () => {
  checkAndApplyLimit('messages', 3, () => {
    sendMessage(recipientId, messageText);
  });
});

// 3. Vérification simple avant action
function viewUserProfile(userId) {
  if (window.checkPremiumAccess('consultation de profil')) {
    loadUserProfile(userId);
  }
}

console.log('🔥 Système Premium intégré dans toutes les pages !');

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    checkAndApplyLimit,
    getDailyActionCount,
    incrementDailyAction,
    showPremiumUpgradeNotice,
  };
}
