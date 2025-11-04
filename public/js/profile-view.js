// JavaScript pour la page de visualisation de profil
class SimpleProfileView {
  constructor() {
    this.userId = null;
    this.init();
  }

  init() {
    const urlParams = new URLSearchParams(window.location.search);
    this.userId = urlParams.get('id');

    if (!this.userId) {
      this.showError('ID utilisateur manquant');
      return;
    }

    this.loadProfile();
    this.initEventListeners();
  }

  async loadProfile() {
    try {
      const token = localStorage.getItem('hotmeet_token');
      if (!token) {
        window.location.href = '/auth';
        return;
      }

      const response = await fetch(`/api/users/${this.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        this.showError('Profil non trouvé');
        return;
      }

      const data = await response.json();
      console.log('Données reçues de l\\' + 'API:', data);
      this.displayProfile(data.user);
      this.hideLoading();
    } catch (error) {
      this.showError('Erreur lors du chargement');
    }
  }

  displayProfile(user) {
    const profile = user.profile;

    // Titre
    document.title = `${profile.nom} - HotMeet`;

    // Photo
    const profilePhoto =
      profile.photos?.find(p => p.isProfile) || profile.photos?.[0];
    document.getElementById('profilePhoto').src =
      profilePhoto?.path || '/images/default-avatar.jpg';

    // Infos
    document.getElementById('profileName').textContent = profile.nom;
    const location = profile.localisation;
    const locationText = location
      ? `${location.ville}, ${location.region}, ${location.pays}`
      : '';
    document.getElementById('profileDetails').textContent =
      `${profile.age} ans • ${locationText}`;

    // Stats
    document.getElementById('profileViews').textContent =
      user.stats?.profileViews || 0;
    const joinDate = new Date(user.stats?.joinDate);
    document.getElementById('memberSince').textContent =
      `${joinDate.getMonth() + 1}/${joinDate.getFullYear()}`;

    // Bio
    if (profile.bio) {
      document.getElementById('profileBio').textContent = profile.bio;
    } else {
      document.getElementById('bioSection').style.display = 'none';
    }

    // Photos
    const photos = profile.photos?.filter(p => !p.isProfile) || [];
    const galleryContainer = document.getElementById('galleryPhotos');
    if (photos.length > 0) {
      galleryContainer.innerHTML = photos
        .map(
          photo =>
            `<img src="${photo.path}" alt="Photo" class="gallery-photo" style="width: 100px; height: 100px; object-fit: cover; margin: 5px; border-radius: 8px;" />`
        )
        .join('');
    } else {
      galleryContainer.innerHTML = '<p>Aucune photo de galerie</p>';
    }
  }

  initEventListeners() {
    document.getElementById('sendMessageBtn').addEventListener('click', () => {
      alert(
        'Redirection vers la page de messages pour envoyer un message à cet utilisateur'
      );
      window.location.href = '/messages';
    });

    document
      .getElementById('backToDirectoryBtn')
      .addEventListener('click', () => {
        window.location.href = '/directory';
      });

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = '/directory';
      });
    }
  }

  showError(message) {
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('profileContent').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('errorMessage').querySelector('p').textContent =
      message;
  }

  hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('profileContent').style.display = 'block';
  }
}

// CSS simple
const style = document.createElement('style');
style.textContent = `
  .profile-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    border-radius: 12px;
    margin-bottom: 2rem;
  }
  .profile-info {
    display: flex;
    align-items: center;
    gap: 2rem;
  }
  .profile-photo {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid white;
  }
  .profile-actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .profile-section {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
  }
  .photo-gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .loading-container {
    text-align: center;
    padding: 4rem;
  }
  .error-message {
    text-align: center;
    padding: 4rem;
    background: #f8d7da;
    color: #721c24;
    border-radius: 8px;
  }
  @media (max-width: 768px) {
    .profile-info {
      flex-direction: column;
      text-align: center;
    }
    .profile-actions {
      flex-direction: column;
    }
  }
`;
document.head.appendChild(style);

// Initialiser
document.addEventListener('DOMContentLoaded', () => {
  new SimpleProfileView();
});
