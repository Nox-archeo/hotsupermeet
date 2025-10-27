// JavaScript spécifique au profil - Version 2.2 - Gestion des photos
console.log(
  '🔧 PROFIL PAGE VERSION 2.2 - GESTION DES PHOTOS - ' +
    new Date().toISOString()
);
console.log('🚨 NOUVELLE VERSION CHARGÉE ! Fonctionnalités photo activées.');

// Gestion du formulaire de profil
document
  .getElementById('profileForm')
  .addEventListener('submit', async function (e) {
    e.preventDefault();

    // Récupérer les valeurs avec gestion des champs vides
    const nom = document.getElementById('profileNom').value.trim();
    const age = document.getElementById('profileAge').value;
    const sexe = document.getElementById('profileSexe').value;
    const pays = document.getElementById('profilePays').value.trim();
    const region = document.getElementById('profileRegion').value.trim();
    const ville = document.getElementById('profileVille').value.trim();
    const bio = document.getElementById('profileBio').value.trim();

    // Validation minimale : seulement nom obligatoire
    if (!nom) {
      showMessage('Le nom est obligatoire', 'error');
      return;
    }

    const formData = {
      profile: {
        nom: nom,
        age: age ? parseInt(age) : '',
        sexe: sexe || '',
        localisation: {
          pays: pays || '',
          region: region || '',
          ville: ville || '',
        },
        bio: bio,
      },
    };

    try {
      showMessage('Mise à jour en cours...', 'info');

      const token = localStorage.getItem('hotmeet_token');
      if (!token) {
        showMessage('Erreur: Non connecté', 'error');
        return;
      }

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showMessage('Profil mis à jour avec succès !', 'success');
        // Recharger les données du profil
        loadProfileData();
      } else {
        const errorData = await response.json();
        showMessage(
          errorData.message || 'Erreur lors de la mise à jour',
          'error'
        );
      }
    } catch (error) {
      console.error('Erreur:', error);
      showMessage('Erreur lors de la mise à jour', 'error');
    }
  });

// Gestion du compteur de caractères pour la bio
document.getElementById('profileBio').addEventListener('input', function () {
  const charCount = this.value.length;
  document.getElementById('bioCharCount').textContent = charCount;

  if (charCount > 500) {
    this.style.borderColor = '#ff6b6b';
  } else {
    this.style.borderColor = '#e1e8ed';
  }
});

