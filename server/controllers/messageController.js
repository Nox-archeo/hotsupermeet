const Message = require('../models/Message');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Import pour Socket.io - sera injecté par le serveur
let io;

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

    // Vérifier si l'utilisateur expéditeur est premium (temporairement désactivé pour les tests)
    const fromUser = await User.findById(fromUserId);

    // Vérifier le statut premium de l'expéditeur pour les limites
    const fromUserPremium =
      fromUser.premium.isPremium && fromUser.premium.expiration > new Date();

    console.log(
      `📊 FREEMIUM - Expéditeur ${fromUser.profile.nom} Premium: ${fromUserPremium}`
    );

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

    // Vérifier l'état de la conversation entre ces deux utilisateurs
    const existingMessages = await Message.find({
      $or: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
    }).sort({ createdAt: 1 });

    console.log('🔍 MESSAGES EXISTANTS - Nombre:', existingMessages.length);
    console.log(
      '🔍 MESSAGES EXISTANTS - Détails:',
      existingMessages.map(m => ({
        id: m._id,
        from: m.fromUserId,
        to: m.toUserId,
        status: m.status,
        isInitialRequest: m.isInitialRequest,
        content: m.content.substring(0, 30),
        createdAt: m.createdAt,
      }))
    );

    let isInitialRequest = false;
    let messageStatus = 'approved'; // Par défaut approuvé pour conversations existantes

    // Vérifier si la conversation est déjà approuvée
    const hasApprovedMessages = existingMessages.some(
      msg => msg.status === 'approved'
    );
    const hasPendingRequest = existingMessages.some(
      msg => msg.isInitialRequest && msg.status === 'pending'
    );

    console.log(
      '📊 STATUT CONVERSATION - hasApprovedMessages:',
      hasApprovedMessages
    );
    console.log(
      '📊 STATUT CONVERSATION - hasPendingRequest:',
      hasPendingRequest
    );

    if (!hasApprovedMessages && !hasPendingRequest) {
      // Pas de conversation approuvée ET pas de demande en attente = première demande
      isInitialRequest = true;
      messageStatus = 'pending';
    } else if (hasPendingRequest && !hasApprovedMessages) {
      // Il y a déjà une demande en attente - on la SUPPRIME d'abord pour nettoyer
      console.log(
        '🗑️ NETTOYAGE - Suppression des anciennes demandes en double'
      );
      await Message.deleteMany({
        $or: [
          { fromUserId, toUserId, isInitialRequest: true, status: 'pending' },
          {
            fromUserId: toUserId,
            toUserId: fromUserId,
            isInitialRequest: true,
            status: 'pending',
          },
        ],
      });

      // Puis on crée la nouvelle demande proprement
      isInitialRequest = true;
      messageStatus = 'pending';
    } else if (!hasApprovedMessages) {
      // Pas de messages approuvés, mais pas de demande non plus = première demande
      isInitialRequest = true;
      messageStatus = 'pending';
    } else {
      // CONVERSATION DÉJÀ APPROUVÉE: nouveaux messages automatiquement approuvés
      console.log(
        '✅ CONVERSATION APPROUVÉE - Nouveau message automatiquement approuvé'
      );
      isInitialRequest = false;
      messageStatus = 'approved';
    }

    // 🚨 VÉRIFICATION LIMITE MESSAGES NON-PREMIUM (dans conversations approuvées)
    if (!fromUserPremium && hasApprovedMessages) {
      // Vérifier si le destinataire est premium
      const toUser = await User.findById(toUserId);
      const toUserPremium =
        toUser?.premium?.isPremium && toUser.premium.expiration > new Date();

      console.log(
        `💎 DESTINATAIRE - ${toUser?.profile?.nom || 'Inconnu'} Premium: ${toUserPremium}`
      );

      // 💰 RÈGLE PREMIUM: Non-premium + Premium = Messages illimités
      if (toUserPremium) {
        console.log(
          '🌟 NON-PREMIUM AVEC PREMIUM - Messages illimités autorisés!'
        );
      } else {
        // Non-premium + Non-premium = Limite personnalisée ou 3 par défaut
        const senderUser = await User.findById(fromUserId);
        const messageLimit = senderUser?.messageLimit || 3; // Limite personnalisée ou 3 par défaut
        
        const userMessagesInConversation = existingMessages.filter(
          msg =>
            msg.fromUserId.toString() === fromUserId.toString() &&
            msg.status === 'approved'
        );

        console.log(
          `🔒 NON-PREMIUM avec NON-PREMIUM - Messages envoyés: ${userMessagesInConversation.length}/${messageLimit}`
        );

        if (userMessagesInConversation.length >= messageLimit) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'MESSAGE_LIMIT_REACHED',
              message:
                `Limite de ${messageLimit} messages atteinte entre non-premium. Discutez avec des premium ou passez premium pour des messages illimités!`,
              redirectTo: '/pages/premium.html',
              messagesUsed: userMessagesInConversation.length,
              messagesLimit: messageLimit,
            },
          });
        }
      }
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
      status: messageStatus,
      isInitialRequest,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    await message.save();

    console.log('💬 MESSAGE DEBUG - Message créé:', {
      id: message._id,
      from: fromUserId,
      to: toUserId,
      content: content.substring(0, 50),
      status: messageStatus,
      isInitialRequest: isInitialRequest,
    });

    // NOUVEAU DEBUG - Vérifier immédiatement après sauvegarde
    const verifyMessage = await Message.findById(message._id);
    console.log('✅ VERIFICATION DEBUG - Message en base:', {
      id: verifyMessage._id,
      fromUserId: verifyMessage.fromUserId,
      toUserId: verifyMessage.toUserId,
      status: verifyMessage.status,
      isInitialRequest: verifyMessage.isInitialRequest,
      savedCorrectly: !!verifyMessage,
    });

    // Populer les informations de l'expéditeur pour la réponse
    await message.populate(
      'fromUserId',
      'profile.nom profile.age profile.sexe profile.localisation profile.photos'
    );

    // ✨ TEMPS RÉEL: Émettre le nouveau message via Socket.io
    if (io) {
      // FIX: S'assurer que les IDs sont des strings
      const fromUserIdStr =
        typeof fromUserId === 'object'
          ? fromUserId.toString()
          : fromUserId.toString();
      const toUserIdStr =
        typeof toUserId === 'object'
          ? toUserId.toString()
          : toUserId.toString();

      const conversationId = [fromUserIdStr, toUserIdStr].sort().join('_');

      console.log(`💬 Message diffusé dans conversation ${conversationId}`);

      // 🔍 DIAGNOSTIC spécial pour Gog et Camille
      if (
        (fromUserIdStr.includes('68fa5bfc53aebaf1f87b7860') &&
          toUserIdStr.includes('690a028ad47c3ebe2c370057')) ||
        (fromUserIdStr.includes('690a028ad47c3ebe2c370057') &&
          toUserIdStr.includes('68fa5bfc53aebaf1f87b7860'))
      ) {
        console.log('🚨 DIAGNOSTIC GOG↔CAMILLE - Émission message');
        console.log(
          '🚨 FromUserId (brut):',
          fromUserId,
          'Type:',
          typeof fromUserId
        );
        console.log('🚨 ToUserId (brut):', toUserId, 'Type:', typeof toUserId);
        console.log('🚨 FromUserIdStr:', fromUserIdStr);
        console.log('🚨 ToUserIdStr:', toUserIdStr);
        console.log('🚨 ConversationId:', conversationId);
        console.log('🚨 MessageStatus:', messageStatus);
        console.log('🚨 Room Socket.io:', `conversation_${conversationId}`);
        console.log('🚨 Message content:', message.content);
      }

      if (messageStatus === 'approved') {
        // Message approuvé - diffuser immédiatement
        io.to(`conversation_${conversationId}`).emit('message-received', {
          messageId: message._id,
          fromUserId: fromUserIdStr,
          toUserId: toUserIdStr,
          message: {
            content: message.content,
            createdAt: message.createdAt,
            fromUser: {
              id: message.fromUserId._id,
              profile: message.fromUserId.profile,
            },
          },
          status: message.status,
          isInitialRequest: message.isInitialRequest,
        });
      } else if (messageStatus === 'pending' && isInitialRequest) {
        // Nouvelle demande de chat - notifier le destinataire
        io.emit('chat-request-received', {
          toUserId: toUserId.toString(),
          requestData: {
            _id: message._id,
            content: message.content,
            fromUser: {
              id: message.fromUserId._id,
              profile: message.fromUserId.profile,
            },
            provenance: message.provenance,
            createdAt: message.createdAt,
            status: message.status,
            isInitialRequest: message.isInitialRequest,
          },
        });
      }

      console.log(`🚀 Socket.io: Message émis (status: ${messageStatus})`);
    }

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

