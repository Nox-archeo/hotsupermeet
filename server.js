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
