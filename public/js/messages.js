// HotMeet - JavaScript pour la page Messages
class MessagesManager {
  constructor() {
    this.currentTab = 'conversations';
    this.chatRequests = [];
    this.conversations = [];
    this.adResponses = [];
    this.tonightRequests = []; // Nouveau: demandes Ce Soir
    this.pollInterval = null; // Pour vérifier les nouveaux messages
    this.isPolling = false;
    this.currentChatUser = null; // Utilisateur actuel dans le chat ouvert
    this.socket = null; // Socket.io connection
    this.lastUnreadResponses = 0; // Pour tracking des notifications
    this.init();
  }

  // Initialisation de la page messages
  init() {
    this.setupEventListeners();
    this.setupSocket();
    this.loadRealData();
    this.updateNotificationBadges();
    this.checkUrlParams();
    // DÉSACTIVÉ: this.startMessagePolling(); // On utilise maintenant Socket.io exclusivement
  }

  // Configuration Socket.io pour le temps réel
  setupSocket() {
    try {
      this.socket = io();

      // Écouter les nouveaux messages reçus
      this.socket.on('message-received', data => {
        this.handleNewMessage(data);
      });

      // Écouter les nouvelles demandes de chat
      this.socket.on('chat-request-received', data => {
        this.handleNewChatRequest(data);
      });

      // Indicateurs de frappe
      this.socket.on('user-typing', data => {
        this.showTypingIndicator(data.userId);
      });

      this.socket.on('user-stopped-typing', data => {
        this.hideTypingIndicator(data.userId);
      });

      // Rejoindre les conversations quand on ouvre un chat
      this.socket.on('connect', () => {
        console.log('✅ Socket.io connecté pour les messages');
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Socket.io déconnecté');
      });
    } catch (error) {
      console.error('❌ Erreur Socket.io:', error);
      // Fallback vers polling si Socket.io échoue
    }
  }

  // Vérifier les paramètres d'URL pour ouvrir automatiquement une conversation
  checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user');
    const adId = urlParams.get('ad');

