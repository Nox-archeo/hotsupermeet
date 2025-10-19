const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');

// Configuration du dossier d'upload
const UPLOAD_DIR = process.env.UPLOAD_PATH || './uploads';
const PROFILE_PHOTOS_DIR = path.join(UPLOAD_DIR, 'profile-photos');

// S'assurer que les dossiers existent
const ensureUploadDirs = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROFILE_PHOTOS_DIR)) {
    fs.mkdirSync(PROFILE_PHOTOS_DIR, { recursive: true });
  }
};

// Upload de photo de profil
const uploadProfilePhoto = async (req, res) => {
  try {
    ensureUploadDirs();

    if (!req.files || !req.files.photo) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'Aucune photo fournie',
        },
      });
    }

    const photo = req.files.photo;
    const userId = req.user._id;

    // Vérifier le type de fichier
    if (!photo.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Le fichier doit être une image',
        },
      });
    }

    // Vérifier la taille (max 5MB)
    if (photo.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'L\\' + 'image ne doit pas dépasser 5MB',
        },
      });
    }

    // Générer un nom de fichier unique
    const fileExtension = path.extname(photo.name);
    const fileName = `${userId}_${Date.now()}${fileExtension}`;
    const filePath = path.join(PROFILE_PHOTOS_DIR, fileName);

    // Sauvegarder le fichier
    await photo.mv(filePath);

    // Mettre à jour le profil utilisateur avec la nouvelle photo
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Ajouter la photo au tableau de photos
    const photoData = {
      filename: fileName,
      path: `/uploads/profile-photos/${fileName}`,
      isBlurred: true, // Par défaut floutée pour la confidentialité
      isProfile: true, // Photo de profil principale
      uploadedAt: new Date(),
    };

    // Si c'est la première photo, la définir comme photo de profil
    if (!user.profile.photos || user.profile.photos.length === 0) {
      user.profile.photos = [photoData];
    } else {
      // Ajouter aux photos existantes
      user.profile.photos.push(photoData);
    }

    await user.save();

    res.json({
      success: true,
      photo: photoData,
      message: 'Photo de profil uploadée avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de l\\' + 'upload de la photo:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'Erreur lors de l\\' + 'upload de la photo',
      },
    });
  }
};

// Upload de photo de galerie
const uploadGalleryPhoto = async (req, res) => {
  try {
    ensureUploadDirs();

    if (!req.files || !req.files.photo) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'Aucune photo fournie',
        },
      });
    }

    const photo = req.files.photo;
    const userId = req.user._id;
    const { isBlurred = false } = req.body;

    // Vérifier le type de fichier
    if (!photo.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Le fichier doit être une image',
        },
      });
    }

    // Vérifier la taille (max 5MB)
    if (photo.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'L\\' + 'image ne doit pas dépasser 5MB',
        },
      });
    }

    // Générer un nom de fichier unique
    const fileExtension = path.extname(photo.name);
    const fileName = `${userId}_gallery_${Date.now()}${fileExtension}`;
    const filePath = path.join(PROFILE_PHOTOS_DIR, fileName);

    // Sauvegarder le fichier
    await photo.mv(filePath);

    // Mettre à jour le profil utilisateur avec la nouvelle photo de galerie
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    const photoData = {
      filename: fileName,
      path: `/uploads/profile-photos/${fileName}`,
      isBlurred: true, // Par défaut floutée pour la confidentialité
      isProfile: false, // Photo de galerie
      uploadedAt: new Date(),
    };

    // Initialiser le tableau de photos si nécessaire
    if (!user.profile.photos) {
      user.profile.photos = [];
    }

    // Ajouter la photo de galerie
    user.profile.photos.push(photoData);
    await user.save();

    res.json({
      success: true,
      photo: photoData,
      message: 'Photo de galerie uploadée avec succès',
    });
  } catch (error) {
    console.error(
      'Erreur lors de l\\' + 'upload de la photo de galerie:',
      error
    );
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'Erreur lors de l\\' + 'upload de la photo de galerie',
      },
    });
  }
};