// Approuver ou rejeter une demande de chat - ACCÈS FREEMIUM
const handleChatRequest = async (req, res) => {
  try {
    const { messageId, action } = req.body; // action: 'approve' ou 'reject'
    const currentUserId = req.user._id;

    console.log(
      `🌍 FREEMIUM - Utilisateur ${currentUserId} ${action} demande ${messageId}`
    );

    // Trouver le message de demande
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MESSAGE_NOT_FOUND',
          message: 'Demande de chat non trouvée',
        },
      });
    }

    // Vérifier que c'est bien le destinataire qui répond
    if (message.toUserId.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: "Vous ne pouvez répondre qu'à vos propres demandes",
        },
      });
    }

    // Vérifier que c'est bien une demande initiale en attente
    if (!message.isInitialRequest || message.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Cette demande ne peut plus être traitée',
        },
      });
    }

    // Mettre à jour le statut
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    message.status = newStatus;
    await message.save();

    res.json({
      success: true,
      message: `Demande de chat ${action === 'approve' ? 'approuvée' : 'rejetée'}`,
      chatStatus: newStatus,
    });
  } catch (error) {
    console.error('Erreur lors du traitement de la demande:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors du traitement de la demande',
      },
    });
  }
};

// Récupérer les demandes de chat en attente
const getPendingChatRequests = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    console.log(
      '🔍 DEMANDES DEBUG - Recherche demandes pour userId:',
      currentUserId
    );

    // NOUVEAU DEBUG - Voir tous les messages du destinataire pour comprendre
    const allMessagesForUser = await Message.find({ toUserId: currentUserId });
    console.log(
      '🔍 TOUS MESSAGES DEBUG - Messages reçus par cet utilisateur:',
      allMessagesForUser.map(m => ({
        id: m._id,
        from: m.fromUserId,
        status: m.status,
        isInitialRequest: m.isInitialRequest,
        content: m.content.substring(0, 30),
      }))
    );

    const requests = await Message.find({
      toUserId: currentUserId,
      isInitialRequest: true,
      status: 'pending',
    })
      .populate(
        'fromUserId',
        'profile.nom profile.age profile.sexe profile.localisation profile.photos'
      )
      .sort({ createdAt: -1 });

    console.log(
      '📨 DEMANDES DEBUG - Nombre de demandes trouvées:',
      requests.length
    );
    console.log(
      '📨 DEMANDES DEBUG - Demandes:',
      requests.map(r => ({
        id: r._id,
        from: r.fromUserId.profile.nom,
        content: r.content.substring(0, 50),
        status: r.status,
        isInitialRequest: r.isInitialRequest,
      }))
    );

    const formattedRequests = requests.map(request => ({
      id: request._id,
      content: request.content,
      createdAt: request.createdAt,
      fromUser: {
        id: request.fromUserId._id,
        nom: request.fromUserId.profile.nom,
        age: request.fromUserId.profile.age,
        sexe: request.fromUserId.profile.sexe,
        localisation: request.fromUserId.profile.localisation,
        photo:
          request.fromUserId.profile.photos?.find(p => p.isProfile)?.path ||
          null,
      },
    }));

    res.json({
      success: true,
      requests: formattedRequests,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la récupération des demandes',
      },
    });
  }
};

