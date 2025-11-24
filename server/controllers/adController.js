const Ad = require('../models/Ad');
const User = require('../models/User');
const Message = require('../models/Message');

// Créer une nouvelle annonce
const createAd = async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      location,
      date,
      ageMin,
      ageMax,
      sexe,
      pratiques,
      premiumOnly,
      tags,
    } = req.body;

    // Vérifier que l'utilisateur est connecté
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié',
      });
    }

    // Valider les données
    if (!type || !title || !description || !location || !date) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis',
      });
    }

    // Vérifier que la date n'est pas dans le passé
    if (new Date(date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'La date ne peut pas être dans le passé',
      });
    }

    // Créer l'annonce
    const newAd = new Ad({
      userId: req.user.id,
      type,
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      date: new Date(date),
      criteria: {
        ageMin: ageMin || 18,
        ageMax: ageMax || 100,
        sexe: sexe || 'tous',
        pratiques: pratiques || [],
      },
      premiumOnly: premiumOnly || false,
      tags: tags || [],
      images: req.uploadedPhotos || [],
    });

    const savedAd = await newAd.save();

    // Peupler avec les infos utilisateur
    await savedAd.populate(
      'userId',
      'profile.nom profile.age profile.sexe profile.localisation'
    );

    res.status(201).json({
      success: true,
      message: 'Annonce créée avec succès',
      ad: savedAd,
    });
  } catch (error) {
    console.error('Erreur création annonce:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création de l'annonce",
      error: error.message,
    });
  }
};

// Récupérer toutes les annonces avec filtres
const getAds = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      location,
      sexe,
      ageMin,
      ageMax,
      premiumOnly,
      search,
    } = req.query;

    // Construire les filtres
    const filters = { status: 'active' };

    if (type) filters.type = type;
    if (location) filters.location = new RegExp(location, 'i');
    if (sexe && sexe !== 'tous')
      filters['criteria.sexe'] = { $in: [sexe, 'tous'] };
    if (premiumOnly === 'true') filters.premiumOnly = true;

    // Filtres d'âge
    if (ageMin) filters['criteria.ageMin'] = { $lte: parseInt(ageMin) };
    if (ageMax) filters['criteria.ageMax'] = { $gte: parseInt(ageMax) };

    // Recherche textuelle
    if (search) {
      filters.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') },
      ];
    }

    const ads = await Ad.getActiveAds(filters, parseInt(page), parseInt(limit));
    const total = await Ad.countDocuments(filters);

    res.json({
      success: true,
      ads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur récupération annonces:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des annonces',
      error: error.message,
    });
  }
};

// Récupérer une annonce par ID
const getAdById = async (req, res) => {
  try {
    const { id } = req.params;

    const ad = await Ad.findById(id).populate(
      'userId',
      'profile.nom profile.age profile.sexe profile.localisation profile.photos'
    );

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée',
      });
    }

    // Incrémenter les vues si ce n'est pas le propriétaire
    if (req.user && req.user.id !== ad.userId._id.toString()) {
      ad.contactInfo.viewCount = (ad.contactInfo.viewCount || 0) + 1;
      await ad.save();
    }

    res.json({
      success: true,
      ad,
    });
  } catch (error) {
    console.error('Erreur récupération annonce:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'annonce",
      error: error.message,
    });
  }
};

// Récupérer les annonces d'un utilisateur
const getUserAds = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié',
      });
    }

    const ads = await Ad.getUserAds(
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );
    const total = await Ad.countDocuments({ userId: req.user.id });

    res.json({
      success: true,
      ads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur récupération annonces utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de vos annonces',
      error: error.message,
    });
  }
};

// Mettre à jour une annonce
const updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié',
      });
    }

    const ad = await Ad.findById(id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée',
      });
    }

    // Vérifier que l'utilisateur est propriétaire
    if (ad.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Vous n'êtes pas autorisé à modifier cette annonce",
      });
    }

    // Mise à jour
    Object.assign(ad, updates);
    await ad.save();

    res.json({
      success: true,
      message: 'Annonce mise à jour avec succès',
      ad,
    });
  } catch (error) {
    console.error('Erreur mise à jour annonce:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour de l'annonce",
      error: error.message,
    });
  }
};

// Supprimer une annonce
const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié',
      });
    }

    const ad = await Ad.findById(id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée',
      });
    }

    // Vérifier que l'utilisateur est propriétaire
    if (ad.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Vous n'êtes pas autorisé à supprimer cette annonce",
      });
    }

    await Ad.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Annonce supprimée avec succès',
    });
  } catch (error) {
    console.error('Erreur suppression annonce:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de l'annonce",
      error: error.message,
    });
  }
};

// Répondre à une annonce (envoyer un message)
const respondToAd = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié',
      });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Le message ne peut pas être vide',
      });
    }

    const ad = await Ad.findById(id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée',
      });
    }

    // Empêcher de répondre à sa propre annonce
    if (ad.userId.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas répondre à votre propre annonce',
      });
    }

    // Créer le message
    const newMessage = new Message({
      senderId: req.user.id,
      recipientId: ad.userId,
      content: message.trim(),
      adId: ad._id,
      adTitle: ad.title,
    });

    await newMessage.save();

    // Incrémenter le compteur de réponses
    await ad.incrementResponseCount();

    res.status(201).json({
      success: true,
      message: 'Votre message a été envoyé avec succès',
      messageId: newMessage._id,
    });
  } catch (error) {
    console.error('Erreur réponse annonce:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi de votre message",
      error: error.message,
    });
  }
};

module.exports = {
  createAd,
  getAds,
  getAdById,
  getUserAds,
  updateAd,
  deleteAd,
  respondToAd,
};
