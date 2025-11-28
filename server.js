const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Charger les variables d'environnement
require('dotenv').config();

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

// TIMESTAMP POUR FORCER RESTART COMPLET RENDER
console.log('🚀 SERVEUR REDÉMARRÉ COMPLÈTEMENT :', new Date().toISOString());

// Middleware de sécurité avec CSP personnalisée pour Cloudinary
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
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
      age: req.body.age,
      sexe: req.body.sexe,
      contact_methods: req.body.contact_methods || ['site'],
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

    // Récupérer toutes les annonces de l'utilisateur
    const userAds = await Ad.find({ userId: userId, status: 'active' });
    const adIds = userAds.map(ad => ad._id);

    if (adIds.length === 0) {
      return res.json({
        success: true,
        responses: [],
      });
    }

    // Récupérer les messages pour ces annonces où l'utilisateur est le receveur
    const adMessages = await AdMessage.find({
      adId: { $in: adIds },
      receiverId: userId,
    })
      .populate('senderId', 'nom profile')
      .populate('adId', 'title')
      .sort({ timestamp: -1 })
      .limit(100);

    // Grouper les messages par conversation
    const conversations = {};
    for (const message of adMessages) {
      const conversationKey = `${message.adId._id}-${message.senderId._id}`;

      if (!conversations[conversationKey]) {
        conversations[conversationKey] = {
          id: conversationKey,
          adId: message.adId._id,
          adTitle: message.adId.title,
          responder: {
            name: message.senderId.nom,
            photo:
              message.senderId.profile?.photos?.find(p => p.isProfile)?.url ||
              message.senderId.profile?.photos?.[0]?.url ||
              '/images/avatar-placeholder.png',
            age: message.senderId.profile?.age || 25,
            gender: message.senderId.profile?.sexe || 'homme',
            location: `${message.senderId.profile?.localisation?.ville || 'Paris'}, ${message.senderId.profile?.localisation?.region || 'France'}`,
          },
          message: message.message,
          timestamp: message.timestamp,
          status: 'unread',
        };
      }

      // Compter les messages non lus et adapter le statut
      if (!message.isRead) {
        // Garder le statut unread si au moins un message n'est pas lu
        // (le statut 'unread' est déjà défini par défaut)
      } else if (conversations[conversationKey].status === 'unread') {
        // Si tous les messages sont lus, changer le statut
        conversations[conversationKey].status = 'read';
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

io.on('connection', socket => {
  console.log('Utilisateur connecté:', socket.id);

  // Rejoindre la file d'attente pour le cam-to-cam
  socket.on('join-cam-queue', async data => {
    try {
      const { userId, criteria } = data;

      // En mode démo, simuler un utilisateur valide sans vérifier MongoDB
      const demoUser = {
        profile: {
          nom: 'Utilisateur Démo',
          age: 25,
          country: criteria.country || 'fr',
          gender: criteria.gender || 'all',
          language: criteria.language || 'fr',
        },
      };

      // Ajouter l'utilisateur à la file d'attente
      waitingQueue.set(socket.id, {
        ...criteria,
        userId: userId.toString(),
        userData: demoUser.profile,
      });

      console.log(
        `🔍 Utilisateur ${socket.id} rejoint la file d'attente avec critères:`,
        criteria
      );
      console.log(
        `📊 File d'attente actuelle: ${waitingQueue.size} utilisateurs`
      );

      // Rechercher un partenaire compatible avec critères de matching
      let partnerSocketId = null;
      let bestMatchScore = 0;

      for (const [otherSocketId, otherData] of waitingQueue.entries()) {
        if (otherSocketId === socket.id) {
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

        // Critère genre (priorité élevée)
        if (
          criteria.gender === otherData.gender ||
          criteria.gender === 'all' ||
          otherData.gender === 'all'
        ) {
          matchScore += 30;
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
      if (!partnerSocketId && waitingQueue.size > 1) {
        for (const [otherSocketId, otherData] of waitingQueue.entries()) {
          if (otherSocketId !== socket.id) {
            partnerSocketId = otherSocketId;
            break;
          }
        }
      }

      if (partnerSocketId) {
        console.log(
          `🤝 Partenaire trouvé: ${partnerSocketId} pour ${socket.id}`
        );

        const connectionId = `${socket.id}-${partnerSocketId}`;
        console.log('🔗 ID de connexion créé:', connectionId);

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
  });
});

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
