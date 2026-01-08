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

// Routes protégées avec auth normale (gestion premium dans controllers)
router.post('/', auth, updateLastActivity, sendMessageValidation, sendMessage); // POST /api/messages - Auth normale
router.get('/', auth, updateLastActivity, getMessages); // GET /api/messages - Auth normale
router.get('/stats', auth, updateLastActivity, getMessageStats); // GET /api/messages/stats
router.get('/conversation/:userId', auth, updateLastActivity, getConversation); // GET /api/messages/conversation/:userId
router.patch('/:messageId/read', auth, updateLastActivity, markAsRead); // PATCH /api/messages/:messageId/read
router.delete('/:messageId', auth, updateLastActivity, deleteMessage); // DELETE /api/messages/:messageId

// Routes pour les demandes de chat - Auth normale (gestion premium dans controllers)
router.get('/requests', auth, updateLastActivity, getPendingChatRequests); // GET /api/messages/requests

// Nouveau endpoint pour vérifier si on a envoyé une demande à un utilisateur spécifique
router.get(
  '/sent-request-status/:userId',
  auth,
  updateLastActivity,
  (req, res) => {
    const checkSentRequestStatus =
      require('../controllers/messageController').checkSentRequestStatus;
    checkSentRequestStatus(req, res);
  }
); // GET /api/messages/sent-request-status/:userId
router.post(
  '/requests/handle',
  auth,
  updateLastActivity,
  [
    body('messageId').isMongoId().withMessage('ID de message invalide'),
    body('action').isIn(['approve', 'reject']).withMessage('Action invalide'),
  ],
  handleChatRequest
); // POST /api/messages/requests/handle

// Récupérer les conversations approuvées
router.get(
  '/conversations',
  auth,
  updateLastActivity,
  getApprovedConversations
); // GET /api/messages/conversations

// Récupérer les messages d'une conversation spécifique
router.get(
  '/conversations/:otherUserId',
  auth,
  updateLastActivity,
  getConversationMessages
); // GET /api/messages/conversations/:otherUserId

// Marquer une conversation comme lue
router.post(
  '/mark-conversation-read',
  auth,
  updateLastActivity,
  [body('otherUserId').isMongoId().withMessage('ID utilisateur invalide')],
  markConversationAsRead
); // POST /api/messages/mark-conversation-read

module.exports = router;
