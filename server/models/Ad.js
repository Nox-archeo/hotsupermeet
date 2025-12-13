const mongoose = require('mongoose');

const adSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['rencontre', 'escort', 'sugar', 'service', 'emploi', 'vente'],
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
      maxlength: 2000,
      trim: true,
    },
    // Localisation
    country: { type: String, required: true, trim: true },
    region: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    location: { type: String, trim: true }, // Champ compatibilité pour anciennes annonces

    // Tarifs
    tarifs: { type: String, trim: true },

    // Informations personnelles de base
    age: { type: Number, min: 18, max: 99 },
    sexe: { type: String, enum: ['homme', 'femme', 'couple', ''], default: '' },
    taille: { type: String, trim: true },
    poids: { type: String, trim: true },
    cheveux: {
      type: String,
      enum: [
        'blonds',
        'bruns',
        'chatains',
        'roux',
        'noirs',
        'gris-blancs',
        'colores',
        '',
      ],
      default: '',
    },
    yeux: {
      type: String,
      enum: ['bleus', 'verts', 'marrons', 'noirs', 'noisette', 'gris', ''],
      default: '',
    },

    // Détails escort
    bonnet: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G+', ''],
      default: '',
    },
    origine: {
      type: String,
      enum: [
        'europeenne',
        'maghrebine',
        'africaine',
        'asiatique',
        'latine',
        'mixte',
        '',
      ],
      default: '',
    },
    silhouette: {
      type: String,
      enum: ['mince', 'normale', 'athletique', 'pulpeuse', 'ronde', ''],
      default: '',
    },
    depilation: {
      type: String,
      enum: ['integrale', 'partielle', 'naturelle', ''],
      default: '',
    },

    // Services proposés
    services: [{ type: String, trim: true }],

    // Disponibilités
    horaires: {
      type: String,
      enum: ['24h', 'jour', 'soir', 'nuit', 'weekend', 'sur-rdv', ''],
      default: '',
    },
    deplacement: {
      type: String,
      enum: ['domicile', 'hotel', 'salon', 'tous', ''],
      default: '',
    },
    disponibilites_details: { type: String, trim: true, maxlength: 500 },

    // Informations de contact
    contact_methods: [{ type: String, trim: true }],
    contact_email: { type: String, trim: true, lowercase: true },
    contact_telephone: { type: String, trim: true },
    contact_whatsapp: { type: String, trim: true },
    contact_telegram: { type: String, trim: true },
    contact_snap: { type: String, trim: true },

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

    // Dates
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }, // 30 jours
  },
  {
    timestamps: true,
  }
);

// Méthode pour vérifier si l'annonce est expirée
adSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
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
