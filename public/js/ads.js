console.log('🚨 ADS SCRIPT LOADED - DEBUG ACTIVÉ');

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
  const myAdsSection = document.getElementById('my-ads-section');

  if (!adsMenu || !createSection || !viewSection || !myAdsSection) {
    console.error('❌ ERREUR: Éléments DOM manquants !');
    return;
  }

  adsMenu.style.display = 'none';
  createSection.style.display = 'none';
  viewSection.style.display = 'block';
  myAdsSection.style.display = 'none';
  loadAds();
  console.log('✅ Section consultation affichée');
}

function showMyAdsSection() {
  console.log('🟢 Affichage section mes annonces');

  const adsMenu = document.getElementById('ads-menu');
  const createSection = document.getElementById('ads-create-section');
  const viewSection = document.getElementById('ads-view-section');
  const myAdsSection = document.getElementById('my-ads-section');

  if (!adsMenu || !createSection || !viewSection || !myAdsSection) {
    console.error('❌ ERREUR: Éléments DOM manquants !');
    return;
  }

  adsMenu.style.display = 'none';
  createSection.style.display = 'none';
  viewSection.style.display = 'none';
  myAdsSection.style.display = 'block';
  loadMyAds();
  console.log('✅ Section mes annonces affichée');
}

// Rendre les fonctions globales
window.showAdsMenu = showAdsMenu;
window.showCreateSection = showCreateSection;
window.showViewSection = showViewSection;
window.showMyAdsSection = showMyAdsSection;

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

  // Récupérer tous les groupes
  const tarifsGroup = document.getElementById('tarifs-group');
  const infoPersoGroup = document.getElementById('info-perso-group');
  const escortDetailsGroup = document.getElementById('escort-details-group');
  const escortServicesGroup = document.getElementById('escort-services-group');
  const disponibilitesGroup = document.getElementById('disponibilites-group');
  const contactGroup = document.getElementById('contact-group');

  // Masquer tous les groupes par défaut
  tarifsGroup.style.display = 'none';
  infoPersoGroup.style.display = 'none';
  escortDetailsGroup.style.display = 'none';
  escortServicesGroup.style.display = 'none';
  disponibilitesGroup.style.display = 'none';
  contactGroup.style.display = 'none';

  // Logique d'affichage selon la catégorie
  if (category.includes('escort')) {
    // Escort complet : toutes les infos
    tarifsGroup.style.display = 'block';
    infoPersoGroup.style.display = 'block';
    escortDetailsGroup.style.display = 'block';
    escortServicesGroup.style.display = 'block';
    disponibilitesGroup.style.display = 'block';
    contactGroup.style.display = 'block';
  } else if (category.includes('sugar')) {
    // Sugar : infos perso + tarifs + disponibilités + contact
    tarifsGroup.style.display = 'block';
    infoPersoGroup.style.display = 'block';
    disponibilitesGroup.style.display = 'block';
    contactGroup.style.display = 'block';
  } else if (
    category.includes('domination') ||
    category.includes('massage') ||
    category.includes('cam-sexting')
  ) {
    // Services érotiques : tarifs + infos perso + services + disponibilités + contact
    tarifsGroup.style.display = 'block';
    infoPersoGroup.style.display = 'block';
    escortServicesGroup.style.display = 'block';
    disponibilitesGroup.style.display = 'block';
    contactGroup.style.display = 'block';
  } else if (category.includes('cherche')) {
    // Rencontres classiques : infos perso + contact
    infoPersoGroup.style.display = 'block';
    contactGroup.style.display = 'block';
  } else if (category.includes('emploi')) {
    // Emploi : tarifs + disponibilités + contact
    tarifsGroup.style.display = 'block';
    disponibilitesGroup.style.display = 'block';
    contactGroup.style.display = 'block';
  }

  // Pour toutes les catégories payantes, afficher au minimum les tarifs
  const categoriesPayantes = [
    'escort',
    'sugar',
    'domination',
    'massage',
    'cam-sexting',
    'emploi',
  ];
  const isPaid = categoriesPayantes.some(cat => category.includes(cat));

  if (isPaid && tarifsGroup.style.display === 'none') {
    tarifsGroup.style.display = 'block';
  }

  // Toujours afficher la section contact pour toutes les annonces
  if (category && contactGroup.style.display === 'none') {
    contactGroup.style.display = 'block';
  }
}

