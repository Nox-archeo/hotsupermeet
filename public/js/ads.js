console.log('🚨 ADS SCRIPT LOADED - DEBUG ACTIVÉ');

// SECTION PRINCIPALE - AFFICHAGE DES ANNONCES
async function loadAds() {
  try {
    const filters = {
      category: document.getElementById('filter-category')?.value || '',
      region: document.getElementById('filter-region')?.value || '',
      city: document.getElementById('filter-city')?.value || '',
    };

    // Construire les paramètres de requête
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const response = await fetch(`/api/ads?${params}`);
    const result = await response.json();

    if (result.success) {
      renderAds(result.data);
    } else {
      document.getElementById('ads-container').innerHTML = '<p class="error">Erreur lors du chargement des annonces</p>';
    }
  } catch (error) {
    console.error('Erreur chargement annonces:', error);
    document.getElementById('ads-container').innerHTML = '<p class="error">Erreur de connexion</p>';
  }
}

function renderAds(ads) {
  const container = document.getElementById('ads-container');
  
  if (ads && ads.length > 0) {
    container.innerHTML = '';
    
    ads.forEach(ad => {
      const adElement = document.createElement('div');
      adElement.className = 'ad-card';
      
      // Image de l'annonce ou placeholder
      const imageHtml = ad.images && ad.images.length > 0
        ? `<img src="${ad.images[0]}" alt="Photo annonce" class="ad-image" loading="lazy" onerror="this.style.display='none';">`
        : '<div class="ad-image-placeholder">📷</div>';

      adElement.innerHTML = `
        <div class="ad-content">
          ${imageHtml}
          <div class="ad-info">
            <h3 class="ad-title">${ad.title}</h3>
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
    'escort-girl': 'Escort Girl',
    'escort-boy': 'Escort Boy',
    'trans': 'Trans',
    'massage': 'Massage',
    'libertinage': 'Libertinage',
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
    <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <h2>${ad.title}</h2>
      ${imageHtml}
      
      <div style="margin-bottom: 20px;">
        <p><strong>Catégorie:</strong> ${formatCategory(ad.category)}</p>
        ${ad.type ? `<p><strong>Type:</strong> ${ad.type}</p>` : ''}
        <p><strong>Description:</strong> ${ad.description}</p>
        <p><strong>Lieu:</strong> ${ad.city}, ${ad.region}, ${formatCountryName(ad.country)}</p>
        ${ad.tarifs ? `<p><strong>Tarifs:</strong> ${ad.tarifs}</p>` : ''}
        ${ad.age ? `<p><strong>Âge:</strong> ${ad.age} ans</p>` : ''}
        ${ad.sexe ? `<p><strong>Sexe:</strong> ${ad.sexe}</p>` : ''}
        ${ad.taille ? `<p><strong>Taille:</strong> ${ad.taille} cm</p>` : ''}
        ${ad.poids ? `<p><strong>Poids:</strong> ${ad.poids} kg</p>` : ''}
        ${ad.origine ? `<p><strong>Origine:</strong> ${ad.origine}</p>` : ''}
        ${ad.langues && ad.langues.length > 0 ? `<p><strong>Langues:</strong> ${ad.langues.join(', ')}</p>` : ''}
        ${ad.services && ad.services.length > 0 ? `<p><strong>Services:</strong> ${ad.services.join(', ')}</p>` : ''}
        
        ${ad.contactInfo ? `
          <div style="margin-top: 15px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0;">Informations de contact:</h4>
            ${ad.contactInfo.telephone ? `<p><strong>📱 Téléphone:</strong> ${ad.contactInfo.telephone}</p>` : ''}
            ${ad.contactInfo.email ? `<p><strong>📧 Email:</strong> ${ad.contactInfo.email}</p>` : ''}
            ${ad.contactInfo.disponibilite ? `<p><strong>⏰ Disponibilité:</strong> ${ad.contactInfo.disponibilite}</p>` : ''}
            ${ad.contactInfo.deplacement ? `<p><strong>🚗 Déplacement:</strong> ${ad.contactInfo.deplacement}</p>` : ''}
            ${ad.contactInfo.lieu ? `<p><strong>📍 Lieu de rencontre:</strong> ${ad.contactInfo.lieu}</p>` : ''}
          </div>
        ` : ''}
        
        <p style="margin-top: 15px; color: #666;"><strong>Publié le:</strong> ${new Date(ad.createdAt).toLocaleDateString()}</p>
      </div>
      <div style="margin-top: 20px; display: flex; gap: 10px;">
        <button class="btn-secondary view-profile-modal-btn" data-user-id="${ad.userId._id}">👤 Voir profil</button>
        <button class="btn-primary contact-modal-btn" data-ad-id="${ad._id}">💬 Contacter</button>
        <button class="btn-secondary close-modal-btn">Fermer</button>
      </div>
    </div>
  `;

  // Ajouter les event listeners après avoir créé le modal
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Event listeners pour les boutons
  const viewProfileBtn = modal.querySelector('.view-profile-modal-btn');
  const contactBtn = modal.querySelector('.contact-modal-btn');
  const closeBtn = modal.querySelector('.close-modal-btn');

  viewProfileBtn.addEventListener('click', () => {
    viewProfile(ad.userId._id);
  });

  contactBtn.addEventListener('click', () => {
    contactAdvertiser(ad._id);
  });

  closeBtn.addEventListener('click', () => {
    modal.remove();
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

    if (data.success && data.ad && data.ad.author) {
      const author = data.ad.author;
      const ad = data.ad;

      // Créer la modal de contact
      showContactModal(author, ad);
    } else {
      alert('Impossible de contacter l\'annonceur');
    }
  } catch (error) {
    console.error('Erreur contact annonceur:', error);
    alert('Erreur technique lors du contact');
  }
}

function showContactModal(author, ad) {
  const modal = document.createElement('div');
  modal.className = 'contact-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
    background: rgba(0,0,0,0.8); z-index: 1000; 
    display: flex; align-items: center; justify-content: center;
  `;

  // Préparer les moyens de contact
  let contactOptions = '';

  // Email
  if (author.email) {
    contactOptions += `
      <div class="contact-option">
        <strong>📧 Email:</strong> 
        <a href="mailto:${author.email}" target="_blank">${author.email}</a>
      </div>
    `;
  }

  // Téléphone
  if (author.telephone || author.phone) {
    const phone = author.telephone || author.phone;
    contactOptions += `
      <div class="contact-option">
        <strong>📱 Téléphone:</strong> 
        <a href="tel:${phone}">${phone}</a>
      </div>
    `;
  }

  // Si pas d'infos de contact direct
  if (!contactOptions) {
    contactOptions =
      '<p style="color: #666;">Aucune information de contact directe fournie.</p>';
  }

  modal.innerHTML = `
    <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; max-height: 80vh; overflow-y: auto;">
      <h2>Contacter ${author.nom}</h2>
      
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${author.photo || '/images/default-avatar.jpg'}" 
             alt="${author.nom}" 
             style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;"
             onerror="this.src='/images/default-avatar.jpg'">
        <h3 style="margin: 10px 0 5px 0;">${author.nom}</h3>
        <p style="margin: 0; color: #666;">Annonce: "${ad.title}"</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h4>Moyens de contact disponibles:</h4>
        ${contactOptions}
      </div>

      <div style="margin-bottom: 25px;">
        <h4>Ou contactez via le site:</h4>
        <button class="btn-primary" onclick="sendChatRequest('${author._id}', 'J\\'ai vu votre annonce &quot;${ad.title}&quot; et je suis intéressé(e). Pouvons-nous discuter ?')" style="width: 100%; margin-bottom: 10px;">
          💬 Envoyer une demande de chat
        </button>
        <button class="btn-secondary" onclick="viewProfile('${author._id}')" style="width: 100%;">
          👤 Voir le profil complet
        </button>
      </div>

      <button class="btn-secondary" onclick="this.closest('.contact-modal').remove()" style="width: 100%;">
        Fermer
      </button>
    </div>
  `;

  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  document.body.appendChild(modal);
}

// Fonction pour envoyer une demande de chat avec message pré-rempli
async function sendChatRequest(userId, message) {
  try {
    const token = localStorage.getItem('hotmeet_token');
    if (!token) {
      alert('Vous devez être connecté pour envoyer une demande de chat');
      return;
    }

    const response = await fetch('/api/messages/send-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        toUserId: userId,
        content: message,
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert('Demande de chat envoyée avec succès !');
      // Fermer la modal
      document.querySelector('.contact-modal')?.remove();
    } else {
      alert(data.error?.message || 'Erreur lors de l\'envoi de la demande');
    }
  } catch (error) {
    console.error('Erreur envoi demande chat:', error);
    alert('Erreur technique lors de l\'envoi');
  }
}

function viewProfile(userId) {
  // Redirection vers le profil de l'utilisateur
  window.location.href = `/profile-view?id=${userId}`;
}

// Le reste du fichier continue avec les fonctions existantes...
console.log('✅ Initialisation des annonces terminée');