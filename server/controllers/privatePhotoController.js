const PrivatePhotoRequest = require('../models/PrivatePhotoRequest');
const User = require('../models/User');
const PushNotificationService = require('../services/pushNotificationService'); // 🔔 PUSH NOTIFICATIONS
const mongoose = require('mongoose');

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
    const targetObjectId = new mongoose.Types.ObjectId(targetUserId);
    const existingRequest = await PrivatePhotoRequest.findOne({
      requester: requesterId,
      target: targetObjectId,
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
      target: targetObjectId,
      message: message || 'Aimerais voir vos photos privées',
    });

    await newRequest.save();

    // 🔔 NOTIFICATION PUSH - Envoyer notification pour demande de photo privée
    try {
      const requesterUser = await User.findById(requesterId);
      const senderName = requesterUser?.profile?.nom || "Quelqu'un";

      await PushNotificationService.sendPhotoRequestNotification(
        targetUserId,
        senderName
      );

      console.log('🔔 Notification push envoyée pour demande photo privée');
    } catch (pushError) {
      console.warn('⚠️ Erreur envoi notification push photo:', pushError);
      // Ne pas faire échouer la demande si la notification échoue
    }

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

    // Si accepté, émettre événement pour notifier l'utilisateur qui a fait la demande
    if (action === 'accept') {
      // 🔔 NOTIFICATION PUSH - Envoyer notification pour acceptation photo privée
      try {
        const targetUser = await User.findById(userId);
        const senderName = targetUser?.profile?.nom || "Quelqu'un";

        await PushNotificationService.sendPhotoAccessGrantedNotification(
          request.requester.toString(),
          senderName
        );

        console.log(
          '🔔 Notification push envoyée pour acceptation photo privée'
        );
      } catch (pushError) {
        console.warn(
          '⚠️ Erreur envoi notification push acceptation photo:',
          pushError
        );
        // Ne pas faire échouer l'acceptation si la notification échoue
      }

      // Socket.io événement temps réel
      const io = req.app.get('io');
      if (io) {
        console.log(
          '🔓 ÉMISSION ÉVÉNEMENT - Accès accordé pour:',
          request.requester
        );
        io.emit('privatePhotoAccessGranted', {
          targetUserId: userId.toString(), // ✅ CORRECTION : userId est l'utilisateur qui accepte
          requesterId: request.requester.toString(),
          message: `${req.user.profile.nom} vous a accordé l'accès à ses photos privées`,
        });
      }
    }

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

    console.log('🔍 DEBUG checkPrivatePhotoAccess - Début:', {
      requester: userId,
      target: targetUserId,
      requesterStr: userId.toString(),
      targetStr: targetUserId,
    });

    if (userId.toString() === targetUserId) {
      console.log('🔍 DEBUG - Utilisateur regarde ses propres photos');
      // L'utilisateur peut voir ses propres photos
      return res.json({
        success: true,
        hasAccess: true,
        isOwner: true,
      });
    }

    console.log('🔍 DEBUG - Recherche demande acceptée avec:', {
      requester: userId,
      target: targetUserId,
      status: 'accepted',
    });

    // Convertir targetUserId en ObjectId pour la requête MongoDB
    const targetObjectId = new mongoose.Types.ObjectId(targetUserId);

    // Chercher une demande acceptée
    const acceptedRequest = await PrivatePhotoRequest.findOne({
      requester: userId,
      target: targetObjectId,
      status: 'accepted',
    });

    console.log('🔍 DEBUG - Résultat recherche:', {
      found: !!acceptedRequest,
      acceptedRequest: acceptedRequest,
    });

    // Vérifier s'il y a des demandes dans la collection
    const allRequests = await PrivatePhotoRequest.find({
      requester: userId,
      target: targetObjectId,
    });

    console.log('🔍 DEBUG - Toutes les demandes pour cette paire:', {
      count: allRequests.length,
      requests: allRequests.map(r => ({
        id: r._id,
        status: r.status,
        createdAt: r.createdAt,
      })),
    });

    const hasAccess = !!acceptedRequest;
    const reason = acceptedRequest ? 'access_granted' : 'no_access';

    // ✅ NOUVELLE VÉRIFICATION: Seuls les membres premium peuvent voir les photos privées
    if (hasAccess && !req.user.premium.isPremium) {
      console.log('🚫 DEBUG - Accès refusé: utilisateur non-premium');
      return res.json({
        success: true,
        hasAccess: false,
        isOwner: false,
        reason: 'premium_required',
        message: 'Pour voir les photos privées, vous devez passer premium',
      });
    }

    console.log('🔍 DEBUG - Réponse finale:', {
      hasAccess,
      reason,
      isPremium: req.user.premium.isPremium,
    });

    res.json({
      success: true,
      hasAccess: hasAccess,
      isOwner: false,
      reason: reason,
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

    // Vérifier d'abord que la demande existe, peu importe le requester
    const anyRequest = await PrivatePhotoRequest.findById(requestId);
    console.log('🔍 Demande trouvée (any):', anyRequest ? 'OUI' : 'NON');
    if (anyRequest) {
      console.log('🔍 Détails demande:', {
        id: anyRequest._id,
        requester: anyRequest.requester,
        target: anyRequest.target,
        status: anyRequest.status,
      });
    }

    // Trouver la demande et vérifier que l'utilisateur en est le propriétaire (requester)
    const request = await PrivatePhotoRequest.findOne({
      _id: requestId,
      requester: userId, // Seul celui qui a fait la demande peut la supprimer
    });

    console.log('🔍 Demande trouvée (user specific):', request ? 'OUI' : 'NON');

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
    const deleteResult = await PrivatePhotoRequest.findByIdAndDelete(requestId);
    console.log('🗑️ Résultat suppression:', deleteResult ? 'SUCCÈS' : 'ÉCHEC');

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
