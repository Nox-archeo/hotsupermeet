// HotMeet - JavaScript pour la page d'authentification

class AuthPage {
  constructor() {
    this.currentTab = 'login';
    this.init();
  }

  init() {
    this.setupTabSwitching();
    this.setupLoginForm();
    this.setupRegisterForm();
    this.setupPhotoUpload();
    this.setupLocationSelectors();
    this.setupForgotPassword();
    this.checkUrlParams();
  }

  // Configuration de la commutation d'onglets
  setupTabSwitching() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const switchLinks = document.querySelectorAll('.switch-tab');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    switchLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const tab = link.dataset.tab;
        this.switchTab(tab);
      });
    });
  }

  // Commutation d'onglet
  switchTab(tab) {
    // Désactiver tous les onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelectorAll('.auth-card').forEach(card => {
      card.classList.remove('active');
    });

    // Activer l'onglet sélectionné
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Card`).classList.add('active');
    this.currentTab = tab;
  }

  // Configuration du formulaire de connexion
  setupLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) {
      return;
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      await this.handleLogin(form);
    });
  }

  // Configuration du formulaire d'inscription
  setupRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) {
      return;
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      await this.handleRegister(form);
    });

    // Validation en temps réel du mot de passe
    const password = document.getElementById('registerPassword');
    const confirmPassword = document.getElementById('confirmPassword');

    if (password && confirmPassword) {
      confirmPassword.addEventListener('input', () => {
        this.validatePasswordMatch(password, confirmPassword);
      });
    }
  }

  // Configuration de l'upload de photos
  setupPhotoUpload() {
    const photoInput = document.getElementById('profilePhoto');
    const preview = document.getElementById('profilePhotoPreview');

    if (photoInput && preview) {
      photoInput.addEventListener('change', e => {
        this.handlePhotoUpload(e.target, preview);
      });
    }
  }

  // Configuration des sélecteurs de localisation
  setupLocationSelectors() {
    const paysSelect = document.getElementById('pays');
    const regionSelect = document.getElementById('region');

    if (paysSelect && regionSelect) {
      paysSelect.addEventListener('change', () => {
        this.updateRegions(paysSelect.value, regionSelect);
      });
    }
  }

  // Mise à jour des régions en fonction du pays sélectionné
  updateRegions(pays, regionSelect) {
    // Vider le sélecteur de régions
    regionSelect.innerHTML = '<option value="">Choisir une région...</option>';

    if (!pays) {
      return;
    }

    const regions = this.getRegionsByCountry(pays);

    regions.forEach(region => {
      const option = document.createElement('option');
      option.value = region.value;
      option.textContent = region.name;
      regionSelect.appendChild(option);
    });
  }

  // Obtenir les régions par pays
  getRegionsByCountry(pays) {
    return window.europeanRegions?.[pays] || [];
  }

  // Configuration du mot de passe oublié
  setupForgotPassword() {
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', e => {
        e.preventDefault();
        this.showForgotPasswordModal();
      });
    }
  }

  // Afficher le modal de mot de passe oublié
  showForgotPasswordModal() {
    // Créer le modal
    const modal = document.createElement('div');
    modal.className = 'forgot-password-modal';
    modal.innerHTML = `
      <div class="forgot-password-content">
        <div class="modal-header">
          <h3>Mot de passe oublié</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p>Entrez votre adresse email pour recevoir un lien de réinitialisation</p>
          <form id="forgotPasswordForm" class="modal-form">
            <div class="form-group">
              <label for="forgotEmail">Email</label>
              <input
                type="email"
                id="forgotEmail"
                name="email"
                required
                class="form-input"
              />
            </div>
            <button type="submit" class="btn-primary">Envoyer le lien</button>
          </form>
        </div>
      </div>
    `;

    // Ajouter le modal à la page
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Gérer la fermeture du modal
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
      modal.remove();
      document.body.style.overflow = 'auto';
    });

    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
      }
    });

    // Gérer l'envoi du formulaire
    const form = modal.querySelector('#forgotPasswordForm');
    form.addEventListener('submit', e => {
      e.preventDefault();
      this.handleForgotPassword(form);
    });
  }

  // Gérer la demande de réinitialisation
  async handleForgotPassword(form) {
    const formData = new FormData(form);
    const email = formData.get('email');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success) {
        this.showMessage(result.message, 'success');
        // Fermer le modal après succès
        const modal = document.querySelector('.forgot-password-modal');
        if (modal) {
          modal.remove();
          document.body.style.overflow = 'auto';
        }
      } else {
        this.showError(result.error.message || 'Erreur lors de lenvoi du lien');
      }
    } catch (error) {
      console.error('Erreur:', error);
      this.showError('Erreur lors de lenvoi du lien. Veuillez réessayer.');
    }
  }

  // Vérification des paramètres d'URL
  checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const registerParam = urlParams.get('register');

    if (registerParam) {
      this.switchTab('register');
    }
  }

  // Gestion de la connexion
  async handleLogin(form) {
    const formData = new FormData(form);
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        // Sauvegarder le token et rediriger
        localStorage.setItem('hotmeet_token', result.token);
        this.showSuccess('Connexion réussie !');
        setTimeout(() => {
          // Utiliser la redirection auth-guard si disponible, sinon profil par défaut
          if (window.handlePostLoginRedirect) {
            window.handlePostLoginRedirect();
          } else {
            window.location.href = '/profile';
          }
        }, 1000);
      } else {
        this.showError(result.error.message || 'Erreur de connexion');
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      this.showError('Erreur de connexion. Veuillez réessayer.');
    }
  }

  // Gestion de l'inscription
  async handleRegister(form) {
    // Validation côté client
    if (!this.validateRegisterForm(form)) {
      return;
    }

    const formData = new FormData(form);
    const profilePhoto = formData.get('profilePhoto');
    const blurPhoto = formData.get('blurPhoto') === 'on'; // Récupérer l'état de la checkbox

    // Créer un FormData pour envoyer tout en une seule requête
    const registrationData = new FormData();

    // Ajouter les données de base
    registrationData.append('email', formData.get('email'));
    registrationData.append('password', formData.get('password'));
    registrationData.append('nom', formData.get('nom'));
    registrationData.append('age', formData.get('age'));
    registrationData.append('sexe', formData.get('sexe'));
    registrationData.append('pays', formData.get('pays'));
    registrationData.append('region', formData.get('region'));
    registrationData.append('ville', formData.get('ville'));
    registrationData.append('bio', formData.get('bio') || '');
    registrationData.append('blurPhoto', blurPhoto ? 'on' : ''); // Ajouter l'état de floutage

    // Ajouter la photo si elle existe
    if (profilePhoto && profilePhoto.size > 0) {
      registrationData.append('profilePhoto', profilePhoto);
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        body: registrationData,
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccess('Inscription réussie !');
        localStorage.setItem('hotmeet_token', result.token);

        // Sauvegarder les données du profil dans le localStorage pour la page de profil
        localStorage.setItem(
          'hotmeet_user_profile',
          JSON.stringify(result.user.profile)
        );
        localStorage.setItem(
          'hotmeet_user_stats',
          JSON.stringify(result.user.stats)
        );

        setTimeout(() => {
          // Utiliser la redirection auth-guard si disponible, sinon profil par défaut
          if (window.handlePostLoginRedirect) {
            window.handlePostLoginRedirect();
          } else {
            window.location.href = '/profile';
          }
        }, 1500);
      } else {
        this.showError(result.error.message || 'Erreur d\\' + 'inscription');
      }
    } catch (error) {
      console.error('Erreur d\\' + 'inscription:', error);
      this.showError('Erreur d\\' + 'inscription. Veuillez réessayer.');
    }
  }

  // Validation du formulaire d'inscription
  validateRegisterForm(form) {
    const formData = new FormData(form);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    const acceptTerms = formData.get('acceptTerms');

    // Vérifier la correspondance des mots de passe
    if (password !== confirmPassword) {
      this.showError('Les mots de passe ne correspondent pas');
      return false;
    }

    // Vérifier l'acceptation des conditions
    if (!acceptTerms) {
      this.showError('Veuillez accepter les conditions d\\' + 'utilisation');
      return false;
    }

    // Vérifier l'âge
    const age = parseInt(formData.get('age'));
    if (age < 18) {
      this.showError('Vous devez avoir au moins 18 ans pour vous inscrire');
      return false;
    }

    return true;
  }

  // Validation de la correspondance des mots de passe
  validatePasswordMatch(password, confirmPassword) {
    if (password.value !== confirmPassword.value) {
      confirmPassword.style.borderColor = '#ff6b6b';
    } else {
      confirmPassword.style.borderColor = '#ddd';
    }
  }

  // Gestion de l'upload de photo
  handlePhotoUpload(input, preview) {
    const file = input.files[0];
    if (!file) {
      return;
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      this.showError('Veuillez sélectionner une image valide');
      input.value = '';
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.showError('L\\' + 'image ne doit pas dépasser 5MB');
      input.value = '';
      return;
    }

    // Afficher la prévisualisation
    const reader = new FileReader();
    reader.onload = e => {
      preview.innerHTML = `
                <div class="photo-preview-item">
                    <img src="${e.target.result}" alt="Prévisualisation">
                    <button type="button" class="remove-photo">×</button>
                </div>
            `;

      // Ajouter l'écouteur pour supprimer la photo
      preview.querySelector('.remove-photo').addEventListener('click', () => {
        preview.innerHTML = '';
        input.value = '';
      });
    };
    reader.readAsDataURL(file);
  }

  // Upload de la photo de profil
  async uploadProfilePhoto(userId, photoFile) {
    const formData = new FormData();
    formData.append('photo', photoFile);
    formData.append('userId', userId);

    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch('/api/uploads/profile-photo', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\\' + 'upload de la photo');
      }
    } catch (error) {
      console.error('Erreur upload photo:', error);
      this.showError('Erreur lors de l\\' + 'upload de la photo de profil');
    }
  }

  // Affichage des messages de succès
  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  // Affichage des erreurs
  showError(message) {
    this.showMessage(message, 'error');
  }

  // Affichage des messages
  showMessage(message, type) {
    // Supprimer les anciens messages
    const oldMessages = document.querySelectorAll('.auth-message');
    oldMessages.forEach(msg => msg.remove());

    // Créer le nouveau message
    const messageDiv = document.createElement('div');
    messageDiv.className = `auth-message ${type}`;
    messageDiv.textContent = message;

    // Insérer le message
    const activeCard = document.querySelector('.auth-card.active');
    if (activeCard) {
      activeCard.insertBefore(messageDiv, activeCard.querySelector('form'));
    }

    // Supprimer après 5 secondes
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }
}

// Initialisation lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
  window.authPage = new AuthPage();
});

// Styles CSS pour les messages et l'interface
const styles = `
    .auth-tabs {
        display: flex;
        margin-bottom: 2rem;
        border-bottom: 1px solid #ddd;
    }
    
    .tab-btn {
        padding: 1rem 2rem;
        background: none;
        border: none;
        border-bottom: 3px solid transparent;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.3s;
    }
    
    .tab-btn.active {
        border-bottom-color: #007bff;
        color: #007bff;
    }
    
    .auth-card {
        display: none;
    }
    
    .auth-card.active {
        display: block;
    }
    
    .photo-upload {
        margin-top: 0.5rem;
    }
    
    .photo-input {
        display: none;
    }
    
    .photo-upload-btn {
        display: inline-block;
        padding: 0.5rem 1rem;
        background: #f8f9fa;
        border: 1px dashed #ddd;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.3s;
    }
    
    .photo-upload-btn:hover {
        background: #e9ecef;
    }
    
    .photo-preview {
        margin-top: 1rem;
    }
    
    .photo-preview-item {
        position: relative;
        display: inline-block;
        margin-right: 1rem;
    }
    
    .photo-preview-item img {
        width: 100px;
        height: 100px;
        object-fit: cover;
        border-radius: 4px;
    }
    
    .remove-photo {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ff6b6b;
        color: white;
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        cursor: pointer;
        font-size: 14px;
    }
    
    .auth-message {
        padding: 1rem;
        margin-bottom: 1rem;
        border-radius: 4px;
        font-weight: 500;
    }
    
    .auth-message.success {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }
    
    .auth-message.error {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }
    
    .checkbox-label {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        font-size: 0.9rem;
    }
    
    .checkbox-label input {
        margin-top: 0.2rem;
    }
    
    .forgot-password-link {
        text-align: center;
        margin-top: 1rem;
    }
    
    .forgot-password-link a {
        color: #007bff;
        text-decoration: none;
        font-size: 0.9rem;
    }
    
    .forgot-password-link a:hover {
        text-decoration: underline;
    }
    
    .forgot-password-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }
    
    .forgot-password-content {
        background: white;
        border-radius: 8px;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .modal-header h3 {
        margin: 0;
        color: #333;
    }
    
    .close-modal {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #666;
    }
    
    .close-modal:hover {
        color: #333;
    }
    
    .modal-body p {
        margin-bottom: 1rem;
        color: #666;
    }
    
    .modal-form .form-group {
        margin-bottom: 1rem;
    }
    
    .modal-form .btn-primary {
        width: 100%;
    }
`;

// Ajouter les styles à la page
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