// Gestion des méthodes de contact
function handleContactMethodChange() {
  const emailField = document.getElementById('ad-email');
  const telephoneField = document.getElementById('ad-telephone');
  const whatsappField = document.getElementById('ad-whatsapp');
  const telegramField = document.getElementById('ad-telegram');
  const snapField = document.getElementById('ad-snap');

  // Masquer tous les champs par défaut
  emailField.style.display = 'none';
  telephoneField.style.display = 'none';
  whatsappField.style.display = 'none';
  telegramField.style.display = 'none';
  snapField.style.display = 'none';

  // Afficher les champs selon les checkboxes cochées
  const checkedMethods = document.querySelectorAll(
    'input[name="contact_methods"]:checked'
  );
  checkedMethods.forEach(method => {
    switch (method.value) {
      case 'email':
        emailField.style.display = 'block';
        break;
      case 'telephone':
        telephoneField.style.display = 'block';
        break;
      case 'whatsapp':
        whatsappField.style.display = 'block';
        break;
      case 'telegram':
        telegramField.style.display = 'block';
        break;
      case 'snap':
        snapField.style.display = 'block';
        break;
    }
  });
}

async function handleFormSubmit(e) {
  console.log('🚨 DÉBUT handleFormSubmit - e.preventDefault() appelé');
  e.preventDefault();

  console.log('🚨 Token check...');
  const token = localStorage.getItem('hotmeet_token');
  if (!token) {
    console.log('❌ Pas de token - abandon');
    showMessage('Vous devez être connecté', 'error');
    return;
  }
  console.log('✅ Token trouvé');

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;

  try {
    submitBtn.textContent = 'Publication...';
    submitBtn.disabled = true;

    // Vérifier si des photos ont été uploadées
    const photoUrls = adPhotoFiles.map(photo => photo.url);
    console.log('📸 Photos uploadées:', photoUrls.length);

    // Récupérer les données du formulaire
    const categoryValue = document.getElementById('ad-category').value;
    const sexeFromForm = document.getElementById('ad-sexe')?.value || '';

    // Déterminer automatiquement le type basé sur la catégorie
    let finalType = 'rencontre'; // par défaut
    if (categoryValue) {
      if (
        categoryValue.includes('sugar') ||
        categoryValue.includes('daddy') ||
        categoryValue.includes('baby')
      ) {
        finalType = 'sugar';
      } else if (
        categoryValue.includes('escort') ||
        categoryValue.includes('masseuse') ||
        categoryValue.includes('masseur')
      ) {
        finalType = 'escort';
      } else if (
        [
          'domination',
          'massage-tantrique',
          'cam-sexting',
          'fetichisme',
          'planning-soir',
        ].includes(categoryValue)
      ) {
        finalType = 'service';
      } else if (categoryValue === 'objets-accessoires') {
        finalType = 'vente';
      } else if (categoryValue === 'emploi') {
        finalType = 'emploi';
      } else {
        finalType = 'rencontre'; // toutes les rencontres (femme-cherche-homme, etc.)
      }
    }

    // Déterminer automatiquement le sexe basé sur la catégorie si pas spécifié
    let finalSexe = sexeFromForm;
    if (!finalSexe && categoryValue) {
      if (
        categoryValue.startsWith('femme-') ||
        categoryValue === 'escort-girl' ||
        categoryValue === 'baby-girl'
      ) {
        finalSexe = 'femme';
      } else if (
        categoryValue.startsWith('homme-') ||
        categoryValue === 'escort-boy' ||
        categoryValue === 'baby-boy'
      ) {
        finalSexe = 'homme';
      } else if (categoryValue.startsWith('couple-')) {
        finalSexe = 'couple';
      } else if (
        categoryValue === 'sugar-daddy' ||
        categoryValue === 'masseur'
      ) {
        finalSexe = 'homme';
      } else if (
        categoryValue === 'sugar-mommy' ||
        categoryValue === 'masseuse'
      ) {
        finalSexe = 'femme';
      }
    }

    const adData = {
      category: categoryValue,
      country: document.getElementById('ad-country').value,
      region: document.getElementById('ad-region').value,
      city: document.getElementById('ad-city').value,
      title: document.getElementById('ad-title').value,
      description: document.getElementById('ad-description').value,
      images: photoUrls, // URLs Cloudinary
      type: finalType, // Type déterminé automatiquement selon la catégorie      // Tarifs
      tarifs: document.getElementById('ad-tarifs')?.value || '',

      // Informations personnelles de base
      age: document.getElementById('ad-age')?.value || '',
      sexe: finalSexe,
      taille: document.getElementById('ad-taille')?.value || '',
      poids: document.getElementById('ad-poids')?.value || '',
      cheveux: document.getElementById('ad-cheveux')?.value || '',
      yeux: document.getElementById('ad-yeux')?.value || '',

      // Détails escort
      bonnet: document.getElementById('ad-bonnet')?.value || '',
      origine: document.getElementById('ad-origine')?.value || '',
      silhouette: document.getElementById('ad-silhouette')?.value || '',
      depilation: document.getElementById('ad-depilation')?.value || '',

      // Services (checkboxes)
      services: Array.from(
        document.querySelectorAll('input[name="services"]:checked')
      ).map(cb => cb.value),

      // Disponibilités
      horaires: document.getElementById('ad-horaires')?.value || '',
      deplacement: document.getElementById('ad-deplacement')?.value || '',
      disponibilites_details:
        document.getElementById('ad-disponibilites-details')?.value || '',

      // Méthodes de contact
      contact_methods: Array.from(
        document.querySelectorAll('input[name="contact_methods"]:checked')
      ).map(cb => cb.value),
      contact_email: document.getElementById('ad-email')?.value || '',
      contact_telephone: document.getElementById('ad-telephone')?.value || '',
      contact_whatsapp: document.getElementById('ad-whatsapp')?.value || '',
      contact_telegram: document.getElementById('ad-telegram')?.value || '',
      contact_snap: document.getElementById('ad-snap')?.value || '',
    };

    const token = localStorage.getItem('hotmeet_token');
    if (!token) {
      throw new Error('Vous devez être connecté');
    }

    // Vérifier si on est en mode édition
    const isEditMode = e.target.dataset.editMode === 'true';
    const editId = e.target.dataset.editId;

    const method = isEditMode ? 'PUT' : 'POST';
    const url = isEditMode ? `/api/ads/${editId}` : '/api/ads';

    console.log('🌐 DÉBUT REQUÊTE - URL:', url);
    console.log('🌐 DÉBUT REQUÊTE - METHOD:', method);
    console.log('🌐 DÉBUT REQUÊTE - TOKEN:', token ? 'présent' : 'absent');
    console.log('🌐 DÉBUT REQUÊTE - DATA:', JSON.stringify(adData, null, 2));

    // Envoyer les données de l'annonce avec les URLs des photos
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(adData),
    });

    console.log('🌐 RÉPONSE REÇUE - STATUS:', response.status);
    console.log('🌐 RÉPONSE REÇUE - OK:', response.ok);

    const result = await response.json();
    console.log('🌐 RÉPONSE PARSED:', result);

    if (result.success) {
      const message = isEditMode
        ? '✅ Annonce modifiée avec succès !'
        : '✅ Annonce publiée avec succès !';
      showMessage(message, 'success');

      if (!isEditMode) {
        e.target.reset();
        document.getElementById('ad-photos-preview').innerHTML = '';
        adPhotoFiles = [];
      } else {
        // Réinitialiser le mode édition
        delete e.target.dataset.editMode;
        delete e.target.dataset.editId;

        const title = document.querySelector('#ads-create-section h2');
        if (title) title.textContent = 'Créer une annonce';

        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = "Publier l'annonce";
      }

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

    if (result.success && result.data && result.data.length > 0) {
      container.innerHTML = '';
      result.data.forEach(ad => {
        const adElement = document.createElement('div');
        adElement.className = 'ad-card';
        adElement.style.cursor = 'pointer';

        const imageHtml =
          ad.images && ad.images.length > 0
            ? `<div class="ad-image">
               <img src="${ad.images[0]}" alt="Photo annonce" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
             </div>`
            : '<div class="ad-image"><div class="no-image">📷</div></div>';

        adElement.innerHTML = `
          ${imageHtml}
          <div class="ad-content">
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
                <div class="ad-actions">
                    <button class="btn-secondary btn-sm view-profile-btn" data-user-id="${ad.userId._id}">👤 Voir profil</button>
                    <button class="btn-primary btn-sm contact-btn" data-ad-id="${ad._id}">💬 Contacter</button>
                </div>
            </div>
          </div>
        `;

        // Event listener pour cliquer sur l'annonce
        adElement.addEventListener('click', e => {
          if (
            !e.target.classList.contains('btn-secondary') &&
            !e.target.classList.contains('btn-primary')
          ) {
            showAdDetails(ad);
          }
        });

        // Event listeners pour les boutons
        const viewProfileBtn = adElement.querySelector('.view-profile-btn');
        const contactBtn = adElement.querySelector('.contact-btn');

        viewProfileBtn.addEventListener('click', e => {
          e.stopPropagation();
          viewProfile(ad.userId._id);
        });

        contactBtn.addEventListener('click', e => {
          e.stopPropagation();
          contactAdvertiser(ad._id);
        });

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

// Fonction pour afficher les détails d'une annonce
function showAdDetails(ad) {
  const modal = document.createElement('div');
  modal.className = 'ad-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
    background: rgba(0,0,0,0.8); z-index: 1000; 
    display: flex; align-items: center; justify-content: center;
  `;

  const imageHtml =
    ad.images && ad.images.length > 0
      ? `<img src="${ad.images[0]}" alt="Photo annonce" style="width: 200px; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">`
      : '<div style="width: 200px; height: 200px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">📷 Pas de photo</div>';

  modal.innerHTML = `
    <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; max-height: 80vh; overflow-y: auto;">
      <h2>${ad.title}</h2>
      ${imageHtml}
      <p><strong>Catégorie:</strong> ${formatCategory(ad.category)}</p>
      <p><strong>Description:</strong> ${ad.description}</p>
      <p><strong>Lieu:</strong> ${ad.city}, ${ad.region}, ${formatCountryName(ad.country)}</p>
      ${ad.tarifs ? `<p><strong>Tarifs:</strong> ${ad.tarifs}</p>` : ''}
      ${ad.age ? `<p><strong>Âge:</strong> ${ad.age} ans</p>` : ''}
      ${ad.sexe ? `<p><strong>Sexe:</strong> ${ad.sexe}</p>` : ''}
      <p><strong>Publié le:</strong> ${new Date(ad.createdAt).toLocaleDateString()}</p>
      <div style="margin-top: 20px; display: flex; gap: 10px;">
        <button class="btn-secondary" onclick="viewProfile('${ad.userId._id}')">👤 Voir profil</button>
        <button class="btn-primary" onclick="contactAdvertiser('${ad._id}')">💬 Contacter</button>
        <button class="btn-secondary" onclick="this.closest('.ad-modal').remove()">Fermer</button>
      </div>
    </div>
  `;

  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  document.body.appendChild(modal);
}

async function contactAdvertiser(adId) {
  console.log('📨 Contacter annonce:', adId);

  try {
    // Récupérer les détails de l'annonce et de l'annonceur
    const response = await fetch(`/api/ads/public/${adId}`);
    const data = await response.json();

    console.log('🔍 Données API reçues:', data);
    console.log('🔍 Ad data:', data.ad);
    console.log('🔍 Author data:', data.ad?.author);

    if (data.success && data.ad && data.ad.author) {
      const advertiserInfo = {
        id: data.ad.author._id,
        nom: data.ad.author.nom || 'Utilisateur',
        photo: data.ad.author.photo || '/images/default-avatar.jpg',
        adTitle: data.ad.title,
      };

      // Ouvrir le chat d'annonce avec le gestionnaire dédié
      if (window.adChatManager) {
        window.adChatManager.openAdChat(adId, advertiserInfo);
      } else {
        // Fallback si le gestionnaire n'est pas encore chargé
        setTimeout(() => {
          window.adChatManager.openAdChat(adId, advertiserInfo);
        }, 100);
      }
    } else {
      alert("Impossible de contacter l'annonceur");
    }
  } catch (error) {
    console.error('Erreur contact annonceur:', error);
    alert('Erreur technique lors du contact');
  }
}

function viewProfile(userId) {
  // Redirection vers le profil de l'utilisateur
  window.location.href = `/profile-view?id=${userId}`;
}

// =================================
// GESTION MES ANNONCES
// =================================

async function loadMyAds() {
  try {
    const response = await fetch('/api/my-ads', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('hotmeet_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des annonces');
    }

    const result = await response.json();
    const container = document.getElementById('my-ads-container');

    if (result.success && result.data && result.data.length > 0) {
      // Mettre à jour les statistiques
      document.getElementById('stats-total').textContent = result.data.length;
      document.getElementById('stats-views').textContent = result.data.reduce(
        (total, ad) => total + (ad.views || 0),
        0
      );
      document.getElementById('stats-contacts').textContent =
        result.data.reduce((total, ad) => total + (ad.contacts || 0), 0);

      // Afficher les annonces
      container.innerHTML = '';
      result.data.forEach(ad => {
        const daysSinceCreation = Math.floor(
          (Date.now() - new Date(ad.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        const daysRemaining = Math.max(0, 30 - daysSinceCreation);

        let statusClass = 'status-active';
        let statusText = 'Active';

        if (daysRemaining <= 0) {
          statusClass = 'status-expired';
          statusText = 'Expirée';
        } else if (daysRemaining <= 5) {
          statusClass = 'status-pending';
          statusText = 'Expire bientôt';
        }

        const adElement = document.createElement('div');
        adElement.className = 'my-ad-card';
        adElement.innerHTML = `
          <div class="my-ad-header">
            <h3 class="my-ad-title">${ad.title}</h3>
            <span class="my-ad-status ${statusClass}">${statusText}</span>
          </div>
          <p class="my-ad-description">${ad.description}</p>
          <div class="my-ad-meta">
            <span>📍 ${ad.city}, ${ad.region}</span>
            <span>📅 Publié le ${new Date(ad.createdAt).toLocaleDateString()}</span>
            <span>⏰ Expire dans ${daysRemaining} jours</span>
            <span>👁️ ${ad.views || 0} vues</span>
            <span>💬 ${ad.contacts || 0} contacts</span>
          </div>
          <div class="my-ad-actions">
            <button class="btn-action btn-edit" data-ad-id="${ad._id}">
              ✏️ Modifier
            </button>
            <button class="btn-action btn-renew" data-ad-id="${ad._id}">
              🔄 Renouveler
            </button>
            <button class="btn-action btn-delete" data-ad-id="${ad._id}">
              🗑️ Supprimer
            </button>
          </div>
        `;
        container.appendChild(adElement);

        // Ajouter les event listeners
        const editBtn = adElement.querySelector('.btn-edit');
        const renewBtn = adElement.querySelector('.btn-renew');
        const deleteBtn = adElement.querySelector('.btn-delete');

        editBtn.addEventListener('click', () => editAd(ad._id));
        renewBtn.addEventListener('click', () => renewAd(ad._id));
        deleteBtn.addEventListener('click', () => deleteAd(ad._id));
      });
    } else {
      container.innerHTML = `
        <div class="no-ads">
          <p><strong>Vous n'avez encore aucune annonce publiée.</strong></p>
          <p>Créez votre première annonce pour commencer à rencontrer des personnes qui partagent vos envies !</p>
          <p class="help-text">💡 Vos annonces seront automatiquement supprimées après 30 jours. Vous pouvez les renouveler à tout moment.</p>
          <button class="btn-primary" onclick="showCreateSection()" style="margin-top: 1rem;">
            ✍️ Créer ma première annonce
          </button>
        </div>
      `;
      document.getElementById('stats-total').textContent = '0';
      document.getElementById('stats-views').textContent = '0';
      document.getElementById('stats-contacts').textContent = '0';
    }
  } catch (error) {
    document.getElementById('my-ads-container').innerHTML =
      '<p class="error">Erreur de chargement de vos annonces</p>';
  }
}

async function deleteAd(adId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
    return;
  }

  try {
    const response = await fetch(`/api/ads/${adId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('hotmeet_token')}`,
      },
    });

    if (response.ok) {
      loadMyAds(); // Recharger la liste
      showNotification('Annonce supprimée avec succès', 'success');
    } else {
      throw new Error('Erreur lors de la suppression');
    }
  } catch (error) {
    showNotification('Erreur lors de la suppression', 'error');
  }
}

async function renewAd(adId) {
  if (
    !confirm(
      'Voulez-vous renouveler cette annonce pour 30 jours supplémentaires ?'
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`/api/ads/${adId}/renew`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('hotmeet_token')}`,
      },
    });

    if (response.ok) {
      loadMyAds(); // Recharger la liste
      showNotification('Annonce renouvelée avec succès', 'success');
    } else {
      throw new Error('Erreur lors du renouvellement');
    }
  } catch (error) {
    showNotification('Erreur lors du renouvellement', 'error');
  }
}

