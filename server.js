const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload');
const { createServer } = require('http');
const { Server } = require('socket.io');
const https = require('https');

// Charger les variables d'environnement
require('dotenv').config();

// 🌍 SERVICE DE TRADUCTION avec MyMemory API
async function translateMessage(text, fromLang, toLang) {
  if (fromLang === toLang) return text;
  if (!text || !text.trim()) return text;

  return new Promise(resolve => {
    try {
      console.log(`🔄 Traduction: "${text}" (${fromLang} → ${toLang})`);

      // Encoder le texte pour l'URL
      const encodedText = encodeURIComponent(text);
      const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${fromLang}|${toLang}`;

      const request = https.get(
        url,
        {
          headers: {
            'User-Agent': 'HotMeet-Translation-Service',
          },
          timeout: 5000,
        },
        response => {
          let data = '';

          response.on('data', chunk => {
            data += chunk;
          });

          response.on('end', () => {
            try {
              const result = JSON.parse(data);

              if (
                result.responseStatus === 200 &&
                result.responseData &&
                result.responseData.translatedText
              ) {
                const translatedText = result.responseData.translatedText;
                console.log(`✅ Traduction réussie: "${translatedText}"`);
                resolve(translatedText);
              } else {
                console.log('⚠️ MyMemory ne peut pas traduire ce message');
                resolve(text); // Retourner le texte original
              }
            } catch (error) {
              console.log(`🚫 Erreur parsing JSON: ${error.message}`);
              resolve(text);
            }
          });
        }
      );

      request.on('error', error => {
        console.log(`🚫 Erreur requête: ${error.message}`);
        resolve(text);
      });

      request.on('timeout', () => {
        console.log('🚫 Timeout de traduction');
        request.destroy();
        resolve(text);
      });
    } catch (error) {
      console.log(`🚫 Erreur traduction: ${error.message}`);
      resolve(text);
    }
  });
}
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 10000;
const CLIENT_URL =
  process.env.CLIENT_URL || 'https://hotsupermeet.onrender.com';

const io = new Server(server, {
  cors: {
    origin: ['https://hotsupermeet.com', 'https://hotsupermeet.onrender.com'],
    methods: ['GET', 'POST'],
  },
});

// Configuration du proxy pour Infomaniak
app.set('trust proxy', 1);

// TIMESTAMP POUR FORCER RESTART COMPLET RENDER - CORRECTION CSP FINALE + FONCTION COMPLETE
console.log(
  '🚀 SERVEUR REDÉMARRÉ COMPLÈTEMENT AVEC CSP ET FONCTION COMPLÈTE + FIX CAM:',
  new Date().toISOString()
);

// Middleware de sécurité avec CSP personnalisée pour Cloudinary
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Autoriser scripts inline
        'script-src-attr': ["'unsafe-inline'"], // Autoriser onclick inline
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: [
          "'self'",
          'data:',
          'https://res.cloudinary.com', // Autoriser images Cloudinary
          'https://*.cloudinary.com', // Toutes les sous-domaines Cloudinary
        ],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
});
app.use(limiter);

// Middleware CORS
app.use(
  cors({
    origin: ['https://hotsupermeet.com', 'https://hotsupermeet.onrender.com'],
    credentials: true,
  })
);

// Middleware pour parser le JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware pour l'upload de fichiers - CORRECTION POUR RENDER
app.use(
  fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    createParentPath: true,
    useTempFiles: true, // Activer les fichiers temporaires pour éviter "Unexpected end of form"
    tempFileDir: '/tmp/', // Utiliser le dossier tmp de Render
    abortOnLimit: true,
    parseNested: false, // Désactiver le parsing nested pour éviter les erreurs
    debug: false, // Désactiver le debug en production
  })
);

// Servir les fichiers statiques
app.use(express.static('public'));

// Servir les fichiers uploads
app.use('/uploads', express.static(process.env.UPLOAD_PATH || './uploads'));

// Connexion à MongoDB Atlas avec gestion d'erreur avancée pour Render
const connectToDatabase = async () => {
  console.log('🔍 Tentative de connexion MongoDB Atlas...');

  // Vérifier si l'URI MongoDB est valide
  if (
    !process.env.MONGODB_URI ||
    process.env.MONGODB_URI.includes('votre_utilisateur')
  ) {
    console.log('🚀 Mode démo activé - MongoDB désactivé (URI non valide)');
    return false;
  }

  try {
    console.log(
      '🔍 Connexion à MongoDB Atlas avec URI:',
      process.env.MONGODB_URI.substring(0, 50) + '...'
    );

    // Tentative 1: Connexion directe avec IPv4 forcé
    const mongooseOptions1 = {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
      // Forcer IPv4 pour éviter les problèmes de réseau
      family: 4,
    };

    console.log('🔧 Tentative 1: Connexion directe avec IPv4 forcé...');
    await mongoose.connect(process.env.MONGODB_URI, mongooseOptions1);
    console.log('✅ MongoDB Atlas connecté avec succès sur Render');
    return true;
  } catch (error) {
    console.error(
      '❌ Erreur de connexion MongoDB Atlas (tentative 1):',
      error.message
    );

    // Tentative 2: Conversion SRV vers URI standard
    try {
      console.log('🔧 Tentative 2: Conversion SRV vers URI standard...');
      let mongoUri = process.env.MONGODB_URI;

      if (mongoUri.startsWith('mongodb+srv://')) {
        mongoUri = mongoUri.replace('mongodb+srv://', 'mongodb://');
        mongoUri = mongoUri.replace('.mongodb.net/', '.mongodb.net:27017/');
        if (mongoUri.includes('?')) {
          mongoUri += '&directConnection=true&family=4';
        } else {
          mongoUri += '?directConnection=true&family=4';
        }
      }

      console.log('🔧 URI convertie:', mongoUri.substring(0, 60) + '...');

      const mongooseOptions2 = {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        w: 'majority',
        family: 4,
      };

      await mongoose.connect(mongoUri, mongooseOptions2);
      console.log('✅ MongoDB Atlas connecté avec méthode alternative');
      return true;
    } catch (secondError) {
      console.error(
        '❌ Échec de la connexion alternative:',
        secondError.message
      );

      // Tentative 3: Utiliser une connexion simplifiée sans options
      try {
        console.log('🔧 Tentative 3: Connexion simplifiée...');
        await mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 5000,
        });
        console.log('✅ MongoDB Atlas connecté avec méthode simplifiée');
        return true;
      } catch (thirdError) {
        console.error(
          '❌ Échec de la connexion simplifiée:',
          thirdError.message
        );
        console.log('🚀 Mode démo activé - MongoDB désactivé');
        return false;
      }
    }
  }
};

// Routes de base qui doivent répondre immédiatement (avant MongoDB)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/pages/index.html');
});

// Health check pour Render
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database:
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
  };
  res.status(200).json(healthStatus);
});

// Route de démonstration pour l'API
app.get('/api/demo', (req, res) => {
  res.json({
    message: 'Mode démo activé - Le site fonctionne sans base de données',
    status: 'online',
    pages: ['/', '/directory', '/messages', '/auth'],
  });
});

// Route pour les autres pages
app.get('/:page', (req, res) => {
  const page = req.params.page;
  const validPages = [
    'auth',
    'profile',
    'profile-view',
    'directory',
    'messages',
    'ads',
    'tonight',
    'cam',
    'premium',
    'legal',
    'test-hero',
  ];

  if (validPages.includes(page)) {
    // CSP FIX: Utiliser profile-clean.html avec JavaScript externe pour éviter CSP
    if (page === 'profile') {
      console.log(
        '🎯 CSP FIX: Serving profile-clean.html avec JavaScript externe'
      );
      res.sendFile(__dirname + '/public/pages/profile-clean.html');
    } else {
      res.sendFile(__dirname + `/public/pages/${page}.html`);
    }
  } else {
    res.status(404).sendFile(__dirname + '/public/pages/404.html');
  }
});

// =================== ROUTE SPÉCIFIQUE POUR MESSAGES D'ANNONCES ===================
// CRITIQUE: Cette route DOIT être définie AVANT app.use('/api/ads', ...) sinon conflit !
app.get('/api/ads/responses', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token manquant' },
      });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const AdMessage = require('./server/models/AdMessage');
    const Ad = require('./server/models/Ad');

    // LOGIQUE BIDIRECTIONNELLE: Récupérer TOUS les messages où l'utilisateur participe
    const adMessages = await AdMessage.find({
      $or: [
        { senderId: userId }, // Messages envoyés par l'utilisateur
        { receiverId: userId }, // Messages reçus par l'utilisateur
      ],
    })
      .populate('senderId', 'profile')
      .populate('receiverId', 'profile')
      .populate('adId', 'title')
      .sort({ timestamp: -1 })
      .limit(100);

    console.log(
      '🚀 DEBUG BIDIRECTIONNEL - Messages trouvés:',
      adMessages.length
    );

    // Grouper les messages par conversation
    const conversations = {};
    for (const message of adMessages) {
      // VÉRIFIER que l'annonce existe encore (populate peut retourner null si annonce supprimée)
      if (!message.adId || !message.senderId || !message.receiverId) {
        console.log('⚠️ Message avec référence manquante ignoré:', message._id);
        continue; // Skip ce message
      }

      // Utiliser le conversationId existant pour grouper
      const conversationKey = message.conversationId;

      // Identifier l'autre utilisateur (celui avec qui on converse)
      let otherUser;
      if (message.senderId._id.toString() === userId.toString()) {
        // L'utilisateur actuel a envoyé ce message, l'autre user est le receiver
        otherUser = message.receiverId;
      } else {
        // L'utilisateur actuel a reçu ce message, l'autre user est le sender
        otherUser = message.senderId;
      }

      if (!conversations[conversationKey]) {
        conversations[conversationKey] = {
          id: conversationKey,
          adId: message.adId._id,
          adTitle: message.adId.title,
          adTitle: message.adId.title,
          senderId: otherUser._id,
          senderName: otherUser.profile?.nom,
          senderPhoto:
            otherUser.profile?.photos?.find(p => p.isProfile)?.url ||
            otherUser.profile?.photos?.[0]?.url ||
            null,
          otherUserId: otherUser._id,
          lastMessage: message.message,
          timestamp: message.timestamp,
          unreadCount: 0,
        };
      }

      // Mettre à jour le dernier message si plus récent
      if (
        new Date(message.timestamp) >
        new Date(conversations[conversationKey].timestamp)
      ) {
        conversations[conversationKey].lastMessage = message.message;
        conversations[conversationKey].timestamp = message.timestamp;
      }

      // Compter les messages non lus (seulement ceux reçus par l'utilisateur actuel)
      if (
        !message.isRead &&
        message.receiverId._id.toString() === userId.toString()
      ) {
        conversations[conversationKey].unreadCount++;
      }
    }

    // Convertir en array et trier par timestamp
    const responses = Object.values(conversations).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.json({
      success: true,
      responses: responses,
    });
  } catch (error) {
    console.error('Erreur récupération réponses aux annonces:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur' },
    });
  }
});

// Charger les routes API (elles gèrent elles-mêmes les erreurs MongoDB)
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/users', require('./server/routes/users'));
app.use('/api/ads', require('./server/routes/ads')); // ← ROUTE ADS AVEC CONTROLLER !
app.use('/api/messages', require('./server/routes/messages'));
app.use('/api/payments', require('./server/routes/payments'));
app.use('/api/tonight', require('./server/routes/tonight'));
app.use('/api/uploads', require('./server/routes/uploads'));
app.use('/api/subscriptions', require('./server/routes/subscriptions'));

// Initialiser Socket.io dans les contrôleurs
const messageController = require('./server/controllers/messageController');
messageController.setSocketIO(io);

// ROUTE MES ANNONCES - REMISE URGENTE !
app.get('/api/my-ads', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken'); // ← FIX JWT MANQUANT !
    const Ad = require('./server/models/Ad'); // ← FIX AD MANQUANT !

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res
        .status(401)
        .json({ success: false, error: { message: 'Token requis' } });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId; // ← FIX: userId pas id !

    const myAds = await Ad.find({
      userId: userId,
      status: { $ne: 'deleted' }, // ← EXCLURE LES SUPPRIMÉES
    }).sort({ createdAt: -1 }); // ← FIX: userId pas user !

    res.json({
      success: true,
      data: myAds,
    });
  } catch (error) {
    console.error('❌ ERREUR récupération mes annonces:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur lors de la récupération' },
    });
  }
});

// ROUTE SUPPRESSION ANNONCE - REMISE URGENTE !
app.delete('/api/ads/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res
        .status(401)
        .json({ success: false, error: { message: 'Token requis' } });
    }

    const jwt = require('jsonwebtoken'); // ← FIX: JWT manquant !
    const Ad = require('./server/models/Ad'); // ← FIX: Ad manquant !

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId; // ← FIX: userId pas id !

    const ad = await Ad.findOne({ _id: req.params.id, userId: userId }); // ← FIX: userId pas user !
    if (!ad) {
      return res
        .status(404)
        .json({ success: false, error: { message: 'Annonce non trouvée' } });
    }

    await Ad.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Annonce supprimée avec succès',
    });
  } catch (error) {
    console.error('❌ ERREUR suppression annonce:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur lors de la suppression' },
    });
  }
});

// ROUTES CHAT D'ANNONCES - SYSTÈME INDÉPENDANT 🔥
console.log("🚀 CRÉATION ROUTES CHAT D'ANNONCES...");

// Envoyer un message pour une annonce
app.post('/api/ads/:adId/messages', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, error: { message: 'Token manquant' } });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const senderId = decoded.userId;

    const { adId } = req.params;
    const { message, receiverId } = req.body;

    if (!message || !receiverId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Message et receiverId requis' },
      });
    }

    const AdMessage = require('./server/models/AdMessage');
    const User = require('./server/models/User');
    const Ad = require('./server/models/Ad');

    // Vérifier que l'annonce existe
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({
        success: false,
        error: { message: 'Annonce non trouvée' },
      });
    }

    // Créer l'ID de conversation unique
    const conversationId = `ad-${adId}-${Math.min(senderId, receiverId)}-${Math.max(senderId, receiverId)}`;

    // Créer le message
    const newMessage = new AdMessage({
      adId,
      senderId,
      receiverId,
      message,
      conversationId,
    });

    await newMessage.save();

    // Peupler les informations de l'expéditeur
    await newMessage.populate('senderId', 'nom photo');

    console.log("✅ Message d'annonce envoyé:", newMessage._id);

    res.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error('❌ Erreur envoi message annonce:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur: ' + error.message },
    });
  }
});

// Récupérer les messages d'une conversation d'annonce
app.get('/api/ads/:adId/messages', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, error: { message: 'Token manquant' } });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { adId } = req.params;
    const { otherUserId } = req.query;

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        error: { message: 'otherUserId requis' },
      });
    }

    const AdMessage = require('./server/models/AdMessage');

    // Créer l'ID de conversation
    const conversationId = `ad-${adId}-${Math.min(userId, otherUserId)}-${Math.max(userId, otherUserId)}`;

    // Récupérer les messages
    const messages = await AdMessage.find({ conversationId })
      .populate('senderId', 'nom profile')
      .populate('receiverId', 'nom profile')
      .sort({ timestamp: 1 })
      .limit(50);

    // Transformer les messages avec isOwn et photo correcte
    const transformedMessages = messages.map(msg => ({
      _id: msg._id,
      content: msg.message,
      createdAt: msg.timestamp,
      isOwn: msg.senderId._id.toString() === userId,
      senderId: {
        _id: msg.senderId._id,
        nom: msg.senderId.nom,
        photo:
          msg.senderId.profile?.photos?.find(p => p.isProfile)?.url ||
          msg.senderId.profile?.photos?.[0]?.url ||
          null,
      },
      receiverId: {
        _id: msg.receiverId._id,
        nom: msg.receiverId.nom,
        photo:
          msg.receiverId.profile?.photos?.find(p => p.isProfile)?.url ||
          msg.receiverId.profile?.photos?.[0]?.url ||
          null,
      },
    }));

    // Marquer les messages comme lus
    await AdMessage.updateMany(
      { conversationId, receiverId: userId, isRead: false },
      { isRead: true }
    );

    console.log(`✅ Messages récupérés pour annonce ${adId}:`, messages.length);

    res.json({
      success: true,
      messages: transformedMessages,
    });
  } catch (error) {
    console.error('❌ Erreur récupération messages annonce:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur: ' + error.message },
    });
  }
});

console.log("✅ ROUTES CHAT D'ANNONCES CRÉÉES");

// =================== ROUTES SUPPRESSION CONVERSATIONS ===================
console.log('🗑️ CRÉATION ROUTES SUPPRESSION...');

// Supprimer conversation chat d'annonce (suppression RÉELLE MongoDB)
app.delete('/api/ads/conversations/:conversationId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token manquant' },
      });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { conversationId } = req.params;
    const AdMessage = require('./server/models/AdMessage');

    console.log(`🗑️ TENTATIVE SUPPRESSION conversation annonce:`, {
      conversationId,
      userId,
    });

    // Vérifier que l'utilisateur fait partie de cette conversation
    let userMessages = await AdMessage.find({
      conversationId: conversationId,
      $or: [{ senderId: userId }, { receiverId: userId }],
    });

    console.log(
      `🔍 Messages trouvés par conversationId exact: ${userMessages.length}`
    );

    // MÉTHODE 2: Si pas de résultat et conversationId contient "ad-", extraire l'adId
    if (userMessages.length === 0 && conversationId.startsWith('ad-')) {
      const parts = conversationId.split('-');
      if (parts.length >= 2) {
        const adId = parts[1];
        console.log(`🔍 Extraction adId: ${adId}, recherche par adId + userId`);

        // Chercher tous les messages de cette annonce où l'utilisateur participe
        userMessages = await AdMessage.find({
          adId: adId,
          $or: [{ senderId: userId }, { receiverId: userId }],
        });

        console.log(`🔍 Messages trouvés par adId: ${userMessages.length}`);
      }
    }

    if (userMessages.length === 0) {
      // Lister toutes les conversations de l'utilisateur pour debug
      const userConversations = await AdMessage.find({
        $or: [{ senderId: userId }, { receiverId: userId }],
      }).distinct('conversationId');

      console.log(
        `❌ Conversations disponibles pour ${userId}:`,
        userConversations
      );

      return res.status(403).json({
        success: false,
        error: {
          message: `Conversation ${conversationId} non trouvée ou accès refusé`,
        },
      });
    }

    // SUPPRESSION RÉELLE - utiliser les critères qui ont fonctionné
    let deleteResult;
    if (conversationId.startsWith('ad-') && conversationId.includes('NaN')) {
      // Si conversationId cassé, supprimer par adId + userId
      const parts = conversationId.split('-');
      const adId = parts[1];
      deleteResult = await AdMessage.deleteMany({
        adId: adId,
        $or: [{ senderId: userId }, { receiverId: userId }],
      });
      console.log(
        `🗑️ SUPPRESSION PAR ADID: ${deleteResult.deletedCount} messages`
      );
    } else {
      // Suppression normale par conversationId
      deleteResult = await AdMessage.deleteMany({
        conversationId: conversationId,
      });
      console.log(
        `🗑️ SUPPRESSION PAR CONVERSATION: ${deleteResult.deletedCount} messages`
      );
    }

    console.log(
      `🗑️ Suppression conversation ${conversationId}: ${deleteResult.deletedCount} messages supprimés`
    );

    res.json({
      success: true,
      message: `Conversation supprimée définitivement (${deleteResult.deletedCount} messages)`,
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error) {
    console.error('❌ Erreur suppression conversation annonce:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur: ' + error.message },
    });
  }
});

// Supprimer conversation classique (suppression RÉELLE MongoDB)
app.delete('/api/messages/conversations/:conversationId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token manquant' },
      });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { conversationId } = req.params;
    const Message = require('./server/models/Message');

    console.log(`🗑️ TENTATIVE SUPPRESSION conversation classique:`, {
      conversationId,
      userId,
    });

    // Pour les conversations classiques, conversationId est l'ID de l'autre utilisateur
    const otherUserId = conversationId;

    // Vérifier que l'utilisateur fait partie de cette conversation
    const userMessage = await Message.findOne({
      $or: [
        { from: userId, to: otherUserId }, // userId a envoyé à otherUserId
        { from: otherUserId, to: userId }, // otherUserId a envoyé à userId
      ],
    });

    console.log(
      `🔍 Message trouvé pour vérification:`,
      userMessage ? 'OUI' : 'NON'
    );

    if (!userMessage) {
      // Lister toutes les conversations de l'utilisateur pour debug
      const userMessages = await Message.find({
        $or: [{ from: userId }, { to: userId }],
      }).limit(10);

      console.log(
        `❌ Messages disponibles pour ${userId}:`,
        userMessages.length
      );

      return res.status(403).json({
        success: false,
        error: {
          message: `Conversation avec ${otherUserId} non trouvée ou accès refusé`,
        },
      });
    }

    // SUPPRESSION RÉELLE de tous les messages entre ces 2 utilisateurs
    const deleteResult = await Message.deleteMany({
      $or: [
        { from: userId, to: otherUserId },
        { from: otherUserId, to: userId },
      ],
    });

    console.log(
      `🗑️ Suppression conversation classique ${userId}<->${conversationId}: ${deleteResult.deletedCount} messages supprimés`
    );

    res.json({
      success: true,
      message: `Conversation supprimée définitivement (${deleteResult.deletedCount} messages)`,
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error) {
    console.error('❌ Erreur suppression conversation classique:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur: ' + error.message },
    });
  }
});

console.log('✅ ROUTES SUPPRESSION CRÉÉES');

// =================== ROUTES SUPPRESSION BRUTALES V2 ===================
console.log('🔥 CRÉATION ROUTES SUPPRESSION BRUTALES...');

// SUPPRESSION BRUTALE CONVERSATIONS D'ANNONCES
app.delete(
  '/api/ads/conversations/brutal/:conversationId',
  async (req, res) => {
    try {
      console.log('🚨 ROUTE BRUTAL ANNONCES APPELÉE !!!');
      console.log('🚨 Headers:', req.headers);
      console.log('🚨 Params:', req.params);

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.log('🚨 ERREUR: Token manquant');
        return res
          .status(401)
          .json({ success: false, error: { message: 'Token manquant' } });
      }

      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      const { conversationId } = req.params;
      const AdMessage = require('./server/models/AdMessage');
      const mongoose = require('mongoose');

      console.log(
        `🔥 SUPPRESSION BRUTALE ANNONCE: ${conversationId} par ${userId}`
      );
      let totalDeleted = 0;

      // Convertir les IDs en ObjectId pour MongoDB
      const userObjectId = mongoose.Types.ObjectId(userId);
      let otherUserObjectId = null;
      if (conversationId.match(/^[0-9a-fA-F]{24}$/)) {
        otherUserObjectId = mongoose.Types.ObjectId(conversationId);
      }

      // Méthode 1: Par conversationId exact
      const delete1 = await AdMessage.deleteMany({ conversationId });
      totalDeleted += delete1.deletedCount;
      console.log(`🔥 Méthode 1: ${delete1.deletedCount} messages`);

      // Méthode 2: Si c'est un ID d'annonce "ad-xxxxx-..."
      if (conversationId.startsWith('ad-')) {
        const adId = conversationId.split('-')[1];
        if (adId && adId.match(/^[0-9a-fA-F]{24}$/)) {
          const adObjectId = mongoose.Types.ObjectId(adId);
          const delete2 = await AdMessage.deleteMany({
            adId: adObjectId,
            $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
          });
          totalDeleted += delete2.deletedCount;
          console.log(`🔥 Méthode 2 (adId): ${delete2.deletedCount} messages`);
        }
      }

      // Méthode 3: Si c'est un userId MongoDB
      if (otherUserObjectId) {
        const delete3 = await AdMessage.deleteMany({
          $or: [
            { senderId: userObjectId, receiverId: otherUserObjectId },
            { senderId: otherUserObjectId, receiverId: userObjectId },
          ],
        });
        totalDeleted += delete3.deletedCount;
        console.log(`🔥 Méthode 3 (userId): ${delete3.deletedCount} messages`);
      }

      console.log(`🔥 TOTAL DÉTRUIT: ${totalDeleted} messages`);

      res.json({
        success: true,
        message: `CONVERSATION DÉTRUITE! ${totalDeleted} messages supprimés`,
        deletedCount: totalDeleted,
      });
    } catch (error) {
      console.error('💀 ERREUR SUPPRESSION BRUTALE:', error);
      res
        .status(500)
        .json({ success: false, error: { message: error.message } });
    }
  }
);

// SUPPRESSION BRUTALE CONVERSATIONS CLASSIQUES
app.delete(
  '/api/messages/conversations/brutal/:conversationId',
  async (req, res) => {
    try {
      console.log('🚨 ROUTE BRUTAL CLASSIQUE APPELÉE !!!');
      console.log('🚨 Headers:', req.headers);
      console.log('🚨 Params:', req.params);

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.log('🚨 ERREUR: Token manquant');
        return res
          .status(401)
          .json({ success: false, error: { message: 'Token manquant' } });
      }

      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      const { conversationId } = req.params;
      const Message = require('./server/models/Message');
      const mongoose = require('mongoose');

      console.log(
        `🔥 SUPPRESSION BRUTALE CLASSIQUE: ${conversationId} par ${userId}`
      );

      // Convertir les IDs en ObjectId pour MongoDB
      const userObjectId = mongoose.Types.ObjectId(userId);
      const otherUserObjectId = mongoose.Types.ObjectId(conversationId);

      // Suppression directe entre deux utilisateurs (CHAMPS CORRIGÉS + ObjectId)
      const deleteResult = await Message.deleteMany({
        $or: [
          { fromUserId: userObjectId, toUserId: otherUserObjectId },
          { fromUserId: otherUserObjectId, toUserId: userObjectId },
        ],
      });

      console.log(`🔥 TOTAL DÉTRUIT: ${deleteResult.deletedCount} messages`);

      res.json({
        success: true,
        message: `CONVERSATION DÉTRUITE! ${deleteResult.deletedCount} messages supprimés`,
        deletedCount: deleteResult.deletedCount,
      });
    } catch (error) {
      console.error('💀 ERREUR SUPPRESSION BRUTALE:', error);
      res
        .status(500)
        .json({ success: false, error: { message: error.message } });
    }
  }
);

console.log('🔥 ROUTES BRUTALES CRÉÉES');

// ROUTE DELETE POUR SUPPRIMER UNE ANNONCE
app.delete('/api/ads/:adId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, error: { message: 'Token manquant' } });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const Ad = require('./server/models/Ad');
    const ad = await Ad.findOne({ _id: req.params.adId, userId: userId });

    if (!ad) {
      return res
        .status(404)
        .json({ success: false, error: { message: 'Annonce non trouvée' } });
    }

    ad.status = 'deleted';
    await ad.save();

    // 🗑️ VRAIE SUPPRESSION - Supprimer complètement de MongoDB
    await Ad.findByIdAndDelete(req.params.adId);

    console.log('✅ ANNONCE VRAIMENT SUPPRIMÉE DE MONGODB:', req.params.adId);
    res.json({ success: true, message: 'Annonce supprimée avec succès' });
  } catch (error) {
    console.error('❌ ERREUR suppression annonce:', error);
    res
      .status(500)
      .json({ success: false, error: { message: 'Erreur: ' + error.message } });
  }
});

// ROUTE PUT POUR RENOUVELER UNE ANNONCE
app.put('/api/ads/:adId/renew', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, error: { message: 'Token manquant' } });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const Ad = require('./server/models/Ad');
    const ad = await Ad.findOne({ _id: req.params.adId, userId: userId });

    if (!ad) {
      return res
        .status(404)
        .json({ success: false, error: { message: 'Annonce non trouvée' } });
    }

    // Renouveler pour 30 jours supplémentaires
    ad.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    ad.status = 'active';
    await ad.save();

    console.log('✅ ANNONCE RENOUVELÉE:', req.params.adId);
    res.json({ success: true, message: 'Annonce renouvelée avec succès' });
  } catch (error) {
    console.error('❌ ERREUR renouvellement annonce:', error);
    res
      .status(500)
      .json({ success: false, error: { message: 'Erreur: ' + error.message } });
  }
});

console.log('✅ Routes DELETE et PUT ads ACTIVE');

// ROUTE GET POUR RÉCUPÉRER UNE ANNONCE PUBLIQUE (pour messagerie)
app.get('/api/ads/public/:adId', async (req, res) => {
  try {
    const Ad = require('./server/models/Ad');
    const ad = await Ad.findOne({
      _id: req.params.adId,
      status: 'active',
    }).populate('userId', 'nom photo profile'); // Récupérer nom, photo et profil

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: { message: 'Annonce non trouvée' },
      });
    }

    // Restructurer la réponse pour plus de clarté
    const adWithAuthor = {
      ...ad.toObject(),
      author: {
        _id: ad.userId._id,
        nom: ad.userId.nom,
        // Récupérer la photo de profil depuis l'array photos
        photo:
          ad.userId.profile?.photos?.find(p => p.isProfile)?.url ||
          ad.userId.profile?.photos?.[0]?.url ||
          null,
        profile: ad.userId.profile,
      },
    };
    delete adWithAuthor.userId; // Supprimer l'ancien champ

    res.json({ success: true, ad: adWithAuthor });
  } catch (error) {
    console.error('Erreur récupération annonce publique:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur' },
    });
  }
});

// ROUTE GET POUR RÉCUPÉRER UNE ANNONCE SPÉCIFIQUE (pour édition)
app.get('/api/ads/:adId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, error: { message: 'Token manquant' } });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const Ad = require('./server/models/Ad');
    const ad = await Ad.findOne({ _id: req.params.adId, userId: userId });

    if (!ad) {
      return res
        .status(404)
        .json({ success: false, error: { message: 'Annonce non trouvée' } });
    }

    res.json({ success: true, data: ad });
  } catch (error) {
    console.error('❌ ERREUR récupération annonce:', error);
    res
      .status(500)
      .json({ success: false, error: { message: 'Erreur: ' + error.message } });
  }
});

// ROUTE PUT POUR MODIFIER UNE ANNONCE
app.put('/api/ads/:adId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, error: { message: 'Token manquant' } });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const Ad = require('./server/models/Ad');
    const ad = await Ad.findOne({ _id: req.params.adId, userId: userId });

    if (!ad) {
      return res
        .status(404)
        .json({ success: false, error: { message: 'Annonce non trouvée' } });
    }

    // Mettre à jour les champs
    Object.assign(ad, req.body);
    ad.updatedAt = new Date();
    await ad.save();

    console.log('✅ ANNONCE MODIFIÉE:', req.params.adId);
    res.json({
      success: true,
      message: 'Annonce modifiée avec succès',
      data: ad,
    });
  } catch (error) {
    console.error('❌ ERREUR modification annonce:', error);
    res
      .status(500)
      .json({ success: false, error: { message: 'Erreur: ' + error.message } });
  }
});

// ROUTE GET POUR ÉDITION D'ANNONCE (redirection vers page ads avec ID)
app.get('/ads/edit/:adId', (req, res) => {
  res.redirect(`/ads?edit=${req.params.adId}`);
});

// ROUTE DIRECTE POUR ADS - BYPASS ROUTER MOUNTING (POUR TEST)
console.log('🚨 AJOUT ROUTE DIRECTE: /api/ads');
app.post('/api/ads-test', async (req, res) => {
  try {
    console.log('🚨 ROUTE ADS DIRECTE APPELÉE - SUCCESS !', req.body);

    // Simuler la création d'annonce pour test
    const adData = {
      id: Date.now(),
      ...req.body,
      createdAt: new Date(),
    };

    res.json({
      success: true,
      message: 'Annonce créée avec succès ! (route directe)',
      data: adData,
    });
  } catch (error) {
    console.error('❌ Erreur route directe ads:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur' },
    });
  }
});
console.log('✅ Route directe /api/ads ajoutée');

// Connexion MongoDB en arrière-plan (ne bloque pas le démarrage)
connectToDatabase().then(mongoConnected => {
  if (mongoConnected) {
    console.log('✅ MongoDB connecté - Fonctionnalités complètes activées');
  } else {
    console.log('🚀 Mode démo - Fonctionnalités de base uniquement');
  }
});

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('Erreur:', err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: 'Erreur interne du serveur',
      details: {},
    },
  });
});

// Route 404 pour les routes API inexistantes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route API non trouvée',
    },
  });
});

// Configuration Socket.IO pour le cam-to-cam
const waitingQueue = new Map();
const activeConnections = new Map(); // Track connexions actives: socketId -> connectionId
const connectionPairs = new Map(); // Track paires: connectionId -> {socket1, socket2}
const recentConnections = new Map(); // Blacklist temporaire: socketId -> Set(partenaires récents)
const connectionHistory = new Map(); // Historique: socketId -> [socketIds des anciens partenaires]

// Nouvelle Map pour les langues des utilisateurs connectés
const userLanguages = new Map(); // socket.id -> language

io.on('connection', socket => {
  console.log('Utilisateur connecté:', socket.id);

  // Rejoindre la file d'attente pour le cam-to-cam
  socket.on('join-cam-queue', async data => {
    console.log(
      '🎯 ÉVÉNEMENT join-cam-queue REÇU de',
      socket.id,
      'avec data:',
      data
    );

    // 🚨🚨🚨 LOG ULTRA VISIBLE POUR CONFIRMER QUE CA PASSE ICI 🚨🚨🚨
    console.log('🔥🔥🔥🔥🔥 JOIN-CAM-QUEUE APPELÉ SUR RENDER ! 🔥🔥🔥🔥🔥');
    console.log('⚡ TIMESTAMP:', new Date().toISOString());
    console.log('⚡ SOCKET ID:', socket.id);
    console.log('⚡ DATA REÇUE:', JSON.stringify(data, null, 2));

    try {
      const { userId, criteria } = data;

      // 🚨 VÉRIFICATION EXCLUSIVITÉ CHATROULETTE
      if (activeConnections.has(socket.id)) {
        console.log(
          `⚠️ ${socket.id} encore dans activeConnections, nettoyage forcé`
        );
        // 🔧 FORCE CLEANUP si stuck
        const oldConnectionId = activeConnections.get(socket.id);
        activeConnections.delete(socket.id);
        if (connectionPairs.has(oldConnectionId)) {
          connectionPairs.delete(oldConnectionId);
        }
        console.log(`🧹 Nettoyage forcé effectué pour ${socket.id}`);
      }

      // Vérifier si déjà en file d'attente
      if (waitingQueue.has(socket.id)) {
        console.log(`⚠️ ${socket.id} déjà en file d'attente`);
        return;
      }

      console.log(`✅ ${socket.id} va rejoindre la queue - DEBUT MATCHING`);

      // En mode démo, simuler un utilisateur valide avec le profil reçu
      const demoUser = {
        profile: {
          nom: 'Utilisateur Démo',
          age: 25,
          country: criteria.userProfile?.countryName || 'Inconnu',
          countryCode: criteria.userProfile?.country || 'unknown',
          gender: criteria.userProfile?.gender || 'unknown',
          language: criteria.language || 'fr',
        },
      };

      console.log('🌍 PROFIL UTILISATEUR CRÉÉ:', {
        country: demoUser.profile.country,
        countryCode: demoUser.profile.countryCode,
        source_countryName: criteria.userProfile?.countryName,
        source_country: criteria.userProfile?.country,
      });

      // Ajouter l'utilisateur à la file d'attente avec son profil complet
      waitingQueue.set(socket.id, {
        ...criteria,
        userId: userId.toString(),
        userData: demoUser.profile,
        userProfile: criteria.userProfile, // Profil utilisateur séparé pour matching
      });

      console.log(
        `🔍 Utilisateur ${socket.id} rejoint la file d'attente avec critères:`,
        criteria
      );
      console.log(
        `📊 File d'attente actuelle: ${waitingQueue.size} utilisateurs`
      );
      console.log(`📊 QUEUE CONTENU:`, Array.from(waitingQueue.keys()));

      // Rechercher un partenaire compatible avec critères de matching + blacklist
      let partnerSocketId = null;
      let bestMatchScore = 0;
      const myHistory = connectionHistory.get(socket.id) || [];
      console.log(`🚫 MA BLACKLIST ${socket.id}:`, myHistory);

      for (const [otherSocketId, otherData] of waitingQueue.entries()) {
        if (otherSocketId === socket.id) {
          continue;
        }

        // 🚨 EXCLUSION CONNEXIONS ACTIVES
        if (activeConnections.has(otherSocketId)) {
          console.log(
            `⚠️ ${otherSocketId} déjà connecté, exclusion du matching`
          );
          continue;
        }

        // 🚫 BLACKLIST: Éviter reconnexion immédiate aux mêmes partenaires
        if (myHistory.includes(otherSocketId)) {
          console.log(
            `🚫 ${otherSocketId} dans historique récent, skip pour rotation`
          );
          continue;
        }

        // Calculer un score de compatibilité basé sur les critères
        let matchScore = 0;

        // Critère pays (priorité élevée)
        if (
          criteria.country === otherData.country ||
          criteria.country === 'all' ||
          otherData.country === 'all'
        ) {
          matchScore += 30;
        }

        // Critère genre (priorité élevée) - vérifier que chacun cherche l'autre
        const myGenderSearch = criteria.gender || 'all'; // Genre que JE cherche
        const myGender = criteria.userProfile?.gender || 'unknown'; // MON genre
        const partnerGenderSearch = otherData.gender || 'all'; // Genre que le PARTENAIRE cherche
        const partnerGender = otherData.userProfile?.gender || 'unknown'; // Genre du PARTENAIRE

        // 🚨 LOGS ULTRA VISIBLES POUR DEBUG
        console.log('🚨🚨🚨 VERIFICATION GENRE BIDIRECTIONNELLE 🚨🚨🚨');
        console.log(
          `👤 MOI (${socket.id}): genre=${myGender}, cherche=${myGenderSearch}`
        );
        console.log(
          `👥 PARTENAIRE (${otherSocketId}): genre=${partnerGender}, cherche=${partnerGenderSearch}`
        );

        // Vérifier compatibilité bidirectionnelle AVEC LOGS DETAILLES
        const condition1 =
          myGenderSearch === 'all' || myGenderSearch === partnerGender;
        const condition2 =
          partnerGenderSearch === 'all' || partnerGenderSearch === myGender;
        const genderCompatible = condition1 && condition2;

        console.log(
          `✅ Je cherche ${myGenderSearch}, partenaire est ${partnerGender}: ${condition1}`
        );
        console.log(
          `✅ Partenaire cherche ${partnerGenderSearch}, je suis ${myGender}: ${condition2}`
        );
        console.log(`🎯 COMPATIBLE ? ${genderCompatible}`);

        if (genderCompatible) {
          matchScore += 30;
          console.log('🟢 GENRE COMPATIBLE - AJOUT 30 POINTS');
        } else {
          console.log('🔴 GENRE INCOMPATIBLE - SKIP CE PARTENAIRE');
          continue; // Passer au suivant si pas compatible
        }

        // Critère langue (priorité moyenne)
        if (
          criteria.language === otherData.language ||
          criteria.language === 'all' ||
          otherData.language === 'all'
        ) {
          matchScore += 20;
        }

        // Critère âge (priorité moyenne)
        const otherAge = otherData.ageMin || 25; // Valeur par défaut pour la démo
        const userAge = criteria.ageMin || 25;
        const ageDiff = Math.abs(otherAge - userAge);
        if (ageDiff <= 10) {
          matchScore += 20 - ageDiff; // Plus l'âge est proche, plus le score est élevé
        }

        // Si le score est meilleur que le précédent, mettre à jour le partenaire
        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          partnerSocketId = otherSocketId;
        }
      }

      // 🚨 FALLBACK INTELLIGENT avec respect du genre et de l'historique
      if (!partnerSocketId && waitingQueue.size > 1) {
        console.log(
          '🔍 Aucun match parfait, recherche fallback avec genre respecté...'
        );

        // D'abord essayer sans historique (éviter les reconnexions récentes)
        for (const [otherSocketId, otherData] of waitingQueue.entries()) {
          if (
            otherSocketId !== socket.id &&
            !activeConnections.has(otherSocketId) &&
            !myHistory.includes(otherSocketId)
          ) {
            // 🚨 VÉRIFICATION GENRE OBLIGATOIRE même en fallback
            const myGender = criteria.userProfile?.gender || 'unknown';
            const myGenderSearch = criteria.gender || 'all';
            const partnerGender = otherData.userProfile?.gender || 'unknown';
            const partnerGenderSearch = otherData.gender || 'all';

            const genderCompatible =
              (myGenderSearch === 'all' || myGenderSearch === partnerGender) &&
              (partnerGenderSearch === 'all' ||
                partnerGenderSearch === myGender);

            if (genderCompatible) {
              partnerSocketId = otherSocketId;
              console.log(
                '🟡 FALLBACK MATCH: Genre OK, évite historique, ignore autres critères'
              );
              break;
            }
          }
        }

        // Si toujours rien, accepter quelqu'un de l'historique MAIS toujours avec bon genre
        if (!partnerSocketId) {
          for (const [otherSocketId, otherData] of waitingQueue.entries()) {
            if (
              otherSocketId !== socket.id &&
              !activeConnections.has(otherSocketId)
            ) {
              // 🚨 VÉRIFICATION GENRE OBLIGATOIRE même avec historique
              const myGender = criteria.userProfile?.gender || 'unknown';
              const myGenderSearch = criteria.gender || 'all';
              const partnerGender = otherData.userProfile?.gender || 'unknown';
              const partnerGenderSearch = otherData.gender || 'all';

              const genderCompatible =
                (myGenderSearch === 'all' ||
                  myGenderSearch === partnerGender) &&
                (partnerGenderSearch === 'all' ||
                  partnerGenderSearch === myGender);

              if (genderCompatible) {
                partnerSocketId = otherSocketId;
                console.log(
                  "🔄 FALLBACK HISTORIQUE: Genre OK, reconnexion acceptée par manque d'alternatives"
                );
                break;
              }
            }
          }
        }
      }

      // 🚨 TIMEOUT SYSTÈME : Si aucun match après 3 minutes, informer l'utilisateur
      if (!partnerSocketId) {
        console.log(
          '⏰ Aucun partenaire compatible trouvé, utilisateur en attente...'
        );

        // Programmer un timeout de 3 minutes pour informer l'utilisateur
        // ✅ TIMEOUT SUPPRIMÉ - Laisse l'utilisateur décider quand arrêter
        // Pas de timeout automatique pour éviter les confusions d'état UI
      }

      if (partnerSocketId) {
        console.log(
          `🤝 Partenaire trouvé: ${partnerSocketId} pour ${socket.id}`
        );

        const connectionId = `${socket.id}-${partnerSocketId}`;
        console.log('🔗 ID de connexion créé:', connectionId);

        // 🚨 ENREGISTRER CONNEXION ACTIVE (EXCLUSIVITÉ)
        activeConnections.set(socket.id, connectionId);
        activeConnections.set(partnerSocketId, connectionId);
        connectionPairs.set(connectionId, {
          socket1: socket.id,
          socket2: partnerSocketId,
          startTime: new Date(),
        });

        console.log(`🔒 CONNEXION EXCLUSIVE enregistrée: ${connectionId}`);
        console.log(
          `📝 Historique ${socket.id}:`,
          connectionHistory.get(socket.id)
        );
        console.log(
          `📝 Historique ${partnerSocketId}:`,
          connectionHistory.get(partnerSocketId)
        );

        // Informer les deux utilisateurs avec les vrais socket IDs
        console.log('📤 DONNÉES PARTENAIRE ENVOYÉES:', {
          partner: waitingQueue.get(partnerSocketId).userData,
          partnerSocketId: partnerSocketId,
        });

        socket.emit('partner-found', {
          connectionId: connectionId,
          partner: waitingQueue.get(partnerSocketId).userData,
          partnerSocketId: partnerSocketId,
          mySocketId: socket.id,
        });

        console.log('📤 Émission partner-found vers socket principal');

        console.log(
          '🔥🔥🔥 MON FIX EST BIEN DÉPLOYÉ !',
          new Date().toISOString()
        );

        // DEBUG: Voir les vraies données avant envoi
        console.log('📊 DEBUG AVANT ENVOI:');
        console.log(
          'Socket actuel:',
          socket.id,
          'userData:',
          waitingQueue.get(socket.id)?.userData
        );
        console.log(
          'Partner:',
          partnerSocketId,
          'userData:',
          waitingQueue.get(partnerSocketId)?.userData
        );

        socket.to(partnerSocketId).emit('partner-found', {
          connectionId: connectionId,
          partner: waitingQueue.get(socket.id).userData,
          partnerSocketId: socket.id,
          mySocketId: partnerSocketId,
        });

        console.log('📤 Émission partner-found vers partenaire');

        // Sauvegarder les langues avant de retirer de la queue
        const socketData = waitingQueue.get(socket.id) || {};
        const partnerData = waitingQueue.get(partnerSocketId) || {};
        userLanguages.set(socket.id, socketData.language || 'fr');
        userLanguages.set(partnerSocketId, partnerData.language || 'en');
        console.log(
          `🌍 Langues sauvegardées: ${socket.id}=${socketData.language}, ${partnerSocketId}=${partnerData.language}`
        );

        // Retirer les deux utilisateurs de la file d'attente
        waitingQueue.delete(socket.id);
        waitingQueue.delete(partnerSocketId);
        console.log('✅ Utilisateurs retirés de la file d\\' + 'attente');
      } else {
        socket.emit('waiting-for-partner', {
          message: 'Recherche de partenaire en cours...',
          queuePosition: waitingQueue.size,
        });
        console.log(
          `⏳ ${socket.id} en attente de partenaire (position: ${waitingQueue.size})`
        );
      }
    } catch (error) {
      console.error('Erreur join-cam-queue:', error);
      socket.emit('error', {
        message: 'Erreur lors de la recherche de partenaire',
      });
    }
  });

  // Quitter la file d'attente
  socket.on('leave-cam-queue', () => {
    waitingQueue.delete(socket.id);
    socket.emit('left-queue', {
      message: 'Vous avez quitté la file d\\' + 'attente',
    });
  });

  // 🚨 TERMINER CONNEXION CAM (LIBÉRER EXCLUSIVITÉ)
  socket.on('end-cam-connection', () => {
    const connectionId = activeConnections.get(socket.id);
    if (connectionId) {
      const pair = connectionPairs.get(connectionId);
      if (pair) {
        // Identifier l'autre utilisateur
        const otherSocket =
          pair.socket1 === socket.id ? pair.socket2 : pair.socket1;

        // 🎯 BLACKLIST ASYMÉTRIQUE: Seulement celui qui clique "Suivant" évite son ancien partenaire
        if (!connectionHistory.has(socket.id)) {
          connectionHistory.set(socket.id, []);
        }
        connectionHistory.get(socket.id).push(otherSocket);

        // Limiter historique à 1 seul dernier partenaire
        if (connectionHistory.get(socket.id).length > 1) {
          connectionHistory.get(socket.id).shift();
        }

        console.log(`🚫 ${socket.id} évitera ${otherSocket} au prochain match`);
        console.log(`✅ ${otherSocket} peut rematchers avec n'importe qui`);

        // Libérer les deux utilisateurs
        activeConnections.delete(pair.socket1);
        activeConnections.delete(pair.socket2);
        connectionPairs.delete(connectionId);

        // Notifier l'autre utilisateur
        socket.to(otherSocket).emit('partner-disconnected');

        console.log(`🔓 CONNEXION LIBÉRÉE: ${connectionId}`);
      }
    }
  });

  // Gestion des signaux WebRTC
  socket.on('webrtc-signal', data => {
    const { connectionId, signal, targetSocketId } = data;

    console.log('📡 Signal WebRTC transmis:', {
      fromSocketId: socket.id,
      targetSocketId: targetSocketId,
      connectionId: connectionId,
      signalType: signal.type || 'candidate',
    });

    // Vérifier si le socket cible existe
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket) {
      console.error('❌ Socket cible non trouvé:', targetSocketId);
      return;
    }

    socket.to(targetSocketId).emit('webrtc-signal', {
      connectionId,
      signal,
      fromSocketId: socket.id,
    });

    console.log('✅ Signal WebRTC transmis avec succès');
  });

  // === CHAT TEMPS RÉEL ===
  // Rejoindre une conversation
  socket.on('join-conversation', data => {
    const { userId, otherUserId } = data;
    const conversationId = [userId, otherUserId].sort().join('_');
    socket.join(`conversation_${conversationId}`);
    console.log(`✅ User ${userId} rejoint conversation ${conversationId}`);

    // 🔍 DIAGNOSTIC spécial pour Gog et Camille
    if (
      (userId.includes('68fa5bfc53aebaf1f87b7860') &&
        otherUserId.includes('690a028ad47c3ebe2c370057')) ||
      (userId.includes('690a028ad47c3ebe2c370057') &&
        otherUserId.includes('68fa5bfc53aebaf1f87b7860'))
    ) {
      console.log('🚨 DIAGNOSTIC GOG↔CAMILLE - Rejoindre conversation');
      console.log('🚨 UserId:', userId);
      console.log('🚨 OtherUserId:', otherUserId);
      console.log('🚨 ConversationId:', conversationId);
      console.log('🚨 Room Socket.io:', `conversation_${conversationId}`);
    }
  });

  // 🌍 MISE À JOUR LANGUE CHAT EN TEMPS RÉEL
  socket.on('update-chat-language', data => {
    const { language } = data;
    console.log(`🌍 Mise à jour langue chat pour ${socket.id}: ${language}`);

    // Mettre à jour la langue dans userLanguages (utilisateurs connectés)
    userLanguages.set(socket.id, language);
    console.log(`✅ Langue mise à jour dans userLanguages: ${language}`);

    // Aussi mettre à jour dans waitingQueue si présent (pour compatibilité)
    if (waitingQueue.has(socket.id)) {
      const userData = waitingQueue.get(socket.id);
      userData.language = language;
      waitingQueue.set(socket.id, userData);
      console.log(`✅ Langue aussi mise à jour dans waitingQueue: ${language}`);
    }
  });

  // 💬 GESTION MESSAGES CHAT CAM-TO-CAM AVEC TRADUCTION
  socket.on('send-chat-message', async data => {
    const { connectionId, message, targetSocketId } = data;

    console.log(`💬 Message chat: ${socket.id} → ${targetSocketId}`);
    console.log(`📝 Contenu: ${message}`);

    // Vérifier que les deux sont bien connectés
    if (activeConnections.get(socket.id) === connectionId) {
      // Récupérer les langues depuis userLanguages (mise à jour en temps réel)
      const senderLanguage = userLanguages.get(socket.id) || 'fr';
      const targetLanguage = userLanguages.get(targetSocketId) || 'en';

      console.log(`🌍 LANGUE DEBUG - Socket expéditeur: ${socket.id}`);
      console.log(`🌍 LANGUE DEBUG - Socket destinataire: ${targetSocketId}`);
      console.log(`🌍 LANGUE DEBUG - Sender language: ${senderLanguage}`);
      console.log(`🌍 LANGUE DEBUG - Target language: ${targetLanguage}`);
      console.log(
        `🌍 LANGUE DEBUG - UserLanguages:`,
        Object.fromEntries(userLanguages)
      );

      console.log(
        `🌍 Langue expéditeur: ${senderLanguage}, destinataire: ${targetLanguage}`
      );

      let translatedMessage = message;

      // Traduire vers la langue choisie par le destinataire
      if (targetLanguage !== senderLanguage && message.trim()) {
        try {
          console.log(
            `🔄 Tentative traduction: "${message}" (${senderLanguage} → ${targetLanguage})`
          );
          translatedMessage = await translateMessage(
            message,
            senderLanguage,
            targetLanguage
          );
          console.log(`✅ Traduction réussie: "${translatedMessage}"`);
        } catch (error) {
          console.log(`❌ Erreur traduction: ${error.message}`);
          // Garder message original en cas d'erreur
          translatedMessage = message;
        }
      } else {
        console.log(
          `ℹ️ Pas de traduction nécessaire (même langue: ${senderLanguage})`
        );
      }

      // Envoyer le message (traduit ou original) au partenaire
      socket.to(targetSocketId).emit('chat-message', {
        message: translatedMessage,
        originalMessage: message,
        fromSocketId: socket.id,
        connectionId: connectionId,
        language: targetLanguage,
        sourceLanguage: senderLanguage,
      });
      console.log(`✅ Message transmis à ${targetSocketId}`);
    } else {
      console.log(`❌ Message refusé - connexion invalide`);
    }
  });

  // Quitter une conversation
  socket.on('leave-conversation', data => {
    const { userId, otherUserId } = data;
    const conversationId = [userId, otherUserId].sort().join('_');
    socket.leave(`conversation_${conversationId}`);
    console.log(`⬅️ User ${userId} quitte conversation ${conversationId}`);
  });

  // NOTE: Nouveau message géré dans messageController.js via l'API REST
  // Plus besoin de gérer 'new-message' ici car l'émission Socket.io se fait déjà
  // dans messageController.js après sauvegarde en base

  // Notification de nouvelle demande de chat
  socket.on('new-chat-request', data => {
    const { toUserId, requestData } = data;
    // Notifier l'utilisateur ciblé
    io.emit('chat-request-received', {
      toUserId,
      requestData,
    });
    console.log(`📨 Nouvelle demande de chat pour user ${toUserId}`);
  });

  // Utilisateur en train d'écrire
  socket.on('typing', data => {
    const { userId, otherUserId } = data;
    const conversationId = [userId, otherUserId].sort().join('_');
    socket.to(`conversation_${conversationId}`).emit('user-typing', {
      userId,
    });
  });

  // Arrêt d'écriture
  socket.on('stop-typing', data => {
    const { userId, otherUserId } = data;
    const conversationId = [userId, otherUserId].sort().join('_');
    socket.to(`conversation_${conversationId}`).emit('user-stopped-typing', {
      userId,
    });
  });

  // Déconnexion
  socket.on('disconnect', () => {
    console.log('Utilisateur déconnecté:', socket.id);
    waitingQueue.delete(socket.id);

    // 🧹 NETTOYER HISTORIQUE après délai (pour éviter reconnexions immédiates)
    setTimeout(() => {
      connectionHistory.delete(socket.id);
      recentConnections.delete(socket.id);
    }, 60000); // Nettoyer après 1 minute

    // 🚨 NETTOYER CONNEXIONS ACTIVES
    const connectionId = activeConnections.get(socket.id);
    if (connectionId) {
      const pair = connectionPairs.get(connectionId);
      if (pair) {
        // Libérer l'autre utilisateur
        const otherSocket =
          pair.socket1 === socket.id ? pair.socket2 : pair.socket1;
        activeConnections.delete(otherSocket);
        socket.to(otherSocket).emit('partner-disconnected');

        // Nettoyer les maps
        activeConnections.delete(socket.id);
        connectionPairs.delete(connectionId);

        console.log(`🧹 NETTOYAGE connexion déconnectée: ${connectionId}`);
      }
    }
  });
});

// 🎯 MATCHING SIMPLE - PAS D'AUTOMATION

// Démarrer le serveur
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Serveur HotMeet démarré');
  console.log('🏁 Version:', process.env.NODE_ENV || 'development');
  console.log('🔍 CLIENT_URL configuré:', CLIENT_URL);
  console.log(
    '🌐 URL publique:',
    process.env.RENDER_EXTERNAL_URL || CLIENT_URL
  );
  console.log('🏁 Port d\\' + 'écoute:', PORT);
  console.log('🔌 Socket.IO activé pour le cam-to-cam');
  console.log('🌍 Serveur accessible depuis toutes les interfaces réseau');
});

module.exports = app;
// Force CSP update
// Force deploy CSP fix - Sun Nov 23 23:07:28 CET 2025
// CSP restaurée - Sun Nov 23 23:15:14 CET 2025
// Force redeploy Mon Nov 24 13:03:44 CET 2025
// Force deploy Tue Dec  9 14:37:09 CET 2025