// Chargement des données du profil
async function loadProfileData() {
  try {
    console.log('=== DÉBUT CHARGEMENT PROFIL ===');
    const token = localStorage.getItem('hotmeet_token');
    console.log('Token trouvé dans localStorage:', token ? 'OUI' : 'NON');

    // Vérifier d'abord si on a des données dans le localStorage (après inscription)
    const savedProfile = localStorage.getItem('hotmeet_user_profile');
    const savedStats = localStorage.getItem('hotmeet_user_stats');

    if (savedProfile) {
      console.log('Données de profil trouvées dans localStorage');
      const profile = JSON.parse(savedProfile);
      const stats = savedStats
        ? JSON.parse(savedStats)
        : { profileViews: 0, messagesReceived: 0 };

      // Remplir le formulaire avec les données sauvegardées
      document.getElementById('profileNom').value = profile.nom || '';
      document.getElementById('profileAge').value = profile.age || '';
      document.getElementById('profileSexe').value = profile.sexe || '';

      // Remplir les champs de localisation
      let pays = '';
      let region = '';
      let ville = '';

      if (profile.localisation) {
        if (typeof profile.localisation === 'object') {
          pays = profile.localisation.pays || '';
          region = profile.localisation.region || '';
          ville = profile.localisation.ville || '';
        } else {
          ville = profile.localisation;
        }
      }

      document.getElementById('profilePays').value = pays;
      document.getElementById('profileRegion').value = region;
      document.getElementById('profileVille').value = ville;

      document.getElementById('profileBio').value = profile.bio || '';

      // NOUVEAU: Mettre à jour la photo de profil depuis localStorage
      const profileAvatarElem = document.getElementById('profileAvatar');
      if (profileAvatarElem && profile.photos && profile.photos.length > 0) {
        const firstPhoto = profile.photos[0];
        // Utiliser 'path' au lieu de 'url' car la structure a 'path' pas 'url'
        if (firstPhoto && (firstPhoto.url || firstPhoto.path)) {
          const photoUrl = firstPhoto.url || firstPhoto.path;
          console.log('Photo utilisateur trouvée dans localStorage:', photoUrl);
          profileAvatarElem.src = photoUrl;
          profileAvatarElem.alt = `Photo de ${profile.nom || 'profil'}`;
        }
      }

      // Mettre à jour l'affichage
      document.getElementById('profileName').textContent =
        profile.nom || 'Votre nom';
      document.getElementById('profileDetails').textContent =
        `${profile.age || 'Âge'} • ${ville || 'Ville'}`;

      // Mettre à jour le compteur de caractères
      document.getElementById('bioCharCount').textContent =
        profile.bio?.length || 0;

      // Mettre à jour les statistiques
      document.getElementById('profileViews').textContent =
        stats.profileViews || 0;
      document.getElementById('profileMessages').textContent =
        stats.messagesReceived || 0;

      // Nettoyer le localStorage après utilisation
      localStorage.removeItem('hotmeet_user_profile');
      localStorage.removeItem('hotmeet_user_stats');

      console.log('Données du profil chargées depuis localStorage');

      // Recharger les régions maintenant que les données du profil sont chargées
      if (typeof window.reloadRegionsAfterProfileLoad === 'function') {
        window.reloadRegionsAfterProfileLoad();
      }

      // Mettre à jour les boutons de navigation
      updateNavigationButtons(true);
      return;
    }

    if (!token) {
      console.log('Aucun token trouvé, affichage du message de connexion');
      showLoginMessage();
      return;
    }

    console.log('Appel API /api/auth/me...');
    const response = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('Réponse API reçue - Status:', response.status);
    console.log('Réponse API reçue - OK:', response.ok);

    if (response.ok) {
      const data = await response.json();
      console.log('Données brutes reçues de l\\' + 'API:', data);

      const user = data.user || data;
      console.log('Données utilisateur extraites:', user);

      if (user && user.profile) {
        try {
          console.log(
            'Début du remplissage du formulaire avec les données utilisateur'
          );

          // Obtenir tous les éléments du formulaire
          const nomField = document.getElementById('profileNom');
          const ageField = document.getElementById('profileAge');
          const sexeField = document.getElementById('profileSexe');
          const paysField = document.getElementById('profilePays');
          const regionField = document.getElementById('profileRegion');
          const villeField = document.getElementById('profileVille');
          const bioField = document.getElementById('profileBio');
          const profileNameElem = document.getElementById('profileName');
          const profileDetailsElem = document.getElementById('profileDetails');
          const bioCharCountElem = document.getElementById('bioCharCount');
          const profileViewsElem = document.getElementById('profileViews');
          const profileMessagesElem =
            document.getElementById('profileMessages');

          if (
            !nomField ||
            !ageField ||
            !sexeField ||
            !paysField ||
            !regionField ||
            !villeField ||
            !bioField
          ) {
            console.error(
              'Un ou plusieurs éléments du formulaire sont introuvables'
            );
            return;
          }

          // Remplir les champs de base
          nomField.value = user.profile.nom || '';
          ageField.value = user.profile.age || '';
          sexeField.value = user.profile.sexe || '';

          // Remplir les champs de localisation avec gestion robuste
          let pays = '';
          let region = '';
          let ville = '';

          if (user.profile.localisation) {
            if (typeof user.profile.localisation === 'object') {
              pays = user.profile.localisation.pays || '';
              region = user.profile.localisation.region || '';
              ville = user.profile.localisation.ville || '';
            } else {
              // Fallback si localisation est une chaîne
              ville = user.profile.localisation;
            }
          }

          console.log('Localisation extraite:', { pays, region, ville });

          paysField.value = pays;
          regionField.value = region;
          villeField.value = ville;

          bioField.value = user.profile.bio || '';

          // NOUVEAU: Mettre à jour la photo de profil avec gestion du floutage
          const profileAvatarElem = document.getElementById('profileAvatar');
          const blurStatusElem = document.getElementById('blurStatus');

          if (
            profileAvatarElem &&
            user.profile.photos &&
            user.profile.photos.length > 0
          ) {
            const firstPhoto = user.profile.photos[0];
            console.log('🔍 DEBUG PHOTO:', JSON.stringify(firstPhoto, null, 2));

            // Utiliser 'path' au lieu de 'url' car la structure a 'path' pas 'url'
            if (firstPhoto && (firstPhoto.url || firstPhoto.path)) {
              let photoUrl = '';

              // Sécurité : s'assurer que c'est une string
              if (
                typeof firstPhoto.path === 'string' &&
                firstPhoto.path.trim() !== ''
              ) {
                photoUrl = firstPhoto.path;
              } else if (
                typeof firstPhoto.url === 'string' &&
                firstPhoto.url.trim() !== ''
              ) {
                photoUrl = firstPhoto.url;
              }

              console.log('🔍 photoUrl final:', photoUrl);
              console.log('🔍 Photo floutée?:', firstPhoto.isBlurred);

              if (photoUrl && typeof photoUrl === 'string') {
                profileAvatarElem.src = photoUrl;
                profileAvatarElem.alt = `Photo de ${user.profile.nom || 'profil'}`;

                // Appliquer le flou CSS si la photo est floutée
                if (firstPhoto.isBlurred) {
                  profileAvatarElem.style.filter = 'blur(20px)';
                  if (blurStatusElem) {
                    blurStatusElem.textContent =
                      '🔄 Photo floutée - Cliquez pour déflouter';
                    blurStatusElem.style.color = '#ff6b6b';
                  }
                } else {
                  profileAvatarElem.style.filter = 'none';
                  if (blurStatusElem) {
                    blurStatusElem.textContent = '✅ Photo visible';
                    blurStatusElem.style.color = '#4caf50';
                  }
                }

                console.log('✅ Photo définie avec succès:', photoUrl);
              } else {
                console.log('❌ photoUrl invalide:', photoUrl);
              }
            } else {
              console.log(
                'Pas d\\' + 'URL/path de photo, utilisation du placeholder'
              );
            }
          } else {
            console.log('Pas de photos dans le profil utilisateur');
            if (blurStatusElem) {
              blurStatusElem.textContent = '📷 Aucune photo uploadée';
              blurStatusElem.style.color = '#7f8c8d';
            }
          }

          // NOUVEAU: Afficher toutes les photos dans les galeries
          if (user.profile.photos) {
            displayPhotos(user.profile.photos);
          }

          // Mettre à jour l'affichage du profil si les éléments existent
          if (profileNameElem) {
            profileNameElem.textContent = user.profile.nom || 'Votre nom';
          }
          if (profileDetailsElem) {
            profileDetailsElem.textContent = `${user.profile.age || 'Âge'} • ${ville || 'Ville'}`;
          }
          if (bioCharCountElem) {
            bioCharCountElem.textContent = user.profile.bio?.length || 0;
          }
          if (profileViewsElem) {
            profileViewsElem.textContent = user.stats?.profileViews || 0;
          }
          if (profileMessagesElem) {
            profileMessagesElem.textContent = user.stats?.messagesReceived || 0;
          }

          console.log('Formulaire rempli avec succès');
          console.log('✅ DONNÉES AFFICHÉES:', {
            nom: user.profile.nom,
            age: user.profile.age,
            ville: ville,
            profileNameElem: profileNameElem?.textContent,
            profileDetailsElem: profileDetailsElem?.textContent,
          });

          // Recharger les régions maintenant que les données du profil sont chargées
          if (typeof window.reloadRegionsAfterProfileLoad === 'function') {
            window.reloadRegionsAfterProfileLoad();
          }

          // Mettre à jour les boutons de navigation
          updateNavigationButtons(true);
        } catch (error) {
          console.error('Erreur lors du remplissage du formulaire:', error);
        }
      } else {
        console.error('Erreur API:', response.status);
        if (response.status === 401) {
          localStorage.removeItem('hotmeet_token');
          showLoginMessage();
        } else {
          // Pour les autres erreurs, essayer de charger des données par défaut
          showMessage('Erreur lors du chargement du profil', 'error');
          loadDefaultProfileData();
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement du profil:', error);
    showMessage('Erreur lors du chargement du profil', 'error');
    loadDefaultProfileData();
  }
}

// Chargement des données par défaut du profil
function loadDefaultProfileData() {
  try {
    console.log('Chargement des données par défaut du profil');

    // Obtenir les éléments d'affichage
    const profileNameElem = document.getElementById('profileName');
    const profileDetailsElem = document.getElementById('profileDetails');
    const bioCharCountElem = document.getElementById('bioCharCount');
    const profileViewsElem = document.getElementById('profileViews');
    const profileMessagesElem = document.getElementById('profileMessages');

    // Valeurs par défaut
    if (profileNameElem) {
      profileNameElem.textContent = 'Votre nom';
    }
    if (profileDetailsElem) {
      profileDetailsElem.textContent = 'Âge • Ville';
    }
    if (bioCharCountElem) {
      bioCharCountElem.textContent = '0';
    }
    if (profileViewsElem) {
      profileViewsElem.textContent = '0';
    }
    if (profileMessagesElem) {
      profileMessagesElem.textContent = '0';
    }

    // Mettre à jour les boutons de navigation
    updateNavigationButtons(false);
  } catch (error) {
    console.error('Erreur lors du chargement des données par défaut:', error);
  }
}

// Afficher l'aperçu du profil
function showProfilePreview() {
  try {
    const nomField = document.getElementById('profileNom');
    const ageField = document.getElementById('profileAge');
    const sexeField = document.getElementById('profileSexe');
    const villeField = document.getElementById('profileVille');
    const bioField = document.getElementById('profileBio');

    if (!nomField || !ageField || !sexeField || !villeField || !bioField) {
      showMessage('Erreur: Formulaire non trouvé', 'error');
      return;
    }

    const previewData = {
      nom: nomField.value || 'Nom non renseigné',
      age: ageField.value || 'Âge non renseigné',
      sexe: sexeField.value || 'Sexe non renseigné',
      localisation: villeField.value || 'Ville',
      bio: bioField.value || 'Bio non renseignée',
    };

    console.log('Données pour l\\' + 'aperçu:', previewData);

    const previewHTML = `
    <div class="preview-modal">
      <div class="preview-content">
        <div class="preview-header">
          <h3>Aperçu de votre profil</h3>
          <button onclick="closePreview()" class="close-btn">&times;</button>
        </div>
        <div class="preview-body">
          <div class="preview-profile">
            <div class="preview-avatar">
              <img src="/images/default-avatar.jpg" alt="Photo de profil">
            </div>
            <div class="preview-info">
              <h4>${previewData.nom}</h4>
              <p>${previewData.age} ans • ${previewData.localisation}</p>
              <p><strong>Bio:</strong> ${previewData.bio}</p>
            </div>
          </div>
        </div>
        <div class="preview-footer">
          <button onclick="closePreview()" class="btn-secondary">Fermer</button>
        </div>
      </div>
    </div>
  `;

    // Ajouter l'aperçu au DOM
    const previewContainer = document.createElement('div');
    previewContainer.innerHTML = previewHTML;
    document.body.appendChild(previewContainer);

    console.log('Aperçu du profil affiché');
  } catch (error) {
    console.error('Erreur lors de l\\' + 'affichage de l\\' + 'aperçu:', error);
    showMessage('Erreur lors de l\\' + 'affichage de l\\' + 'aperçu', 'error');
  }
}

// Fermer l'aperçu
function closePreview() {
  const previewModal = document.querySelector('.preview-modal');
  if (previewModal) {
    previewModal.parentElement.remove();
  }
}

// Fonction pour afficher les messages
function showMessage(message, type) {
  const messageContainer =
    document.getElementById('messageContainer') ||
    document.createElement('div');
  messageContainer.id = 'messageContainer';
  messageContainer.className = 'message-container';

  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${type}`;
  messageDiv.textContent = message;

  messageContainer.innerHTML = '';
  messageContainer.appendChild(messageDiv);

  if (!document.getElementById('messageContainer')) {
    document.body.appendChild(messageContainer);
  }

  // Retirer le message après 5 secondes
  setTimeout(() => {
    messageDiv.remove();
  }, 5000);
}

// Afficher le message de connexion
function showLoginMessage() {
  const profileManagement = document.querySelector('.profile-management');
  if (profileManagement) {
    profileManagement.innerHTML = `
      <div class="login-required">
        <div class="login-card">
          <h2>Connexion requise</h2>
          <p>Vous devez être connecté pour accéder à votre profil.</p>
          <div class="login-actions">
            <a href="/auth" class="btn-primary">Se connecter</a>
            <a href="/auth" class="btn-secondary">S'inscrire</a>
          </div>
        </div>
      </div>
    `;
  }

  // Mettre à jour les boutons de navigation
  updateNavigationButtons(false);
}

// Mettre à jour les boutons de navigation selon l'état de connexion
function updateNavigationButtons(isLoggedIn) {
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');

  if (isLoggedIn) {
    if (loginBtn) {
      loginBtn.textContent = 'Déconnexion';
      loginBtn.onclick = async () => {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('hotmeet_token')}`,
            },
          });
        } catch (error) {
          console.error('Erreur lors de la déconnexion:', error);
        }

        localStorage.removeItem('hotmeet_token');
        window.location.href = '/';
      };
    }
    if (registerBtn) {
      registerBtn.style.display = 'none';
    }
  } else {
    if (loginBtn) {
      loginBtn.textContent = 'Connexion';
      loginBtn.onclick = () => (window.location.href = '/auth');
    }
    if (registerBtn) {
      registerBtn.style.display = 'inline-block';
      registerBtn.onclick = () => (window.location.href = '/auth');
    }
  }
}

