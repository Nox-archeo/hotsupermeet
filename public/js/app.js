// HotMeet - Application JavaScript Principale

class HotMeetApp {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  // Initialisation de l'application
  init() {
    this.setupEventListeners();
    this.checkAuthentication();
    this.setupMobileMenu();
    this.setupSmoothScrolling();
    // DÉSACTIVÉ: this.setupAgeVerification(); - Utilise la vérification d'âge intégrée dans index.html
  }

  // Configuration des écouteurs d'événements
  setupEventListeners() {
    // Boutons de navigation
    document
      .getElementById('loginBtn')
      ?.addEventListener('click', () => this.navigateTo('/auth'));
    document
      .getElementById('registerBtn')
      ?.addEventListener('click', () => this.navigateTo('/auth'));
    document
      .getElementById('heroRegisterBtn')
      ?.addEventListener('click', () => this.navigateTo('/auth'));
    document
      .getElementById('finalRegisterBtn')
      ?.addEventListener('click', () => this.navigateTo('/auth'));
    document
      .getElementById('premiumBtn')
      ?.addEventListener('click', () => this.navigateTo('/premium'));
    document
      .getElementById('heroDiscoverBtn')
      ?.addEventListener('click', () => this.scrollToSection('features'));
    document
      .getElementById('learnMoreBtn')
      ?.addEventListener('click', () => this.scrollToSection('features'));

    // Vérification d'âge au chargement - DÉSACTIVÉE (gérée dans index.html)
    // this.checkAgeRequirement();
  }

  // Configuration du menu mobile
  setupMobileMenu() {
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('navMenu');

    console.log('Setup mobile menu:', { mobileToggle, navMenu });

    if (mobileToggle && navMenu) {
      mobileToggle.addEventListener('click', e => {
        e.stopPropagation();
        console.log('Mobile menu toggle clicked');
        navMenu.classList.toggle('active');
        mobileToggle.classList.toggle('active');
        document.body.classList.toggle('menu-open');
      });

      // Fermer le menu en cliquant à l'extérieur
      document.addEventListener('click', e => {
        if (navMenu.classList.contains('active')) {
          if (!mobileToggle.contains(e.target) && !navMenu.contains(e.target)) {
            console.log('Closing mobile menu');
            navMenu.classList.remove('active');
            mobileToggle.classList.remove('active');
            document.body.classList.remove('menu-open');
          }
        }
      });

      // Empêcher la fermeture lors du clic sur les liens du menu
      navMenu.addEventListener('click', e => {
        e.stopPropagation();
      });
    } else {
      console.error('Mobile menu elements not found:', {
        mobileToggle,
        navMenu,
      });
    }
  }

