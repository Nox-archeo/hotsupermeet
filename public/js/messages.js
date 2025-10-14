// HotMeet - JavaScript pour la page Messages
class MessagesManager {
  constructor() {
    this.currentTab = 'conversations';
    this.chatRequests = [];
    this.conversations = [];
    this.adResponses = [];
    this.init();
  }

  // Initialisation de la page messages
  init() {
    this.setupEventListeners();
    this.loadDemoData();
    this.updateNotificationBadges();
  }

  // Configuration des écouteurs d'événements
  setupEventListeners() {
    // Navigation par onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Actions des demandes de chat
    document.addEventListener('click', e => {
      if (e.target.classList.contains('accept-request')) {
        this.acceptChatRequest(e.target.closest('.request-item'));
      } else if (e.target.classList.contains('decline-request')) {
        this.declineChatRequest(e.target.closest('.request-item'));
      } else if (e.target.classList.contains('close-chat')) {
        this.closeChatWindow();
      } else if (e.target.classList.contains('send-message')) {
        this.sendChatMessage();
      }
    });

    // Ouvrir une conversation
    document.addEventListener('click', e => {
      if (e.target.textContent === 'Ouvrir') {
        this.openConversation(e.target.closest('.conversation-item'));
      }
    });

    // Répondre à une annonce
    document.addEventListener('click', e => {
      if (e.target.textContent === 'Répondre') {
        this.respondToAd(e.target.closest('.ad-response-item'));
      }
    });
  }

  // Charger des données de démonstration
  loadDemoData() {
    // Demandes de chat de démonstration
    this.chatRequests = [
      {
        id: 1,
        fromUser: {
          name: 'Marie',
          age: 25,
          gender: 'femme',
          location: 'Paris',
          photo: '/images/avatar-femme-2.jpg',
          isOnline: true,
        },
        message: "Bonjour, j'aimerais faire votre connaissance !",
        timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        status: 'pending',
      },
      {
        id: 2,
        fromUser: {
          name: 'David',
          age: 32,
          gender: 'homme',
          location: 'Lyon',
          photo: '/images/avatar-homme-2.jpg',
          isOnline: false,
        },
        message: "Salut, ton profil m'a beaucoup plu !",
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 heure ago
        status: 'pending',
      },
    ];

    // Conversations de démonstration
    this.conversations = [
      {
        id: 1,
        withUser: {
          name: 'Sophie',
          age: 28,
          gender: 'femme',
          location: 'Marseille',
          photo: '/images/avatar-femme-1.jpg',
          isOnline: true,
        },
        lastMessage: "Salut ! Comment vas-tu aujourd'hui ?",
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        unread: 0,
      },
      {
        id: 2,
        withUser: {
          name: 'Pierre',
          age: 35,
          gender: 'homme',
          location: 'Lille',
          photo: '/images/avatar-homme-1.jpg',
          isOnline: false,
        },
        lastMessage: 'Merci pour la conversation hier soir !',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        unread: 0,
      },
    ];

    // Réponses aux annonces de démonstration
    this.adResponses = [
      {
        id: 1,
        adTitle: 'Soirée détente',
        responder: {
          name: 'Claire',
          age: 28,
          gender: 'femme',
          location: 'Marseille',
          photo: '/images/avatar-femme-3.jpg',
          isOnline: true,
        },
        message:
          "Votre annonce m'intéresse beaucoup ! J'aimerais en savoir plus sur votre proposition.",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        status: 'unread',
      },
    ];

    this.renderAllData();
  }

  // Basculer entre les onglets
  switchTab(tabName) {
    // Mettre à jour les boutons d'onglet
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Afficher le contenu de l'onglet
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    this.currentTab = tabName;
  }

  // Accepter une demande de chat
  acceptChatRequest(requestItem) {
    const requestId = parseInt(requestItem.dataset.requestId);
    const request = this.chatRequests.find(req => req.id === requestId);

    if (request) {
      request.status = 'accepted';

      // Créer une nouvelle conversation
      const newConversation = {
        id: Date.now(),
        withUser: request.fromUser,
        lastMessage: request.message,
        timestamp: new Date(),
        unread: 0,
        messages: [
          {
            type: 'received',
            content: request.message,
            timestamp: request.timestamp,
          },
        ],
      };

      this.conversations.unshift(newConversation);
      this.renderConversations();
      this.updateNotificationBadges();

      // Afficher un message de confirmation
      alert(
        `Demande de chat acceptée ! Vous pouvez maintenant chatter avec ${request.fromUser.name}`
      );
    }
  }