// Masquer le message de connexion
function hideLoginMessage() {
  const loginRequired = document.querySelector('.login-required');
  if (loginRequired) {
    loginRequired.style.display = 'none';
  }
}

// Gestion des régions européennes - Exactement comme sur la page d'inscription
function getRegionsByCountry(pays) {
  return window.europeanRegions?.[pays] || [];
}

function updateRegions(pays, regionSelect) {
  // Vider le sélecteur de régions
  regionSelect.innerHTML = '<option value="">Choisir une région...</option>';

  if (!pays) {
    return;
  }

  const regions = getRegionsByCountry(pays);

  regions.forEach(region => {
    const option = document.createElement('option');
    option.value = region.value;
    option.textContent = region.name;
    regionSelect.appendChild(option);
  });
}

// Charger les villes pour un pays donné
function loadCitiesForCountry(pays, villeSelect) {
  villeSelect.innerHTML = '<option value="">Choisir une ville...</option>';

  if (!pays) {
    return;
  }

  const cities = window.europeanCities?.[pays] || [];
  cities.forEach(city => {
    const option = document.createElement('option');
    option.value = city.value;
    option.textContent = city.name;
    villeSelect.appendChild(option);
  });
}

// Mettre à jour les villes en fonction de la région sélectionnée
function updateCities(pays, regionValue, villeSelect) {
  villeSelect.innerHTML = '<option value="">Choisir une ville...</option>';

  if (!pays || !regionValue) {
    // Si pas de pays ou pas de région sélectionnée, charger les villes du pays
    loadCitiesForCountry(pays, villeSelect);
    return;
  }

  // Pour l'instant, charger les villes principales du pays
  // À améliorer avec une vraie base de données villes par région
  loadCitiesForCountry(pays, villeSelect);
}

