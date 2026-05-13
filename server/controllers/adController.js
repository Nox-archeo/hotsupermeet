const Ad = require('../models/Ad');
const User = require('../models/User');
const Message = require('../models/Message');

const BLOCKED_ESCORT_TYPES = [
  'escort-girl',
  'escort-boy',
  'escort-trans',
  'escort',
];

// 🤖 ANNONCES PUBLIQUES pour SEO et BOTS
const getPublicAdsForSEO = async (req, res) => {
  try {
    console.log('🤖 Récupération annonces publiques pour SEO');

    const ads = await Ad.find({
      status: 'active',
      type: { $nin: BLOCKED_ESCORT_TYPES },
    })
      .select('title description category country region city createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('userId', 'username')
      .lean();

    const publicAds = ads.map(ad => ({
      title: ad.title,
      description: ad.description
        ? ad.description.substring(0, 200) + '...'
        : '',
      location:
        `${ad.city || ''} ${ad.region || ''} ${ad.country || ''}`.trim(),
      category: ad.category,
      createdAt: ad.createdAt,
    }));

    res.json(publicAds);
  } catch (error) {
    console.error('❌ Erreur récupération annonces publiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des annonces publiques',
    });
  }
};

// Créer une nouvelle annonce
const createAd = async (req, res) => {
  try {
    console.log('🔥 CRÉATION ANNONCE - CONTROLLER');
    console.log('🔥 DONNÉES REÇUES:', req.body);
    console.log('🔥 USER:', req.user);

    // PREMIUM DÉJÀ VÉRIFIÉ par middleware premiumOnly sur la route

    const {
      category,
      type,
      title,
      description,
      country,
      region,
      city,
      images,
      tarifs,
      age,
      sexe,
      taille,
      poids,
      cheveux,
      yeux,
      bonnet,
      origine,
      silhouette,
      depilation,
      services,
      horaires,
      deplacement,
      disponibilites_details,
      contact_methods,
      contact_email,
      contact_telephone,
      contact_whatsapp,
      contact_telegram,
      contact_snap,
    } = req.body;

    // Vérifier que l'utilisateur est connecté
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié',
      });
    }

    // Valider les données essentielles
    if (!type || !title || !description || !country || !region || !city) {
      return res.status(400).json({
        success: false,
        message:
          'Les champs type, titre, description et localisation sont obligatoires',
      });
    }

    if (BLOCKED_ESCORT_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'La catégorie Escort a été retirée',
      });
    }

    console.log('🔥 VALIDATION OK - CRÉATION ANNONCE...');

    // Créer l'annonce avec TOUTES les données du frontend
    const newAd = new Ad({
      userId: req.user.id,
      category: category || type, // Utiliser category en priorité
      type: type, // Type exact (escort-girl, masseur, etc.)
      title: title.trim(),
      description: description.trim(),
      country: country.trim(),
      region: region.trim(),
      city: city.trim(),
      images: images || [],

      // Tarifs
      tarifs: tarifs || '',

      // Informations personnelles
      age: age ? parseInt(age) : undefined,
      sexe: sexe || '',
      taille: taille || '',
      poids: poids || '',
      cheveux: cheveux || '',
      yeux: yeux || '',

      // Détails escort
      bonnet: bonnet || '',
      origine: origine || '',
      silhouette: silhouette || '',
      depilation: depilation || '',

      // Services
      services: services || [],

      // Disponibilités
      horaires: horaires || '',
      deplacement: deplacement || '',
      disponibilites_details: disponibilites_details || '',

      // Contact
      contact_methods: contact_methods || ['site'],
      contact_email: contact_email || '',
      contact_telephone: contact_telephone || '',
      contact_whatsapp: contact_whatsapp || '',
      contact_telegram: contact_telegram || '',
      contact_snap: contact_snap || '',

      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    console.log('🔥 OBJET ANNONCE CRÉÉ:', newAd);

    const savedAd = await newAd.save();
    console.log('🔥 ANNONCE SAUVEGARDÉE:', savedAd);

    res.status(201).json({
      success: true,
      message: 'Annonce créée avec succès',
      data: savedAd,
    });
  } catch (error) {
    console.error('❌ ERREUR création annonce:', error);
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
      Pragma: 'no-cache',
      Expires: '0',
    });

    console.log('🚀🚀🚀 API GETADS APPELÉE 🚀🚀🚀');
    console.log('🔍 API getAds - Paramètres reçus:', req.query);

    // Vérifier les limites premium (appliquées par le middleware premiumLimited)
    const hasFullAccess = req.hasFullAccess || false;
    const defaultLimit = hasFullAccess ? 100 : req.basicLimit || 20;

    const {
      page = 1,
      limit = defaultLimit,
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

    // Appliquer la limite pour les non-premium
    const actualLimit = hasFullAccess
      ? Math.min(parseInt(limit), 100)
      : Math.min(parseInt(limit), req.basicLimit || 20);

    // Construire les filtres
    const filters = { status: 'active' };

    // Toujours exclure les catégories escort
    filters.type = { $nin: BLOCKED_ESCORT_TYPES };

    // FILTRAGE DIRECT PAR CATÉGORIE
    if (category) {
      if (BLOCKED_ESCORT_TYPES.includes(category)) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page),
            limit: actualLimit,
            total: 0,
            pages: 0,
          },
        });
      }

      filters.type = category;
      console.log(
        `🔍 FILTRE CATÉGORIE: "${category}" -> Cherche type exact: "${category}"`
      );
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
    const skip = (parseInt(page) - 1) * actualLimit;

    const ads = await Ad.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(actualLimit)
      .lean();

    const total = await Ad.countDocuments(filters);

    console.log(
      `📊 RÉSULTATS QUERY: ${ads.length} annonces trouvées sur ${total} total`
    );
    ads.forEach((ad, i) => {
      console.log(
        `📋 Annonce ${i + 1}: "${ad.title}" - country: "${ad.country}" - region: "${ad.region}" - city: "${ad.city}" - TYPE: "${ad.type}"`
      );
    });

    console.log(
      '🔍🔍🔍 FILTRES FINAUX APPLIQUÉS:',
      JSON.stringify(filters, null, 2)
    );

    res.json({
      success: true,
      data: ads,
      pagination: {
        page: parseInt(page),
        limit: actualLimit,
        total,
        pages: Math.ceil(total / actualLimit),
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

    if (BLOCKED_ESCORT_TYPES.includes(ad.type)) {
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
      data: ad, // ✅ Utiliser 'data' pour cohérence avec les autres routes
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

    if (updates.type && BLOCKED_ESCORT_TYPES.includes(updates.type)) {
      return res.status(400).json({
        success: false,
        message: 'La catégorie Escort a été retirée',
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
  getPublicAdsForSEO,
  createAd,
  getAds,
  getAdById,
  getUserAds,
  updateAd,
  deleteAd,
  respondToAd,
  getAdResponses,
};
