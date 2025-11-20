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
} = require('../controllers/messageController');
const { auth, updateLastActivity } = require('../middleware/auth');

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
    .isIn(['annuaire', 'annonces', 'ce-soir'])
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

// Routes protégées
router.post('/', auth, updateLastActivity, sendMessageValidation, sendMessage); // POST /api/messages
router.get('/', auth, updateLastActivity, getMessages); // GET /api/messages?page=1&limit=20
router.get('/stats', auth, updateLastActivity, getMessageStats); // GET /api/messages/stats
router.get('/conversation/:userId', auth, updateLastActivity, getConversation); // GET /api/messages/conversation/:userId?page=1&limit=50
router.patch('/:messageId/read', auth, updateLastActivity, markAsRead); // PATCH /api/messages/:messageId/read
router.delete('/:messageId', auth, updateLastActivity, deleteMessage); // DELETE /api/messages/:messageId

// Routes pour les demandes de chat
router.get('/requests', auth, updateLastActivity, getPendingChatRequests); // GET /api/messages/requests
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
); // GET /api/messages/conversations - FIXED 2025-11-20

// Récupérer les messages d'une conversation spécifique
router.get(
  '/conversations/:otherUserId',
  auth,
  updateLastActivity,
  getConversationMessages
); // GET /api/messages/conversations/:otherUserId

module.exports = router;
