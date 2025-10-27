// HotMeet - Script pour la page d'annuaire
class DirectoryPage {
  constructor() {
    this.currentPage = 1;
    this.limit = 12;
    this.filters = {};
    this.sortBy = 'lastActive';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupLocationFilters();
    this.loadUsers();
  }

  setupEventListeners() {
    // Formulaire de filtres
    document.getElementById('filtersForm').addEventListener('submit', e => {
      e.preventDefault();
      this.applyFilters();
    });

    // Réinitialisation des filtres
    document.getElementById('resetFilters').addEventListener('click', () => {
      this.resetFilters();
    });

    // Tri
    document.getElementById('sortBy').addEventListener('change', e => {
      this.sortBy = e.target.value;
      this.loadUsers();
    });

    // Liaison pays-région
    document.getElementById('filtrePays').addEventListener('change', e => {
      console.log('Changement de pays:', e.target.value);
      this.updateRegions(e.target.value);
    });

    // Liaison région-villes
    document.getElementById('filtreRegion').addEventListener('change', e => {
      console.log('Changement de région:', e.target.value);
      this.updateCities(
        document.getElementById('filtrePays').value,
        e.target.value
      );
    });
  }

  setupLocationFilters() {
    // Initialiser les régions si un pays est déjà sélectionné
    const paysSelect = document.getElementById('filtrePays');
    const regionSelect = document.getElementById('filtreRegion');
    const villeSelect = document.getElementById('filtreVille');

    if (paysSelect.value) {
      this.updateRegions(paysSelect.value);

      // Restaurer les valeurs sauvegardées
      setTimeout(() => {
        const savedRegion = regionSelect.value;
        if (savedRegion) {
          regionSelect.value = savedRegion;
          this.updateCities(paysSelect.value, savedRegion);
        }

        const savedVille = villeSelect.value;
        if (savedVille) {
          setTimeout(() => {
            villeSelect.value = savedVille;
          }, 200);
        }
      }, 200);
    } else {
      // Si aucun pays n'est sélectionné, vider les listes
      regionSelect.innerHTML = '<option value="">Toutes les régions</option>';
      villeSelect.innerHTML = '<option value="">Toutes les villes</option>';
    }
  }

