const User = require('../models/User');
const Message = require('../models/Message');
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

    // UTILISER CLOUDINARY comme pour la photo de profil
    const fileExtension = path.extname(photo.name);
    const fileName = `gallery-${userId}-${Date.now()}${fileExtension}`;

    let photoData;

    // Vérifier si Cloudinary est configuré
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      console.log(`🚀 Upload galerie vers Cloudinary: ${fileName}`);

      try {
        // Upload vers Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: 'hotsupermeet/gallery-photos',
              public_id: fileName.replace(/\.[^/.]+$/, ''),
              transformation: [
                { width: 800, height: 800, crop: 'limit' },
                { quality: 'auto' },
                { format: 'auto' },
              ],
              overwrite: true,
              timeout: 60000,
            },
            (error, result) => {
              if (error) {
                console.log('❌ Erreur Cloudinary galerie:', error.message);
                reject(error);
              } else {
                console.log('✅ Upload Cloudinary galerie réussi');
                resolve(result);
              }
            }
          );

          uploadStream.on('error', error => {
            console.log('❌ Erreur stream Cloudinary galerie:', error.message);
            reject(error);
          });

          if (photo.tempFilePath && fs.existsSync(photo.tempFilePath)) {
            console.log(
              '📂 Upload galerie depuis tempFile:',
              photo.tempFilePath
            );
            fs.createReadStream(photo.tempFilePath).pipe(uploadStream);
          } else {
            console.log('📦 Upload galerie depuis buffer data');
            uploadStream.end(photo.data);
          }
        });

        console.log(
          `✅ Photo galerie uploadée sur Cloudinary: ${uploadResult.secure_url}`
        );

        photoData = {
          filename: fileName,
          path: uploadResult.secure_url,
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          cloudinaryData: {
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
            bytes: uploadResult.bytes,
          },
          type: 'gallery',
          isBlurred: false,
          isProfile: false,
          uploadedAt: new Date(),
        };
      } catch (cloudinaryError) {
        console.error(
          'Erreur Cloudinary galerie, fallback vers base64:',
          cloudinaryError.message
        );

        const base64Data = photo.data.toString('base64');
        const dataURL = `data:${photo.mimetype};base64,${base64Data}`;

        photoData = {
          filename: fileName,
          path: dataURL,
          url: dataURL,
          type: 'gallery',
          isBlurred: false,
          isProfile: false,
          uploadedAt: new Date(),
        };
      }
    } else {
      console.log('⚠️ Cloudinary non configuré pour galerie');

      const base64Data = photo.data.toString('base64');
      const dataURL = `data:${photo.mimetype};base64,${base64Data}`;

      photoData = {
        filename: fileName,
        path: dataURL,
        url: dataURL,
        type: 'gallery',
        isBlurred: false,
        isProfile: false,
        uploadedAt: new Date(),
      };
    }

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

    // Initialiser le tableau de photos si nécessaire
    if (!user.profile.photos) {
      user.profile.photos = [];
    }

    // Vérifier la limite de 5 photos de galerie
    const galleryPhotos = user.profile.photos.filter(p => p.type === 'gallery');
    if (galleryPhotos.length >= 5) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'GALLERY_PHOTO_LIMIT',
          message: 'Vous ne pouvez avoir que 5 photos publiques maximum',
        },
      });
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

    // UTILISER CLOUDINARY pour les photos privées aussi
    const fileExtension = path.extname(photo.name);
    const fileName = `private-${userId}-${Date.now()}${fileExtension}`;

    let photoData;

    // Vérifier si Cloudinary est configuré
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      console.log(`🚀 Upload privé vers Cloudinary: ${fileName}`);

      try {
        // Upload vers Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: 'hotsupermeet/private-photos',
              public_id: fileName.replace(/\.[^/.]+$/, ''),
              transformation: [
                { width: 800, height: 800, crop: 'limit' },
                { quality: 'auto' },
                { format: 'auto' },
              ],
              overwrite: true,
              timeout: 60000,
            },
            (error, result) => {
              if (error) {
                console.log('❌ Erreur Cloudinary privé:', error.message);
                reject(error);
              } else {
                console.log('✅ Upload Cloudinary privé réussi');
                resolve(result);
              }
            }
          );

          uploadStream.on('error', error => {
            console.log('❌ Erreur stream Cloudinary privé:', error.message);
            reject(error);
          });

          if (photo.tempFilePath && fs.existsSync(photo.tempFilePath)) {
            console.log('📂 Upload privé depuis tempFile:', photo.tempFilePath);
            fs.createReadStream(photo.tempFilePath).pipe(uploadStream);
          } else {
            console.log('📦 Upload privé depuis buffer data');
            uploadStream.end(photo.data);
          }
        });

        console.log(
          `✅ Photo privée uploadée sur Cloudinary: ${uploadResult.secure_url}`
        );

        photoData = {
          filename: fileName,
          path: uploadResult.secure_url,
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          cloudinaryData: {
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
            bytes: uploadResult.bytes,
          },
          type: 'private',
          isBlurred: true, // Photos privées floutées par défaut
          isProfile: false,
          uploadedAt: new Date(),
        };
      } catch (cloudinaryError) {
        console.error(
          'Erreur Cloudinary privé, fallback vers base64:',
          cloudinaryError.message
        );

        const base64Data = photo.data.toString('base64');
        const dataURL = `data:${photo.mimetype};base64,${base64Data}`;

        photoData = {
          filename: fileName,
          path: dataURL,
          url: dataURL,
          type: 'private',
          isBlurred: true,
          isProfile: false,
          uploadedAt: new Date(),
        };
      }
    } else {
      console.log('⚠️ Cloudinary non configuré pour privé');

      const base64Data = photo.data.toString('base64');
      const dataURL = `data:${photo.mimetype};base64,${base64Data}`;

      photoData = {
        filename: fileName,
        path: dataURL,
        url: dataURL,
        type: 'private',
        isBlurred: true,
        isProfile: false,
        uploadedAt: new Date(),
      };
    }

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

    // 🔒 SYSTÈME DE DEMANDE D'APPROBATION pour déflou
    // Au lieu de déflouter directement, on crée une demande

    // Vérifier s'il y a déjà une demande en cours
    const existingRequest = await Message.findOne({
      fromUserId: requestingUserId,
      toUserId: targetUserId,
      type: 'unblur_request',
      'metadata.photoId': photoId,
      'metadata.status': 'pending',
    });

    if (existingRequest) {
      return res.json({
        success: true,
        message: 'Demande de défloutage déjà envoyée, en attente de réponse',
      });
    }

    // Créer une demande de déflou comme message spécial
    const unblurRequestMessage = new Message({
      fromUserId: requestingUserId,
      toUserId: targetUserId,
      type: 'unblur_request',
      content: `Demande de défloutage de photo de profil`,
      metadata: {
        photoId: photoId,
        photoType: photo.isProfile ? 'profile' : photo.type || 'gallery',
        status: 'pending',
        requestedAt: new Date(),
      },
    });

    await unblurRequestMessage.save();

    res.json({
      success: true,
      message: 'Demande de défloutage envoyée avec succès',
      pending: true,
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

// Upload des photos d'annonces
const uploadAdPhotos = async (req, res) => {
  try {
    ensureUploadDirs();

    console.log('📥 Upload photos annonce reçu:', {
      hasFiles: !!req.files,
      hasPhotos: !!(req.files && req.files.photos),
      userId: req.user?._id,
    });

    if (!req.files || !req.files.photos) {
      console.log('❌ Aucune photo fournie');
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'Aucune photo fournie',
        },
      });
    }

    const photos = Array.isArray(req.files.photos)
      ? req.files.photos
      : [req.files.photos];
    const userId = req.user._id;

    // Limiter à 5 photos maximum
    if (photos.length > 5) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Maximum 5 photos autorisées',
        },
      });
    }

    console.log(`📷 Upload de ${photos.length} photo(s)`);

    const uploadedPhotos = [];
    const errors = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];

      // Vérifier le type de fichier
      if (!photo.mimetype.startsWith('image/')) {
        errors.push(`Photo ${i + 1}: Le fichier doit être une image`);
        continue;
      }

      // Vérifier la taille (max 5MB)
      if (photo.size > 5 * 1024 * 1024) {
        errors.push(`Photo ${i + 1}: L'image ne doit pas dépasser 5MB`);
        continue;
      }

      try {
        const fileExtension = path.extname(photo.name);
        const fileName = `ad-photo-${userId}-${Date.now()}-${i}${fileExtension}`;

        // Upload vers Cloudinary si configuré
        if (
          process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
        ) {
          console.log(`🚀 Upload photo ${i + 1} vers Cloudinary: ${fileName}`);

          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                resource_type: 'image',
                folder: 'hotsupermeet/ads-photos',
                public_id: fileName.replace(/\.[^/.]+$/, ''),
                transformation: [
                  { width: 1200, height: 800, crop: 'limit' },
                  { quality: 'auto' },
                  { format: 'auto' },
                ],
                overwrite: true,
                timeout: 60000,
              },
              (error, result) => {
                if (error) {
                  console.log(
                    `❌ Erreur Cloudinary photo ${i + 1}:`,
                    error.message
                  );
                  reject(error);
                } else {
                  console.log(`✅ Upload photo ${i + 1} réussi`);
                  resolve(result);
                }
              }
            );

            if (photo.tempFilePath && fs.existsSync(photo.tempFilePath)) {
              fs.createReadStream(photo.tempFilePath).pipe(uploadStream);
            } else {
              uploadStream.end(photo.data);
            }
          });

          uploadedPhotos.push({
            filename: fileName,
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            cloudinaryData: {
              width: uploadResult.width,
              height: uploadResult.height,
              format: uploadResult.format,
              bytes: uploadResult.bytes,
            },
          });

          console.log(`✅ Photo ${i + 1} uploadée: ${uploadResult.secure_url}`);
        } else {
          // Fallback base64
          const base64Data = photo.data.toString('base64');
          const dataURL = `data:${photo.mimetype};base64,${base64Data}`;

          uploadedPhotos.push({
            filename: fileName,
            url: dataURL,
          });
        }
      } catch (error) {
        console.error(`❌ Erreur upload photo ${i + 1}:`, error.message);
        errors.push(`Photo ${i + 1}: Erreur lors de l'upload`);
      }
    }

    if (uploadedPhotos.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: errors.join(', ') || "Aucune photo n'a pu être uploadée",
        },
      });
    }

    console.log(`✅ ${uploadedPhotos.length} photo(s) uploadée(s) avec succès`);

    res.json({
      success: true,
      message: `${uploadedPhotos.length} photo(s) uploadée(s) avec succès`,
      photos: uploadedPhotos,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('❌ Erreur upload photos annonce:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
};

// 🔒 Gérer la réponse à une demande de déflou (approuver/refuser)
const handleUnblurResponse = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { action } = req.body; // 'approve' ou 'reject'
    const userId = req.user._id;

    // Trouver la demande de déflou
    const unblurRequest = await Message.findById(messageId);

    if (!unblurRequest || unblurRequest.type !== 'unblur_request') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Demande de déflou non trouvée',
        },
      });
    }

    // Vérifier que c'est bien le destinataire qui répond
    if (unblurRequest.toUserId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: "Vous n'êtes pas autorisé à répondre à cette demande",
        },
      });
    }

    // Vérifier si la demande est encore en attente
    if (unblurRequest.metadata.status !== 'pending') {
      return res.json({
        success: true,
        message: 'Cette demande a déjà été traitée',
      });
    }

    if (action === 'approve') {
      // 🟢 APPROUVER : Déflouter la photo
      const photoId = unblurRequest.metadata.photoId;
      const user = await User.findById(userId);

      const photoIndex = user.profile.photos.findIndex(
        photo => photo._id.toString() === photoId
      );

      if (photoIndex !== -1) {
        // Déflouter la photo pour ce demandeur spécifique
        if (!user.profile.photos[photoIndex].unblurredFor) {
          user.profile.photos[photoIndex].unblurredFor = [];
        }

        if (
          !user.profile.photos[photoIndex].unblurredFor.includes(
            unblurRequest.fromUserId
          )
        ) {
          user.profile.photos[photoIndex].unblurredFor.push(
            unblurRequest.fromUserId
          );
        }

        await user.save();

        // Marquer la demande comme approuvée
        unblurRequest.metadata.status = 'approved';
        unblurRequest.metadata.respondedAt = new Date();
        await unblurRequest.save();

        res.json({
          success: true,
          message: 'Demande approuvée, photo défloutée pour ce membre',
        });
      } else {
        res.status(404).json({
          success: false,
          error: { message: 'Photo non trouvée' },
        });
      }
    } else if (action === 'reject') {
      // ❌ REFUSER : Marquer la demande comme refusée
      unblurRequest.metadata.status = 'rejected';
      unblurRequest.metadata.respondedAt = new Date();
      await unblurRequest.save();

      res.json({
        success: true,
        message: 'Demande refusée',
      });
    } else {
      res.status(400).json({
        success: false,
        error: { message: 'Action non valide (approve/reject)' },
      });
    }
  } catch (error) {
    console.error('Erreur réponse demande déflou:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur serveur' },
    });
  }
};

module.exports = {
  uploadProfilePhoto,
  uploadGalleryPhoto,
  uploadPrivatePhoto,
  uploadAdPhotos,
  togglePhotoBlur,
  deletePhoto,
  setProfilePhoto,
  handleUnblurRequest,
  handleUnblurResponse,
};