// Basculer le floutage d'une photo
const togglePhotoBlur = async (req, res) => {
  try {
    const { photoId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Trouver la photo dans le tableau
    const photoIndex = user.profile.photos.findIndex(
      photo => photo._id.toString() === photoId
    );

    if (photoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PHOTO_NOT_FOUND',
          message: 'Photo non trouvée',
        },
      });
    }

    // Basculer le floutage
    user.profile.photos[photoIndex].isBlurred =
      !user.profile.photos[photoIndex].isBlurred;

    await user.save();

    res.json({
      success: true,
      photo: user.profile.photos[photoIndex],
      message: `Photo ${user.profile.photos[photoIndex].isBlurred ? 'floutée' : 'défloutée'} avec succès`,
    });
  } catch (error) {
    console.error('Erreur lors du basculement du floutage:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOGGLE_BLUR_ERROR',
        message: 'Erreur lors du basculement du floutage',
      },
    });
  }
};

// Supprimer une photo
const deletePhoto = async (req, res) => {
  try {
    const { photoId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Trouver la photo dans le tableau
    const photoIndex = user.profile.photos.findIndex(
      photo => photo._id.toString() === photoId
    );

    if (photoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PHOTO_NOT_FOUND',
          message: 'Photo non trouvée',
        },
      });
    }

    const photo = user.profile.photos[photoIndex];

    // Supprimer le fichier physique
    const filePath = path.join(UPLOAD_DIR, photo.path.replace('/uploads/', ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Supprimer du tableau
    user.profile.photos.splice(photoIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Photo supprimée avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la photo:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_PHOTO_ERROR',
        message: 'Erreur lors de la suppression de la photo',
      },
    });
  }
};

// Définir une photo comme photo de profil principale
const setProfilePhoto = async (req, res) => {
  try {
    const { photoId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Réinitialiser toutes les photos comme non principales
    user.profile.photos.forEach(photo => {
      photo.isProfile = false;
    });

    // Définir la photo sélectionnée comme principale
    const photoIndex = user.profile.photos.findIndex(
      photo => photo._id.toString() === photoId
    );

    if (photoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PHOTO_NOT_FOUND',
          message: 'Photo non trouvée',
        },
      });
    }

    user.profile.photos[photoIndex].isProfile = true;
    await user.save();

    res.json({
      success: true,
      message: 'Photo de profil mise à jour avec succès',
      profilePhoto: user.profile.photos[photoIndex],
    });
  } catch (error) {
    console.error('Erreur lors de la définition de la photo de profil:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SET_PROFILE_PHOTO_ERROR',
        message: 'Erreur lors de la définition de la photo de profil',
      },
    });
  }
};

// Gérer une demande de dévoilement de photo
const handleUnblurRequest = async (req, res) => {
  try {
    const { photoId } = req.params;
    const { targetUserId } = req.body;
    const requestingUserId = req.user._id;

    // Vérifier que l'utilisateur cible existe
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur cible non trouvé',
        },
      });
    }

    // Trouver la photo dans le profil de l'utilisateur cible
    const photoIndex = targetUser.profile.photos.findIndex(
      photo => photo._id.toString() === photoId
    );

    if (photoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PHOTO_NOT_FOUND',
          message: 'Photo non trouvée',
        },
      });
    }

    const photo = targetUser.profile.photos[photoIndex];

    // Vérifier si la photo est déjà dévoilée
    if (!photo.isBlurred) {
      return res.json({
        success: true,
        message: 'La photo est déjà dévoilée',
        photo: photo,
      });
    }

    // Ici, on pourrait implémenter une logique de validation :
    // - Vérifier si l'utilisateur a le droit de voir la photo (premium, etc.)
    // - Envoyer une notification à l'utilisateur cible
    // - Loguer la demande pour la modération

    // Pour l'instant, on dévoile directement la photo
    targetUser.profile.photos[photoIndex].isBlurred = false;
    await targetUser.save();

    res.json({
      success: true,
      message: 'Photo dévoilée avec succès',
      photo: targetUser.profile.photos[photoIndex],
    });
  } catch (error) {
    console.error('Erreur lors de la demande de dévoilement:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UNBLUR_ERROR',
        message: 'Erreur lors de la demande de dévoilement',
      },
    });
  }
};

module.exports = {
  uploadProfilePhoto,
  uploadGalleryPhoto,
  togglePhotoBlur,
  deletePhoto,
  setProfilePhoto,
  handleUnblurRequest,
};
