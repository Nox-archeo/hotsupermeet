const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { validationResult } = require('express-validator');

// Inscription d'un nouvel utilisateur
const register = async (req, res) => {
  try {
    // Vérifier si c'est une requête multipart (avec fichier)
    const isMultipart = req.headers['content-type']?.includes(
      'multipart/form-data'
    );

    let email,
      password,
      profile,
      profilePhoto,
      blurPhoto = true; // Par défaut floutée

    if (isMultipart) {
      // Traitement des données multipart
      email = req.body.email;
      password = req.body.password;
      profile = {
        nom: req.body.nom,
        age: parseInt(req.body.age),
        sexe: req.body.sexe,
        localisation: {
          pays: req.body.pays,
          region: req.body.region,
          ville: req.body.ville,
        },
        bio: req.body.bio || '',
      };
      profilePhoto = req.files?.profilePhoto;
      blurPhoto = req.body.blurPhoto === 'on'; // Checkbox renvoie 'on' si cochée
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
      return res.status(400).json({
        success: false,
        error: {
          code: 'AGE_RESTRICTION',
          message: 'Vous devez avoir au moins 18 ans pour vous inscrire',
        },
      });
    }

    // Créer le nouvel utilisateur
    const user = new User({
      email,
      password,
      profile,
    });

    // Gérer l'upload de photo si présent
    if (profilePhoto && profilePhoto.size > 0) {
      const fileName = `profile-${user._id}-${Date.now()}-${profilePhoto.name}`;
      const uploadPath = `./uploads/profile-photos/${fileName}`;

      // Déplacer le fichier
      await profilePhoto.mv(uploadPath);

      // Ajouter la photo au profil avec le choix de floutage de l'utilisateur
      const photoData = {
        filename: fileName,
        path: `/uploads/profile-photos/${fileName}`,
        isBlurred: blurPhoto, // Respecter le choix de l'utilisateur
        isProfile: true, // Photo de profil principale
        uploadedAt: new Date(),
      };

      user.profile.photos = [photoData];
    }

    await user.save();

    // Générer le token JWT
    const token = generateToken(user._id);

    // Mettre à jour la dernière activité
    await user.updateLastActive();

    res.status(201).json({
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
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile,
        premium: user.premium,
        preferences: user.preferences,
        stats: user.stats,
      },
    });
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

module.exports = {
  register,
  login,
  getMe,
  verifyAge,
  checkAgeVerified,
  confirmAge,
  logout,
};