  // Configuration du défilement fluide
  setupSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        this.scrollToSection(targetId);
      });
    });
  }

  // Configuration de la vérification d'âge - DÉSACTIVÉE (utilise la vérification intégrée dans index.html)
  setupAgeVerification() {
    // DÉSACTIVÉ - La vérification d'âge est maintenant gérée directement dans index.html
    console.log(
      "Vérification d'âge désactivée dans app.js - Utilisation de la modale intégrée"
    );
  }

  // Vérification de l'authentification
  async checkAuthentication() {
    const token = localStorage.getItem('hotmeet_token');

    if (token) {
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          this.currentUser = data.user;
          this.updateUIForLoggedInUser();
        } else {
          localStorage.removeItem('hotmeet_token');
        }
      } catch (error) {
        console.error(
          'Erreur de vérification d\\' + 'authentification:',
          error
        );
        localStorage.removeItem('hotmeet_token');
      }
    }
  }

  // Mise à jour de l'UI pour utilisateur connecté
  updateUIForLoggedInUser() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const navActions = document.querySelector('.nav-actions');
    const navMenu = document.getElementById('navMenu');

    if (this.currentUser && navActions && navMenu) {
      // Remplacer les boutons de connexion par le profil utilisateur (sur desktop)
      navActions.innerHTML = `
                <div class="user-menu">
                    <div class="user-info">
                        <div class="user-avatar">
                            <img src="${this.currentUser.profile.photos?.[0] || '/images/avatar-placeholder.png'}" alt="${this.currentUser.profile.nom}">
                        </div>
                        <span class="user-name">${this.currentUser.profile.nom}</span>
                    </div>
                    <div class="dropdown-menu">
                        <a href="/profile" class="dropdown-item">📋 Mon Profil</a>
                        <a href="/messages" class="dropdown-item">💬 Messages</a>
                        <a href="/premium" class="dropdown-item ${this.currentUser.premium.isPremium ? 'premium-active' : ''}">⭐ ${this.currentUser.premium.isPremium ? 'Premium Actif' : 'Devenir Premium'}</a>
                        <button class="dropdown-item logout-btn">🚪 Déconnexion</button>
                    </div>
                </div>
                <div class="mobile-menu-toggle" id="mobileMenuToggle">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
            `;

      // Ajouter l'écouteur pour la déconnexion
      document
        .querySelector('.logout-btn')
        ?.addEventListener('click', () => this.logout());

      // Réinitialiser le menu mobile
      this.setupMobileMenu();

      // Ajouter le menu utilisateur au menu hamburger (pour mobile)
      const userMenuMobile = `
        <div class="user-menu-mobile">
          <div class="user-info">
            <div class="user-avatar">
              <img src="${this.currentUser.profile.photos?.[0] || '/images/avatar-placeholder.png'}" alt="${this.currentUser.profile.nom}">
            </div>
            <span class="user-name">${this.currentUser.profile.nom}</span>
          </div>
          <a href="/profile" class="nav-link">📋 Mon Profil</a>
          <a href="/messages" class="nav-link">💬 Messages</a>
          <a href="/premium" class="nav-link ${this.currentUser.premium.isPremium ? 'premium-active' : ''}">⭐ ${this.currentUser.premium.isPremium ? 'Premium Actif' : 'Devenir Premium'}</a>
          <button class="nav-link logout-btn-mobile">🚪 Déconnexion</button>
        </div>
      `;

      // Ajouter le menu utilisateur à la fin du menu hamburger
      navMenu.insertAdjacentHTML('beforeend', userMenuMobile);

      // Ajouter l'écouteur pour la déconnexion mobile
      document
        .querySelector('.logout-btn-mobile')
        ?.addEventListener('click', () => this.logout());
    }
  }

  // Navigation vers une page
  navigateTo(path) {
    window.location.href = path;
  }

  // Défilement vers une section
  scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  // Affichage de la modal de vérification d'âge simplifiée - DÉSACTIVÉE
  showAgeVerificationModal() {
    console.log(
      "Modal de vérification d'âge désactivée - Utilisation de la modale intégrée dans index.html"
    );
    // DÉSACTIVÉ - La modale est maintenant intégrée directement dans index.html
  }

  // Configuration des événements de la modal d'âge simplifiée - DÉSACTIVÉE
  setupAgeModalEvents() {
    console.log('Configuration des événements de modal d\\' + 'âge désactivée');
    // DÉSACTIVÉ - Les événements sont gérés directement dans index.html
  }

  // Gestion de la vérification d'âge simplifiée - DÉSACTIVÉE
  handleAgeVerification() {
    console.log('Gestion de la vérification d\\' + 'âge désactivée');
    // DÉSACTIVÉ - La vérification d'âge est gérée dans index.html
  }

  // Parser une date au format jj/mm/aaaa
  parseDate(dateString) {
    const parts = dateString.split('/');
    if (parts.length !== 3) {
      return null;
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Les mois commencent à 0
    const year = parseInt(parts[2], 10);

    // Validation basique
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return null;
    }
    if (day < 1 || day > 31) {
      return null;
    }
    if (month < 0 || month > 11) {
      return null;
    }
    if (year < 1900 || year > new Date().getFullYear()) {
      return null;
    }

    const date = new Date(year, month, day);

    // Vérifier que la date est valide (ex: pas de 30 février)
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  // Vérification de l'exigence d'âge au chargement - DÉSACTIVÉE
  checkAgeRequirement() {
    console.log('Vérification d\\' + 'exigence d\\' + 'âge désactivée');
    // DÉSACTIVÉ - La vérification d'âge est gérée dans index.html
  }

  // Déconnexion
  async logout() {
    try {
      const token = localStorage.getItem('hotmeet_token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      localStorage.removeItem('hotmeet_token');
      localStorage.removeItem('ageVerified');
      window.location.href = '/';
    }
  }

  // Affichage des erreurs
  showError(message) {
    // Créer une notification d'erreur
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.textContent = message;

    document.body.appendChild(errorDiv);

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  // Fonction utilitaire pour les requêtes API
  async apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('hotmeet_token');
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    try {
      const response = await fetch(`/api${endpoint}`, {
        ...defaultOptions,
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }
}

// Initialisation de l'application lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
  window.hotMeetApp = new HotMeetApp();
});

// Gestionnaire d'erreurs global
window.addEventListener('error', event => {
  console.error('Erreur globale:', event.error);
});

// Service Worker pour le cache (optionnel)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
