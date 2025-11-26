// ===== SYSTÈME DE CHAT POUR ANNONCES - COMPLÈTEMENT INDÉPENDANT =====
// NE PAS TOUCHER au système de conversations existant !

class AdChatManager {
  constructor() {
    this.currentAdChat = null;
    this.adChatWindow = null;
    this.init();
  }

  init() {
    this.createAdChatWindow();
    this.setupAdChatEvents();
  }

  // Créer la fenêtre de chat pour annonces (complètement séparée)
  createAdChatWindow() {
    const adChatHTML = `
      <div id="adChatWindow" class="ad-chat-window" style="display: none;">
        <div class="ad-chat-header">
          <div class="ad-chat-partner-info">
            <img src="/images/default-avatar.jpg" alt="Annonceur" />
            <div>
              <h3>Annonceur</h3>
              <span class="ad-chat-status">En ligne</span>
              <div class="ad-context-info">
                <small>Réponse à l'annonce: "Titre de l'annonce"</small>
              </div>
            </div>
          </div>
          <button class="close-ad-chat">×</button>
        </div>

        <div class="ad-chat-messages">
          <!-- Messages d'annonce seront ajoutés ici -->
        </div>

        <div class="ad-chat-input">
          <textarea placeholder="Tapez votre message pour répondre à cette annonce..." rows="3"></textarea>
          <button class="btn-primary send-ad-message">Envoyer</button>
        </div>
      </div>
    `;

    // Ajouter à la page
    document.body.insertAdjacentHTML('beforeend', adChatHTML);
    this.adChatWindow = document.getElementById('adChatWindow');
  }

  // Configurer les événements pour le chat d'annonces
  setupAdChatEvents() {
    // Bouton Envoyer pour annonces
    document.addEventListener('click', e => {
      if (e.target.classList.contains('send-ad-message')) {
        this.sendAdMessage();
      } else if (e.target.classList.contains('close-ad-chat')) {
        this.closeAdChat();
      }
    });

    // Entrée clavier pour annonces
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const adChatInput = document.querySelector(
          '#adChatWindow .ad-chat-input textarea'
        );
        if (adChatInput && document.activeElement === adChatInput) {
          e.preventDefault();
          this.sendAdMessage();
        }
      }
    });
  }

  // Ouvrir chat pour une annonce spécifique
  async openAdChat(adId, advertiserInfo) {
    console.log('📨 Ouverture chat annonce:', adId, advertiserInfo);

    // Sauvegarder les infos de l'annonce
    this.currentAdChat = {
      adId: adId,
      advertiser: advertiserInfo,
    };

    // Mettre à jour l'en-tête
    const header = this.adChatWindow.querySelector('.ad-chat-partner-info');
    header.innerHTML = `
      <img src="${advertiserInfo.photo || '/images/default-avatar.jpg'}" alt="${advertiserInfo.nom}" />
      <div>
        <h3>${advertiserInfo.nom}</h3>
        <span class="ad-chat-status">En ligne</span>
        <div class="ad-context-info">
          <small>Réponse à l'annonce: "${advertiserInfo.adTitle}"</small>
        </div>
      </div>
    `;

    // Charger les messages existants pour cette annonce
    await this.loadAdMessages(adId);

    // Afficher la fenêtre
    this.adChatWindow.style.display = 'block';
    this.adChatWindow.classList.add('active');

    // Focus sur le champ de texte
    const textarea = this.adChatWindow.querySelector('.ad-chat-input textarea');
    setTimeout(() => textarea.focus(), 100);
  }

  // Charger les messages pour une annonce
  async loadAdMessages(adId) {
    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch(`/api/ads/messages/${adId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        this.displayAdMessages(data.messages || []);
      }
    } catch (error) {
      console.log('Pas de messages existants pour cette annonce');
      this.displayAdMessages([]);
    }
  }

  // Afficher les messages d'annonce
  displayAdMessages(messages) {
    const messagesContainer =
      this.adChatWindow.querySelector('.ad-chat-messages');
    messagesContainer.innerHTML = '';

    messages.forEach(message => {
      const messageElement = this.createAdMessageElement(message);
      messagesContainer.appendChild(messageElement);
    });

    // Scroller vers le bas
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Créer un élément message pour annonce
  createAdMessageElement(message) {
    const messageDiv = document.createElement('div');
    const isOwn = message.isOwn || false;

    messageDiv.className = `ad-message ${isOwn ? 'sent' : 'received'}`;

    const time = new Date(message.createdAt).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    messageDiv.innerHTML = `
      <div class="ad-message-content">
        <p>${message.content}</p>
        <span class="ad-message-time">${time}</span>
      </div>
    `;

    return messageDiv;
  }

  // Envoyer un message pour annonce
  async sendAdMessage() {
    const textarea = this.adChatWindow.querySelector('.ad-chat-input textarea');
    const content = textarea.value.trim();

    if (!content) return;

    if (!this.currentAdChat) {
      alert('Erreur: aucune annonce sélectionnée');
      return;
    }

    try {
      const token = localStorage.getItem('hotmeet_token');

      const response = await fetch('/api/ads/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adId: this.currentAdChat.adId,
          content: content,
          toUserId: this.currentAdChat.advertiser.id,
        }),
      });

      if (response.ok) {
        // Vider le champ
        textarea.value = '';

        // Ajouter le message à l'affichage
        const newMessage = {
          content: content,
          createdAt: new Date(),
          isOwn: true,
        };

        const messageElement = this.createAdMessageElement(newMessage);
        this.adChatWindow
          .querySelector('.ad-chat-messages')
          .appendChild(messageElement);

        // Scroller vers le bas
        const messagesContainer =
          this.adChatWindow.querySelector('.ad-chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        console.log('✅ Message annonce envoyé');
      } else {
        alert("Erreur lors de l'envoi du message");
      }
    } catch (error) {
      console.error('Erreur envoi message annonce:', error);
      alert('Erreur technique');
    }
  }

  // Fermer le chat d'annonce
  closeAdChat() {
    if (this.adChatWindow) {
      this.adChatWindow.style.display = 'none';
      this.adChatWindow.classList.remove('active');
    }
    this.currentAdChat = null;
  }
}

// Initialiser le gestionnaire de chat d'annonces quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
  window.adChatManager = new AdChatManager();
});