// Récupérer les conversations approuvées
const getApprovedConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    console.log('🔍 DEBUG getApprovedConversations - userId:', currentUserId);
    console.log(
      '🔍 DEBUG getApprovedConversations - user nom:',
      req.user.profile?.nom
    );

    // Récupérer toutes les conversations où l'utilisateur a des messages approuvés
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ fromUserId: currentUserId }, { toUserId: currentUserId }],
          status: 'approved',
        },
      },
      {
        $group: {
          _id: {
            otherUser: {
              $cond: {
                if: { $eq: ['$fromUserId', currentUserId] },
                then: '$toUserId',
                else: '$fromUserId',
              },
            },
          },
          lastMessage: { $last: '$content' },
          lastMessageDate: { $last: '$createdAt' },
          messageCount: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ['$toUserId', currentUserId] },
                    { $eq: ['$read', false] },
                  ],
                },
                then: 1,
                else: 0,
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id.otherUser',
          foreignField: '_id',
          as: 'otherUserData',
        },
      },
      {
        $unwind: '$otherUserData',
      },
      {
        $sort: { lastMessageDate: -1 },
      },
    ]);

    console.log(
      '🔍 DEBUG getApprovedConversations - résultats bruts:',
      conversations.length
    );
    console.log(
      '🔍 DEBUG getApprovedConversations - premier résultat:',
      conversations[0]
    );

    const formattedConversations = conversations.map(conv => {
      const profilePhoto = conv.otherUserData.profile.photos?.find(
        p => p.isProfile
      );
      console.log(`🔍 DEBUG - Photo pour ${conv.otherUserData.profile.nom}:`, {
        photos: conv.otherUserData.profile.photos,
        profilePhoto: profilePhoto,
        path: profilePhoto?.path,
      });

      return {
        id: conv._id.otherUser,
        otherUser: {
          id: conv.otherUserData._id.toString(), // Convertir ObjectId en string
          nom: conv.otherUserData.profile.nom,
          age: conv.otherUserData.profile.age,
          sexe: conv.otherUserData.profile.sexe,
          photo: profilePhoto?.path || '/images/default-avatar.jpg',
        },
        lastMessage: conv.lastMessage,
        lastMessageDate: conv.lastMessageDate,
        messageCount: conv.messageCount,
        unreadCount: conv.unreadCount || 0,
      };
    });

    res.json({
      success: true,
      conversations: formattedConversations,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des conversations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la récupération des conversations',
      },
    });
  }
};

