// HotMeet - JavaScript pour l'Annuaire

class DirectoryManager {
  constructor() {
    this.currentPage = 1;
    this.limit = 20;
    this.filters = {};
    this.init();
  }

  // Initialisation de l'annuaire
  init() {
    this.setupEventListeners();
    this.loadUsers();
    this.updateUIForAuth();
  }

  // Configuration des écouteurs d'événements
  setupEventListeners() {
    // Formulaire de recherche
    document.getElementById('searchForm')?.addEventListener('submit', e => {
      e.preventDefault();
      this.handleSearch();
    });

    // Réinitialisation des filtres
    document.getElementById('resetFilters')?.addEventListener('click', () => {
      this.resetFilters();
    });

    // Tri des résultats
    document.getElementById('sortBy')?.addEventListener('change', () => {
      this.loadUsers();
    });
  }

  // Gestion de la recherche
  handleSearch() {
    const formData = new FormData(document.getElementById('searchForm'));

    this.filters = {
      ageMin: formData.get('ageMin') || '',
      ageMax: formData.get('ageMax') || '',
      sexe: formData.get('sexe') || 'tous',
      orientation: formData.get('orientation') || 'tous',
      country: formData.get('country') || 'tous',
      region: formData.get('region') || '',
    };

    this.currentPage = 1;
    this.loadUsers();
  }

  // Réinitialisation des filtres
  resetFilters() {
    document.getElementById('searchForm').reset();
    this.filters = {};
    this.currentPage = 1;
    this.loadUsers();
  }

