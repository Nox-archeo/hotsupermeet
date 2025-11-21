// Extension pour les demandes de photos privées dans la page Messages
// Ce fichier étend les fonctionnalités de MessagesManager SANS modifier le code existant

document.addEventListener('DOMContentLoaded', function () {
  // Attendre que MessagesManager soit initialisé
  setTimeout(() => {
    if (window.messagesManager) {
      setupPhotoRequestsExtension();
    }
  }, 500);
});

function setupPhotoRequestsExtension() {
  // Étendre le MessagesManager existant avec les fonctions de demandes de photos
  const manager = window.messagesManager;

  // Ajouter la gestion de l'onglet photo-requests au switchTab existant
  const originalSwitchTab = manager.switchTab.bind(manager);
  manager.switchTab = function (tabName) {
    // Appeler la fonction originale
    originalSwitchTab(tabName);

    // Ajouter la logique pour l'onglet photo-requests
    if (tabName === 'photo-requests') {
      this.loadPrivatePhotoRequests();
    }
  };

  // Ajouter les nouvelles méthodes pour les demandes de photos
  manager.loadPrivatePhotoRequests = async function () {
    try {
      const token = localStorage.getItem('hotmeet_token');
      if (!token) {
        return;
      }

      // Charger les demandes reçues et envoyées en parallèle
      const [receivedResponse, sentResponse] = await Promise.all([
        fetch('/api/private-photos/received', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/private-photos/sent', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (receivedResponse.ok && sentResponse.ok) {
        const receivedData = await receivedResponse.json();
        const sentData = await sentResponse.json();

        this.displayReceivedPhotoRequests(receivedData.requests || []);
        this.displaySentPhotoRequests(sentData.requests || []);
      }
    } catch (error) {
      // Erreur silencieuse pour ne pas casser l'existant
    }
  };

  // Afficher les demandes reçues
  manager.displayReceivedPhotoRequests = function (requests) {
    const container = document.getElementById('receivedPhotoRequests');
    if (!container) return;

    if (requests.length === 0) {
      container.innerHTML = '<p class="no-requests">Aucune demande reçue</p>';
      return;
    }

    container.innerHTML = requests
      .map(request => {
        const date = new Date(request.createdAt).toLocaleDateString('fr-FR');
        const userName =
          request.requester?.profile?.nom || 'Utilisateur inconnu';
        const userId = request.requester?._id;

        return `
        <div class="request-item">
          <div class="request-header">
            <span class="request-user">
              ${
                userId
                  ? `<a href="/profile-view?id=${userId}" class="profile-link" target="_blank">👤 ${userName}</a>`
                  : userName
              }
            </span>
            <span class="request-date">${date}</span>
          </div>
          <div class="request-message">${request.message}</div>
          <div class="request-status ${request.status}">${this.getPhotoStatusText(request.status)}</div>
          ${
            request.status === 'pending'
              ? `
            <div class="request-actions">
              <button class="btn-request accept" onclick="window.messagesManager.respondToPhotoRequest('${request._id}', 'accept')">
                ✅ Accepter
              </button>
              <button class="btn-request reject" onclick="window.messagesManager.respondToPhotoRequest('${request._id}', 'reject')">
                ❌ Refuser
              </button>
            </div>
          `
              : ''
          }
        </div>
      `;
      })
      .join('');
  };

  // Afficher les demandes envoyées
  manager.displaySentPhotoRequests = function (requests) {
    const container = document.getElementById('sentPhotoRequests');
    if (!container) return;

    if (requests.length === 0) {
      container.innerHTML = '<p class="no-requests">Aucune demande envoyée</p>';
      return;
    }

    container.innerHTML = requests
      .map(request => {
        const date = new Date(request.createdAt).toLocaleDateString('fr-FR');
        const userName = request.target?.profile?.nom || 'Utilisateur inconnu';

        return `
        <div class="request-item">
          <div class="request-header">
            <span class="request-user">À ${userName}</span>
            <span class="request-date">${date}</span>
          </div>
          <div class="request-message">${request.message}</div>
          <div class="request-status ${request.status}">${this.getPhotoStatusText(request.status)}</div>
        </div>
      `;
      })
      .join('');
  };

  // Répondre à une demande de photo privée
  manager.respondToPhotoRequest = async function (requestId, action) {
    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch(`/api/private-photos/respond/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: action === 'accept' ? 'accepted' : 'rejected',
        }),
      });

      if (response.ok) {
        // Recharger les demandes
        this.loadPrivatePhotoRequests();

        // Afficher un message de confirmation
        const message =
          action === 'accept' ? 'Demande acceptée ✅' : 'Demande refusée ❌';
        this.showPhotoMessage(message, 'success');
      } else {
        const result = await response.json();
        this.showPhotoMessage(
          result.error?.message || 'Erreur lors de la réponse',
          'error'
        );
      }
    } catch (error) {
      this.showPhotoMessage('Erreur lors de la réponse à la demande', 'error');
    }
  };

  // Obtenir le texte du statut (fonction spécifique pour éviter les conflits)
  manager.getPhotoStatusText = function (status) {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'accepted':
        return 'Acceptée';
      case 'rejected':
        return 'Refusée';
      default:
        return status;
    }
  };

  // Afficher un message spécifique aux photos
  manager.showPhotoMessage = function (message, type) {
    // Utiliser la fonction showMessage existante si elle existe
    if (typeof this.showMessage === 'function') {
      this.showMessage(message, type);
      return;
    }

    // Sinon créer notre propre système de messages
    let messageContainer = document.querySelector('.photo-message-container');
    if (!messageContainer) {
      messageContainer = document.createElement('div');
      messageContainer.className = 'photo-message-container';
      messageContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
      `;
      document.body.appendChild(messageContainer);
    }

    const messageEl = document.createElement('div');
    messageEl.className = `photo-message photo-message-${type}`;
    messageEl.style.cssText = `
      background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      margin-bottom: 10px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    messageEl.textContent = message;

    messageContainer.appendChild(messageEl);

    // Supprimer le message après 3 secondes
    setTimeout(() => {
      messageEl.remove();
    }, 3000);
  };
}