  // Refuser une demande de chat
  declineChatRequest(requestItem) {
    const requestId = parseInt(requestItem.dataset.requestId);
    const request = this.chatRequests.find(req => req.id === requestId);

    if (request) {
      request.status = 'declined';
      requestItem.remove();
      this.updateNotificationBadges();

      // Afficher un message de confirmation
      alert('Demande de chat refusée.');
    }
  }

  // Ouvrir une conversation
  openConversation(conversationItem) {
    const conversationId = parseInt(conversationItem.dataset.conversationId);
    const conversation = this.conversations.find(
      conv => conv.id === conversationId
    );

    if (conversation) {
      this.showChatWindow(conversation);
    }
  }

  // Afficher la fenêtre de chat
  showChatWindow(conversation) {
    const chatWindow = document.getElementById('chatWindow');
    const chatHeader = chatWindow.querySelector('.chat-partner-info');
    const chatMessages = chatWindow.querySelector('.chat-messages');

    // Mettre à jour l'en-tête du chat
    chatHeader.innerHTML = `
            <img src="${conversation.withUser.photo}" alt="${conversation.withUser.name}" onerror="this.src='/images/avatar-placeholder.png'">
            <div>
                <h3>${conversation.withUser.name}</h3>
                <span class="chat-status">${conversation.withUser.isOnline ? 'En ligne' : 'Hors ligne'}</span>
            </div>
        `;

    // Afficher les messages
    chatMessages.innerHTML = '';
    if (conversation.messages) {
      conversation.messages.forEach(msg => {
        const messageElement = this.createMessageElement(msg);
        chatMessages.appendChild(messageElement);
      });
    }

    // Afficher la fenêtre de chat
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });
    chatWindow.style.display = 'block';
  }

  // Fermer la fenêtre de chat
  closeChatWindow() {
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.style.display = 'none';

    // Réafficher l'onglet actuel
    document.getElementById(this.currentTab).style.display = 'block';
  }

  // Envoyer un message dans le chat
  sendChatMessage() {
    const chatInput = document.querySelector('.chat-input textarea');
    const messageContent = chatInput.value.trim();

    if (messageContent) {
      const newMessage = {
        type: 'sent',
        content: messageContent,
        timestamp: new Date(),
      };

      const messageElement = this.createMessageElement(newMessage);
      document.querySelector('.chat-messages').appendChild(messageElement);

      // Simuler une réponse après 2 secondes
      setTimeout(() => {
        const responses = [
          'Intéressant !',
          'Je vois, continuez...',
          "C'est sympa !",
          'Haha, drôle !',
          "D'accord, je comprends",
        ];
        const randomResponse =
          responses[Math.floor(Math.random() * responses.length)];

        const responseMessage = {
          type: 'received',
          content: randomResponse,
          timestamp: new Date(),
        };

        const responseElement = this.createMessageElement(responseMessage);
        document.querySelector('.chat-messages').appendChild(responseElement);

        // Faire défiler vers le bas
        document.querySelector('.chat-messages').scrollTop =
          document.querySelector('.chat-messages').scrollHeight;
      }, 2000);

      chatInput.value = '';

      // Faire défiler vers le bas
      document.querySelector('.chat-messages').scrollTop =
        document.querySelector('.chat-messages').scrollHeight;
    }
  }

  // Créer un élément de message
  createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type}`;

    const timeString = message.timestamp.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    messageDiv.innerHTML = `
            <div class="message-content">
                <p>${message.content}</p>
                <span class="message-time">${timeString}</span>
            </div>
        `;

    return messageDiv;
  }

  // Répondre à une annonce
  respondToAd(adResponseItem) {
    const adResponseId = parseInt(adResponseItem.dataset.responseId);
    const adResponse = this.adResponses.find(resp => resp.id === adResponseId);

    if (adResponse) {
      alert(
        `Ouverture de la conversation avec ${adResponse.responder.name} pour l'annonce "${adResponse.adTitle}"`
      );
    }
  }

  // Mettre à jour les badges de notification
  updateNotificationBadges() {
    const pendingRequests = this.chatRequests.filter(
      req => req.status === 'pending'
    ).length;
    const unreadResponses = this.adResponses.filter(
      resp => resp.status === 'unread'
    ).length;
    const totalNotifications = pendingRequests + unreadResponses;

    // Badge principal (messages)
    const messageBadge = document.getElementById('messageBadge');
    if (totalNotifications > 0) {
      messageBadge.textContent = totalNotifications;
      messageBadge.style.display = 'inline';
    } else {
      messageBadge.style.display = 'none';
    }

    // Badge des demandes
    const requestsBadge = document.getElementById('requestsBadge');
    if (pendingRequests > 0) {
      requestsBadge.textContent = pendingRequests;
      requestsBadge.style.display = 'inline';
    } else {
      requestsBadge.style.display = 'none';
    }
  }

  // Rendre toutes les données
  renderAllData() {
    this.renderChatRequests();
    this.renderConversations();
    this.renderAdResponses();
  }

  // Rendre les demandes de chat
  renderChatRequests() {
    const requestsList = document.querySelector('.requests-list');
    if (!requestsList) {
      return;
    }

    const pendingRequests = this.chatRequests.filter(
      req => req.status === 'pending'
    );

    if (pendingRequests.length === 0) {
      requestsList.innerHTML =
        '<div class="no-requests">Aucune demande de chat en attente</div>';
      return;
    }

    requestsList.innerHTML = pendingRequests
      .map(
        request => `
            <div class="request-item" data-request-id="${request.id}">
                <div class="request-avatar">
                    <img src="${request.fromUser.photo}" alt="${request.fromUser.name}" onerror="this.src='/images/avatar-placeholder.png'">
                    <div class="online-status ${request.fromUser.isOnline ? 'online' : 'offline'}"></div>
                </div>
                <div class="request-info">
                    <div class="request-header">
                        <h3>${request.fromUser.name}</h3>
                        <span class="request-time">${this.formatTimeAgo(request.timestamp)}</span>
                    </div>
                    <p class="request-message">"${request.message}"</p>
                    <div class="request-details">
                        <span>${request.fromUser.age} ans • ${request.fromUser.gender.charAt(0).toUpperCase() + request.fromUser.gender.slice(1)} • ${request.fromUser.location}</span>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn-primary accept-request">Accepter</button>
                    <button class="btn-secondary decline-request">Refuser</button>
                </div>
            </div>
        `
      )
      .join('');
  }

  // Rendre les conversations
  renderConversations() {
    const conversationsList = document.querySelector('.conversations-list');
    if (!conversationsList) {
      return;
    }

    if (this.conversations.length === 0) {
      conversationsList.innerHTML =
        '<div class="no-conversations">Aucune conversation</div>';
      return;
    }

    conversationsList.innerHTML = this.conversations
      .map(
        conversation => `
            <div class="conversation-item" data-conversation-id="${conversation.id}">
                <div class="conversation-avatar">
                    <img src="${conversation.withUser.photo}" alt="${conversation.withUser.name}" onerror="this.src='/images/avatar-placeholder.png'">
                    <div class="online-status ${conversation.withUser.isOnline ? 'online' : 'offline'}"></div>
                </div>
                <div class="conversation-info">
                    <div class="conversation-header">
                        <h3>${conversation.withUser.name}</h3>
                        <span class="conversation-time">${this.formatTimeAgo(conversation.timestamp)}</span>
                    </div>
                    <p class="conversation-preview">${conversation.lastMessage}</p>
                </div>
                <div class="conversation-actions">
                    <button class="btn-secondary">Ouvrir</button>
                </div>
            </div>
        `
      )
      .join('');
  }

  // Rendre les réponses aux annonces
  renderAdResponses() {
    const adResponsesList = document.querySelector('.ad-responses-list');
    if (!adResponsesList) {
      return;
    }

    const unreadResponses = this.adResponses.filter(
      resp => resp.status === 'unread'
    );

    if (unreadResponses.length === 0) {
      adResponsesList.innerHTML =
        '<div class="no-responses">Aucune réponse à vos annonces</div>';
      return;
    }

    adResponsesList.innerHTML = unreadResponses
      .map(
        response => `
            <div class="ad-response-item" data-response-id="${response.id}">
                <div class="ad-response-header">
                    <h3>Réponse à votre annonce: "${response.adTitle}"</h3>
                    <span class="response-time">${this.formatTimeAgo(response.timestamp)}</span>
                </div>
                <div class="ad-response-content">
                    <div class="responder-info">
                        <img src="${response.responder.photo}" alt="${response.responder.name}" onerror="this.src='/images/avatar-placeholder.png'">
                        <div>
                            <strong>${response.responder.name}</strong>
                            <span>${response.responder.age} ans • ${response.responder.gender.charAt(0).toUpperCase() + response.responder.gender.slice(1)} • ${response.responder.location}</span>
                        </div>
                    </div>
                    <p class="response-message">"${response.message}"</p>
                </div>
                <div class="ad-response-actions">
                    <button class="btn-primary">Répondre</button>
                    <button class="btn-secondary">Voir le profil</button>
                </div>
            </div>
        `
      )
      .join('');
  }

  // Formater le temps écoulé
  formatTimeAgo(timestamp) {
    const now = new Date();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return "À l'instant";
    }
    if (diffMins < 60) {
      return `Il y a ${diffMins} min`;
    }
    if (diffHours < 24) {
      return `Il y a ${diffHours} h`;
    }
    if (diffDays < 7) {
      return `Il y a ${diffDays} j`;
    }
    return timestamp.toLocaleDateString('fr-FR');
  }
}

