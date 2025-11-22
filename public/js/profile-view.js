// Profile View with Chat System
class ProfileViewChat {
  constructor() {
    this.userId = null;
    this.userProfile = null;
    this.currentUser = null;
    this.conversationId = null;
    this.messages = [];
    this.init();
  }

  init() {
    // Get user ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    this.userId = urlParams.get('id');

    if (!this.userId) {
      this.showError('ID utilisateur manquant');
      return;
    }

    // Check authentication and load profile
    this.checkAuthAndLoadProfile();
    this.initializeEventListeners();

    // Écouter les événements de défloutage
    this.setupPhotoAccessListener();
  }

  async checkAuthAndLoadProfile() {
    try {
      const token = localStorage.getItem('hotmeet_token');
      if (!token) {
        window.location.href = '/auth';
        return;
      }

      // Get current user info
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

      // Check if viewing own profile
      if (this.currentUser.user.id === this.userId) {
        window.location.href = '/profile';
        return;
      }

      // Load profile to display
      await this.loadProfile();
    } catch (error) {
      console.error('Authentication error:', error);
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

      // Check if conversation already exists
      await this.checkExistingConversation();
    } catch (error) {
      console.error('Error loading profile:', error);
      this.showError('Erreur lors du chargement du profil');
    }
  }

  displayProfile() {
    const profile = this.userProfile.profile;
    const stats = this.userProfile.stats;

    // Page title
    document.title = `${profile.nom} - HotMeet`;

    // Profile photo
    const profilePhoto =
      profile.photos?.find(p => p.isProfile) || profile.photos?.[0];
    if (profilePhoto) {
      document.getElementById('profilePhoto').src = profilePhoto.path;
    } else {
      document.getElementById('profilePhoto').src =
        '/images/default-avatar.png';
    }

    // Basic info
    document.getElementById('profileName').textContent = profile.nom;

    const localisation = profile.localisation;
    const locationText = localisation
      ? `${localisation.ville}, ${localisation.region}, ${localisation.pays}`
      : '';
    document.getElementById('profileDetails').textContent =
      `${profile.age} ans • ${locationText}`;

    // Stats
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

    // Vérifier l'accès aux photos privées et configurer la section
    this.setupPrivatePhotosSection(profile.photos || []);
  }

  displayPhotos(photos) {
    const galleryPhotos = photos.filter(
      p => p.type === 'gallery' || (!p.type && !p.isProfile)
    );

    // Gallery photos
    const galleryContainer = document.getElementById('galleryPhotos');
    if (galleryPhotos.length > 0) {
      galleryContainer.innerHTML = galleryPhotos
        .map(
          photo => `
        <div class="photo-item">
          <img src="${photo.path}" alt="Photo de galerie" class="gallery-photo" style="width: 100px; height: 100px; object-fit: cover; margin: 5px; border-radius: 8px; cursor: pointer;" onclick="this.style.transform = this.style.transform ? '' : 'scale(2)'; this.style.zIndex = this.style.zIndex ? '' : '1000';" />
        </div>
      `
        )
        .join('');
    } else {
      galleryContainer.innerHTML =
        '<p class="no-photos">Aucune photo de galerie</p>';
    }
  }

  async setupPrivatePhotosSection(photos) {
    const privatePhotos = photos.filter(p => p.type === 'private');
    const privateContainer = document.getElementById('privatePhotos');
    const requestButton = document.getElementById('requestPrivateAccessBtn');
    const messageContainer = document.getElementById('privatePhotosMessage');

    if (privatePhotos.length === 0) {
      privateContainer.innerHTML =
        '<p class="no-photos">Aucune photo privée</p>';
      requestButton.style.display = 'none';
      return;
    }

    // Vérifier si l'utilisateur a accès aux photos privées
    const hasAccess = await this.checkPrivatePhotoAccess();

    if (hasAccess) {
      // L'utilisateur a accès : afficher les photos défloutées
      this.displayPrivatePhotos(privatePhotos, false);
      requestButton.style.display = 'none';
      messageContainer.innerHTML =
        '<p class="access-granted">✅ Accès accordé aux photos privées</p>';
    } else {
      // L'utilisateur n'a pas accès : afficher les photos floutées
      this.displayPrivatePhotos(privatePhotos, true);
      requestButton.style.display = 'inline-block';
      messageContainer.innerHTML =
        '<p class="access-denied">🔒 Photos privées. Demandez l\'accès pour les voir.</p>';

      // Configurer le bouton de demande
      this.setupRequestButton();
    }
  }

