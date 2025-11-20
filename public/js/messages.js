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
    this.loadRealData();
    this.updateNotificationBadges();
    this.checkUrlParams();
  }

  // Vérifier les paramètres d'URL pour ouvrir automatiquement une conversation
  checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user');

    if (userId) {
      // Simuler l'ouverture d'une conversation avec l'utilisateur spécifié
      setTimeout(() => {
        this.openConversationWithUser(userId);
      }, 1000);
    }
  }

  // Ouvrir une conversation avec un utilisateur spécifique
  openConversationWithUser(userId) {
    // Rechercher si une conversation existe déjà avec cet utilisateur
    const existingConversation = this.conversations.find(
      conv => conv.withUser.id === userId
    );

    if (existingConversation) {
      this.showChatWindow(existingConversation);
    } else {
      // Créer une nouvelle conversation avec des données simulées
      const newConversation = {
        id: Date.now(),
        withUser: {
          id: userId,
          name: 'Utilisateur',
          age: 30,
          gender: 'autre',
          location: 'Localisation inconnue',
          photo: '/images/default-avatar.jpg',
          isOnline: true,
        },
        lastMessage: 'Nouvelle conversation',
        timestamp: new Date(),
        unread: 0,
        messages: [],
      };

      this.conversations.unshift(newConversation);
      this.renderConversations();
      this.showChatWindow(newConversation);
    }

    // Basculer vers l'onglet des conversations
    this.switchTab('conversations');
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
      } else if (e.target.classList.contains('view-profile')) {
        this.viewUserProfile(e.target);
      } else if (e.target.classList.contains('close-chat')) {
        this.closeChatWindow();
      } else if (e.target.classList.contains('send-message')) {
        this.sendChatMessage();
      }
    });

    // Ouvrir une conversation - Délégation d'événement
    document.addEventListener('click', e => {
      if (
        e.target.classList.contains('btn-secondary') &&
        e.target.textContent === 'Ouvrir'
      ) {
        const conversationItem = e.target.closest('.conversation-item');
        if (conversationItem) {
          console.log(
            '🔍 DEBUG - Bouton Ouvrir cliqué, conversationItem:',
            conversationItem
          );
          this.openConversation(conversationItem);
        }
      }
    });

    // Répondre à une annonce
    document.addEventListener('click', e => {
      if (e.target.textContent === 'Répondre') {
        this.respondToAd(e.target.closest('.ad-response-item'));
      }
    });
  }

  // Charger les vraies données depuis l'API
  async loadRealData() {
    try {
      const token = localStorage.getItem('hotmeet_token');
      if (!token) {
        // Rediriger vers la page de connexion si pas de token
        window.location.href = '/auth';
        return;
      }

      // Récupérer les demandes de chat en attente
      const requestsResponse = await fetch('/api/messages/requests', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        console.log(
          '📨 FRONTEND DEBUG - Données reçues du serveur:',
          requestsData
        );

        this.chatRequests = requestsData.requests.map(request => ({
          id: request.id,
          fromUser: {
            id: request.fromUser.id,
            nom: request.fromUser.nom,
            age: request.fromUser.age,
            sexe: request.fromUser.sexe,
            location: `${request.fromUser.localisation?.ville || ''}, ${request.fromUser.localisation?.region || ''}`,
            photo: request.fromUser.photo || '/images/default-avatar.jpg',
            isOnline: false, // À implémenter plus tard
          },
          message: request.content,
          timestamp: new Date(request.createdAt),
          status: 'pending',
        }));

        console.log(
          '📨 FRONTEND DEBUG - chatRequests après mapping:',
          this.chatRequests
        );
      } else {
        console.error(
          '❌ FRONTEND DEBUG - Erreur requête:',
          requestsResponse.status
        );
        this.chatRequests = [];
      }

      // Récupérer les conversations approuvées
      const conversationsResponse = await fetch('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json();
        console.log(
          '💬 FRONTEND DEBUG - Conversations reçues:',
          conversationsData
        );

        // Mapper les données des conversations reçues
        this.conversations = conversationsData.conversations || [];
        console.log(
          '📋 FRONTEND DEBUG - Conversations mappées:',
          this.conversations.length
        );
      } else {
        console.error(
          '❌ FRONTEND DEBUG - Erreur conversations:',
          conversationsResponse.status
        );
        this.conversations = [];
      }

      this.adResponses = [];

      this.renderAllData();
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      this.chatRequests = [];
      this.conversations = [];
      this.adResponses = [];
      this.renderAllData();
    }
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
  async acceptChatRequest(requestItem) {
    const requestId = requestItem.dataset.requestId;

    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch('/api/messages/requests/handle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messageId: requestId,
          action: 'approve',
        }),
      });

      if (response.ok) {
        // Supprimer la demande de la liste
        this.chatRequests = this.chatRequests.filter(
          req => req.id !== requestId
        );
        this.renderChatRequests();
        this.updateNotificationBadges();

        // Afficher un message de confirmation
        this.showNotification('Demande de chat acceptée ! ✅', 'success');

        // Recharger les données pour mettre à jour les conversations
        await this.loadRealData();

        // Basculer automatiquement vers l'onglet conversations si on a des conversations
        if (this.conversations && this.conversations.length > 0) {
          this.switchTab('conversations');
        }
      } else {
        const error = await response.json();
        this.showNotification(
          error.error?.message || "Erreur lors de l'acceptation",
          'error'
        );
      }
    } catch (error) {
      console.error('Erreur acceptation demande:', error);
      this.showNotification(
        "Erreur lors de l'acceptation de la demande",
        'error'
      );
    }
  }

  // Refuser une demande de chat
  async declineChatRequest(requestItem) {
    const requestId = requestItem.dataset.requestId;

    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch('/api/messages/requests/handle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messageId: requestId,
          action: 'reject',
        }),
      });

      if (response.ok) {
        // Supprimer la demande de la liste
        this.chatRequests = this.chatRequests.filter(
          req => req.id !== requestId
        );
        this.renderChatRequests();
        this.updateNotificationBadges();

        this.showNotification('Demande de chat refusée', 'info');
      } else {
        const error = await response.json();
        this.showNotification(
          error.error?.message || 'Erreur lors du refus',
          'error'
        );
      }
    } catch (error) {
      console.error('Erreur refus demande:', error);
      this.showNotification('Erreur lors du refus de la demande', 'error');
    }
  }

  // Ouvrir une conversation
  openConversation(conversationItem) {
    const conversationId = conversationItem.dataset.conversationId; // Pas de parseInt pour les ObjectId
    console.log('🔍 DEBUG - Conversation ID:', conversationId);
    console.log(
      '🔍 DEBUG - Conversations disponibles:',
      this.conversations.map(c => ({ id: c.id, nom: c.otherUser.nom }))
    );

    const conversation = this.conversations.find(
      conv => conv.id === conversationId
    );

    console.log('🔍 DEBUG - Conversation trouvée:', conversation);

    if (conversation) {
      this.showChatWindow(conversation);
    } else {
      console.error('Conversation non trouvée:', conversationId);
      alert(`Conversation non trouvée avec l'ID: ${conversationId}`);
    }
  }

  // Afficher la fenêtre de chat
  showChatWindow(conversation) {
    console.log('🔍 DEBUG - showChatWindow appelée avec:', conversation);

    const chatWindow = document.getElementById('chatWindow');
    console.log('🔍 DEBUG - chatWindow trouvé:', chatWindow);

    if (!chatWindow) {
      console.error('❌ Élément chatWindow non trouvé !');
      return;
    }

    const chatHeader = chatWindow.querySelector('.chat-partner-info');
    const chatMessages = chatWindow.querySelector('.chat-messages');

    console.log('🔍 DEBUG - chatHeader:', chatHeader);
    console.log('🔍 DEBUG - chatMessages:', chatMessages);

    if (!chatHeader) {
      console.error('❌ Élément .chat-partner-info non trouvé !');
      return;
    }

    // Mettre à jour l'en-tête du chat - CORRIGÉ: otherUser au lieu de withUser + statut en ligne
    chatHeader.innerHTML = `
            <img src="${conversation.otherUser.photo || '/images/default-avatar.jpg'}" alt="${conversation.otherUser.nom}" onerror="this.src='/images/default-avatar.jpg'">
            <div>
                <h3>${conversation.otherUser.nom}</h3>
                <span class="chat-status">En ligne</span>
            </div>
        `;

    // Charger les messages de la conversation
    this.loadConversationMessages(conversation.otherUser.id, chatMessages);

    // Masquer tous les onglets
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });

    // Afficher la fenêtre de chat
    console.log('🔍 DEBUG - Affichage de la fenêtre de chat...');
    chatWindow.style.display = 'block';
    chatWindow.classList.add('active');

    console.log(
      '🔍 DEBUG - Fenêtre de chat affichée, style.display:',
      chatWindow.style.display
    );
  }

  // Charger les messages d'une conversation
  async loadConversationMessages(otherUserId, chatMessagesContainer) {
    try {
      console.log('🔄 Chargement des messages pour:', otherUserId);

      const token = localStorage.getItem('hotmeet_token');
      console.log('🔑 Token trouvé:', token ? 'OUI' : 'NON');
      console.log(
        '🔑 Token preview:',
        token ? token.substring(0, 20) + '...' : 'AUCUN'
      );

      if (!token) {
        console.error('❌ Token manquant !');
        chatMessagesContainer.innerHTML =
          '<div class="error-message">Erreur d\'authentification. Veuillez vous reconnecter.</div>';
        return;
      }

      console.log(
        '📡 URL requête:',
        `/api/messages/conversations/${otherUserId}`
      );

      const response = await fetch(
        `/api/messages/conversations/${otherUserId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('📬 Messages reçus:', data);

      if (data.success && data.messages) {
        // Vider le container
        chatMessagesContainer.innerHTML = '';

        // Ajouter chaque message
        data.messages.forEach(message => {
          const messageElement = this.createChatMessageElement(message);
          chatMessagesContainer.appendChild(messageElement);
        });

        // Scroller vers le bas
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
      } else {
        chatMessagesContainer.innerHTML =
          '<div class="no-messages">Aucun message dans cette conversation.</div>';
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des messages:', error);
      chatMessagesContainer.innerHTML =
        '<div class="error-message">Erreur lors du chargement des messages.</div>';
    }
  }

  // Créer un élément message pour le chat
  createChatMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.isOwn ? 'sent' : 'received'}`;

    const messageTime = new Date(message.createdAt).toLocaleTimeString(
      'fr-FR',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );

    messageDiv.innerHTML = `
      <div class="message-content">
        <p>${message.content}</p>
        <span class="message-time">${messageTime}</span>
      </div>
    `;

    return messageDiv;
  }

  // Fermer la fenêtre de chat
  closeChatWindow() {
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.style.display = 'none';

    // Réafficher l'onglet actuel
    document.getElementById(this.currentTab).style.display = 'block';
  }

  // Envoyer un message dans le chat
  // Envoyer un message dans le chat - VRAIE COMMUNICATION UTILISATEURS
  async sendChatMessage() {
    console.log('🚀 DEBUT sendChatMessage');

    const chatInput = document.querySelector('.chat-input textarea');
    const messageContent = chatInput.value.trim();

    console.log('📝 Contenu message:', messageContent);

    if (!messageContent) {
      console.log('❌ Message vide, arrêt');
      return;
    }

    // Récupérer l'ID de l'autre utilisateur depuis la conversation active
    const currentConversation = this.getCurrentConversationUser();
    console.log('👥 Conversation actuelle:', currentConversation);

    if (!currentConversation) {
      console.error('❌ Conversation non identifiée');
      alert('Erreur: conversation non identifiée');
      return;
    }

    try {
      const token = localStorage.getItem('hotmeet_token');
      console.log('🔑 Token:', token ? 'PRÉSENT' : 'MANQUANT');

      if (!token) {
        console.error('❌ Token manquant');
        alert("Erreur d'authentification");
        return;
      }

      const requestData = {
        toUserId: currentConversation.otherUserId,
        content: messageContent,
        provenance: 'conversation',
      };
      console.log('📤 Données à envoyer:', requestData);

      // Envoyer le message via l'API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      console.log('📡 Réponse HTTP status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur API:', errorText);
        throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Réponse API:', data);

      if (data.success) {
        // Ajouter le message à l'interface immédiatement
        const newMessage = {
          id: data.message.id,
          content: messageContent,
          createdAt: new Date(),
          isOwn: true,
          sender: { nom: 'Vous' },
        };

        const messageElement = this.createChatMessageElement(newMessage);
        document.querySelector('.chat-messages').appendChild(messageElement);

        // Vider le champ et scroller
        chatInput.value = '';
        document.querySelector('.chat-messages').scrollTop =
          document.querySelector('.chat-messages').scrollHeight;

        console.log('✅ Message envoyé avec succès');
      } else {
        alert("Erreur lors de l'envoi du message");
      }
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      alert("Erreur lors de l'envoi du message");
    }
  }

  // Récupérer l'utilisateur de la conversation actuelle
  getCurrentConversationUser() {
    // Chercher dans le header de chat actuel
    const chatHeader = document.querySelector('.chat-partner-info h3');
    if (!chatHeader) return null;

    const otherUserName = chatHeader.textContent;
    const conversation = this.conversations.find(
      conv => conv.otherUser.nom === otherUserName
    );

    return conversation
      ? {
          otherUserId: conversation.otherUser.id,
          otherUserName: conversation.otherUser.nom,
        }
      : null;
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
      console.error('❌ FRONTEND DEBUG - Element .requests-list non trouvé !');
      return;
    }

    const pendingRequests = this.chatRequests.filter(
      req => req.status === 'pending'
    );

    console.log(
      '📨 RENDER DEBUG - Demandes à afficher:',
      pendingRequests.length
    );
    console.log('📨 RENDER DEBUG - Détails:', pendingRequests);

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
                    <img src="${request.fromUser.photo || '/images/default-avatar.jpg'}" alt="${request.fromUser.nom}" onerror="this.src='/images/default-avatar.jpg'">
                    <div class="online-status offline"></div>
                </div>
                <div class="request-info">
                    <div class="request-header">
                        <h3>${request.fromUser.nom || 'Utilisateur'}</h3>
                        <span class="request-time">${this.formatTimeAgo(request.timestamp)}</span>
                    </div>
                    <p class="request-message">"${request.message || 'Message vide'}"</p>
                    <div class="request-details">
                        <span>${request.fromUser.age || 'N/A'} ans • ${request.fromUser.sexe ? request.fromUser.sexe.charAt(0).toUpperCase() + request.fromUser.sexe.slice(1) : 'Non spécifié'} • ${request.fromUser.location || 'Localisation non spécifiée'}</span>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn-outline view-profile" data-user-id="${request.fromUser.id}">
                        <i class="fas fa-user"></i> Voir le profil
                    </button>
                    <button class="btn-primary accept-request">Accepter</button>
                    <button class="btn-secondary decline-request">Refuser</button>
                </div>
            </div>
        `
      )
      .join('');

    // Mettre à jour les badges après le rendu
    this.updateNotificationBadges();
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
                    <img src="${conversation.otherUser.photo || '/images/default-avatar.jpg'}" alt="${conversation.otherUser.nom}" onerror="this.src='/images/default-avatar.jpg'">
                    <div class="online-status offline"></div>
                </div>
                <div class="conversation-info">
                    <div class="conversation-header">
                        <h3>${conversation.otherUser.nom}</h3>
                        <span class="conversation-time">${this.formatTimeAgo(new Date(conversation.lastMessageDate))}</span>
                    </div>
                    <p class="conversation-preview">${conversation.lastMessage}</p>
                    <div class="conversation-details">
                        <span>${conversation.otherUser.age} ans • ${conversation.otherUser.sexe} • ${conversation.messageCount} messages</span>
                    </div>
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

  // Voir le profil d'un utilisateur
  viewUserProfile(button) {
    const userId = button.getAttribute('data-user-id');
    if (userId) {
      // Rediriger vers la page de visualisation du profil avec l'ID de l'utilisateur
      window.location.href = `/profile-view?id=${userId}`;
    }
  }

  // Afficher une notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
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
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Styles CSS pour la page messages
const messagesStyles = `
<style>
    .btn-outline {
        background: transparent;
        border: 1px solid var(--primary-color);
        color: var(--primary-color);
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .btn-outline:hover {
        background: var(--primary-color);
        color: white;
    }
    
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