// Configuration des sélecteurs de localisation pour le profil
function setupLocationSelectors() {
  const paysSelect = document.getElementById('profilePays');
  const regionSelect = document.getElementById('profileRegion');
  const villeSelect = document.getElementById('profileVille');

  if (paysSelect && regionSelect && villeSelect) {
    // Événement changement de pays
    paysSelect.addEventListener('change', () => {
      updateRegions(paysSelect.value, regionSelect);
      updateCities(paysSelect.value, regionSelect.value, villeSelect);
    });

    // Événement changement de région
    regionSelect.addEventListener('change', () => {
      updateCities(paysSelect.value, regionSelect.value, villeSelect);
    });

    // Mettre à jour les régions et villes si un pays est déjà sélectionné
    // Utiliser un timeout pour s'assurer que le DOM est complètement chargé
    setTimeout(() => {
      if (paysSelect.value) {
        console.log(
          'Chargement automatique des régions pour le pays:',
          paysSelect.value
        );
        updateRegions(paysSelect.value, regionSelect);
        updateCities(paysSelect.value, regionSelect.value, villeSelect);

        // Sélectionner la région sauvegardée si elle existe
        const savedRegion = regionSelect.value;
        if (savedRegion) {
          // Attendre que les options soient chargées avant de sélectionner
          setTimeout(() => {
            regionSelect.value = savedRegion;
            console.log('Région restaurée:', savedRegion);
            // Mettre à jour les villes après avoir restauré la région
            updateCities(paysSelect.value, savedRegion, villeSelect);
          }, 200);
        }

        // Sélectionner la ville sauvegardée si elle existe
        const savedVille = villeSelect.value;
        if (savedVille) {
          setTimeout(() => {
            villeSelect.value = savedVille;
            console.log('Ville restaurée:', savedVille);
          }, 300);
        }
      }
    }, 500);
  }
}

