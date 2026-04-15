const User = require('../models/User');
const { validationResult } = require('express-validator');

// Récupérer la liste des utilisateurs avec filtres - ACCÈS PUBLIC
const getUsers = async (req, res) => {
  try {
    const {
      ageMin,
      ageMax,
      sexe,
      orientation,
      categorie,
      pays,
      region,
      ville,
      pratiques,
      page = 1,
      limit = 20,
      sortBy = 'lastActive',
    } = req.query;

    // 🌍 ACCÈS PUBLIC - Vérifier si utilisateur connecté et premium
    const token = req.headers.authorization?.replace('Bearer ', '');
    let isUserLoggedIn = false;
    let isUserPremium = false;

    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
          isUserLoggedIn = true;
          isUserPremium = user.premium?.isPremium || false;
        }
      } catch (error) {
        console.log('Token invalide, accès en mode public');
      }
    }

    // Limite basée sur le statut utilisateur
    let actualLimit;
    if (isUserPremium) {
      actualLimit = Math.min(parseInt(limit), 100); // Premium: limite élevée
    } else {
      actualLimit = Math.min(parseInt(limit), 50); // Public/Non-premium: limite réduite
    }

    // Construire la requête de filtrage
    const query = { 'security.isBlocked': false };

    // Filtre par âge
    if (ageMin || ageMax) {
      query['profile.age'] = {};
      if (ageMin) {
        query['profile.age'].$gte = parseInt(ageMin);
      }
      if (ageMax) {
        query['profile.age'].$lte = parseInt(ageMax);
      }
    }

    // Filtre par sexe
    if (sexe && sexe !== 'tous') {
      query['profile.sexe'] = sexe;
    }

    // 🔒 Filtre par orientation - PREMIUM UNIQUEMENT
    if (orientation && orientation !== 'toutes') {
      if (isUserPremium) {
        query['profile.orientation'] = orientation;
      } else {
        console.log('❌ Filtre orientation ignoré - Premium requis');
      }
    }

    // 💖 Filtre par catégorie - PREMIUM UNIQUEMENT (MULTI-SÉLECTION)
    if (categorie && isUserPremium) {
      // Convertir la chaîne en array si nécessaire
      let categorieArray = [];
      if (Array.isArray(categorie)) {
        categorieArray = categorie;
      } else if (typeof categorie === 'string') {
        // Si c'est une chaîne séparée par des virgules
        categorieArray = categorie
          .split(',')
          .map(c => c.trim())
          .filter(c => c);
      }

      if (categorieArray.length > 0) {
        query['profile.recherche'] = { $in: categorieArray };
      }
    } else if (categorie && !isUserPremium) {
      console.log('❌ Filtre catégorie ignoré - Premium requis');
    }

    // Filtre par localisation (pays, région, ville) - recherche dans la structure objet
    if (pays) {
      query['profile.localisation.pays'] = new RegExp(pays, 'i');
    }
    if (region) {
      query['profile.localisation.region'] = new RegExp(region, 'i');
    }
    if (ville) {
      query['profile.localisation.ville'] = new RegExp(ville, 'i');
    }

    // Filtre par pratiques
    if (pratiques) {
      const pratiquesArray = pratiques.split(',');
      query['profile.pratiques'] = { $in: pratiquesArray };
    }

    // Définir le tri
    let sortOption = {};
    switch (sortBy) {
      case 'age':
        sortOption = { 'profile.age': 1 };
        break;
      case 'name':
        sortOption = { 'profile.nom': 1 };
        break;
      case 'distance':
        // Pour l'instant, tri par dernière activité si distance n'est pas disponible
        sortOption = { 'stats.lastActive': -1 };
        break;
      default:
        sortOption = { 'stats.lastActive': -1 };
    }

    // Pagination avec limite premium appliquée
    const skip = (parseInt(page) - 1) * actualLimit;

    // 👩 LOGIQUE SPÉCIALE: Garantir équilibre hommes/femmes sur pages 1 et 2
    let users;
    if ((parseInt(page) === 1 || parseInt(page) === 2) && !sexe) {
      // Pages 1 et 2 sans filtre de sexe: garantir équilibre des genres

      // Calculer le skip pour la page 2
      let pageSkip = 0;
      if (parseInt(page) === 2) {
        pageSkip = actualLimit; // Skip la première page complète
      }

      // 1. Récupérer les femmes d'abord (environ 50% de la limite)
      const femmesTarget = Math.floor(actualLimit * 0.5); // 50% pour femmes
      const femmeQuery = { ...query, 'profile.sexe': 'femme' };
      const femmes = await User.find(femmeQuery)
        .select(
          'profile.nom profile.age profile.sexe profile.orientation profile.localisation profile.photos profile.disponibilite profile.recherche stats.lastActive premium.isPremium'
        )
        .sort(sortOption)
        .skip(Math.floor(pageSkip * 0.5)) // Skip proportionnel pour les femmes
        .limit(femmesTarget)
        .lean();

      // 2. Récupérer les hommes pour compléter (environ 50% restant)
      const hommesTarget = actualLimit - femmes.length;
      let hommes = [];
      if (hommesTarget > 0) {
        const hommeQuery = { ...query, 'profile.sexe': 'homme' };
        hommes = await User.find(hommeQuery)
          .select(
            'profile.nom profile.age profile.sexe profile.orientation profile.localisation profile.photos profile.disponibilite profile.recherche stats.lastActive premium.isPremium'
          )
          .sort(sortOption)
          .skip(Math.ceil(pageSkip * 0.5)) // Skip proportionnel pour les hommes
          .limit(hommesTarget)
          .lean();
      }

      // 3. Combiner et alterner pour un équilibre visuel
      users = [];
      const maxLength = Math.max(femmes.length, hommes.length);
      for (let i = 0; i < maxLength; i++) {
        if (femmes[i]) users.push(femmes[i]);
        if (hommes[i]) users.push(hommes[i]);
      }

      console.log(
        `🎯 Page ${page} équilibrée: ${femmes.length} femmes + ${hommes.length} hommes = ${users.length} profils`
      );
    } else {
      // Pages suivantes ou avec filtre: logique normale
      users = await User.find(query)
        .select(
          'profile.nom profile.age profile.sexe profile.orientation profile.localisation profile.photos profile.disponibilite profile.recherche stats.lastActive premium.isPremium'
        )
        .sort(sortOption)
        .skip(skip)
        .limit(actualLimit)
        .lean();
    }

    // Compter le total pour la pagination
    const total = await User.countDocuments(query);

    // Formater la réponse
    const formattedUsers = users.map(user => ({
      id: user._id,
      profile: {
        nom: user.profile.nom,
        age: user.profile.age,
        sexe: user.profile.sexe,
        orientation: user.profile.orientation || 'hetero',
        localisation: user.profile.localisation,
        photos: user.profile.photos || [],
        disponibilite: user.profile.disponibilite,
      },
      premium: user.premium,
      lastActive: user.stats.lastActive,
      isOnline: new Date() - new Date(user.stats.lastActive) < 15 * 60 * 1000, // En ligne si activité < 15min
    }));

    res.json({
      success: true,
      users: formattedUsers,
      pagination: {
        page: parseInt(page),
        limit: actualLimit,
        total,
        pages: Math.ceil(total / actualLimit),
      },
      premium: {
        isPremium: true, // Garantie par middleware premiumOnly
        limitApplied: null, // Pas de limite pour premium
        upgradeRequired: false, // Déjà premium
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la récupération des utilisateurs',
      },
    });
  }
};

