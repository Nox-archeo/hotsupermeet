class ImageUpload {
  constructor() {
    this.uploadUrl = '/api/uploads/profile-photos';
    this.deleteUrl = '/api/uploads/profile-photos';
    this.setMainUrl = '/api/uploads/profile-photos/main';
    this.getPhotosUrl = '/api/uploads/profile-photos';
    this.maxFiles = 5;
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
  }

  // Initialiser l'upload d'images
  init() {
    this.bindEvents();
  }

  // Lier les événements
  bindEvents() {
    // Événement pour le bouton d'upload
    const uploadBtn = document.getElementById('upload-photos-btn');
    const fileInput = document.getElementById('photo-upload');

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput.addEventListener('change', e => {
        this.handleFileSelect(e);
      });
    }

    // Événements pour les boutons de suppression et photo principale
    document.addEventListener('click', e => {
      if (e.target.classList.contains('delete-photo-btn')) {
        this.deletePhoto(e.target.dataset.photoUrl);
      }

      if (e.target.classList.contains('set-main-photo-btn')) {
        this.setMainPhoto(e.target.dataset.photoUrl);
      }
    });
  }

  // Gérer la sélection de fichiers
  async handleFileSelect(event) {
    const files = event.target.files;

    if (!files.length) {
      return;
    }

    // Valider les fichiers
    const validation = this.validateFiles(files);
    if (!validation.valid) {
      this.showMessage(validation.message, 'error');
      return;
    }

    try {
      await this.uploadFiles(files);
      event.target.value = ''; // Reset l'input
    } catch (error) {
      this.showMessage('Erreur lors du téléchargement des photos', 'error');
    }
  }

  // Valider les fichiers
  validateFiles(files) {
    if (files.length > this.maxFiles) {
      return {
        valid: false,
        message: `Maximum ${this.maxFiles} photos autorisées`,
      };
    }

    for (let file of files) {
      if (!file.type.startsWith('image/')) {
        return {
          valid: false,
          message: 'Seules les images sont autorisées',
        };
      }

      if (file.size > this.maxFileSize) {
        return {
          valid: false,
          message: 'Fichier trop volumineux (max 5MB)',
        };
      }
    }

    return { valid: true };
  }

  // Uploader les fichiers
  async uploadFiles(files) {
    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append('photos', files[i]);
    }

    const token = this.getToken();
    if (!token) {
      this.showMessage(
        'Vous devez être connecté pour uploader des photos',
        'error'
      );
      return;
    }

    this.showLoading(true);

    try {
      const response = await fetch(this.uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        this.showMessage(result.message, 'success');
        this.updatePhotoGallery(result.photos);
      } else {
        this.showMessage(result.error.message, 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      this.showMessage('Erreur de connexion', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // Supprimer une photo
  async deletePhoto(photoUrl) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
      return;
    }

    const token = this.getToken();
    if (!token) {
      this.showMessage('Vous devez être connecté', 'error');
      return;
    }

    try {
      const response = await fetch(this.deleteUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ photoUrl }),
      });

      const result = await response.json();

      if (result.success) {
        this.showMessage('Photo supprimée avec succès', 'success');
        this.updatePhotoGallery(result.photos);
      } else {
        this.showMessage(result.error.message, 'error');
      }
    } catch (error) {
      console.error('Delete error:', error);
      this.showMessage('Erreur de connexion', 'error');
    }
  }

  // Définir la photo principale
  async setMainPhoto(photoUrl) {
    const token = this.getToken();
    if (!token) {
      this.showMessage('Vous devez être connecté', 'error');
      return;
    }

    try {
      const response = await fetch(this.setMainUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ photoUrl }),
      });

      const result = await response.json();

      if (result.success) {
        this.showMessage('Photo définie comme principale', 'success');
        this.updatePhotoGallery(result.photos);
      } else {
        this.showMessage(result.error.message, 'error');
      }
    } catch (error) {
      console.error('Set main error:', error);
      this.showMessage('Erreur de connexion', 'error');
    }
  }

  // Mettre à jour la galerie de photos
  updatePhotoGallery(photos) {
    const gallery = document.getElementById('photo-gallery');
    if (!gallery) {
      return;
    }

    gallery.innerHTML = '';

    photos.forEach((photoUrl, index) => {
      const isMain = index === 0;
      const photoElement = this.createPhotoElement(photoUrl, isMain);
      gallery.appendChild(photoElement);
    });

    // Afficher/masquer le message de galerie vide
    const emptyMessage = document.getElementById('empty-gallery-message');
    if (emptyMessage) {
      emptyMessage.style.display = photos.length > 0 ? 'none' : 'block';
    }
  }

  // Créer un élément photo
  createPhotoElement(photoUrl, isMain) {
    const div = document.createElement('div');
    div.className = 'photo-item';
    div.innerHTML = `
      <img src="${photoUrl}" alt="Photo de profil" onerror="this.src='/images/default-avatar.jpg'">
      <div class="photo-actions">
        ${!isMain ? `<button class="set-main-photo-btn" data-photo-url="${photoUrl}">Photo principale</button>` : '<span class="main-badge">Principale</span>'}
        <button class="delete-photo-btn" data-photo-url="${photoUrl}">Supprimer</button>
      </div>
    `;
    return div;
  }

  // Obtenir le token JWT
  getToken() {
    return localStorage.getItem('hotmeet_token');
  }

  // Afficher un message
  showMessage(message, type) {
    // Créer ou mettre à jour un élément de message
    let messageEl = document.getElementById('upload-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'upload-message';
      messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        max-width: 300px;
      `;
      document.body.appendChild(messageEl);
    }

    messageEl.textContent = message;
    messageEl.style.backgroundColor =
      type === 'success' ? '#4CAF50' : '#f44336';
    messageEl.style.display = 'block';

    // Masquer après 3 secondes
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 3000);
  }

  // Afficher/masquer le loading
  showLoading(show) {
    let loadingEl = document.getElementById('upload-loading');
    if (!loadingEl && show) {
      loadingEl = document.createElement('div');
      loadingEl.id = 'upload-loading';
      loadingEl.innerHTML = 'Upload en cours...';
      loadingEl.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 20px;
        border-radius: 5px;
        z-index: 1000;
      `;
      document.body.appendChild(loadingEl);
    } else if (loadingEl && !show) {
      loadingEl.remove();
    }
  }

  // Obtenir les photos de l'utilisateur
  async getUserPhotos() {
    const token = this.getToken();
    if (!token) {
      return [];
    }

    try {
      const response = await fetch(this.getPhotosUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        return result.photos;
      }
    } catch (error) {
      console.error('Get photos error:', error);
    }

    return [];
  }
}

// Initialiser l'upload d'images quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
  const imageUpload = new ImageUpload();
  imageUpload.init();

  // Charger les photos existantes si on est sur la page de profil
  if (window.location.pathname.includes('/profile')) {
    imageUpload.getUserPhotos().then(photos => {
      imageUpload.updatePhotoGallery(photos);
    });
  }
});
