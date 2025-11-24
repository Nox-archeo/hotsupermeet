// Variables globales
let adPhotoFiles = [];

// =================================
// GESTION DES PHOTOS D'ANNONCES
// =================================

function initPhotoUpload() {
  const uploadBtn = document.getElementById('upload-ad-photos-btn');
  const fileInput = document.getElementById('ad-photos');

  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', handleAdPhotoUpload);
  }
}

async function handleAdPhotoUpload(event) {
  const files = event.target.files;

  if (!files.length) return;

  // Validation
  if (files.length > 5) {
    showMessage('Maximum 5 photos autorisées', 'error');
    event.target.value = '';
    return;
  }

  for (let file of files) {
    if (!file.type.startsWith('image/')) {
      showMessage('Seules les images sont autorisées', 'error');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage('Fichier trop volumineux (max 5MB)', 'error');
      event.target.value = '';
      return;
    }
  }

  try {
    showMessage('Upload des photos en cours...', 'info');

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('photos', files[i]);
    }

    const token = localStorage.getItem('hotmeet_token');
    if (!token) {
      showMessage('Vous devez être connecté pour uploader des photos', 'error');
      return;
    }

    const response = await fetch('/api/uploads/ad-photos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      showMessage(result.message, 'success');

      // Ajouter les photos uploadées à notre liste
      adPhotoFiles = adPhotoFiles.concat(result.photos);

      // Mettre à jour l'affichage
      updatePhotoPreview();

      // Reset l'input
      event.target.value = '';
    } else {
      showMessage(result.error.message, 'error');
    }
  } catch (error) {
    console.error('Erreur upload:', error);
    showMessage("Erreur lors de l'upload des photos", 'error');
  }
}

function updatePhotoPreview() {
  const preview = document.getElementById('ad-photos-preview');
  if (!preview) return;

  preview.innerHTML = '';

  adPhotoFiles.forEach((photo, index) => {
    const photoDiv = document.createElement('div');
    photoDiv.className = 'photo-preview-item';
    photoDiv.innerHTML = `
      <img src="${photo.url}" alt="Photo ${index + 1}" />
      <button type="button" onclick="removeAdPhoto(${index})" class="remove-photo-btn">
        ×
      </button>
    `;
    preview.appendChild(photoDiv);
  });
}

function removeAdPhoto(index) {
  adPhotoFiles.splice(index, 1);
  updatePhotoPreview();
}

// Rendre la fonction globale
window.removeAdPhoto = removeAdPhoto;

