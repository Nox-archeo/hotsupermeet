const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuration du dossier d'upload (fallback local si Cloudinary indisponible)
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

    console.log('📥 Upload request reçu:', {
      hasFiles: !!req.files,
      hasPhoto: !!(req.files && req.files.photo),
      userId: req.user?._id,
    });

    if (!req.files || !req.files.photo) {
      console.log('❌ Aucune photo fournie');
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

    console.log('📷 Détails photo:', {
      name: photo.name,
      size: photo.size,
      mimetype: photo.mimetype,
      sizeInMB: (photo.size / (1024 * 1024)).toFixed(2),
    });

    // Vérifier le type de fichier
    if (!photo.mimetype.startsWith('image/')) {
      console.log('❌ Type de fichier invalide:', photo.mimetype);
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
      console.log('❌ Fichier trop gros:', photo.size, 'bytes');
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'L\\' + 'image ne doit pas dépasser 5MB',
        },
      });
    }

    // SOLUTION CLOUDINARY: Upload vers service externe avec CDN
    const fileExtension = path.extname(photo.name);
    const fileName = `profile-${userId}-${Date.now()}${fileExtension}`;

    let photoData;

    // Vérifier si Cloudinary est configuré
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      console.log(`🚀 Upload vers Cloudinary: ${fileName}`);

      try {
        // Upload vers Cloudinary avec gestion d'erreur améliorée
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: 'hotsupermeet/profile-photos',
              public_id: fileName.replace(/\.[^/.]+$/, ''), // sans extension
              transformation: [
                { width: 800, height: 800, crop: 'limit' }, // Redimensionner max 800x800
                { quality: 'auto' }, // Optimisation automatique
                { format: 'auto' }, // Format optimal (WebP si supporté)
              ],
              overwrite: true,
              timeout: 60000, // 60 secondes timeout
            },
            (error, result) => {
              if (error) {
                console.log('❌ Erreur Cloudinary:', error.message);
                reject(error);
              } else {
                console.log('✅ Upload Cloudinary réussi');
                resolve(result);
              }
            }
          );

          // Gestion d'erreur pour le stream
          uploadStream.on('error', error => {
            console.log('❌ Erreur stream Cloudinary:', error.message);
            reject(error);
          });

          // Utiliser tempFilePath si disponible, sinon data
          if (photo.tempFilePath && fs.existsSync(photo.tempFilePath)) {
            console.log('📂 Upload depuis tempFile:', photo.tempFilePath);
            fs.createReadStream(photo.tempFilePath).pipe(uploadStream);
          } else {
            console.log('📦 Upload depuis buffer data');
            uploadStream.end(photo.data);
          }
        });

        console.log(
          `✅ Photo uploadée sur Cloudinary: ${uploadResult.secure_url}`
        );
        console.log(
          `📁 Taille optimisée: ${Math.round(uploadResult.bytes / 1024)}KB`
        );

        // Ajouter la photo au tableau de photos avec URLs Cloudinary
        photoData = {
          filename: fileName,
          path: uploadResult.secure_url, // URL Cloudinary sécurisée
          url: uploadResult.secure_url, // URL Cloudinary pour compatibilité
          publicId: uploadResult.public_id, // ID Cloudinary pour suppression
          cloudinaryData: {
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
            bytes: uploadResult.bytes,
          },
          isBlurred: false, // Par défaut non floutée
          type: 'profile', // Type de photo : 'profile', 'gallery', 'private'
          isProfile: true, // Cette fonction est spécifiquement pour la photo de profil
          uploadedAt: new Date(),
        };
      } catch (cloudinaryError) {
        console.error(
          'Erreur Cloudinary, fallback vers base64:',
          cloudinaryError.message
        );
        // Fallback vers stockage base64
        const base64Data = photo.data.toString('base64');
        const dataURL = `data:${photo.mimetype};base64,${base64Data}`;

        photoData = {
          filename: fileName,
          path: dataURL,
          url: dataURL,
          isBlurred: false,
          isProfile: true,
          uploadedAt: new Date(),
        };
      }
    } else {
      console.log('⚠️  Cloudinary non configuré, utilisation base64');
      // Fallback vers stockage base64
      const base64Data = photo.data.toString('base64');
      const dataURL = `data:${photo.mimetype};base64,${base64Data}`;

      photoData = {
        filename: fileName,
        path: dataURL,
        url: dataURL,
        isBlurred: false,
        isProfile: true,
        uploadedAt: new Date(),
      };
    }

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

    // LOGIQUE CORRIGÉE : Remplacer l'ancienne photo de profil
    if (!user.profile.photos) {
      user.profile.photos = [];
    }

    // Supprimer l'ancienne photo de profil (garder seulement les photos de galerie et privées)
    user.profile.photos = user.profile.photos.filter(
      photo => !photo.isProfile && photo.type !== 'profile'
    );

    // Ajouter la nouvelle photo de profil
    user.profile.photos.push(photoData);

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
      type: 'gallery', // Type galerie publique
      isBlurred: false, // Par défaut non floutée
      isProfile: false, // Pas une photo de profil
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

// Upload de photo privée
const uploadPrivatePhoto = async (req, res) => {
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

    // Vérifications basiques (même que pour les autres photos)
    if (!photo.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Le fichier doit être une image',
        },
      });
    }

    if (photo.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'L\\' + 'image ne doit pas dépasser 5MB',
        },
      });
    }

    // Générer un nom de fichier unique pour photo privée
    const fileExtension = path.extname(photo.name);
    const fileName = `${userId}_private_${Date.now()}${fileExtension}`;
    const filePath = path.join(PROFILE_PHOTOS_DIR, fileName);

    // Sauvegarder le fichier
    await photo.mv(filePath);

    // Mettre à jour le profil utilisateur
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
      type: 'private', // Type photo privée
      isBlurred: true, // Photos privées sont floutées par défaut
      isProfile: false, // Pas une photo de profil
      uploadedAt: new Date(),
    };

    // Initialiser le tableau de photos si nécessaire
    if (!user.profile.photos) {
      user.profile.photos = [];
    }

    // Vérifier la limite de 5 photos privées
    const privatePhotos = user.profile.photos.filter(p => p.type === 'private');
    if (privatePhotos.length >= 5) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PRIVATE_PHOTO_LIMIT',
          message: 'Vous ne pouvez avoir que 5 photos privées maximum',
        },
      });
    }

    // Ajouter la photo privée
    user.profile.photos.push(photoData);
    await user.save();

    res.json({
      success: true,
      photo: photoData,
      message: 'Photo privée uploadée avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de l\\' + 'upload de la photo privée:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'Erreur lors de l\\' + 'upload de la photo privée',
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
  uploadPrivatePhoto,
  togglePhotoBlur,
  deletePhoto,
  setProfilePhoto,
  handleUnblurRequest,
};
