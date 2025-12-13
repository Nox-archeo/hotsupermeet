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
      country,    // ← Champ séparé depuis le formulaire
      region,     // ← Champ séparé depuis le formulaire  
      city,       // ← Champ séparé depuis le formulaire
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
    if (!type || !title || !description || !country || !region || !city || !date) {
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

    // Créer l'annonce avec les champs séparés
    const newAd = new Ad({
      userId: req.user.id,
      type,
      title: title.trim(),
      description: description.trim(),
      country: country.trim(),    // ← Stockage séparé
      region: region.trim(),      // ← Stockage séparé  
      city: city.trim(),          // ← Stockage séparé
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
    // FORCER PAS DE CACHE
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    console.log('🚀🚀🚀 API GETADS APPELÉE 🚀🚀🚀');
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
      console.log(`🔍 FILTRE PAYS: "${country}" -> RegExp: /${country}/i`);
    }

    if (region && !country) {
      filters.region = new RegExp(region, 'i'); // Recherche dans le champ region
      console.log(`🔍 FILTRE RÉGION: "${region}" -> RegExp: /${region}/i`);
    }

    if (city && !country && !region) {
      filters.city = new RegExp(city, 'i'); // Recherche dans le champ city
      console.log(`🔍 FILTRE VILLE: "${city}" -> RegExp: /${city}/i`);
    }

    console.log('📋 FILTRES APPLIQUÉS:', JSON.stringify(filters, null, 2));

    // UTILISER DIRECTEMENT find() COMME L'ANNUAIRE
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const ads = await Ad.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
      
    const total = await Ad.countDocuments(filters);

    console.log(`📊 RÉSULTATS QUERY: ${ads.length} annonces trouvées sur ${total} total`);
    ads.forEach((ad, i) => {
      console.log(`📋 Annonce ${i+1}: "${ad.title}" - country: "${ad.country}" - region: "${ad.region}" - city: "${ad.city}"`);
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