// Récupérer les messages d'une conversation spécifique
const getConversationMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Récupérer les messages entre les deux utilisateurs
    const messages = await Message.find({
      $and: [
        {
          $or: [
            { fromUserId: userId, toUserId: otherUserId },
            { fromUserId: otherUserId, toUserId: userId },
          ],
        },
        {
          $or: [
            { status: 'approved' },
            // Inclure aussi les messages pending de l'utilisateur connecté pour affichage immédiat
            { fromUserId: userId, status: 'pending' },
          ],
        },
      ],
    })
      .populate('fromUserId', 'profile.nom profile.photos')
      .populate('toUserId', 'profile.nom profile.photos')
      .sort({ createdAt: 1 }) // Ordre chronologique
      .limit(parseInt(limit));

    // Formater les messages
    const formattedMessages = messages.map(message => ({
      id: message._id,
      content: message.content,
      createdAt: message.createdAt,
      isOwn: message.fromUserId._id.toString() === userId.toString(),
      sender: {
        id: message.fromUserId._id,
        nom: message.fromUserId.profile.nom,
        photo:
          message.fromUserId.profile.photos?.find(p => p.isProfile)?.path ||
          '/images/default-avatar.jpg',
      },
    }));

    // FORCER ANTI-CACHE pour les messages en temps réel
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      ETag: false,
    });

    res.json({
      success: true,
      messages: formattedMessages,
    });
  } catch (error) {
    console.error(
      'Erreur lors de la récupération des messages de conversation:',
      error
    );
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la récupération des messages',
      },
    });
  }
};

// Marquer tous les messages d'une conversation comme lus
const markConversationAsRead = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { otherUserId } = req.body;

    // Marquer tous les messages non lus de cette conversation comme lus
    const result = await Message.updateMany(
      {
        fromUserId: otherUserId,
        toUserId: currentUserId,
        read: false,
      },
      {
        read: true,
      }
    );

    res.json({
      success: true,
      markedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Erreur marquage conversation comme lue:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors du marquage comme lu',
      },
    });
  }
};

// Vérifier si l'utilisateur a déjà envoyé une demande à un autre utilisateur
const checkSentRequestStatus = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    // Chercher si il y a déjà une demande envoyée (pending ou approved)
    const existingRequest = await Message.findOne({
      fromUserId: currentUserId,
      toUserId: targetUserId,
      isInitialRequest: true,
    });

    res.json({
      success: true,
      hasSentRequest: !!existingRequest,
      requestStatus: existingRequest?.status || null,
    });
  } catch (error) {
    console.error('Erreur vérification demande envoyée:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification',
    });
  }
};

// Fonction pour initialiser Socket.io
const setSocketIO = socketIO => {
  io = socketIO;
};

module.exports = {
  sendMessage,
  getMessages,
  markAsRead,
  getMessageStats,
  deleteMessage,
  getConversation,
  handleChatRequest,
  getPendingChatRequests,
  getApprovedConversations,
  checkSentRequestStatus,
  getConversationMessages,
  markConversationAsRead,
  setSocketIO,
};
