/**
 * Système global de vérification d'âge
 * Fonctionne sur toutes les pages du site
 * Une fois accepté = jamais redemandé
 */

(function () {
  'use strict';

  // Clé pour le localStorage
  const AGE_VERIFICATION_KEY = 'hotmeet_age_verified';

  // Vérifier si l'âge a déjà été vérifié
  function isAgeVerified() {
    return localStorage.getItem(AGE_VERIFICATION_KEY) === 'true';
  }

  // Marquer l'âge comme vérifié
  function setAgeVerified() {
    localStorage.setItem(AGE_VERIFICATION_KEY, 'true');
    localStorage.setItem('hotmeet_age_verified_date', new Date().toISOString());
  }

  // Créer la modal de vérification d'âge
  function createAgeVerificationModal() {
    // Si déjà vérifié, ne rien faire
    if (isAgeVerified()) {
      return;
    }

    // Créer l'overlay
    const overlay = document.createElement('div');
    overlay.id = 'ageOverlay';
    overlay.className = 'age-overlay';

    // Créer la modal
    const modal = document.createElement('div');
    modal.id = 'ageVerificationModal';
    modal.className = 'age-modal';

    modal.innerHTML = `
      <div class="age-modal-content">
        <div class="age-modal-header">
          <h2>🔞 Vérification d'âge requise</h2>
        </div>
        <div class="age-modal-body">
          <p><strong>Ce site est réservé aux adultes de 18 ans et plus.</strong></p>
          <p>En cliquant sur "J'ai plus de 18 ans", vous confirmez que vous êtes majeur et acceptez nos conditions d'utilisation.</p>
          <div class="age-verification-actions">
            <button class="btn-primary" id="confirmAgeBtn">✅ J'ai plus de 18 ans</button>
            <button class="btn-secondary" id="exitSiteBtn">❌ Quitter le site</button>
          </div>
        </div>
      </div>
    `;

    // Ajouter les styles CSS
    const styles = document.createElement('style');
    styles.textContent = `
      .age-overlay {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 9998;
        backdrop-filter: blur(5px);
      }

      .age-modal {
        display: flex;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }

      .age-modal-content {
        background: white;
        padding: 2rem;
        border-radius: 15px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        text-align: center;
        max-width: 500px;
        margin: 1rem;
        position: relative;
      }

      .age-modal-header h2 {
        color: #8e24aa;
        margin-bottom: 1.5rem;
        font-size: 1.8rem;
      }

      .age-modal-body p {
        margin-bottom: 1rem;
        color: #333;
        line-height: 1.6;
      }

      .age-verification-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 2rem;
        flex-wrap: wrap;
      }

      .age-verification-actions .btn-primary {
        background: #8e24aa;
        border: none;
        padding: 1rem 2rem;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.3s;
        font-size: 1rem;
      }

      .age-verification-actions .btn-primary:hover {
        background: #7b1fa2;
      }

      .age-verification-actions .btn-secondary {
        background: #6c757d;
        border: none;
        padding: 1rem 2rem;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.3s;
        font-size: 1rem;
      }

      .age-verification-actions .btn-secondary:hover {
        background: #545b62;
      }

      @media (max-width: 768px) {
        .age-modal-content {
          padding: 1.5rem;
          margin: 0.5rem;
        }

        .age-verification-actions {
          flex-direction: column;
        }

        .age-verification-actions button {
          width: 100%;
        }
      }
    `;

    // Ajouter au document
    document.head.appendChild(styles);
    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    // Empêcher le scroll du body
    document.body.style.overflow = 'hidden';

    // Event listeners
    const confirmBtn = modal.querySelector('#confirmAgeBtn');
    const exitBtn = modal.querySelector('#exitSiteBtn');

    confirmBtn.addEventListener('click', function () {
      // Marquer comme vérifié
      setAgeVerified();

      // Supprimer la modal et l'overlay
      modal.remove();
      overlay.remove();

      // Rétablir le scroll
      document.body.style.overflow = '';

      console.log('✅ Âge vérifié et mémorisé');
    });

    exitBtn.addEventListener('click', function () {
      // Rediriger vers Google
      window.location.href = 'https://www.google.com';
    });

    // Empêcher la fermeture avec Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.parentElement) {
        e.preventDefault();
      }
    });
  }

  // Initialiser dès que le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createAgeVerificationModal);
  } else {
    createAgeVerificationModal();
  }

  // Debug: fonction pour reset la vérification (en cas de test)
  window.resetAgeVerification = function () {
    localStorage.removeItem(AGE_VERIFICATION_KEY);
    localStorage.removeItem('hotmeet_age_verified_date');
    console.log("🔄 Vérification d'âge reset - rechargez la page");
  };
})();
