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
      sexe: { type: String, enum: ['homme', 'femme', 'autre'], required: true },
      localisation: { type: String, required: true, trim: true },
      bio: { type: String, maxlength: 500, trim: true },
      pratiques: [{ type: String, trim: true }],
      photos: [{ type: String }],
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
      isFemaleFree: { type: Boolean, default: false },
    },
    preferences: {
      ageMin: { type: Number, min: 18, max: 100, default: 18 },
      ageMax: { type: Number, min: 18, max: 100, default: 100 },
      sexeRecherche: {
        type: String,
        enum: ['homme', 'femme', 'autre', 'tous'],
        default: 'tous',
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
userSchema.index({ 'profile.localisation': 1 });
userSchema.index({ 'profile.age': 1 });
userSchema.index({ 'profile.sexe': 1 });
userSchema.index({ 'premium.isPremium': 1 });
userSchema.index({ 'stats.lastActive': -1 });
userSchema.index({ 'security.isBlocked': 1 });

module.exports = mongoose.model('User', userSchema);