  displayPrivatePhotos(photos, isBlurred) {
    const privateContainer = document.getElementById('privatePhotos');

    privateContainer.innerHTML = photos
      .map(
        photo => `
        <div class="photo-item private ${isBlurred ? 'blurred' : 'access-granted'}">
          <img src="${photo.path}" alt="Photo privée" style="width: 100px; height: 100px; object-fit: cover; margin: 5px; border-radius: 8px;" />
          ${isBlurred ? '<div class="photo-overlay">🔒</div>' : ''}
        </div>
      `
      )
      .join('');
  }

  async checkPrivatePhotoAccess() {
    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch(
        `/api/auth/private-photos/check-access/${this.userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const result = await response.json();
        return result.hasAccess;
      }
    } catch (error) {
      console.error('Erreur vérification accès photos privées:', error);
    }
    return false;
  }

  setupRequestButton() {
    const requestButton = document.getElementById('requestPrivateAccessBtn');

    requestButton.addEventListener('click', async () => {
      try {
        requestButton.disabled = true;
        requestButton.textContent = '📤 Envoi...';

        const token = localStorage.getItem('hotmeet_token');
        const response = await fetch('/api/auth/private-photos/send-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            targetUserId: this.userId,
            message: 'Aimerais voir vos photos privées',
          }),
        });

        const result = await response.json();

        if (result.success) {
          requestButton.textContent = '✅ Demande envoyée';
          requestButton.disabled = true;
          this.showMessage('Demande envoyée avec succès !', 'success');

          // Notifier la page messages des nouvelles demandes
          if (typeof window.notifyPhotoRequestSent === 'function') {
            window.notifyPhotoRequestSent();
          }
        } else {
          requestButton.textContent = "💌 Demander l'accès";
          requestButton.disabled = false;
          this.showMessage(
            result.error?.message || "Erreur lors de l'envoi",
            'error'
          );
        }
      } catch (error) {
        console.error('Erreur envoi demande:', error);
        requestButton.textContent = "💌 Demander l'accès";
        requestButton.disabled = false;
        this.showMessage("Erreur lors de l'envoi de la demande", 'error');
      }
    });
  }

  showMessage(message, type) {
    // Créer ou utiliser un conteneur de message
    let messageEl = document.getElementById('profileViewMessage');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'profileViewMessage';
      messageEl.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        padding: 1rem 2rem;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      `;
      document.body.appendChild(messageEl);
    }

    messageEl.textContent = message;
    messageEl.style.background = type === 'success' ? '#28a745' : '#dc3545';
    messageEl.style.display = 'block';

    // Masquer après 4 secondes
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 4000);
  }

  async checkExistingConversation() {
    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch(
        `/api/messages/conversation/${this.userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        this.conversationId = data.conversationId;
        this.messages = data.messages || [];
      }
    } catch (error) {
      console.error('Error checking conversation:', error);
    }
  }

  initializeEventListeners() {
    // Message button
    document.getElementById('sendMessageBtn').addEventListener('click', () => {
      this.openChatModal();
    });

    // Back to directory button
    document
      .getElementById('backToDirectoryBtn')
      .addEventListener('click', () => {
        window.location.href = '/directory';
      });

    // Chat modal close button
    document.getElementById('closeChatBtn').addEventListener('click', () => {
      this.closeChatModal();
    });

    // Send message button
    document.getElementById('sendBtn').addEventListener('click', () => {
      this.sendMessage();
    });

    // Message input
    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('input', e => {
      document.getElementById('charCount').textContent = e.target.value.length;
    });

    // Send on Enter (Shift+Enter for new line)
    messageInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Back button in error message
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = '/directory';
      });
    }
  }

  openChatModal() {
    document.getElementById('chatModal').style.display = 'flex';
    document.getElementById('chatTitle').textContent =
      `Chat avec ${this.userProfile.profile.nom}`;

    // Load existing messages if conversation exists
    if (this.messages.length > 0) {
      this.displayMessages();
    } else {
      // Clear messages container for new conversation
      document.getElementById('chatMessages').innerHTML = '';
    }

    document.getElementById('messageInput').focus();
  }

  closeChatModal() {
    document.getElementById('chatModal').style.display = 'none';
    document.getElementById('messageInput').value = '';
    document.getElementById('charCount').textContent = '0';
  }

  displayMessages() {
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = this.messages
      .map(message => {
        const isOwnMessage =
          (message.fromUserId || message.senderId) === this.currentUser.user.id;
        const messageClass = isOwnMessage ? 'own-message' : 'other-message';

        return `
        <div class="message ${messageClass}">
          <div class="message-content">${message.content}</div>
          <div class="message-time">${this.formatMessageTime(message.createdAt)}</div>
        </div>
      `;
      })
      .join('');

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  async sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();

    if (!content) return;

    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    sendBtn.textContent = '📤 Envoi...';

    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toUserId: this.userId,
          content: content,
          provenance: 'annuaire',
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Add message to local array
        this.messages.push({
          _id: data.message._id,
          fromUserId: this.currentUser.user.id,
          toUserId: this.userId,
          content: content,
          createdAt: new Date().toISOString(),
          status: 'sent',
        });

        // Update conversation ID if new
        if (data.message.conversationId) {
          this.conversationId = data.message.conversationId;
        }

        // Clear input and refresh display
        messageInput.value = '';
        document.getElementById('charCount').textContent = '0';
        this.displayMessages();

        // Message sent successfully - no notification needed
      } else {
        const error = await response.json();
        this.showToast(
          error.error?.message || "Erreur lors de l'envoi",
          'error'
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.showToast("Erreur lors de l'envoi du message", 'error');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = '📤 Envoyer';
    }
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

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      animation: slideInRight 0.3s ease;
    `;

    const colors = {
      success: '#28a745',
      error: '#dc3545',
      info: '#17a2b8',
      warning: '#ffc107',
    };
    toast.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ===== GESTION DU DÉFLOUTAGE AUTOMATIQUE =====

  // Écouter les événements de défloutage depuis la page Messages
  setupPhotoAccessListener() {
    window.addEventListener('privatePhotoAccessGranted', event => {
      console.log('🔓 Accès photos accordé - rechargement en cours...');
      // Recharger les photos privées pour les déflouter
      this.reloadPrivatePhotos();

      // Afficher notification de succès
      this.showMessage(
        '🎉 Accès accordé! Les photos privées sont maintenant visibles.',
        'success'
      );
    });
  }

  // Recharger et afficher les photos privées défloutées
  async reloadPrivatePhotos() {
    try {
      // Recharger les données du profil utilisateur
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch(`/api/users/${this.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const userData = await response.json();
        this.userProfile = userData.user;

        // Reconfigurer la section photos privées avec les nouvelles données
        this.setupPrivatePhotosSection(this.userProfile.profile.photos || []);
      }
    } catch (error) {
      console.error('Erreur rechargement photos:', error);
    }
  }
}

// CSS Styles
const style = document.createElement('style');
style.textContent = `
  /* Toast animations */
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }

  /* Profile styles */
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

  .status-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 5px;
  }

  .status-indicator.online {
    background: #28a745;
  }

  .status-indicator.offline {
    background: #6c757d;
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

  .no-photos {
    color: #666;
    font-style: italic;
    padding: 2rem;
    text-align: center;
    background: #f8f9fa;
    border-radius: 8px;
  }

  /* Chat Modal Styles */
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

  .chat-modal {
    width: 90%;
    max-width: 600px;
    height: 80vh;
    max-height: 600px;
    display: flex;
    flex-direction: column;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: #f8f9fa;
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
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .chat-messages {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
    background: #f8f9fa;
    min-height: 300px;
  }

  .message {
    margin-bottom: 1rem;
    max-width: 70%;
  }

  .own-message {
    margin-left: auto;
    text-align: right;
  }

  .other-message {
    margin-right: auto;
  }

  .message-content {
    padding: 0.75rem 1rem;
    border-radius: 18px;
    word-wrap: break-word;
  }

  .own-message .message-content {
    background: #007bff;
    color: white;
  }

  .other-message .message-content {
    background: white;
    border: 1px solid #e9ecef;
  }

  .message-time {
    font-size: 0.8rem;
    color: #666;
    margin-top: 0.25rem;
  }

  .system-message {
    text-align: center;
    padding: 1rem;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 8px;
    margin-bottom: 1rem;
    color: #856404;
  }

  .chat-input-container {
    padding: 1rem;
    border-top: 1px solid #eee;
    background: white;
  }

  .chat-input-container textarea {
    width: 100%;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 0.75rem;
    resize: vertical;
    font-family: inherit;
    margin-bottom: 0.5rem;
  }

  .chat-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .char-count {
    color: #666;
    font-size: 0.8rem;
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

  /* Responsive */
  @media (max-width: 768px) {
    .profile-info {
      flex-direction: column;
      text-align: center;
    }

    .profile-actions {
      flex-direction: column;
    }

    .chat-modal {
      width: 95%;
      height: 90vh;
    }

    .message {
      max-width: 85%;
    }
  }
`;
document.head.appendChild(style);

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  new ProfileViewChat();
});
