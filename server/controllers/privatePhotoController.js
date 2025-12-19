const PrivatePhotoRequest = require('../models/PrivatePhotoRequest');
const User = require('../models/User');

console.log('📸 CONTROLLER PRIVATE PHOTOS: Module chargé avec succès');

// Envoyer une demande d'accès aux photos privées
const sendPrivatePhotoRequest = async (req, res) => {
  console.log('📸 SEND REQUEST: Fonction appelée avec:', {
    body: req.body,
    userId: req.user?._id,
  });
  try {
    const { targetUserId, message } = req.body;
    const requesterId = req.user._id;

    // Vérifications de base
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: { message: 'ID utilisateur cible requis' },
      });
    }

    if (requesterId.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Impossible de faire une demande à soi-même' },
      });
    }

    // Vérifier que l'utilisateur cible existe
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: { message: 'Utilisateur non trouvé' },
      });
    }

    // Vérifier si une demande existe déjà
    const existingRequest = await PrivatePhotoRequest.findOne({
      requester: requesterId,
      target: targetUserId,
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        error: {
          message:
            existingRequest.status === 'pending'
              ? 'Demande déjà envoyée'
              : `Demande déjà ${existingRequest.status === 'accepted' ? 'acceptée' : 'refusée'}`,
        },
      });
    }

    // Créer la nouvelle demande
    const newRequest = new PrivatePhotoRequest({
      requester: requesterId,
      target: targetUserId,
      message: message || 'Aimerais voir vos photos privées',
    });

    await newRequest.save();

    res.json({
      success: true,
      message: "Demande d'accès envoyée avec succès",
      request: newRequest,
    });
  } catch (error) {
    console.error('Erreur envoi demande photo privée:', error);
    res.status(500).json({
      success: false,
      error: { message: "Erreur serveur lors de l'envoi de la demande" },
    });
  }
};

// Répondre à une demande (accepter/refuser)
const respondToPrivatePhotoRequest = async (req, res) => {
  try {
    const { requestId, action } = req.body; // action: 'accept' ou 'reject'
    const userId = req.user._id;

    if (!requestId || !action) {
      return res.status(400).json({
        success: false,
        error: { message: 'ID de demande et action requis' },
      });
    }

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Action invalide' },
      });
    }

    // Trouver la demande
    const request = await PrivatePhotoRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: { message: 'Demande non trouvée' },
      });
    }

    // Vérifier que l'utilisateur est bien le destinataire
    if (request.target.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: { message: 'Non autorisé à répondre à cette demande' },
      });
    }

    // Vérifier que la demande est en attente
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: 'Demande déjà traitée' },
      });
    }

    // Mettre à jour le statut
    request.status = action === 'accept' ? 'accepted' : 'rejected';
    request.respondedAt = new Date();
    await request.save();

    res.json({
      success: true,
      message:
        action === 'accept'
          ? 'Accès aux photos privées accordé'
          : 'Demande refusée',
      request: request,
    });
  } catch (error) {
    console.error('Erreur réponse demande photo privée:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur lors de la réponse' },
    });
  }
};

// Obtenir les demandes reçues (pour l'utilisateur connecté)
const getReceivedPrivatePhotoRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await PrivatePhotoRequest.find({
      target: userId,
    })
      .populate('requester', 'profile')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests: requests,
    });
  } catch (error) {
    console.error('Erreur récupération demandes:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur' },
    });
  }
};

// Obtenir les demandes envoyées (pour l'utilisateur connecté)
const getSentPrivatePhotoRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await PrivatePhotoRequest.find({
      requester: userId,
    })
      .populate('target', 'profile')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests: requests,
    });
  } catch (error) {
    console.error('Erreur récupération demandes envoyées:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur' },
    });
  }
};

// Vérifier si l'utilisateur a accès aux photos privées d'un autre utilisateur
const checkPrivatePhotoAccess = async (req, res) => {
  console.log('📸 CHECK ACCESS: Fonction appelée avec:', {
    params: req.params,
    userId: req.user?._id,
  });
  try {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    if (userId.toString() === targetUserId) {
      // L'utilisateur peut voir ses propres photos
      return res.json({
        success: true,
        hasAccess: true,
        isOwner: true,
      });
    }

    // Chercher une demande acceptée
    const acceptedRequest = await PrivatePhotoRequest.findOne({
      requester: userId,
      target: targetUserId,
      status: 'accepted',
    });

    res.json({
      success: true,
      hasAccess: !!acceptedRequest,
      isOwner: false,
    });
  } catch (error) {
    console.error('Erreur vérification accès photos:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur' },
    });
  }
};

// Supprimer une demande de photo privée
const deletePrivatePhotoRequest = async (req, res) => {
  console.log('🗑️ DELETE PHOTO REQUEST: Fonction appelée avec:', {
    params: req.params,
    userId: req.user?._id,
  });

  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    console.log(`🗑️ Tentative suppression demande ${requestId} par ${userId}`);

    // Trouver la demande et vérifier que l'utilisateur en est le propriétaire (requester)
    const request = await PrivatePhotoRequest.findOne({
      _id: requestId,
      requester: userId, // Seul celui qui a fait la demande peut la supprimer
    });

    if (!request) {
      console.log('❌ Demande non trouvée ou accès refusé');
      return res.status(404).json({
        success: false,
        error: {
          message:
            "Demande non trouvée ou vous n'avez pas l'autorisation de la supprimer",
        },
      });
    }

    // Supprimer définitivement de MongoDB
    await PrivatePhotoRequest.findByIdAndDelete(requestId);

    console.log(
      `✅ Demande de photo privée ${requestId} supprimée définitivement`
    );

    res.json({
      success: true,
      message: 'Demande supprimée définitivement',
    });
  } catch (error) {
    console.error('❌ Erreur suppression demande photo:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur lors de la suppression' },
    });
  }
};

module.exports = {
  sendPrivatePhotoRequest,
  respondToPrivatePhotoRequest,
  getReceivedPrivatePhotoRequests,
  getSentPrivatePhotoRequests,
  checkPrivatePhotoAccess,
  deletePrivatePhotoRequest,
};