// Initialisation de la page profil - VERSION COMPLÈTE
document.addEventListener('DOMContentLoaded', function () {
  try {
    console.log('=== INITIALISATION PAGE PROFIL ===');

    const token = localStorage.getItem('hotmeet_token');
    console.log('Token présent:', !!token);

    // Charger les données du profil
    loadProfileData();

    // Configurer le bouton d'aperçu
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
      previewBtn.addEventListener('click', showProfilePreview);
    }

    // NOUVEAU: Initialiser la gestion des photos
    setupPhotoManagement();

    // Charger les photos existantes
    loadPhotos();

    console.log('Page profil initialisée avec succès');
  } catch (error) {
    console.error(
      'Erreur lors de l\\' + 'initialisation de la page profil:',
      error
    );
  }
});

// Gestion du changement de photo de profil
function setupPhotoUpload() {
  const changeAvatarBtn = document.getElementById('changeAvatarBtn');

  if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener('click', () => {
      // Créer un input file dynamiquement
      const photoInput = document.createElement('input');
      photoInput.type = 'file';
      photoInput.accept = 'image/*';
      photoInput.style.display = 'none';

      // Ajouter temporairement au DOM
      document.body.appendChild(photoInput);

      // Déclencher le clic
      photoInput.click();

      // Gérer la sélection de fichier
      photoInput.addEventListener('change', async function (e) {
        const file = e.target.files[0];

        // Nettoyer l'input après utilisation
        document.body.removeChild(photoInput);

        if (!file) {
          return;
        }

        // Vérifier le type de fichier
        if (!file.type.startsWith('image/')) {
          showMessage('Le fichier doit être une image', 'error');
          return;
        }

        // Vérifier la taille (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          showMessage('L\\' + 'image ne doit pas dépasser 5MB', 'error');
          return;
        }

        try {
          showMessage('Upload de la photo en cours...', 'info');

          const token = localStorage.getItem('hotmeet_token');
          if (!token) {
            showMessage('Erreur: Non connecté', 'error');
            return;
          }

          const formData = new FormData();
          formData.append('photo', file);

          const response = await fetch('/api/uploads/profile-photo', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          const result = await response.json();

          if (result.success) {
            showMessage('Photo de profil mise à jour avec succès !', 'success');

            // Mettre à jour IMMÉDIATEMENT l'affichage de la photo avec la nouvelle URL
            const profileAvatar = document.getElementById('profileAvatar');
            const profilePhotoPreview = document.querySelector(
              '.profile-photo-preview img'
            );

            // Utiliser l'URL Cloudinary retournée par le serveur
            const newPhotoUrl = result.photo?.path || result.photo?.url;

            if (newPhotoUrl) {
              // Mettre à jour l'avatar principal
              if (profileAvatar) {
                profileAvatar.src = newPhotoUrl;
                profileAvatar.alt = 'Photo de profil mise à jour';
              }

              // Mettre à jour la prévisualisation si elle existe
              if (profilePhotoPreview) {
                profilePhotoPreview.src = newPhotoUrl;
                profilePhotoPreview.alt = 'Photo de profil mise à jour';
              }

              // Forcer le rafraîchissement du cache en ajoutant un timestamp
              const timestamp = new Date().getTime();
              const urlWithTimestamp = newPhotoUrl + '?t=' + timestamp;

              if (profileAvatar) profileAvatar.src = urlWithTimestamp;
              if (profilePhotoPreview)
                profilePhotoPreview.src = urlWithTimestamp;
            }

            // Recharger les données du profil pour synchroniser
            setTimeout(() => loadProfileData(), 500);
          } else {
            showMessage(
              result.error?.message ||
                'Erreur lors de l\\' + 'upload de la photo',
              'error'
            );
          }
        } catch (error) {
          console.error('Erreur lors de l\\' + 'upload de la photo:', error);
          showMessage('Erreur lors de l\\' + 'upload de la photo', 'error');
        }
      });
    });
  }
}

