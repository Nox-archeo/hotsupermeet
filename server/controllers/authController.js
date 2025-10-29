const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Inscription d'un nouvel utilisateur
const register = async (req, res) => {
  try {
    console.log('=== DÉBUT INSCRIPTION ===');
    console.log('Headers Content-Type:', req.headers['content-type']);
    console.log('Body reçu:', req.body);
    console.log('Files reçus:', req.files);

    // Vérifier si c'est une requête multipart (avec fichier)
    const isMultipart = req.headers['content-type']?.includes(
      'multipart/form-data'
    );

    let email,
      password,
      profile,
      profilePhoto,
      blurPhoto = false; // Par défaut non floutée

    if (isMultipart) {
      console.log('Traitement multipart détecté');
      // Vérifier que les données multipart sont complètes
      if (!req.body || Object.keys(req.body).length === 0) {
        console.log('Erreur: données multipart incomplètes');
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FORM_DATA',
            message: 'Données de formulaire incomplètes',
          },
        });
      }

      // Traitement des données multipart avec express-fileupload
      email = req.body.email;
      password = req.body.password;

      console.log('Données extraites - Email:', email);
      console.log('Données extraites - Nom:', req.body.nom);
      console.log('Données extraites - Âge:', req.body.age);
      console.log('Données extraites - Sexe:', req.body.sexe);
      console.log('Données extraites - Pays:', req.body.pays);
      console.log('Données extraites - Région:', req.body.region);
      console.log('Données extraites - Ville:', req.body.ville);
      console.log('Données extraites - Bio:', req.body.bio);
      console.log('Données extraites - BlurPhoto:', req.body.blurPhoto);

      // Construire l'objet localisation à partir des champs individuels
      const localisation = {
        pays: req.body.pays,
        region: req.body.region,
        ville: req.body.ville,
      };

      profile = {
        nom: req.body.nom,
        age: parseInt(req.body.age),
        sexe: req.body.sexe,
        localisation: localisation,
        bio: req.body.bio || '',
      };

      console.log('Profil construit:', profile);

      // Vérifier que req.files existe et contient la photo
      if (req.files && req.files.profilePhoto) {
        profilePhoto = req.files.profilePhoto;
        console.log('Photo de profil détectée:', profilePhoto.name);
      }
      blurPhoto = req.body.blurPhoto === 'on'; // Checkbox renvoie 'on' si cochée
      console.log('Blur photo:', blurPhoto);
    } else {
      // Traitement des données JSON
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Données invalides',
            details: errors.array(),
          },
        });
      }

      const data = req.body;
      email = data.email;
      password = data.password;
      profile = data.profile;
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Erreur: utilisateur existe déjà avec email:', email);
      return res.status(400).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'Un utilisateur avec cet email existe déjà',
        },
      });
    }

    // Vérification de l'âge (18+)
    if (profile.age < 18) {
      console.log('Erreur: âge insuffisant:', profile.age);
      return res.status(400).json({
        success: false,
        error: {
          code: 'AGE_RESTRICTION',
          message: 'Vous devez avoir au moins 18 ans pour vous inscrire',
        },
      });
    }

    console.log('Création du nouvel utilisateur...');
    // Créer le nouvel utilisateur
    const user = new User({
      email,
      password,
      profile,
    });

    console.log('Utilisateur créé (avant sauvegarde):', {
      email: user.email,
      profile: user.profile,
    });

    // Gérer l'upload de photo si présent
    if (profilePhoto && profilePhoto.size > 0) {
      try {
        // Configuration Cloudinary
        const cloudinaryConfigured =
          process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET;

        let photoData;

        if (cloudinaryConfigured) {
          console.log('🚀 Upload vers Cloudinary pour inscription...');
          console.log('📊 DEBUG - profilePhoto.name:', profilePhoto.name);
          console.log('📊 DEBUG - profilePhoto.size:', profilePhoto.size);
          console.log(
            '📊 DEBUG - profilePhoto.mimetype:',
            profilePhoto.mimetype
          );
          console.log(
            '📊 DEBUG - profilePhoto.data type:',
            typeof profilePhoto.data
          );
          console.log(
            '📊 DEBUG - profilePhoto.data length:',
            profilePhoto.data ? profilePhoto.data.length : 'undefined'
          );
          console.log(
            '📊 DEBUG - profilePhoto.tempFilePath:',
            profilePhoto.tempFilePath
          );

          // Upload vers Cloudinary
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'hotsupermeet/profile-photos',
                public_id: `profile-${user._id}-${Date.now()}`,
                transformation: [
                  { width: 800, height: 800, crop: 'limit' },
                  { quality: 'auto' },
                  { format: 'webp' },
                ],
                overwrite: true,
                invalidate: true,
              },
              (error, result) => {
                if (error) {
                  console.error('❌ Erreur Cloudinary:', error);
                  reject(error);
                } else {
                  console.log(
                    '✅ Upload Cloudinary réussi:',
                    result.secure_url
                  );
                  resolve(result);
                }
              }
            );

            // Utiliser tempFilePath au lieu de data car data est vide
            const fs = require('fs');
            const fileStream = fs.createReadStream(profilePhoto.tempFilePath);
            fileStream.pipe(uploadStream);
          });

          photoData = {
            filename: profilePhoto.name,
            path: uploadResult.secure_url, // Champ requis par le modèle MongoDB
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            cloudinaryId: uploadResult.public_id,
            isBlurred: blurPhoto,
            isProfile: true,
            uploadedAt: new Date(),
            metadata: {
              width: uploadResult.width,
              height: uploadResult.height,
              format: uploadResult.format,
              size: uploadResult.bytes,
            },
          };
        } else {
          console.log(
            '⚠️ Cloudinary non configuré - fallback base64 pour inscription'
          );

          // Fallback base64
          const base64Data = profilePhoto.data.toString('base64');
          const mimeType = profilePhoto.mimetype || 'image/jpeg';
          const dataUrl = `data:${mimeType};base64,${base64Data}`;

          photoData = {
            filename: profilePhoto.name,
            path: dataUrl,
            url: dataUrl,
            isBlurred: blurPhoto,
            isProfile: true,
            uploadedAt: new Date(),
            metadata: {
              size: profilePhoto.size,
              originalName: profilePhoto.name,
            },
          };
        }

        user.profile.photos = [photoData];
        console.log(
          '📸 Photo ajoutée au profil:',
          photoData.url ? 'Cloudinary' : 'Base64'
        );
      } catch (uploadError) {
        console.error(
          '❌ Erreur lors de l\\' + 'upload de la photo:',
          uploadError
        );
        // Continuer sans photo plutôt que d'échouer l'inscription
      }
    }

    await user.save();
    console.log('Utilisateur sauvegardé avec succès. ID:', user._id);
    console.log('Profil sauvegardé:', user.profile);

    // Générer le token JWT
    const token = generateToken(user._id);
    console.log('Token JWT généré');

    // Mettre à jour la dernière activité
    await user.updateLastActive();
    console.log('Dernière activité mise à jour');

    const responseData = {
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile,
        premium: user.premium,
        stats: user.stats,
      },
    };

    console.log('Réponse envoyée au client:', responseData);
    res.status(201).json(responseData);
    console.log('=== FIN INSCRIPTION - RÉPONSE ENVOYÉE ===');
  } catch (error) {
    console.error('Erreur lors de l\\' + 'inscription:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de l\\' + 'inscription',
      },
    });
  }
};

