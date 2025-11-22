const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  sendPrivatePhotoRequest,
  respondToPrivatePhotoRequest,
  getReceivedPrivatePhotoRequests,
  getSentPrivatePhotoRequests,
  checkPrivatePhotoAccess,
} = require('../controllers/privatePhotoController_simple');

// Envoyer une demande d'accès aux photos privées
router.post('/send-request', auth, sendPrivatePhotoRequest);

// Répondre à une demande (accepter/refuser)
router.post('/respond', auth, respondToPrivatePhotoRequest);

// Obtenir les demandes reçues
router.get('/received', auth, getReceivedPrivatePhotoRequests);

// Obtenir les demandes envoyées
router.get('/sent', auth, getSentPrivatePhotoRequests);

// Vérifier l'accès aux photos privées d'un utilisateur
router.get('/check-access/:targetUserId', auth, checkPrivatePhotoAccess);

module.exports = router;
