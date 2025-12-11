// Système Cam-to-Cam HotMeet - WebRTC en temps réel avec vrais partenaires

class CamToCamSystem {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.dataChannel = null;
    this.isConnected = false;
    this.isPaused = false;
    this.isSearching = false; // 🎯 Tracker si recherche en cours
    this.isStoppedByUser = false; // 🛑 Empêcher relance auto après stop manuel
    this.currentPartner = null;
    this.socket = null;
    this.connectionId = null;
    this.userId = null;

    // Profil utilisateur
    this.userProfile = {
      gender: null,
      country: null,
      countryCode: null,
    };

    // Configuration STUN/TURN servers
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    this.initialize();
  }

  initialize() {
    // Vérifier si l'utilisateur est premium (simulation)
    this.checkPremiumStatus();

    // Initialiser les écouteurs d'événements
    this.setupEventListeners();

    // Connexion Socket.IO
    this.connectSocket();

    // Demander permissions et afficher cam au démarrage
    this.initializeCameraOnStartup();
  }

  async initializeCameraOnStartup() {
    try {
      // Détecter le pays de l'utilisateur en arrière-plan
      this.detectUserCountry();

      // Demander permissions caméra et afficher immédiatement
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      this.localStream = stream;

      // Afficher la vidéo locale IMMÉDIATEMENT
      const localVideo = document.getElementById('localVideo');
      localVideo.srcObject = stream;
      localVideo.play(); // Forcer la lecture

      // Afficher directement l'interface de recherche
      document.getElementById('searchSection').classList.remove('hidden');

      // S'assurer que la vidéo est visible
      document.getElementById('camInterface').classList.remove('hidden');
    } catch (error) {
      // Si pas de permissions, afficher demande d'autorisation
      document.getElementById('permissionRequest').classList.remove('hidden');
    }
  }

  connectSocket() {
    // Vérifier si Socket.IO est disponible
    if (typeof io === 'undefined') {
      console.error('Socket.IO non chargé');
      // En mode démo, on simule un socket vide
      this.socket = {
        emit: () => {},
        on: () => {},
      };
      return;
    }
    // Connexion au serveur Socket.IO réel
    this.socket = io({
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Vérifier la connexion
    this.socket.on('connect', () => {
      console.log('✅ Connecté au serveur Socket.IO:', this.socket.id);
    });

    this.socket.on('connect_error', error => {
      console.error('❌ Erreur de connexion Socket.IO:', error);
      this.showError(
        'Impossible de se connecter au serveur. Veuillez rafraîchir la page.'
      );
    });

    // Écouter les événements Socket.IO
    this.socket.on('partner-found', data => {
      this.handlePartnerFound(data);
    });

    this.socket.on('waiting-for-partner', data => {
      this.handleWaitingForPartner(data);
    });

    this.socket.on('webrtc-signal', data => {
      this.handleWebRTCSignal(data);
    });

    // Écouter le timeout de recherche (pas de partenaire compatible trouvé)
    this.socket.on('no-match-timeout', data => {
      this.handleNoMatchTimeout(data);
    });

    this.socket.on('error', data => {
      this.showError(data.message);
    });

    this.socket.on('left-queue', data => {
      console.log(data.message);
    });

    // 🚨 GESTION DÉCONNEXION PARTENAIRE - AUTO-RECHERCHE
    this.socket.on('partner-disconnected', () => {
      console.log('🔌 PARTNER-DISCONNECTED REÇU !');
      this.addChatMessage('system', "Votre partenaire s'est déconnecté");

      // 🧹 NETTOYER LOCALEMENT (serveur a déjà déconnecté)
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
      if (this.remoteStream) {
        this.remoteStream.getTracks().forEach(track => track.stop());
        this.remoteStream = null;
      }
      const remoteVideo = document.getElementById('remoteVideo');
      remoteVideo.srcObject = null;

      this.isConnected = false;
      this.currentPartner = null;
      this.connectionId = null;
      this.clearChat();

      // 🔄 AUTO-RECHERCHE DIRECTE si pas arrêté manuellement
      if (!this.isStoppedByUser) {
        console.log(
          '🔄 AUTO-RECHERCHE après partner-disconnected dans 500ms...'
        );
        this.showPartnerLoading();
        setTimeout(() => {
          console.log('🔄 DÉCLENCHEMENT startPartnerSearch maintenant !');
          this.startPartnerSearch();
        }, 500);
      } else {
        console.log("⏹️ Pas d'auto-recherche car arrêt manuel");
        this.cleanupConnection();
      }
    });

    // 💬 RÉCEPTION MESSAGES CHAT
    this.socket.on('chat-message', data => {
      console.log('💬 Message reçu:', data);
      this.addChatMessage(
        'other',
        data.message,
        data.language,
        data.originalMessage
      );
    });
  }
  checkPremiumStatus() {
    // En mode démo, on simule un utilisateur premium
    // En production, cette fonction vérifierait l'abonnement
    const isPremium = true; // Simulation pour la démo

    if (!isPremium) {
      document.getElementById('premiumRestriction').classList.remove('hidden');
      return false;
    }
    return true;
  }

  setupEventListeners() {
    // Fonction pour gérer les événements tactiles et clics
    const addTouchListener = (elementId, handler) => {
      const element = document.getElementById(elementId);
      if (!element) {
        console.error(`Élément non trouvé: ${elementId}`);
        return;
      }

      // Événement tactile pour mobile
      element.addEventListener(
        'touchstart',
        e => {
          e.preventDefault();
          handler();
        },
        { passive: false }
      );

      // Événement clic pour desktop
      element.addEventListener('click', handler);
    };

    // Bouton de demande d'autorisations
    addTouchListener('requestPermissions', () => {
      this.requestMediaPermissions();
    });

    // Bouton de recherche de partenaire
    addTouchListener('startSearch', () => {
      this.isStoppedByUser = false; // 🔄 AUTORISER RECHERCHE
      this.startPartnerSearch();
    });

    // Bouton d'annulation de recherche
    addTouchListener('cancelSearch', () => {
      this.cancelSearch();
    });

    // Contrôles de la cam
    addTouchListener('pauseBtn', () => {
      this.togglePause();
    });

    addTouchListener('nextBtn', () => {
      this.nextPartner();
    });

    addTouchListener('reportBtn', () => {
      this.showReportModal();
    });

    addTouchListener('endBtn', () => {
      this.endCall();
    });

    // 🖥️ NOUVEAU: Plein écran pour la vidéo partenaire
    addTouchListener('fullscreenBtn', () => {
      this.toggleFullscreen();
    });

    // Chat
    addTouchListener('sendBtn', () => {
      this.sendMessage();
    });

    // Gestion du chat input pour mobile
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      });

      // Éviter le zoom sur iOS
      chatInput.addEventListener(
        'touchstart',
        e => {
          e.preventDefault();
        },
        { passive: false }
      );
    }

    // Modal de signalement
    addTouchListener('cancelReport', () => {
      this.hideReportModal();
    });

    addTouchListener('submitReport', () => {
      this.submitReport();
    });

    // Écouteurs pour les contrôles de chat en temps réel
    document.getElementById('chatLanguage').addEventListener('change', e => {
      this.updateChatLanguage(e.target.value);
    });

    document.getElementById('chatAnonymity').addEventListener('change', e => {
      this.updateAnonymityMode(e.target.value);
    });

    // 🔄 REDÉMARRAGE AUTOMATIQUE quand on change le genre pendant la recherche
    document.getElementById('chatGender').addEventListener('change', e => {
      this.handleGenderChange(e.target.value);
    });

    // Gestion des événements tactiles pour les sélecteurs
    const selectElements = document.querySelectorAll('select');
    selectElements.forEach(select => {
      select.addEventListener(
        'touchstart',
        e => {
          e.stopPropagation();
        },
        { passive: true }
      );
    });

    console.log('✅ Écouteurs d\\' + 'événements tactiles configurés');
  }

  updateChatLanguage(language) {
    // Mettre à jour la langue de traduction en temps réel
    console.log(`🌍 Changement langue chat: ${language}`);

    // Notifier le serveur du changement de langue
    if (this.socket) {
      this.socket.emit('update-chat-language', {
        language: language,
      });
    }
  }

  updateAnonymityMode(mode) {
    // Appliquer le nouveau mode d'anonymat en temps réel (sans message chat)
    this.applyAnonymityMask(mode);
    // Pas de message système dans le chat pour les changements d'anonymat
  }

  // 🔄 REDÉMARRAGE AUTOMATIQUE quand on change le genre pendant la recherche
  handleGenderChange(newGender) {
    console.log('🔄 Changement de genre détecté:', newGender);

    // Si on est en train de chercher, redémarrer automatiquement
    if (this.isSearching) {
      console.log(
        '🔄 Recherche en cours → Redémarrage automatique avec nouveaux critères'
      );

      // Afficher notification temporaire
      this.showNotification(
        'Critères modifiés - Recherche relancée automatiquement',
        'info',
        3000
      );

      // Arrêter la recherche actuelle
      this.stopSearch();

      // Relancer après un court délai pour éviter les conflits
      setTimeout(() => {
        console.log('🔄 Relance automatique avec nouveau genre:', newGender);
        this.startPartnerSearch();
      }, 500);
    } else {
      console.log(
        '🔄 Pas de recherche en cours, nouveaux critères seront utilisés au prochain démarrage'
      );
    }
  }

  getLanguageName(language) {
    const languages = {
      fr: 'Français',
      en: 'Anglais',
      de: 'Allemand',
      it: 'Italien',
      es: 'Espagnol',
      pt: 'Portugais',
    };
    return languages[language] || language;
  }

  getAnonymityModeName(mode) {
    const modes = {
      normal: 'Visage visible',
      mask: 'Masque de protection',
      blur: 'Flou du visage',
      silhouette: 'Silhouette uniquement',
    };
    return modes[mode] || mode;
  }

  async requestMediaPermissions() {
    try {
      console.log('📱 Configuration WebRTC pour mobile...');

      // Configuration optimisée pour mobile
      const constraints = {
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          facingMode: 'user',
          frameRate: { ideal: 24, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
        },
      };

      // Vérifier la compatibilité mobile
      if (this.isMobileDevice()) {
        console.log(
          "📱 Détection d'un appareil mobile, optimisation des contraintes"
        );
        constraints.video = {
          width: { ideal: 480, max: 640 },
          height: { ideal: 360, max: 480 },
          facingMode: 'user',
          frameRate: { ideal: 20, max: 24 },
        };
      }

      // Demander l'accès à la webcam et au microphone
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log('✅ Accès média autorisé, flux obtenu:', {
        videoTracks: this.localStream.getVideoTracks().length,
        audioTracks: this.localStream.getAudioTracks().length,
      });

      // Afficher le flux local
      const localVideo = document.getElementById('localVideo');
      localVideo.srcObject = this.localStream;

      // Configuration vidéo pour mobile
      localVideo.playsInline = true;
      localVideo.setAttribute('playsinline', 'true');
      localVideo.setAttribute('webkit-playsinline', 'true');

      // Cacher la demande d'autorisations, afficher la recherche
      document.getElementById('permissionRequest').classList.add('hidden');
      document.getElementById('searchSection').classList.remove('hidden');

      console.log('🎥 Vidéo locale configurée pour mobile');
    } catch (error) {
      console.error('❌ Erreur d\\' + 'accès média:', error);

      // Message d'erreur spécifique pour mobile
      let errorMessage =
        'Impossible d\\' + 'accéder à votre webcam/microphone. ';

      if (error.name === 'NotAllowedError') {
        errorMessage +=
          'Veuillez autoriser l\\' +
          'accès dans les paramètres de votre navigateur.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'Aucune caméra n\\' + 'a été détectée.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage +=
          'Votre navigateur ne supporte pas cette fonctionnalité.';
      } else {
        errorMessage += 'Vérifiez vos autorisations.';
      }

      this.showError(errorMessage);
    }
  }

  // Détection des appareils mobiles
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  async startPartnerSearch() {
    console.log('🔍 Début de la recherche de partenaire...');

    // 🛑 BLOQUER SI UTILISATEUR A CLIQUÉ "ARRÊTER"
    if (this.isStoppedByUser) {
      console.log('❌ Recherche bloquée - utilisateur a cliqué Arrêter');
      return;
    }

    // 🛑 VÉRIFICATIONS PRÉALABLES
    if (this.isSearching) {
      console.log('⚠️ Recherche déjà en cours');
      return;
    }

    if (this.isConnected) {
      console.log('⚠️ Déjà connecté à un partenaire');
      return;
    }

    // 🎯 MARQUER RECHERCHE EN COURS
    this.isSearching = true;

    // 🚨 NOUVELLE UX: AFFICHER INTERFACE CAM IMMÉDIATEMENT
    try {
      // 1. Demander les permissions média AVANT de changer l'interface
      await this.requestMediaPermissions();

      // 2. Afficher l'interface cam immédiatement
      document.getElementById('searchSection').classList.add('hidden');
      document.getElementById('camInterface').classList.remove('hidden');

      // 3. Changer le bouton pour "Arrêter la recherche"
      this.updateSearchButton(true);

      // 4. Préparer zone partenaire avec loading
      this.showPartnerLoading();

      // 5. Démarrer la recherche réseau
      this.initiateNetworkSearch();
    } catch (error) {
      console.error('❌ Erreur permissions média:', error);
      this.showError('Autorisations camera/micro requises pour continuer');
    }
  }

  initiateNetworkSearch() {
    // Demander le genre si pas encore défini
    if (!this.userProfile.gender) {
      this.askUserGender(() => {
        // APRÈS sélection genre, relancer IMMÉDIATEMENT la recherche réseau
        this.initiateNetworkSearch();
      });
      return;
    }

    // Maintenant on a le genre, lancer la vraie recherche
    this.startSearch();
  }

  askUserGender(callback) {
    // Afficher la modale stylée
    const modal = document.getElementById('genderModal');
    modal.style.display = 'flex';

    // Nettoyer les anciens événements
    const genderButtons = document.querySelectorAll('.gender-choice');
    genderButtons.forEach(button => {
      // Cloner le bouton pour supprimer tous les événements
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
    });

    // Réattacher les nouveaux événements
    const freshButtons = document.querySelectorAll('.gender-choice');
    freshButtons.forEach(button => {
      button.onclick = () => {
        const selectedGender = button.getAttribute('data-gender');
        this.userProfile.gender = selectedGender;

        console.log('🎯 Genre sélectionné:', selectedGender);

        // Mettre à jour l'affichage du pays
        this.updateUserInfo();

        // Fermer la modale
        modal.style.display = 'none';

        // Continuer la recherche
        callback();
      };
    });
  }

  startSearch() {
    // Récupérer les critères de recherche
    const anonymity = document.getElementById('anonymity')?.value || 'normal';
    const genderFilter = this.getSelectedGenderFilter(); // Genre recherché (filtre)
    const language = this.getSelectedLanguage(); // Utiliser la méthode dédiée

    // Récupérer l'ID utilisateur (simulation pour la démo)
    this.userId = 'demo-user-id-' + Date.now();

    const searchCriteria = {
      country: this.userProfile.countryCode || 'unknown',
      gender: genderFilter, // Genre recherché
      anonymity: anonymity,
      language: language,
      ageMin: 18,
      ageMax: 100,
      // Profil utilisateur AVEC LE GENRE SÉLECTIONNÉ
      userProfile: {
        gender: this.userProfile.gender, // MON genre (sélectionné dans la modale)
        country: this.userProfile.countryCode,
        countryName: this.userProfile.country,
      },
    };

    console.log('🎯 Critères de recherche:', searchCriteria);
    console.log(
      '🎯 MON GENRE:',
      this.userProfile.gender,
      'JE CHERCHE:',
      genderFilter
    );

    // Vérifier que le socket est connecté
    if (!this.socket.connected) {
      console.error('❌ Socket non connecté, tentative de reconnexion...');
      this.socket.connect();
      setTimeout(() => {
        if (this.socket.connected) {
          this.emitJoinCamQueue(searchCriteria);
        } else {
          this.showError('Connexion échouée. Veuillez rafraîchir la page.');
        }
      }, 1000);
    } else {
      this.emitJoinCamQueue(searchCriteria);
    }
  }

  updateSearchButton(isSearching) {
    const startBtn = document.getElementById('startSearch');
    if (!startBtn) return;

    if (isSearching) {
      startBtn.textContent = '🛑 Arrêter la recherche';
      startBtn.onclick = () => this.stopSearch();
    } else {
      startBtn.textContent = '🔍 Commencer la recherche';
      startBtn.onclick = () => this.startPartnerSearch();
    }
  }

  showPartnerLoading() {
    // Afficher zone de chargement pour le partenaire
    const remoteVideo = document.getElementById('remoteVideo');

    if (remoteVideo) {
      // Créer ou mettre à jour l'overlay de chargement
      let loadingOverlay = document.getElementById('partner-loading-overlay');
      if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'partner-loading-overlay';
        loadingOverlay.className = 'partner-loading';

        // 🎯 INSÉRER DIRECTEMENT APRÈS LA VIDÉO
        remoteVideo.parentNode.insertBefore(
          loadingOverlay,
          remoteVideo.nextSibling
        );
      }

      loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <p>🔍 Recherche d'un partenaire...</p>
        <p>Patientez...</p>
      `;

      // Cacher la vidéo et afficher l'overlay
      remoteVideo.style.display = 'none';
      loadingOverlay.style.display = 'flex';
    }
  }
  stopSearch() {
    // 🛑 RESET COMPLET - COMME RAFRAÎCHIR LA PAGE
    console.log('🛑 Arrêt de la recherche demandé');

    // 🚨 EMPÊCHER TOUTE RELANCE AUTOMATIQUE
    this.isStoppedByUser = true;

    // 🧹 NETTOYER TOUS LES ÉTATS
    this.isSearching = false;
    this.isConnected = false;
    this.isPaused = false;
    this.currentPartner = null;
    this.connectionId = null;
    this.partnerSocketId = null;
    this.mySocketId = null;

    // 🔌 FERMER CONNEXIONS WebRTC
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }

    // 📡 QUITTER FILE D'ATTENTE SERVEUR
    this.socket.emit('leave-cam-queue');
    this.socket.emit('end-cam-connection');

    // 🎥 NETTOYER VIDÉOS
    const remoteVideo = document.getElementById('remoteVideo');
    if (remoteVideo) {
      remoteVideo.srcObject = null;
      remoteVideo.style.display = 'block';
    }

    // 🗑️ SUPPRIMER OVERLAY COMPLÈTEMENT
    const loadingOverlay = document.getElementById('partner-loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.remove();
    }

    // 🧹 NETTOYER AFFICHAGE PARTENAIRE
    const partnerInfo = document.querySelector('.partner-info');
    if (partnerInfo) {
      partnerInfo.innerHTML = '';
    }

    // 💬 VIDER LE CHAT
    this.clearChat();

    // 🔄 REMETTRE INTERFACE À L'ÉTAT INITIAL
    document.getElementById('camInterface').classList.add('hidden');
    document.getElementById('searchSection').classList.remove('hidden');
    document.getElementById('searchStatus').classList.add('hidden');

    // Bouton redevient "Commencer"
    this.updateSearchButton(false);

    console.log('✅ Reset complet effectué - état initial restauré');
  }
  handlePartnerFound(data) {
    console.log('🎉 Partenaire trouvé - données reçues:', data);

    // 🎯 RECHERCHE TERMINÉE
    this.isSearching = false;

    this.connectionId = data.connectionId;
    this.currentPartner = data.partner;
    this.partnerSocketId = data.partnerSocketId;
    this.mySocketId = data.mySocketId;

    console.log('🤝 Partenaire trouvé:', {
      partnerSocketId: this.partnerSocketId,
      mySocketId: this.mySocketId,
      partner: this.currentPartner,
      connectionId: this.connectionId,
    });

    console.log(
      '🔍 DÉTAIL OBJET PARTNER:',
      JSON.stringify(data.partner, null, 2)
    );

    // 🚨 S'ASSURER QUE L'INTERFACE CAM EST VISIBLE
    document.getElementById('searchStatus').classList.add('hidden');
    document.getElementById('camInterface').classList.remove('hidden');

    // 🚨 REMETTRE VIDÉO PARTENAIRE EN CAS DE MODE "SUIVANT"
    const remoteVideo = document.getElementById('remoteVideo');
    if (remoteVideo) {
      remoteVideo.style.display = 'block';

      // SUPPRIMER COMPLÈTEMENT l'overlay de chargement
      const loadingOverlay = document.getElementById('partner-loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.remove(); // SUPPRIMER au lieu de cacher
        console.log('🚫 Overlay de loading supprimé');
      }
    }

    // 📍 AFFICHER LES INFOS DU PARTENAIRE
    console.log('📍 APPEL displayPartnerInfo avec données:', data.partner);
    this.displayPartnerInfo(data.partner);

    // Initialiser la connexion WebRTC
    this.initiateWebRTCConnection();

    this.isConnected = true;

    // Vider le chat avant de commencer une nouvelle session
    this.clearChat();

    // Plus de message de bienvenue automatique
  }

  // Gérer le timeout de recherche (aucun partenaire compatible trouvé)
  handleNoMatchTimeout(data) {
    console.log('⏰ Timeout de recherche reçu:', data);

    // Arrêter la recherche
    this.isSearching = false;

    // Supprimer l'overlay de loading
    const loadingOverlay = document.getElementById('partner-loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.remove();
    }

    // Réinitialiser le bouton
    const startBtn = document.getElementById('start-chat');
    if (startBtn) {
      startBtn.textContent = 'Démarrer la cam';
      startBtn.classList.remove('searching');
      startBtn.disabled = false;
    }

    // Afficher le message d'information
    this.showNotification(data.message, 'warning', 10000); // 10 secondes

    // Optionnel : ajouter un message dans le chat
    this.addChatMessage('system', `⏰ ${data.message}`);

    console.log('⏰ Recherche arrêtée automatiquement après timeout');
  }

  // Méthodes pour récupérer les préférences des filtres
  getSelectedGenderFilter() {
    const genderSelect = document.getElementById('chatGender');
    return genderSelect ? genderSelect.value : 'all';
  }

  getSelectedLanguage() {
    const languageSelect = document.getElementById('chatLanguage');
    return languageSelect ? languageSelect.value : 'fr';
  }

  updateUserInfo() {
    // Mettre à jour l'affichage des informations utilisateur
    const userInfo = document.querySelector('.user-info');
    const countryFlag = document.getElementById('userCountryFlag');
    const countryName = document.getElementById('userCountryName');

    if (countryFlag && this.userProfile.countryCode) {
      countryFlag.textContent = this.getCountryFlag(
        this.userProfile.countryCode
      );
    }

    if (countryName) {
      countryName.textContent = this.userProfile.country || 'Localisation...';
    }

    console.log('🌍 Info utilisateur mise à jour:', this.userProfile);
  }

  getCountryFlag(countryCode) {
    if (!countryCode) return '🌍';

    // Conversion code pays vers emoji drapeau
    const flags = {
      fr: '🇫🇷',
      de: '🇩🇪',
      es: '🇪🇸',
      it: '🇮🇹',
      gb: '🇬🇧',
      us: '🇺🇸',
      ca: '🇨🇦',
      ch: '🇨🇭',
      be: '🇧🇪',
      nl: '🇳🇱',
      pt: '🇵🇹',
      at: '🇦🇹',
      se: '🇸🇪',
      no: '🇳🇴',
      dk: '🇩🇰',
      fi: '🇫🇮',
    };

    return flags[countryCode.toLowerCase()] || '🌍';
  }

  // 📍 AFFICHER LES INFOS DU PARTENAIRE
  displayPartnerInfo(partner) {
    const partnerInfo = document.querySelector('.partner-info');
    if (!partnerInfo) {
      console.warn('⚠️ Élément .partner-info non trouvé dans le DOM');
      return;
    }

    console.log('📍 Données partenaire reçues:', partner);

    // Récupération robuste du genre - CORRIGÉ
    const partnerGender = partner?.gender || 'inconnu';

    // Récupération robuste du pays
    const partnerCountry = partner?.country || 'Inconnu';
    const partnerCountryCode = partner?.countryCode || null;

    // Emojis et textes
    const genderEmoji =
      {
        male: '👨',
        female: '👩',
        other: '🌈',
      }[partnerGender] || '👤';

    const genderText =
      {
        male: 'Homme',
        female: 'Femme',
        other: 'Autre',
      }[partnerGender] || 'Inconnu';

    const countryFlag = partnerCountryCode
      ? this.getCountryFlag(partnerCountryCode)
      : '🌍';

    // Mise à jour de l'affichage avec FORCE CSS
    partnerInfo.style.cssText = `
      position: absolute !important;
      top: 10px !important;
      right: 10px !important;
      background: rgba(0, 0, 0, 0.8) !important;
      color: white !important;
      padding: 0.5rem !important;
      border-radius: 8px !important;
      font-size: 0.9rem !important;
      font-weight: 600 !important;
      z-index: 9999 !important;
      display: block !important;
      visibility: visible !important;
    `;
    partnerInfo.innerHTML = `<p style="margin: 0;">${genderEmoji} ${genderText} ${countryFlag} ${partnerCountry}</p>`;

    console.log('✅ Infos partenaire affichées:', {
      partnerGender,
      genderText,
      partnerCountry,
      countryFlag,
    });
  }

  emitJoinCamQueue(searchCriteria) {
    console.log('📡 Émission join-cam-queue avec critères:', searchCriteria);

    // Format attendu par le serveur: { userId, criteria }
    const payload = {
      userId: this.userId || 'demo-user-' + Date.now(),
      criteria: {
        country: searchCriteria.country || 'all',
        gender: searchCriteria.gender || 'all', // Genre recherché
        language: searchCriteria.language || 'fr',
        userProfile: searchCriteria.userProfile,
        socketId: this.socket.id,
      },
    };

    console.log('📡 ENVOI AU SERVEUR join-cam-queue:', payload);

    this.socket.emit('join-cam-queue', payload, response => {
      if (response && response.error) {
        console.error('❌ Erreur du serveur:', response.error);
        this.showError('Erreur lors de la recherche: ' + response.error);
      } else {
        console.log('✅ Requête join-cam-queue envoyée avec succès');
      }
    });
  }

  handleWaitingForPartner(data) {
    console.log('⏳ En attente de partenaire:', data);

    // 🚨 GESTION RECHERCHE EN MODE CAM (SUIVANT)
    const camInterface = document.getElementById('camInterface');
    const searchStatus = document.getElementById('searchStatus');
    const isInCamMode = !camInterface.classList.contains('hidden');

    if (isInCamMode) {
      // Mode "suivant" - afficher recherche dans l'interface cam
      this.addChatMessage(
        'system',
        `🔍 ${data.message} (Position: ${data.queuePosition})`
      );

      // Masquer vidéo partenaire et afficher message
      const remoteVideo = document.getElementById('remoteVideo');
      const partnerInfo = document.querySelector('.partner-info');
      if (remoteVideo) {
        remoteVideo.style.display = 'none';
      }
      if (partnerInfo) {
        partnerInfo.innerHTML =
          "<p>🔍 Recherche d'un nouveau partenaire...</p>";
      }
    } else {
      // Mode recherche initial - utiliser searchStatus
      searchStatus.innerHTML = `
        <div class="searching-animation">
          <div class="spinner"></div>
          <p>${data.message}</p>
          <p>Position dans la file: ${data.queuePosition}</p>
        </div>
      `;
    }
  }

  async handleWebRTCSignal(data) {
    console.log('📡 Signal WebRTC reçu:', {
      type: data.signal.type,
      connectionId: data.connectionId,
      fromSocketId: data.fromSocketId,
    });

    if (!this.peerConnection) {
      console.error('❌ PeerConnection non disponible pour traiter le signal');
      return;
    }

    try {
      if (data.signal.type === 'offer') {
        console.log('📥 Offre WebRTC reçue du partenaire');
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.signal)
        );

        // Créer et envoyer la réponse
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.socket.emit('webrtc-signal', {
          connectionId: this.connectionId,
          signal: answer,
          targetSocketId: this.getPartnerSocketId(),
        });
        console.log('📤 Réponse WebRTC envoyée au partenaire');
      } else if (data.signal.type === 'answer') {
        console.log('📥 Réponse WebRTC reçue du partenaire');
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.signal)
        );
      } else if (data.signal.candidate) {
        console.log('🧊 Candidat ICE reçu du partenaire');
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(data.signal.candidate)
        );
      }

      console.log('✅ Signal WebRTC traité avec succès');
    } catch (error) {
      console.error('❌ Erreur lors du traitement du signal WebRTC:', error);
    }
  }

  async initiateWebRTCConnection() {
    try {
      console.log('🚀 Initialisation de la connexion WebRTC...');

      // Créer la connexion peer-to-peer
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
      });

      console.log('✅ PeerConnection créée');

      // Ajouter le flux local
      if (this.localStream) {
        const tracks = this.localStream.getTracks();
        console.log(`📹 Ajout de ${tracks.length} pistes locales`);

        tracks.forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
          console.log(`✅ Piste ${track.kind} ajoutée`);
        });
      }

      // Gérer les flux entrants
      this.peerConnection.ontrack = event => {
        console.log('🎬 Événement ontrack déclenché:', {
          streams: event.streams.length,
          track: event.track?.kind,
        });

        const remoteVideo = document.getElementById('remoteVideo');
        if (event.streams && event.streams.length > 0) {
          remoteVideo.srcObject = event.streams[0];
          this.remoteStream = event.streams[0];
          console.log('✅ Flux distant assigné à la vidéo');

          // SUPPRIMER L'OVERLAY DE LOADING dès que la vidéo arrive
          const loadingOverlay = document.getElementById(
            'partner-loading-overlay'
          );
          if (loadingOverlay) {
            loadingOverlay.remove();
            console.log('🚫 Overlay supprimé car vidéo reçue');
          }

          // Vérifier l'état de la vidéo après un délai
          setTimeout(() => {
            console.log('🔍 État de la vidéo distante:', {
              readyState: remoteVideo.readyState,
              videoWidth: remoteVideo.videoWidth,
              videoHeight: remoteVideo.videoHeight,
              srcObject: remoteVideo.srcObject ? 'présent' : 'absent',
            });
          }, 1000);
        } else {
          console.error('❌ Aucun flux dans l\\' + 'événement ontrack');
        }
      };

      // Gérer les changements d'état de la connexion
      this.peerConnection.onconnectionstatechange = () => {
        console.log(
          '🔌 État de connexion:',
          this.peerConnection.connectionState
        );
        if (this.peerConnection.connectionState === 'connected') {
          console.log('🎉 Connexion WebRTC établie avec succès!');
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('❄️ État ICE:', this.peerConnection.iceConnectionState);
      };

      // Gérer les candidats ICE
      this.peerConnection.onicecandidate = event => {
        if (event.candidate) {
          console.log('🧊 Candidat ICE généré:', event.candidate.type);
          this.socket.emit('webrtc-signal', {
            connectionId: this.connectionId,
            signal: { candidate: event.candidate },
            targetSocketId: this.getPartnerSocketId(),
          });
        } else {
          console.log('✅ Tous les candidats ICE ont été générés');
        }
      };

      // Déterminer qui initie l'offre (premier socket ID alphabétiquement)
      const shouldInitiate = this.mySocketId < this.partnerSocketId;

      if (shouldInitiate) {
        console.log('🎯 Ce client initie l\\' + 'offre WebRTC');

        // Créer l'offre initiale
        console.log('📝 Création de l\\' + 'offre WebRTC...');
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        console.log('✅ Offre créée et description locale définie');

        // Envoyer l'offre au partenaire
        this.socket.emit('webrtc-signal', {
          connectionId: this.connectionId,
          signal: offer,
          targetSocketId: this.getPartnerSocketId(),
        });
        console.log('📤 Offre envoyée au partenaire');
      } else {
        console.log('🎯 Ce client attend l\\' + 'offre du partenaire');
        // Ne pas créer d'offre, attendre l'offre du partenaire
      }
    } catch (error) {
      console.error('❌ Erreur WebRTC:', error);
      this.showError('Erreur de connexion vidéo');
    }
  }

  getPartnerSocketId() {
    // Utiliser le vrai socket ID du partenaire reçu du serveur
    return this.partnerSocketId || 'partner-socket-id';
  }

  cancelSearch() {
    // Quitter la file d'attente
    this.socket.emit('leave-cam-queue');

    document.getElementById('searchStatus').classList.add('hidden');
    document.getElementById('searchSection').classList.remove('hidden');
  }

  togglePause() {
    this.isPaused = !this.isPaused;

    const pauseBtn = document.getElementById('pauseBtn');

    if (this.isPaused) {
      // Mode pause : arrêter la recherche et rendre invisible
      pauseBtn.innerHTML = '<span>▶️ Reprendre</span>';
      this.addChatMessage(
        'system',
        'Mode pause activé - Vous êtes invisible aux autres'
      );

      // Quitter la file d'attente
      this.socket.emit('leave-cam-queue');

      // Simuler l'arrêt de la recherche et le masquage
      if (this.localStream) {
        // Masquer la webcam (noir ou image de pause)
        const localVideo = document.getElementById('localVideo');
        localVideo.style.filter = 'brightness(0)';
      }
    } else {
      // Reprendre la recherche et redevenir visible
      pauseBtn.innerHTML = '<span>⏸️ Pause</span>';
      this.addChatMessage('system', 'Mode pause désactivé - Vous êtes visible');

      // Rétablir la webcam
      const localVideo = document.getElementById('localVideo');
      localVideo.style.filter = 'none';

      // Rejoindre à nouveau la file d'attente SEULEMENT si pas arrêté par utilisateur
      if (!this.isStoppedByUser) {
        this.startPartnerSearch();
      }
    }
  }

  nextPartner() {
    // 🔄 CHATROULETTE SIMPLE - Suivant immédiat
    console.log('🔄 Recherche partenaire suivant...');

    // Protection contre spam clics
    if (this.isSearching) {
      console.log('⚠️ Recherche déjà en cours, ignore');
      return;
    }

    // Terminer connexion actuelle et chercher immédiatement
    this.endCallAndSearchAgain();
  }

  endCurrentConnectionOnly() {
    // 🚨 TERMINER CONNEXION SANS CHANGER L'INTERFACE
    if (this.connectionId) {
      this.socket.emit('end-cam-connection');
      console.log('🔓 Connexion actuelle terminée pour suivant');
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }

    const remoteVideo = document.getElementById('remoteVideo');
    remoteVideo.srcObject = null;

    this.isConnected = false;
    this.currentPartner = null;
    this.connectionId = null;

    // Vider le chat
    this.clearChat();

    // Quitter la file d'attente
    this.socket.emit('leave-cam-queue');

    // 🚨 NE PAS REVENIR À L'INTERFACE RECHERCHE
    // L'interface cam reste affichée pour transition fluide
  }

  endCall() {
    // 🚨 LIBÉRER EXCLUSIVITÉ CHATROULETTE
    if (this.connectionId) {
      this.socket.emit('end-cam-connection');
      console.log('🔓 Signal fin de connexion envoyé au serveur');
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }

    const remoteVideo = document.getElementById('remoteVideo');
    remoteVideo.srcObject = null;

    this.isConnected = false;
    this.isPaused = false;
    this.isSearching = false; // 🛑 ARRÊTER TOUTE RECHERCHE
    this.currentPartner = null;
    this.connectionId = null;

    // Vider le chat
    this.clearChat();

    // 🧹 NETTOYER AFFICHAGE PARTENAIRE
    const partnerInfo = document.querySelector('.partner-info');
    if (partnerInfo) {
      partnerInfo.innerHTML = '';
    }

    // Quitter la file d'attente
    this.socket.emit('leave-cam-queue');

    // Revenir à l'interface de recherche directement
    document.getElementById('camInterface').classList.add('hidden');
    document.getElementById('searchSection').classList.remove('hidden');
    document.getElementById('searchStatus').classList.add('hidden');
  }

  endCallAndSearchAgain() {
    // 🔄 NOUVEAU: Terminer l'appel ET relancer automatiquement la recherche

    // 🚨 LIBÉRER EXCLUSIVITÉ CHATROULETTE
    if (this.connectionId) {
      this.socket.emit('end-cam-connection');
      console.log('🔓 Signal fin de connexion envoyé au serveur');
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }

    const remoteVideo = document.getElementById('remoteVideo');
    remoteVideo.srcObject = null;

    this.isConnected = false;
    this.isPaused = false;
    // 🎯 NE PAS mettre isSearching = false car on va relancer la recherche !
    this.currentPartner = null;
    this.connectionId = null;

    // Vider le chat
    this.clearChat();

    // ✅ RESTER dans l'interface cam ET relancer la recherche automatiquement
    console.log(
      '🔄 Partenaire déconnecté - relance automatique de la recherche'
    );

    // Afficher l'écran de chargement
    this.showPartnerLoading();

    // Relancer la recherche (sauf si l'utilisateur avait cliqué Arrêter)
    if (!this.isStoppedByUser) {
      this.startPartnerSearch();
    } else {
      // Si l'utilisateur avait arrêté, on revient à l'interface de recherche
      document.getElementById('camInterface').classList.add('hidden');
      document.getElementById('searchSection').classList.remove('hidden');
      this.updateSearchButton(false);
    }
  }

  // 🧹 MÉTHODE POUR NETTOYER CONNEXION SANS RELANCER RECHERCHE
  cleanupConnection() {
    console.log('🧹 Nettoyage connexion sans relancer recherche');

    // Libérer la connexion côté serveur
    if (this.connectionId) {
      this.socket.emit('end-cam-connection');
      console.log('🔓 Signal fin de connexion envoyé au serveur');
    }

    // Nettoyer WebRTC
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }

    const remoteVideo = document.getElementById('remoteVideo');
    remoteVideo.srcObject = null;

    // Remettre les variables à zéro
    this.isConnected = false;
    this.isPaused = false;
    this.isSearching = false;
    this.currentPartner = null;
    this.connectionId = null;

    // Vider le chat
    this.clearChat();

    // Retourner à l'interface de recherche
    document.getElementById('camInterface').classList.add('hidden');
    document.getElementById('searchSection').classList.remove('hidden');
    this.updateSearchButton(false);
  }

  sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();

    if (message && this.isConnected && this.currentPartner) {
      // 💬 ENVOYER MESSAGE AU PARTENAIRE
      this.socket.emit('send-chat-message', {
        connectionId: this.connectionId,
        message: message,
        targetSocketId: this.partnerSocketId,
      });

      // Ajouter le message localement
      const userLanguage =
        document.getElementById('chatLanguage')?.value || 'fr';
      this.addChatMessage('self', message, userLanguage);
      console.log('💬 Message envoyé:', message);

      // Vider le champ de saisie
      chatInput.value = '';
    } else if (!this.isConnected) {
      this.addChatMessage(
        'system',
        'Vous devez être connecté pour envoyer un message'
      );
    }
  }

  addChatMessage(sender, message, language = null, originalMessage = null) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');

    messageDiv.className = `message ${sender}`;

    // Affichage simplifié pour éviter les bugs
    if (
      sender === 'other' &&
      originalMessage &&
      originalMessage !== message &&
      language
    ) {
      // Message traduit du partenaire
      const languageFlag = this.getLanguageFlag(language);
      messageDiv.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
          <span style="margin-right: 8px; font-size: 1.2em;">${languageFlag}</span>
          <div>
            <div style="font-size: 0.85em; color: #666; font-style: italic;">"${originalMessage}"</div>
            <div style="font-size: 1em; font-weight: 500; margin-top: 2px;">${message}</div>
          </div>
        </div>
      `;
    } else if (sender === 'other' && language) {
      // Message normal du partenaire
      const languageFlag = this.getLanguageFlag(language);
      messageDiv.innerHTML = `<span style="margin-right: 8px;">${languageFlag}</span> ${message}`;
    } else if (sender === 'self' && language) {
      // Message de l'utilisateur
      const languageFlag = this.getLanguageFlag(language);
      messageDiv.innerHTML = `<span style="margin-right: 8px;">${languageFlag}</span> ${message}`;
    } else {
      messageDiv.textContent = message;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  clearChat() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
  }

  applyAnonymityMask(mode) {
    const localVideo = document.getElementById('localVideo');

    switch (mode) {
      case 'normal':
        localVideo.style.filter = 'none';
        break;
      case 'mask':
        localVideo.style.filter = 'brightness(0.3) contrast(0.8)';
        // Ajouter un overlay de masque
        break;
      case 'blur':
        localVideo.style.filter = 'blur(10px)';
        break;
      case 'silhouette':
        localVideo.style.filter = 'brightness(0) contrast(2)';
        break;
    }
  }

  getGenderIcon(gender) {
    const icons = {
      male: '👨',
      female: '👩',
      other: '⚧',
    };
    return icons[gender] || '👤';
  }

  getLanguageFlag(language) {
    const flags = {
      fr: '🇫🇷',
      en: '🇺🇸',
      de: '🇩🇪',
      it: '🇮🇹',
      es: '🇪🇸',
      pt: '🇵🇹',
      nl: '🇳🇱',
      ru: '🇷🇺',
      ja: '🇯🇵',
      ko: '🇰🇷',
      zh: '🇨🇳',
      ar: '🇸🇦',
      hi: '🇮🇳',
      tr: '🇹🇷',
      pl: '🇵🇱',
      sv: '🇸🇪',
      da: '🇩🇰',
      no: '🇳🇴',
      fi: '🇫🇮',
      el: '🇬🇷',
      he: '🇮🇱',
      th: '🇹🇭',
      vi: '🇻🇳',
      cs: '🇨🇿',
      hu: '🇭🇺',
      ro: '🇷🇴',
      bg: '🇧🇬',
      hr: '🇭🇷',
      sk: '🇸🇰',
      sl: '🇸🇮',
      et: '🇪🇪',
      lv: '🇱🇻',
      lt: '🇱🇹',
    };
    return flags[language] || '🌐';
  }

  showReportModal() {
    document.getElementById('reportModal').classList.remove('hidden');
  }

  hideReportModal() {
    document.getElementById('reportModal').classList.add('hidden');
    // Réinitialiser le formulaire
    document.getElementById('reportReason').value = 'mineur';
    document.getElementById('reportDescription').value = '';
  }

  submitReport() {
    const reason = document.getElementById('reportReason').value;
    const description = document.getElementById('reportDescription').value;

    // Simuler l'envoi du signalement
    console.log('Signalement envoyé:', { reason, description });

    this.addChatMessage(
      'system',
      'Signalement envoyé. Merci de votre vigilance.'
    );
    this.hideReportModal();

    // Optionnel : terminer l'appel après signalement
    this.endCall();
  }

  showError(message) {
    // Afficher un message d'erreur simple
    alert(message);
  }
}

