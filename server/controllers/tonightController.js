const TonightMeet = require('../models/TonightMeet');
const User = require('../models/User');

// Créer une nouvelle annonce "Ce Soir"
exports.createTonightMeet = async (req, res) => {
  try {
    const { fullDetails, visibilityCriteria } = req.body;
    const userId = req.user.id;

    const tonightMeet = new TonightMeet({
      userId,
      location: fullDetails.lieu,
      fullDetails,
      visibilityCriteria,
    });

    await tonightMeet.save();

    // Populer les informations de l'utilisateur pour la réponse
    await tonightMeet.populate(
      'userId',
      'profile.nom profile.age profile.sexe profile.localisation profile.photos'
    );

    res.status(201).json({
      success: true,
      message: 'Annonce créée avec succès',
      data: tonightMeet,
    });
  } catch (error) {
    console.error('Erreur création annonce Ce Soir:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création de l'annonce",
      error: error.message,
    });
  }
};

// Récupérer les annonces "Ce Soir" publiques (infos basiques seulement)
exports.getTonightMeets = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const tonightMeets = await TonightMeet.find({
      active: true,
      expiresAt: { $gt: new Date() },
      'fullDetails.visibilite': 'publique',
    })
      .populate(
        'userId',
        'profile.nom profile.age profile.sexe profile.localisation profile.photos'
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .exec();

    // Retourner seulement les infos basiques pour les annonces publiques
    const publicMeets = tonightMeets.map(meet => ({
      _id: meet._id,
      userId: meet.userId,
      location: meet.location,
      visibilityCriteria: meet.visibilityCriteria,
      createdAt: meet.createdAt,
      expiresAt: meet.expiresAt,
      // Ne pas inclure fullDetails pour les annonces publiques
    }));

    res.json({
      success: true,
      data: publicMeets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await TonightMeet.countDocuments({
          active: true,
          expiresAt: { $gt: new Date() },
          'fullDetails.visibilite': 'publique',
        }),
      },
    });
  } catch (error) {
    console.error('Erreur récupération annonces Ce Soir:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des annonces',
      error: error.message,
    });
  }
};

// Liker une annonce "Ce Soir"
exports.likeTonightMeet = async (req, res) => {
  try {
    const { tonightMeetId } = req.body;
    const userId = req.user.id;

    const tonightMeet = await TonightMeet.findById(tonightMeetId);
    if (!tonightMeet) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée',
      });
    }

    // Vérifier si l'utilisateur a déjà liké cette annonce
    const existingLike = tonightMeet.likes.find(
      like => like.userId.toString() === userId
    );

    if (existingLike) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà liké cette annonce',
      });
    }

    // Ajouter le like
    tonightMeet.likes.push({
      userId,
      status: 'pending',
    });

    await tonightMeet.save();

    res.json({
      success: true,
      message: 'Like envoyé avec succès',
      data: {
        likeId: tonightMeet.likes[tonightMeet.likes.length - 1]._id,
      },
    });
  } catch (error) {
    console.error('Erreur like annonce Ce Soir:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi du like",
      error: error.message,
    });
  }
};

// Récupérer les likes d'une annonce (pour le créateur)
exports.getTonightMeetLikes = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const tonightMeet = await TonightMeet.findById(id).populate(
      'likes.userId',
      'profile.nom profile.age profile.sexe profile.localisation profile.photos profile.bio'
    );

    if (!tonightMeet) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée',
      });
    }

    // Vérifier que l'utilisateur est le créateur de l'annonce
    if (tonightMeet.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé',
      });
    }

    res.json({
      success: true,
      data: tonightMeet.likes,
    });
  } catch (error) {
    console.error('Erreur récupération likes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des likes',
      error: error.message,
    });
  }
};

// Accepter un like
exports.acceptLike = async (req, res) => {
  try {
    const { id, likeId } = req.params;
    const userId = req.user.id;

    const tonightMeet = await TonightMeet.findById(id);
    if (!tonightMeet) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée',
      });
    }

    // Vérifier que l'utilisateur est le créateur de l'annonce
    if (tonightMeet.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé',
      });
    }

    const like = tonightMeet.likes.id(likeId);
    if (!like) {
      return res.status(404).json({
        success: false,
        message: 'Like non trouvé',
      });
    }

    like.status = 'accepted';
    like.acceptedAt = new Date();
    await tonightMeet.save();

    res.json({
      success: true,
      message: 'Like accepté avec succès',
      data: like,
    });
  } catch (error) {
    console.error('Erreur acceptation like:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'acceptation du like",
      error: error.message,
    });
  }
};

// Rejeter un like
exports.rejectLike = async (req, res) => {
  try {
    const { id, likeId } = req.params;
    const userId = req.user.id;

    const tonightMeet = await TonightMeet.findById(id);
    if (!tonightMeet) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée',
      });
    }

    // Vérifier que l'utilisateur est le créateur de l'annonce
    if (tonightMeet.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé',
      });
    }

    const like = tonightMeet.likes.id(likeId);
    if (!like) {
      return res.status(404).json({
        success: false,
        message: 'Like non trouvé',
      });
    }

    like.status = 'rejected';
    await tonightMeet.save();

    res.json({
      success: true,
      message: 'Like rejeté avec succès',
      data: like,
    });
  } catch (error) {
    console.error('Erreur rejet like:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du rejet du like',
      error: error.message,
    });
  }
};

// Récupérer les annonces d'un utilisateur
exports.getUserTonightMeets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const tonightMeets = await TonightMeet.find({ userId })
      .populate(
        'likes.userId',
        'profile.nom profile.age profile.sexe profile.localisation profile.photos'
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .exec();

    res.json({
      success: true,
      data: tonightMeets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await TonightMeet.countDocuments({ userId }),
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

// Supprimer une annonce
exports.deleteTonightMeet = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const tonightMeet = await TonightMeet.findById(id);
    if (!tonightMeet) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée',
      });
    }

    // Vérifier que l'utilisateur est le créateur de l'annonce
    if (tonightMeet.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé',
      });
    }

    await TonightMeet.findByIdAndDelete(id);

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

// Récupérer les détails complets d'une annonce (seulement si like accepté)
exports.getTonightMeetFullDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const tonightMeet = await TonightMeet.findById(id).populate(
      'userId',
      'profile.nom profile.age profile.sexe profile.localisation profile.photos'
    );

    if (!tonightMeet) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée',
      });
    }

    // Vérifier si l'utilisateur a un like accepté pour cette annonce
    const acceptedLike = tonightMeet.likes.find(
      like => like.userId.toString() === userId && like.status === 'accepted'
    );

    if (!acceptedLike && tonightMeet.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé aux détails complets',
      });
    }

    res.json({
      success: true,
      data: tonightMeet,
    });
  } catch (error) {
    console.error('Erreur récupération détails annonce:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des détails',
      error: error.message,
    });
  }
};