// Connexion utilisateur
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: errors.array(),
        },
      });
    }

    const { email, password } = req.body;

    // Trouver l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email ou mot de passe incorrect',
        },
      });
    }

    // Vérifier le mot de passe
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email ou mot de passe incorrect',
        },
      });
    }

    // Vérifier si le compte est bloqué
    if (user.security.isBlocked) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_BLOCKED',
          message: 'Votre compte a été bloqué',
        },
      });
    }

    // Générer le token JWT
    const token = generateToken(user._id);

    // Mettre à jour la dernière activité
    await user.updateLastActive();

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile,
        premium: user.premium,
        stats: user.stats,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la connexion',
      },
    });
  }
};

// Récupération du profil utilisateur
const getMe = async (req, res) => {
  try {
    console.log('=== DÉBUT GETME ===');
    console.log('User ID de la requête:', req.user._id);

    const user = await User.findById(req.user._id).select('-password');
    console.log('Utilisateur trouvé dans la base:', user);

    if (!user) {
      console.log('Erreur: utilisateur non trouvé pour ID:', req.user._id);
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    const responseData = {
      success: true,
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile,
        premium: user.premium,
        preferences: user.preferences,
        stats: user.stats,
      },
    };

    console.log('Données utilisateur envoyées:', responseData.user);

    // DEBUG PHOTOS: Log détaillé du contenu des photos
    if (user.profile && user.profile.photos) {
      console.log(
        '🖼️ PHOTOS DEBUG - Nombre de photos:',
        user.profile.photos.length
      );
      user.profile.photos.forEach((photo, index) => {
        console.log(`🖼️ Photo ${index}:`, JSON.stringify(photo, null, 2));
      });
    } else {
      console.log('🖼️ PHOTOS DEBUG: Aucune photo dans le profil');
    }

    console.log('=== FIN GETME - RÉPONSE ENVOYÉE ===');
    res.json(responseData);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la récupération du profil',
      },
    });
  }
};