// Gestion du floutage/défloutage des photos
function setupPhotoBlurToggle() {
  const blurToggleBtn = document.getElementById('blurToggleBtn');
  const avatarActions = document.querySelector('.avatar-actions');

  // Créer le bouton et l'indicateur de statut s'ils n'existent pas
  if (!blurToggleBtn && avatarActions) {
    // Créer l'indicateur de statut
    const statusDiv = document.createElement('div');
    statusDiv.id = 'blurStatus';
    statusDiv.style.cssText = `
      font-size: 0.9rem;
      margin-top: 0.5rem;
      font-weight: 500;
      text-align: center;
    `;
    statusDiv.textContent = '📷 Statut de la photo';

    // Créer le bouton
    const newButton = document.createElement('button');
    newButton.id = 'blurToggleBtn';
    newButton.className = 'btn-secondary';
    newButton.textContent = 'Flouter/Déflouter la photo';
    newButton.style.marginTop = '0.5rem';

    avatarActions.appendChild(newButton);
    avatarActions.appendChild(statusDiv);
  }

  const toggleBtn = document.getElementById('blurToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', async () => {
      try {
        const token = localStorage.getItem('hotmeet_token');
        if (!token) {
          showMessage('Erreur: Non connecté', 'error');
          return;
        }

        // Récupérer l'ID de la photo de profil principale
        const userResponse = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!userResponse.ok) {
          showMessage('Erreur lors de la récupération du profil', 'error');
          return;
        }

        const userData = await userResponse.json();
        const user = userData.user || userData;

        if (
          !user.profile ||
          !user.profile.photos ||
          user.profile.photos.length === 0
        ) {
          showMessage('Aucune photo de profil trouvée', 'error');
          return;
        }

        // Trouver la photo de profil principale
        const profilePhoto =
          user.profile.photos.find(photo => photo.isProfile) ||
          user.profile.photos[0];
        if (!profilePhoto || !profilePhoto._id) {
          showMessage('Photo de profil non trouvée', 'error');
          return;
        }

        showMessage('Modification du floutage en cours...', 'info');

        const response = await fetch(
          `/api/uploads/photo/${profilePhoto._id}/blur`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();

        if (result.success) {
          const newState = result.photo.isBlurred ? 'floutée' : 'défloutée';
          showMessage(`Photo ${newState} avec succès !`, 'success');

          // Mettre à jour immédiatement l'affichage sans recharger toute la page
          const profileAvatarElem = document.getElementById('profileAvatar');
          const blurStatusElem = document.getElementById('blurStatus');

          if (profileAvatarElem) {
            if (result.photo.isBlurred) {
              profileAvatarElem.style.filter = 'blur(20px)';
              if (blurStatusElem) {
                blurStatusElem.textContent =
                  '🔄 Photo floutée - Cliquez pour déflouter';
                blurStatusElem.style.color = '#ff6b6b';
              }
            } else {
              profileAvatarElem.style.filter = 'none';
              if (blurStatusElem) {
                blurStatusElem.textContent = '✅ Photo visible';
                blurStatusElem.style.color = '#4caf50';
              }
            }
          }
        } else {
          showMessage(
            result.error?.message ||
              'Erreur lors de la modification du floutage',
            'error'
          );
        }
      } catch (error) {
        console.error('Erreur lors de la modification du floutage:', error);
        showMessage('Erreur lors de la modification du floutage', 'error');
      }
    });
  }
}

// Initialisation avec vérification d'authentification
document.addEventListener('DOMContentLoaded', function () {
  console.log('=== INITIALISATION PAGE PROFIL ===');

  // Configuration des sélecteurs de localisation (doit être fait avant le chargement des données)
  setupLocationSelectors();

  // Configuration de l'upload de photos
  setupPhotoUpload();
  setupPhotoBlurToggle();

  // Vérifier l'authentification
  const token = localStorage.getItem('hotmeet_token');
  const savedProfile = localStorage.getItem('hotmeet_user_profile');

  console.log('Token présent:', !!token);
  console.log('Profil sauvegardé présent:', !!savedProfile);

  if (!token && !savedProfile) {
    // Utilisateur non connecté -> afficher message de connexion
    console.log('Utilisateur non connecté - affichage du message de connexion');
    showLoginMessage();
    return;
  }

  // Utilisateur connecté ou vient de s'inscrire -> charger les données du profil
  console.log('Chargement des données du profil...');
  hideLoginMessage();

  // Charger les données du profil avec un délai pour s'assurer que les sélecteurs sont configurés
  setTimeout(() => {
    loadProfileData();
  }, 300);

  // Gestionnaire pour la suppression de compte
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', handleDeleteAccount);
  }
});

