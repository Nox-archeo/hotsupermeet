const express = require('express');
const {
  uploadProfilePhoto,
  uploadGalleryPhoto,
  uploadPrivatePhoto,
  uploadAdPhotos,
  togglePhotoBlur,
  deletePhoto,
  setProfilePhoto,
  handleUnblurRequest,
  handleUnblurResponse,
} = require('../controllers/uploadController');
const { auth, updateLastActivity } = require('../middleware/auth');

const router = express.Router();

// NOTE: Le middleware express-fileupload est déjà configuré globalement dans server.js
// Pas besoin de le redéfinir ici car cela cause des conflits de parsing multipart

// Routes protégées pour l'upload et la gestion des photos
router.post('/profile-photo', auth, updateLastActivity, uploadProfilePhoto);
router.post('/gallery-photo', auth, updateLastActivity, uploadGalleryPhoto);
router.post('/private-photo', auth, updateLastActivity, uploadPrivatePhoto);
router.post('/ad-photos', auth, updateLastActivity, uploadAdPhotos);
router.patch('/photo/:photoId/blur', auth, updateLastActivity, togglePhotoBlur);
router.delete('/photo/:photoId', auth, updateLastActivity, deletePhoto);
router.patch(
  '/photo/:photoId/set-profile',
  auth,
  updateLastActivity,
  setProfilePhoto
);
router.post(
  '/photo/:photoId/unblur-request',
  auth,
  updateLastActivity,
  handleUnblurRequest
);
router.post(
  '/unblur-response/:messageId',
  auth,
  updateLastActivity,
  handleUnblurResponse
);

module.exports = router;