// Récupérer un profil utilisateur détaillé
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-password -security -email')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Vérifier si l'utilisateur est bloqué
    if (user.security?.isBlocked) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Incrémenter le compteur de vues de profil
    await User.findByIdAndUpdate(id, {
      $inc: { 'stats.profileViews': 1 },
    });

    // Formater la réponse
    const userProfile = {
      id: user._id,
      profile: {
        nom: user.profile.nom,
        age: user.profile.age,
        sexe: user.profile.sexe,
        localisation: user.profile.localisation,
        bio: user.profile.bio,
        pratiques: user.profile.pratiques || [],
        photos: user.profile.photos || [],
        tenuePreferee: user.profile.tenuePreferee,
        disponibilite: user.profile.disponibilite,
      },
      premium: user.premium,
      stats: {
        profileViews: user.stats.profileViews,
        lastActive: user.stats.lastActive,
        joinDate: user.stats.joinDate,
      },
      isOnline: new Date() - new Date(user.stats.lastActive) < 15 * 60 * 1000,
    };

    res.json({
      success: true,
      user: userProfile,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la récupération du profil',
      },
    });
  }
};

// Mettre à jour le profil utilisateur
const updateUserProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: errors.array(),
        },
      });
    }

    const { profile, preferences } = req.body;
    const userId = req.user._id;

    // Mettre à jour le profil de façon sélective pour préserver les photos
    const updateData = {};
    if (profile) {
      // Au lieu d'écraser tout le profil, on met à jour seulement les champs fournis
      Object.keys(profile).forEach(key => {
        updateData[`profile.${key}`] = profile[key];
      });
    }
    if (preferences) {
      updateData.preferences = preferences;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        profile: user.profile,
        preferences: user.preferences,
        premium: user.premium,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la mise à jour du profil',
      },
    });
  }
};