  // Chargement des utilisateurs
  async loadUsers() {
    const usersGrid = document.getElementById('usersGrid');
    if (!usersGrid) {
      return;
    }

    usersGrid.innerHTML =
      '<div class="loading">Chargement des membres...</div>';

    try {
      // Construire les paramètres de requête
      const queryParams = new URLSearchParams();

      // Ajouter les filtres
      if (this.filters.ageMin) {
        queryParams.append('ageMin', this.filters.ageMin);
      }
      if (this.filters.ageMax) {
        queryParams.append('ageMax', this.filters.ageMax);
      }
      if (this.filters.sexe && this.filters.sexe !== 'tous') {
        queryParams.append('sexe', this.filters.sexe);
      }
      if (this.filters.region) {
        queryParams.append('localisation', this.filters.region);
      }

      // Ajouter la pagination
      queryParams.append('page', this.currentPage);
      queryParams.append('limit', this.limit);

      // Faire une requête à l'API réelle
      const response = await fetch(`/api/users?${queryParams.toString()}`);
      const data = await response.json();

      if (data.success) {
        this.displayUsers(data.users);
        this.updatePagination(data.pagination);
        this.updateResultsCount(data.pagination.total);
      } else {
        throw new Error(
          data.error?.message || 'Erreur lors du chargement des utilisateurs'
        );
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      usersGrid.innerHTML = `<div class="error">Erreur lors du chargement des utilisateurs: ${error.message}</div>`;
    }
  }

  // Obtenir le nom du pays
  getCountryName(countryCode) {
    const countries = {
      france: 'France',
      suisse: 'Suisse',
      belgique: 'Belgique',
      canada: 'Canada',
      espagne: 'Espagne',
      italie: 'Italie',
      allemagne: 'Allemagne',
      'royaume-uni': 'Royaume-Uni',
      'etats-unis': 'États-Unis',
      bresil: 'Brésil',
      japon: 'Japon',
      australie: 'Australie',
    };
    return countries[countryCode] || countryCode;
  }

  // Obtenir le nom de l'orientation sexuelle
  getOrientationName(orientationCode) {
    const orientations = {
      hetero: 'Hétéro',
      gay: 'Gay',
      lesbienne: 'Lesbienne',
      bi: 'Bisexuel(le)',
      trans: 'Transgenre',
      queer: 'Queer',
      autre: 'Autre',
    };
    return orientations[orientationCode] || orientationCode;
  }

  // Affichage des utilisateurs
  displayUsers(users) {
    const usersGrid = document.getElementById('usersGrid');

    if (users.length === 0) {
      usersGrid.innerHTML =
        '<div class="no-results">Aucun membre trouvé avec ces critères.</div>';
      return;
    }

    const usersHTML = users.map(user => this.createUserCard(user)).join('');
    usersGrid.innerHTML = usersHTML;

    // Ajouter les écouteurs d'événements pour les boutons de message
    this.setupMessageButtons();
  }

  // Création d'une carte utilisateur avec nouveau design
  createUserCard(user) {
    const defaultAvatar = this.getDefaultAvatar(user.profile.sexe);
    const mainPhoto = user.profile.photos?.[0]?.path || defaultAvatar;
    const isOnline = new Date() - new Date(user.lastActive) < 15 * 60 * 1000;
    const premiumBadge = user.premium.isPremium
      ? '<span class="premium-badge">PREMIUM</span>'
      : '';
    const lastActive = this.formatLastActive(user.lastActive);

    // Nettoyer la description pour éviter les duplications
    let cleanDescription = user.profile.bio || '';
    // Supprimer le nom du début de la description s'il y est répété
    if (cleanDescription.startsWith(user.profile.nom)) {
      cleanDescription = cleanDescription
        .substring(user.profile.nom.length)
        .trim();
      // Supprimer les virgules ou points en début de phrase
      if (
        cleanDescription.startsWith(',') ||
        cleanDescription.startsWith('.') ||
        cleanDescription.startsWith('-')
      ) {
        cleanDescription = cleanDescription.substring(1).trim();
      }
    }

    const shortDescription =
      cleanDescription.length > 100
        ? cleanDescription.substring(0, 100) + '...'
        : cleanDescription;

    const readMoreButton =
      cleanDescription.length > 100
        ? '<button class="read-more-btn">Lire la suite</button>'
        : '';

    return `
      <div class="user-card" data-user-id="${user.id}">
        <div class="user-card-header">
          <div class="user-photo">
            <img src="${mainPhoto}" alt="${user.profile.nom}" onerror="this.src='${defaultAvatar}'">
            <div class="user-status ${isOnline ? 'online' : 'offline'}"></div>
          </div>
          <div class="user-info">
            <h3 class="user-name">${user.profile.nom}</h3>
            <div class="user-details">
              <span class="user-age">${user.profile.age} ans</span>
              <span class="user-gender">${this.getGenderDisplayName(user.profile.sexe)}</span>
              ${premiumBadge}
            </div>
            <p class="user-location">📍 ${user.profile.localisation}</p>
            <p class="user-activity">${lastActive}</p>
          </div>
        </div>
        <div class="user-description">
          <p class="description-text">${shortDescription}</p>
          ${readMoreButton}
        </div>
        <div class="user-card-actions">
          <button class="btn-secondary view-profile" data-user-id="${user.id}">Voir le profil</button>
          <button class="btn-primary send-message" data-user-id="${user.id}" ${!window.hotMeetApp?.currentUser?.premium?.isPremium ? 'disabled' : ''}>
            ${window.hotMeetApp?.currentUser?.premium?.isPremium ? 'Envoyer un message' : 'Premium requis'}
          </button>
        </div>
      </div>
    `;
  }

  // Obtenir l'avatar par défaut selon le genre
  getDefaultAvatar(gender) {
    const avatars = {
      homme:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiMyMTk2RjIiLz4KPHN2Zz4KPHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDI4QzI0LjQxODMgMjggMjggMjQuNDE4MyAyOCAyMEMyOCAxNS41ODE3IDI0LjQxODMgMTIgMjAgMTJDMTUuNTgxNyAxMiAxMiAxNS41ODE3IDEyIDIwQzEyIDI0LjQxODMgMTUuNTgxNyAyOCAyMCAyOFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yNiAxNkMyNiAxOC4yMDkxIDI0LjIwOTEgMjAgMjIgMjBDMTkuNzkwOSAyMCAxOCAxOC4yMDkxIDE4IDE2QzE4IDEzLjc5MDkgMTkuNzkwOSAxMiAyMiAxMkMyNC4yMDkxIDEyIDI2IDEzLjc5MDkgMjYgMTZaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+',
      femme:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiNFOjE2MyIvPgo8c3ZnPgo8c3ZnIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMjAgMjhDMjQuNDE4MyAyOCAyOCAyNC40MTgzIDI4IDIwQzI4IDE1LjU4MTcgMjQuNDE4MyAxMiAyMCAxMkMxNS41ODE3IDEyIDEyIDE1LjU4MTcgMTIgMjBDMTIgMjQuNDE4MyAxNS41ODE3IDI4IDIwIDI4WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTI2IDE2QzI2IDE4LjIwOTEgMjQuMjA5MSAyMCAyMiAyMEMxOS43OTA5IDIwIDE4IDE4LjIwOTEgMTggMTZDMTggMTMuNzkwOSAxOS43OTA5IDEyIDIyIDEyQzI0LjIwOTEgMTIgMjYgMTMuNzkwOSAyNiAxNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xOCAzMkwyMiAzMkwyMiAyOEwxOCAyOEwxOCAzMloiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4=',
      autre:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM5QzI3QjAiLz4KPHN2Zz4KPHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDI4QzI0LjQxODMgMjggMjggMjQuNDE4MyAyOCAyMEMyOCAxNS41ODE3IDI0LjQxODMgMTIgMjAgMTJDMTUuNTgxNyAxMiAxMiAxNS41ODE3IDEyIDIwQzEyIDI0LjQxODMgMTUuNTgxcyAyOCAyMCAyOFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yNiAxNkMyNiAxOC4yMDkxIDI0LjIwOTEgMjAgMjIgMjBDMTkuNzkwOSAyMCAxOCAxOC4yMDkxIDE4IDE2QzE4IDEzLjc5MDkgMTkuNzkwOSAxMiAyMiAxMkMyNC4yMDkxIDEyIDI2IDEzLjc5MDkgMjYgMTZaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+',
    };
    return avatars[gender] || avatars.autre;
  }

  // Obtenir le nom d'affichage du genre
  getGenderDisplayName(gender) {
    const genders = {
      homme: 'Homme',
      femme: 'Femme',
      autre: 'Autre',
    };
    return genders[gender] || gender;
  }

  // Formatage de la dernière activité
  formatLastActive(lastActive) {
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffMs = now - lastActiveDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'En ligne maintenant';
    }
    if (diffMins < 60) {
      return 'En ligne il y a ' + diffMins + ' min';
    }
    if (diffHours < 24) {
      return 'En ligne il y a ' + diffHours + ' h';
    }
    if (diffDays < 7) {
      return 'En ligne il y a ' + diffDays + ' j';
    }
    return 'Dernière connexion: ' + lastActiveDate.toLocaleDateString('fr-FR');
  }

