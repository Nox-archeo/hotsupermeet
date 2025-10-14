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

    // Pagination (sera configurée dynamiquement)
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
      // Simuler des données de démonstration (faux profils)
      const demoUsers = this.generateDemoUsers();

      // Filtrer les utilisateurs selon les critères
      const filteredUsers = this.filterUsers(demoUsers, this.filters);
      const paginatedUsers = this.paginateUsers(
        filteredUsers,
        this.currentPage,
        this.limit
      );

      // Simuler une réponse API
      const data = {
        success: true,
        users: paginatedUsers,
        pagination: {
          page: this.currentPage,
          limit: this.limit,
          total: filteredUsers.length,
          pages: Math.ceil(filteredUsers.length / this.limit),
        },
      };

      this.displayUsers(data.users);
      this.updatePagination(data.pagination);
      this.updateResultsCount(data.pagination.total);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      usersGrid.innerHTML = `<div class="error">Erreur: ${error.message}</div>`;
    }
  }

  // Générer des utilisateurs de démonstration
  generateDemoUsers() {
    // Profils prédéfinis pour tester le design
    const predefinedUsers = [
      {
        id: 1,
        profile: {
          nom: 'Sophie',
          age: 28,
          sexe: 'femme',
          orientation: 'hetero',
          localisation: 'Paris, France',
          photos: [],
          description: 'Élégante et sensuelle, à la recherche de connexions profondes. Passionnée de voyage et de cuisine.',
        },
        premium: { isPremium: true },
        isOnline: true,
        lastActive: new Date().toISOString(),
        country: 'france',
        region: 'Paris',
        orientation: 'hetero',
      },
      {
        id: 2,
        profile: {
          nom: 'Thomas',
          age: 32,
          sexe: 'homme',
          orientation: 'bi',
          localisation: 'Genève, Suisse',
          photos: [],
          description: 'Dynamique cherchant des rencontres authentiques. Gentleman respectueux à la recherche de moments complices.',
        },
        premium: { isPremium: false },
        isOnline: false,
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        country: 'suisse',
        region: 'Genève',
        orientation: 'bi',
      },
      {
        id: 3,
        profile: {
          nom: 'Alex',
          age: 25,
          sexe: 'autre',
          orientation: 'queer',
          localisation: 'Berlin, Allemagne',
          photos: [],
          description: 'Ouvert et authentique, cherchant des rencontres basées sur le respect mutuel. Personne chaleureuse valorisant la complicité.',
        },
        premium: { isPremium: true },
        isOnline: true,
        lastActive: new Date().toISOString(),
        country: 'allemagne',
        region: 'Berlin',
        orientation: 'queer',
      },
      {
        id: 4,
        profile: {
          nom: 'Laura',
          age: 35,
          sexe: 'femme',
          orientation: 'lesbienne',
          localisation: 'Montréal, Canada',
          photos: [],
          description: 'Indépendante appréciant les rencontres raffinées. Passionnée de musique et de nature.',
        },
        premium: { isPremium: true },
        isOnline: true,
        lastActive: new Date().toISOString(),
        country: 'canada',
        region: 'Montréal',
        orientation: 'lesbienne',
      },
      {
        id: 5,
        profile: {
          nom: 'David',
          age: 40,
          sexe: 'homme',
          orientation: 'gay',
          localisation: 'Madrid, Espagne',
          photos: [],
          description: 'Passionné et ouvert d\'esprit. À la recherche de moments complices et authentiques.',
        },
        premium: { isPremium: false },
        isOnline: false,
        lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        country: 'espagne',
        region: 'Madrid',
        orientation: 'gay',
      },
      {
        id: 6,
        profile: {
          nom: 'Chloé',
          age: 22,
          sexe: 'femme',
          orientation: 'hetero',
          localisation: 'Lyon, France',
          photos: [],
          description: 'Jeune femme énergique cherchant à rencontrer des personnes intéressantes. Amatrice de sport et de cinéma.',
        },
        premium: { isPremium: true },
        isOnline: true,
        lastActive: new Date().toISOString(),
        country: 'france',
        region: 'Lyon',
        orientation: 'hetero',
      }
    ];

    return predefinedUsers;
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

  // Générer une description aléatoire
  generateDescription(gender, age) {
    const hobbies = [
      'voyage',
      'cuisine',
      'sport',
      'musique',
      'cinéma',
      'lecture',
      'art',
      'nature',
    ];
    const descriptions = {
      homme: [
        'Passionné et ouvert d\\' + 'esprit.',
        'Dynamique cherchant des rencontres authentiques.',
        'Gentleman respectueux à la recherche de moments complices.',
      ],
      femme: [
        'Élégante et sensuelle.',
        'À la recherche de connexions profondes.',
        'Indépendante appréciant les rencontres raffinées.',
      ],
      autre: [
        'Ouverte et authentique.',
        'Cherchant des rencontres basées sur le respect mutuel.',
        'Personne chaleureuse valorisant la complicité.',
      ],
    };

    const baseDesc =
      descriptions[gender][
        Math.floor(Math.random() * descriptions[gender].length)
      ];
    const hobby = hobbies[Math.floor(Math.random() * hobbies.length)];

    return `${baseDesc} Passionné(e) de ${hobby}.`;
  }

  // Filtrer les utilisateurs selon les critères
  filterUsers(users, filters) {
    return users.filter(user => {
      // Filtre par âge
      if (filters.ageMin && user.profile.age < parseInt(filters.ageMin)) {
        return false;
      }
      if (filters.ageMax && user.profile.age > parseInt(filters.ageMax)) {
        return false;
      }

      // Filtre par genre
      if (
        filters.sexe &&
        filters.sexe !== 'tous' &&
        user.profile.sexe !== filters.sexe
      ) {
        return false;
      }

      // Filtre par orientation sexuelle
      if (
        filters.orientation &&
        filters.orientation !== 'tous' &&
        user.orientation !== filters.orientation
      ) {
        return false;
      }

      // Filtre par pays
      if (
        filters.country &&
        filters.country !== 'tous' &&
        user.country !== filters.country
      ) {
        return false;
      }

      // Filtre par région
      if (
        filters.region &&
        !user.region.toLowerCase().includes(filters.region.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }

  // Paginer les utilisateurs
  paginateUsers(users, page, limit) {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return users.slice(startIndex, endIndex);
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
    const mainPhoto = user.profile.photos?.[0] || defaultAvatar;
    const isOnline = user.isOnline ? 'online' : 'offline';
    const premiumBadge = user.premium.isPremium
      ? '<span class="premium-badge">PREMIUM</span>'
      : '';
    const lastActive = this.formatLastActive(user.lastActive);
    const orientationName = this.getOrientationName(user.orientation);

    // Nettoyer la description pour éviter les duplications
    let cleanDescription = user.profile.description;
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

    return `
            <div class="user-card" data-user-id="${user.id}">
                <div class="user-card-header">
                    <div class="user-photo">
                        <img src="${mainPhoto}" alt="${user.profile.nom}" onerror="this.src='${defaultAvatar}'">
                        <div class="user-status ${isOnline}"></div>
                    </div>
                    <div class="user-info">
                        <h3 class="user-name">${user.profile.nom}</h3>
                        <div class="user-details">
                            <span class="user-age">${user.profile.age} ans</span>
                            <span class="user-gender">${this.getGenderDisplayName(user.profile.sexe)}</span>
                            <span class="user-orientation">${orientationName}</span>
                            ${premiumBadge}
                        </div>
                        <p class="user-location">📍 ${user.profile.localisation}</p>
                        <p class="user-activity">${lastActive}</p>
                    </div>
                </div>
                <div class="user-description">
                    <p class="description-text">${shortDescription}</p>
                    ${
                      cleanDescription.length > 100
                        ? '<button class="read-more-btn" onclick="this.parentElement.querySelector(\\'.description-text\\').textContent = \\'' +
                          cleanDescription.replace(/'/g, '\\\\\\'') +
                          '\\'; this.style.display=\\'none\\'">Lire la suite</button>'
                        : ''
                    }
                </div>
                <div class="user-card-actions">
                    <button class="btn-secondary view-profile" data-user-id="${user.id}">Voir le profil</button>
                    <button class="btn-primary send-message" data-user-id="${user.id}" ${!window.coolMeetApp?.currentUser?.premium?.isPremium ? 'disabled' : ''}>
                        ${window.coolMeetApp?.currentUser?.premium?.isPremium ? 'Envoyer un message' : 'Premium requis'}
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
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM5QzI3QjAiLz4KPHN2Zz4KPHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDI4QzI0LjQxODMgMjggMjggMjQuNDE4MyAyOCAyMEMyOCAxNS41ODE3IDI0LjQxODMgMTIgMjAgMTJDMTUuNTgxNyAxMiAxMiAxNS41ODE3IDEyIDIwQzEyIDI0LjQxODMgMTUuNTgxNyAyOCAyMCAyOFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yNiAxNkMyNiAxOC4yMDkxIDI0LjIwOTEgMjAgMjIgMjBDMTkuNzkwOSAyMCAxOCAxOC4yMDkxIDE4IDE2QzE4IDEzLjc5MDkgMTkuNzkwOSAxMiAyMiAxMkMyNC4yMDkxIDEyIDI2IDEzLjc5MDkgMjYgMTZaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+',
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
      return `En ligne il y a ${diffMins} min`;
    }
    if (diffHours < 24) {
      return `En ligne il y a ${diffHours} h`;
    }
    if (diffDays < 7) {
      return `En ligne il y a ${diffDays} j`;
    }
    return `Dernière connexion: ${lastActiveDate.toLocaleDateString('fr-FR')}`;
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
  }

  // Envoi d'un message
  async sendMessage(userId) {
    if (!window.coolMeetApp?.currentUser) {
      alert('Veuillez vous connecter pour envoyer un message');
      window.location.href = '/auth';
      return;
    }

    if (!window.coolMeetApp.currentUser.premium.isPremium) {
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
          Authorization: `Bearer ${localStorage.getItem('hotmeet_token')}`,
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
  showProfileModal(userId) {
    // Trouver l'utilisateur dans la liste actuelle
    const user = this.findUserById(userId);
    if (!user) {
      alert('Utilisateur non trouvé');
      return;
    }

    // Créer le contenu de la modale
    const modalContent = this.createProfileModalContent(user);

    // Afficher la modale
    this.displayModal(modalContent, user);
  }

  // Trouver un utilisateur par son ID
  findUserById(userId) {
    // Cette fonction devrait normalement faire une requête API
    // Pour l'instant, nous allons simuler la recherche
    const demoUsers = this.generateDemoUsers();
    return demoUsers.find(user => user.id === userId);
  }

  // Créer le contenu de la modale de profil
  createProfileModalContent(user) {
    const mainPhoto =
      user.profile.photos?.[0] || '/images/avatar-placeholder.png';
    const orientationName = this.getOrientationName(user.orientation);
    const countryName = this.getCountryName(user.country);

    return `
            <div class="profile-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
            ">
                <div class="modal-content" style="
                    background: white;
                    padding: 2rem;
                    border-radius: 10px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h2 style="margin: 0;">Profil de ${user.profile.nom}</h2>
                        <button onclick="this.closest('.profile-modal').remove()" style="
                            background: none;
                            border: none;
                            font-size: 1.5rem;
                            cursor: pointer;
                        ">×</button>
                    </div>
                    
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <img src="${mainPhoto}" alt="${user.profile.nom}" style="
                            width: 150px;
                            height: 150px;
                            border-radius: 50%;
                            object-fit: cover;
                            margin-bottom: 1rem;
                        " onerror="this.src='/images/avatar-placeholder.png'">
                        
                        <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem;">
                            ${user.profile.nom}, ${user.profile.age} ans
                        </div>
                        <div style="color: #666; margin-bottom: 0.5rem;">
                            ${user.profile.sexe.charAt(0).toUpperCase() + user.profile.sexe.slice(1)} • ${orientationName}
                        </div>
                        <div style="color: #666; margin-bottom: 1rem;">
                            📍 ${user.profile.localisation}
                        </div>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 1rem; border-radius: 5px; margin-bottom: 1.5rem;">
                        <h3 style="margin-top: 0;">À propos</h3>
                        <p style="margin: 0; line-height: 1.5;">${user.profile.description}</p>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div style="text-align: center;">
                            <div style="font-weight: bold; color: #666;">Pays</div>
                            <div>${countryName}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-weight: bold; color: #666;">Région</div>
                            <div>${user.region}</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1.5rem; text-align: center;">
                        <button class="btn-primary" onclick="
                            alert('Fonctionnalité de messagerie en cours de développement');
                            this.closest('.profile-modal').remove();
                        " style="margin-right: 0.5rem;">
                            Envoyer un message
                        </button>
                        <button class="btn-secondary" onclick="this.closest('.profile-modal').remove()">
                            Fermer
                        </button>
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

    // Attacher les événements aux boutons après l'insertion du HTML
    setTimeout(() => {
      // Bouton de fermeture (×)
      const closeButton = modal.querySelector('button[onclick*="closest"]');
      if (closeButton) {
        closeButton.onclick = function () {
          modal.remove();
        };
      }

      // Bouton "Envoyer un message"
      const messageButton = modal.querySelector('.btn-primary');
      if (messageButton) {
        messageButton.onclick = function () {
          // Ouvrir une modale de demande de chat
          this.openChatRequestModal(user);
          modal.remove();
        };
      }

      // Bouton "Fermer"
      const closeModalButton = modal.querySelector('.btn-secondary');
      if (closeModalButton) {
        closeModalButton.onclick = function () {
          modal.remove();
        };
      }
    }, 100);

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

  // Ouvrir une modale de demande de chat
  openChatRequestModal(user) {
    const modalContent = this.createChatRequestModalContent(user);
    this.displayModal(modalContent);
  }

  // Créer le contenu de la modale de demande de chat
  createChatRequestModalContent(user) {
    const mainPhoto =
      user.profile.photos?.[0] || '/images/avatar-placeholder.png';

    return `
            <div class="chat-request-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
            ">
                <div class="modal-content" style="
                    background: white;
                    padding: 2rem;
                    border-radius: 10px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h2 style="margin: 0;">Demander à chatter avec ${user.profile.nom}</h2>
                        <button onclick="this.closest('.chat-request-modal').remove()" style="
                            background: none;
                            border: none;
                            font-size: 1.5rem;
                            cursor: pointer;
                        ">×</button>
                    </div>
                    
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <img src="${mainPhoto}" alt="${user.profile.nom}" style="
                            width: 100px;
                            height: 100px;
                            border-radius: 50%;
                            object-fit: cover;
                            margin-bottom: 1rem;
                        " onerror="this.src='/images/avatar-placeholder.png'">
                        
                        <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">
                            ${user.profile.nom}, ${user.profile.age} ans
                        </div>
                        <div style="color: #666; margin-bottom: 1rem;">
                            ${user.profile.sexe.charAt(0).toUpperCase() + user.profile.sexe.slice(1)} • ${this.getOrientationName(user.orientation)}
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label for="chatMessage" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                            Votre message d'introduction :
                        </label>
                        <textarea id="chatMessage" placeholder="Présentez-vous brièvement..." style="
                            width: 100%;
                            height: 100px;
                            padding: 0.75rem;
                            border: 2px solid #ddd;
                            border-radius: 5px;
                            font-family: inherit;
                            resize: vertical;
                        "></textarea>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div style="text-align: center;">
                            <div style="font-weight: bold; color: #666;">Statut</div>
                            <div>${user.isOnline ? '🟢 En ligne' : '⚫ Hors ligne'}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-weight: bold; color: #666;">Dernière activité</div>
                            <div>${this.formatLastActive(user.lastActive)}</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1.5rem; text-align: center;">
                        <button class="btn-primary" id="sendRequestBtn" style="margin-right: 0.5rem;">
                            Envoyer la demande
                        </button>
                        <button class="btn-secondary" id="cancelRequestBtn">
                            Annuler
                        </button>
                    </div>
                </div>
            </div>
        `;
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
      paginationHTML += `<button class="pagination-btn" data-page="${pagination.page - 1}">← Précédent</button>`;
    }

    // Pages
    for (let i = 1; i <= pagination.pages; i++) {
      if (i === pagination.page) {
        paginationHTML += `<span class="pagination-current">${i}</span>`;
      } else if (i >= pagination.page - 2 && i <= pagination.page + 2) {
        paginationHTML += `<button class="pagination-btn" data-page="${i}">${i}</button>`;
      }
    }

    // Bouton suivant
    if (pagination.page < pagination.pages) {
      paginationHTML += `<button class="pagination-btn" data-page="${pagination.page + 1}">Suivant →</button>`;
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
    if (window.coolMeetApp?.currentUser) {
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