// Styles CSS pour la page messages
const messagesStyles = `
<style>
    .messages-page {
        padding: 20px 0;
    }
    
    .tabs-navigation {
        display: flex;
        border-bottom: 2px solid #e1e8ed;
        margin-bottom: 2rem;
    }
    
    .tab-btn {
        padding: 1rem 2rem;
        background: none;
        border: none;
        border-bottom: 3px solid transparent;
        cursor: pointer;
        font-weight: 500;
        position: relative;
    }
    
    .tab-btn.active {
        border-bottom-color: var(--primary-color);
        color: var(--primary-color);
    }
    
    .tab-content {
        display: none;
    }
    
    .tab-content.active {
        display: block;
    }
    
    .notification-badge {
        background: #ff4757;
        color: white;
        border-radius: 50%;
        padding: 2px 6px;
        font-size: 0.8rem;
        margin-left: 5px;
    }
    
    .conversation-item, .request-item, .ad-response-item {
        display: flex;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #e1e8ed;
        transition: background 0.2s;
    }
    
    .conversation-item:hover, .request-item:hover, .ad-response-item:hover {
        background: #f8f9fa;
    }
    
    .conversation-avatar, .request-avatar {
        position: relative;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        overflow: hidden;
        margin-right: 1rem;
    }
    
    .conversation-avatar img, .request-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .online-status {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
    }
    
    .online-status.online {
        background: #4CAF50;
    }
    
    .online-status.offline {
        background: #ccc;
    }
    
    .conversation-info, .request-info {
        flex: 1;
    }
    
    .conversation-header, .request-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.25rem;
    }
    
    .conversation-header h3, .request-header h3 {
        margin: 0;
        font-size: 1.1rem;
    }
    
    .conversation-time, .request-time, .response-time {
        color: #666;
        font-size: 0.9rem;
    }
    
    .conversation-preview, .request-message {
        margin: 0;
        color: #666;
        line-height: 1.4;
    }
    
    .request-details {
        margin-top: 0.5rem;
        color: #888;
        font-size: 0.9rem;
    }
    
    .conversation-actions, .request-actions, .ad-response-actions {
        display: flex;
        gap: 0.5rem;
    }
    
    .ad-response-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .ad-response-content {
        margin-bottom: 1rem;
    }
    
    .responder-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    .responder-info img {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
    }
    
    .chat-window {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 600px;
        height: 70vh;
        background: white;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 2000;
        display: flex;
        flex-direction: column;
    }
    
    .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #e1e8ed;
        background: #f8f9fa;
        border-radius: 10px 10px 0 0;
    }
    
    .chat-partner-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .chat-partner-info img {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
    }
    
    .close-chat {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #666;
    }
    
    .chat-messages {
        flex: 1;
        padding: 1rem;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    .message {
        display: flex;
        max-width: 80%;
    }
    
    .message.received {
        align-self: flex-start;
    }
    
    .message.sent {
        align-self: flex-end;
    }
    
    .message-content {
        background: #f1f3f4;
        padding: 0.75rem 1rem;
        border-radius: 18px;
        position: relative;
    }
    
    .message.sent .message-content {
        background: var(--primary-color);
        color: white;
    }
    
    .message-time {
        font-size: 0.8rem;
        color: #666;
        margin-top: 0.25rem;
        display: block;
    }
    
    .message.sent .message-time {
        color: rgba(255,255,255,0.8);
    }
    
    .chat-input {
        display: flex;
        padding: 1rem;
        border-top: 1px solid #e1e8ed;
        gap: 0.5rem;
    }
    
    .chat-input textarea {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 5px;
        resize: none;
        font-family: inherit;
    }
    
    .no-requests, .no-conversations, .no-responses {
        text-align: center;
        padding: 2rem;
        color: #666;
    }
    
    @media (max-width: 768px) {
        .tabs-navigation {
            flex-direction: column;
        }
        
        .conversation-item, .request-item {
            flex-direction: column;
            text-align: center;
        }
        
        .conversation-actions, .request-actions {
            margin-top: 1rem;
            justify-content: center;
        }
        
        .chat-window {
            width: 95%;
            height: 80vh;
        }
    }
</style>
`;

// Initialisation de la page messages
document.addEventListener('DOMContentLoaded', () => {
  // Ajouter les styles
  document.head.insertAdjacentHTML('beforeend', messagesStyles);

  // Initialiser le gestionnaire de messages
  window.messagesManager = new MessagesManager();
});