// Vérification de l'âge
const verifyAge = async (req, res) => {
  try {
    const { birthDate, acceptedTerms } = req.body;

    if (!birthDate || !acceptedTerms) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATA',
          message: 'Date de naissance et acceptation des conditions requises',
        },
      });
    }

    // Calculer l'âge
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    if (age < 18) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNDERAGE',
          message: 'Vous devez avoir au moins 18 ans pour accéder à ce site',
        },
      });
    }

    res.json({
      success: true,
      message: 'Vérification d\\' + 'âge réussie',
    });
  } catch (error) {
    console.error('Erreur lors de la vérification d\\' + 'âge:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la vérification d\\' + 'âge',
      },
    });
  }
};

// Vérifier si l'âge a été confirmé (via session)
const checkAgeVerified = async (req, res) => {
  try {
    // Utiliser la session pour vérifier si l'âge a été confirmé
    // Si l'utilisateur est connecté, on peut vérifier dans son profil
    if (req.user) {
      // L'utilisateur est connecté, on peut vérifier son âge dans la base de données
      const user = await User.findById(req.user._id);
      if (user && user.profile.age >= 18) {
        return res.json({
          ageVerified: true,
          message: 'Âge vérifié via profil utilisateur',
        });
      }
    }

    // Vérifier la session (si on utilise des sessions express)
    if (req.session && req.session.ageVerified) {
      return res.json({
        ageVerified: true,
        message: 'Âge vérifié via session',
      });
    }

    res.json({
      ageVerified: false,
      message: 'Vérification d\\' + 'âge requise',
    });
  } catch (error) {
    console.error('Erreur lors de la vérification d\\' + 'âge:', error);
    res.status(500).json({
      ageVerified: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la vérification d\\' + 'âge',
      },
    });
  }
};

// Confirmer l'âge (stockage en session)
const confirmAge = async (req, res) => {
  try {
    const { confirmed } = req.body;

    if (!confirmed) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message: 'La confirmation est requise',
        },
      });
    }

    // Stocker la confirmation dans la session
    if (req.session) {
      req.session.ageVerified = true;
      req.session.ageVerifiedAt = new Date();
    }

    res.json({
      success: true,
      message: 'Âge confirmé avec succès',
      ageVerified: true,
    });
  } catch (error) {
    console.error('Erreur lors de la confirmation d\\' + 'âge:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la confirmation d\\' + 'âge',
      },
    });
  }
};

// Déconnexion (côté client principalement, mais on peut invalider le token si nécessaire)
const logout = async (req, res) => {
  try {
    // Pour l'instant, la déconnexion est gérée côté client
    // On pourrait implémenter une blacklist de tokens si nécessaire
    res.json({
      success: true,
      message: 'Déconnexion réussie',
    });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la déconnexion',
      },
    });
  }
};

// Demande de réinitialisation de mot de passe
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_REQUIRED',
          message: 'L\\' + 'email est requis',
        },
      });
    }

    // Trouver l'utilisateur par email
    const user = await User.findOne({ email });
    if (!user) {
      // Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non
      return res.json({
        success: true,
        message:
          'Si cet email existe, un lien de réinitialisation a été envoyé',
      });
    }

    // Générer un token de réinitialisation
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Définir l'expiration (1 heure)
    user.security.resetPasswordToken = resetTokenHash;
    user.security.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 heure

    await user.save();

    // Envoyer l'email (simulation pour l'instant)
    console.log(
      `Lien de réinitialisation pour ${email}: http://localhost:3000/reset-password?token=${resetToken}`
    );

    // En production, on utiliserait un service d'email comme Nodemailer
    res.json({
      success: true,
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
    });
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la demande de réinitialisation',
      },
    });
  }
};

// Réinitialisation du mot de passe
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATA',
          message: 'Token et nouveau mot de passe requis',
        },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PASSWORD_TOO_SHORT',
          message: 'Le mot de passe doit contenir au moins 6 caractères',
        },
      });
    }

    // Hasher le token pour le comparer avec celui en base
    const crypto = require('crypto');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Trouver l'utilisateur avec le token valide et non expiré
    const user = await User.findOne({
      'security.resetPasswordToken': resetTokenHash,
      'security.resetPasswordExpires': { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token invalide ou expiré',
        },
      });
    }

    // Mettre à jour le mot de passe
    user.password = password;
    user.security.resetPasswordToken = undefined;
    user.security.resetPasswordExpires = undefined;
    user.security.lastPasswordChange = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la réinitialisation du mot de passe',
      },
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  verifyAge,
  checkAgeVerified,
  confirmAge,
  logout,
  forgotPassword,
  resetPassword,
};
