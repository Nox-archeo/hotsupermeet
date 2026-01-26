const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profile: {
      nom: { type: String, required: true, trim: true },
      age: { type: Number, required: true, min: 18, max: 100 },
      sexe: {
        type: String,
        enum: ['homme', 'femme', 'couple', 'trans-femme', 'trans-homme'],
        required: true,
      },
      orientation: {
        type: String,
        enum: ['hetero', 'bi', 'gay', 'lesbienne'],
        default: 'hetero',
      },
      localisation: {
        pays: { type: String, required: true, trim: true },
        region: { type: String, required: true, trim: true },
        ville: { type: String, required: true, trim: true },
      },
      bio: { type: String, maxlength: 500, trim: true },
      pratiques: [{ type: String, trim: true }],
      photos: [
        {
          filename: { type: String, required: true },
          path: { type: String, required: true },
          url: { type: String, required: true },
          type: {
            type: String,
            enum: ['profile', 'gallery', 'private'],
            default: 'gallery',
          },
          isBlurred: { type: Boolean, default: false },
          isProfile: { type: Boolean, default: false },
          publicId: { type: String },
          cloudinaryData: {
            width: { type: Number },
            height: { type: Number },
            format: { type: String },
            bytes: { type: Number },
          },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      tenuePreferee: { type: String, trim: true },
      disponibilite: {
        type: String,
        enum: ['disponible', 'occupe', 'invisible'],
        default: 'disponible',
      },
    },
    premium: {
      isPremium: { type: Boolean, default: false },
      expiration: { type: Date },
      paypalSubscriptionId: { type: String },
      // isFemaleFree supprimé - système 100% payant
    },
    // 🔔 Push Notifications Subscriptions
    pushSubscriptions: [
      {
        endpoint: { type: String, required: true },
        keys: {
          p256dh: { type: String, required: true },
          auth: { type: String, required: true },
        },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    preferences: {
      ageMin: { type: Number, min: 18, max: 100, default: 18 },
      ageMax: { type: Number, min: 18, max: 100, default: 100 },
      sexeRecherche: {
        type: String,
        enum: [
          'homme',
          'femme',
          'couple',
          'trans-femme',
          'trans-homme',
          'tous',
        ],
        default: 'tous',
      },
      orientationRecherchee: {
        type: String,
        enum: ['hetero', 'bi', 'gay', 'lesbienne', 'toutes'],
        default: 'toutes',
      },
      pratiquesRecherchees: [{ type: String, trim: true }],
      localisationPreferee: { type: String, trim: true },
    },
    stats: {
      profileViews: { type: Number, default: 0 },
      lastActive: { type: Date, default: Date.now },
      joinDate: { type: Date, default: Date.now },
    },
    security: {
      isVerified: { type: Boolean, default: false },
      isBlocked: { type: Boolean, default: false },
      lastPasswordChange: { type: Date, default: Date.now },
      resetPasswordToken: { type: String },
      resetPasswordExpiry: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Hashage du mot de passe avant sauvegarde
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour mettre à jour la dernière activité
userSchema.methods.updateLastActive = function () {
  this.stats.lastActive = new Date();
  return this.save();
};

// Méthode pour vérifier l'éligibilité à la gratuité pour femmes
userSchema.methods.isEligibleForFreePremium = function () {
  return this.profile.sexe === 'femme' && this.security.isVerified;
};

// Index pour les recherches fréquentes
userSchema.index({ email: 1 });
userSchema.index({ 'profile.localisation.pays': 1 });
userSchema.index({ 'profile.localisation.region': 1 });
userSchema.index({ 'profile.localisation.ville': 1 });
userSchema.index({ 'profile.age': 1 });
userSchema.index({ 'profile.sexe': 1 });
userSchema.index({ 'profile.orientation': 1 });
userSchema.index({ 'premium.isPremium': 1 });
userSchema.index({ 'stats.lastActive': -1 });
userSchema.index({ 'security.isBlocked': 1 });

module.exports = mongoose.model('User', userSchema);
