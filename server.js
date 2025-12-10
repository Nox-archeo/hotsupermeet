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

// Route de santé pour Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Charger les routes API (elles gèrent elles-mêmes les erreurs MongoDB)
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/users', require('./server/routes/users'));
app.use('/api/messages', require('./server/routes/messages'));
app.use('/api/payments', require('./server/routes/payments'));
app.use('/api/tonight', require('./server/routes/tonight'));
app.use('/api/uploads', require('./server/routes/uploads'));
app.use('/api/subscriptions', require('./server/routes/subscriptions'));

// Initialiser Socket.io dans les contrôleurs
const messageController = require('./server/controllers/messageController');
messageController.setSocketIO(io);

// ROUTE DIRECTE ANNONCES QUI SAUVEGARDE EN BASE
console.log('🚨 CRÉATION ROUTE ADS DIRECTE QUI SAUVEGARDE');
app.post('/api/ads', async (req, res) => {
  try {
    console.log('� CRÉATION ANNONCE - DÉBUT');

    // Récupération du token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res
        .status(401)
        .json({ success: false, error: { message: 'Token requis' } });
    }

    // Import direct du modèle Ad
    const Ad = require('./server/models/Ad');
    const jwt = require('jsonwebtoken');

    // Décodage du token pour récupérer l'userId
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    console.log('✅ User ID:', userId);

    // Création de l'annonce
    const newAd = new Ad({
      userId: userId,
      category: req.body.category,
      type: req.body.type || 'rencontre',
      title: req.body.title,
      description: req.body.description,
      country: req.body.country,
      region: req.body.region,
      city: req.body.city,
      images: req.body.images || [],

      // Informations personnelles
      age: req.body.age,
      sexe: req.body.sexe,
      taille: req.body.taille,
      poids: req.body.poids,
      cheveux: req.body.cheveux,
      yeux: req.body.yeux,

      // Détails escort
      bonnet: req.body.bonnet,
      origine: req.body.origine,
      silhouette: req.body.silhouette,
      depilation: req.body.depilation,

      // Services et tarifs
      services: req.body.services || [],
      tarifs: req.body.tarifs,

      // Disponibilités
      horaires: req.body.horaires,
      deplacement: req.body.deplacement,
      disponibilites_details: req.body.disponibilites_details,

      // Contact
      contact_methods: req.body.contact_methods || ['site'],
      contact_email: req.body.contact_email,
      contact_telephone: req.body.contact_telephone,
      contact_whatsapp: req.body.contact_whatsapp,
      contact_telegram: req.body.contact_telegram,
      contact_snap: req.body.contact_snap,

      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    console.log('✅ Annonce créée, sauvegarde...');
    await newAd.save();
    console.log('✅ ANNONCE SAUVEGARDÉE EN BASE !');

    res.json({
      success: true,
      message: 'Annonce publiée avec succès !',
      data: newAd,
    });
  } catch (error) {
    console.error('❌ ERREUR création annonce:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur: ' + error.message },
    });
  }
});
console.log('✅ Route directe ads ACTIVE');

// ROUTE GET POUR VOIR LES ANNONCES
app.get('/api/ads', async (req, res) => {
  try {
    const Ad = require('./server/models/Ad');
    const ads = await Ad.find({ status: 'active' })
      .populate('userId', 'pseudo')
      .sort({ createdAt: -1 })
      .limit(50);

    console.log('✅ RÉCUPÉRATION ANNONCES:', ads.length);

    res.json({
      success: true,
      data: ads,
    });
  } catch (error) {
    console.error('❌ ERREUR récupération annonces:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur: ' + error.message },
    });
  }
});
console.log('✅ Route GET ads ACTIVE');

// ROUTE POUR MES ANNONCES - avec authentification
app.get('/api/my-ads', async (req, res) => {
  console.log('📞 APPEL /api/my-ads - headers:', req.headers.authorization);
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

    const Ad = require('./server/models/Ad');
    const ads = await Ad.find({ userId: userId, status: 'active' })
      .sort({ createdAt: -1 })
      .limit(50);

    console.log('✅ MES ANNONCES - UserId:', userId, 'Trouvées:', ads.length);

    res.json({
      success: true,
      data: ads,
    });
  } catch (error) {
    console.error('❌ ERREUR mes annonces:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur: ' + error.message },
    });
  }
});
console.log('✅ Route GET my-ads ACTIVE');

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

    console.log('✅ ANNONCE SUPPRIMÉE:', req.params.adId);
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

// ROUTE GET POUR RÉCUPÉRER LES RÉPONSES AUX ANNONCES (pour messagerie)
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
      .populate('senderId', 'nom profile')
      .populate('receiverId', 'nom profile')
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
          senderId: otherUser._id,
          senderName: otherUser.nom || otherUser.profile?.nom,
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

        console.log(`🎯 GENDER MATCHING DÉTAILLÉ:`);
        console.log(
          `  - MOI: Je suis "${myGender}" et je cherche "${myGenderSearch}"`
        );
        console.log(
          `  - PARTENAIRE: Il/Elle est "${partnerGender}" et cherche "${partnerGenderSearch}"`
        );
        console.log(
          `  - CONDITION 1: Je cherche "${myGenderSearch}", partenaire est "${partnerGender}" → ${myGenderSearch === 'all' || myGenderSearch === partnerGender}`
        );
        console.log(
          `  - CONDITION 2: Partenaire cherche "${partnerGenderSearch}", je suis "${myGender}" → ${partnerGenderSearch === 'all' || partnerGenderSearch === myGender}`
        );

        // Vérifier compatibilité bidirectionnelle - LOGIQUE CORRIGEE
        const genderCompatible =
          (myGenderSearch === 'all' || myGenderSearch === partnerGender) &&
          (partnerGenderSearch === 'all' || partnerGenderSearch === myGender);

        if (genderCompatible) {
          matchScore += 30;
          console.log(`✅ GENRE COMPATIBLE: +30 points`);
        } else {
          console.log(`❌ GENRE INCOMPATIBLE: pas de match possible`);
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

      // Si aucun partenaire n'est trouvé avec critères, prendre le premier disponible
      // MAIS éviter l'historique si possible
      if (!partnerSocketId && waitingQueue.size > 1) {
        // D'abord essayer sans historique
        for (const [otherSocketId, otherData] of waitingQueue.entries()) {
          if (
            otherSocketId !== socket.id &&
            !activeConnections.has(otherSocketId) &&
            !myHistory.includes(otherSocketId)
          ) {
            partnerSocketId = otherSocketId;
            break;
          }
        }

        // Si toujours rien, accepter quelqu'un de l'historique
        if (!partnerSocketId) {
          for (const [otherSocketId, otherData] of waitingQueue.entries()) {
            if (
              otherSocketId !== socket.id &&
              !activeConnections.has(otherSocketId)
            ) {
              partnerSocketId = otherSocketId;
              console.log(
                `🔄 Reconnexion acceptée par manque d'alternatives: ${otherSocketId}`
              );
              break;
            }
          }
        }
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
        socket.emit('partner-found', {
          connectionId: connectionId,
          partner: waitingQueue.get(partnerSocketId).userData,
          partnerSocketId: partnerSocketId,
          mySocketId: socket.id,
        });

        console.log('📤 Émission partner-found vers socket principal');

        socket.to(partnerSocketId).emit('partner-found', {
          connectionId: connectionId,
          partner: demoUser.profile,
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