// Gestion de la géolocalisation
class LocationService {
  constructor() {
    this.currentLocation = null;
  }

  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          this.currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          resolve(this.currentLocation);
        },
        error => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }

  // 🖥️ NOUVELLE FONCTION: Basculer le mode plein écran
  toggleFullscreen() {
    const camLayout = document.querySelector('.cam-layout');
    const isFullscreen = camLayout.classList.contains('fullscreen-mode');

    if (!isFullscreen) {
      // Activer le plein écran
      camLayout.classList.add('fullscreen-mode');
      document.getElementById('fullscreenBtn').innerHTML = '🔙';
      document.getElementById('fullscreenBtn').title = 'Quitter plein écran';
    } else {
      // Désactiver le plein écran
      camLayout.classList.remove('fullscreen-mode');
      document.getElementById('fullscreenBtn').innerHTML = '⛶';
      document.getElementById('fullscreenBtn').title = 'Plein écran';
    }
  }

  // 🌍 DÉTECTION AUTOMATIQUE DU PAYS
  async detectUserCountry() {
    try {
      // Utiliser l'API ipapi.co pour détecter le pays
      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
        headers: {
          'User-Agent': 'HotMeet-GeoLocation',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.userProfile.country = data.country_name || 'Inconnu';
        this.userProfile.countryCode = data.country_code
          ? data.country_code.toLowerCase()
          : null;

        console.log(
          '🌍 Pays détecté:',
          this.userProfile.country,
          this.userProfile.countryCode
        );

        // Mettre à jour l'affichage IMMÉDIATEMENT
        this.updateUserInfo();
      } else {
        throw new Error('Erreur API géolocalisation');
      }
    } catch (error) {
      console.log('⚠️ Impossible de détecter le pays:', error.message);
      this.userProfile.country = 'Inconnu';
      this.userProfile.countryCode = null;
      this.updateUserInfo();
    }
  }

  updateCountryDisplay() {
    const countryFlag = document.getElementById('countryFlag');
    const countryName = document.getElementById('countryName');

    if (this.userProfile.countryCode) {
      countryFlag.textContent = this.getCountryFlag(
        this.userProfile.countryCode
      );
    } else {
      countryFlag.textContent = '🌐';
    }

    countryName.textContent =
      this.userProfile.country || 'Localisation inconnue';
  }

  // 🎯 VÉRIFICATION DU FILTRE DE GENRE
  validateGenderFilter(partnerGender) {
    const selectedFilter = document.getElementById('chatGender').value;

    if (selectedFilter === 'all') {
      return true; // Accepter tous les genres
    }

    return selectedFilter === partnerGender;
  }
}

// Initialisation du système lorsque la page est chargée
document.addEventListener('DOMContentLoaded', () => {
  window.camSystem = new CamToCamSystem();
  window.locationService = new LocationService();

  // Demander la géolocalisation au chargement
  window.locationService
    .getCurrentLocation()
    .then(location => {
      console.log('Localisation obtenue:', location);
    })
    .catch(error => {
      console.warn('Impossible d\\' + 'obtenir la localisation:', error);
    });
});

// Gestion du responsive design - DÉSACTIVÉ pour éviter les conflits avec CSS
// window.addEventListener('resize', () => {
//   const camContent = document.querySelector('.cam-content');
//   if (window.innerWidth < 768) {
//     camContent.style.gridTemplateColumns = '1fr';
//   } else {
//     camContent.style.gridTemplateColumns = '1fr 300px';
//   }
// });

// Service Worker pour les notifications (optionnel)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(registration => {
      console.log('Service Worker enregistré avec succès:', registration);
    })
    .catch(error => {
      console.log('Échec de l\\' + 'enregistrement du Service Worker:', error);
    });
}
