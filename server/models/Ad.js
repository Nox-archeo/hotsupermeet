const mongoose = require('mongoose');

const adSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['fantasme', 'soiree', 'service', 'contenu'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    criteria: {
      ageMin: { type: Number, min: 18, max: 100, default: 18 },
      ageMax: { type: Number, min: 18, max: 100, default: 100 },
      sexe: {
        type: String,
        enum: ['homme', 'femme', 'autre', 'tous'],
        default: 'tous',
      },
      pratiques: [{ type: String, trim: true }],
    },
    premiumOnly: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'deleted'],
      default: 'active',
    },
    contactInfo: {
      visibleTo: { type: String, enum: ['premium', 'all'], default: 'premium' },
      responseCount: { type: Number, default: 0 },
    },
    images: [{ type: String }],
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
  }
);

// Méthode pour vérifier si l'annonce est expirée
adSchema.methods.isExpired = function () {
  return this.date < new Date();
};

// Méthode pour marquer comme expirée
adSchema.methods.markAsExpired = function () {
  if (this.isExpired() && this.status === 'active') {
    this.status = 'expired';
    return this.save();
  }
  return Promise.resolve(this);
};

// Méthode pour incrémenter le compteur de réponses
adSchema.methods.incrementResponseCount = function () {
  this.contactInfo.responseCount += 1;
  return this.save();
};

// Méthode statique pour récupérer les annonces actives avec pagination
adSchema.statics.getActiveAds = function (filters = {}, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const query = { status: 'active', ...filters };

  return this.find(query)
    .populate(
      'userId',
      'profile.nom profile.age profile.sexe profile.localisation profile.photos'
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
};

// Méthode statique pour récupérer les annonces d'un utilisateur
adSchema.statics.getUserAds = function (userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
};

// Hook pour vérifier l'expiration avant de sauvegarder
adSchema.pre('save', function (next) {
  if (this.isModified('date') && this.isExpired()) {
    this.status = 'expired';
  }
  next();
});

// Index pour les recherches fréquentes
adSchema.index({ userId: 1 });
adSchema.index({ location: 1 });
adSchema.index({ date: 1 });
adSchema.index({ 'criteria.sexe': 1 });
adSchema.index({ status: 1 });
adSchema.index({ type: 1 });
adSchema.index({ createdAt: -1 });
adSchema.index({ 'criteria.ageMin': 1, 'criteria.ageMax': 1 });

module.exports = mongoose.model('Ad', adSchema);