    if (userId) {
      // Simuler l'ouverture d'une conversation avec l'utilisateur spécifié
      setTimeout(() => {
        this.openConversationWithUser(userId);
      }, 1000);
    } else if (adId) {
      // Ouvrir une conversation pour répondre à une annonce
      setTimeout(() => {
        this.openConversationFromAd(adId);
      }, 1000);
    }
  }

  // Ouvrir une conversation avec un utilisateur spécifique
  async openConversationWithUser(userId) {
    console.log('🔍 Ouverture conversation avec utilisateur:', userId);

    // Rechercher si une conversation existe déjà avec cet utilisateur
    const existingConversation = this.conversations.find(
      conv => conv.withUser.id === userId
    );

    if (existingConversation) {
      console.log('✅ Conversation existante trouvée');
      this.showChatWindow(existingConversation);
    } else {
      try {
        console.log('🔍 Chargement conversation depuis API...');
        const token = localStorage.getItem('hotmeet_token');
        if (!token) {
          console.error("❌ Pas de token d'authentification");
          return;
        }

        // Charger la conversation depuis l'API
        const response = await fetch(
          `/api/messages/conversation/${userId}?_=${Date.now()}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
            },
            credentials: 'include',
          }
        );

        if (response.ok) {
          const conversationData = await response.json();
          console.log('✅ Données conversation reçues:', conversationData);

          if (conversationData.success && conversationData.conversation) {
            const conversation = conversationData.conversation;

            // Ajouter la conversation à la liste et l'afficher
            this.conversations.unshift(conversation);
            this.renderConversations();
            this.showChatWindow(conversation);
          } else {
            console.warn(
              "⚠️ Pas de conversation trouvée, création d'une nouvelle"
            );
            // Créer une conversation temporaire pour permettre l'envoi de messages
            this.createTemporaryConversation(userId);
          }
        } else {
          console.error('❌ Erreur API:', response.status);
          this.createTemporaryConversation(userId);
        }
      } catch (error) {
        console.error(
          '❌ Erreur lors du chargement de la conversation:',
          error
        );
        this.createTemporaryConversation(userId);
      }
    }

    // Basculer vers l'onglet des conversations
    this.switchTab('conversations');
  }

  // Créer une conversation temporaire pour un nouvel utilisateur
  createTemporaryConversation(userId) {
    console.log('🆕 Création conversation temporaire pour:', userId);
    const newConversation = {
      id: Date.now(),
      withUser: {
        id: userId,
        name: 'Chargement...',
        age: '',
        gender: 'autre',
        location: 'Chargement...',
        photo: '/images/default-avatar.jpg',
        isOnline: false,
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

  // Ouvrir une conversation pour répondre à une annonce
  async openConversationFromAd(adId) {
    try {
      // Récupérer les détails de l'annonce pour connaître l'annonceur
      const response = await fetch(`/api/ads/public/${adId}`);
      const result = await response.json();

      if (result.success && result.ad) {
        const ad = result.ad;
        const advertiser = ad.userId;

        // Vérifier qu'on ne répond pas à sa propre annonce
        const currentUser = JSON.parse(
          localStorage.getItem('hotmeet_user') || '{}'
        );
        if (advertiser._id === currentUser._id) {
          this.showNotification(
            'Vous ne pouvez pas répondre à votre propre annonce',
            'error'
          );
          return;
        }

        // Rechercher si une réponse d'annonce existe déjà avec cet utilisateur pour cette annonce
        const existingResponse = this.adResponses.find(
          resp => resp.adId === adId && resp.withUser.id === advertiser._id
        );

        if (existingResponse) {
          // Basculer sur l'onglet "Réponses aux annonces" et ouvrir le chat
          this.showTab('ad-responses');
          this.showChatWindow(existingResponse);
        } else {
          // Créer une nouvelle réponse d'annonce
          const newAdResponse = {
            id: Date.now(),
            adId: ad._id,
            adTitle: ad.title,
            withUser: {
              id: advertiser._id,
              name: advertiser.profile?.nom || 'Annonceur',
              age: advertiser.profile?.age || 'N/A',
              gender: advertiser.profile?.sexe || 'autre',
              location:
                advertiser.profile?.localisation?.ville ||
                'Localisation inconnue',
              photo:
                advertiser.profile?.photos?.find(p => p.isProfile)?.url ||
                '/images/default-avatar.jpg',
              isOnline: true,
            },
            // Pour compatibilité avec showChatWindow
            otherUser: {
              id: advertiser._id,
              nom: advertiser.profile?.nom || 'Annonceur',
              age: advertiser.profile?.age || 'N/A',
              gender: advertiser.profile?.sexe || 'autre',
              location:
                advertiser.profile?.localisation?.ville ||
                'Localisation inconnue',
              photo:
                advertiser.profile?.photos?.find(p => p.isProfile)?.url ||
                '/images/default-avatar.jpg',
              isOnline: true,
            },
            lastMessage: `Nouveau contact pour: ${ad.title}`,
            timestamp: new Date(),
            unread: 0,
            messages: [],
            adContext: {
              id: ad._id,
              title: ad.title,
              description: ad.description.substring(0, 100) + '...',
              category: ad.category,
            },
          };

          // Ajouter la réponse au début de la liste
          this.adResponses.unshift(newAdResponse);

          // Basculer sur l'onglet "Réponses aux annonces"
          this.showTab('ad-responses');

          // Rendre la liste des réponses et ouvrir le chat
          this.renderAdResponses();
          this.showChatWindow(newAdResponse);
        }
      } else {
        this.showNotification('Annonce non trouvée', 'error');
      }
    } catch (error) {
      console.error("Erreur lors de l'ouverture de la conversation:", error);
      this.showNotification(
        "Erreur lors de l'ouverture de la conversation",
        'error'
      );
    }
  }

  // Afficher le contexte de l'annonce dans le chat
  showAdContextInChat(conversation) {
    if (!conversation.adContext) {
      return;
    }

    // Créer un message système pour le contexte de l'annonce
    const contextMessage = {
      id: Date.now(),
      sender: 'system',
      content: `💼 Conversation au sujet de l'annonce: "${conversation.adContext.title}"

📝 ${conversation.adContext.description}

💡 Vous pouvez maintenant discuter avec l'annonceur !`,
      timestamp: new Date(),
      type: 'system',
    };

    // Ajouter le message de contexte à la conversation
    conversation.messages.push(contextMessage);
  }

  // Configuration des écouteurs d'événements
  setupEventListeners() {
    // Supprimer les anciens listeners s'ils existent
    if (this.boundHandlers) {
      document.removeEventListener('click', this.boundHandlers.clickHandler);
      document.removeEventListener(
        'click',
        this.boundHandlers.conversationHandler
      );
      document.removeEventListener('click', this.boundHandlers.adHandler);
      document.removeEventListener('click', this.boundHandlers.tabHandler);
    }

    // Créer les handlers liés
    this.boundHandlers = {
      clickHandler: this.handleDocumentClick.bind(this),
      conversationHandler: this.handleConversationClick.bind(this),
      adHandler: this.handleAdClick.bind(this),
      tabHandler: this.handleTabClick.bind(this),
    };

    // Navigation par onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Actions des demandes de chat
    document.addEventListener('click', this.boundHandlers.clickHandler);
    document.addEventListener('click', this.boundHandlers.conversationHandler);
    document.addEventListener('click', this.boundHandlers.adHandler);
    document.addEventListener('click', this.boundHandlers.tabHandler);
  }

  // Handler principal pour les clics
  handleDocumentClick(e) {
    if (e.target.classList.contains('accept-request')) {
      this.acceptChatRequest(e.target.closest('.request-item'));
    } else if (e.target.classList.contains('decline-request')) {
      this.declineChatRequest(e.target.closest('.request-item'));
    } else if (e.target.classList.contains('accept-tonight-request')) {
      this.acceptTonightRequest(e.target.closest('.tonight-request-item'));
    } else if (e.target.classList.contains('decline-tonight-request')) {
      this.declineTonightRequest(e.target.closest('.tonight-request-item'));
    } else if (e.target.classList.contains('accept-photo-request')) {
      console.log('🔥🔥🔥 BOUTON ACCEPTER CLIQUÉ ! 🔥🔥🔥');
      console.log('🔥 DEBUG: Target element:', e.target);
      console.log('🔥 DEBUG: Classes:', e.target.classList);
      console.log('🔥 DEBUG: Dataset:', e.target.dataset);
      const requestId = e.target.dataset.requestId;
      console.log('🔥 DEBUG: Request ID récupéré:', requestId);
      if (requestId) {
        console.log('🚀 APPEL handlePhotoRequest avec ACCEPT');
        this.handlePhotoRequest(requestId, 'accept');
      } else {
        console.error('❌ Pas de request ID trouvé !');
      }
    } else if (e.target.classList.contains('decline-photo-request')) {
      console.log('🔥🔥🔥 BOUTON REFUSER CLIQUÉ ! 🔥🔥🔥');
      console.log('🔥 DEBUG: Target element:', e.target);
      console.log('🔥 DEBUG: Classes:', e.target.classList);
      console.log('🔥 DEBUG: Dataset:', e.target.dataset);
      const requestId = e.target.dataset.requestId;
      console.log('🔥 DEBUG: Request ID récupéré:', requestId);
      if (requestId) {
        console.log('🚀 APPEL handlePhotoRequest avec REJECT');
        this.handlePhotoRequest(requestId, 'reject');
      } else {
        console.error('❌ Pas de request ID trouvé !');
      }
    } else if (e.target.classList.contains('view-profile')) {
      this.viewUserProfile(e.target);
    } else if (e.target.classList.contains('close-chat')) {
      console.log('🔍 DEBUG - Bouton close-chat cliqué !');
      this.closeChatWindow();
    } else if (e.target.classList.contains('send-message')) {
      this.sendChatMessage();
    }
  }

  // Handler pour les conversations
  handleConversationClick(e) {
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
    } else if (e.target.classList.contains('btn-view-profile')) {
      // Nouveau bouton "Voir profil"
      const userId = e.target.dataset.userId;
      if (userId) {
        window.location.href = `/profile-view?id=${userId}`;
      }
    }
  }

  // Handler pour les annonces
  handleAdClick(e) {
    if (e.target.textContent === 'Répondre') {
      this.respondToAd(e.target.closest('.ad-response-item'));
    }
  }

  // Handler pour les onglets
  handleTabClick(e) {
    if (
      e.target.classList.contains('tab-btn') &&
      e.target.getAttribute('data-tab') === 'ad-responses'
    ) {
      console.log(
        '🔍 DEBUG - Clic sur onglet Annonces, rechargement des données...'
      );
      // Forcer le rechargement des réponses aux annonces
      this.loadRealData();
    }
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

      // ⚠️ GESTION REDIRECTION PREMIUM AUTOMATIQUE
      if (!requestsResponse.ok) {
        const errorData = await requestsResponse.json();
        if (errorData.error === 'premium_required') {
          // 🚀 REDIRECTION AUTOMATIQUE VERS PAGE PAYPAL
          console.log('🔒 Messagerie premium requise - Redirection PayPal');
          window.location.href = errorData.redirectTo || '/pages/premium.html';
          return;
        }
        if (errorData.error === 'invalid_token') {
          // 🚀 REDIRECTION VERS CONNEXION
          console.log('🔒 Token invalide - Redirection connexion');
          window.location.href = errorData.redirectTo || '/pages/auth.html';
          return;
        }
        throw new Error(errorData.message || 'Erreur lors du chargement');
      }

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
      const conversationsResponse = await fetch(
        `/api/messages/conversations?_=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        }
      );

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

      // Récupérer les demandes Ce Soir
      try {
        const tonightResponse = await fetch('/api/tonight/requests', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (tonightResponse.ok) {
          const tonightData = await tonightResponse.json();
          this.tonightRequests = tonightData.requests || [];
        } else {
          this.tonightRequests = [];
        }
      } catch (error) {
        console.warn('API Ce Soir non disponible:', error);
        // Pas de données de test - utiliser seulement les vraies données API
        this.tonightRequests = [];
      }

      // Récupérer les réponses aux annonces
      try {
        const adResponsesResponse = await fetch('/api/ads/responses', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (adResponsesResponse.ok) {
          const adResponsesData = await adResponsesResponse.json();
          console.log(
            '🔍 DEBUG - Réponse /api/ads/responses:',
            adResponsesData
          );
          this.adResponses = adResponsesData.responses || [];
          console.log(
            '🔍 DEBUG - adResponses après assignation:',
            this.adResponses
          );
          // LOGS DÉTAILLÉS POUR DEBUG LILITH
          console.log(
            '🔍 DEBUG LILITH - Type adResponses:',
            typeof this.adResponses
          );
          console.log(
            '🔍 DEBUG LILITH - Est un Array?',
            Array.isArray(this.adResponses)
          );
          console.log('🔍 DEBUG LILITH - Longueur:', this.adResponses.length);
          if (this.adResponses.length > 0) {
            console.log(
              '🔍 DEBUG LILITH - Premier élément:',
              this.adResponses[0]
            );
            console.log(
              '🔍 DEBUG LILITH - Premier élément JSON:',
              JSON.stringify(this.adResponses[0])
            );
          }
        } else {
          console.warn(
            '❌ Erreur API ads/responses - Status:',
            adResponsesResponse.status
          );
          this.adResponses = [];
        }
      } catch (error) {
        console.warn('API réponses aux annonces non disponible:', error);
        // Pas de données de test - utiliser seulement les vraies données API
        this.adResponses = [];
      }

      // Charger les demandes de photos privées
      await this.loadPhotoRequests();

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

    // Charger les données spécifiques à l'onglet
    if (tabName === 'photo-requests') {
      this.loadPhotoRequests();
    }
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

        // 💎 GESTION REDIRECTION PREMIUM pour acceptation
        if (error.error?.code === 'PREMIUM_REQUIRED') {
          console.log('🔒 Premium requis pour accepter - Redirection');
          window.location.href =
            error.error.redirectTo || '/pages/premium.html';
          return;
        }

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

  // Accepter une demande Ce Soir
  async acceptTonightRequest(requestItem) {
    const requestId = requestItem.dataset.requestId;

    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch('/api/tonight/handle-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: requestId,
          action: 'approve',
        }),
      });

      if (response.ok) {
        // Supprimer la demande de la liste
        this.tonightRequests = this.tonightRequests.filter(
          req => req.id !== requestId
        );
        this.renderTonightRequests();
        this.updateNotificationBadges();

        this.showNotification('Demande Ce Soir acceptée ! 🌃', 'success');
      } else {
        const error = await response.json();
        this.showNotification(
          error.error?.message || "Erreur lors de l'acceptation",
          'error'
        );
      }
    } catch (error) {
      console.error('Erreur acceptation demande Ce Soir:', error);
      this.showNotification(
        "Erreur lors de l'acceptation de la demande Ce Soir",
        'error'
      );
    }
  }

  // Refuser une demande Ce Soir
  async declineTonightRequest(requestItem) {
    const requestId = requestItem.dataset.requestId;

    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch('/api/tonight/handle-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: requestId,
          action: 'reject',
        }),
      });

      if (response.ok) {
        // Supprimer la demande de la liste
        this.tonightRequests = this.tonightRequests.filter(
          req => req.id !== requestId
        );
        this.renderTonightRequests();
        this.updateNotificationBadges();

        this.showNotification('Demande Ce Soir refusée', 'info');
      } else {
        const error = await response.json();
        this.showNotification(
          error.error?.message || 'Erreur lors du refus',
          'error'
        );
      }
    } catch (error) {
      console.error('Erreur refus demande Ce Soir:', error);
      this.showNotification(
        'Erreur lors du refus de la demande Ce Soir',
        'error'
      );
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

    // Sauvegarder l'utilisateur actuel du chat pour le polling
    this.currentChatUser = {
      otherUserId: conversation.otherUser.id,
      nom: conversation.otherUser.nom,
      photo: conversation.otherUser.photo,
    };

    // ✨ TEMPS RÉEL: Rejoindre la conversation via Socket.io
    if (this.socket) {
      // NOUVELLE APPROCHE: Utiliser le token pour identifier l'utilisateur
      let currentUserId = null;

      // Méthode 1: Essayer localStorage user profile
      try {
        const userProfile = localStorage.getItem('hotmeet_user_profile');
        if (userProfile) {
          const currentUser = JSON.parse(userProfile);
          if (currentUser._id) {
            currentUserId = currentUser._id;
          }
        }
      } catch (error) {
        console.warn('Erreur parsing user profile:', error);
      }

      // Méthode 2: Si pas trouvé, utiliser le token JWT
      if (!currentUserId) {
        try {
          const token = localStorage.getItem('hotmeet_token');
          if (token) {
            // Décoder le token JWT pour récupérer l'userId
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserId = payload.userId;
            console.log('🔍 UserId récupéré depuis token JWT:', currentUserId);
          }
        } catch (error) {
          console.warn('Erreur décodage token JWT:', error);
        }
      }

      // Méthode 3: Dernière tentative
      if (!currentUserId) {
        console.warn('⚠️ Impossible de récupérer userId, skip Socket.io');
        // Ne pas rejoindre si on n'a pas d'ID valide
        return;
      }

      console.log('🔍 CLIENT - Rejoindre conversation:', {
        userId: currentUserId,
        otherUserId: conversation.otherUser.id,
        conversationId: [currentUserId, conversation.otherUser.id]
          .sort()
          .join('_'),
      });

      this.socket.emit('join-conversation', {
        userId: currentUserId,
        otherUserId: conversation.otherUser.id,
      });
    } else {
      console.log('❌ Socket non disponible pour rejoindre conversation');
    }

    // Mettre à jour seulement les infos du partenaire (pas le bouton close)
    const chatPartnerInfo = chatWindow.querySelector('.chat-partner-info');
    if (chatPartnerInfo) {
      chatPartnerInfo.innerHTML = `
              <img src="${conversation.otherUser.photo || '/images/default-avatar.jpg'}" alt="${conversation.otherUser.nom}" onerror="this.src='/images/default-avatar.jpg'">
              <div>
                  <h3>${conversation.otherUser.nom}</h3>
                  <span class="chat-status">En ligne</span>
              </div>
          `;
    }

    // Charger les messages de la conversation
    this.loadConversationMessages(conversation.otherUser.id, chatMessages);

    // Marquer les messages comme lus pour cette conversation
    this.markConversationAsRead(conversation.otherUser.id);

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
      const token = localStorage.getItem('hotmeet_token');

      if (!token) {
        chatMessagesContainer.innerHTML =
          '<div class="error-message">Erreur d\'authentification. Veuillez vous reconnecter.</div>';
        return;
      }

      const response = await fetch(
        `/api/messages/conversations/${otherUserId}?_=${Date.now()}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();

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
      chatMessagesContainer.innerHTML =
        '<div class="error-message">Erreur lors du chargement des messages.</div>';
    }
  }

  // Créer un élément message pour le chat
  createChatMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${message.isOwn ? 'sent' : 'received'}`;

    const messageTime = new Date(message.createdAt).toLocaleTimeString(
      'fr-FR',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );

    messageDiv.innerHTML = `
      <div class="chat-message-content">
        <p>${message.content}</p>
        <span class="message-time">${messageTime}</span>
      </div>
    `;

    return messageDiv;
  }

  // Fermer la fenêtre de chat
  closeChatWindow() {
    console.log('🔍 DEBUG - closeChatWindow appelée !');
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow) {
      chatWindow.style.display = 'none';
      chatWindow.classList.remove('active');
      console.log('🔍 DEBUG - Fenêtre cachée et classe active supprimée');
    } else {
      console.error('🔍 DEBUG - chatWindow introuvable !');
    }

    // ✨ TEMPS RÉEL: Quitter la conversation via Socket.io
    if (this.socket && this.currentChatUser) {
      // Utiliser le même système que showChatWindow pour récupérer userId
      let currentUserId = null;

      // Méthode 1: localStorage user profile
      try {
        const userProfile = localStorage.getItem('hotmeet_user_profile');
        if (userProfile) {
          const currentUser = JSON.parse(userProfile);
          if (currentUser._id) {
            currentUserId = currentUser._id;
          }
        }
      } catch (error) {
        console.warn(
          'Erreur parsing user profile dans closeChatWindow:',
          error
        );
      }

      // Méthode 2: Token JWT
      if (!currentUserId) {
        try {
          const token = localStorage.getItem('hotmeet_token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserId = payload.userId;
          }
        } catch (error) {
          console.warn(
            'Erreur décodage token JWT dans closeChatWindow:',
            error
          );
        }
      }

      if (currentUserId) {
        this.socket.emit('leave-conversation', {
          userId: currentUserId,
          otherUserId: this.currentChatUser.otherUserId,
        });
      }
    }

    // Réinitialiser l'utilisateur actuel du chat
    this.currentChatUser = null;

    // Réafficher l'onglet actuel
    document.getElementById(this.currentTab).style.display = 'block';
  }

  // Envoyer un message dans le chat
  async sendChatMessage() {
    const chatInput = document.querySelector('.chat-input textarea');
    const messageContent = chatInput.value.trim();
    if (!messageContent) {
      return;
    }

    // Utiliser directement this.currentChatUser qui est défini quand on ouvre une conversation
    if (!this.currentChatUser || !this.currentChatUser.otherUserId) {
      alert('Erreur: aucune conversation active');
      return;
    }
    try {
      const token = localStorage.getItem('hotmeet_token');

      if (!token) {
        alert("Erreur d'authentification");
        return;
      }

      const requestData = {
        toUserId: this.currentChatUser.otherUserId,
        content: messageContent,
        provenance: 'conversation',
      };

      // Envoyer le message via l'API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // 💎 GESTION LIMITE DE MESSAGES PREMIUM
        if (errorData.error?.code === 'MESSAGE_LIMIT_REACHED') {
          const messageCount = errorData.error.messageCount || 3;
          const limitMessage = `Limite de 3 messages atteinte entre non-premium. 💡 Astuce: Écrivez à des membres premium pour des conversations illimitées !`;

          // Afficher message informatif
          alert(limitMessage);

          // Redirection automatique après 3 secondes
          setTimeout(() => {
            window.location.href =
              errorData.error.redirectTo || '/pages/premium.html';
          }, 3000);

          return;
        }

        throw new Error(
          errorData.error?.message || "Erreur lors de l'envoi du message"
        );
      }

      const data = await response.json();

      if (data.success) {
        // Vider le champ immédiatement
        chatInput.value = '';

        // Afficher le message instantanément côté client
        const chatMessagesContainer = document.querySelector('.chat-messages');

        // Créer le message immédiatement pour feedback instantané
        const newMessage = {
          content: messageContent,
          isOwn: true,
          createdAt: new Date().toISOString(),
        };
        const messageElement = this.createChatMessageElement(newMessage);
        chatMessagesContainer.appendChild(messageElement);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

        // ✨ TEMPS RÉEL: Émettre le message via Socket.io
        if (this.socket) {
          const currentUser = JSON.parse(
            localStorage.getItem('hotmeet_user') || '{}'
          );
          this.socket.emit('new-message', {
            fromUserId: currentUser._id,
            toUserId: this.currentChatUser.otherUserId,
            message: {
              content: messageContent,
              createdAt: new Date().toISOString(),
            },
          });
        }

        // Puis recharger depuis l'API pour la synchronisation complète
        if (this.currentChatUser && this.currentChatUser.otherUserId) {
          const reloadResponse = await fetch(
            `/api/messages/conversations/${this.currentChatUser.otherUserId}?_=${Date.now()}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
              },
              credentials: 'include',
            }
          );

          if (reloadResponse.ok) {
            const messagesData = await reloadResponse.json();
            if (messagesData.success && messagesData.messages) {
              chatMessagesContainer.innerHTML = '';
              messagesData.messages.forEach(msg => {
                const msgElement = this.createChatMessageElement(msg);
                chatMessagesContainer.appendChild(msgElement);
              });
              chatMessagesContainer.scrollTop =
                chatMessagesContainer.scrollHeight;
            }
          }
        }
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

  // Marquer une conversation comme lue
  async markConversationAsRead(otherUserId) {
    try {
      const token = localStorage.getItem('hotmeet_token');
      if (!token) return;

      // Marquer tous les messages non lus de cette conversation comme lus
      const response = await fetch('/api/messages/mark-conversation-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otherUserId }),
      });

      if (response.ok) {
        // Mettre à jour localement le compteur de non lus
        const conversation = this.conversations.find(
          conv => conv.otherUser.id === otherUserId
        );
        if (conversation) {
          conversation.unreadCount = 0;
          this.renderConversations();
          this.updateNotificationBadges();
        }
      }
    } catch (error) {
      console.error('Erreur marquage messages lus:', error);
    }
  }

  // Marquer toutes les conversations comme vues (quand on clique sur l'onglet)
  markAllConversationsAsViewed() {
    // Réinitialiser localement tous les compteurs de non lus
    this.conversations.forEach(conversation => {
      conversation.unreadCount = 0;
    });

    // Mettre à jour l'affichage immédiatement
    this.renderConversations();
    this.updateNotificationBadges();

    console.log('🔔 CONVERSATIONS VUES - Badges masqués');
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

    // CORRECTION: Compter les réponses aux annonces avec des messages non lus
    const unreadResponses = this.adResponses.filter(
      resp => resp.unreadCount > 0
    ).length;

    // Compter le total des messages non lus dans les réponses aux annonces
    const totalUnreadAdMessages = this.adResponses.reduce((total, resp) => {
      return total + (resp.unreadCount || 0);
    }, 0);

    const pendingTonightRequests = this.tonightRequests.filter(
      req => req.status === 'pending'
    ).length;

    // Compter les demandes de photos privées en attente
    const pendingPhotoRequests =
      (this.photoRequests && this.photoRequests.pending) || 0;

    // Compter les messages non lus dans les conversations
    const unreadMessages = this.conversations.reduce((total, conv) => {
      return total + (conv.unreadCount || 0);
    }, 0);

    console.log('🔔 BADGE DEBUG - Données pour badges:');
    console.log('   - Conversations non lues:', unreadMessages);
    console.log('   - Demandes en attente:', pendingRequests);
    console.log('   - Réponses non lues:', unreadResponses);
    console.log('   - Demandes Ce Soir:', pendingTonightRequests);
    console.log('   - Demandes photos:', pendingPhotoRequests);
    console.log('   - Conversations data:', this.conversations);

    const totalNotifications =
      pendingRequests +
      unreadResponses +
      unreadMessages +
      pendingTonightRequests +
      pendingPhotoRequests; // Ajouter les demandes photos

    // Badge principal (messages) - icône en haut du site
    const messageBadge = document.getElementById('messageBadge');
    if (messageBadge) {
      if (totalNotifications > 0) {
        messageBadge.textContent = totalNotifications;
        messageBadge.style.display = 'inline';
        messageBadge.classList.add('active');
      } else {
        messageBadge.style.display = 'none';
        messageBadge.classList.remove('active');
      }
    }

    // Badge des conversations dans la page messages
    const conversationsBadge = document.getElementById('conversationsBadge');
    if (conversationsBadge) {
      console.log('🔔 DEBUG BADGE - Element trouvé:', conversationsBadge);
      console.log('🔔 DEBUG BADGE - unreadMessages:', unreadMessages);
      console.log(
        '🔔 DEBUG BADGE - conversations avec unread:',
        this.conversations.filter(c => c.unreadCount > 0)
      );

      // Même logique que le badge principal - montrer messages non lus
      if (unreadMessages > 0) {
        conversationsBadge.textContent = unreadMessages;
        conversationsBadge.style.display = 'inline';
        conversationsBadge.classList.add('active');
        console.log('🔔 BADGE CONVERSATIONS AFFICHÉ:', unreadMessages);
      } else {
        conversationsBadge.style.display = 'none';
        conversationsBadge.classList.remove('active');
        console.log(
          '🔔 BADGE CONVERSATIONS CACHÉ - unreadMessages:',
          unreadMessages
        );
      }
    } else {
      console.error('🔔 DEBUG BADGE - Element conversationsBadge NOT FOUND!');
    }

    // Badge des demandes dans la page messages
    const requestsBadge = document.getElementById('requestsBadge');
    if (requestsBadge) {
      if (pendingRequests > 0) {
        requestsBadge.textContent = pendingRequests;
        requestsBadge.style.display = 'inline';
        requestsBadge.classList.add('active');
      } else {
        requestsBadge.style.display = 'none';
        requestsBadge.classList.remove('active');
      }
    }

    // Badge des réponses aux annonces
    const responsesBadge = document.getElementById('responsesBadge');
    if (responsesBadge) {
      if (unreadResponses > 0) {
        responsesBadge.textContent = unreadResponses;
        responsesBadge.style.display = 'inline';
        responsesBadge.classList.add('active');

        // Afficher notification toast si c'est la première fois qu'on détecte des messages non lus
        if (
          this.lastUnreadResponses !== unreadResponses &&
          unreadResponses > this.lastUnreadResponses
        ) {
          this.showResponseNotification(unreadResponses, totalUnreadAdMessages);
        }
      } else {
        responsesBadge.style.display = 'none';
        responsesBadge.classList.remove('active');
      }
    }

    // Sauvegarder le nombre actuel pour la prochaine vérification
    this.lastUnreadResponses = unreadResponses;

    // Badge des demandes Ce Soir
    const tonightBadge = document.getElementById('tonightBadge');
    if (tonightBadge) {
      if (pendingTonightRequests > 0) {
        tonightBadge.textContent = pendingTonightRequests;
        tonightBadge.style.display = 'inline';
        tonightBadge.classList.add('active');
      } else {
        tonightBadge.style.display = 'none';
        tonightBadge.classList.remove('active');
      }
    }

    // Badge des demandes de photos privées
    const photoRequestsBadge = document.getElementById('photoRequestsBadge');
    if (photoRequestsBadge) {
      // Pour les photos, on peut compter les demandes en attente
      // Pour l'instant, on affiche un badge fixe pour tester
      if (this.photoRequests && this.photoRequests.pending > 0) {
        photoRequestsBadge.textContent = this.photoRequests.pending;
        photoRequestsBadge.style.display = 'inline';
        photoRequestsBadge.classList.add('active');
      } else {
        photoRequestsBadge.style.display = 'none';
        photoRequestsBadge.classList.remove('active');
      }
    }

    // Aussi mettre à jour le gestionnaire global si il existe
    if (window.globalNotificationManager) {
      window.globalNotificationManager.forceUpdate();
    }
  }

  // Démarrer le polling pour vérifier les nouveaux messages
  startMessagePolling() {
    if (this.isPolling) return;

    this.isPolling = true;
    this.pollInterval = setInterval(() => {
      this.checkForNewMessages();
    }, 5000); // Vérifier toutes les 5 secondes pour voir les nouveaux messages rapidement
  }

  // Arrêter le polling
  stopMessagePolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
  }

  // Vérifier les nouveaux messages
  async checkForNewMessages() {
    if (!localStorage.getItem('hotmeet_token')) return;

    try {
      // Vérifier les nouvelles demandes de chat
      await this.checkNewChatRequests();

      // Vérifier les nouveaux messages dans la conversation active
      if (this.currentChatUser) {
        await this.checkNewMessagesInChat();
      }

      // Vérifier les nouvelles notifications
      await this.checkNewNotifications();
    } catch (error) {
      // Erreur silencieuse pour éviter le spam de logs
    }
  }

  // Vérifier les nouvelles demandes de chat
  async checkNewChatRequests() {
    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch(`/api/messages/requests?_=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const newRequestsCount = data.requests.length;
        const oldRequestsCount = this.chatRequests.length;

        if (newRequestsCount > oldRequestsCount) {
          // Nouvelles demandes détectées
          this.chatRequests = data.requests.map(request => ({
            id: request.id,
            fromUser: {
              id: request.fromUser.id,
              nom: request.fromUser.nom,
              age: request.fromUser.age,
              sexe: request.fromUser.sexe,
              location: `${request.fromUser.localisation?.ville || ''}, ${request.fromUser.localisation?.region || ''}`,
              photo: request.fromUser.photo || '/images/default-avatar.jpg',
              isOnline: false,
            },
            message: request.content,
            timestamp: new Date(request.createdAt),
            status: request.status,
            provenance: request.provenance,
          }));

          this.renderChatRequests();
          this.updateNotificationBadges();

          // Afficher une notification pour les nouvelles demandes
          this.showNotification('Nouvelle demande de chat reçue ! 📨', 'info');
        }
      }
    } catch (error) {
      // Erreur silencieuse pour éviter le spam
    }
  }

  // Vérifier les nouveaux messages dans le chat actif
  async checkNewMessagesInChat() {
    if (!this.currentChatUser) return;

    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch(
        `/api/messages/conversations/${this.currentChatUser.otherUserId}?_=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.messages) {
          const chatMessagesContainer =
            document.querySelector('.chat-messages');
          if (!chatMessagesContainer) return;

          const currentMessages =
            chatMessagesContainer.querySelectorAll('.message');
          const newMessagesCount = data.messages.length;

          if (newMessagesCount > currentMessages.length) {
            // Nouveaux messages détectés, recharger la conversation
            await this.loadConversationMessages(
              this.currentChatUser.otherUserId,
              chatMessagesContainer
            );

            // Faire défiler vers le bas
            chatMessagesContainer.scrollTop =
              chatMessagesContainer.scrollHeight;

            console.log('🔄 Nouveaux messages chargés automatiquement !');
          }
        }
      }
    } catch (error) {
      console.error(
        'Erreur lors de la vérification des nouveaux messages:',
        error
      );
    }
  }

  // Vérifier les nouvelles notifications globales
  async checkNewNotifications() {
    try {
      // NE PLUS recharger loadRealData() car ça crée une boucle infernale
      // Juste mettre à jour les badges
      this.updateNotificationBadges();
    } catch (error) {
      // Erreur silencieuse pour éviter le spam
    }
  }

  // ===== GESTION TEMPS RÉEL SOCKET.IO =====

  // Gérer un nouveau message reçu en temps réel
  handleNewMessage(data) {
    const { fromUserId, toUserId, message, messageId } = data;

    // CORRECTION: Utiliser hotmeet_user_profile comme dans showChatWindow
    let currentUser = null;
    try {
      const userProfile = localStorage.getItem('hotmeet_user_profile');
      if (userProfile) {
        currentUser = JSON.parse(userProfile);
      }
    } catch (error) {
      console.warn('Erreur parsing user profile dans handleNewMessage:', error);
    }

    // Si pas trouvé, essayer avec le token JWT
    if (!currentUser || !currentUser._id) {
      try {
        const token = localStorage.getItem('hotmeet_token');
        if (token) {
          // Décoder le token JWT pour récupérer l'userId
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentUser = { _id: payload.userId };
          console.log(
            '🔍 handleNewMessage - UserId récupéré depuis token JWT:',
            currentUser._id
          );
        }
      } catch (error) {
        console.warn('Erreur décodage token JWT dans handleNewMessage:', error);
      }
    }

    if (!currentUser || !currentUser._id) {
      console.warn(
        "⚠️ Pas d'utilisateur trouvé, mais on va quand même essayer d'afficher le message..."
      );
    }

    console.log('🔍 DIAGNOSTIC handleNewMessage - Data reçue:', data);
    console.log('🔍 Current user:', currentUser?._id);
    console.log('🔍 Message pour:', toUserId);
    console.log('🔍 Chat ouvert avec:', this.currentChatUser?.otherUserId);

    // MODIFICATION: Si pas d'utilisateur défini, essayer quand même d'afficher le message
    // dans la fenêtre ouverte (pour que ça marche même avec localStorage vide)
    if (currentUser && currentUser._id && toUserId !== currentUser._id) {
      console.log('❌ Message pas pour nous, ignoré');
      return;
    }

    // Si on a pas d'user ou si c'est pour nous, continuer avec l'affichage // Si le chat est ouvert avec cet utilisateur, afficher le message immédiatement
    if (
      this.currentChatUser &&
      this.currentChatUser.otherUserId === fromUserId
    ) {
      console.log('✅ Chat ouvert avec expéditeur, ajout du message');
      const chatMessagesContainer = document.querySelector('.chat-messages');
      if (chatMessagesContainer) {
        const messageElement = this.createChatMessageElement({
          content: message.content,
          isOwn: false,
          createdAt: message.createdAt,
          fromUser: message.fromUser,
        });
        chatMessagesContainer.appendChild(messageElement);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        console.log('✅ Message ajouté au chat ouvert');
      } else {
        console.log('❌ Container chat non trouvé');
      }
    } else {
      console.log('❌ Chat pas ouvert avec expéditeur');
    }

    // Mettre à jour les badges de notifications
    this.updateNotificationBadges();

    // Afficher une notification toast
    this.showNotification(
      `Nouveau message de ${message.fromUser?.profile?.nom || 'Un utilisateur'}`,
      'info'
    );
  }

  // Gérer une nouvelle demande de chat reçue
  handleNewChatRequest(data) {
    const currentUser = JSON.parse(
      localStorage.getItem('hotmeet_user') || '{}'
    );

    // Vérifier si c'est pour nous
    if (data.toUserId !== currentUser._id) return;

    // Ajouter la demande à la liste
    this.chatRequests.unshift(data.requestData);

    // Rafraîchir l'affichage des demandes
    this.renderChatRequests();
    this.updateNotificationBadges();

    // Notification
    this.showNotification(
      `Nouvelle demande de chat de ${data.requestData.fromUser?.profile?.nom || 'Un utilisateur'}`,
      'info'
    );
  }

  // Indicateurs de frappe
  showTypingIndicator(userId) {
    if (this.currentChatUser && this.currentChatUser.otherUserId === userId) {
      const chatMessages = document.querySelector('.chat-messages');
      if (chatMessages && !chatMessages.querySelector('.typing-indicator')) {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = "<span>En train d'écrire...</span>";
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }
  }

  hideTypingIndicator(userId) {
    if (this.currentChatUser && this.currentChatUser.otherUserId === userId) {
      const typingIndicator = document.querySelector('.typing-indicator');
      if (typingIndicator) {
        typingIndicator.remove();
      }
    }
  }

  // Rendre toutes les données
  renderAllData() {
    this.renderChatRequests();
    this.renderConversations();
    this.renderAdResponses();
    this.renderTonightRequests(); // Nouveau: demandes Ce Soir

    // CRUCIAL: Mettre à jour les badges après avoir rendu les données
    this.updateNotificationBadges();
    console.log('🔄 renderAllData - Badges mis à jour après rendu des données');
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
            <div class="conversation-item ${conversation.unreadCount > 0 ? 'has-unread' : ''}" data-conversation-id="${conversation.id}">
                <div class="conversation-avatar">
                    <img src="${conversation.otherUser.photo || '/images/default-avatar.jpg'}" alt="${conversation.otherUser.nom}" onerror="this.src='/images/default-avatar.jpg'">
                    <div class="online-status offline"></div>
                    ${conversation.unreadCount > 0 ? `<div class="unread-badge">${conversation.unreadCount}</div>` : ''}
                </div>
                <div class="conversation-info">
                    <div class="conversation-header">
                        <h3>${conversation.otherUser.nom}</h3>
                        <span class="conversation-time">${this.formatTimeAgo(new Date(conversation.lastMessageDate))}</span>
                    </div>
                    <p class="conversation-preview ${conversation.unreadCount > 0 ? 'unread-preview' : ''}">${conversation.lastMessage}</p>
                    <div class="conversation-details">
                        <span>${conversation.otherUser.age} ans • ${conversation.otherUser.sexe} • ${conversation.messageCount} messages</span>
                    </div>
                </div>
                <div class="conversation-actions">
                    <button class="btn-secondary" onclick="messagesManager.openChat('${conversation.id}', '${conversation.otherUser.nom}', '${conversation.otherUser.photo || '/images/default-avatar.jpg'}')">Ouvrir</button>
                    <button class="btn-view-profile" data-user-id="${conversation.otherUser.id}" title="Voir le profil">👤</button>
                    <button class="btn-danger btn-delete-conversation" onclick="messagesManager.deleteConversation('${conversation.id}', 'classique')" title="Supprimer conversation">🗑️</button>
                    ${conversation.unreadCount > 0 ? `<span class="unread-count">${conversation.unreadCount}</span>` : ''}
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

    console.log(
      '🔍 DEBUG renderAdResponses - this.adResponses:',
      this.adResponses
    );
    console.log(
      '🔍 DEBUG renderAdResponses - Nombre total:',
      this.adResponses.length
    );

    console.log('🔍 DEBUG - Toutes les réponses:', this.adResponses);
    console.log('🔍 DEBUG - Structure première réponse:', this.adResponses[0]);
    console.log(
      '🔍 DEBUG - unreadCount des réponses:',
      this.adResponses.map(r => ({ unreadCount: r.unreadCount, id: r.id }))
    );

    // AFFICHER TOUTES LES CONVERSATIONS D'ANNONCES, PAS SEULEMENT LES NON LUES !
    const allAdConversations = this.adResponses;

    console.log(
      "🔍 DEBUG - Toutes les conversations d'annonces:",
      allAdConversations
    );

    if (allAdConversations.length === 0) {
      adResponsesList.innerHTML =
        '<div class="no-responses">Aucune réponse à vos annonces</div>';
      return;
    }

    adResponsesList.innerHTML = allAdConversations
      .map(
        response => `
            <div class="ad-response-item" data-response-id="${response.id}">
                <div class="ad-response-header">
                    <h3>Réponse à votre annonce: "${response.adTitle}"</h3>
                    <span class="response-time">${this.formatTimeAgo(response.timestamp)}</span>
                </div>
                <div class="ad-response-content">
                    <div class="responder-info">
                        <img src="${response.senderPhoto || '/images/default-avatar.jpg'}" alt="${response.senderName}" onerror="this.src='/images/default-avatar.jpg'">
                        <div>
                            <strong>${response.senderName}</strong>
                            <span>${response.unreadCount} nouveau${response.unreadCount > 1 ? 'x' : ''} message${response.unreadCount > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <p class="response-message">"${response.lastMessage}"</p>
                </div>
                <div class="ad-response-actions">
                    <button class="btn-primary" onclick="messagesManager.openAdConversation('${response.id}', '${response.adTitle}', '${response.senderName}', '${response.senderPhoto}', '${response.otherUserId || response.senderId}')">Répondre</button>
                    <button class="btn-secondary" onclick="messagesManager.viewAdProfile('${response.senderId}')">Voir le profil</button>
                    <button class="btn-danger btn-delete-conversation" onclick="messagesManager.deleteConversation('${response.id}', 'annonce')" title="Supprimer conversation">🗑️</button>
                </div>
            </div>
        `
      )
      .join('');
  }

  // Rendre les demandes Ce Soir
  renderTonightRequests() {
    const tonightRequestsList = document.querySelector(
      '.tonight-requests-list'
    );
    if (!tonightRequestsList) {
      return;
    }

    const pendingTonightRequests = this.tonightRequests.filter(
      req => req.status === 'pending'
    );

    if (pendingTonightRequests.length === 0) {
      tonightRequestsList.innerHTML =
        '<div class="no-requests">Aucune demande Ce Soir en attente</div>';
      return;
    }

    tonightRequestsList.innerHTML = pendingTonightRequests
      .map(
        request => `
            <div class="request-item tonight-request-item" data-request-id="${request.id}">
                <div class="request-user-info">
                    <img src="${request.fromUser.photo}" alt="${request.fromUser.nom}" onerror="this.src='/images/default-avatar.jpg'">
                    <div class="user-details">
                        <h3>${request.fromUser.nom}</h3>
                        <p>${request.fromUser.age} ans • ${request.fromUser.sexe.charAt(0).toUpperCase() + request.fromUser.sexe.slice(1)} • ${request.fromUser.location}</p>
                        <span class="request-time">${this.formatTimeAgo(request.timestamp)}</span>
                    </div>
                    <span class="tonight-badge">Ce Soir</span>
                </div>
                <div class="request-message">
                    <p>"${request.message}"</p>
                </div>
                <div class="request-actions">
                    <button class="btn-primary accept-tonight-request" data-request-id="${request.id}">Accepter</button>
                    <button class="btn-secondary decline-tonight-request" data-request-id="${request.id}">Refuser</button>
                    <button class="btn-outline view-profile" data-user-id="${request.fromUser.id}">Voir le profil</button>
                </div>
            </div>
        `
      )
      .join('');
  }

  // Formater le temps écoulé
  formatTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp); // Convertir string en Date
    const diffMs = now - date;
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
    return date.toLocaleDateString('fr-FR');
  }

  // Voir le profil d'un utilisateur
  async viewUserProfile(button) {
    const userId = button.getAttribute('data-user-id');
    if (!userId) return;

    // 💎 D'ABORD VÉRIFIER SI L'UTILISATEUR ACTUEL EST PREMIUM
    try {
      const token = localStorage.getItem('hotmeet_token');
      if (!token) {
        window.location.href = '/auth';
        return;
      }

      // Vérifier d'abord notre propre statut premium
      const statusResponse = await fetch('/api/payments/status', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const isUserPremium =
          statusData.success &&
          statusData.subscription &&
          statusData.subscription.isPremium;

        if (!isUserPremium) {
          // Non-premium → Redirection immédiate vers premium
          console.log('🔒 Utilisateur non premium - Redirection vers premium');
          window.location.href = '/pages/premium.html';
          return;
        }
      }

      // Si premium, autoriser l'accès au profil
      window.location.href = `/pages/profile-view.html?userId=${userId}`;
    } catch (error) {
      console.error('Erreur lors de la vérification premium:', error);
      // En cas d'erreur, rediriger vers premium par sécurité
      window.location.href = '/pages/premium.html';
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

  // ===== GESTION DES DEMANDES DE PHOTOS PRIVÉES =====

  // Charger les demandes de photos (reçues et envoyées)
  async loadPhotoRequests() {
    try {
      const token = localStorage.getItem('hotmeet_token');

      // Charger les demandes reçues
      const receivedResponse = await fetch(
        '/api/auth/private-photos/received',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      let pendingCount = 0;
      if (receivedResponse.ok) {
        const receivedData = await receivedResponse.json();
        this.displayReceivedPhotoRequests(receivedData.requests || []);

        // Compter les demandes en attente
        pendingCount = (receivedData.requests || []).filter(
          req => req.status === 'pending'
        ).length;
      }

      // Charger les demandes envoyées
      const sentResponse = await fetch('/api/auth/private-photos/sent', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (sentResponse.ok) {
        const sentData = await sentResponse.json();
        this.displaySentPhotoRequests(sentData.requests || []);
      }

      // Stocker le nombre de demandes en attente pour les badges
      if (!this.photoRequests) {
        this.photoRequests = {};
      }
      this.photoRequests.pending = pendingCount;

      // Mettre à jour les badges
      this.updateNotificationBadges();
    } catch (error) {
      console.error('Erreur chargement demandes photos:', error);
    }
  }

  // Afficher les demandes de photos reçues
  displayReceivedPhotoRequests(requests) {
    const container = document.getElementById('receivedPhotoRequests');

    if (!requests || requests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📸</div>
          <h3>Aucune demande de photo</h3>
          <p>Vous n'avez reçu aucune demande d'accès aux photos privées pour le moment.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = requests
      .filter(request => request.requester && request.requester.profile) // Filtrer les requests invalides
      .map(
        request => `
      <div class="photo-request-card" data-request-id="${request._id}">
        <div class="request-user-avatar">
          <img src="${request.requester.profile.photos?.[0]?.url || '/images/default-avatar.jpg'}" 
               alt="${request.requester.profile.nom}" 
               onerror="this.src='/images/default-avatar.jpg'"
               class="small-profile-photo"
               style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; ${request.requester.profile.photos?.[0]?.isBlurred ? 'filter: blur(20px);' : ''}">
        </div>
        <div class="request-content">
          <div class="request-header">
            <h3 class="requester-name">${request.requester.profile.nom}</h3>
            <span class="request-time">${this.formatTimeAgo(new Date(request.createdAt))}</span>
          </div>
          <div class="request-message">
            <p>"${request.message || "Demande d'accès aux photos privées"}"</p>
          </div>
          <div class="request-type">
            <span class="photo-icon">📸</span>
            <span>${request.requester.profile.nom} souhaite voir vos photos privées</span>
          </div>
        </div>
        <div class="request-actions">
          ${
            request.status === 'pending'
              ? `
            <button class="accept-photo-btn accept-photo-request" data-request-id="${request._id}">
              <span class="btn-icon">✅</span>
              Accepter
            </button>
            <button class="decline-photo-btn decline-photo-request" data-request-id="${request._id}">
              <span class="btn-icon">❌</span>
              Refuser  
            </button>
            <button class="btn-view-profile" data-user-id="${request.requester._id}" title="Voir le profil">👤</button>
          `
              : `
            <span class="request-status status-${request.status}">
              ${request.status === 'accepted' ? '✅ Acceptée' : '❌ Refusée'}
            </span>
            <button class="btn-view-profile" data-user-id="${request.requester._id}" title="Voir le profil">👤</button>
          `
          }
        </div>
      </div>
    `
      )
      .join('');
  }

  // Afficher les demandes de photos envoyées
  displaySentPhotoRequests(requests) {
    const container = document.getElementById('sentPhotoRequests');

    if (requests.length === 0) {
      container.innerHTML = '<p class="no-requests">Aucune demande envoyée</p>';
      return;
    }

    container.innerHTML = requests
      .map(request => {
        return `
      <div class="request-item photo-request" data-request-id="${request._id}">
        <div class="request-user">
          <img src="${request.target.profile.photos?.[0]?.url || '/images/default-avatar.jpg'}" 
               alt="${request.target.profile.nom || 'Utilisateur'}" 
               onerror="this.src='/images/default-avatar.jpg'"
               class="small-profile-photo"
               style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; ${request.target.profile.photos?.[0]?.isBlurred ? 'filter: blur(20px);' : ''}">>
          <div class="user-info">
            <h4>${request.target.profile.nom || 'Utilisateur'}</h4>
            <p class="request-message">Vous avez demandé à voir les photos privées de ${request.target.profile.nom || 'cette personne'}</p>
            <span class="request-time">${this.formatTimeAgo(new Date(request.createdAt))}</span>
          </div>
        </div>
        <div class="request-actions">
          <span class="request-status ${request.status}">
            ${
              request.status === 'pending'
                ? '⏳ En attente de réponse'
                : request.status === 'accepted'
                  ? '✅ Demande acceptée - Photos accessibles'
                  : '❌ Demande refusée'
            }
          </span>
          <button class="btn-view-profile" data-user-id="${request.target._id}" title="Voir le profil">👤 Voir profil</button>
          <button class="btn-danger btn-delete-photo-request" onclick="messagesManager.deletePhotoRequest('${request._id}')" title="Supprimer demande">🗑️</button>
        </div>
      </div>
    `;
      })
      .join('');
  }

  // Gérer une réponse à une demande de photo (accepter/refuser)
  async handlePhotoRequest(requestId, action) {
    console.log('🚀 handlePhotoRequest appelé:', { requestId, action });

    try {
      const token = localStorage.getItem('hotmeet_token');
      console.log('🔑 Token disponible:', token ? 'OUI' : 'NON');

      console.log('📡 Envoi requête vers:', '/api/auth/private-photos/respond');
      console.log('📤 Données envoyées:', { requestId, action });

      const response = await fetch('/api/auth/private-photos/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId, action }),
      });

      console.log('📨 Réponse HTTP status:', response.status);

      const result = await response.json();
      console.log('📋 Réponse complète:', result);

      if (result.success) {
        console.log('✅ Succès ! Action:', action);
        console.log('📋 Résultat complet:', result);

        this.showNotification(
          action === 'accept'
            ? 'Accès accordé avec succès!'
            : 'Demande refusée',
          'success'
        );

        // Si accepté, notifier de manière globale pour les autres onglets
        if (action === 'accept') {
          // Récupérer l'ID de l'utilisateur qui avait fait la demande
          const requestData = result.request;
          console.log('🔍 Données de la demande:', requestData);

          // Déclencher un événement global pour notifier le défloutage
          window.dispatchEvent(
            new CustomEvent('privatePhotoAccessGranted', {
              detail: {
                requestId,
                action: 'accepted',
                requesterId: requestData.requester,
                targetId: requestData.target,
              },
            })
          );

          // Notification persistante pour informer l'utilisateur
          this.showPhotoAccessNotification(
            '✅ Accès accordé! Les photos sont maintenant visibles pour cette personne.'
          );
        }

        // Recharger les demandes pour mettre à jour l'affichage
        console.log('🔄 Rechargement des demandes...');
        this.loadPhotoRequests();

        // Mettre à jour les badges de notification
        this.updateNotificationBadges();
      } else {
        console.error('❌ Erreur du serveur:', result.error);
        this.showNotification(
          result.error?.message || 'Erreur lors de la réponse',
          'error'
        );
      }
    } catch (error) {
      console.error('❌ Erreur dans handlePhotoRequest:', error);
      console.error('Erreur réponse demande photo:', error);
      this.showNotification('Erreur lors de la réponse à la demande', 'error');
    }
  }

  // Notification spéciale pour l'accès accordé aux photos
  showPhotoAccessNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 400px;
      font-weight: 600;
      border-left: 5px solid #2E7D32;
      animation: slideInRight 0.5s ease;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.2em;">📸</span>
        <div>
          <div style="font-size: 0.9em; margin-bottom: 0.5rem;">Demande de photos</div>
          <div style="font-size: 0.8em;">${message}</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: transparent; border: none; color: white; cursor: pointer; font-size: 1.2em;">×</button>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 8000);
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
        display: flex;
        align-items: center;
        gap: 0; /* Pas d'espacement entre texte et badge */
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
    
    /* Badges de notification - styles centralisés */
    .notification-badge {
        background: #ff4757;
        color: white;
        border-radius: 50%;
        padding: 0.25rem 0.5rem;
        font-size: 0.7rem;
        font-weight: bold;
        min-width: 1.2rem;
        text-align: center;
        margin-left: 0.25rem; /* Très petit espacement - presque collé */
        display: inline-block;
        line-height: 1;
        animation: pulse 2s infinite;
        position: relative;
        top: -1px; /* Légère correction verticale */
    }
    
    /* Badge actif avec animation renforcée */
    .notification-badge.active {
        animation: strongPulse 1.5s infinite;
    }
    
    @keyframes strongPulse {
        0% { 
            transform: scale(1); 
            box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7);
        }
        50% { 
            transform: scale(1.1); 
            box-shadow: 0 0 0 8px rgba(255, 71, 87, 0);
        }
        100% { 
            transform: scale(1); 
            box-shadow: 0 0 0 0 rgba(255, 71, 87, 0);
        }
    }
    
    /* Styles pour les conversations avec messages non lus */
    .conversation-item.has-unread {
        background: #f8fffe;
        border-left: 3px solid var(--primary-color);
    }
    
    .conversation-item.has-unread:hover {
        background: #f1f9ff;
    }
    
    .conversation-preview.unread-preview {
        font-weight: 600;
        color: #333;
    }
    
    .unread-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ff4757;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: bold;
        border: 2px solid white;
        z-index: 1;
    }
    
    .unread-count {
        background: var(--primary-color);
        color: white;
        border-radius: 50%;
        padding: 4px 8px;
        font-size: 0.8rem;
        font-weight: bold;
        margin-left: 8px;
        min-width: 20px;
        text-align: center;
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

    .btn-view-profile {
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 1.1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
        height: 36px;
    }
    
    .btn-view-profile:hover {
        background: #0056b3;
        transform: scale(1.05);
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
    
    /* Styles pour les demandes Ce Soir */
    .tonight-badge {
        background: linear-gradient(45deg, #ff4757, #ff6b7d);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 8px rgba(255, 71, 87, 0.3);
    }
    
    .tonight-request-item {
        border-left: 4px solid #ff4757;
        position: relative;
    }
    
    .tonight-request-item::before {
        content: '🌃';
        position: absolute;
        top: 1rem;
        right: 1rem;
        font-size: 1.5rem;
        opacity: 0.6;
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }

    /* Styles pour les demandes de photos privées */
    .photo-request-item {
        background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
        border: 2px solid #e3f2fd;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        transition: all 0.3s ease;
    }

    .photo-request-item:hover {
        border-color: #2196f3;
        box-shadow: 0 6px 20px rgba(33, 150, 243, 0.1);
        transform: translateY(-2px);
    }

    .photo-request-item .request-avatar img {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: 3px solid #2196f3;
        object-fit: cover;
    }

    .photo-request-item .request-header h3 {
        color: #1976d2;
        font-weight: 600;
        margin-bottom: 0.5rem;
    }

    .photo-request-item .request-message {
        background: #f3e5f5;
        border-left: 4px solid #9c27b0;
        padding: 0.75rem 1rem;
        border-radius: 0 8px 8px 0;
        font-style: italic;
        color: #6a1b9a;
        margin: 0.75rem 0;
    }

    .photo-request-item .request-details span {
        background: linear-gradient(135deg, #ff9800, #f57c00);
        color: white;
        padding: 0.4rem 0.8rem;
        border-radius: 20px;
        font-size: 0.85em;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }

    .photo-request-item .request-actions {
        gap: 0.75rem;
        margin-top: 1rem;
    }

    .photo-request-item .btn-primary {
        background: linear-gradient(135deg, #4caf50, #45a049);
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 25px;
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    }

    .photo-request-item .btn-primary:hover {
        background: linear-gradient(135deg, #45a049, #388e3c);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
    }

    .photo-request-item .btn-secondary {
        background: linear-gradient(135deg, #f44336, #d32f2f);
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 25px;
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
    }

    .photo-request-item .btn-secondary:hover {
        background: linear-gradient(135deg, #d32f2f, #c62828);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(244, 67, 54, 0.4);
    }

    .status-accepted {
        background: linear-gradient(135deg, #4caf50, #45a049);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-weight: 600;
        font-size: 0.9em;
    }

    .status-rejected {
        background: linear-gradient(135deg, #f44336, #d32f2f);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-weight: 600;
        font-size: 0.9em;
    }

    /* Bouton suppression demande photo */
    .btn-delete-photo-request {
        background: #ff4444;
        color: white;
        border: none;
        padding: 0.5rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        margin-left: 0.5rem;
        transition: all 0.3s ease;
        min-width: 35px;
        height: 35px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .btn-delete-photo-request:hover {
        background: #cc0000;
        transform: scale(1.1);
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

        .btn-view-profile {
            padding: 6px 10px;
            font-size: 1rem;
            min-width: 36px;
            height: 32px;
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

  // ===== GESTIONNAIRE CHAT D'ANNONCES =====
  window.messagesManager.openAdConversation = function (
    conversationId,
    adTitle,
    senderName,
    senderPhoto,
    otherUserId
  ) {
    console.log('🚀 openAdConversation appelée:', {
      conversationId,
      adTitle,
      senderName,
      senderPhoto,
      otherUserId,
    });

    // Extraire les IDs depuis conversationId
    // Format attendu: "ad-adId-minUserId-maxUserId"
    // Format actuel reçu: "adId-senderId" (temporaire)
    const parts = conversationId.split('-');
    let adId, senderId;

    if (parts.length === 4 && parts[0] === 'ad') {
      // Format correct: ad-adId-userId1-userId2
      adId = parts[1];
      senderId = parts[2];
    } else if (parts.length === 2) {
      // Format temporaire: adId-senderId
      adId = parts[0];
      senderId = parts[1];
    } else {
      console.error('❌ Format conversationId inconnu:', conversationId);
      return;
    }

    // Afficher le modal
    this.showAdChatModal(
      conversationId,
      adTitle,
      senderName,
      senderPhoto,
      adId,
      otherUserId
    );

    // Charger les messages de la conversation d'annonce
    this.loadAdConversationMessages(adId, otherUserId);

    // Marquer la conversation comme lue et mettre à jour les badges
    this.markAdConversationAsRead(conversationId);
  };

  // Marquer une conversation d'annonce comme lue
  window.messagesManager.markAdConversationAsRead = function (conversationId) {
    // Trouver la conversation dans this.adResponses et réinitialiser unreadCount
    const conversationIndex = this.adResponses.findIndex(
      resp => resp.id === conversationId
    );

    if (conversationIndex !== -1) {
      this.adResponses[conversationIndex].unreadCount = 0;

      // Mettre à jour les badges immédiatement
      this.updateNotificationBadges();

      console.log(
        "📖 Conversation d'annonce marquée comme lue:",
        conversationId
      );
    }
  };

  // Notification pour nouvelles réponses aux annonces (VERSION SIMPLE)
  window.messagesManager.showResponseNotification = function (
    unreadResponses,
    totalMessages
  ) {
    // Message simple
    const message =
      totalMessages +
      ' nouveau' +
      (totalMessages > 1 ? 'x' : '') +
      ' message' +
      (totalMessages > 1 ? 's' : '') +
      ' dans ' +
      unreadResponses +
      ' conversation' +
      (unreadResponses > 1 ? 's' : '');

    // Créer toast simplifié
    const toast = document.createElement('div');
    toast.className = 'response-notification-toast';
    toast.style.cssText =
      'position:fixed;top:20px;right:20px;background:#4CAF50;color:white;padding:1rem;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,0.15);z-index:10000;max-width:350px;font-family:Arial,sans-serif;';

    toast.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;"><span style="font-size:1.5rem;">📧</span><div><strong style="display:block;margin-bottom:5px;">Nouvelles réponses à vos annonces !</strong><span style="font-size:0.9rem;">' +
      message +
      '</span></div><button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:white;font-size:1.5rem;cursor:pointer;margin-left:10px;">×</button></div>';

    // Ajouter au DOM
    document.body.appendChild(toast);

    // Auto-suppression après 5 secondes
    setTimeout(function () {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 5000);
  };

  window.messagesManager.showAdChatModal = function (
    conversationId,
    adTitle,
    senderName,
    senderPhoto,
    adId,
    otherUserId
  ) {
    const modal = document.getElementById('adChatModal');
    const name = modal.querySelector('.ad-chat-name');
    const title = modal.querySelector('.ad-chat-ad-title');
    const avatar = modal.querySelector('.ad-chat-avatar');

    if (name) name.textContent = senderName;
    if (title) title.textContent = adTitle;
    if (avatar) avatar.src = senderPhoto || '/images/default-avatar.jpg';

    // Stocker les infos pour l'envoi de messages
    this.currentAdChat = {
      conversationId,
      adId,
      otherUserId, // Utiliser otherUserId pour receiverId
      senderName,
      adTitle,
    };

    // Afficher le modal
    modal.style.display = 'flex';

    // Gérer la fermeture
    const closeBtn = modal.querySelector('.ad-chat-close');
    const overlay = modal.querySelector('.ad-chat-overlay');

    const closeModal = () => {
      modal.style.display = 'none';
      this.currentAdChat = null;
    };

    closeBtn.onclick = closeModal;
    overlay.onclick = closeModal;

    // Gérer l'envoi de messages
    this.setupAdChatSending();
  };

  window.messagesManager.loadAdConversationMessages = async function (
    adId,
    otherUserId
  ) {
    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch(
        `/api/ads/${adId}/messages?otherUserId=${otherUserId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("📨 Messages de conversation d'annonce chargés:", data);
        console.log('📨 Structure premier message:', data.messages?.[0]);
        console.log('📨 Tous les messages:', data.messages);
        this.displayAdChatMessages(data.messages || []);
      } else {
        console.error(
          '❌ Erreur chargement messages annonce:',
          response.status
        );
        this.displayAdChatMessages([]);
      }
    } catch (error) {
      console.error('❌ Erreur réseau messages annonce:', error);
      this.displayAdChatMessages([]);
    }
  };

  window.messagesManager.displayAdChatMessages = function (messages) {
    const messagesContainer = document.querySelector('.ad-chat-messages');

    if (!messages || messages.length === 0) {
      messagesContainer.innerHTML =
        '<div class="ad-chat-empty">Aucun message dans cette conversation d\'annonce</div>';
      return;
    }

    const currentUserId = this.getCurrentUserId();

    messagesContainer.innerHTML = messages
      .map(msg => {
        const isSent =
          (typeof msg.senderId === 'string'
            ? msg.senderId
            : msg.senderId?._id) === currentUserId;
        const messageClass = isSent ? 'sent' : 'received';

        return `
        <div class="ad-message ${messageClass}">
          <div class="ad-message-content">
            <p class="ad-message-text">${this.escapeHtml(msg.content || msg.message || '')}</p>
            <span class="ad-message-time">${this.formatTimeAgo(msg.createdAt || msg.timestamp)}</span>
          </div>
        </div>
      `;
      })
      .join('');

    // Scroll vers le bas
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  window.messagesManager.setupAdChatSending = function () {
    const sendBtn = document.querySelector('.ad-chat-send');
    const textarea = document.querySelector('.ad-chat-textarea');

    const sendMessage = async () => {
      const message = textarea.value.trim();
      if (!message || !this.currentAdChat) return;

      try {
        sendBtn.disabled = true;

        const token = localStorage.getItem('hotmeet_token');
        const response = await fetch(
          `/api/ads/${this.currentAdChat.adId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: message,
              receiverId: this.currentAdChat.otherUserId,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("✅ Message d'annonce envoyé:", data);

          // Vider le textarea
          textarea.value = '';

          // Recharger les messages
          this.loadAdConversationMessages(
            this.currentAdChat.adId,
            this.currentAdChat.otherUserId
          );
        } else {
          console.error('❌ Erreur envoi message annonce:', response.status);
          alert("Erreur lors de l'envoi du message");
        }
      } catch (error) {
        console.error('❌ Erreur réseau envoi message:', error);
        alert('Erreur de connexion');
      } finally {
        sendBtn.disabled = false;
      }
    };

    // Remplacer les anciens listeners
    sendBtn.onclick = sendMessage;

    textarea.onkeydown = e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    };
  };

  window.messagesManager.getCurrentUserId = function () {
    try {
      const token = localStorage.getItem('hotmeet_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
      }
    } catch (error) {
      console.warn('Erreur décodage token:', error);
    }
    return null;
  };

  window.messagesManager.escapeHtml = function (text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Fonction pour supprimer une conversation (SUPPRESSION RÉELLE)
  window.messagesManager.deleteConversation = function (conversationId, type) {
    console.log(
      '🔥 SUPPRESSION APPELÉE - conversationId:',
      conversationId,
      'type:',
      type
    );

    // Confirmation avant suppression
    if (!confirm('Supprimer cette conversation définitivement ?')) {
      return;
    }

    const token = localStorage.getItem('hotmeet_token');
    if (!token) {
      alert('Vous devez être connecté');
      return;
    }

    // DÉTECTION DU TYPE DE CONVERSATION ET ROUTE APPROPRIÉE
    let apiUrl;
    if (conversationId.startsWith('ad-') || type === 'annonce') {
      // Conversation d'annonce -> utiliser la route ads
      apiUrl = `/api/ads/conversations/${conversationId}`;
    } else {
      // Conversation classique -> utiliser la route messages
      apiUrl = `/api/messages/delete-conversation/${conversationId}`;
    }

    console.log(`🔥 SUPPRESSION DIRECTE: ${apiUrl}`);

    fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        console.log('🔥 RÉPONSE REÇUE:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('🔥 DATA REÇUE:', data);
        alert('✅ Conversation supprimée !');

        // Recharger la page pour voir le changement
        window.location.reload();
      })
      .catch(error => {
        console.error('❌ ERREUR:', error);
        alert('❌ Erreur: ' + error.message);
      });
  };

  // Supprimer une demande de photo privée
  window.messagesManager.deletePhotoRequest = function (requestId) {
    console.log('🗑️ SUPPRESSION DEMANDE PHOTO:', requestId);

    // Confirmation avant suppression
    if (
      !confirm('Supprimer cette demande de photos privées définitivement ?')
    ) {
      return;
    }

    const token = localStorage.getItem('hotmeet_token');
    if (!token) {
      alert('Vous devez être connecté');
      return;
    }

    const apiUrl = `/api/auth/private-photos/delete/${requestId}`;

    console.log(`🔥 SUPPRESSION DEMANDE PHOTO: ${apiUrl}`);

    fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        console.log('🔥 RÉPONSE REÇUE:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('🔥 DATA REÇUE:', data);
        alert('✅ Demande supprimée !');

        // Recharger les demandes de photos
        window.messagesManager.loadPhotoRequests();
      })
      .catch(error => {
        console.error('❌ ERREUR:', error);
        alert('❌ Erreur: ' + error.message);
      });
  };

  window.messagesManager.viewAdProfile = async function (userId) {
    console.log('🔍 Voir profil utilisateur:', userId);

    // 💎 D'ABORD VÉRIFIER SI L'UTILISATEUR ACTUEL EST PREMIUM
    try {
      const token = localStorage.getItem('hotmeet_token');
      if (!token) {
        window.location.href = '/auth';
        return;
      }

      // Vérifier d'abord notre propre statut premium
      const statusResponse = await fetch('/api/payments/status', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const isUserPremium =
          statusData.success &&
          statusData.subscription &&
          statusData.subscription.isPremium;

        if (!isUserPremium) {
          // Non-premium → Redirection immédiate vers premium
          console.log('🔒 Utilisateur non premium - Redirection vers premium');
          window.location.href = '/pages/premium.html';
          return;
        }
      }

      // Si premium, autoriser l'accès au profil
      window.location.href = `/pages/profile-view.html?userId=${userId}`;
    } catch (error) {
      console.error('Erreur lors de la vérification premium:', error);
      // En cas d'erreur, rediriger vers premium par sécurité
      window.location.href = '/pages/premium.html';
    }
  };
});