// Fonction pour gérer la suppression de compte
async function handleDeleteAccount() {
  const confirmed = confirm(
    '⚠️ ATTENTION ⚠️\n\n' +
      'Êtes-vous absolument sûr(e) de vouloir supprimer votre compte ?\n\n' +
      'Cette action:\n' +
      '• Supprimera définitivement votre profil\n' +
      '• Effacera toutes vos photos\n' +
      '• Supprimera tous vos messages\n' +
      '• Annulera vos abonnements\n' +
      '• EST IRRÉVERSIBLE\n\n' +
      'Tapez "OUI" pour confirmer'
  );

  if (!confirmed) {
    return;
  }

  // Demander le mot de passe pour confirmation
  const password = prompt(
    'Pour confirmer la suppression, veuillez saisir votre mot de passe:'
  );

  if (!password) {
    alert('Suppression annulée - mot de passe requis');
    return;
  }

  // Confirmation finale
  const finalConfirm = confirm(
    '🚨 DERNIÈRE CHANCE 🚨\n\n' +
      'Vous êtes sur le point de SUPPRIMER DÉFINITIVEMENT votre compte.\n\n' +
      'Cette action ne peut PAS être annulée.\n\n' +
      'Voulez-vous vraiment continuer ?'
  );

  if (!finalConfirm) {
    return;
  }

  try {
    showMessage('Suppression du compte en cours...', 'info');

    const token = localStorage.getItem('hotmeet_token');
    const response = await fetch('/api/users/delete-account', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        confirmPassword: password,
      }),
    });

    const data = await response.json();

    if (data.success) {
      showMessage('Compte supprimé avec succès', 'success');

      // Nettoyer le localStorage
      localStorage.removeItem('hotmeet_token');
      localStorage.removeItem('hotmeet_user_profile');

      // Rediriger vers la page d'accueil après 2 secondes
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else {
      showMessage(
        data.error?.message || 'Erreur lors de la suppression',
        'error'
      );
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du compte:', error);
    showMessage('Erreur lors de la suppression du compte', 'error');
  }
}

// ========================
// NOUVEAU SYSTÈME DE GESTION DES PHOTOS
// ========================

// Gestion des uploads de photos par type
function setupPhotoManagement() {
  // Créer un input file caché pour la photo de profil
  let profileInput = document.getElementById('profilePhotoInput');
  if (!profileInput) {
    profileInput = document.createElement('input');
    profileInput.type = 'file';
    profileInput.id = 'profilePhotoInput';
    profileInput.accept = 'image/*';
    profileInput.style.display = 'none';
    document.body.appendChild(profileInput);
  }

  // Connecter le bouton existant "Changer la photo"
  const changeAvatarBtn = document.getElementById('changeAvatarBtn');
  if (changeAvatarBtn) {
    changeAvatarBtn.onclick = () => profileInput.click();
  }

  // Upload photo de profil
  if (profileInput) {
    profileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) {
        uploadPhoto(file, 'profile');
      }
    });
  }

  // Upload photo de galerie
  const galleryPhotoInput = document.getElementById('galleryPhotoInput');
  if (galleryPhotoInput) {
    galleryPhotoInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) {
        uploadPhoto(file, 'gallery');
      }
    });
  }

  // Upload photo privée
  const privatePhotoInput = document.getElementById('privatePhotoInput');
  if (privatePhotoInput) {
    privatePhotoInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) {
        uploadPhoto(file, 'private');
      }
    });
  }

  // Connecter les boutons d'upload aux inputs
  const uploadGalleryBtn = document.getElementById('uploadGalleryBtn');
  if (uploadGalleryBtn) {
    uploadGalleryBtn.onclick = () => {
      const input = document.getElementById('galleryPhotoInput');
      if (input) input.click();
    };
  }

  const uploadPrivateBtn = document.getElementById('uploadPrivateBtn');
  if (uploadPrivateBtn) {
    uploadPrivateBtn.onclick = () => {
      const input = document.getElementById('privatePhotoInput');
      if (input) input.click();
    };
  }
}

