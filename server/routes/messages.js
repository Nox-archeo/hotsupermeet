const express = require('express');
const { body } = require('express-validator');
const {
  sendMessage,
  getMessages,
  markAsRead,
  getMessageStats,
  deleteMessage,
  getConversation,
  handleChatRequest,
  getPendingChatRequests,
  getApprovedConversations,
  getConversationMessages,
  markConversationAsRead,
} = require('../controllers/messageController');
const { auth, updateLastActivity } = require('../middleware/auth');
const { premiumOnly, premiumLimited } = require('../middleware/premium');

const router = express.Router();

// Règles de validation
const sendMessageValidation = [
  body('toUserId')
    .notEmpty()
    .isMongoId()
    .withMessage('ID utilisateur destinataire invalide'),
  body('content')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Le message doit contenir entre 1 et 1000 caractères'),
  body('provenance')
    .isIn(['annuaire', 'annonces', 'ce-soir', 'conversation'])
    .withMessage('Provenance invalide'),
  body('originalPostId')
    .optional()
    .isMongoId()
    .withMessage('ID de post original invalide'),
];

const paginationValidation = [
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La page doit être un nombre positif'),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La limite doit être comprise entre 1 et 100'),
];

// ⛔ ROUTES STRICTEMENT PREMIUM - MESSAGERIE 100% BLOQUÉE POUR NON-PREMIUM
// Routes protégées avec PREMIUM OBLIGATOIRE
router.post(
  '/',
  auth,
  updateLastActivity,
  premiumOnly, // ⛔ PREMIUM REQUIS - PAS DE QUOTAS
  sendMessageValidation,
  sendMessage
); // POST /api/messages - PREMIUM REQUIS
router.get('/', auth, updateLastActivity, premiumOnly, getMessages); // GET /api/messages - PREMIUM REQUIS
router.get('/stats', auth, updateLastActivity, premiumOnly, getMessageStats); // GET /api/messages/stats - PREMIUM REQUIS
router.get(
  '/conversation/:userId',
  auth,
  updateLastActivity,
  premiumOnly,
  getConversation
); // GET /api/messages/conversation/:userId - PREMIUM REQUIS
router.patch(
  '/:messageId/read',
  auth,
  updateLastActivity,
  premiumOnly,
  markAsRead
); // PATCH /api/messages/:messageId/read - PREMIUM REQUIS
router.delete(
  '/:messageId',
  auth,
  updateLastActivity,
  premiumOnly,
  deleteMessage
); // DELETE /api/messages/:messageId - PREMIUM REQUIS

// ⛔ Routes pour les demandes de chat - PREMIUM REQUIS
router.get(
  '/requests',
  auth,
  updateLastActivity,
  premiumOnly,
  getPendingChatRequests
); // GET /api/messages/requests - PREMIUM REQUIS
router.post(
  '/requests/handle',
  auth,
  updateLastActivity,
  premiumOnly, // ⛔ PREMIUM REQUIS
  [
    body('messageId').isMongoId().withMessage('ID de message invalide'),
    body('action').isIn(['approve', 'reject']).withMessage('Action invalide'),
  ],
  handleChatRequest
); // POST /api/messages/requests/handle - PREMIUM REQUIS

// ⛔ Récupérer les conversations approuvées - PREMIUM REQUIS
router.get(
  '/conversations',
  auth,
  updateLastActivity,
  premiumOnly, // ⛔ PREMIUM REQUIS
  getApprovedConversations
); // GET /api/messages/conversations - PREMIUM REQUIS

// ⛔ Récupérer les messages d'une conversation spécifique - PREMIUM REQUIS
router.get(
  '/conversations/:otherUserId',
  auth,
  updateLastActivity,
  premiumOnly, // ⛔ PREMIUM REQUIS
  getConversationMessages
); // GET /api/messages/conversations/:otherUserId - PREMIUM REQUIS

// ⛔ Marquer une conversation comme lue - PREMIUM REQUIS
router.post(
  '/mark-conversation-read',
  auth,
  updateLastActivity,
  premiumOnly, // ⛔ PREMIUM REQUIS
  [body('otherUserId').isMongoId().withMessage('ID utilisateur invalide')],
  markConversationAsRead
); // POST /api/messages/mark-conversation-read - PREMIUM REQUIS

module.exports = router;
