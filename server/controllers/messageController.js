const Message = require('../models/Message');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Envoyer un message
const sendMessage = async (req, res) => {
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

    const { toUserId, content, provenance, originalPostId } = req.body;
    const fromUserId = req.user._id;

    // Vérifier si l'utilisateur destinataire existe
    const toUser = await User.findById(toUserId);
    if (!toUser || toUser.security.isBlocked) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur destinataire non trouvé',
        },
      });
    }

    // Vérifier si l'utilisateur expéditeur est premium
    const fromUser = await User.findById(fromUserId);
    if (!fromUser.premium.isPremium) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PREMIUM_REQUIRED',
          message: 'Vous devez être membre premium pour envoyer des messages',
        },
      });
    }

    // Vérifier que l'utilisateur ne s'envoie pas un message à lui-même
    if (fromUserId.toString() === toUserId.toString()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SELF_MESSAGE',
          message: 'Vous ne pouvez pas vous envoyer un message à vous-même',
        },
      });
    }

    // Déterminer le modèle de provenance si originalPostId est fourni
    let provenanceModel;
    if (originalPostId) {
      if (provenance === 'annonces') {
        provenanceModel = 'Ad';
      } else if (provenance === 'ce-soir') {
        provenanceModel = 'TonightMeet';
      }
    }

    // Créer le message
    const message = new Message({
      fromUserId,
      toUserId,
      content: content.trim(),
      provenance,
      originalPostId,
      provenanceModel,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    await message.save();

    // Populer les informations de l'expéditeur pour la réponse
    await message.populate(
      'fromUserId',
      'profile.nom profile.age profile.sexe profile.localisation profile.photos'
    );

    res.status(201).json({
      success: true,
      message: {
        id: message._id,
        content: message.content,
        provenance: message.provenance,
        read: message.read,
        createdAt: message.createdAt,
        fromUser: {
          id: message.fromUserId._id,
          profile: message.fromUserId.profile,
        },
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi du message:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: "Erreur lors de l'envoi du message",
      },
    });
  }
};

// Récupérer les messages d'un utilisateur
const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    const messages = await Message.getUserMessages(
      userId,
      parseInt(page),
      parseInt(limit)
    );
    const unreadCount = await Message.getUnreadCount(userId);

    // Formater la réponse
    const formattedMessages = messages.map(message => ({
      id: message._id,
      content: message.content,
      provenance: message.provenance,
      read: message.read,
      createdAt: message.createdAt,
      fromUser: {
        id: message.fromUserId._id,
        profile: {
          nom: message.fromUserId.profile.nom,
          age: message.fromUserId.profile.age,
          sexe: message.fromUserId.profile.sexe,
          localisation: message.fromUserId.profile.localisation,
          photos: message.fromUserId.profile.photos || [],
        },
      },
    }));

    res.json({
      success: true,
      messages: formattedMessages,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Message.countDocuments({ toUserId: userId }),
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la récupération des messages',
      },
    });
  }
};

// Marquer un message comme lu
const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findOne({ _id: messageId, toUserId: userId });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MESSAGE_NOT_FOUND',
          message: 'Message non trouvé',
        },
      });
    }

    await message.markAsRead();

    res.json({
      success: true,
      message: 'Message marqué comme lu',
    });
  } catch (error) {
    console.error('Erreur lors du marquage du message comme lu:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors du marquage du message comme lu',
      },
    });
  }
};

// Récupérer les statistiques de messagerie
const getMessageStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalMessages = await Message.countDocuments({ toUserId: userId });
    const unreadMessages = await Message.countDocuments({
      toUserId: userId,
      read: false,
    });
    const sentMessages = await Message.countDocuments({ fromUserId: userId });

    // Messages par provenance
    const messagesByProvenance = await Message.aggregate([
      { $match: { toUserId: userId } },
      { $group: { _id: '$provenance', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      stats: {
        totalReceived: totalMessages,
        unread: unreadMessages,
        totalSent: sentMessages,
        byProvenance: messagesByProvenance,
      },
    });
  } catch (error) {
    console.error(
      'Erreur lors de la récupération des statistiques de messagerie:',
      error
    );
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message:
          'Erreur lors de la récupération des statistiques de messagerie',
      },
    });
  }
};

// Supprimer un message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findOne({ _id: messageId, toUserId: userId });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MESSAGE_NOT_FOUND',
          message: 'Message non trouvé',
        },
      });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({
      success: true,
      message: 'Message supprimé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du message:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la suppression du message',
      },
    });
  }
};

// Récupérer une conversation avec un utilisateur spécifique
const getConversation = async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user._id;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer les messages entre les deux utilisateurs
    const messages = await Message.find({
      $or: [
        { fromUserId: currentUserId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: currentUserId },
      ],
    })
      .populate(
        'fromUserId',
        'profile.nom profile.age profile.sexe profile.localisation profile.photos'
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Inverser l'ordre pour avoir les plus anciens en premier
    const formattedMessages = messages.reverse().map(message => ({
      id: message._id,
      content: message.content,
      provenance: message.provenance,
      read: message.read,
      createdAt: message.createdAt,
      isFromMe: message.fromUserId._id.toString() === currentUserId.toString(),
      fromUser: {
        id: message.fromUserId._id,
        profile: {
          nom: message.fromUserId.profile.nom,
          age: message.fromUserId.profile.age,
          sexe: message.fromUserId.profile.sexe,
          localisation: message.fromUserId.profile.localisation,
          photos: message.fromUserId.profile.photos || [],
        },
      },
    }));

    const total = await Message.countDocuments({
      $or: [
        { fromUserId: currentUserId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: currentUserId },
      ],
    });

    res.json({
      success: true,
      messages: formattedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la conversation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la récupération de la conversation',
      },
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  markAsRead,
  getMessageStats,
  deleteMessage,
  getConversation,
};