// Fonction universelle d'upload de photo
async function uploadPhoto(file, type) {
  try {
    showMessage(`Upload de la photo ${type} en cours...`, 'info');

    const token = localStorage.getItem('hotmeet_token');
    if (!token) {
      showMessage('Erreur: Non connecté', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);

    // Déterminer l'endpoint selon le type
    let endpoint;
    switch (type) {
      case 'profile':
        endpoint = '/api/uploads/profile-photo';
        break;
      case 'gallery':
        endpoint = '/api/uploads/gallery-photo';
        break;
      case 'private':
        endpoint = '/api/uploads/private-photo';
        break;
      default:
        throw new Error('Type de photo invalide');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      showMessage(`Photo ${type} uploadée avec succès !`, 'success');

      // Mettre à jour l'affichage selon le type
      if (type === 'profile') {
        updateProfilePhotoDisplay(result.photo);
      } else {
        // Recharger toutes les photos pour mettre à jour les galeries
        loadPhotos();
      }

      // Recharger les données du profil
      setTimeout(() => loadProfileData(), 500);
    } else {
      showMessage(
        result.error?.message || `Erreur lors de l'upload de la photo ${type}`,
        'error'
      );
    }
  } catch (error) {
    console.error(`Erreur lors de l'upload de la photo ${type}:`, error);
    showMessage(`Erreur lors de l'upload de la photo ${type}`, 'error');
  }
}

// Mettre à jour l'affichage de la photo de profil
function updateProfilePhotoDisplay(photo) {
  const currentProfilePhoto = document.getElementById('currentProfilePhoto');
  const profileAvatar = document.getElementById('profileAvatar');

  if (photo && photo.path) {
    const photoUrl = photo.path + '?t=' + new Date().getTime();

    if (currentProfilePhoto) {
      currentProfilePhoto.src = photoUrl;
    }
    if (profileAvatar) {
      profileAvatar.src = photoUrl;
    }
  }
}

// Charger et afficher toutes les photos
function loadPhotos() {
  // Cette fonction sera appelée automatiquement par loadProfileData()
  // qui charge déjà les photos dans la structure existante
}

// Afficher les photos dans les galeries
function displayPhotos(photos) {
  if (!photos || !Array.isArray(photos)) return;

  const galleryContainer = document.getElementById('galleryPhotos');
  const privateContainer = document.getElementById('privatePhotos');

  if (galleryContainer) galleryContainer.innerHTML = '';
  if (privateContainer) privateContainer.innerHTML = '';

  photos.forEach(photo => {
    if (photo.type === 'gallery' || (!photo.type && !photo.isProfile)) {
      // Photo de galerie publique
      if (galleryContainer) {
        const photoElement = createPhotoElement(photo, 'gallery');
        galleryContainer.appendChild(photoElement);
      }
    } else if (photo.type === 'private') {
      // Photo privée
      if (privateContainer) {
        const photoElement = createPhotoElement(photo, 'private');
        privateContainer.appendChild(photoElement);
      }
    } else if (photo.isProfile || photo.type === 'profile') {
      // Photo de profil - déjà gérée par updateProfilePhotoDisplay
      updateProfilePhotoDisplay(photo);
    }
  });

  // Mettre à jour les compteurs et boutons
  updatePhotoLimits(photos);
}

// Créer un élément photo pour les galeries
function createPhotoElement(photo, type) {
  const div = document.createElement('div');
  div.className = 'photo-item';
  div.style.cssText =
    'position: relative; border-radius: 8px; overflow: hidden;';

  const img = document.createElement('img');
  img.src = photo.path;
  img.alt = `Photo ${type}`;
  img.style.cssText =
    'width: 100px; height: 100px; object-fit: cover; cursor: pointer;';

  // Ajouter effet de flou pour les photos privées
  if (photo.isBlurred && type === 'private') {
    img.style.filter = 'blur(10px)';
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.innerHTML = '✕';
  deleteBtn.style.cssText =
    'position: absolute; top: 5px; right: 5px; background: rgba(220,53,69,0.8); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 12px;';
  deleteBtn.onclick = () => deletePhoto(photo._id);

  div.appendChild(img);
  div.appendChild(deleteBtn);

  return div;
}

// Mettre à jour les limites et états des boutons
function updatePhotoLimits(photos) {
  const galleryPhotos =
    photos.filter(p => p.type === 'gallery' || (!p.type && !p.isProfile)) || [];
  const privatePhotos = photos.filter(p => p.type === 'private') || [];

  const addGalleryBtn = document.getElementById('addGalleryPhotoBtn');
  const addPrivateBtn = document.getElementById('addPrivatePhotoBtn');

  // Galerie (max 5)
  if (addGalleryBtn) {
    if (galleryPhotos.length >= 5) {
      addGalleryBtn.disabled = true;
      addGalleryBtn.textContent = 'Limite atteinte (5/5)';
    } else {
      addGalleryBtn.disabled = false;
      addGalleryBtn.textContent = `Ajouter une photo publique (${galleryPhotos.length}/5)`;
    }
  }

  // Privées (max 5)
  if (addPrivateBtn) {
    if (privatePhotos.length >= 5) {
      addPrivateBtn.disabled = true;
      addPrivateBtn.textContent = 'Limite atteinte (5/5)';
    } else {
      addPrivateBtn.disabled = false;
      addPrivateBtn.textContent = `Ajouter une photo privée (${privatePhotos.length}/5)`;
    }
  }
}

// Supprimer une photo
async function deletePhoto(photoId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
    return;
  }

  try {
    const token = localStorage.getItem('hotmeet_token');
    if (!token) {
      showMessage('Erreur: Non connecté', 'error');
      return;
    }

    const response = await fetch(`/api/uploads/photo/${photoId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Photo supprimée avec succès !', 'success');
      loadProfileData(); // Recharger pour mettre à jour l'affichage
    } else {
      showMessage(
        result.error?.message || 'Erreur lors de la suppression',
        'error'
      );
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de la photo:', error);
    showMessage('Erreur lors de la suppression de la photo', 'error');
  }
}
