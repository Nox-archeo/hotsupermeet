const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

console.log('📸 MODULE PRIVATE PHOTOS ROUTER: Chargement du controller...');

try {
  const {
    sendPrivatePhotoRequest,
    respondToPrivatePhotoRequest,
    getReceivedPrivatePhotoRequests,
    getSentPrivatePhotoRequests,
    checkPrivatePhotoAccess,
    deletePrivatePhotoRequest,
  } = require('../controllers/privatePhotoController');

  console.log('✅ PRIVATE PHOTOS: Controller chargé avec succès');

  // Envoyer une demande d'accès aux photos privées
  console.log('🔗 PRIVATE PHOTOS: Montage route POST /send-request');
  router.post('/send-request', auth, sendPrivatePhotoRequest);

  // Répondre à une demande (accepter/refuser)
  console.log('🔗 PRIVATE PHOTOS: Montage route POST /respond');
  router.post('/respond', auth, respondToPrivatePhotoRequest);

  // Obtenir les demandes reçues
  console.log('🔗 PRIVATE PHOTOS: Montage route GET /received');
  router.get('/received', auth, getReceivedPrivatePhotoRequests);

  // Obtenir les demandes envoyées
  console.log('🔗 PRIVATE PHOTOS: Montage route GET /sent');
  router.get('/sent', auth, getSentPrivatePhotoRequests);

  // Vérifier l'accès aux photos privées d'un utilisateur
  console.log(
    '🔗 PRIVATE PHOTOS: Montage route GET /check-access/:targetUserId'
  );
  router.get('/check-access/:targetUserId', auth, checkPrivatePhotoAccess);

  // Supprimer une demande de photo privée
  console.log('🔗 PRIVATE PHOTOS: Montage route DELETE /delete/:requestId');
  router.delete('/delete/:requestId', auth, deletePrivatePhotoRequest);

  console.log('✅ PRIVATE PHOTOS: Toutes les routes montées avec succès');
} catch (error) {
  console.error(
    '❌ PRIVATE PHOTOS: Erreur lors du chargement du controller:',
    error
  );
  console.error('❌ Stack:', error.stack);
}

module.exports = router;
