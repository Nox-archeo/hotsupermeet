// Système Cam-to-Cam HotMeet - WebRTC en temps réel avec vrais partenaires

class CamToCamSystem {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.dataChannel = null;
    this.isConnected = false;
    this.isPaused = false;
    this.currentPartner = null;
    this.socket = null;
    this.connectionId = null;
    this.userId = null;

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

    // Afficher l'interface de recherche
    this.showSearchSection();
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

    this.socket.on('error', data => {
      this.showError(data.message);
    });

    this.socket.on('left-queue', data => {
      console.log(data.message);
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
    // Mettre à jour la langue de traduction en temps réel (sans message chat)
    // Pas de message système dans le chat pour les changements de langue
  }

  updateAnonymityMode(mode) {
    // Appliquer le nouveau mode d'anonymat en temps réel (sans message chat)
    this.applyAnonymityMask(mode);
    // Pas de message système dans le chat pour les changements d'anonymat
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

  startPartnerSearch() {
    console.log('🔍 Début de la recherche de partenaire...');

    // Récupérer les critères de recherche
    const country = document.getElementById('country').value;
    const gender = document.getElementById('gender').value;
    const anonymity = document.getElementById('anonymity').value;
    const language = document.getElementById('language').value;
    const ageMin = document.getElementById('ageMin').value;
    const ageMax = document.getElementById('ageMax').value;

    // Récupérer l'ID utilisateur (simulation pour la démo)
    this.userId = 'demo-user-id-' + Date.now();

    const searchCriteria = {
      country: country,
      gender: gender,
      anonymity: anonymity,
      language: language,
      ageMin: parseInt(ageMin) || 18,
      ageMax: parseInt(ageMax) || 100,
    };

    console.log('🎯 Critères de recherche:', searchCriteria);

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

    // Afficher le statut de recherche
    document.getElementById('searchSection').classList.add('hidden');
    document.getElementById('searchStatus').classList.remove('hidden');
  }

  handlePartnerFound(data) {
    console.log('🎉 Partenaire trouvé - données reçues:', data);

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

    // Afficher l'interface cam-to-cam
    document.getElementById('searchStatus').classList.add('hidden');
    document.getElementById('camInterface').classList.remove('hidden');

    // Afficher les informations du partenaire réel
    this.displayPartnerInfo();

    // Initialiser la connexion WebRTC
    this.initiateWebRTCConnection();

    this.isConnected = true;

    // Vider le chat avant de commencer une nouvelle session
    this.clearChat();

    // Message de bienvenue
    this.addChatMessage(
      'system',
      'Connecté à ' +
        this.currentPartner.nom +
        ' (' +
        this.currentPartner.age +
        ' ans)'
    );
  }

  emitJoinCamQueue(searchCriteria) {
    console.log('📡 Émission join-cam-queue avec critères:', searchCriteria);

    this.socket.emit(
      'join-cam-queue',
      {
        userId: this.userId,
        criteria: searchCriteria,
      },
      response => {
        if (response && response.error) {
          console.error('❌ Erreur du serveur:', response.error);
          this.showError('Erreur lors de la recherche: ' + response.error);
        } else {
          console.log('✅ Requête join-cam-queue envoyée avec succès');
        }
      }
    );
  }

  handleWaitingForPartner(data) {
    console.log('⏳ En attente de partenaire:', data);

    // Mettre à jour le statut de recherche
    const statusElement = document.getElementById('searchStatus');
    statusElement.innerHTML = `
      <div class="searching-animation">
        <div class="spinner"></div>
        <p>${data.message}</p>
        <p>Position dans la file: ${data.queuePosition}</p>
      </div>
    `;
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

      // Gérer la négociation nécessaire
      this.peerConnection.onnegotiationneeded = async () => {
        console.log('🔁 Négociation WebRTC nécessaire');
        try {
          const offer = await this.peerConnection.createOffer();
          await this.peerConnection.setLocalDescription(offer);

          this.socket.emit('webrtc-signal', {
            connectionId: this.connectionId,
            signal: offer,
            targetSocketId: this.getPartnerSocketId(),
          });
          console.log('📤 Offre de négociation envoyée');
        } catch (error) {
          console.error('❌ Erreur lors de la négociation:', error);
        }
      };

      // Créer l'offre initiale
      console.log('📝 Création de l\\' + 'offre WebRTC initiale...');
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      console.log('✅ Offre créée et description locale définie');

      // Envoyer l'offre au partenaire
      this.socket.emit('webrtc-signal', {
        connectionId: this.connectionId,
        signal: offer,
        targetSocketId: this.getPartnerSocketId(),
      });
      console.log('📤 Offre initiale envoyée au partenaire');
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

      // Rejoindre à nouveau la file d'attente
      this.startPartnerSearch();
    }
  }

  nextPartner() {
    // Terminer la connexion actuelle
    this.endCall();

    // Recommencer la recherche
    setTimeout(() => {
      this.startPartnerSearch();
    }, 1000);
  }

  endCall() {
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
    this.currentPartner = null;
    this.connectionId = null;

    // Vider le chat
    this.clearChat();

    // Quitter la file d'attente
    this.socket.emit('leave-cam-queue');

    // Revenir à l'interface de recherche
    document.getElementById('camInterface').classList.add('hidden');
    document.getElementById('searchSection').classList.remove('hidden');
  }

  sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();

    if (message) {
      // Ajouter uniquement le message de l'utilisateur (pas de réponse automatique)
      this.addChatMessage('self', message);

      // Vider le champ de saisie
      chatInput.value = '';
    }
  }

