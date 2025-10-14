const mongoose = require('mongoose');

const tonightMeetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    tenue: {
      type: String,
      required: true,
      trim: true,
    },
    messageCode: {
      type: String,
      maxlength: 50,
      trim: true,
    },
    visibilityCriteria: {
      ageMin: { type: Number, min: 18, max: 100, default: 18 },
      ageMax: { type: Number, min: 18, max: 100, default: 100 },
      sexe: {
        type: String,
        enum: ['homme', 'femme', 'autre', 'tous'],
        default: 'tous',
      },
      orientation: { type: String, trim: true },
      preferences: [{ type: String, trim: true }],
    },
    likes: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected'],
          default: 'pending',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        acceptedAt: {
          type: Date,
        },
      },
    ],
    fullDetails: {
      lieu: { type: String, required: true, trim: true },
      date: { type: Date, required: true },
      heure_debut: { type: String, required: true },
      heure_fin: { type: String, required: true },
      description_personne: { type: String, required: true, trim: true },
      type_rencontre: { type: String, required: true },
      message_supplementaire: { type: String, trim: true },
      visibilite: {
        type: String,
        enum: ['filtree', 'publique'],
        default: 'filtree',
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 heures
      },
    },
    stats: {
      viewCount: { type: Number, default: 0 },
      responseCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Méthode pour vérifier si la rencontre est expirée
tonightMeetSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

// Méthode pour désactiver la rencontre
tonightMeetSchema.methods.deactivate = function () {
  this.active = false;
  return this.save();
};

// Méthode pour ajouter une réponse
tonightMeetSchema.methods.addResponse = function (userId, avis, message = '') {
  const response = {
    userId,
    avis,
    message,
    createdAt: new Date(),
  };

  this.responses.push(response);
  this.stats.responseCount += 1;

  return this.save();
};

// Méthode pour incrémenter le compteur de vues
tonightMeetSchema.methods.incrementViewCount = function () {
  this.stats.viewCount += 1;
  return this.save();
};

// Méthode pour obtenir les réponses par avis
tonightMeetSchema.methods.getResponsesByAvis = function (avis) {
  return this.responses.filter(response => response.avis === avis);
};

// Méthode statique pour récupérer les rencontres actives
tonightMeetSchema.statics.getActiveMeets = function (
  filters = {},
  page = 1,
  limit = 20
) {
  const skip = (page - 1) * limit;
  const query = {
    active: true,
    expiresAt: { $gt: new Date() },
    ...filters,
  };

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

// Méthode statique pour récupérer les rencontres d'un utilisateur
tonightMeetSchema.statics.getUserMeets = function (
  userId,
  page = 1,
  limit = 20
) {
  const skip = (page - 1) * limit;

  return this.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
};

// Hook pour désactiver les rencontres expirées
tonightMeetSchema.pre('save', function (next) {
  if (this.isExpired()) {
    this.active = false;
  }
  next();
});

// Tâche cron pour désactiver les rencontres expirées (à implémenter côté serveur)
tonightMeetSchema.statics.cleanupExpiredMeets = function () {
  return this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      active: true,
    },
    {
      active: false,
    }
  );
};

// Index pour les recherches fréquentes
tonightMeetSchema.index({ userId: 1 });
tonightMeetSchema.index({ active: 1 });
tonightMeetSchema.index({ expiresAt: 1 });
tonightMeetSchema.index({ location: 1 });
tonightMeetSchema.index({ createdAt: -1 });
tonightMeetSchema.index({ 'visibilityCriteria.sexe': 1 });
tonightMeetSchema.index({
  'visibilityCriteria.ageMin': 1,
  'visibilityCriteria.ageMax': 1,
});

module.exports = mongoose.model('TonightMeet', tonightMeetSchema);
