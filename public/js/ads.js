// Variables globales
let visiblePhotoFiles = [];
let privatePhotoFiles = [];

// =================================
// NAVIGATION ENTRE LES SECTIONS
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

function handlePhotoUpload(e, isPrivate = false) {
  const files = e.target.files;
  const previewId = isPrivate
    ? 'private-photos-preview'
    : 'visible-photos-preview';
  const previewContainer = document.getElementById(previewId);

  if (isPrivate) {
    privatePhotoFiles = Array.from(files);
  } else {
    visiblePhotoFiles = Array.from(files);
  }

  previewContainer.innerHTML = '';

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.classList.add('preview-thumbnail');
      previewContainer.appendChild(img);
    };
    reader.readAsDataURL(file);
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;

  try {
    submitBtn.textContent = 'Publication...';
    submitBtn.disabled = true;

    // Récupérer les données du formulaire
    const formData = new FormData();
    formData.append('category', document.getElementById('ad-category').value);
    formData.append('region', document.getElementById('ad-region').value);
    formData.append('city', document.getElementById('ad-city').value);
    formData.append('title', document.getElementById('ad-title').value);
    formData.append(
      'description',
      document.getElementById('ad-description').value
    );
    formData.append('tarifs', document.getElementById('ad-tarifs').value);
    formData.append('age', document.getElementById('ad-age').value);
    formData.append('sexe', document.getElementById('ad-sexe').value);
    formData.append('taille', document.getElementById('ad-taille').value);

    // Ajouter les photos
    visiblePhotoFiles.forEach(file => formData.append('photos', file));
    privatePhotoFiles.forEach(file => formData.append('privatePhotos', file));

    const response = await fetch('/api/ads', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    const result = await response.json();

    if (result.success) {
      showNotification('✅ Annonce publiée avec succès !', 'success');
      e.target.reset();
      document.getElementById('visible-photos-preview').innerHTML = '';
      document.getElementById('private-photos-preview').innerHTML = '';
      visiblePhotoFiles = [];
      privatePhotoFiles = [];
      setTimeout(() => showAdsMenu(), 2000);
    } else {
      throw new Error(result.message || 'Erreur lors de la publication');
    }
  } catch (error) {
    showNotification('❌ ' + error.message, 'error');
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
    const region = document.getElementById('filter-region').value;
    const city = document.getElementById('filter-city').value;

    let url = '/api/ads?limit=20';
    if (category) url += `&category=${category}`;
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
                          <span class="ad-location">📍 ${ad.city}, ${ad.region}</span>
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

  // Event listeners pour les uploads
  const visiblePhotos = document.getElementById('visible-photos');
  const privatePhotos = document.getElementById('private-photos');

  if (visiblePhotos) {
    visiblePhotos.addEventListener('change', e => handlePhotoUpload(e, false));
  }
  if (privatePhotos) {
    privatePhotos.addEventListener('change', e => handlePhotoUpload(e, true));
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
    filterCity.addEventListener('change', loadAds);
  }

  // Afficher le menu principal par défaut
  showAdsMenu();

  console.log('✅ Initialisation des annonces terminée');
});