  addChatMessage(sender, message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');

    messageDiv.className = `message ${sender}`;

    // Ajouter une icône de langue si c'est un message de partenaire
    if (sender === 'other' && this.currentPartner) {
      const languageFlag = this.getLanguageFlag(this.currentPartner.language);
      messageDiv.innerHTML = `<span style="margin-right: 5px;">${languageFlag}</span> ${message}`;
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

  displayPartnerInfo() {
    const partnerInfo = document.createElement('div');
    partnerInfo.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 0.5rem;
      border-radius: 5px;
      font-size: 0.8rem;
      z-index: 10;
    `;

    const countryFlag = this.getCountryFlag(this.currentPartner.country);
    const genderIcon = this.getGenderIcon(this.currentPartner.gender);

    partnerInfo.innerHTML = `
      ${countryFlag} ${genderIcon} ${this.currentPartner.nom} (${this.currentPartner.age} ans)
    `;

    // Nettoyer l'ancienne info
    const oldInfo = document.querySelector('.partner-info');
    if (oldInfo) {
      oldInfo.remove();
    }

    partnerInfo.className = 'partner-info';
    document
      .querySelector('.video-wrapper:last-child')
      .appendChild(partnerInfo);
  }

  getCountryFlag(countryCode) {
    const flags = {
      fr: '🇫🇷',
      ch: '🇨🇭',
      be: '🇧🇪',
      ca: '🇨🇦',
      us: '🇺🇸',
      gb: '🇬🇧',
      de: '🇩🇪',
      it: '🇮🇹',
      es: '🇪🇸',
      pt: '🇵🇹',
      nl: '🇳🇱',
      se: '🇸🇪',
      no: '🇳🇴',
      dk: '🇩🇰',
      fi: '🇫🇮',
      au: '🇦🇺',
      nz: '🇳🇿',
      jp: '🇯🇵',
      kr: '🇰🇷',
      cn: '🇨🇳',
      br: '🇧🇷',
      mx: '🇲🇽',
      ar: '🇦🇷',
    };
    return flags[countryCode] || '🌍';
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

  showSearchSection() {
    // Vérifier d'abord le statut premium
    if (!this.checkPremiumStatus()) {
      return;
    }

    // Vérifier si les autorisations sont déjà accordées
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(stream => {
        // Autorisations déjà accordées
        this.localStream = stream;
        const localVideo = document.getElementById('localVideo');
        localVideo.srcObject = stream;

        document.getElementById('permissionRequest').classList.add('hidden');
        document.getElementById('searchSection').classList.remove('hidden');
      })
      .catch(() => {
        // Autorisations non accordées
        document.getElementById('permissionRequest').classList.remove('hidden');
      });
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
