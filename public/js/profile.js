// JavaScript spécifique au profil - Version 2.1 FORCED REFRESH
console.log(
  '🔧 PROFIL PAGE VERSION 2.1 - CACHE FORCÉ - ' + new Date().toISOString()
);
console.log(
  '🚨 NOUVELLE VERSION CHARGÉE ! Si vous voyez ce message, la correction est active.'
);

// Gestion du formulaire de profil
document
  .getElementById('profileForm')
  .addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = {
      profile: {
        nom: document.getElementById('profileNom').value.trim(),
        age: parseInt(document.getElementById('profileAge').value),
        sexe: document.getElementById('profileSexe').value,
        localisation: {
          pays: document.getElementById('profilePays').value.trim(),
          region: document.getElementById('profileRegion').value.trim(),
          ville: document.getElementById('profileVille').value.trim(),
        },
        bio: document.getElementById('profileBio').value.trim(),
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
      console.log("Données brutes reçues de l'API:", data);

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

          // NOUVEAU: Mettre à jour la photo de profil
          const profileAvatarElem = document.getElementById('profileAvatar');
          if (
            profileAvatarElem &&
            user.profile.photos &&
            user.profile.photos.length > 0
          ) {
            const firstPhoto = user.profile.photos[0];
            // Utiliser 'path' au lieu de 'url' car la structure a 'path' pas 'url'
            if (firstPhoto && (firstPhoto.url || firstPhoto.path)) {
              const photoUrl = firstPhoto.url || firstPhoto.path;
              console.log('Photo utilisateur trouvée:', photoUrl);
              profileAvatarElem.src = photoUrl;
              profileAvatarElem.alt = `Photo de ${user.profile.nom || 'profil'}`;
            } else {
              console.log(
                "Pas d'URL/path de photo, utilisation du placeholder"
              );
            }
          } else {
            console.log('Pas de photos dans le profil utilisateur');
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

    console.log("Données pour l'aperçu:", previewData);

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
    console.error("Erreur lors de l'affichage de l'aperçu:", error);
    showMessage("Erreur lors de l'affichage de l'aperçu", 'error');
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

// Gestion des régions européennes
const regionsEurope = {
  france: [
    'Auvergne-Rhône-Alpes',
    'Bourgogne-Franche-Comté',
    'Bretagne',
    'Centre-Val de Loire',
    'Corse',
    'Grand Est',
    'Hauts-de-France',
    'Île-de-France',
    'Normandie',
    'Nouvelle-Aquitaine',
    'Occitanie',
    'Pays de la Loire',
    "Provence-Alpes-Côte d'Azur",
  ],
  suisse: [
    'Zurich',
    'Berne',
    'Lucerne',
    'Uri',
    'Schwyz',
    'Obwald',
    'Nidwald',
    'Glaris',
    'Zoug',
    'Fribourg',
    'Soleure',
    'Bâle-Ville',
    'Bâle-Campagne',
    'Schaffhouse',
    'Appenzell Rhodes-Extérieures',
    'Appenzell Rhodes-Intérieures',
    'Saint-Gall',
    'Grisons',
    'Argovie',
    'Thurgovie',
    'Tessin',
    'Vaud',
    'Valais',
    'Neuchâtel',
    'Genève',
    'Jura',
  ],
  belgique: [
    'Anvers',
    'Limbourg',
    'Flandre-Orientale',
    'Brabant flamand',
    'Flandre-Occidentale',
    'Hainaut',
    'Liège',
    'Luxembourg',
    'Namur',
    'Brabant wallon',
    'Bruxelles-Capitale',
  ],
};

// Initialisation des événements pour les pays/régions
document.addEventListener('DOMContentLoaded', function () {
  const paysSelect = document.getElementById('profilePays');
  const regionSelect = document.getElementById('profileRegion');

  if (paysSelect && regionSelect) {
    paysSelect.addEventListener('change', function () {
      const selectedCountry = this.value.toLowerCase();
      regionSelect.innerHTML =
        '<option value="">Sélectionnez votre région</option>';

      if (regionsEurope[selectedCountry]) {
        regionsEurope[selectedCountry].forEach(region => {
          const option = document.createElement('option');
          option.value = region.toLowerCase().replace(/\s+/g, '-');
          option.textContent = region;
          regionSelect.appendChild(option);
        });
      }
    });
  }
});

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

    console.log('Page profil initialisée avec succès');
  } catch (error) {
    console.error("Erreur lors de l'initialisation de la page profil:", error);
  }
});

// Initialisation avec vérification d'authentification
document.addEventListener('DOMContentLoaded', function () {
  console.log('=== INITIALISATION PAGE PROFIL ===');

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
  loadProfileData();
});