  // Configuration des boutons de message
  setupMessageButtons() {
    document.querySelectorAll('.send-message').forEach(button => {
      button.addEventListener('click', e => {
        const userId = e.target.dataset.userId;
        this.sendMessage(userId);
      });
    });

    document.querySelectorAll('.view-profile').forEach(button => {
      button.addEventListener('click', e => {
        const userId = e.target.dataset.userId;
        this.viewUserProfile(userId);
      });
    });

    // Gestion des boutons "Lire la suite"
    document.querySelectorAll('.read-more-btn').forEach(button => {
      button.addEventListener('click', e => {
        const descriptionText =
          e.target.parentElement.querySelector('.description-text');
        const fullText =
          descriptionText.getAttribute('data-full-text') ||
          descriptionText.textContent;
        descriptionText.textContent = fullText;
        e.target.style.display = 'none';
      });
    });
  }

  // Envoi d'un message
  async sendMessage(userId) {
    if (!window.hotMeetApp?.currentUser) {
      alert('Veuillez vous connecter pour envoyer un message');
      window.location.href = '/auth';
      return;
    }

    if (!window.hotMeetApp.currentUser.premium.isPremium) {
      alert('Vous devez être membre premium pour envoyer des messages');
      window.location.href = '/premium';
      return;
    }

    const message = prompt('Votre message:');
    if (!message || message.trim() === '') {
      return;
    }

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('hotmeet_token'),
        },
        body: JSON.stringify({
          toUserId: userId,
          content: message.trim(),
          provenance: 'annuaire',
        }),
      });

      if (response.ok) {
        alert('Message envoyé avec succès!');
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || 'Erreur lors de l\\' + 'envoi du message'
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\\' + 'envoi du message:', error);
      alert('Erreur: ' + error.message);
    }
  }

  // Affichage du profil utilisateur
  viewUserProfile(userId) {
    // Ouvrir une fenêtre modale avec les détails du profil
    this.showProfileModal(userId);
  }

  // Afficher une modale avec les détails du profil
  async showProfileModal(userId) {
    try {
      // Sécuriser l'ID utilisateur pour éviter [object Object]
      const safeUserId = String(userId || '').replace(/[^a-zA-Z0-9]/g, '');
      if (!safeUserId) {
        console.error('ID utilisateur invalide:', userId);
        return null;
      }

      const response = await fetch(`/api/users/${safeUserId}`);
      const data = await response.json();

      if (!data.success) {
        alert('Utilisateur non trouvé');
        return;
      }

      const user = data.user;
      const modalContent = this.createProfileModalContent(user);
      this.displayModal(modalContent);
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      alert('Erreur lors du chargement du profil');
    }
  }

  // Créer le contenu de la modale de profil
  createProfileModalContent(user) {
    const mainPhoto =
      user.profile.photos?.[0]?.path ||
      this.getDefaultAvatar(user.profile.sexe);
    const isOnline =
      new Date() - new Date(user.stats.lastActive) < 15 * 60 * 1000;

    const bioSection = user.profile.bio
      ? `
      <div class="profile-bio">
        <h4>À propos</h4>
        <p>${user.profile.bio}</p>
      </div>
    `
      : '';

    const practicesSection =
      user.profile.pratiques && user.profile.pratiques.length > 0
        ? `
      <div class="profile-practices">
        <h4>Pratiques</h4>
        <div class="practices-list">
          ${user.profile.pratiques.map(practice => `<span class="practice-tag">${practice}</span>`).join('')}
        </div>
      </div>
    `
        : '';

    return `
      <div class="profile-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Profil de ${user.profile.nom}</h2>
            <button class="close-modal">×</button>
          </div>
          
          <div class="modal-body">
            <div class="profile-photo-section">
              <img src="${mainPhoto}" alt="${user.profile.nom}" onerror="this.src='${this.getDefaultAvatar(user.profile.sexe)}'">
              <div class="profile-status ${isOnline ? 'online' : 'offline'}">${isOnline ? '🟢 En ligne' : '⚫ Hors ligne'}</div>
            </div>
            
            <div class="profile-info">
              <h3>${user.profile.nom}, ${user.profile.age} ans</h3>
              <p class="profile-gender">${this.getGenderDisplayName(user.profile.sexe)}</p>
              <p class="profile-location">📍 ${user.profile.localisation}</p>
              
              ${bioSection}
              ${practicesSection}
            </div>
          </div>
          
          <div class="modal-actions">
            <button class="btn-primary send-message-modal" data-user-id="${user.id}">
              Envoyer un message
            </button>
            <button class="btn-secondary close-modal">Fermer</button>
          </div>
        </div>
      </div>
    `;
  }

  // Afficher la modale
  displayModal(content) {
    const modal = document.createElement('div');
    modal.innerHTML = content;
    document.body.appendChild(modal);

    // Attacher les événements
    modal.querySelectorAll('.close-modal').forEach(button => {
      button.addEventListener('click', () => {
        modal.remove();
      });
    });

    modal
      .querySelector('.send-message-modal')
      ?.addEventListener('click', () => {
        const userId = modal.querySelector('.send-message-modal').dataset
          .userId;
        modal.remove();
        this.sendMessage(userId);
      });

    // Fermer la modale en cliquant à l'extérieur
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Fermer avec la touche Échap
    const handleEscape = e => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  // Mise à jour de la pagination
  updatePagination(pagination) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) {
      return;
    }

    if (pagination.pages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let paginationHTML = '<div class="pagination-controls">';

    // Bouton précédent
    if (pagination.page > 1) {
      paginationHTML +=
        '<button class="pagination-btn" data-page="' +
        (pagination.page - 1) +
        '">← Précédent</button>';
    }

    // Pages
    for (let i = 1; i <= pagination.pages; i++) {
      if (i === pagination.page) {
        paginationHTML += '<span class="pagination-current">' + i + '</span>';
      } else if (i >= pagination.page - 2 && i <= pagination.page + 2) {
        paginationHTML +=
          '<button class="pagination-btn" data-page="' +
          i +
          '">' +
          i +
          '</button>';
      }
    }

    // Bouton suivant
    if (pagination.page < pagination.pages) {
      paginationHTML +=
        '<button class="pagination-btn" data-page="' +
        (pagination.page + 1) +
        '">Suivant →</button>';
    }

    paginationHTML += '</div>';

    paginationContainer.innerHTML = paginationHTML;

    // Ajouter les écouteurs d'événements pour la pagination
    this.setupPaginationEvents();
  }

  // Configuration des événements de pagination
  setupPaginationEvents() {
    document.querySelectorAll('.pagination-btn').forEach(button => {
      button.addEventListener('click', e => {
        this.currentPage = parseInt(e.target.dataset.page);
        this.loadUsers();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // Mise à jour du compteur de résultats
  updateResultsCount(total) {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
      resultsCount.querySelector('.count').textContent = total;
    }
  }

  // Mise à jour de l'UI en fonction de l'authentification
  updateUIForAuth() {
    if (window.hotMeetApp?.currentUser) {
      // Cacher les boutons de connexion/inscription si l'utilisateur est connecté
      const loginBtn = document.getElementById('loginBtn');
      const registerBtn = document.getElementById('registerBtn');
      if (loginBtn && registerBtn) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
      }
    }
  }
}

// Initialisation de l'annuaire lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
  window.directoryManager = new DirectoryManager();
});