async function editAd(adId) {
  try {
    // Récupérer les données de l'annonce
    const response = await fetch(`/api/ads/${adId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('hotmeet_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erreur lors du chargement de l'annonce");
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Erreur inconnue');
    }

    const ad = result.data;

    // Afficher la section création
    showCreateSection();

    // Pré-remplir le formulaire
    fillEditForm(ad, adId);

    showNotification('Formulaire pré-rempli pour modification', 'info');
  } catch (error) {
    showNotification('Erreur lors du chargement pour modification', 'error');
  }
}

function fillEditForm(ad, adId) {
  // Marquer comme mode édition
  document.getElementById('create-ad-form').dataset.editMode = 'true';
  document.getElementById('create-ad-form').dataset.editId = adId;

  // Changer le titre et bouton
  const title = document.querySelector('#ads-create-section h2');
  if (title) title.textContent = 'Modifier mon annonce';

  const submitBtn = document.querySelector(
    '#create-ad-form button[type="submit"]'
  );
  if (submitBtn) submitBtn.textContent = "Modifier l'annonce";

  // Pré-remplir les champs
  if (ad.category) document.getElementById('ad-category').value = ad.category;
  if (ad.country) document.getElementById('ad-country').value = ad.country;
  if (ad.region) document.getElementById('ad-region').value = ad.region;
  if (ad.city) document.getElementById('ad-city').value = ad.city;
  if (ad.title) document.getElementById('ad-title').value = ad.title;
  if (ad.description)
    document.getElementById('ad-description').value = ad.description;
  if (ad.tarifs) document.getElementById('ad-tarifs').value = ad.tarifs;
  if (ad.age) document.getElementById('ad-age').value = ad.age;
  if (ad.sexe) document.getElementById('ad-sexe').value = ad.sexe;
  if (ad.taille) document.getElementById('ad-taille').value = ad.taille;
  if (ad.poids) document.getElementById('ad-poids').value = ad.poids;
  if (ad.cheveux) document.getElementById('ad-cheveux').value = ad.cheveux;
  if (ad.yeux) document.getElementById('ad-yeux').value = ad.yeux;
}

// Rendre les fonctions globales pour les boutons
window.loadMyAds = loadMyAds;
window.deleteAd = deleteAd;
window.renewAd = renewAd;
window.editAd = editAd;

// Rendre la fonction globale pour l'utiliser dans onclick
window.contactAdvertiser = contactAdvertiser;
window.viewProfile = viewProfile;

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
  const btnMyAds = document.getElementById('btn-my-ads');
  console.log('🔍 Bouton Créer:', btnCreate);
  console.log('🔍 Bouton Voir:', btnView);
  console.log('🔍 Bouton Mes Annonces:', btnMyAds);

  if (!btnCreate || !btnView || !btnMyAds) {
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

  btnMyAds.addEventListener('click', function () {
    console.log('🚀 CLIC sur Mes annonces');
    showMyAdsSection();
  });

  console.log('✅ Event listeners pour les boutons ajoutés');

  // Event listener pour le bouton de recherche
  const searchBtn = document.getElementById('btn-search-ads');
  if (searchBtn) {
    searchBtn.addEventListener('click', function () {
      console.log('🔍 CLIC bouton rechercher');
      loadAds();
    });
  }

  // Event listeners pour la navigation - CARTES ENTIÈRES aussi
  document.querySelectorAll('.choice-option').forEach((option, index) => {
    option.addEventListener('click', function () {
      console.log(`🎯 CLIC sur carte option ${index}`);
      if (index === 0) {
        showCreateSection();
      } else if (index === 1) {
        showViewSection();
      } else if (index === 2) {
        showMyAdsSection();
      }
    });
  });

  // Boutons retour
  const backCreate = document.getElementById('back-to-menu-create');
  const backView = document.getElementById('back-to-menu-view');
  const backMyAds = document.getElementById('back-to-menu-myads');

  if (backCreate) {
    backCreate.addEventListener('click', showAdsMenu);
  }
  if (backView) {
    backView.addEventListener('click', showAdsMenu);
  }
  if (backMyAds) {
    backMyAds.addEventListener('click', showAdsMenu);
  }

  // Event listeners pour le formulaire
  const categorySelect = document.getElementById('ad-category');
  const createForm = document.getElementById('create-ad-form');

  console.log('🔍 FORM ELEMENT:', createForm);
  console.log('🔍 CATEGORY SELECT:', categorySelect);

  if (categorySelect) {
    categorySelect.addEventListener('change', handleCategoryChange);
  }
  if (createForm) {
    console.log('✅ FORM TROUVÉ - AJOUT EVENT LISTENER SUBMIT');
    createForm.addEventListener('submit', handleFormSubmit);
  } else {
    console.log('❌ FORM create-ad-form INTROUVABLE !');
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

  // Event listeners pour les méthodes de contact
  const contactCheckboxes = document.querySelectorAll(
    'input[name="contact_methods"]'
  );
  contactCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', handleContactMethodChange);
  });

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
// Display complete ad info
/* FORCE SYNC Tue Dec  2 15:04:22 CET 2025 */
// Fix sync Tue Dec  2 15:16:03 CET 2025
// Test change 1764690220