function showMessage(message, type) {
  // Créer ou récupérer la zone de message
  let messageDiv = document.getElementById('message-zone');
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.id = 'message-zone';
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      max-width: 300px;
    `;
    document.body.appendChild(messageDiv);
  }

  // Créer le message
  const msgElement = document.createElement('div');
  msgElement.style.cssText = `
    padding: 12px 16px;
    margin-bottom: 10px;
    border-radius: 4px;
    color: white;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    background-color: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
  `;
  msgElement.textContent = message;

  messageDiv.appendChild(msgElement);

  // Supprimer après 5 secondes
  setTimeout(() => {
    if (msgElement.parentNode) {
      msgElement.parentNode.removeChild(msgElement);
    }
  }, 5000);
}

// =================================
// NAVIGATION ENTRE LES SECTIONS - GLOBALES !
// =================================

function showAdsMenu() {
  console.log('🏠 Retour au menu principal');
  document.getElementById('ads-menu').style.display = 'block';
  document.getElementById('ads-create-section').style.display = 'none';
  document.getElementById('ads-view-section').style.display = 'none';
}

function showCreateSection() {
  console.log('🟢 Affichage section création');

  const adsMenu = document.getElementById('ads-menu');
  const createSection = document.getElementById('ads-create-section');
  const viewSection = document.getElementById('ads-view-section');

  if (!adsMenu || !createSection || !viewSection) {
    console.error('❌ ERREUR: Éléments DOM manquants !');
    return;
  }

  adsMenu.style.display = 'none';
  createSection.style.display = 'block';
  viewSection.style.display = 'none';
  console.log('✅ Section création affichée');
}

function showViewSection() {
  console.log('🟢 Affichage section consultation');

  const adsMenu = document.getElementById('ads-menu');
  const createSection = document.getElementById('ads-create-section');
  const viewSection = document.getElementById('ads-view-section');

  if (!adsMenu || !createSection || !viewSection) {
    console.error('❌ ERREUR: Éléments DOM manquants !');
    return;
  }

  adsMenu.style.display = 'none';
  createSection.style.display = 'none';
  viewSection.style.display = 'block';
  loadAds();
  console.log('✅ Section consultation affichée');
}

// Rendre les fonctions globales
window.showAdsMenu = showAdsMenu;
window.showCreateSection = showCreateSection;
window.showViewSection = showViewSection;

// =================================
// GESTION PAYS/RÉGIONS
// =================================

function updateRegionOptions(countrySelectId, regionSelectId) {
  const countrySelect = document.getElementById(countrySelectId);
  const regionSelect = document.getElementById(regionSelectId);

  if (!countrySelect || !regionSelect) return;

  const selectedCountry = countrySelect.value;

  // Vider les options actuelles
  regionSelect.innerHTML = '<option value="">Choisir une région</option>';

  if (
    selectedCountry &&
    window.europeanRegions &&
    window.europeanRegions[selectedCountry]
  ) {
    const regions = window.europeanRegions[selectedCountry];
    regions.forEach(region => {
      const option = document.createElement('option');
      option.value = region.value;
      option.textContent = region.name;
      regionSelect.appendChild(option);
    });
  }
}

function handleCountryChange(e, regionSelectId) {
  updateRegionOptions(e.target.id, regionSelectId);
}

// =================================
// GESTION DES FORMULAIRES
// =================================

function handleCategoryChange() {
  const category = document.getElementById('ad-category').value;
  const tarifsGroup = document.getElementById('tarifs-group');
  const infoPersoGroup = document.getElementById('info-perso-group');

  // Afficher tarifs pour escort et services
  if (
    category.includes('escort') ||
    category.includes('domination') ||
    category.includes('massage')
  ) {
    tarifsGroup.style.display = 'block';
  } else {
    tarifsGroup.style.display = 'none';
  }

  // Afficher infos perso pour certaines catégories
  if (
    category.includes('escort') ||
    category.includes('sugar') ||
    category.includes('rencontre')
  ) {
    infoPersoGroup.style.display = 'block';
  } else {
    infoPersoGroup.style.display = 'none';
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;

  try {
    submitBtn.textContent = 'Publication...';
    submitBtn.disabled = true;

    // Vérifier si des photos ont été uploadées
    const photoUrls = adPhotoFiles.map(photo => photo.url);

    // Récupérer les données du formulaire
    const adData = {
      category: document.getElementById('ad-category').value,
      country: document.getElementById('ad-country').value,
      region: document.getElementById('ad-region').value,
      city: document.getElementById('ad-city').value,
      title: document.getElementById('ad-title').value,
      description: document.getElementById('ad-description').value,
      date: document.getElementById('ad-date').value,
      ageMin: document.getElementById('age-min').value,
      ageMax: document.getElementById('age-max').value,
      sexe: document.getElementById('ad-sexe').value,
      images: photoUrls, // URLs Cloudinary
      type:
        document.getElementById('ad-category').value.split('-')[0] ||
        'rencontre',
    };

    const token = localStorage.getItem('hotmeet_token');
    if (!token) {
      throw new Error('Vous devez être connecté');
    }

    // Envoyer les données de l'annonce avec les URLs des photos
    const response = await fetch('/api/ads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(adData),
    });

    const result = await response.json();

    if (result.success) {
      showMessage('✅ Annonce publiée avec succès !', 'success');
      e.target.reset();
      document.getElementById('ad-photos-preview').innerHTML = '';
      adPhotoFiles = [];
      setTimeout(() => showAdsMenu(), 2000);
    } else {
      throw new Error(result.message || 'Erreur lors de la publication');
    }
  } catch (error) {
    showMessage('❌ ' + error.message, 'error');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// =================================
// CHARGEMENT ET AFFICHAGE DES ANNONCES
// =================================

async function loadAds() {
  try {
    const category = document.getElementById('filter-category').value;
    const country = document.getElementById('filter-country').value;
    const region = document.getElementById('filter-region').value;
    const city = document.getElementById('filter-city').value;

    let url = '/api/ads?limit=20';
    if (category) url += `&category=${category}`;
    if (country) url += `&country=${country}`;
    if (region) url += `&region=${region}`;
    if (city) url += `&city=${city}`;

    const response = await fetch(url);
    const result = await response.json();

    const container = document.getElementById('ads-container');

    if (result.success && result.ads && result.ads.length > 0) {
      container.innerHTML = '';
      result.ads.forEach(ad => {
        const adElement = document.createElement('div');
        adElement.className = 'ad-card';
        adElement.innerHTML = `
                      <div class="ad-header">
                          <h3>${ad.title}</h3>
                          <span class="ad-category">${formatCategory(ad.category)}</span>
                      </div>
                      <p class="ad-description">${ad.description}</p>
                      <div class="ad-details">
                          <span class="ad-location">📍 ${ad.city}, ${ad.region}${ad.country ? `, ${formatCountryName(ad.country)}` : ''}</span>
                          ${ad.tarifs ? `<span class="ad-price">💰 ${ad.tarifs}</span>` : ''}
                      </div>
                      <div class="ad-footer">
                          <span class="ad-date">Publié le ${new Date(ad.createdAt).toLocaleDateString()}</span>
                          <button class="btn-primary btn-sm" onclick="contactAdvertiser('${ad._id}')">Contacter</button>
                      </div>
                  `;
        container.appendChild(adElement);
      });
    } else {
      container.innerHTML =
        '<p class="no-ads">Aucune annonce trouvée. Ajustez vos filtres ou soyez le premier à publier !</p>';
    }
  } catch (error) {
    document.getElementById('ads-container').innerHTML =
      '<p class="error">Erreur de chargement des annonces</p>';
  }
}

function formatCategory(category) {
  const categories = {
    'femme-cherche-homme': 'Femme cherche Homme',
    'homme-cherche-femme': 'Homme cherche Femme',
    'femme-cherche-femme': 'Femme cherche Femme',
    'homme-cherche-homme': 'Homme cherche Homme',
    'couple-cherche-homme': 'Couple cherche Homme',
    'couple-cherche-femme': 'Couple cherche Femme',
    'couple-cherche-couple': 'Couple cherche Couple',
    'sugar-daddy': 'Sugar Daddy',
    'baby-girl': 'Sugar Baby Girl',
    'sugar-mommy': 'Sugar Mommy',
    'baby-boy': 'Sugar Baby Boy',
    'escort-girl': 'Escort Girl',
    'escort-boy': 'Escort Boy',
    masseuse: 'Masseuse érotique',
    masseur: 'Masseur érotique',
    domination: 'Domination',
    'massage-tantrique': 'Massage tantrique',
    'cam-sexting': 'Cam / sexting',
    fetichisme: 'Fétichisme',
    'planning-soir': 'Planning "Ce soir"',
    'objets-accessoires': 'Objets / accessoires',
    emploi: 'Emploi',
  };
  return categories[category] || category;
}

function formatCountryName(countryKey) {
  const countries = {
    france: 'France',
    suisse: 'Suisse',
    belgique: 'Belgique',
    canada: 'Canada',
    allemagne: 'Allemagne',
    italie: 'Italie',
    espagne: 'Espagne',
    portugal: 'Portugal',
    'royaume-uni': 'Royaume-Uni',
    'pays-bas': 'Pays-Bas',
    autriche: 'Autriche',
    luxembourg: 'Luxembourg',
  };
  return countries[countryKey] || countryKey;
}

function contactAdvertiser(adId) {
  // Redirection vers messages avec l'ID de l'annonce
  window.location.href = `/messages?ad=${adId}`;
}

// Rendre la fonction globale pour l'utiliser dans onclick
window.contactAdvertiser = contactAdvertiser;

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
          position: fixed; top: 20px; right: 20px; z-index: 10000;
          background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
          color: white; padding: 15px 20px; border-radius: 8px; font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
}

// =================================
// INITIALISATION
// =================================

document.addEventListener('DOMContentLoaded', function () {
  console.log('🔥 DOMContentLoaded - Initialisation des annonces...');

  // Vérifier que les boutons existent
  const btnCreate = document.getElementById('btn-create-ad');
  const btnView = document.getElementById('btn-view-ads');
  console.log('🔍 Bouton Créer:', btnCreate);
  console.log('🔍 Bouton Voir:', btnView);

  if (!btnCreate || !btnView) {
    console.error('❌ ERREUR: Boutons introuvables !');
    return;
  }

  // Event listeners pour la navigation - BOUTONS
  btnCreate.addEventListener('click', function () {
    console.log('🚀 CLIC sur Créer une annonce');
    showCreateSection();
  });

  btnView.addEventListener('click', function () {
    console.log('🚀 CLIC sur Voir les annonces');
    showViewSection();
  });

  console.log('✅ Event listeners pour les boutons ajoutés');

  // Event listeners pour la navigation - CARTES ENTIÈRES aussi
  document.querySelectorAll('.choice-option').forEach((option, index) => {
    option.addEventListener('click', function () {
      console.log(`🎯 CLIC sur carte option ${index}`);
      if (index === 0) {
        showCreateSection();
      } else {
        showViewSection();
      }
    });
  });

  // Boutons retour
  const backCreate = document.getElementById('back-to-menu-create');
  const backView = document.getElementById('back-to-menu-view');

  if (backCreate) {
    backCreate.addEventListener('click', showAdsMenu);
  }
  if (backView) {
    backView.addEventListener('click', showAdsMenu);
  }

  // Event listeners pour le formulaire
  const categorySelect = document.getElementById('ad-category');
  const createForm = document.getElementById('create-ad-form');

  if (categorySelect) {
    categorySelect.addEventListener('change', handleCategoryChange);
  }
  if (createForm) {
    createForm.addEventListener('submit', handleFormSubmit);
  }

  // Event listeners pour pays/régions
  const countrySelect = document.getElementById('ad-country');
  const filterCountrySelect = document.getElementById('filter-country');

  if (countrySelect) {
    countrySelect.addEventListener('change', e => {
      updateRegionOptions('ad-country', 'ad-region');
    });
  }

  if (filterCountrySelect) {
    filterCountrySelect.addEventListener('change', e => {
      updateRegionOptions('filter-country', 'filter-region');
      loadAds(); // Recharger les annonces quand le filtre pays change
    });
  }

  // Event listeners pour l'upload des photos d'annonces
  const uploadBtn = document.getElementById('upload-ad-photos-btn');
  const fileInput = document.getElementById('ad-photos');

  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', handleAdPhotoUpload);
  }

  // Event listeners pour les filtres
  const filterCategory = document.getElementById('filter-category');
  const filterRegion = document.getElementById('filter-region');
  const filterCity = document.getElementById('filter-city');

  if (filterCategory) {
    filterCategory.addEventListener('change', loadAds);
  }
  if (filterRegion) {
    filterRegion.addEventListener('change', loadAds);
  }
  if (filterCity) {
    filterCity.addEventListener('keyup', loadAds); // Recherche en temps réel pour la ville
    filterCity.addEventListener('change', loadAds);
  }

  // Afficher le menu principal par défaut
  showAdsMenu();

  console.log('✅ Initialisation des annonces terminée');
});
