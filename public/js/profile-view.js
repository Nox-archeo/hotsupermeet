// Profile View JavaScript
class ProfileView {
  constructor() {
    this.userId = null;
    this.userProfile = null;
    this.currentUser = null;
    this.init();
  }

  init() {
    // Récupérer l'ID utilisateur depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    this.userId = urlParams.get('id');

    if (!this.userId) {
      this.showError('ID utilisateur manquant');
      return;
    }

    // Vérifier l'authentification
    this.checkAuthAndLoadProfile();

    // Initialiser les événements
    this.initializeEventListeners();
  }

  async checkAuthAndLoadProfile() {
    try {
      const token = localStorage.getItem('hotmeet_token');
      if (!token) {
        window.location.href = '/auth';
        return;
      }

      // Récupérer les infos de l'utilisateur actuel
      const currentUserResponse = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!currentUserResponse.ok) {
        window.location.href = '/auth';
        return;
      }

      this.currentUser = await currentUserResponse.json();

      // Vérifier si c'est son propre profil
      if (this.currentUser.user.id === this.userId) {
        window.location.href = '/profile';
        return;
      }

      // Charger le profil à afficher
      await this.loadProfile();
    } catch (error) {
      console.error("Erreur d'authentification:", error);
      window.location.href = '/auth';
    }
  }

  async loadProfile() {
    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch(`/api/users/${this.userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          this.showError('Profil non trouvé');
        } else {
          this.showError('Erreur lors du chargement du profil');
        }
        return;
      }

      const data = await response.json();
      this.userProfile = data.user;

      this.displayProfile();
      this.hideLoading();
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      this.showError('Erreur lors du chargement du profil');
    }
  }

  displayProfile() {
    const profile = this.userProfile.profile;
    const stats = this.userProfile.stats;

    // Titre de la page
    document.title = `${profile.nom} - HotMeet`;

    // Photo de profil
    const profilePhoto =
      profile.photos?.find(p => p.isProfile) || profile.photos?.[0];
    if (profilePhoto) {
      document.getElementById('profilePhoto').src = profilePhoto.path;
    } else {
      document.getElementById('profilePhoto').src =
        '/images/default-avatar.png';
    }

    // Informations de base
    document.getElementById('profileName').textContent = profile.nom;

    const localisation = profile.localisation;
    const locationText = localisation
      ? `${localisation.ville}, ${localisation.region}, ${localisation.pays}`
      : '';
    document.getElementById('profileDetails').textContent =
      `${profile.age} ans • ${locationText}`;

    // Statut en ligne
    if (this.userProfile.isOnline) {
      document.getElementById('onlineStatus').className =
        'status-indicator online';
      document.getElementById('statusText').textContent = 'En ligne';
    } else {
      document.getElementById('onlineStatus').className =
        'status-indicator offline';
      const lastActive = new Date(stats.lastActive);
      const now = new Date();
      const diffMs = now - lastActive;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      let lastSeenText = 'Hors ligne';
      if (diffDays > 0) {
        lastSeenText = `Vu il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
      } else if (diffHours > 0) {
        lastSeenText = `Vu il y a ${diffHours}h`;
      } else {
        lastSeenText = 'Vu récemment';
      }

      document.getElementById('statusText').textContent = lastSeenText;
    }

    // Statistiques
    document.getElementById('profileViews').textContent =
      stats.profileViews || 0;

    const joinDate = new Date(stats.joinDate);
    const monthNames = [
      'Jan',
      'Fév',
      'Mar',
      'Avr',
      'Mai',
      'Jun',
      'Jul',
      'Aoû',
      'Sep',
      'Oct',
      'Nov',
      'Déc',
    ];
    document.getElementById('memberSince').textContent =
      `${monthNames[joinDate.getMonth()]} ${joinDate.getFullYear()}`;

    // Bio
    if (profile.bio) {
      document.getElementById('profileBio').textContent = profile.bio;
    } else {
      document.getElementById('bioSection').style.display = 'none';
    }

    // Photos
    this.displayPhotos(profile.photos || []);

    // Pratiques
    if (profile.pratiques && profile.pratiques.length > 0) {
      this.displayPractices(profile.pratiques);
    } else {
      document.getElementById('practicesSection').style.display = 'none';
    }

    // Préférences (si disponibles)
    if (this.userProfile.preferences) {
      this.displayPreferences(this.userProfile.preferences);
    } else {
      document.getElementById('preferencesSection').style.display = 'none';
    }
  }

  displayPhotos(photos) {
    const galleryPhotos = photos.filter(
      p => p.type === 'gallery' || (!p.type && !p.isProfile)
    );
    const privatePhotos = photos.filter(p => p.type === 'private');

    // Photos de galerie
    const galleryContainer = document.getElementById('galleryPhotos');
    if (galleryPhotos.length > 0) {
      galleryContainer.innerHTML = galleryPhotos
        .map(
          photo => `
        <div class="photo-item">
          <img src="${photo.path}" alt="Photo de galerie" class="gallery-photo" onclick="openPhotoModal('${photo.path}')"/>
        </div>
      `
        )
        .join('');
    } else {
      galleryContainer.innerHTML =
        '<p class="no-photos">Aucune photo de galerie</p>';
    }

    // Photos privées
    const privateContainer = document.getElementById('privatePhotos');
    const privateSection = document.getElementById('privatePhotosSection');

    if (privatePhotos.length > 0) {
      document.getElementById('privatePhotoCount').textContent =
        `(${privatePhotos.length})`;
      privateContainer.innerHTML = privatePhotos
        .map(
          photo => `
        <div class="photo-item private-photo">
          <img src="${photo.path}" alt="Photo privée" class="gallery-photo ${photo.isBlurred ? 'blurred' : ''}" />
          ${
            photo.isBlurred
              ? `
            <button class="unblur-btn" onclick="requestUnblur('${photo._id}')">
              Demander à dévoiler
            </button>
          `
              : ''
          }
        </div>
      `
        )
        .join('');
    } else {
      privateSection.style.display = 'none';
    }

    // Compteur total
    document.getElementById('photoCount').textContent = `(${photos.length})`;
  }

  displayPractices(practices) {
    const practicesContainer = document.getElementById('profilePractices');
    practicesContainer.innerHTML = practices
      .map(practice => `<span class="practice-tag">${practice}</span>`)
      .join('');
  }

  displayPreferences(preferences) {
    const preferencesContainer = document.getElementById('profilePreferences');

    const ageRange = `${preferences.ageMin || 18} - ${preferences.ageMax || 100} ans`;
    const sexeRecherche =
      preferences.sexeRecherche === 'tous' ? 'Tous' : preferences.sexeRecherche;

    preferencesContainer.innerHTML = `
      <div class="preference-item">
        <strong>Âge recherché :</strong> ${ageRange}
      </div>
      <div class="preference-item">
        <strong>Sexe recherché :</strong> ${sexeRecherche}
      </div>
      ${
        preferences.pratiquesRecherchees &&
        preferences.pratiquesRecherchees.length > 0
          ? `
        <div class="preference-item">
          <strong>Pratiques recherchées :</strong>
          <div class="practices-list">
            ${preferences.pratiquesRecherchees.map(p => `<span class="practice-tag">${p}</span>`).join('')}
          </div>
        </div>
      `
          : ''
      }
    `;
  }

  initializeEventListeners() {
    // Message button
    document.getElementById('sendMessageBtn').addEventListener('click', () => {
      this.openMessageModal();
    });

    // Message form
    document.getElementById('messageForm').addEventListener('submit', e => {
      e.preventDefault();
      this.sendMessage();
    });

    // Character count for message
    document.getElementById('messageContent').addEventListener('input', e => {
      document.getElementById('messageCharCount').textContent =
        e.target.value.length;
    });

    // Favorite button
    document.getElementById('addFavoriteBtn').addEventListener('click', () => {
      this.toggleFavorite();
    });

    // Block button
    document.getElementById('blockUserBtn').addEventListener('click', () => {
      this.blockUser();
    });

    // CSP FIX: Boutons avec onclick remplacés par addEventListener
    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.history.back();
      });
    }

    // Modal close buttons
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', () => {
        this.closeMessageModal();
      });
    }

    const modalCancelBtn = document.getElementById('modalCancelBtn');
    if (modalCancelBtn) {
      modalCancelBtn.addEventListener('click', () => {
        this.closeMessageModal();
      });
    }
  }

  openMessageModal() {
    document.getElementById('messageModal').style.display = 'flex';
    document.getElementById('messageContent').focus();
  }

  closeMessageModal() {
    document.getElementById('messageModal').style.display = 'none';
    document.getElementById('messageContent').value = '';
    document.getElementById('messageCharCount').textContent = '0';
  }

  async sendMessage() {
    try {
      const content = document.getElementById('messageContent').value.trim();
      if (!content) return;

      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId: this.userId,
          content: content,
        }),
      });

      if (response.ok) {
        this.showMessage('Message envoyé avec succès !', 'success');
        this.closeMessageModal();
        // Optionnel: rediriger vers la page des messages
        setTimeout(() => {
          window.location.href = '/messages';
        }, 1500);
      } else {
        const error = await response.json();
        this.showMessage(
          error.error?.message || "Erreur lors de l'envoi du message",
          'error'
        );
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      this.showMessage("Erreur lors de l'envoi du message", 'error');
    }
  }

  async toggleFavorite() {
    // TODO: Implémenter le système de favoris
    this.showMessage('Fonctionnalité favoris à venir', 'info');
  }

  async blockUser() {
    if (!confirm('Êtes-vous sûr de vouloir bloquer cet utilisateur ?')) {
      return;
    }

    // TODO: Implémenter le système de blocage
    this.showMessage('Fonctionnalité blocage à venir', 'info');
  }

  showLoading() {
    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('profileContent').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
  }

  hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('profileContent').style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
  }

  showError(message) {
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('profileContent').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('errorMessage').querySelector('p').textContent =
      message;
  }

  showMessage(message, type = 'info') {
    // Créer et afficher un message toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      animation: slideInRight 0.3s ease;
    `;

    // Couleurs selon le type
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      info: '#17a2b8',
      warning: '#ffc107',
    };
    toast.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(toast);

    // Supprimer après 3 secondes
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Fonctions globales pour les événements onclick
function closeMessageModal() {
  document.getElementById('messageModal').style.display = 'none';
  document.getElementById('messageContent').value = '';
  document.getElementById('messageCharCount').textContent = '0';
}

function openPhotoModal(photoUrl) {
  // TODO: Implémenter modal de visualisation photo
  window.open(photoUrl, '_blank');
}

async function requestUnblur(photoId) {
  try {
    const token = localStorage.getItem('hotmeet_token');
    const response = await fetch(
      `/api/uploads/photo/${photoId}/unblur-request`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      profileView.showMessage('Demande de dévoilement envoyée !', 'success');
    } else {
      const error = await response.json();
      profileView.showMessage(
        error.error?.message || 'Erreur lors de la demande',
        'error'
      );
    }
  } catch (error) {
    console.error('Erreur lors de la demande de dévoilement:', error);
    profileView.showMessage('Erreur lors de la demande', 'error');
  }
}

// CSS pour les animations toast
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }

  .profile-photo-large {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid #fff;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  .profile-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    margin: -2rem -2rem 2rem -2rem;
    border-radius: 0 0 20px 20px;
  }

  .profile-header-content {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .profile-photo-container {
    position: relative;
  }

  .profile-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    font-size: 0.9rem;
  }

  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
  }

  .status-indicator.online {
    background: #28a745;
    box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.3);
  }

  .status-indicator.offline {
    background: #6c757d;
  }

  .profile-stats {
    display: flex;
    gap: 2rem;
    margin-top: 1rem;
  }

  .stat-item {
    text-align: center;
  }

  .stat-number {
    display: block;
    font-size: 1.5rem;
    font-weight: bold;
  }

  .stat-label {
    font-size: 0.8rem;
    opacity: 0.8;
  }

  .profile-actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .profile-section {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
  }

  .profile-section h2, .profile-section h3 {
    color: #333;
    margin-bottom: 1rem;
  }

  .photo-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1rem;
  }

  .photo-item {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
  }

  .gallery-photo {
    width: 100%;
    height: 120px;
    object-fit: cover;
    cursor: pointer;
    transition: transform 0.3s ease;
  }

  .gallery-photo:hover {
    transform: scale(1.05);
  }

  .gallery-photo.blurred {
    filter: blur(10px);
  }

  .unblur-btn {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 107, 107, 0.9);
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .practice-tag {
    display: inline-block;
    background: #e9ecef;
    color: #495057;
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.9rem;
    margin: 0.2rem;
  }

  .preference-item {
    margin-bottom: 1rem;
  }

  .practices-list {
    margin-top: 0.5rem;
  }

  .modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #eee;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #999;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: vertical;
    font-family: inherit;
  }

  .char-count {
    color: #666;
    font-size: 0.8rem;
    text-align: right;
    display: block;
    margin-top: 0.25rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .no-photos {
    grid-column: 1 / -1;
    text-align: center;
    color: #666;
    padding: 2rem;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .private-photos-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #eee;
  }

  .private-photos-info {
    background: #fff3cd;
    color: #856404;
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  @media (max-width: 768px) {
    .profile-header-content {
      flex-direction: column;
      text-align: center;
    }

    .profile-stats {
      justify-content: center;
    }

    .profile-actions {
      flex-direction: column;
    }

    .photo-gallery {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }

    .gallery-photo {
      height: 100px;
    }
  }
`;
document.head.appendChild(style);

// Initialiser l'application
let profileView;
document.addEventListener('DOMContentLoaded', () => {
  profileView = new ProfileView();
});
