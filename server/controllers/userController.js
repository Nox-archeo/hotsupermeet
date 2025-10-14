const User = require('../models/User');
const { validationResult } = require('express-validator');

// Récupérer la liste des utilisateurs avec filtres
const getUsers = async (req, res) => {
  try {
    const {
      ageMin,
      ageMax,
      sexe,
      localisation,
      pratiques,
      page = 1,
      limit = 20,
    } = req.query;

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

    // Filtre par localisation
    if (localisation) {
      query['profile.localisation'] = new RegExp(localisation, 'i');
    }

    // Filtre par pratiques
    if (pratiques) {
      const pratiquesArray = pratiques.split(',');
      query['profile.pratiques'] = { $in: pratiquesArray };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer les utilisateurs avec les champs nécessaires seulement
    const users = await User.find(query)
      .select(
        'profile.nom profile.age profile.sexe profile.localisation profile.photos profile.disponibilite stats.lastActive premium.isPremium'
      )
      .sort({ 'stats.lastActive': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Compter le total pour la pagination
    const total = await User.countDocuments(query);

    // Formater la réponse
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
      isOnline: new Date() - new Date(user.stats.lastActive) < 15 * 60 * 1000, // En ligne si activité < 15min
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

    // Mettre à jour le profil
    const updateData = {};
    if (profile) {
      updateData.profile = profile;
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
        'profile.nom profile.age profile.sexe profile.localisation profile.photos profile.disponibilite stats.lastActive premium.isPremium'
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

module.exports = {
  getUsers,
  getUserProfile,
  updateUserProfile,
  searchUsers,
  getDirectoryStats,
};
