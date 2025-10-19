const express = require('express');
const fileUpload = require('express-fileupload');
const {
  uploadProfilePhoto,
  uploadGalleryPhoto,
  togglePhotoBlur,
  deletePhoto,
  setProfilePhoto,
  handleUnblurRequest,
} = require('../controllers/uploadController');
const { auth, updateLastActivity } = require('../middleware/auth');

const router = express.Router();

// Configuration du middleware d'upload
router.use(
  fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    abortOnLimit: true,
    createParentPath: true,
    useTempFiles: true,
    tempFileDir: '/tmp/',
  })
);

// Routes protégées pour l'upload et la gestion des photos
router.post('/profile-photo', auth, updateLastActivity, uploadProfilePhoto);
router.post('/gallery-photo', auth, updateLastActivity, uploadGalleryPhoto);
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

module.exports = router;
