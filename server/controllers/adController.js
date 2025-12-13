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
    console.log('🔍 API getAds - Paramètres reçus:', req.query);

    const {
      page = 1,
      limit = 20,
      category, // Changé de 'type' à 'category' pour correspondre au frontend
      country, // Ajouté
      region, // Ajouté
      city, // Ajouté
      location,
      sexe,
      ageMin,
      ageMax,
      premiumOnly,
      search,
    } = req.query;

    // Construire les filtres
    const filters = { status: 'active' };

    // FILTRAGE SIMPLE COMME L'ANNUAIRE
    if (category) {
      filters.type = category; // Recherche directe dans le champ type
    }

    if (country) {
      filters.country = new RegExp(country, 'i'); // Recherche dans le champ country
    }

    if (region && !country) {
      filters.region = new RegExp(region, 'i'); // Recherche dans le champ region
    }

    if (city && !country && !region) {
      filters.city = new RegExp(city, 'i'); // Recherche dans le champ city
    }
      } else {
        Object.assign(filters, locationFilter);
      }
    }

    if (location) {
      const locationFilter = { location: new RegExp(location, 'i') };
      if (filters.$or) {
        filters.$and = [{ $or: filters.$or }, locationFilter];
        delete filters.$or;
      } else {
        Object.assign(filters, locationFilter);
      }
    }

    if (sexe && sexe !== 'tous')
      filters['criteria.sexe'] = { $in: [sexe, 'tous'] };
    if (premiumOnly === 'true') filters.premiumOnly = true;
    filters['criteria.sexe'] = { $in: [sexe, 'tous'] };
    if (premiumOnly === 'true') filters.premiumOnly = true; // Filtres d'âge
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

    console.log('📋 FILTRES construits:', JSON.stringify(filters, null, 2));

    const ads = await Ad.getActiveAds(filters, parseInt(page), parseInt(limit));
    const total = await Ad.countDocuments(filters);

    console.log(
      `📊 Résultat: ${ads.length} annonces trouvées sur ${total} total`
    );

    // LOG DÉTAILLÉ DES ANNONCES TROUVÉES
    console.log('📋 DÉTAIL DES ANNONCES TROUVÉES:');
    ads.forEach((ad, index) => {
      console.log(
        `   ${index + 1}. "${ad.title}" - location: "${ad.location || 'VIDE'}" - country: "${ad.country || 'VIDE'}" - category: "${ad.category || 'VIDE'}"`
      );
    });

    res.json({
      success: true,
      data: ads,
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
      fromUserId: req.user.id,
      toUserId: ad.userId,
      content: message.trim(),
      provenance: 'annonces',
      originalPostId: ad._id,
      provenanceModel: 'Ad',
      isInitialRequest: true,
      status: 'pending',
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

// Récupérer les réponses aux annonces de l'utilisateur
const getAdResponses = async (req, res) => {
  console.log(
    '🚀 getAdResponses APPELÉE !!! USER ID:',
    req.user?.id,
    'NOM:',
    req.user?.nom
  );

  try {
    if (!req.user || !req.user.id) {
      console.log('❌ ERREUR: Utilisateur non authentifié');
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié',
      });
    }

    // Récupérer les messages de réponse aux annonces depuis AdMessage
    const AdMessage = require('../models/AdMessage');

    // Debug: d'abord récupérer TOUS les AdMessage pour voir
    const allAdMessages = await AdMessage.find({})
      .populate('senderId', 'nom')
      .populate('receiverId', 'nom')
      .populate('adId', 'title')
      .sort({ createdAt: -1 });

    console.log(`DEBUG: Total AdMessage dans DB: ${allAdMessages.length}`);
    allAdMessages.slice(0, 5).forEach((msg, i) => {
      console.log(`DEBUG AdMessage ${i}:`, {
        id: msg._id,
        senderId: msg.senderId._id,
        senderNom: msg.senderId.nom,
        receiverId: msg.receiverId._id,
        receiverNom: msg.receiverId.nom,
        message: msg.message,
        adTitle: msg.adId?.title || "Pas d'annonce",
      });
    });

    // Ensuite chercher pour cet utilisateur spécifiquement
    const responses = await AdMessage.find({
      receiverId: req.user.id,
    })
      .populate('senderId', 'nom age sexe localisation photo')
      .populate('adId', 'title')
      .sort({ createdAt: -1 });

    console.log(
      `DEBUG: Trouvé ${responses.length} messages AdMessage pour user ${req.user.id} (${req.user.nom || 'nom inconnu'})`
    );

    // Formater les réponses pour le frontend
    const formattedResponses = responses.map(response => ({
      id: response._id,
      adTitle: response.adId ? response.adId.title : 'Annonce supprimée',
      message: response.message, // AdMessage utilise 'message' pas 'content'
      timestamp: response.createdAt,
      status: 'unread', // AdMessage n'a pas de champ read
      responder: {
        id: response.senderId._id,
        name: response.senderId.nom,
        age: response.senderId.age,
        gender: response.senderId.sexe,
        location:
          `${response.senderId.localisation?.ville || ''}, ${response.senderId.localisation?.region || ''}`
            .trim()
            .replace(/^,\s*/, ''),
        photo: response.senderId.photo || '/images/default-avatar.jpg',
      },
    }));

    res.json({
      success: true,
      responses: formattedResponses,
    });
  } catch (error) {
    console.error('Erreur récupération réponses annonces:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réponses',
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
  getAdResponses,
};