// Recherche avancée d'utilisateurs
const searchUsers = async (req, res) => {
  try {
    const {
      query,
      ageMin,
      ageMax,
      sexe,
      localisation,
      pratiques,
      premiumOnly,
      onlineOnly,
      page = 1,
      limit = 20,
    } = req.body;

    // Construire la requête de recherche
    const searchQuery = { 'security.isBlocked': false };

    // Recherche par texte (nom, localisation, bio)
    if (query) {
      searchQuery.$or = [
        { 'profile.nom': new RegExp(query, 'i') },
        { 'profile.localisation': new RegExp(query, 'i') },
        { 'profile.bio': new RegExp(query, 'i') },
      ];
    }

    // Filtres avancés
    if (ageMin || ageMax) {
      searchQuery['profile.age'] = {};
      if (ageMin) {
        searchQuery['profile.age'].$gte = parseInt(ageMin);
      }
      if (ageMax) {
        searchQuery['profile.age'].$lte = parseInt(ageMax);
      }
    }

    if (sexe && sexe !== 'tous') {
      searchQuery['profile.sexe'] = sexe;
    }

    if (localisation) {
      searchQuery['profile.localisation'] = new RegExp(localisation, 'i');
    }

    if (pratiques && pratiques.length > 0) {
      searchQuery['profile.pratiques'] = { $in: pratiques };
    }

    if (premiumOnly) {
      searchQuery['premium.isPremium'] = true;
    }

    if (onlineOnly) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      searchQuery['stats.lastActive'] = { $gte: fifteenMinutesAgo };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(searchQuery)
      .select(
        'profile.nom profile.age profile.sexe profile.localisation profile.photos profile.disponibilite profile.recherche stats.lastActive premium.isPremium'
      )
      .sort({ 'premium.isPremium': -1, 'stats.lastActive': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await User.countDocuments(searchQuery);

    const formattedUsers = users.map(user => ({
      id: user._id,
      profile: {
        nom: user.profile.nom,
        age: user.profile.age,
        sexe: user.profile.sexe,
        localisation: user.profile.localisation,
        photos: user.profile.photos || [],
        disponibilite: user.profile.disponibilite,
      },
      premium: user.premium,
      lastActive: user.stats.lastActive,
      isOnline: new Date() - new Date(user.stats.lastActive) < 15 * 60 * 1000,
    }));

    res.json({
      success: true,
      users: formattedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la recherche d'utilisateurs:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: "Erreur lors de la recherche d'utilisateurs",
      },
    });
  }
};

// Récupérer les statistiques de l'annuaire
const getDirectoryStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({
      'security.isBlocked': false,
    });
    const onlineUsers = await User.countDocuments({
      'security.isBlocked': false,
      'stats.lastActive': { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    });
    const premiumUsers = await User.countDocuments({
      'security.isBlocked': false,
      'premium.isPremium': true,
    });

    // Répartition par sexe
    const sexDistribution = await User.aggregate([
      { $match: { 'security.isBlocked': false } },
      { $group: { _id: '$profile.sexe', count: { $sum: 1 } } },
    ]);

    // Répartition par âge
    const ageDistribution = await User.aggregate([
      { $match: { 'security.isBlocked': false } },
      {
        $bucket: {
          groupBy: '$profile.age',
          boundaries: [18, 25, 35, 45, 55, 65, 100],
          default: '65+',
          output: {
            count: { $sum: 1 },
          },
        },
      },
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        onlineUsers,
        premiumUsers,
        sexDistribution,
        ageDistribution,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la récupération des statistiques',
      },
    });
  }
};

