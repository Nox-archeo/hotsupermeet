/**
 * Système de gestion des cookies HotMeet
 * Conforme LPD suisse et RGPD
 * S'affiche APRÈS validation âge 18+
 */

(function () {
  'use strict';

  // Clés pour le localStorage
  const COOKIE_CONSENT_KEY = 'hotmeet_cookie_consent';
  const COOKIE_CONSENT_DATE = 'hotmeet_cookie_consent_date';
  const AGE_VERIFICATION_KEY = 'hotmeet_age_verified';

  // Types de cookies
  const COOKIE_TYPES = {
    ESSENTIAL: 'essential',
    ANALYTICS: 'analytics',
    ALL: 'all',
    NONE: 'none',
  };

  // Vérifier si l'âge est vérifié
  function isAgeVerified() {
    return localStorage.getItem(AGE_VERIFICATION_KEY) === 'true';
  }

  // Vérifier si le consentement cookies existe
  function hasCookieConsent() {
    return localStorage.getItem(COOKIE_CONSENT_KEY) !== null;
  }

  // Obtenir le type de consentement actuel
  function getCurrentConsent() {
    return localStorage.getItem(COOKIE_CONSENT_KEY);
  }

  // Enregistrer le consentement
  function setCookieConsent(consentType) {
    localStorage.setItem(COOKIE_CONSENT_KEY, consentType);
    localStorage.setItem(COOKIE_CONSENT_DATE, new Date().toISOString());

    // Appliquer la politique de cookies
    applyCookiePolicy(consentType);

    console.log('🍪 Consentement cookies enregistré:', consentType);
  }

  // Appliquer la politique de cookies
  function applyCookiePolicy(consentType) {
    if (consentType === COOKIE_TYPES.ALL) {
      // Activer tous les cookies (analytics, tracking, etc.)
      enableAnalyticsCookies();
    } else {
      // Désactiver les cookies non essentiels
      disableNonEssentialCookies();
    }
  }

  // Activer les cookies analytiques
  function enableAnalyticsCookies() {
    // Ici vous pourriez ajouter Google Analytics, etc.
    console.log('🍪 Cookies analytiques activés');

    // Exemple: Activer Google Analytics si vous en avez
    // if (typeof gtag !== 'undefined') {
    //   gtag('consent', 'update', {
    //     'analytics_storage': 'granted'
    //   });
    // }
  }

  // Désactiver les cookies non essentiels
  function disableNonEssentialCookies() {
    console.log('🍪 Seuls les cookies essentiels sont actifs');

    // Nettoyer les cookies analytiques existants si nécessaire
    // Exemple: Désactiver Google Analytics
    // if (typeof gtag !== 'undefined') {
    //   gtag('consent', 'update', {
    //     'analytics_storage': 'denied'
    //   });
    // }
  }

  // Créer le bandeau de cookies
  function createCookieBanner() {
    // Vérifier si l'âge est vérifié ET si pas encore de consentement cookies
    if (!isAgeVerified() || hasCookieConsent()) {
      return;
    }

    // Créer le bandeau
    const banner = document.createElement('div');
    banner.id = 'cookieBanner';
    banner.className = 'cookie-banner';

    banner.innerHTML = `
      <div class="cookie-banner-content">
        <div class="cookie-banner-text">
          <h3>🍪 Gestion des cookies</h3>
          <p>
            HotMeet utilise des cookies pour assurer le fonctionnement du site (authentification, paiements) et améliorer votre expérience. 
            Vous pouvez accepter tous les cookies ou refuser les cookies non essentiels.
          </p>
          <p class="cookie-banner-details">
            <strong>Cookies essentiels :</strong> Connexion, sécurité, paiements PayPal<br>
            <strong>Cookies optionnels :</strong> Amélioration de l'expérience utilisateur
          </p>
        </div>
        <div class="cookie-banner-actions">
          <button id="acceptAllCookies" class="btn-cookie-accept">✅ Accepter tous les cookies</button>
          <button id="refuseCookies" class="btn-cookie-refuse">❌ Refuser les cookies non essentiels</button>
          <button id="cookieSettings" class="btn-cookie-settings">⚙️ Paramètres</button>
        </div>
      </div>
    `;

    // Ajouter les styles
    const styles = document.createElement('style');
    styles.textContent = `
      .cookie-banner {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #2c3e50, #34495e);
        color: white;
        padding: 1.5rem;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
        z-index: 8000;
        border-top: 3px solid #8e24aa;
      }

      .cookie-banner-content {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 1.5rem;
      }

      .cookie-banner-text {
        flex: 1;
        min-width: 300px;
      }

      .cookie-banner-text h3 {
        margin: 0 0 0.5rem 0;
        color: #8e24aa;
        font-size: 1.2rem;
      }

      .cookie-banner-text p {
        margin: 0 0 0.5rem 0;
        line-height: 1.4;
      }

      .cookie-banner-details {
        font-size: 0.9rem;
        opacity: 0.9;
      }

      .cookie-banner-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
      }

      .cookie-banner-actions button {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.9rem;
      }

      .btn-cookie-accept {
        background: #27ae60;
        color: white;
      }

      .btn-cookie-accept:hover {
        background: #229954;
      }

      .btn-cookie-refuse {
        background: #e74c3c;
        color: white;
      }

      .btn-cookie-refuse:hover {
        background: #c0392b;
      }

      .btn-cookie-settings {
        background: #95a5a6;
        color: white;
      }

      .btn-cookie-settings:hover {
        background: #7f8c8d;
      }

      @media (max-width: 768px) {
        .cookie-banner {
          padding: 1rem;
        }

        .cookie-banner-content {
          flex-direction: column;
          text-align: center;
        }

        .cookie-banner-actions {
          justify-content: center;
          width: 100%;
        }

        .cookie-banner-actions button {
          flex: 1;
          min-width: auto;
        }
      }

      @media (max-width: 480px) {
        .cookie-banner-actions {
          flex-direction: column;
        }

        .cookie-banner-actions button {
          width: 100%;
        }
      }
    `;

    // Ajouter au document
    document.head.appendChild(styles);
    document.body.appendChild(banner);

    // Empêcher le scroll du contenu derrière le bandeau
    document.body.style.paddingBottom = banner.offsetHeight + 'px';

    // Event listeners
    const acceptBtn = banner.querySelector('#acceptAllCookies');
    const refuseBtn = banner.querySelector('#refuseCookies');
    const settingsBtn = banner.querySelector('#cookieSettings');

    acceptBtn.addEventListener('click', function () {
      setCookieConsent(COOKIE_TYPES.ALL);
      removeBanner();
    });

    refuseBtn.addEventListener('click', function () {
      setCookieConsent(COOKIE_TYPES.ESSENTIAL);
      removeBanner();
    });

    settingsBtn.addEventListener('click', function () {
      showCookieSettings();
    });

    function removeBanner() {
      banner.remove();
      document.body.style.paddingBottom = '';
    }
  }

  // Afficher les paramètres détaillés des cookies
  function showCookieSettings() {
    const modal = document.createElement('div');
    modal.className = 'cookie-settings-modal';

    modal.innerHTML = `
      <div class="cookie-settings-overlay"></div>
      <div class="cookie-settings-content">
        <h3>🍪 Paramètres des cookies</h3>
        <div class="cookie-category">
          <h4>🔒 Cookies essentiels</h4>
          <p>Ces cookies sont nécessaires au fonctionnement du site et ne peuvent pas être désactivés.</p>
          <ul>
            <li>Authentification et session utilisateur</li>
            <li>Sécurité et protection CSRF</li>
            <li>Fonctionnement des paiements PayPal</li>
            <li>Vérification d'âge (18+)</li>
          </ul>
          <label class="cookie-toggle">
            <input type="checkbox" checked disabled> Toujours actifs
          </label>
        </div>
        <div class="cookie-category">
          <h4>📊 Cookies analytiques</h4>
          <p>Ces cookies nous aident à comprendre comment vous utilisez le site pour l'améliorer.</p>
          <ul>
            <li>Statistiques d'utilisation anonymes</li>
            <li>Amélioration de l'expérience utilisateur</li>
          </ul>
          <label class="cookie-toggle">
            <input type="checkbox" id="analyticsToggle"> Activer les cookies analytiques
          </label>
        </div>
        <div class="cookie-settings-actions">
          <button id="saveSettings" class="btn-cookie-accept">Sauvegarder</button>
          <button id="closeSettings" class="btn-cookie-settings">Fermer</button>
        </div>
      </div>
    `;

    // Styles pour la modal
    const modalStyles = document.createElement('style');
    modalStyles.textContent = `
      .cookie-settings-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }

      .cookie-settings-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
      }

      .cookie-settings-content {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      }

      .cookie-settings-content h3 {
        margin: 0 0 1.5rem 0;
        color: #2c3e50;
      }

      .cookie-category {
        margin-bottom: 1.5rem;
        padding: 1rem;
        border: 1px solid #ecf0f1;
        border-radius: 8px;
      }

      .cookie-category h4 {
        margin: 0 0 0.5rem 0;
        color: #34495e;
      }

      .cookie-category p {
        margin: 0 0 0.5rem 0;
        color: #7f8c8d;
        font-size: 0.9rem;
      }

      .cookie-category ul {
        margin: 0 0 1rem 0;
        padding-left: 1.2rem;
        font-size: 0.85rem;
        color: #95a5a6;
      }

      .cookie-toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        cursor: pointer;
      }

      .cookie-settings-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
      }

      .cookie-settings-actions button {
        flex: 1;
        padding: 0.75rem;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
    `;

    document.head.appendChild(modalStyles);
    document.body.appendChild(modal);

    // Pré-remplir selon le consentement actuel
    const currentConsent = getCurrentConsent();
    const analyticsToggle = modal.querySelector('#analyticsToggle');
    analyticsToggle.checked = currentConsent === COOKIE_TYPES.ALL;

    // Event listeners
    modal.querySelector('#saveSettings').addEventListener('click', function () {
      const consentType = analyticsToggle.checked
        ? COOKIE_TYPES.ALL
        : COOKIE_TYPES.ESSENTIAL;
      setCookieConsent(consentType);
      modal.remove();
      // Supprimer aussi le bandeau s'il existe
      const banner = document.getElementById('cookieBanner');
      if (banner) {
        banner.remove();
        document.body.style.paddingBottom = '';
      }
    });

    modal
      .querySelector('#closeSettings')
      .addEventListener('click', function () {
        modal.remove();
      });

    // Fermer en cliquant sur l'overlay
    modal
      .querySelector('.cookie-settings-overlay')
      .addEventListener('click', function () {
        modal.remove();
      });
  }

  // Créer un bouton pour modifier les paramètres cookies
  function createCookieSettingsButton() {
    // Ne créer le bouton que si le consentement existe
    if (!hasCookieConsent()) {
      return;
    }

    const button = document.createElement('button');
    button.id = 'cookieSettingsButton';
    button.innerHTML = '🍪 Paramètres cookies';
    button.className = 'cookie-settings-button';

    const buttonStyles = document.createElement('style');
    buttonStyles.textContent = `
      .cookie-settings-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #34495e;
        color: white;
        border: none;
        padding: 0.75rem 1rem;
        border-radius: 25px;
        cursor: pointer;
        font-size: 0.85rem;
        z-index: 7000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
      }

      .cookie-settings-button:hover {
        background: #2c3e50;
        transform: translateY(-2px);
      }

      @media (max-width: 768px) {
        .cookie-settings-button {
          bottom: 80px;
          right: 15px;
          font-size: 0.8rem;
          padding: 0.6rem 0.8rem;
        }
      }
    `;

    document.head.appendChild(buttonStyles);
    document.body.appendChild(button);

    button.addEventListener('click', showCookieSettings);
  }

  // Vérifier périodiquement si l'âge est vérifié
  function checkForAgeVerification() {
    if (isAgeVerified() && !hasCookieConsent()) {
      createCookieBanner();
    } else if (hasCookieConsent()) {
      // Appliquer la politique existante
      applyCookiePolicy(getCurrentConsent());
      createCookieSettingsButton();
    }
  }

  // Observer les changements de localStorage pour détecter la vérification d'âge
  function observeStorageChanges() {
    let lastAgeVerified = isAgeVerified();

    const checkStorage = () => {
      const currentAgeVerified = isAgeVerified();

      if (currentAgeVerified !== lastAgeVerified) {
        lastAgeVerified = currentAgeVerified;

        if (currentAgeVerified && !hasCookieConsent()) {
          // Délai pour laisser le temps au popup âge de disparaître
          setTimeout(createCookieBanner, 500);
        }
      }
    };

    // Vérifier toutes les 500ms
    setInterval(checkStorage, 500);
  }

  // Initialisation
  function init() {
    // Vérifier immédiatement
    setTimeout(checkForAgeVerification, 100);

    // Observer les changements
    observeStorageChanges();
  }

  // Fonction publique pour reset (debug)
  window.resetCookieConsent = function () {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    localStorage.removeItem(COOKIE_CONSENT_DATE);
    console.log('🔄 Consentement cookies reset - rechargez la page');
  };

  // Fonction publique pour vérifier le statut
  window.getCookieStatus = function () {
    return {
      ageVerified: isAgeVerified(),
      hasConsent: hasCookieConsent(),
      consentType: getCurrentConsent(),
      consentDate: localStorage.getItem(COOKIE_CONSENT_DATE),
    };
  };

  // Fonction publique pour afficher les paramètres cookies
  window.showCookieSettings = showCookieSettings;

  // Démarrer quand le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