  updateCities(pays, regionValue) {
    const villeSelect = document.getElementById('filtreVille');

    console.log('updateCities appelé avec pays:', pays, 'région:', regionValue);

    // Vider la liste des villes
    villeSelect.innerHTML = '<option value="">Toutes les villes</option>';

    if (!pays) {
      console.log('Aucun pays sélectionné pour charger les villes');
      return;
    }

    // Vérifier que les données sont disponibles
    if (!window.europeanCities) {
      console.error('ERREUR: Données villes non chargées');
      return;
    }

    // Charger les villes principales du pays
    const cities = window.europeanCities[pays];
    console.log(`Villes trouvées pour ${pays}:`, cities);

    if (!cities || cities.length === 0) {
      console.warn(`Aucune ville trouvée pour le pays: ${pays}`);
      return;
    }

    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city.value;
      option.textContent = city.name;
      villeSelect.appendChild(option);
    });

    console.log(
      `✅ Villes chargées pour ${pays}: ${cities.length} villes disponibles`
    );
  }

  updateRegions(pays) {
    const regionSelect = document.getElementById('filtreRegion');
    const villeSelect = document.getElementById('filtreVille');

    console.log('updateRegions appelé avec pays:', pays);

    // Vider les listes
    regionSelect.innerHTML = '<option value="">Toutes les régions</option>';
    villeSelect.innerHTML = '<option value="">Toutes les villes</option>';

    if (!pays) {
      console.log('Aucun pays sélectionné, retour');
      return;
    }

    // Vérifier que les données sont disponibles
    if (!window.europeanRegions) {
      console.error('ERREUR: Données régions non chargées');
      return;
    }

    // Charger les régions du pays sélectionné
    const regions = window.europeanRegions[pays];
    console.log(`Régions trouvées pour ${pays}:`, regions);

    if (!regions || regions.length === 0) {
      console.warn(`Aucune région trouvée pour le pays: ${pays}`);
      return;
    }

    regions.forEach(region => {
      const option = document.createElement('option');
      option.value = region.value;
      option.textContent = region.name;
      regionSelect.appendChild(option);
    });

    console.log(
      `✅ Régions chargées pour ${pays}: ${regions.length} régions disponibles`
    );

    // Charger aussi les villes pour ce pays
    this.updateCities(pays, '');
  }

  applyFilters() {
    const formData = new FormData(document.getElementById('filtersForm'));
    this.filters = {
      ageMin: formData.get('ageMin') || '',
      ageMax: formData.get('ageMax') || '',
      sexe: formData.get('sexe') || '',
      pays: formData.get('filtrePays') || '',
      region: formData.get('filtreRegion') || '',
      ville: formData.get('filtreVille') || '',
    };
    this.currentPage = 1;
    this.loadUsers();
  }

  resetFilters() {
    document.getElementById('filtersForm').reset();
    this.filters = {};
    this.currentPage = 1;
    this.loadUsers();
  }

  async loadUsers() {
    try {
      // Construire les paramètres de requête avec tous les filtres
      const params = new URLSearchParams();

      // Ajouter les filtres non vides
      Object.keys(this.filters).forEach(key => {
        if (this.filters[key]) {
          params.append(key, this.filters[key]);
        }
      });

      // Ajouter la pagination et le tri
      params.append('page', this.currentPage);
      params.append('limit', this.limit);
      params.append('sortBy', this.sortBy);

      const response = await fetch(`/api/users?${params}`);
      const result = await response.json();

      if (result.success) {
        this.displayUsers(result.users);
        this.updatePagination(result.pagination);
        this.updateResultsCount(result.pagination.total);
      } else {
        this.showError('Erreur lors du chargement des profils');
      }
    } catch (error) {
      console.error('Erreur:', error);
      this.showError('Erreur de connexion');
    }
  }

  displayUsers(users) {
    const grid = document.getElementById('profilesGrid');

    if (users.length === 0) {
      grid.innerHTML = `
        <div class="no-results">
          <h4>Aucun profil trouvé</h4>
          <p>Essayez de modifier vos critères de recherche</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = users
      .map(
        user => `
      <div class="profile-card">
        <div class="profile-image">
          ${this.getProfileImage(user)}
          ${user.premium.isPremium ? '<span class="premium-badge">PREMIUM</span>' : ''}
          ${user.isOnline ? '<span class="online-indicator">🟢 En ligne</span>' : ''}
        </div>
        <div class="profile-info">
          <h4>${user.profile.nom}</h4>
          <p class="profile-age">${user.profile.age} ans</p>
          <p class="profile-location">${user.profile.localisation}</p>
          <p class="profile-gender">${this.getGenderLabel(user.profile.sexe)}</p>
          <div class="profile-actions">
            <button class="btn-primary" onclick="directoryPage.viewProfile('${user.id}')">
              Voir le profil
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join('');
  }

  getProfileImage(user) {
    // Vérifier si l'utilisateur a des photos
    if (user.profile.photos && user.profile.photos.length > 0) {
      // Trouver la photo de profil principale ou prendre la première
      const profilePhoto =
        user.profile.photos.find(photo => photo.isProfile) ||
        user.profile.photos[0];

      // Si la photo est floutée, afficher une version floutée
      if (profilePhoto.isBlurred) {
        return `
          <div class="blurred-photo-container">
            <img src="${profilePhoto.path}" alt="${user.profile.nom}" class="blurred-photo">
            <div class="unblur-overlay">
              <button class="unblur-btn" onclick="directoryPage.requestUnblur('${user.id}', '${profilePhoto._id}')">
                👁️ Dévoiler la photo
              </button>
            </div>
          </div>
        `;
      } else {
        return `<img src="${profilePhoto.path}" alt="${user.profile.nom}">`;
      }
    } else {
      // Photo par défaut si aucune photo n'est disponible
      return `<img src="/images/default-avatar.jpg" alt="${user.profile.nom}">`;
    }
  }

  getGenderLabel(gender) {
    const labels = {
      homme: 'Homme',
      femme: 'Femme',
      autre: 'Autre',
    };
    return labels[gender] || gender;
  }

  // Fonction pour demander le dévoilement d'une photo
  async requestUnblur(userId, photoId) {
    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch(
        `/api/uploads/photo/${photoId}/unblur-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ targetUserId: userId }),
        }
      );

      const result = await response.json();

      if (result.success) {
        this.showSuccess('Demande de dévoilement envoyée');
        // Recharger les utilisateurs pour mettre à jour l'affichage
        this.loadUsers();
      } else {
        this.showError(result.error.message || 'Erreur lors de la demande');
      }
    } catch (error) {
      console.error('Erreur demande dévoilement:', error);
      this.showError('Erreur lors de la demande de dévoilement');
    }
  }

  updatePagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    const { page, pages, total } = pagination;

    if (pages <= 1) {
      paginationDiv.innerHTML = '';
      return;
    }

    let html = '<div class="pagination-controls">';

    // Bouton précédent
    if (page > 1) {
      html += `<button class="pagination-btn" onclick="directoryPage.goToPage(${page - 1})">← Précédent</button>`;
    }

    // Pages
    for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
      html += `<button class="pagination-btn ${i === page ? 'active' : ''}" onclick="directoryPage.goToPage(${i})">${i}</button>`;
    }

    // Bouton suivant
    if (page < pages) {
      html += `<button class="pagination-btn" onclick="directoryPage.goToPage(${page + 1})">Suivant →</button>`;
    }

    html += '</div>';
    paginationDiv.innerHTML = html;
  }

  updateResultsCount(total) {
    const resultsCount = document.getElementById('resultsCount');
    const resultsDescription = document.getElementById('resultsDescription');

    resultsCount.textContent = `${total} profil${total > 1 ? 's' : ''} trouvé${total > 1 ? 's' : ''}`;

    // Mettre à jour la description avec les filtres actifs
    const activeFilters = [];
    if (this.filters.ageMin || this.filters.ageMax) {
      const ageRange = `${this.filters.ageMin || '18'}-${this.filters.ageMax || '100'}`;
      activeFilters.push(`Âge: ${ageRange} ans`);
    }
    if (this.filters.sexe) {
      const genderLabels = {
        homme: 'Homme',
        femme: 'Femme',
        autre: 'Autre',
      };
      activeFilters.push(`Genre: ${genderLabels[this.filters.sexe]}`);
    }
    if (this.filters.pays) {
      activeFilters.push(`Pays: ${this.filters.pays}`);
    }
    if (this.filters.ville) {
      activeFilters.push(`Ville: ${this.filters.ville}`);
    }

    if (activeFilters.length > 0) {
      resultsDescription.textContent = `Filtres actifs: ${activeFilters.join(', ')}`;
    } else {
      resultsDescription.textContent =
        'Aucun filtre actif - affichage de tous les profils';
    }
  }

  goToPage(page) {
    this.currentPage = page;
    this.loadUsers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  viewProfile(userId) {
    window.location.href = `/profile-view?id=${userId}`;
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      background: #f8d7da;
      color: #721c24;
      padding: 1rem;
      border-radius: 4px;
      margin: 1rem 0;
      text-align: center;
    `;

    const resultsSection = document.querySelector('.results-section');
    resultsSection.insertBefore(errorDiv, resultsSection.firstChild);

    setTimeout(() => errorDiv.remove(), 5000);
  }
}

// Initialisation avec vérification des données
document.addEventListener('DOMContentLoaded', () => {
  console.log('=== INITIALISATION ANNUAIRE - DOM CHARGÉ ===');

  // Attendre que les données soient chargées
  const initDirectory = () => {
    console.log('Vérification des données...');
    console.log('europeanRegions:', window.europeanRegions);
    console.log('europeanCities:', window.europeanCities);

    if (!window.europeanRegions || !window.europeanCities) {
      console.log('❌ Données pas encore chargées, attente 200ms...');
      setTimeout(initDirectory, 200);
      return;
    }

    console.log('✅ Données géographiques chargées avec succès');
    console.log('Pays disponibles:', Object.keys(window.europeanRegions));
    console.log(
      'Villes disponibles pour France:',
      window.europeanCities.france?.length || 0
    );

    // Vérifier que les sélecteurs existent
    const paysSelect = document.getElementById('filtrePays');
    const regionSelect = document.getElementById('filtreRegion');
    const villeSelect = document.getElementById('filtreVille');

    if (!paysSelect || !regionSelect || !villeSelect) {
      console.error('❌ ERREUR: Sélecteurs non trouvés');
      return;
    }

    console.log('✅ Sélecteurs trouvés, initialisation DirectoryPage');
    window.directoryPage = new DirectoryPage();
  };

  // Démarrer l'initialisation après un court délai
  setTimeout(initDirectory, 100);
});