// Supprimer complètement le compte utilisateur
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { confirmPassword } = req.body;

    // Récupérer l'utilisateur pour vérification
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Vérifier le mot de passe pour confirmation
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(
      confirmPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Mot de passe incorrect',
        },
      });
    }

    console.log(`🗑️ Suppression du compte utilisateur: ${user.email}`);

    // 1. Supprimer les photos Cloudinary si elles existent
    if (user.profile.photos && user.profile.photos.length > 0) {
      const cloudinary = require('cloudinary').v2;

      for (const photo of user.profile.photos) {
        if (photo.publicId) {
          try {
            await cloudinary.uploader.destroy(photo.publicId);
            console.log(`✅ Photo Cloudinary supprimée: ${photo.publicId}`);
          } catch (cloudinaryError) {
            console.error(
              `❌ Erreur suppression Cloudinary: ${cloudinaryError.message}`
            );
          }
        }
      }
    }

    // 2. Supprimer les messages liés à cet utilisateur
    const Message = require('../models/Message');
    await Message.deleteMany({
      $or: [{ sender: userId }, { receiver: userId }],
    });
    console.log(`✅ Messages supprimés pour l'utilisateur ${user.email}`);

    // 3. Supprimer les données de Tonight Meet
    const TonightMeet = require('../models/TonightMeet');
    await TonightMeet.deleteMany({ user: userId });
    console.log(`✅ Tonight Meet supprimés pour l'utilisateur ${user.email}`);

    // 4. Supprimer les annonces si le modèle existe
    try {
      const Ad = require('../models/Ad');
      await Ad.deleteMany({ user: userId });
      console.log(`✅ Annonces supprimées pour l'utilisateur ${user.email}`);
    } catch (adError) {
      console.log('ℹ️ Modèle Ad non trouvé, ignore...');
    }

    // 5. Finalement, supprimer l'utilisateur lui-même
    await User.findByIdAndDelete(userId);
    console.log(`✅ Compte utilisateur supprimé: ${user.email}`);

    res.json({
      success: true,
      message:
        'Compte supprimé avec succès. Toutes vos données ont été effacées.',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du compte:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Erreur lors de la suppression du compte',
      },
    });
  }
};

// FONCTION TEMPORAIRE ADMIN: Supprimer les utilisateurs de test
const deleteTestUsers = async (req, res) => {
  try {
    console.log('🗑️ ADMIN: Suppression des utilisateurs de test...');

    // MISE À JOUR: ajouter "Lolo" avec majuscule
    const testUsernames = ['gege', 'jojo', 'kololo', 'lolo', 'Lolo'];

    // Rechercher les utilisateurs de test
    const testUsers = await User.find({
      'profile.nom': { $in: testUsernames },
    });

    console.log(`📋 Utilisateurs de test trouvés: ${testUsers.length}`);

    if (testUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucun utilisateur de test trouvé à supprimer',
      });
    }

    // Afficher les détails des utilisateurs trouvés
    testUsers.forEach(user => {
      console.log(
        `   - ID: ${user._id}, Nom: ${user.profile.nom}, Email: ${user.email}`
      );
    });

    // Supprimer les utilisateurs de test
    const deleteResult = await User.deleteMany({
      'profile.nom': { $in: testUsernames },
    });

    console.log(`✅ ${deleteResult.deletedCount} utilisateurs supprimés`);

    res.status(200).json({
      success: true,
      message: `${deleteResult.deletedCount} utilisateurs de test supprimés avec succès`,
      deletedUsers: testUsers.map(user => ({
        id: user._id,
        nom: user.profile.nom,
        email: user.email,
      })),
    });
  } catch (error) {
    console.error('❌ Erreur suppression utilisateurs de test:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur lors de la suppression des utilisateurs de test',
        details: error.message,
      },
    });
  }
};

// Activer l'accès premium gratuit pour les femmes
const activateFemaleFree = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Vérifier que l'utilisateur est bien une femme
    if (user.profile.sexe !== 'femme') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_FEMALE',
          message: 'Cette fonctionnalité est réservée aux femmes',
        },
      });
    }

    // Vérifier si déjà activé
    if (user.premium.isFemaleFree) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_ACTIVATED',
          message: 'Accès premium gratuit déjà activé',
        },
      });
    }

    // Activer l'accès gratuit
    user.premium.isFemaleFree = true;
    user.premium.isPremium = true;
    user.premium.expiration = new Date(2030, 11, 31); // Expiration très lointaine

    await user.save();

    res.json({
      success: true,
      message: 'Accès premium gratuit activé avec succès !',
      premium: {
        isPremium: true,
        isFemaleFree: true,
        expiration: user.premium.expiration,
      },
    });
  } catch (error) {
    console.error('Erreur activation femme gratuite:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ACTIVATION_ERROR',
        message: "Erreur lors de l'activation de l'accès gratuit",
      },
    });
  }
};

module.exports = {
  getUsers,
  getUserProfile,
  updateUserProfile,
  searchUsers,
  getDirectoryStats,
  deleteAccount,
  deleteTestUsers, // Nouveau: fonction temporaire admin
  // activateFemaleFree supprimé - plus d'accès gratuit femmes
};
